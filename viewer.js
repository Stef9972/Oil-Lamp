let scene, camera, renderer, controls;
let model = null;
let gridHelper, axesHelper;
let measurementMode = false;
let measurementPoints = [];
let measurementLines = [];
let measurementSpheres = [];
let currentUnit = 'cm';

document.addEventListener('DOMContentLoaded', () => {
    initViewer();
    loadModelFromURL();
    setupEventListeners();
});

function initViewer() {
    const container = document.getElementById('viewerCanvas');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 15);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Add grid
    gridHelper = new THREE.GridHelper(20, 20, 0xff0000, 0x00ff00);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);
    
    // Add axes helper
    axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
    // Raycaster for measurements
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Click handler for measurements
    renderer.domElement.addEventListener('click', (event) => {
        if (!measurementMode || !model) return;
        
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(model, true);
        
        if (intersects.length > 0) {
            addMeasurementPoint(intersects[0].point);
        }
    });
    
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function loadModelFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const modelData = urlParams.get('model');
    
    if (!modelData) {
        alert('No model data found in URL');
        return;
    }
    
    try {
        const decodedData = JSON.parse(atob(modelData));
        const loader = new THREE.GLTFLoader();
        
        if (decodedData.type === 'glb') {
            const buffer = base64ToArrayBuffer(decodedData.data);
            loader.parse(buffer, '', (gltf) => {
                loadModel(gltf.scene);
            });
        } else {
            const text = atob(decodedData.data);
            loader.parse(text, '', (gltf) => {
                loadModel(gltf.scene);
            });
        }
    } catch (error) {
        console.error('Error loading model:', error);
        alert('Error loading model. Please check the URL.');
    }
}

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function loadModel(modelScene) {
    // Clear previous model
    if (model) {
        scene.remove(model);
    }
    
    model = modelScene;
    
    // Center the model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    model.position.sub(center);
    
    // Scale to fit
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 10 / maxDim;
    model.scale.multiplyScalar(scale);
    
    scene.add(model);
    
    // Enable shadows
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    // Store original scale for measurements
    model.userData.originalScale = scale;
    model.userData.originalSize = size;
    
    updateMeasurementInfo();
}

function setupEventListeners() {
    document.getElementById('gridToggle').addEventListener('change', (e) => {
        gridHelper.visible = e.target.checked;
        axesHelper.visible = e.target.checked;
    });
    
    document.getElementById('unitSelect').addEventListener('change', (e) => {
        currentUnit = e.target.value;
        updateMeasurementInfo();
    });
    
    document.getElementById('measureBtn').addEventListener('click', () => {
        measurementMode = !measurementMode;
        const btn = document.getElementById('measureBtn');
        btn.textContent = measurementMode ? 'Cancel Measurement' : 'Measure';
        btn.style.background = measurementMode ? '#ff4444' : '';
        
        if (!measurementMode) {
            clearMeasurementPoints();
        }
    });
    
    document.getElementById('clearBtn').addEventListener('click', clearAllMeasurements);
}

function addMeasurementPoint(point) {
    measurementPoints.push(point.clone());
    
    // Add visual marker
    const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(point);
    scene.add(sphere);
    measurementSpheres.push(sphere);
    
    // If we have two points, draw a line and calculate distance
    if (measurementPoints.length === 2) {
        // Draw line
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(measurementPoints);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        measurementLines.push(line);
        
        // Calculate distance
        const distance = measurementPoints[0].distanceTo(measurementPoints[1]);
        const convertedDistance = convertUnits(distance);
        
        document.getElementById('distanceDisplay').textContent = 
            `Distance: ${convertedDistance.toFixed(2)} ${currentUnit}`;
        
        // Calculate thickness (simplified - distance to opposite side along normal)
        calculateThickness(measurementPoints[0], measurementPoints[1]);
        
        // Reset for next measurement
        measurementPoints = [];
    }
}

function calculateThickness(point1, point2) {
    if (!model) return;
    
    const direction = new THREE.Vector3().subVectors(point2, point1).normalize();
    const raycaster = new THREE.Raycaster(point1, direction);
    const intersects = raycaster.intersectObject(model, true);
    
    if (intersects.length > 1) {
        const thickness = intersects[0].distance;
        const convertedThickness = convertUnits(thickness);
        document.getElementById('thicknessDisplay').textContent = 
            `Thickness: ${convertedThickness.toFixed(2)} ${currentUnit}`;
    } else {
        document.getElementById('thicknessDisplay').textContent = 'Thickness: N/A';
    }
}

function convertUnits(value) {
    // Assuming 1 unit = 1 meter
    if (currentUnit === 'inch') {
        return value * 39.3701; // meters to inches
    }
    return value * 100; // meters to cm
}

function clearMeasurementPoints() {
    measurementPoints = [];
    measurementSpheres.forEach(sphere => scene.remove(sphere));
    measurementSpheres = [];
}

function clearAllMeasurements() {
    clearMeasurementPoints();
    measurementLines.forEach(line => scene.remove(line));
    measurementLines = [];
    
    document.getElementById('distanceDisplay').textContent = 'Distance: --';
    document.getElementById('thicknessDisplay').textContent = 'Thickness: --';
    
    measurementMode = false;
    document.getElementById('measureBtn').textContent = 'Measure';
    document.getElementById('measureBtn').style.background = '';
}

function updateMeasurementInfo() {
    if (model && model.userData.originalSize) {
        const size = model.userData.originalSize;
        const convertedX = convertUnits(size.x);
        const convertedY = convertUnits(size.y);
        const convertedZ = convertUnits(size.z);
        
        document.getElementById('distanceDisplay').textContent = 
            `Model Size: ${convertedX.toFixed(1)} × ${convertedY.toFixed(1)} × ${convertedZ.toFixed(1)} ${currentUnit}`;
    }
}