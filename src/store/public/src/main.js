import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#scene");
const fpsEl = document.querySelector("#fps");
const posEl = document.querySelector("#pos");
const selectedEl = document.querySelector("#selected");
const groundedEl = document.querySelector("#grounded");
const exportBox = document.querySelector("#exportBox");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#080d16");
scene.fog = new THREE.Fog("#080d16", 35, 95);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  250
);

camera.position.set(10, 8, 12);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 5;
controls.maxDistance = 32;

const hemi = new THREE.HemisphereLight("#b7ecff", "#141820", 1.15);
scene.add(hemi);

const sun = new THREE.DirectionalLight("#ffffff", 3.2);
sun.position.set(12, 24, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -35;
sun.shadow.camera.right = 35;
sun.shadow.camera.top = 35;
sun.shadow.camera.bottom = -35;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 90;
scene.add(sun);

const grid = new THREE.GridHelper(80, 80, "#16364c", "#0e1d2b");
grid.position.y = -0.01;
scene.add(grid);

const worldFloor = new THREE.Mesh(
  new THREE.BoxGeometry(80, 0.18, 80),
  new THREE.MeshStandardMaterial({
    color: "#111722",
    roughness: 0.95,
    metalness: 0
  })
);
worldFloor.position.y = -0.12;
worldFloor.receiveShadow = true;
scene.add(worldFloor);

const platformGroup = new THREE.Group();
scene.add(platformGroup);

const platformMeshes = [];
const platformData = [];
let selectedPlatform = null;
let selectedOutline = null;

function makePlatformMaterial(data) {
  const material = new THREE.MeshStandardMaterial({
    color: data.color || "#777777",
    roughness: data.material === "metal" ? 0.38 : 0.82,
    metalness: data.material === "metal" ? 0.75 : 0.02,
    emissive: data.safe === false ? new THREE.Color("#2b0000") : new THREE.Color("#000000"),
    emissiveIntensity: data.safe === false ? 0.25 : 0
  });

  return material;
}

function createPlatform(data) {
  const geometry = new THREE.BoxGeometry(data.size[0], data.size[1], data.size[2]);
  const mesh = new THREE.Mesh(geometry, makePlatformMaterial(data));

  mesh.position.set(data.position[0], data.position[1], data.position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.platform = data;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({
      color: data.safe === false ? "#ff5368" : "#7df9ff",
      transparent: true,
      opacity: 0.38
    })
  );
  mesh.add(edges);

  platformGroup.add(mesh);
  platformMeshes.push(mesh);
  platformData.push(data);

  return mesh;
}

async function loadPlatforms() {
  const res = await fetch("/api/platforms");
  const json = await res.json();

  if (!json.ok) {
    throw new Error("Impossible de charger les plateformes.");
  }

  json.platforms.forEach(createPlatform);
}

const player = {
  feet: new THREE.Vector3(0, 0.35, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  radius: 0.35,
  height: 1.65,
  speed: 6.2,
  jumpPower: 7.3,
  grounded: false,
  groundId: null
};

const playerMesh = new THREE.Mesh(
  new THREE.CapsuleGeometry(player.radius, player.height - player.radius * 2, 8, 16),
  new THREE.MeshStandardMaterial({
    color: "#e9faff",
    roughness: 0.45,
    metalness: 0.05,
    emissive: "#10384a",
    emissiveIntensity: 0.25
  })
);
playerMesh.castShadow = true;
scene.add(playerMesh);

const feetMarker = new THREE.Mesh(
  new THREE.RingGeometry(0.44, 0.5, 32),
  new THREE.MeshBasicMaterial({
    color: "#7df9ff",
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide
  })
);
feetMarker.rotation.x = -Math.PI / 2;
scene.add(feetMarker);

const keys = new Set();

window.addEventListener("keydown", (event) => {
  keys.add(event.code);

  if (event.code === "Space" && player.grounded) {
    player.velocity.y = player.jumpPower;
    player.grounded = false;
  }

  if (event.code === "KeyT") {
    sendPlatformTest();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

function isInsidePlatformXZ(feet, platform, margin = 0) {
  const [px, , pz] = platform.position;
  const [sx, , sz] = platform.size;

  return (
    feet.x >= px - sx / 2 - margin &&
    feet.x <= px + sx / 2 + margin &&
    feet.z >= pz - sz / 2 - margin &&
    feet.z <= pz + sz / 2 + margin
  );
}

function resolveVertical(prevFeet, nextFeet) {
  player.grounded = false;
  player.groundId = null;

  if (nextFeet.y <= 0.35) {
    nextFeet.y = 0.35;
    player.velocity.y = 0;
    player.grounded = true;
    player.groundId = "world_floor";
    return;
  }

  for (const p of platformData) {
    const topY = p.position[1] + p.size[1] / 2;

    const fallingThroughTop =
      prevFeet.y >= topY &&
      nextFeet.y <= topY &&
      player.velocity.y <= 0;

    if (fallingThroughTop && isInsidePlatformXZ(nextFeet, p, player.radius * 0.75)) {
      nextFeet.y = topY;
      player.velocity.y = 0;
      player.grounded = true;
      player.groundId = p.id;
      return;
    }
  }
}

function updatePlayer(dt) {
  const move = new THREE.Vector3();

  if (keys.has("KeyW") || keys.has("ArrowUp")) move.z -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) move.z += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) move.x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) move.x += 1;

  if (move.lengthSq() > 0) {
    move.normalize();

    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    camForward.normalize();

    const camRight = new THREE.Vector3()
      .crossVectors(camForward, new THREE.Vector3(0, 1, 0))
      .normalize();

    const worldMove = new THREE.Vector3();
    worldMove.addScaledVector(camForward, -move.z);
    worldMove.addScaledVector(camRight, move.x);
    worldMove.normalize();

    player.feet.x += worldMove.x * player.speed * dt;
    player.feet.z += worldMove.z * player.speed * dt;

    const targetRot = Math.atan2(worldMove.x, worldMove.z);
    playerMesh.rotation.y = THREE.MathUtils.lerp(playerMesh.rotation.y, targetRot, 0.18);
  }

  const prevFeet = player.feet.clone();

  player.velocity.y += -18.5 * dt;
  player.feet.y += player.velocity.y * dt;

  resolveVertical(prevFeet, player.feet);

  playerMesh.position.set(
    player.feet.x,
    player.feet.y + player.height / 2,
    player.feet.z
  );

  feetMarker.position.set(player.feet.x, player.feet.y + 0.02, player.feet.z);

  controls.target.lerp(
    new THREE.Vector3(player.feet.x, player.feet.y + 1.1, player.feet.z),
    0.12
  );
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

window.addEventListener("pointerdown", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(platformMeshes, false);

  if (hits.length > 0) {
    selectPlatform(hits[0].object);
  }
});

function selectPlatform(mesh) {
  selectedPlatform = mesh.userData.platform;

  if (selectedOutline) {
    scene.remove(selectedOutline);
    selectedOutline.geometry.dispose();
    selectedOutline.material.dispose();
    selectedOutline = null;
  }

  const box = new THREE.Box3().setFromObject(mesh);
  const helper = new THREE.Box3Helper(box, "#ffffff");
  selectedOutline = helper;
  scene.add(helper);

  selectedEl.textContent = `${selectedPlatform.name} (${selectedPlatform.id})`;
}

function addRandomPlatform() {
  const id = `custom_${Date.now()}`;

  const data = {
    id,
    name: `Custom Platform ${platformData.length + 1}`,
    type: "custom",
    position: [
      Math.round((Math.random() * 24 - 12) * 10) / 10,
      Math.round((Math.random() * 5 + 0.8) * 10) / 10,
      Math.round((Math.random() * 24 - 12) * 10) / 10
    ],
    size: [
      Math.round((Math.random() * 5 + 3) * 10) / 10,
      0.45,
      Math.round((Math.random() * 5 + 3) * 10) / 10
    ],
    color: "#00aaff",
    material: "painted",
    safe: true
  };

  createPlatform(data);
  exportJson();
}

function exportJson() {
  exportBox.value = JSON.stringify(platformData, null, 2);
}

function resetPlayer() {
  player.feet.set(0, 0.35, 0);
  player.velocity.set(0, 0, 0);
  player.grounded = false;
  player.groundId = null;
}

async function sendPlatformTest() {
  const payload = {
    selectedPlatformId: selectedPlatform?.id ?? null,
    playerPosition: {
      x: Number(player.feet.x.toFixed(3)),
      y: Number(player.feet.y.toFixed(3)),
      z: Number(player.feet.z.toFixed(3))
    },
    note: "manual-test-key-t"
  };

  const res = await fetch("/api/platforms/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  console.log("[SERVER_TEST_RESPONSE]", json);
}

document.querySelector("#addPlatform").addEventListener("click", addRandomPlatform);
document.querySelector("#exportJson").addEventListener("click", exportJson);
document.querySelector("#resetPlayer").addEventListener("click", resetPlayer);

let lastTime = performance.now();
let fpsTime = performance.now();
let frameCount = 0;

function animate(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  updatePlayer(dt);
  controls.update();

  renderer.render(scene, camera);

  frameCount++;

  if (now - fpsTime >= 500) {
    const fps = Math.round((frameCount * 1000) / (now - fpsTime));
    fpsEl.textContent = String(fps);
    fpsTime = now;
    frameCount = 0;

    posEl.textContent = `${player.feet.x.toFixed(1)}, ${player.feet.y.toFixed(1)}, ${player.feet.z.toFixed(1)}`;
    groundedEl.textContent = player.grounded ? `true (${player.groundId})` : "false";
  }

  requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

await loadPlatforms();
exportJson();
requestAnimationFrame(animate);
