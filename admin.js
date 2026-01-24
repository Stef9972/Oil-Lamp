let currentModel = null;
let scene, camera, renderer, controls;

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const generateBtn = document.getElementById('generateBtn');
    const fileInfo = document.getElementById('fileInfo');
    const linkSection = document.getElementById('linkSection');
    
    // Initialize Three.js scene
    initScene();
    
    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#764ba2';
        dropZone.style.background = '#f0f0ff';
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#667eea';
        dropZone.style.background = '';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#667eea';
        dropZone.style.background = '';
        
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
            handleFile(file);
        } else {
            alert('Please upload a GLB or GLTF file');
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });
    
    generateBtn.addEventListener('click', generateLink);
});

function initScene() {
    const container = document.getElementById('previewCanvas');
    
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
    const gridHelper = new THREE.GridHelper(20, 20, 0xff0000, 0x00ff00);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);
    
    // Add axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function handleFile(file) {
    document.getElementById('fileName').textContent = `Name: ${file.name}`;
    document.getElementById('fileSize').textContent = `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const loader = new THREE.GLTFLoader();
        loader.parse(e.target.result, '', (gltf) => {
            // Clear previous model
            if (currentModel) {
                scene.remove(currentModel);
            }
            
            currentModel = gltf.scene;
            
            // Center the model
            const box = new THREE.Box3().setFromObject(currentModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            currentModel.position.sub(center);
            
            // Scale to fit
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 10 / maxDim;
            currentModel.scale.multiplyScalar(scale);
            
            scene.add(currentModel);
            
            // Enable generate button
            document.getElementById('generateBtn').disabled = false;
            document.getElementById('fileInfo').style.display = 'block';
            
            // Store the file data
            currentModel.userData.file = file;
            currentModel.userData.fileData = e.target.result;
        });
    };
    
    if (file.name.endsWith('.glb')) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

function generateLink() {
    if (!currentModel || !currentModel.userData.fileData) return;
    
    // Convert file data to base64
    const fileData = currentModel.userData.fileData;
    const base64Data = fileData instanceof ArrayBuffer 
        ? arrayBufferToBase64(fileData)
        : btoa(fileData);
    
    // Create URL with model data
    const modelData = {
        name: currentModel.userData.file.name,
        data: base64Data,
        type: currentModel.userData.file.name.endsWith('.glb') ? 'glb' : 'gltf'
    };
    
    const encodedData = btoa(JSON.stringify(modelData));
    const shareLink = `${window.location.origin}/viewer.html?model=${encodedData}`;
    
    document.getElementById('shareLink').value = shareLink;
    document.getElementById('linkSection').style.display = 'block';
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function copyLink() {
    const linkInput = document.getElementById('shareLink');
    linkInput.select();
    document.execCommand('copy');
    alert('Link copied to clipboard!');
}