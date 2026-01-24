# 3D Model Viewer

A clean, minimal 3D model viewer for GLB/GLTF files with measurement capabilities.

## Features

### Admin Page
- Upload GLB/GLTF files via drag & drop or file selection
- Real-time preview of uploaded models
- Generate shareable links
- Clean, intuitive interface

### Viewer Page
- Rotate, zoom, and pan around models
- Toggleable XYZ grid (red, green, blue)
- Measurement tools with cm/inch units
- Distance measurement between two points
- Thickness estimation
- Clean, minimal interface

## Setup

1. Place all files in the same directory
2. No server required - runs directly in browser
3. Open `index.html` to start

## Usage

1. **Upload Model**:
   - Go to admin page (`index.html`)
   - Drag & drop or select a GLB/GLTF file
   - Preview will appear

2. **Generate Share Link**:
   - Click "Generate Share Link"
   - Copy the generated link
   - Share with customers

3. **View & Measure**:
   - Open the shared link
   - Use mouse to rotate, scroll to zoom
   - Toggle grid on/off
   - Select unit (cm/inch)
   - Click "Measure" to take measurements

## Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Technical Details
- Built with Three.js
- Client-side only (no backend required)
- Uses URL encoding for model sharing
- Responsive design

## File Size Limitations
- Models up to 10MB recommended
- Larger models may cause slow loading
- No server storage - models encoded in URL

## License
Open source - free for personal and commercial use