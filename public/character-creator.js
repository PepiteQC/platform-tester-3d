// ============================================================
//  ETHERWORLD — Character Creator 3D
//  Powered by TroxT Neural Core
//  Three.js Realistic Humanoid — RP Grade
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── STATE ────────────────────────────────────────────────────
const state = {
  step: 0,
  gender: 'male',
  name: 'NOUVEAU_PERSO',
  nationality: 'american',
  skin: 0,
  faceShape: 0,
  eyeColor: 0,
  hairStyle: 0,
  hairColor: 0,
  facialHair: 0,
  bodyType: 0,
  height: 50,
  muscular: 45,
  fatness: 30,
  topStyle: 0,
  topColor: 0,
  pantsStyle: 0,
  pantsColor: 0,
  shoesStyle: 0,
  shoesColor: 0,
};

// ── PALETTE DATA ─────────────────────────────────────────────
const SKIN_COLORS = [
  '#f5cba7','#e8a87c','#d48b5a','#c0724b','#8b5535','#5c3317',
];
const HAIR_COLORS = [
  '#1a0a00','#3b1f0a','#6b3a2a','#a0522d','#c19a6b','#f5deb3',
  '#ffd700','#ff4500','#c0c0c0','#2f4f4f','#1e1e8c','#000000',
];
const EYE_COLORS = [
  '#4169e1','#228b22','#8b4513','#20b2aa','#696969','#2f4f4f',
];
const OUTFIT_COLORS = [
  '#1a1a2e','#16213e','#0f3460','#533483','#2d6a4f','#1b4332',
  '#9b2226','#ae2012','#bb3e03','#ca6702','#b5838d','#e5e5e5',
];

const HAIR_STYLES = ['Buzz','Crew','Side Part','Slick Back','Undercut','Long','Mohawk','Bald'];
const FACE_SHAPES = ['Regular','Square','Round','Oval'];
const BODY_TYPES  = ['Slim','Regular','Athletic','Heavy'];
const TOPS        = ['T-Shirt','Hoodie','Dress Shirt','Jacket','Tank Top','Suit'];
const PANTS       = ['Jeans','Chinos','Shorts','Track Pants','Dress Pants','Cargo'];
const SHOES       = ['Sneakers','Boots','Dress Shoes','Sandals','High-Tops','Slip-Ons'];
const FACIAL_HAIR = ['Clean','Stubble','Goatee','Full Beard','Mustache','None'];

// ── THREE.JS SETUP ───────────────────────────────────────────
const canvas = document.getElementById('cc-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060b14);
scene.fog = new THREE.FogExp2(0x060b14, 0.035);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 1.6, 3.5);
camera.lookAt(0, 1.0, 0);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.maxPolarAngle = Math.PI * 0.85;
controls.minDistance = 1.5;
controls.maxDistance = 6;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.update();

// ── LIGHTS ───────────────────────────────────────────────────
// Key light
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(3, 6, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 20;
keyLight.shadow.camera.top = 4;
keyLight.shadow.camera.bottom = -1;
keyLight.shadow.camera.left = -4;
keyLight.shadow.camera.right = 4;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);

// Fill light
const fillLight = new THREE.DirectionalLight(0x4488ff, 0.8);
fillLight.position.set(-4, 3, -2);
scene.add(fillLight);

// Back light / rim
const rimLight = new THREE.DirectionalLight(0x00d4ff, 1.2);
rimLight.position.set(0, 4, -5);
scene.add(rimLight);

// Ambient
const ambient = new THREE.AmbientLight(0x1a2030, 1.0);
scene.add(ambient);

// Floor spotlight
const spotLight = new THREE.SpotLight(0x00d4ff, 2.5, 10, Math.PI * 0.15, 0.5, 2);
spotLight.position.set(0, 6, 0);
spotLight.target.position.set(0, 0, 0);
scene.add(spotLight);
scene.add(spotLight.target);

// ── FLOOR ────────────────────────────────────────────────────
const floorGeo = new THREE.CircleGeometry(4, 64);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x0a1020, metalness: 0.2, roughness: 0.8,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Grid lines on floor
const gridHelper = new THREE.GridHelper(8, 16, 0x00d4ff, 0x0a1520);
gridHelper.material.opacity = 0.3;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// Floor glow ring
const ringGeo = new THREE.TorusGeometry(0.9, 0.02, 8, 64);
const ringMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.5 });
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.01;
scene.add(ring);

// ── CHARACTER GROUP ──────────────────────────────────────────
const charGroup = new THREE.Group();
scene.add(charGroup);

// Materials cache
const skinMat   = new THREE.MeshStandardMaterial({ color: 0xf5cba7, roughness: 0.65, metalness: 0.0 });
const hairMat   = new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 0.8,  metalness: 0.0 });
const eyeWhite  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3,  metalness: 0.0 });
const eyeIrisMat= new THREE.MeshStandardMaterial({ color: 0x4169e1, roughness: 0.2, metalness: 0.1 });
const eyePupil  = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.0 });
const clothTop  = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.85, metalness: 0.0 });
const clothBot  = new THREE.MeshStandardMaterial({ color: 0x16213e, roughness: 0.85, metalness: 0.0 });
const shoesMat  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7,  metalness: 0.1 });
const teethMat  = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.4,  metalness: 0.0 });
const noseMat   = new THREE.MeshStandardMaterial({ color: 0xeab98e, roughness: 0.65, metalness: 0.0 });
const beltMat   = new THREE.MeshStandardMaterial({ color: 0x2a2010, roughness: 0.6, metalness: 0.3 });
const buckMat   = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.3, metalness: 0.8 });

// Helper: smooth mesh creation
function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ── BUILD CHARACTER ──────────────────────────────────────────
let bodyParts = {};

function buildCharacter() {
  // Clear
  while (charGroup.children.length) charGroup.remove(charGroup.children[0]);
  bodyParts = {};

  const s = getBodyScale(); // { x, y, z }

  // ── HEAD ──
  const headGeo = new THREE.SphereGeometry(0.145, 32, 24);
  const head = mesh(headGeo, skinMat);
  head.position.set(0, 1.68, 0);
  head.scale.set(0.95 + state.fatness * 0.002, 1, 0.85);
  charGroup.add(head);
  bodyParts.head = head;

  // Skull top (slight elongation for face shape)
  const skullTop = mesh(new THREE.SphereGeometry(0.11, 16, 12), skinMat);
  skullTop.position.set(0, 1.78, -0.02);
  skullTop.scale.set(0.98, 1.05, 0.9);
  charGroup.add(skullTop);

  // Jaw / chin
  const jawGeo = new THREE.SphereGeometry(0.09, 16, 12);
  const jaw = mesh(jawGeo, skinMat);
  jaw.position.set(0, 1.59, 0.02);
  jaw.scale.set(0.9, 0.7, 0.8);
  charGroup.add(jaw);

  // Cheekbones
  [-1,1].forEach(side => {
    const cheek = mesh(new THREE.SphereGeometry(0.055, 12, 10), skinMat);
    cheek.position.set(side * 0.11, 1.65, 0.07);
    cheek.scale.set(1, 0.75, 0.7);
    charGroup.add(cheek);
  });

  // ── EYES ──
  [-1,1].forEach(side => {
    const eyeSocketGeo = new THREE.SphereGeometry(0.028, 12, 10);
    const eyeSocket = mesh(eyeSocketGeo, eyeWhite);
    eyeSocket.position.set(side * 0.055, 1.672, 0.122);
    charGroup.add(eyeSocket);

    const irisGeo = new THREE.SphereGeometry(0.018, 10, 8);
    const iris = mesh(irisGeo, eyeIrisMat);
    iris.position.set(side * 0.055, 1.672, 0.138);
    charGroup.add(iris);
    bodyParts[`iris${side > 0 ? 'R' : 'L'}`] = iris;

    const pupilGeo = new THREE.SphereGeometry(0.009, 8, 8);
    const pupil = mesh(pupilGeo, eyePupil);
    pupil.position.set(side * 0.055, 1.672, 0.145);
    charGroup.add(pupil);

    // Eyelid top
    const lid = mesh(new THREE.SphereGeometry(0.029, 12, 6, 0, Math.PI*2, 0, Math.PI*0.5), skinMat);
    lid.position.set(side * 0.055, 1.676, 0.122);
    lid.rotation.x = 0.2;
    charGroup.add(lid);
  });

  // ── EYEBROWS ──
  [-1,1].forEach(side => {
    const browGeo = new THREE.BoxGeometry(0.045, 0.007, 0.008);
    const brow = mesh(browGeo, hairMat);
    brow.position.set(side * 0.055, 1.694, 0.118);
    brow.rotation.z = side * -0.1;
    charGroup.add(brow);
  });

  // ── NOSE ──
  const noseGeo = new THREE.ConeGeometry(0.018, 0.04, 8);
  const nose = mesh(noseGeo, noseMat);
  nose.rotation.x = Math.PI * 0.55;
  nose.position.set(0, 1.658, 0.14);
  charGroup.add(nose);

  const noseTip = mesh(new THREE.SphereGeometry(0.02, 10, 8), noseMat);
  noseTip.position.set(0, 1.645, 0.148);
  noseTip.scale.set(1.1, 0.9, 1);
  charGroup.add(noseTip);

  // Nostrils
  [-1,1].forEach(side => {
    const nostril = mesh(new THREE.SphereGeometry(0.008, 8, 6), noseMat);
    nostril.position.set(side * 0.018, 1.645, 0.143);
    charGroup.add(nostril);
  });

  // ── LIPS / MOUTH ──
  const lipsGeo = new THREE.BoxGeometry(0.062, 0.014, 0.012);
  const lips = mesh(lipsGeo, new THREE.MeshStandardMaterial({ color: 0xc07060, roughness: 0.5 }));
  lips.position.set(0, 1.635, 0.136);
  charGroup.add(lips);

  // ── EAR ──
  [-1,1].forEach(side => {
    const earGeo = new THREE.SphereGeometry(0.025, 10, 8);
    const ear = mesh(earGeo, skinMat);
    ear.scale.set(0.55, 0.85, 0.5);
    ear.position.set(side * 0.15, 1.665, 0.0);
    charGroup.add(ear);
  });

  // ── NECK ──
  const neckGeo = new THREE.CylinderGeometry(0.058, 0.062, 0.12, 16);
  const neck = mesh(neckGeo, skinMat);
  neck.position.set(0, 1.555, 0);
  charGroup.add(neck);

  // ── TORSO ──
  const chestW = 0.19 + state.fatness * 0.0015 + state.muscular * 0.001;
  const torsoGeo = new THREE.BoxGeometry(chestW * 2, 0.35, 0.135);
  const torso = mesh(torsoGeo, clothTop);
  torso.position.set(0, 1.32, 0);
  torso.scale.set(s.x, s.y * 0.95, s.z);
  charGroup.add(torso);
  bodyParts.torso = torso;

  // Chest detail (pec muscle)
  if (state.muscular > 50) {
    [-1,1].forEach(side => {
      const pec = mesh(new THREE.SphereGeometry(0.065, 12, 10), clothTop);
      pec.scale.set(0.85, 0.65, 0.6);
      pec.position.set(side * 0.085, 1.37, 0.065);
      charGroup.add(pec);
    });
  }

  // Belly / gut
  if (state.fatness > 60) {
    const bellyR = 0.05 + (state.fatness - 60) * 0.0025;
    const belly = mesh(new THREE.SphereGeometry(bellyR, 16, 12), clothTop);
    belly.position.set(0, 1.22, 0.085);
    charGroup.add(belly);
  }

  // ── PELVIS ──
  const hipsW = 0.16 + state.fatness * 0.0012;
  const pelvisGeo = new THREE.BoxGeometry(hipsW * 2, 0.14, 0.125);
  const pelvis = mesh(pelvisGeo, clothBot);
  pelvis.position.set(0, 1.06, 0);
  pelvis.scale.set(s.x * 0.95, 1, s.z);
  charGroup.add(pelvis);
  bodyParts.pelvis = pelvis;

  // Belt
  const beltGeo = new THREE.TorusGeometry(hipsW * 1.02, 0.012, 8, 32, Math.PI * 1.05);
  const belt = mesh(beltGeo, beltMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.set(0, 1.105, 0.015);
  charGroup.add(belt);

  const beltBuckle = mesh(new THREE.BoxGeometry(0.04, 0.032, 0.01), buckMat);
  beltBuckle.position.set(0, 1.105, 0.075);
  charGroup.add(beltBuckle);

  // ── ARMS ──
  buildArm(-1); // left
  buildArm(1);  // right

  // ── LEGS ──
  buildLeg(-1); // left
  buildLeg(1);  // right

  // ── HAIR ──
  buildHair();

  // ── FACIAL HAIR ──
  buildFacialHair();
}

function getBodyScale() {
  const h = 0.88 + state.height * 0.0024;
  const w = 0.88 + state.fatness * 0.0018;
  const d = 0.88 + state.fatness * 0.0014 + state.muscular * 0.0008;
  return { x: w, y: h, z: d };
}

function buildArm(side) {
  const x = side * (0.195 + state.fatness * 0.001);
  const armR  = 0.042 + state.muscular * 0.0005 + state.fatness * 0.0003;
  const foreR = 0.036 + state.muscular * 0.0003 + state.fatness * 0.0002;

  // Upper arm
  const upperGeo = new THREE.CapsuleGeometry(armR, 0.18, 8, 16);
  const upper = mesh(upperGeo, clothTop);
  upper.position.set(x, 1.32, 0);
  upper.rotation.z = side * -0.12;
  charGroup.add(upper);

  // Forearm
  const foreGeo = new THREE.CapsuleGeometry(foreR, 0.18, 8, 16);
  const fore = mesh(foreGeo, skinMat);
  fore.position.set(x * 1.04, 1.11, 0.01);
  fore.rotation.z = side * -0.08;
  charGroup.add(fore);

  // Hand
  const handGeo = new THREE.BoxGeometry(0.065, 0.085, 0.028);
  const hand = mesh(handGeo, skinMat);
  hand.position.set(x * 1.08, 0.97, 0.015);
  charGroup.add(hand);

  // Thumb
  const thumbGeo = new THREE.CapsuleGeometry(0.012, 0.03, 4, 8);
  const thumb = mesh(thumbGeo, skinMat);
  thumb.position.set(x * 1.1 + side * 0.04, 0.975, 0.025);
  thumb.rotation.z = side * 0.6;
  charGroup.add(thumb);

  // Shoulder pad
  const shoulderGeo = new THREE.SphereGeometry(0.06 + state.muscular * 0.0005, 12, 10);
  const shoulder = mesh(shoulderGeo, clothTop);
  shoulder.scale.set(0.9, 0.85, 0.85);
  shoulder.position.set(side * 0.175, 1.46, 0);
  charGroup.add(shoulder);
}

function buildLeg(side) {
  const x = side * 0.085;
  const thighR = 0.065 + state.fatness * 0.001 + state.muscular * 0.0005;
  const shinR  = 0.048 + state.fatness * 0.0006;

  // Thigh
  const thighGeo = new THREE.CapsuleGeometry(thighR, 0.24, 8, 16);
  const thigh = mesh(thighGeo, clothBot);
  thigh.position.set(x, 0.82, 0.005);
  charGroup.add(thigh);

  // Shin
  const shinGeo = new THREE.CapsuleGeometry(shinR, 0.22, 8, 16);
  const shin = mesh(shinGeo, clothBot);
  shin.position.set(x, 0.52, 0.01);
  charGroup.add(shin);

  // Ankle
  const ankle = mesh(new THREE.SphereGeometry(0.038, 10, 8), skinMat);
  ankle.position.set(x, 0.37, 0.01);
  charGroup.add(ankle);

  // Shoe / Foot
  const shoeGeo = new THREE.BoxGeometry(0.085, 0.055, 0.18);
  const shoe = mesh(shoeGeo, shoesMat);
  shoe.position.set(x, 0.34, 0.03);
  charGroup.add(shoe);

  // Shoe sole
  const soleGeo = new THREE.BoxGeometry(0.09, 0.02, 0.185);
  const sole = mesh(soleGeo, new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9 }));
  sole.position.set(x, 0.31, 0.03);
  charGroup.add(sole);

  // Shoe toe bump
  const toeBump = mesh(new THREE.SphereGeometry(0.044, 10, 8), shoesMat);
  toeBump.scale.set(0.95, 0.6, 0.6);
  toeBump.position.set(x, 0.355, 0.1);
  charGroup.add(toeBump);

  // Knee cap
  const knee = mesh(new THREE.SphereGeometry(0.04, 10, 8), clothBot);
  knee.scale.set(0.9, 0.8, 0.8);
  knee.position.set(x, 0.66, 0.04);
  charGroup.add(knee);
}

function buildHair() {
  const style = state.hairStyle;
  const hy = 1.78;

  if (style === 7) return; // Bald

  const hairGrp = new THREE.Group();

  if (style === 0) { // Buzz
    const buzzGeo = new THREE.SphereGeometry(0.148, 24, 16);
    const buzz = mesh(buzzGeo, hairMat);
    buzz.position.y = hy;
    buzz.scale.set(0.952, 0.78, 0.86);
    hairGrp.add(buzz);
  } else if (style === 1) { // Crew
    const crewTop = mesh(new THREE.SphereGeometry(0.145, 20, 14), hairMat);
    crewTop.position.set(0, hy + 0.02, 0);
    crewTop.scale.set(0.95, 0.65, 0.88);
    hairGrp.add(crewTop);
    // Sides close crop
    [-1,1].forEach(s => {
      const side = mesh(new THREE.BoxGeometry(0.04, 0.12, 0.12), hairMat);
      side.position.set(s * 0.135, hy - 0.04, 0);
      hairGrp.add(side);
    });
  } else if (style === 2) { // Side Part
    const topMesh = mesh(new THREE.SphereGeometry(0.15, 20, 14), hairMat);
    topMesh.position.set(-0.02, hy + 0.02, 0);
    topMesh.scale.set(0.96, 0.62, 0.88);
    hairGrp.add(topMesh);
    const partRidge = mesh(new THREE.BoxGeometry(0.14, 0.018, 0.18), hairMat);
    partRidge.position.set(-0.04, hy + 0.06, 0);
    partRidge.rotation.z = 0.15;
    hairGrp.add(partRidge);
  } else if (style === 3) { // Slick Back
    const slickBase = mesh(new THREE.SphereGeometry(0.15, 20, 14), hairMat);
    slickBase.position.set(0, hy, -0.01);
    slickBase.scale.set(0.95, 0.6, 0.9);
    hairGrp.add(slickBase);
    const slickBack = mesh(new THREE.BoxGeometry(0.22, 0.04, 0.18), hairMat);
    slickBack.position.set(0, hy + 0.04, -0.04);
    slickBack.rotation.x = -0.3;
    hairGrp.add(slickBack);
  } else if (style === 4) { // Undercut
    const top2 = mesh(new THREE.SphereGeometry(0.148, 20, 14), hairMat);
    top2.position.set(0, hy + 0.03, 0);
    top2.scale.set(0.94, 0.72, 0.88);
    hairGrp.add(top2);
    const pompadour = mesh(new THREE.BoxGeometry(0.18, 0.06, 0.14), hairMat);
    pompadour.position.set(0, hy + 0.09, 0.02);
    pompadour.rotation.x = 0.1;
    hairGrp.add(pompadour);
  } else if (style === 5) { // Long
    const longBase = mesh(new THREE.SphereGeometry(0.15, 20, 16), hairMat);
    longBase.position.set(0, hy, 0);
    longBase.scale.set(0.97, 0.72, 0.92);
    hairGrp.add(longBase);
    // Long hair strands
    [[0,-0.1,-0.09],[-0.1,-0.13,-0.04],[0.1,-0.13,-0.04],[0,-0.15,0.01]].forEach(([lx,ly,lz]) => {
      const strand = mesh(new THREE.CapsuleGeometry(0.04, 0.22, 6, 10), hairMat);
      strand.position.set(lx, hy + ly, lz);
      strand.rotation.x = -0.1;
      hairGrp.add(strand);
    });
  } else if (style === 6) { // Mohawk
    const mohawk = mesh(new THREE.BoxGeometry(0.048, 0.16, 0.2), hairMat);
    mohawk.position.set(0, hy + 0.1, 0);
    mohawk.rotation.x = 0.08;
    hairGrp.add(mohawk);
    const mohawkBase = mesh(new THREE.BoxGeometry(0.048, 0.02, 0.24), hairMat);
    mohawkBase.position.set(0, hy, 0);
    hairGrp.add(mohawkBase);
  }

  charGroup.add(hairGrp);
  bodyParts.hair = hairGrp;
}

function buildFacialHair() {
  const style = state.facialHair;
  if (style === 0 || style === 5) return; // Clean / None

  if (style === 1) { // Stubble
    const stubble = mesh(new THREE.SphereGeometry(0.095, 16, 12), new THREE.MeshStandardMaterial({
      color: hairMat.color.clone(), roughness: 0.9, metalness: 0, opacity: 0.4, transparent: true
    }));
    stubble.scale.set(1, 0.5, 0.85);
    stubble.position.set(0, 1.624, 0.06);
    charGroup.add(stubble);
  } else if (style === 2) { // Goatee
    const goatee = mesh(new THREE.BoxGeometry(0.05, 0.055, 0.018), hairMat);
    goatee.position.set(0, 1.605, 0.135);
    charGroup.add(goatee);
    const mustache = mesh(new THREE.BoxGeometry(0.08, 0.018, 0.015), hairMat);
    mustache.position.set(0, 1.637, 0.138);
    charGroup.add(mustache);
  } else if (style === 3) { // Full beard
    const beard = mesh(new THREE.SphereGeometry(0.1, 16, 12), hairMat);
    beard.scale.set(0.88, 0.52, 0.75);
    beard.position.set(0, 1.618, 0.065);
    charGroup.add(beard);
    const mustache2 = mesh(new THREE.BoxGeometry(0.09, 0.022, 0.015), hairMat);
    mustache2.position.set(0, 1.638, 0.138);
    charGroup.add(mustache2);
  } else if (style === 4) { // Mustache
    const mustOnly = mesh(new THREE.BoxGeometry(0.1, 0.025, 0.018), hairMat);
    mustOnly.position.set(0, 1.638, 0.137);
    charGroup.add(mustOnly);
  }
}

// ── APPLY COLORS ─────────────────────────────────────────────
function applyColors() {
  skinMat.color.set(SKIN_COLORS[state.skin]);
  noseMat.color.set(new THREE.Color(SKIN_COLORS[state.skin]).multiplyScalar(0.95));
  hairMat.color.set(HAIR_COLORS[state.hairColor]);
  eyeIrisMat.color.set(EYE_COLORS[state.eyeColor]);
  clothTop.color.set(OUTFIT_COLORS[state.topColor]);
  clothBot.color.set(OUTFIT_COLORS[state.pantsColor]);
  shoesMat.color.set(OUTFIT_COLORS[state.shoesColor]);
  skinMat.needsUpdate = true;
  noseMat.needsUpdate = true;
  hairMat.needsUpdate = true;
  eyeIrisMat.needsUpdate = true;
  clothTop.needsUpdate = true;
  clothBot.needsUpdate = true;
  shoesMat.needsUpdate = true;
}

// ── RESIZE ───────────────────────────────────────────────────
function resize() {
  const vp = document.querySelector('.cc-viewport');
  if (!vp) return;
  const w = vp.clientWidth, h = vp.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

// ── ANIMATE ──────────────────────────────────────────────────
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Ring pulse
  ring.material.emissiveIntensity = 1.0 + Math.sin(t * 2) * 0.5;
  ring.scale.setScalar(1 + Math.sin(t * 1.5) * 0.015);

  // Subtle character bob
  charGroup.position.y = Math.sin(t * 0.8) * 0.008;

  controls.update();
  renderer.render(scene, camera);
}

// ── INITIAL BUILD ─────────────────────────────────────────────
buildCharacter();
applyColors();
animate();

// ════════════════════════════════════════════════════════════
//  UI LOGIC
// ════════════════════════════════════════════════════════════

const STEP_COUNT = 5;

// ── LOG SYSTEM ────────────────────────────────────────────────
const logBody = document.querySelector('.cc-troxt-log-body');
const troxtLogs = [
  'TroxT Neural Core — Online',
  'Character editor initialized',
  'Three.js renderer active',
  'Awaiting identity input...',
];
troxtLogs.forEach(addLog);

function addLog(msg) {
  if (!logBody) return;
  const line = document.createElement('div');
  line.className = 'cc-log-line';
  line.innerHTML = `<span class="log-prefix">⬡</span><span class="log-text">${msg}</span>`;
  logBody.appendChild(line);
  logBody.scrollTop = logBody.scrollHeight;
  // Trim old
  while (logBody.children.length > 20) logBody.removeChild(logBody.firstChild);
}

// ── TABS ─────────────────────────────────────────────────────
document.querySelectorAll('.cc-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cc-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.cc-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.panel;
    document.getElementById('panel-' + target)?.classList.add('active');
    addLog(`Panel switched → ${target.toUpperCase()}`);
  });
});

// ── STEP NAVIGATION ─────────────────────────────────────────
const STEP_PANELS = ['identity','face','hair','body','outfit'];

function setStep(s) {
  state.step = Math.max(0, Math.min(STEP_COUNT - 1, s));

  // Update tab
  document.querySelectorAll('.cc-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cc-panel').forEach(p => p.classList.remove('active'));
  const tab = document.querySelector(`[data-panel="${STEP_PANELS[state.step]}"]`);
  if (tab) tab.classList.add('active');
  const panel = document.getElementById('panel-' + STEP_PANELS[state.step]);
  if (panel) panel.classList.add('active');

  // Progress dots
  document.querySelectorAll('.cc-progress-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === state.step);
    dot.classList.toggle('done', i < state.step);
  });

  // Step header indicators
  document.querySelectorAll('.cc-step').forEach((el, i) => {
    el.classList.toggle('active', i === state.step);
    el.classList.toggle('done', i < state.step);
  });

  // Buttons
  const confirmBtn = document.querySelector('.cc-btn-confirm');
  if (confirmBtn) {
    if (state.step === STEP_COUNT - 1) confirmBtn.classList.add('visible');
    else confirmBtn.classList.remove('visible');
  }

  addLog(`Step ${state.step + 1}/${STEP_COUNT} → ${STEP_PANELS[state.step].toUpperCase()}`);
}

document.querySelector('.cc-btn-prev')?.addEventListener('click', () => setStep(state.step - 1));
document.querySelector('.cc-btn-next')?.addEventListener('click', () => setStep(state.step + 1));
document.querySelectorAll('.cc-step').forEach((el, i) => {
  el.addEventListener('click', () => setStep(i));
});

setStep(0);

// ── GENDER ───────────────────────────────────────────────────
document.querySelectorAll('.gender-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.gender = btn.dataset.gender;
    buildCharacter(); applyColors();
    addLog(`Gender set → ${state.gender.toUpperCase()}`);
    updateSummary();
  });
});

// ── NAME INPUT ────────────────────────────────────────────────
const nameInput = document.querySelector('.cc-name-input');
nameInput?.addEventListener('input', e => {
  state.name = e.target.value.toUpperCase() || 'NOUVEAU_PERSO';
  const charNameEl = document.getElementById('vp-char-name');
  if (charNameEl) charNameEl.textContent = state.name;
  const nameDisplayEl = document.querySelector('.cc-char-name-display');
  if (nameDisplayEl) nameDisplayEl.textContent = state.name;
  updateSummary();
});

// ── NATIONALITY ───────────────────────────────────────────────
document.querySelector('#select-nationality')?.addEventListener('change', e => {
  state.nationality = e.target.value;
  addLog(`Nationality → ${e.target.options[e.target.selectedIndex].text}`);
  updateSummary();
});

// ── SWATCHES ─────────────────────────────────────────────────
function setupSwatches(containerSel, colors, stateKey, onApply) {
  const container = document.querySelector(containerSel);
  if (!container) return;
  container.innerHTML = '';
  colors.forEach((c, i) => {
    const sw = document.createElement('div');
    sw.className = 'cc-swatch' + (i === state[stateKey] ? ' active' : '');
    sw.style.background = c;
    sw.title = c;
    sw.addEventListener('click', () => {
      container.querySelectorAll('.cc-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      state[stateKey] = i;
      onApply(i);
    });
    container.appendChild(sw);
  });
}

setupSwatches('#skin-swatches', SKIN_COLORS, 'skin', () => {
  applyColors(); addLog(`Skin tone updated`);
});
setupSwatches('#eye-swatches', EYE_COLORS, 'eyeColor', () => {
  applyColors(); addLog(`Eye color updated`);
});
setupSwatches('#hair-color-swatches', HAIR_COLORS, 'hairColor', () => {
  applyColors(); addLog(`Hair color updated`);
});
setupSwatches('#top-color-swatches', OUTFIT_COLORS, 'topColor', () => {
  applyColors(); updateSummary();
});
setupSwatches('#pants-color-swatches', OUTFIT_COLORS, 'pantsColor', () => {
  applyColors(); updateSummary();
});
setupSwatches('#shoes-color-swatches', OUTFIT_COLORS, 'shoesColor', () => {
  applyColors(); updateSummary();
});

// ── OPTION GRIDS ─────────────────────────────────────────────
function setupOptionGrid(containerSel, options, stateKey, icons, onApply) {
  const container = document.querySelector(containerSel);
  if (!container) return;
  container.innerHTML = '';
  options.forEach((opt, i) => {
    const el = document.createElement('div');
    el.className = 'cc-option' + (i === state[stateKey] ? ' active' : '');
    el.innerHTML = icons ? `<span class="opt-icon">${icons[i]}</span>${opt}` : opt;
    el.addEventListener('click', () => {
      container.querySelectorAll('.cc-option').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
      state[stateKey] = i;
      onApply(i);
    });
    container.appendChild(el);
  });
}

const HAIR_ICONS = ['✂️','✂️','✂️','✂️','✂️','💈','⚡','🔘'];
const FACE_ICONS = ['😐','🟥','🔵','🥚'];
const BODY_ICONS = ['🪄','👤','💪','🏋️'];
const FACIAL_ICONS = ['😊','🧔','🧔','🧔','👨','🔘'];

setupOptionGrid('#hair-style-grid', HAIR_STYLES, 'hairStyle', HAIR_ICONS, () => {
  buildCharacter(); applyColors(); addLog(`Hair style → ${HAIR_STYLES[state.hairStyle]}`);
});
setupOptionGrid('#face-shape-grid', FACE_SHAPES, 'faceShape', FACE_ICONS, () => {
  buildCharacter(); applyColors(); addLog(`Face shape → ${FACE_SHAPES[state.faceShape]}`);
  updateSummary();
});
setupOptionGrid('#body-type-grid', BODY_TYPES, 'bodyType', BODY_ICONS, () => {
  state.fatness = [25, 40, 30, 75][state.bodyType];
  state.muscular = [25, 45, 75, 40][state.bodyType];
  buildCharacter(); applyColors();
  updateAllSliders();
  addLog(`Body type → ${BODY_TYPES[state.bodyType]}`);
  updateSummary();
});
setupOptionGrid('#facial-hair-grid', FACIAL_HAIR, 'facialHair', FACIAL_ICONS, () => {
  buildCharacter(); applyColors(); addLog(`Facial hair → ${FACIAL_HAIR[state.facialHair]}`);
});
setupOptionGrid('#top-style-grid', TOPS, 'topStyle', ['👕','🧥','👔','🧥','👕','🤵'], () => {
  addLog(`Top → ${TOPS[state.topStyle]}`); updateSummary();
});
setupOptionGrid('#pants-style-grid', PANTS, 'pantsStyle', ['👖','👖','🩳','🩱','👔','🎒'], () => {
  addLog(`Pants → ${PANTS[state.pantsStyle]}`); updateSummary();
});
setupOptionGrid('#shoes-style-grid', SHOES, 'shoesStyle', ['👟','👢','👞','🩴','👟','🥿'], () => {
  addLog(`Shoes → ${SHOES[state.shoesStyle]}`); updateSummary();
});

// ── SLIDERS ───────────────────────────────────────────────────
function setupSlider(id, stateKey, onApply) {
  const slider = document.getElementById(id);
  const valEl  = document.getElementById(id + '-val');
  if (!slider) return;
  slider.value = state[stateKey];
  updateSliderStyle(slider);
  if (valEl) valEl.textContent = state[stateKey];
  slider.addEventListener('input', e => {
    state[stateKey] = parseInt(e.target.value);
    if (valEl) valEl.textContent = state[stateKey];
    updateSliderStyle(slider);
    onApply();
  });
}

function updateSliderStyle(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--pct', pct + '%');
}

function updateAllSliders() {
  ['height','muscular','fatness',
   'face-width','face-cheek','face-jaw','face-nose-size','face-nose-bridge',
   'eye-size','eye-spacing','lip-size'].forEach(id => {
    const slider = document.getElementById('slider-' + id);
    if (slider) updateSliderStyle(slider);
  });
}

setupSlider('slider-height', 'height', () => {
  buildCharacter(); applyColors(); addLog(`Height → ${state.height}%`); updateSummary();
});
setupSlider('slider-muscular', 'muscular', () => {
  buildCharacter(); applyColors(); addLog(`Muscle → ${state.muscular}%`);
});
setupSlider('slider-fatness', 'fatness', () => {
  buildCharacter(); applyColors(); addLog(`Weight → ${state.fatness}%`);
});

// Face sliders (visual only, they affect minor shape tweaks)
['face-width','face-cheek','face-jaw','face-nose-size','face-nose-bridge','eye-size','eye-spacing','lip-size'].forEach(id => {
  const slider = document.getElementById('slider-' + id);
  const valEl  = document.getElementById('slider-' + id + '-val');
  if (!slider) return;
  slider.value = 50;
  updateSliderStyle(slider);
  if (valEl) valEl.textContent = 50;
  slider.addEventListener('input', e => {
    if (valEl) valEl.textContent = e.target.value;
    updateSliderStyle(slider);
    buildCharacter(); applyColors();
  });
});

// ── RANDOM GENERATOR ─────────────────────────────────────────
document.getElementById('btn-random')?.addEventListener('click', () => {
  const rnd = arr => Math.floor(Math.random() * arr.length);
  state.skin      = rnd(SKIN_COLORS);
  state.hairStyle = Math.floor(Math.random() * HAIR_STYLES.length);
  state.hairColor = rnd(HAIR_COLORS);
  state.eyeColor  = rnd(EYE_COLORS);
  state.faceShape = Math.floor(Math.random() * FACE_SHAPES.length);
  state.bodyType  = Math.floor(Math.random() * BODY_TYPES.length);
  state.facialHair= Math.floor(Math.random() * FACIAL_HAIR.length);
  state.topStyle  = Math.floor(Math.random() * TOPS.length);
  state.topColor  = rnd(OUTFIT_COLORS);
  state.pantsStyle= Math.floor(Math.random() * PANTS.length);
  state.pantsColor= rnd(OUTFIT_COLORS);
  state.shoesStyle= Math.floor(Math.random() * SHOES.length);
  state.shoesColor= rnd(OUTFIT_COLORS);
  state.height    = 30 + Math.floor(Math.random() * 60);
  state.muscular  = 20 + Math.floor(Math.random() * 60);
  state.fatness   = 20 + Math.floor(Math.random() * 50);
  state.fatness = [25, 40, 30, 75][state.bodyType];
  state.muscular = [25, 45, 75, 40][state.bodyType];

  // Rebuild all UI
  rebuildAllUI();
  buildCharacter(); applyColors(); updateSummary();
  addLog('🎲 Random character generated by TroxT');
});

document.getElementById('btn-reset')?.addEventListener('click', () => {
  Object.assign(state, {
    gender:'male', name:'NOUVEAU_PERSO', skin:0, faceShape:0, eyeColor:0,
    hairStyle:0, hairColor:0, facialHair:0, bodyType:0,
    height:50, muscular:45, fatness:30,
    topStyle:0, topColor:0, pantsStyle:0, pantsColor:0, shoesStyle:0, shoesColor:0,
  });
  rebuildAllUI();
  buildCharacter(); applyColors(); updateSummary();
  addLog('↺ Character reset to default');
});

function rebuildAllUI() {
  setupSwatches('#skin-swatches', SKIN_COLORS, 'skin', () => { applyColors(); });
  setupSwatches('#eye-swatches', EYE_COLORS, 'eyeColor', () => { applyColors(); });
  setupSwatches('#hair-color-swatches', HAIR_COLORS, 'hairColor', () => { applyColors(); });
  setupSwatches('#top-color-swatches', OUTFIT_COLORS, 'topColor', () => { applyColors(); updateSummary(); });
  setupSwatches('#pants-color-swatches', OUTFIT_COLORS, 'pantsColor', () => { applyColors(); updateSummary(); });
  setupSwatches('#shoes-color-swatches', OUTFIT_COLORS, 'shoesColor', () => { applyColors(); updateSummary(); });
  setupOptionGrid('#hair-style-grid', HAIR_STYLES, 'hairStyle', HAIR_ICONS, () => { buildCharacter(); applyColors(); });
  setupOptionGrid('#face-shape-grid', FACE_SHAPES, 'faceShape', FACE_ICONS, () => { buildCharacter(); applyColors(); updateSummary(); });
  setupOptionGrid('#body-type-grid', BODY_TYPES, 'bodyType', BODY_ICONS, () => { buildCharacter(); applyColors(); updateSummary(); });
  setupOptionGrid('#facial-hair-grid', FACIAL_HAIR, 'facialHair', FACIAL_ICONS, () => { buildCharacter(); applyColors(); });
  setupOptionGrid('#top-style-grid', TOPS, 'topStyle', ['👕','🧥','👔','🧥','👕','🤵'], () => { updateSummary(); });
  setupOptionGrid('#pants-style-grid', PANTS, 'pantsStyle', ['👖','👖','🩳','🩱','👔','🎒'], () => { updateSummary(); });
  setupOptionGrid('#shoes-style-grid', SHOES, 'shoesStyle', ['👟','👢','👞','🩴','👟','🥿'], () => { updateSummary(); });
  updateAllSliders();
  if (nameInput) { nameInput.value = state.name; }
  document.getElementById('vp-char-name')?.setAttribute('textContent', state.name);
}

// ── SUMMARY UPDATE ────────────────────────────────────────────
function updateSummary() {
  const nameDisp = document.querySelector('.cc-char-name-display');
  if (nameDisp) nameDisp.textContent = state.name;
  const charId = document.querySelector('.cc-char-id');
  if (charId) charId.textContent = `ID: EW-${String(Date.now()).slice(-6)} • ${state.nationality.toUpperCase()}`;

  setTrait('trait-gender',   state.gender === 'male' ? '♂ Male' : '♀ Female');
  setTrait('trait-face',     FACE_SHAPES[state.faceShape]);
  setTrait('trait-body',     BODY_TYPES[state.bodyType]);
  setTrait('trait-top',      TOPS[state.topStyle]);
  setTrait('trait-pants',    PANTS[state.pantsStyle]);
  setTrait('trait-shoes',    SHOES[state.shoesStyle]);

  // Stat bars
  setStat('stat-height',  state.height);
  setStat('stat-muscle',  state.muscular);
  setStat('stat-weight',  state.fatness);

  // Viewport name
  const vpName = document.getElementById('vp-char-name');
  if (vpName) vpName.textContent = state.name;
}

function setTrait(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setStat(id, val) {
  const fill = document.getElementById(id + '-fill');
  const txt  = document.getElementById(id + '-txt');
  if (fill) fill.style.width = val + '%';
  if (txt)  txt.textContent  = val + '%';
}

updateSummary();

// ── CONFIRM MODAL ─────────────────────────────────────────────
const modal = document.querySelector('.cc-modal-overlay');
const spawnAnim = document.querySelector('.cc-spawn-anim');

document.querySelector('.cc-btn-confirm')?.addEventListener('click', () => {
  // Fill modal
  document.querySelector('.cc-modal-char-name').textContent = state.name;
  document.getElementById('modal-gender').textContent = state.gender === 'male' ? '♂ Male' : '♀ Female';
  document.getElementById('modal-face').textContent   = FACE_SHAPES[state.faceShape];
  document.getElementById('modal-body').textContent   = BODY_TYPES[state.bodyType];
  document.getElementById('modal-hair').textContent   = HAIR_STYLES[state.hairStyle];
  document.getElementById('modal-top').textContent    = TOPS[state.topStyle];
  document.getElementById('modal-pants').textContent  = PANTS[state.pantsStyle];
  document.getElementById('modal-shoes').textContent  = SHOES[state.shoesStyle];
  document.getElementById('modal-id').textContent     = `EW-${String(Date.now()).slice(-6)}`;
  document.getElementById('modal-server').textContent = 'EtherWorld RP';
  modal.classList.add('visible');
  addLog('⚡ Confirm character creation…');
});

document.querySelector('.cc-modal-cancel')?.addEventListener('click', () => {
  modal.classList.remove('visible');
});

document.querySelector('.cc-modal-spawn')?.addEventListener('click', () => {
  modal.classList.remove('visible');
  spawnAnim.classList.add('active');
  addLog(`✅ Character "${state.name}" created successfully!`);
  addLog('TroxT: Syncing to EtherWorld database...');

  // Confetti-like effect (simple)
  setTimeout(() => {
    spawnAnim.classList.remove('active');
    // Redirect or just show success
    addLog('TroxT: Character ready for spawn!');
  }, 2800);
});

// ── AUTO-ROTATE TOGGLE ────────────────────────────────────────
canvas.addEventListener('pointerdown', () => { controls.autoRotate = false; });
let rotateTimeout;
canvas.addEventListener('pointerup', () => {
  clearTimeout(rotateTimeout);
  rotateTimeout = setTimeout(() => { controls.autoRotate = true; }, 4000);
});

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') setStep(state.step + 1);
  if (e.key === 'ArrowLeft')  setStep(state.step - 1);
  if (e.key === 'Escape') modal.classList.remove('visible');
  if (e.key === 'r' || e.key === 'R') {
    if (!e.target.matches('input')) {
      document.getElementById('btn-random')?.click();
    }
  }
});
