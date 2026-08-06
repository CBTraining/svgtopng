import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  CubeIcon, 
  CloudArrowUpIcon as UploadCloud, 
  ArrowDownTrayIcon as Download, 
  XMarkIcon as XMark, 
  SparklesIcon, 
  ArrowPathIcon,
  SunIcon,
  EyeIcon,
  CheckIcon as Check
} from '@heroicons/react/24/solid';
import * as THREE from 'https://esm.sh/three@0.174.0';
import { OrbitControls } from 'https://esm.sh/three@0.174.0/examples/jsm/controls/OrbitControls.js';
import { SVGLoader } from 'https://esm.sh/three@0.174.0/examples/jsm/loaders/SVGLoader.js';
import { STLExporter } from 'https://esm.sh/three@0.174.0/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'https://esm.sh/three@0.174.0/examples/jsm/exporters/OBJExporter.js';
import { GLTFExporter } from 'https://esm.sh/three@0.174.0/examples/jsm/exporters/GLTFExporter.js';

// Sample SVG presets for quick testing
const SAMPLE_SVGS = {
  star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <path fill="#FFD700" d="M50 5 L63 35 L95 38 L71 60 L78 92 L50 75 L22 92 L29 60 L5 38 L37 35 Z" />
  </svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <path fill="#3B82F6" d="M50 5 L90 20 V50 C90 75 50 95 50 95 C50 95 10 75 10 50 V20 Z" />
    <circle cx="50" cy="45" r="20" fill="#FFFFFF" />
  </svg>`,
  badge: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <polygon points="50,5 61,15 76,10 82,24 95,30 92,45 100,58 89,68 90,83 75,85 68,98 53,92 40,98 33,85 18,83 19,68 8,58 16,45 13,30 26,24 32,10 47,15" fill="#EF4444" />
    <circle cx="50" cy="50" r="28" fill="#F8FAFC" />
    <polygon points="50,30 55,42 68,43 58,52 61,64 50,57 39,64 42,52 32,43 45,42" fill="#EF4444" />
  </svg>`,
  bolt: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <path fill="#F59E0B" d="M55 5 L15 55 H45 L35 95 L85 45 H55 Z" />
  </svg>`
};

const MATERIAL_PRESETS = {
  gold: { name: 'Gold Metal', color: '#ffd700', metalness: 1.0, roughness: 0.15, clearcoat: 0.3 },
  chrome: { name: 'Chrome / Silver', color: '#e2e8f0', metalness: 1.0, roughness: 0.05, clearcoat: 0.5 },
  copper: { name: 'Copper Metal', color: '#b87333', metalness: 0.95, roughness: 0.2, clearcoat: 0.2 },
  steel: { name: 'Brushed Steel', color: '#94a3b8', metalness: 0.85, roughness: 0.4, clearcoat: 0.1 },
  plastic: { name: 'Glossy Plastic', color: '#3b82f6', metalness: 0.0, roughness: 0.1, clearcoat: 1.0 },
  matte: { name: 'Matte Paint', color: '#0f172a', metalness: 0.0, roughness: 0.8, clearcoat: 0.0 },
  emerald: { name: 'Emerald Gem', color: '#10b981', metalness: 0.2, roughness: 0.1, clearcoat: 1.0 },
  ruby: { name: 'Ruby Glass', color: '#f43f5e', metalness: 0.1, roughness: 0.1, clearcoat: 1.0 }
};

export default function SvgTo3D() {
  const [svgContent, setSvgContent] = useState('');
  const [svgFileName, setSvgFileName] = useState('');
  const [useOriginalSvgColors, setUseOriginalSvgColors] = useState(true);

  // Extrusion & Bevel Controls
  const [depth, setDepth] = useState(12);
  const [bevelEnabled, setBevelEnabled] = useState(true);
  const [bevelThickness, setBevelThickness] = useState(2.5);
  const [bevelSize, setBevelSize] = useState(2);
  const [bevelSegments, setBevelSegments] = useState(5);
  const [curveSegments, setCurveSegments] = useState(24);

  // Material Controls
  const [materialPreset, setMaterialPreset] = useState('gold');
  const [customColor, setCustomColor] = useState('#ffd700');
  const [metalness, setMetalness] = useState(1.0);
  const [roughness, setRoughness] = useState(0.15);
  const [clearcoat, setClearcoat] = useState(0.3);
  const [wireframe, setWireframe] = useState(false);

  // Environment & Viewport Controls
  const [autoRotate, setAutoRotate] = useState(false);
  const [bgColor, setBgColor] = useState('#0b0f19');
  const [showGrid, setShowGrid] = useState(true);
  const [exportSuccess, setExportSuccess] = useState('');

  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelGroupRef = useRef(null);
  const gridHelperRef = useRef(null);
  const location = useLocation();

  // Load incoming SVG file from router state if available
  useEffect(() => {
    if (location.state?.svgContent) {
      setSvgContent(location.state.svgContent);
      setSvgFileName(location.state.fileName || 'custom_vector.svg');
      window.history.replaceState({}, document.title);
    } else if (!svgContent) {
      // Default to sample star logo
      setSvgContent(SAMPLE_SVGS.star);
      setSvgFileName('star_badge.svg');
    }
  }, [location.state]);

  // Handle Preset Selection
  const applyMaterialPreset = (presetKey) => {
    setMaterialPreset(presetKey);
    const p = MATERIAL_PRESETS[presetKey];
    if (p) {
      setCustomColor(p.color);
      setMetalness(p.metalness);
      setRoughness(p.roughness);
      setClearcoat(p.clearcoat);
    }
  };

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 50, 150);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    containerRef.current.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go below floor
    controlsRef.current = controls;

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight1.position.set(100, 150, 100);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 1.2); // Cool blue fill light
    dirLight2.position.set(-100, -50, -100);
    scene.add(dirLight2);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
    rimLight.position.set(0, 100, -150);
    scene.add(rimLight);

    // Generate procedural environment reflection texture for realistic metals
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x334155);
    const envLight = new THREE.DirectionalLight(0xffffff, 3.0);
    envLight.position.set(5, 10, 5);
    envScene.add(envLight);
    const envTex = pmremGenerator.fromScene(envScene).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    // 6. Floor & Grid
    const gridHelper = new THREE.GridHelper(200, 40, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    const floorGeo = new THREE.PlaneGeometry(300, 300);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.4 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 7. Group to hold 3D model
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      if (autoRotate && modelGroupRef.current) {
        modelGroupRef.current.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Handle Window Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Scene Background & Grid
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(bgColor);
    }
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [bgColor, showGrid]);

  // Re-extrude 3D Object whenever parameters or SVG content change
  useEffect(() => {
    if (!modelGroupRef.current || !svgContent) return;

    // Clear previous mesh
    while (modelGroupRef.current.children.length > 0) {
      const child = modelGroupRef.current.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
      modelGroupRef.current.remove(child);
    }

    try {
      const loader = new SVGLoader();
      const svgData = loader.parse(svgContent);

      const extrudeSettings = {
        depth: parseFloat(depth),
        bevelEnabled: bevelEnabled,
        bevelSegments: parseInt(bevelSegments),
        steps: 1,
        bevelSize: parseFloat(bevelSize),
        bevelThickness: parseFloat(bevelThickness),
        curveSegments: parseInt(curveSegments)
      };

      const group = new THREE.Group();

      svgData.paths.forEach((path) => {
        const fillColor = path.userData?.style?.fill;
        let matColor = customColor;
        if (useOriginalSvgColors && fillColor && fillColor !== 'none') {
          matColor = fillColor;
        }

        const material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(matColor),
          metalness: parseFloat(metalness),
          roughness: parseFloat(roughness),
          clearcoat: parseFloat(clearcoat),
          clearcoatRoughness: 0.1,
          reflectivity: 0.9,
          wireframe: wireframe,
          side: THREE.DoubleSide
        });

        const shapes = SVGLoader.createShapes(path);

        shapes.forEach((shape) => {
          const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
        });
      });

      // Center the bounding box in the 3D scene
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Invert Y axis because SVGs render Y-downwards
      group.position.x = -center.x;
      group.position.y = size.y / 2;
      group.position.z = -center.z;
      group.rotation.x = Math.PI;

      // Wrap in outer group to preserve inversion
      const pivotGroup = new THREE.Group();
      pivotGroup.add(group);

      modelGroupRef.current.add(pivotGroup);

      // Adjust camera distance to fit model
      if (controlsRef.current && cameraRef.current) {
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.8;
        cameraZ = Math.max(cameraZ, 40);
        cameraRef.current.position.set(0, maxDim * 0.8, cameraZ);
        controlsRef.current.target.set(0, size.y / 2, 0);
        controlsRef.current.update();
      }
    } catch (err) {
      console.error("Error parsing/extruding SVG:", err);
    }
  }, [
    svgContent, 
    depth, 
    bevelEnabled, 
    bevelThickness, 
    bevelSize, 
    bevelSegments, 
    curveSegments, 
    customColor, 
    useOriginalSvgColors, 
    metalness, 
    roughness, 
    clearcoat, 
    wireframe
  ]);

  // Handle File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'image/svg+xml' || file.name.endsWith('.svg'))) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setSvgContent(evt.target.result);
        setSvgFileName(file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'image/svg+xml' || file.name.endsWith('.svg'))) {
      handleFileUpload({ target: { files: [file] } });
    }
  };

  // Exporters
  const triggerSuccessMsg = (msg) => {
    setExportSuccess(msg);
    setTimeout(() => setExportSuccess(''), 3000);
  };

  const exportSTL = () => {
    if (!modelGroupRef.current) return;
    const exporter = new STLExporter();
    const result = exporter.parse(modelGroupRef.current, { binary: true });
    const blob = new Blob([result], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = svgFileName.replace(/\.[^/.]+$/, "") + '_3d.stl';
    link.click();
    triggerSuccessMsg('Exported STL for 3D Printing!');
  };

  const exportOBJ = () => {
    if (!modelGroupRef.current) return;
    const exporter = new OBJExporter();
    const result = exporter.parse(modelGroupRef.current);
    const blob = new Blob([result], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = svgFileName.replace(/\.[^/.]+$/, "") + '_3d.obj';
    link.click();
    triggerSuccessMsg('Exported OBJ 3D Model!');
  };

  const exportGLTF = () => {
    if (!modelGroupRef.current) return;
    const exporter = new GLTFExporter();
    exporter.parse(
      modelGroupRef.current,
      (gltf) => {
        const blob = new Blob([gltf], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = svgFileName.replace(/\.[^/.]+$/, "") + '_3d.glb';
        link.click();
        triggerSuccessMsg('Exported GLB 3D Asset!');
      },
      (err) => console.error("GLTF Export Error:", err),
      { binary: true }
    );
  };

  const exportRenderPng = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = svgFileName.replace(/\.[^/.]+$/, "") + '_render.png';
    link.click();
    triggerSuccessMsg('Saved 3D Render Image!');
  };

  const resetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(0, 50, 150);
      controlsRef.current.target.set(0, 10, 0);
      controlsRef.current.update();
      if (modelGroupRef.current) {
        modelGroupRef.current.rotation.y = 0;
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '0' }}>
        <CubeIcon />
        <h1>SVG 2D to 3D Extruder & Studio</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Input & 3D Geometry Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* File Dropzone */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UploadCloud style={{ width: '18px', height: '18px', color: 'var(--accent-color)' }} />
              Source SVG Vector
            </h3>
            
            <div 
              className="dropzone"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              style={{ padding: '1.25rem', textAlign: 'center', cursor: 'pointer', border: '2px dashed var(--border-color)', borderRadius: '8px' }}
            >
              <input type="file" accept=".svg,image/svg+xml" onChange={handleFileUpload} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Drag & Drop SVG vector file here</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>or click to browse</span>
            </div>

            {/* Quick Preset SVGs */}
            <div style={{ marginTop: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Or load sample shape:</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setSvgContent(SAMPLE_SVGS.star); setSvgFileName('star.svg'); }}>Star</button>
                <button className="btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setSvgContent(SAMPLE_SVGS.shield); setSvgFileName('shield.svg'); }}>Shield</button>
                <button className="btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setSvgContent(SAMPLE_SVGS.badge); setSvgFileName('badge.svg'); }}>Badge</button>
                <button className="btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setSvgContent(SAMPLE_SVGS.bolt); setSvgFileName('lightning.svg'); }}>Lightning</button>
              </div>
            </div>
          </div>

          {/* Geometry & Bevel Controls */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CubeIcon style={{ width: '18px', height: '18px', color: 'var(--accent-color)' }} />
              Extrusion & Bevel Settings
            </h3>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span>Thickness (Depth):</span>
                <span style={{ fontWeight: 'bold' }}>{depth} mm</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="60" 
                step="0.5" 
                value={depth} 
                onChange={(e) => setDepth(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-color)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Enable Bevel Chamfer</label>
              <input 
                type="checkbox" 
                checked={bevelEnabled} 
                onChange={(e) => setBevelEnabled(e.target.checked)}
                style={{ accentColor: 'var(--accent-color)', width: '16px', height: '16px' }}
              />
            </div>

            {bevelEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span>Bevel Size (Width):</span>
                    <span>{bevelSize} mm</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    step="0.2" 
                    value={bevelSize} 
                    onChange={(e) => setBevelSize(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-color)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span>Bevel Thickness (Depth):</span>
                    <span>{bevelThickness} mm</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    step="0.2" 
                    value={bevelThickness} 
                    onChange={(e) => setBevelThickness(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-color)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span>Bevel Smoothness:</span>
                    <span>{bevelSegments} seg</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="12" 
                    step="1" 
                    value={bevelSegments} 
                    onChange={(e) => setBevelSegments(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-color)' }}
                  />
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span>Curve Detail (Fidelity):</span>
                <span>{curveSegments} pts</span>
              </div>
              <input 
                type="range" 
                min="8" 
                max="64" 
                step="4" 
                value={curveSegments} 
                onChange={(e) => setCurveSegments(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-color)' }}
              />
            </div>
          </div>
        </div>

        {/* Middle Column: Interactive 3D WebGL Viewport */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: 0, borderRadius: '12px', height: '580px' }}>
            {/* 3D Canvas Viewport */}
            <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

            {/* Viewport Overlay Controls */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
              <button 
                className="btn" 
                onClick={() => setAutoRotate(!autoRotate)} 
                title="Toggle Auto Rotation"
                style={{ padding: '0.4rem 0.75rem', background: autoRotate ? 'var(--accent-color)' : 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', fontSize: '0.75rem', color: 'white' }}
              >
                <ArrowPathIcon style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                {autoRotate ? 'Rotating' : 'Auto-Rotate'}
              </button>
              <button 
                className="btn" 
                onClick={resetCamera} 
                title="Reset Camera Position"
                style={{ padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', fontSize: '0.75rem', color: 'white' }}
              >
                Reset Camera
              </button>
            </div>

            {/* Environment Toggle Controls */}
            <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', display: 'flex', gap: '0.5rem', zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '0.35rem 0.75rem', borderRadius: '20px', backdropFilter: 'blur(8px)' }}>
              <button 
                style={{ background: 'none', border: 'none', color: showGrid ? 'var(--accent-color)' : 'white', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setShowGrid(!showGrid)}
              >
                <EyeIcon style={{ width: '14px', height: '14px' }} /> Grid
              </button>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
              <button 
                style={{ background: 'none', border: 'none', color: bgColor === '#0b0f19' ? 'var(--accent-color)' : 'white', cursor: 'pointer', fontSize: '0.75rem' }}
                onClick={() => setBgColor('#0b0f19')}
              >
                Dark Studio
              </button>
              <button 
                style={{ background: 'none', border: 'none', color: bgColor === '#f8fafc' ? 'var(--accent-color)' : 'white', cursor: 'pointer', fontSize: '0.75rem' }}
                onClick={() => setBgColor('#f8fafc')}
              >
                Light Studio
              </button>
            </div>
          </div>

          {/* Export Bar */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Export 3D Asset:</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={exportSTL} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <Download style={{ width: '16px', height: '16px' }} /> Download STL (3D Print)
              </button>
              <button className="btn" onClick={exportOBJ} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Download OBJ
              </button>
              <button className="btn" onClick={exportGLTF} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Download GLB / GLTF
              </button>
              <button className="btn" onClick={exportRenderPng} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                PNG Snapshot
              </button>
            </div>
          </div>
          {exportSuccess && (
            <div style={{ padding: '0.5rem 1rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check style={{ width: '16px', height: '16px' }} /> {exportSuccess}
            </div>
          )}
        </div>

        {/* Right Column: Material & Studio Lighting Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Material Presets */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SparklesIcon style={{ width: '18px', height: '18px', color: 'var(--accent-color)' }} />
              Material Presets
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {Object.keys(MATERIAL_PRESETS).map((key) => {
                const p = MATERIAL_PRESETS[key];
                const isSelected = materialPreset === key;
                return (
                  <button
                    key={key}
                    className="btn"
                    onClick={() => applyMaterialPreset(key)}
                    style={{
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8rem',
                      border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)'
                    }}
                  >
                    <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.color, display: 'inline-block', boxShadow: '0 0 4px rgba(0,0,0,0.5)' }}></span>
                    {p.name}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem' }}>Use SVG Colors:</span>
              <input 
                type="checkbox" 
                checked={useOriginalSvgColors} 
                onChange={(e) => setUseOriginalSvgColors(e.target.checked)}
                style={{ accentColor: 'var(--accent-color)', width: '16px', height: '16px' }}
              />
            </div>

            {/* Custom Material Fine-Tuning */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem' }}>Base Color:</span>
                <input 
                  type="color" 
                  value={customColor} 
                  onChange={(e) => { setCustomColor(e.target.value); setMaterialPreset('custom'); }}
                  style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }} 
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span>Metallic Reflectivity:</span>
                  <span>{Math.round(metalness * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={metalness} 
                  onChange={(e) => { setMetalness(Number(e.target.value)); setMaterialPreset('custom'); }}
                  style={{ width: '100%', accentColor: 'var(--accent-color)' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span>Roughness / Polish:</span>
                  <span>{Math.round(roughness * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={roughness} 
                  onChange={(e) => { setRoughness(Number(e.target.value)); setMaterialPreset('custom'); }}
                  style={{ width: '100%', accentColor: 'var(--accent-color)' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span>Clearcoat Gloss:</span>
                  <span>{Math.round(clearcoat * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={clearcoat} 
                  onChange={(e) => { setClearcoat(Number(e.target.value)); setMaterialPreset('custom'); }}
                  style={{ width: '100%', accentColor: 'var(--accent-color)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem' }}>Wireframe Mesh Mode:</span>
                <input 
                  type="checkbox" 
                  checked={wireframe} 
                  onChange={(e) => setWireframe(e.target.checked)}
                  style={{ accentColor: 'var(--accent-color)', width: '16px', height: '16px' }}
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
