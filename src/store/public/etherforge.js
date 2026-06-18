import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// ════════════════════════════════════════════════════════════
//  FURNITURE CATALOG
// ════════════════════════════════════════════════════════════

const CATEGORIES = [
  { id: 'living', name: 'Living', icon: '🪑' },
  { id: 'bedroom', name: 'Bedroom', icon: '🛏️' },
  { id: 'outdoor', name: 'Outdoor', icon: '🌿' },
  { id: 'decor', name: 'Decor', icon: '🌸' },
  { id: 'lighting', name: 'Lights', icon: '💡' }
];

const FURNITURE = [
  { id:'sofa-minimal', name:'Minimalist Sofa', cat:'living', type:'sofa', desc:'High-density foam with premium charcoal fabric.', mat:{ color:'#2a2a2a', rough:0.9, metal:0 }, dim:[3,0.8,1] },
  { id:'coffee-table-oak', name:'Nordic Oak Table', cat:'living', type:'table', desc:'Solid white oak with natural matte finish.', mat:{ color:'#d2b48c', rough:0.7, metal:0 }, dim:[1.2,0.4,0.8] },
  { id:'lounge-chair', name:'Leather Lounge', cat:'living', type:'chair', desc:'Premium grain leather, brushed aluminum frame.', mat:{ color:'#3d2b1f', rough:0.3, metal:0.1 }, dim:[0.8,0.9,0.9] },
  { id:'sofa-archi', name:'Arquitect Sofa', cat:'living', type:'sofa', desc:'Warm greige boucle on matte black steel plinth.', mat:{ color:'#8b8680', rough:0.92, metal:0 }, dim:[2.6,0.75,1.05] },
  { id:'armchair-archi', name:'Arquitect Armchair', cat:'living', type:'chair', desc:'Matching greige boucle with slim steel legs.', mat:{ color:'#8b8680', rough:0.92, metal:0 }, dim:[0.9,0.8,0.95] },
  { id:'plinth-table', name:'Plinth Coffee Table', cat:'living', type:'table', desc:'Travertine-effect composite on hairpin legs.', mat:{ color:'#d4cfc4', rough:0.55, metal:0.05 }, dim:[1.4,0.28,0.7] },
  { id:'tripod-lamp', name:'Tripod Floor Lamp', cat:'living', type:'floorLamp', desc:'Satin black aluminium with brushed brass cone.', mat:{ color:'#1a1a1a', rough:0.25, metal:0.85 }, dim:[0.85,1.8,0.85] },
  { id:'bowl-lamp', name:'Bowl Table Lamp', cat:'living', type:'tableLamp', desc:'Honed marble base with spun aluminium shade.', mat:{ color:'#d4cfc4', rough:0.4, metal:0.1 }, dim:[0.28,0.5,0.28] },
  { id:'king-bed', name:'King Linen Bed', cat:'bedroom', type:'bed', desc:'Soft linen upholstery with ash wood frame.', mat:{ color:'#e5e5e5', rough:0.95, metal:0 }, dim:[2,1.2,2.2] },
  { id:'nightstand', name:'Walnut Nightstand', cat:'bedroom', type:'cabinet', desc:'Dark walnut veneer with brass handles.', mat:{ color:'#4a3728', rough:0.4, metal:0.2 }, dim:[0.5,0.6,0.4] },
  { id:'teak-patio', name:'Teak Patio Table', cat:'outdoor', type:'table', desc:'Weather-resistant solid teak wood.', mat:{ color:'#8b5a2b', rough:0.8, metal:0 }, dim:[2.2,0.75,1] },
  { id:'rattan-lounger', name:'Rattan Lounger', cat:'outdoor', type:'chair', desc:'Hand-woven synthetic rattan, waterproof cushions.', mat:{ color:'#b29d8d', rough:0.9, metal:0 }, dim:[0.7,0.4,2] },
  { id:'alum-bench', name:'Aluminum Garden Bench', cat:'outdoor', type:'bench', desc:'Brushed aluminum slats on powder-coated frame.', mat:{ color:'#b8b8b8', rough:0.3, metal:0.9 }, dim:[2.5,0.45,0.7] },
  { id:'parasol', name:'Cantilever Parasol', cat:'outdoor', type:'umbrella', desc:'Olefin canvas on counter-weighted aluminum mast.', mat:{ color:'#d4a574', rough:0.85, metal:0 }, dim:[3,3,3] },
  { id:'fire-bowl', name:'Concrete Fire Bowl', cat:'outdoor', type:'firePit', desc:'Hand-cast GFRC concrete with tadelakt finish.', mat:{ color:'#9e9e9e', rough:0.95, metal:0 }, dim:[1,0.45,1] },
  { id:'steel-grill', name:'Teppanyaki Steel Grill', cat:'outdoor', type:'bbq', desc:'304 surgical-grade stainless steel dual-zone.', mat:{ color:'#e0e0e0', rough:0.15, metal:1 }, dim:[1.5,1.1,0.7] },
  { id:'corten-planter', name:'Corten Steel Planter', cat:'outdoor', type:'planter', desc:'Pre-weathered corten with rust patina.', mat:{ color:'#a0522d', rough:0.9, metal:0.4 }, dim:[1.2,0.8,0.5] },
  { id:'egg-swing', name:'Macrame Egg Chair', cat:'outdoor', type:'chair', desc:'UV-stabilised rattan with Sunbrella cushion.', mat:{ color:'#3a3a2e', rough:0.8, metal:0 }, dim:[1.1,1.6,1.1] },
  { id:'ceramic-vase', name:'Ceramic Vase', cat:'decor', type:'vase', desc:'Matte terracotta finish with organic texture.', mat:{ color:'#cc7722', rough:0.85, metal:0 }, dim:[0.3,0.6,0.3] },
  { id:'marble-sculpture', name:'Marble Sculpture', cat:'decor', type:'vase', desc:'Polished white marble with grey veining.', mat:{ color:'#ffffff', rough:0.1, metal:0 }, dim:[0.4,0.8,0.4] },
  { id:'abstract-canvas', name:'Abstract Canvas', cat:'decor', type:'cabinet', desc:'Large scale impasto oil painting on linen.', mat:{ color:'#f0f0f0', rough:0.9, metal:0 }, dim:[1.2,1.5,0.05] },
  { id:'edge-mirror', name:'Infinity Edge Mirror', cat:'decor', type:'cabinet', desc:'Ultra-clear silvered glass with minimal bevel.', mat:{ color:'#ffffff', rough:0, metal:1 }, dim:[0.8,1.8,0.02] },
  { id:'arch-lamp', name:'Grand Arch Floor Lamp', cat:'lighting', type:'lamp', desc:'Satin nickel finish with marble base.', mat:{ color:'#c0c0c0', rough:0.2, metal:0.8 }, dim:[0.5,2.2,2] },
  { id:'copper-pendant', name:'Copper Pendant', cat:'lighting', type:'lamp', desc:'Genuine hammered copper with high-gloss coating.', mat:{ color:'#b87333', rough:0.1, metal:0.9 }, dim:[0.4,0.4,0.4] },
  { id:'track-spotlight', name:'Industrial Spotlight', cat:'lighting', type:'lamp', desc:'Black powder-coated steel with adjustable pivot.', mat:{ color:'#1a1a1a', rough:0.8, metal:0.3 }, dim:[0.15,0.2,0.2] },
];

const TYPE_ICONS = {
  sofa:'🛋️', chair:'🪑', table:'📐', bed:'🛏️', lamp:'💡',
  vase:'🏺', cabinet:'📦', bench:'🪑', umbrella:'⛱️',
  firePit:'🔥', bbq:'🍖', planter:'🌱', floorLamp:'🔦', tableLamp:'🔅'
};

// ════════════════════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════════════════════

let scene, camera, renderer, orbitControls, transformControls;
let currentCategory = 'living';
let selectedModelId = null;   // from catalog
let selectedObjectId = null;  // in scene
let gizmoMode = 'translate';
let snapEnabled = true;
let snapValue = 0.5;
let sceneObjects = [];        // { id, mesh, furniture, customMat }
let undoStack = [];
let redoStack = [];
let nextObjId = 1;

// ════════════════════════════════════════════════════════════
//  THREE.JS INIT
// ════════════════════════════════════════════════════════════

function init() {
  const viewport = document.getElementById('ef-viewport');
  const canvas = document.getElementById('ef-canvas');

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080810);

  // Camera
  camera = new THREE.PerspectiveCamera(42, viewport.clientWidth / viewport.clientHeight, 0.05, 200);
  camera.position.set(6, 5, 6);

  // Orbit Controls
  orbitControls = new OrbitControls(camera, canvas);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.08;
  orbitControls.maxPolarAngle = Math.PI / 2.05;
  orbitControls.minDistance = 1;
  orbitControls.maxDistance = 50;

  // Transform Controls
  transformControls = new TransformControls(camera, canvas);
  transformControls.setSize(0.75);
  transformControls.addEventListener('dragging-changed', (e) => {
    orbitControls.enabled = !e.value;
  });
  transformControls.addEventListener('objectChange', () => {
    updateSelectionInfo();
    updatePropertiesPanel();
  });
  scene.add(transformControls);

  // ── Lights ──
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  ambient.name = 'ambient';
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.name = 'directional';
  dir.position.set(8, 12, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -15;
  dir.shadow.camera.right = 15;
  dir.shadow.camera.top = 15;
  dir.shadow.camera.bottom = -15;
  dir.shadow.bias = -0.001;
  scene.add(dir);

  const fill = new THREE.PointLight(0x4488ff, 0.3, 20);
  fill.position.set(-5, 6, -3);
  scene.add(fill);

  const rim = new THREE.PointLight(0xff8844, 0.2, 20);
  rim.position.set(5, 4, -5);
  scene.add(rim);

  // ── Ground ──
  const groundGeo = new THREE.PlaneGeometry(40, 40);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);

  // ── Grid ──
  const grid = new THREE.GridHelper(40, 80, 0x1a3030, 0x141418);
  grid.name = 'grid';
  scene.add(grid);

  // ── Axes ──
  const axes = new THREE.AxesHelper(3);
  axes.position.set(-10, 0.001, -10);
  axes.name = 'axes';
  scene.add(axes);

  // ── Skybox dome (subtle) ──
  const skyGeo = new THREE.SphereGeometry(80, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x0a0a18) },
      bottomColor: { value: new THREE.Color(0x12141e) }
    },
    vertexShader: `varying vec3 vPos;void main(){vPos=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 topColor;uniform vec3 bottomColor;varying vec3 vPos;void main(){float h=normalize(vPos).y;gl_FragColor=vec4(mix(bottomColor,topColor,max(h,0.0)),1.0);}`,
    side: THREE.BackSide
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // ── Events ──
  initEvents(canvas, viewport);

  // ── UI ──
  renderCategories();
  renderModels();

  // ── Resize ──
  const onResize = () => {
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  };
  window.addEventListener('resize', onResize);

  // ── Render Loop ──
  function animate() {
    requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, camera);
  }
  animate();

  // ── Sync with Platform Tester ──
  startSync();

  notify('EtherForge Creator ready', 'info');
}

// ════════════════════════════════════════════════════════════
//  MESH GENERATOR
// ════════════════════════════════════════════════════════════

function createMesh(f) {
  const [w, h, d] = f.dim;
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: f.mat.color, roughness: f.mat.rough, metalness: f.mat.metal });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#222', metalness: 0.8, roughness: 0.2 });

  switch (f.type) {
    case 'sofa': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.4, d), mat);
      base.position.y = h * 0.2; base.castShadow = true; group.add(base);
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.55, d * 0.12), mat);
      back.position.set(0, h * 0.48, -d * 0.44); back.castShadow = true; group.add(back);
      [[-1, w], [1, w]].forEach(([s]) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(w * 0.07, h * 0.4, d), mat);
        arm.position.set(s * w * 0.465, h * 0.32, 0); arm.castShadow = true; group.add(arm);
      });
      // Legs
      const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8);
      [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([lx,lz]) => {
        const leg = new THREE.Mesh(legGeo, darkMat);
        leg.position.set(lx * w * 0.44, 0.04, lz * d * 0.44); group.add(leg);
      });
      break;
    }
    case 'chair': {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.07, d * 0.8), mat);
      seat.position.y = h * 0.44; seat.castShadow = true; group.add(seat);
      const cb = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, h * 0.48, d * 0.05), mat);
      cb.position.set(0, h * 0.68, -d * 0.38); cb.castShadow = true; group.add(cb);
      const legGeo = new THREE.CylinderGeometry(0.018, 0.018, h * 0.44, 8);
      [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([lx,lz]) => {
        const leg = new THREE.Mesh(legGeo, darkMat);
        leg.position.set(lx * w * 0.38, h * 0.22, lz * d * 0.34); leg.castShadow = true; group.add(leg);
      });
      break;
    }
    case 'table': {
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.05, d), mat);
      top.position.y = h; top.castShadow = true; group.add(top);
      const legGeo = new THREE.CylinderGeometry(0.022, 0.022, h, 8);
      [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([lx,lz]) => {
        const leg = new THREE.Mesh(legGeo, darkMat);
        leg.position.set(lx * (w * 0.44), h / 2, lz * (d * 0.44)); leg.castShadow = true; group.add(leg);
      });
      break;
    }
    case 'bed': {
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.28, d), mat);
      mattress.position.y = h * 0.34; mattress.castShadow = true; group.add(mattress);
      const frameMat = new THREE.MeshStandardMaterial({ color: '#4a3728', roughness: 0.5, metalness: 0.1 });
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h * 0.18, d + 0.08), frameMat);
      frame.position.y = h * 0.09; frame.castShadow = true; group.add(frame);
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h * 0.55, 0.06), mat);
      headboard.position.set(0, h * 0.48, -d / 2); headboard.castShadow = true; group.add(headboard);
      break;
    }
    case 'lamp': case 'floorLamp': case 'tableLamp': {
      const poleMat = new THREE.MeshStandardMaterial({ color: f.mat.color, metalness: f.mat.metal, roughness: f.mat.rough });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, h * 0.75, 12), poleMat);
      pole.position.y = h * 0.38; pole.castShadow = true; group.add(pole);
      const shadeMat = new THREE.MeshStandardMaterial({ color: '#ffeedd', emissive: '#ffeedd', emissiveIntensity: 0.25, roughness: 0.85, side: THREE.DoubleSide });
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.28, w * 0.45, h * 0.22, 20, 1, true), shadeMat);
      shade.position.y = h * 0.82; group.add(shade);
      const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.28, w * 0.32, 0.025, 20), poleMat);
      baseMesh.position.y = 0.012; group.add(baseMesh);
      const light = new THREE.PointLight(0xffeedd, 0.6, 6);
      light.position.y = h * 0.78; group.add(light);
      break;
    }
    case 'vase': {
      const pts = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(w * 0.38, h * 0.04),
        new THREE.Vector2(w * 0.48, h * 0.18),
        new THREE.Vector2(w * 0.42, h * 0.48),
        new THREE.Vector2(w * 0.28, h * 0.72),
        new THREE.Vector2(w * 0.32, h * 0.88),
        new THREE.Vector2(w * 0.28, h),
      ];
      const vase = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat);
      vase.castShadow = true; group.add(vase);
      break;
    }
    default: {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      box.position.y = h / 2; box.castShadow = true; group.add(box);
    }
  }

  return group;
}

// ════════════════════════════════════════════════════════════
//  SCENE MANAGEMENT
// ════════════════════════════════════════════════════════════

function addObjectToScene(furnitureId, position = null) {
  const f = FURNITURE.find(x => x.id === furnitureId);
  if (!f) return;

  const mesh = createMesh(f);
  const id = `obj_${nextObjId++}`;
  mesh.userData = { objId: id, furnitureId: f.id };

  // Position
  if (position) {
    mesh.position.set(...position);
  } else {
    mesh.position.set(
      (Math.random() - 0.5) * 6,
      0,
      (Math.random() - 0.5) * 6
    );
  }

  scene.add(mesh);
  sceneObjects.push({ id, mesh, furniture: f, customMat: null });

  saveUndoState();
  selectObject(id);
  updateUI();
  syncPushObject(id);
  notify(`Placed: ${f.name}`, 'success');
}

function removeObject(id) {
  const idx = sceneObjects.findIndex(o => o.id === id);
  if (idx === -1) return;

  saveUndoState();
  const obj = sceneObjects[idx];
  transformControls.detach();
  scene.remove(obj.mesh);
  sceneObjects.splice(idx, 1);

  selectedObjectId = null;
  updateUI();
  syncRemoveObject(id);
  notify('Object removed', 'info');
}

function duplicateObject(id) {
  const obj = sceneObjects.find(o => o.id === id);
  if (!obj) return;

  const newId = `obj_${nextObjId++}`;
  const mesh = createMesh(obj.furniture);
  mesh.userData = { objId: newId, furnitureId: obj.furniture.id };
  mesh.position.copy(obj.mesh.position).add(new THREE.Vector3(0.5, 0, 0.5));
  mesh.rotation.copy(obj.mesh.rotation);
  mesh.scale.copy(obj.mesh.scale);

  scene.add(mesh);
  sceneObjects.push({ id: newId, mesh, furniture: obj.furniture, customMat: obj.customMat ? { ...obj.customMat } : null });

  saveUndoState();
  selectObject(newId);
  updateUI();
  notify('Object duplicated', 'success');
}

function selectObject(id) {
  selectedObjectId = id;
  const obj = sceneObjects.find(o => o.id === id);
  if (obj) {
    transformControls.attach(obj.mesh);
    transformControls.setMode(gizmoMode);
    if (snapEnabled) {
      transformControls.setTranslationSnap(snapValue);
      transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
    } else {
      transformControls.setTranslationSnap(null);
      transformControls.setRotationSnap(null);
    }
  }
  updateSelectionInfo();
  updatePropertiesPanel();
  updateSceneTree();
}

function deselectAll() {
  selectedObjectId = null;
  transformControls.detach();
  updateSelectionInfo();
  updatePropertiesPanel();
  updateSceneTree();
}

function dropToGround(id) {
  const obj = sceneObjects.find(o => o.id === id);
  if (!obj) return;
  obj.mesh.position.y = 0;
  updatePropertiesPanel();
  notify('Dropped to ground', 'info');
}

function resetTransform(id) {
  const obj = sceneObjects.find(o => o.id === id);
  if (!obj) return;
  obj.mesh.rotation.set(0, 0, 0);
  obj.mesh.scale.set(1, 1, 1);
  updatePropertiesPanel();
  notify('Transform reset', 'info');
}

function focusCamera(id) {
  const obj = sceneObjects.find(o => o.id === id);
  if (!obj) return;
  orbitControls.target.copy(obj.mesh.position);
}

function clearScene() {
  if (!confirm('Clear all objects from scene?')) return;
  saveUndoState();
  sceneObjects.forEach(o => scene.remove(o.mesh));
  sceneObjects = [];
  transformControls.detach();
  selectedObjectId = null;
  updateUI();
  notify('Scene cleared', 'info');
}

// ════════════════════════════════════════════════════════════
//  UNDO / REDO
// ════════════════════════════════════════════════════════════

function saveUndoState() {
  undoStack.push(sceneObjects.map(o => ({
    furnitureId: o.furniture.id,
    position: [o.mesh.position.x, o.mesh.position.y, o.mesh.position.z],
    rotation: [o.mesh.rotation.x, o.mesh.rotation.y, o.mesh.rotation.z],
    scale: [o.mesh.scale.x, o.mesh.scale.y, o.mesh.scale.z]
  })));
  if (undoStack.length > 30) undoStack.shift();
  redoStack = [];
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(serializeScene());
  restoreState(undoStack.pop());
  notify('Undo', 'info');
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(serializeScene());
  restoreState(redoStack.pop());
  notify('Redo', 'info');
}

function serializeScene() {
  return sceneObjects.map(o => ({
    furnitureId: o.furniture.id,
    position: [o.mesh.position.x, o.mesh.position.y, o.mesh.position.z],
    rotation: [o.mesh.rotation.x, o.mesh.rotation.y, o.mesh.rotation.z],
    scale: [o.mesh.scale.x, o.mesh.scale.y, o.mesh.scale.z]
  }));
}

function restoreState(state) {
  sceneObjects.forEach(o => scene.remove(o.mesh));
  sceneObjects = [];
  transformControls.detach();
  selectedObjectId = null;
  nextObjId = 1;

  state.forEach(s => {
    const f = FURNITURE.find(x => x.id === s.furnitureId);
    if (!f) return;
    const mesh = createMesh(f);
    const id = `obj_${nextObjId++}`;
    mesh.userData = { objId: id, furnitureId: f.id };
    mesh.position.set(...s.position);
    mesh.rotation.set(...s.rotation);
    mesh.scale.set(...s.scale);
    scene.add(mesh);
    sceneObjects.push({ id, mesh, furniture: f, customMat: null });
  });

  updateUI();
}

// ════════════════════════════════════════════════════════════
//  EVENTS
// ════════════════════════════════════════════════════════════

function initEvents(canvas, viewport) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Click selection
  canvas.addEventListener('click', (e) => {
    if (transformControls.dragging) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const meshes = sceneObjects.map(o => o.mesh);
    const hits = raycaster.intersectObjects(meshes, true);

    if (hits.length > 0) {
      let hit = hits[0].object;
      while (hit.parent && !hit.userData.objId) hit = hit.parent;
      if (hit.userData.objId) selectObject(hit.userData.objId);
    } else {
      deselectAll();
    }
  });

  // Context menu
  canvas.addEventListener('contextmenu', (e) => {
    if (!selectedObjectId) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY);
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
      case 'KeyG': setGizmoMode('translate'); break;
      case 'KeyR': if (!e.ctrlKey) setGizmoMode('rotate'); break;
      case 'KeyS': if (!e.ctrlKey) setGizmoMode('scale'); break;
      case 'Delete': case 'Backspace':
        if (selectedObjectId) removeObject(selectedObjectId);
        break;
      case 'KeyD':
        if (e.ctrlKey && selectedObjectId) { e.preventDefault(); duplicateObject(selectedObjectId); }
        break;
      case 'KeyZ':
        if (e.ctrlKey && !e.shiftKey) { e.preventDefault(); undo(); }
        if (e.ctrlKey && e.shiftKey) { e.preventDefault(); redo(); }
        break;
      case 'KeyY':
        if (e.ctrlKey) { e.preventDefault(); redo(); }
        break;
      case 'Escape':
        deselectAll();
        hideContextMenu();
        break;
    }
  });

  // Close context menu on click elsewhere
  window.addEventListener('click', () => hideContextMenu());

  // Context menu actions
  document.querySelectorAll('#ef-context-menu button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!selectedObjectId) return;
      switch (btn.dataset.action) {
        case 'duplicate': duplicateObject(selectedObjectId); break;
        case 'delete': removeObject(selectedObjectId); break;
        case 'focus': focusCamera(selectedObjectId); break;
        case 'reset-transform': resetTransform(selectedObjectId); break;
        case 'copy-pos': {
          const obj = sceneObjects.find(o => o.id === selectedObjectId);
          if (obj) {
            const p = obj.mesh.position;
            navigator.clipboard?.writeText(`[${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}]`);
            notify('Position copied', 'info');
          }
          break;
        }
        case 'ground': dropToGround(selectedObjectId); break;
      }
      hideContextMenu();
    });
  });

  // Gizmo buttons
  document.querySelectorAll('.ef-gizmo-btn').forEach(btn => {
    btn.addEventListener('click', () => setGizmoMode(btn.dataset.mode));
  });

  // View buttons
  document.getElementById('btn-view-top')?.addEventListener('click', () => {
    camera.position.set(0, 15, 0.01);
    orbitControls.target.set(0, 0, 0);
  });
  document.getElementById('btn-view-front')?.addEventListener('click', () => {
    camera.position.set(0, 3, 10);
    orbitControls.target.set(0, 1, 0);
  });
  document.getElementById('btn-view-reset')?.addEventListener('click', () => {
    camera.position.set(6, 5, 6);
    orbitControls.target.set(0, 0, 0);
  });

  // Snap
  document.getElementById('snap-enabled')?.addEventListener('change', (e) => {
    snapEnabled = e.target.checked;
    if (selectedObjectId) selectObject(selectedObjectId);
  });
  document.getElementById('snap-value')?.addEventListener('change', (e) => {
    snapValue = parseFloat(e.target.value);
    if (selectedObjectId) selectObject(selectedObjectId);
  });

  // Right tabs
  document.querySelectorAll('.ef-right-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ef-right-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.ef-right-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`rtab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Top buttons
  document.getElementById('btn-undo')?.addEventListener('click', undo);
  document.getElementById('btn-redo')?.addEventListener('click', redo);
  document.getElementById('btn-save')?.addEventListener('click', saveProject);
  document.getElementById('btn-export')?.addEventListener('click', exportGLTF);
  document.getElementById('btn-place-model')?.addEventListener('click', () => {
    if (selectedModelId) addObjectToScene(selectedModelId);
  });
  document.getElementById('btn-clear-scene')?.addEventListener('click', clearScene);

  // Environment
  document.getElementById('env-ambient')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('env-ambient-val').textContent = v.toFixed(1);
    const light = scene.getObjectByName('ambient');
    if (light) light.intensity = v;
  });
  document.getElementById('env-dir')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('env-dir-val').textContent = v.toFixed(1);
    const light = scene.getObjectByName('directional');
    if (light) light.intensity = v;
  });
  document.getElementById('env-shadow')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('env-shadow-val').textContent = v.toFixed(1);
    const g = scene.getObjectByName('ground');
    if (g) g.material.opacity = v;
  });
  document.getElementById('env-grid-visible')?.addEventListener('change', (e) => {
    const grid = scene.getObjectByName('grid');
    if (grid) grid.visible = e.target.checked;
  });

  // Background presets
  document.querySelectorAll('.ef-env-bg').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ef-env-bg').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const presets = {
        studio: 0x080810,
        dark: 0x020204,
        outdoor: 0x1a2030,
        grid: 0x0a0a0a
      };
      scene.background.setHex(presets[btn.dataset.bg] || 0x080810);
    });
  });

  // Sync buttons
  document.getElementById('btn-push-scene')?.addEventListener('click', syncPushAll);
  document.getElementById('btn-pull-scene')?.addEventListener('click', syncPullAll);

  // Search
  document.getElementById('ef-search')?.addEventListener('input', (e) => {
    renderModels(e.target.value.toLowerCase());
  });
}

// ════════════════════════════════════════════════════════════
//  UI RENDERING
// ════════════════════════════════════════════════════════════

function renderCategories() {
  const container = document.getElementById('ef-categories');
  container.innerHTML = CATEGORIES.map(c =>
    `<button class="ef-cat ${c.id === currentCategory ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${c.name}</button>`
  ).join('');

  container.querySelectorAll('.ef-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.cat;
      renderCategories();
      renderModels();
    });
  });
}

function renderModels(search = '') {
  const container = document.getElementById('ef-model-list');
  let items = FURNITURE.filter(f => f.cat === currentCategory);
  if (search) items = FURNITURE.filter(f => f.name.toLowerCase().includes(search) || f.desc.toLowerCase().includes(search));

  container.innerHTML = items.map(f => `
    <div class="ef-model-item ${selectedModelId === f.id ? 'active' : ''}" data-id="${f.id}">
      <span class="mi-icon">${TYPE_ICONS[f.type] || '📦'}</span>
      <span class="mi-color" style="background:${f.mat.color}"></span>
      <span class="mi-name">${f.name}</span>
    </div>
  `).join('');

  container.querySelectorAll('.ef-model-item').forEach(el => {
    el.addEventListener('click', () => {
      selectedModelId = el.dataset.id;
      renderModels(search);
      renderPreview();
    });
    el.addEventListener('dblclick', () => {
      addObjectToScene(el.dataset.id);
    });
  });
}

function renderPreview() {
  const f = FURNITURE.find(x => x.id === selectedModelId);
  if (!f) return;

  document.getElementById('ef-preview-icon').textContent = TYPE_ICONS[f.type] || '📦';
  document.getElementById('ef-preview-name').textContent = f.name;
  document.getElementById('ef-preview-desc').textContent = f.desc;
  document.getElementById('ef-preview-size').textContent = f.dim.map(d => d.toFixed(1)).join(' × ') + 'm';
  document.getElementById('ef-preview-rough').textContent = Math.round(f.mat.rough * 100) + '%';
  document.getElementById('ef-preview-metal').textContent = Math.round(f.mat.metal * 100) + '%';
  document.getElementById('ef-preview-swatch').style.background = f.mat.color;
  document.getElementById('ef-preview-color-hex').textContent = f.mat.color;
}

function updateUI() {
  document.getElementById('ef-obj-count').textContent = sceneObjects.length;
  updateSceneTree();
  updatePropertiesPanel();
  updateSelectionInfo();
}

function updateSelectionInfo() {
  const el = document.getElementById('ef-selection-info');
  if (!selectedObjectId) { el.classList.add('hidden'); return; }
  const obj = sceneObjects.find(o => o.id === selectedObjectId);
  if (!obj) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  document.getElementById('ef-sel-name').textContent = obj.furniture.name;
  const p = obj.mesh.position;
  document.getElementById('ef-sel-pos').textContent = `[${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}]`;
}

function updateSceneTree() {
  const tree = document.getElementById('ef-scene-tree');
  if (sceneObjects.length === 0) {
    tree.innerHTML = '<div class="ef-empty-state">Scene is empty</div>';
    return;
  }
  tree.innerHTML = sceneObjects.map(o => `
    <div class="ef-scene-item ${o.id === selectedObjectId ? 'selected' : ''}" data-id="${o.id}">
      <span class="si-color" style="background:${o.furniture.mat.color}"></span>
      <span class="si-name">${o.furniture.name}</span>
      <span class="si-type">${o.furniture.type}</span>
      <span class="si-vis" onclick="event.stopPropagation();toggleVisibility('${o.id}')">👁</span>
    </div>
  `).join('');

  tree.querySelectorAll('.ef-scene-item').forEach(el => {
    el.addEventListener('click', () => selectObject(el.dataset.id));
  });
}

window.toggleVisibility = function(id) {
  const obj = sceneObjects.find(o => o.id === id);
  if (obj) obj.mesh.visible = !obj.mesh.visible;
};

function updatePropertiesPanel() {
  const panel = document.getElementById('ef-props-panel');
  if (!selectedObjectId) {
    panel.innerHTML = '<div class="ef-empty-state">Select an object to edit</div>';
    return;
  }
  const obj = sceneObjects.find(o => o.id === selectedObjectId);
  if (!obj) return;

  const p = obj.mesh.position;
  const r = obj.mesh.rotation;
  const s = obj.mesh.scale;

  panel.innerHTML = `
    <div class="ef-prop-section">
      <h4>${obj.furniture.name}</h4>
      <p style="font-size:10px;color:var(--dim);margin-bottom:8px;line-height:1.5">${obj.furniture.desc}</p>
    </div>

    <div class="ef-prop-section">
      <h4>Position</h4>
      <div class="ef-vec3">
        <input type="number" value="${p.x.toFixed(3)}" step="0.1" data-prop="px">
        <input type="number" value="${p.y.toFixed(3)}" step="0.1" data-prop="py">
        <input type="number" value="${p.z.toFixed(3)}" step="0.1" data-prop="pz">
      </div>
    </div>

    <div class="ef-prop-section">
      <h4>Rotation (deg)</h4>
      <div class="ef-vec3">
        <input type="number" value="${(r.x * 180 / Math.PI).toFixed(1)}" step="5" data-prop="rx">
        <input type="number" value="${(r.y * 180 / Math.PI).toFixed(1)}" step="5" data-prop="ry">
        <input type="number" value="${(r.z * 180 / Math.PI).toFixed(1)}" step="5" data-prop="rz">
      </div>
    </div>

    <div class="ef-prop-section">
      <h4>Scale</h4>
      <div class="ef-vec3">
        <input type="number" value="${s.x.toFixed(2)}" step="0.1" min="0.1" data-prop="sx">
        <input type="number" value="${s.y.toFixed(2)}" step="0.1" min="0.1" data-prop="sy">
        <input type="number" value="${s.z.toFixed(2)}" step="0.1" min="0.1" data-prop="sz">
      </div>
    </div>

    <div class="ef-prop-section">
      <h4>Material</h4>
      <div class="ef-color-row">
        <label>Color</label>
        <input type="color" value="${obj.furniture.mat.color}" data-prop="color">
        <span>${obj.furniture.mat.color}</span>
      </div>
      <div class="ef-range-row">
        <label>Roughness <span class="ef-range-val">${Math.round(obj.furniture.mat.rough * 100)}%</span></label>
        <input type="range" min="0" max="1" step="0.01" value="${obj.furniture.mat.rough}" data-prop="roughness">
      </div>
      <div class="ef-range-row">
        <label>Metalness <span class="ef-range-val">${Math.round(obj.furniture.mat.metal * 100)}%</span></label>
        <input type="range" min="0" max="1" step="0.01" value="${obj.furniture.mat.metal}" data-prop="metalness">
      </div>
    </div>

    <div class="ef-prop-section" style="border-bottom:none">
      <button class="ef-btn small" onclick="dropToGround('${obj.id}')">⬇ Drop to Ground</button>
      <button class="ef-btn small" onclick="resetTransform('${obj.id}')">↩ Reset Transform</button>
      <button class="ef-btn small" onclick="duplicateObject('${obj.id}')">📋 Duplicate</button>
      <button class="ef-btn small danger" onclick="removeObject('${obj.id}')">🗑️ Delete</button>
    </div>
  `;

  // Bind inputs
  panel.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('change', () => updateFromProperty(obj.id, inp.dataset.prop, inp.value, inp.type));
    if (inp.type === 'range') {
      inp.addEventListener('input', () => {
        updateFromProperty(obj.id, inp.dataset.prop, inp.value, inp.type);
        const label = inp.parentElement.querySelector('.ef-range-val');
        if (label) label.textContent = Math.round(parseFloat(inp.value) * 100) + '%';
      });
    }
  });
}

// Expose for onclick in HTML
window.dropToGround = dropToGround;
window.resetTransform = resetTransform;
window.duplicateObject = duplicateObject;
window.removeObject = removeObject;

function updateFromProperty(id, prop, val, type) {
  const obj = sceneObjects.find(o => o.id === id);
  if (!obj) return;
  const v = parseFloat(val);

  switch (prop) {
    case 'px': obj.mesh.position.x = v; break;
    case 'py': obj.mesh.position.y = v; break;
    case 'pz': obj.mesh.position.z = v; break;
    case 'rx': obj.mesh.rotation.x = v * Math.PI / 180; break;
    case 'ry': obj.mesh.rotation.y = v * Math.PI / 180; break;
    case 'rz': obj.mesh.rotation.z = v * Math.PI / 180; break;
    case 'sx': obj.mesh.scale.x = v; break;
    case 'sy': obj.mesh.scale.y = v; break;
    case 'sz': obj.mesh.scale.z = v; break;
    case 'color':
      obj.mesh.traverse(c => { if (c.isMesh) c.material.color.set(val); });
      break;
    case 'roughness':
      obj.mesh.traverse(c => { if (c.isMesh) c.material.roughness = v; });
      break;
    case 'metalness':
      obj.mesh.traverse(c => { if (c.isMesh) c.material.metalness = v; });
      break;
  }

  updateSelectionInfo();
}

function setGizmoMode(mode) {
  gizmoMode = mode;
  if (selectedObjectId) transformControls.setMode(mode);
  document.querySelectorAll('.ef-gizmo-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
}

// ════════════════════════════════════════════════════════════
//  CONTEXT MENU
// ════════════════════════════════════════════════════════════

function showContextMenu(x, y) {
  const menu = document.getElementById('ef-context-menu');
  menu.classList.remove('hidden');
  menu.style.left = Math.min(x, innerWidth - 200) + 'px';
  menu.style.top = Math.min(y, innerHeight - 250) + 'px';
}

function hideContextMenu() {
  document.getElementById('ef-context-menu').classList.add('hidden');
}

// ════════════════════════════════════════════════════════════
//  SAVE / EXPORT
// ════════════════════════════════════════════════════════════

function saveProject() {
  const data = {
    name: 'EtherForge Project',
    version: '2.0',
    createdAt: new Date().toISOString(),
    objects: serializeScene()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `etherforge_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  notify('Project saved!', 'success');
}

function exportGLTF() {
  const exporter = new GLTFExporter();
  const exportScene = new THREE.Scene();
  sceneObjects.forEach(o => exportScene.add(o.mesh.clone()));

  exporter.parse(exportScene, (gltf) => {
    const blob = new Blob([JSON.stringify(gltf, null, 2)], { type: 'model/gltf+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etherforge_${Date.now()}.gltf`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported as GLTF!', 'success');
  }, (err) => {
    notify('Export failed: ' + err, 'error');
  }, { binary: false });
}

// ════════════════════════════════════════════════════════════
//  SYNC WITH PLATFORM TESTER 3D
// ════════════════════════════════════════════════════════════

let syncInterval = null;

function startSync() {
  // Vérifier la connexion au serveur régulièrement
  syncInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/platforms');
      if (res.ok) {
        document.getElementById('ef-sync-state').textContent = 'Connected';
        document.getElementById('ef-sync-state').style.color = '#43e97b';
      }
    } catch {
      document.getElementById('ef-sync-state').textContent = 'Offline';
      document.getElementById('ef-sync-state').style.color = '#ff4455';
    }
  }, 5000);
}

async function syncPushObject(id) {
  const obj = sceneObjects.find(o => o.id === id);
  if (!obj) return;

  try {
    const data = {
      type: 'static',
      position: [obj.mesh.position.x, obj.mesh.position.y, obj.mesh.position.z],
      size: obj.furniture.dim,
      color: obj.furniture.mat.color,
      material: 'standard',
      isStatic: true,
      etherforge_id: obj.id,
      etherforge_name: obj.furniture.name
    };
    await fetch('/api/platforms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.warn('[Sync] Push failed:', e);
  }
}

async function syncRemoveObject(id) {
  // On ne peut pas facilement mapper les IDs, mais on pourrait
  // implémenter un système d'etherforge_id côté serveur
  console.log('[Sync] Object removed:', id);
}

async function syncPushAll() {
  try {
    // Générer une nouvelle scène avec un seed basé sur les objets
    const seed = sceneObjects.length + Date.now() % 10000;
    await fetch('/api/platforms/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed, count: 0 })
    });

    // Ajouter chaque objet
    for (const obj of sceneObjects) {
      await fetch('/api/platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'static',
          position: [obj.mesh.position.x, obj.mesh.position.y, obj.mesh.position.z],
          size: obj.furniture.dim,
          color: obj.furniture.mat.color,
          material: 'standard',
          isStatic: true,
          etherforge_id: obj.id,
          etherforge_name: obj.furniture.name
        })
      });
    }
    notify(`Pushed ${sceneObjects.length} objects to Platform Tester`, 'success');
  } catch (e) {
    notify('Push failed', 'error');
  }
}

async function syncPullAll() {
  try {
    const res = await fetch('/api/platforms');
    const data = await res.json();
    notify(`Platform Tester has ${data.platforms.length} platforms`, 'info');
  } catch (e) {
    notify('Pull failed', 'error');
  }
}

// ════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════

function notify(text, type = 'info') {
  const container = document.getElementById('ef-notifications');
  const div = document.createElement('div');
  div.className = `ef-notif ${type}`;
  div.textContent = text;
  container.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', init);

console.log('%c⬡ EtherForge Creator — TroxT', 'color:#7b6fff;font-size:18px;font-weight:900');
console.log('%cBuilder + Showroom + Platform Tester Sync', 'color:#00d4ff;font-size:12px');