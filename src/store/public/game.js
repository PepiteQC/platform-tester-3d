import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// ============================================================
//  GAME ENGINE
// ============================================================
class EtherWorldGame {
  constructor() {
    // Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Physics
    this.physicsWorld = null;
    this.physicsBodies = new Map();
    this.bodyMeshes = new Map();

    // Player
    this.player = null;
    this.playerBody = null;
    this.playerMesh = null;
    this.moveState = { forward: false, backward: false, left: false, right: false, sprint: false };
    this.canJump = false;
    this.isPointerLocked = false;

    // Camera 3ème personne
    this.cameraYaw = 0;
    this.cameraPitch = 0.3;
    this.cameraDistance = 6;
    this.cameraMinDistance = 2;
    this.cameraMaxDistance = 15;
    this.cameraCurrentPos = new THREE.Vector3();
    this.cameraLookTarget = new THREE.Vector3();

    // Platforms
    this.platforms = [];
    this.platformMeshes = new Map();
    this.fallingPlatforms = new Map();

    // Multiplayer
    this.ws = null;
    this.playerId = null;
    this.playerColor = '#77ddff';
    this.remotePlayers = new Map();

    // Editor
    this.editorMode = false;
    this.selectedPlatform = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Stats
    this.frameCount = 0;
    this.fpsTime = 0;
    this.currentFps = 60;

    // Animation
    this.playerAnimState = 'idle';
    this.playerBobTime = 0;

    this.init();
  }

  // ==============================
  //  INITIALIZATION
  // ==============================
  init() {
    this.initThree();
    this.initPhysics();
    this.initPlayer();
    this.initLighting();
    this.initSkybox();
    this.initControls();
    this.initUI();
    this.connectWebSocket();
    this.loadPlatforms();
    this.animate();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 8, 12);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.prepend(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initPhysics() {
    this.physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -20, 0)
    });
    this.physicsWorld.broadphase = new CANNON.NaiveBroadphase();
    this.physicsWorld.solver.iterations = 10;
    this.physicsWorld.defaultContactMaterial.friction = 0.3;
    this.physicsWorld.defaultContactMaterial.restitution = 0.1;

    this.playerMaterial = new CANNON.Material('player');
    this.platformMaterial = new CANNON.Material('platform');
    this.bouncyMaterial = new CANNON.Material('bouncy');

    const playerPlatform = new CANNON.ContactMaterial(this.playerMaterial, this.platformMaterial, {
      friction: 0.4,
      restitution: 0.05
    });
    const playerBouncy = new CANNON.ContactMaterial(this.playerMaterial, this.bouncyMaterial, {
      friction: 0.3,
      restitution: 1.5
    });

    this.physicsWorld.addContactMaterial(playerPlatform);
    this.physicsWorld.addContactMaterial(playerBouncy);
  }

  initPlayer() {
    // ─── Personnage 3D visible ───
    this.playerMesh = new THREE.Group();

    // Corps principal (capsule)
    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.8, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x77ddff,
      metalness: 0.3,
      roughness: 0.6,
      emissive: 0x112233,
      emissiveIntensity: 0.3
    });
    const bodyMeshPart = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMeshPart.castShadow = true;
    bodyMeshPart.position.y = 0;
    this.playerMesh.add(bodyMeshPart);

    // Tête (sphère légèrement plus grande)
    const headGeo = new THREE.SphereGeometry(0.3, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x88eeff,
      metalness: 0.2,
      roughness: 0.5,
      emissive: 0x224455,
      emissiveIntensity: 0.2
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.65;
    head.castShadow = true;
    this.playerMesh.add(head);

    // Yeux
    const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.8
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 0.68, 0.24);
    this.playerMesh.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 0.68, 0.24);
    this.playerMesh.add(rightEye);

    // Pupilles
    const pupilGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111133 });
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.12, 0.68, 0.30);
    this.playerMesh.add(leftPupil);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.12, 0.68, 0.30);
    this.playerMesh.add(rightPupil);

    // Bras gauche
    const armGeo = new THREE.CapsuleGeometry(0.1, 0.45, 6, 8);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x66ccee,
      metalness: 0.2,
      roughness: 0.6
    });
    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.45, 0.05, 0);
    this.leftArm.castShadow = true;
    this.playerMesh.add(this.leftArm);

    // Bras droit
    this.rightArm = new THREE.Mesh(armGeo, armMat.clone());
    this.rightArm.position.set(0.45, 0.05, 0);
    this.rightArm.castShadow = true;
    this.playerMesh.add(this.rightArm);

    // Jambe gauche
    const legGeo = new THREE.CapsuleGeometry(0.12, 0.4, 6, 8);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x4488aa,
      metalness: 0.2,
      roughness: 0.7
    });
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.15, -0.6, 0);
    this.leftLeg.castShadow = true;
    this.playerMesh.add(this.leftLeg);

    // Jambe droite
    this.rightLeg = new THREE.Mesh(legGeo, legMat.clone());
    this.rightLeg.position.set(0.15, -0.6, 0);
    this.rightLeg.castShadow = true;
    this.playerMesh.add(this.rightLeg);

    // Ombre circulaire au sol
    const shadowGeo = new THREE.CircleGeometry(0.5, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
    this.playerShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.playerShadow.rotation.x = -Math.PI / 2;
    this.playerShadow.position.y = -1.05;
    this.playerMesh.add(this.playerShadow);

    // Point lumineux au-dessus du joueur
    const glowGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x77ddff,
      transparent: true,
      opacity: 0.6
    });
    this.playerGlow = new THREE.Mesh(glowGeo, glowMat);
    this.playerGlow.position.y = 1.1;
    this.playerMesh.add(this.playerGlow);

    // Lumière qui suit le joueur
    const playerLight = new THREE.PointLight(0x77ddff, 0.4, 8);
    playerLight.position.y = 1.0;
    this.playerMesh.add(playerLight);

    // LE PERSONNAGE EST VISIBLE
    this.playerMesh.visible = true;
    this.scene.add(this.playerMesh);

    // ─── Corps physique ───
    const radius = 0.4;
    const height = 1.6;
    this.playerBody = new CANNON.Body({
      mass: 70,
      shape: new CANNON.Sphere(radius),
      position: new CANNON.Vec3(0, 5, 0),
      material: this.playerMaterial,
      linearDamping: 0.3,
      angularDamping: 1.0,
      fixedRotation: true
    });

    this.playerBody.addShape(
      new CANNON.Sphere(radius),
      new CANNON.Vec3(0, height / 2 - radius, 0)
    );
    this.playerBody.addShape(
      new CANNON.Sphere(radius),
      new CANNON.Vec3(0, -(height / 2 - radius), 0)
    );

    this.physicsWorld.addBody(this.playerBody);

    // Collision
    this.playerBody.addEventListener('collide', (e) => {
      const contactNormal = new CANNON.Vec3();
      const contact = e.contact;
      if (contact.bi.id === this.playerBody.id) {
        contact.ni.negate(contactNormal);
      } else {
        contactNormal.copy(contact.ni);
      }
      if (contactNormal.y > 0.5) {
        this.canJump = true;
        const otherBody = contact.bi.id === this.playerBody.id ? contact.bj : contact.bi;
        this.handlePlatformContact(otherBody);
      }
    });
  }

  handlePlatformContact(body) {
    for (const [id, pData] of this.platformMeshes) {
      if (pData.body === body) {
        if (pData.data.type === 'falling' && !this.fallingPlatforms.has(id)) {
          this.triggerFallingPlatform(id, pData);
        }
        if (pData.data.type === 'bouncy') {
          this.playerBody.velocity.y = pData.data.bounceForce || 15;
        }
        if (pData.data.type === 'goal') {
          this.notify('🏆 Goal reached! Congratulations!', 'success');
        }
        break;
      }
    }
  }

  triggerFallingPlatform(id, pData) {
    const delay = (pData.data.fallDelay || 0.8) * 1000;
    const respawn = (pData.data.respawnTime || 3) * 1000;

    this.fallingPlatforms.set(id, { phase: 'shake', time: 0, duration: delay });

    setTimeout(() => {
      pData.body.type = CANNON.Body.DYNAMIC;
      pData.body.mass = 5;
      pData.body.updateMassProperties();
      this.fallingPlatforms.set(id, { phase: 'falling' });

      setTimeout(() => {
        pData.body.type = CANNON.Body.STATIC;
        pData.body.mass = 0;
        pData.body.updateMassProperties();
        pData.body.position.set(...pData.data.position);
        pData.body.velocity.setZero();
        pData.body.angularVelocity.setZero();
        pData.body.quaternion.set(0, 0, 0, 1);
        pData.mesh.position.set(...pData.data.position);
        pData.mesh.quaternion.identity();
        pData.mesh.material.opacity = 1;
        this.fallingPlatforms.delete(id);
      }, respawn);
    }, delay);
  }

  initLighting() {
    const ambient = new THREE.AmbientLight(0x334466, 0.6);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x446688, 0x223344, 0.4);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    const p1 = new THREE.PointLight(0x4488ff, 0.5, 50);
    p1.position.set(-10, 15, -10);
    this.scene.add(p1);

    const p2 = new THREE.PointLight(0xff8844, 0.3, 50);
    p2.position.set(15, 20, 10);
    this.scene.add(p2);
  }

  initSkybox() {
    const skyGeo = new THREE.SphereGeometry(400, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor:    { value: new THREE.Color(0x0a0a2e) },
        bottomColor: { value: new THREE.Color(0x1a1a3a) },
        offset:      { value: 20 },
        exponent:    { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Étoiles
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 2000;
    const positions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      const r = 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi));
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8
    });
    this.scene.add(new THREE.Points(starsGeo, starsMat));
  }

  // ==============================
  //  CONTRÔLES 3ème PERSONNE
  // ==============================
  initControls() {
    const canvas = this.renderer.domElement;

    // Pointer Lock pour rotation caméra
    canvas.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
      document.getElementById('crosshair').style.display =
        this.isPointerLocked ? 'block' : 'none';
    });

    // Rotation caméra à la souris
    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      const sensitivity = 0.003;
      this.cameraYaw   -= e.movementX * sensitivity;
      this.cameraPitch -= e.movementY * sensitivity;
      // Limiter le pitch
      this.cameraPitch = Math.max(-0.5, Math.min(1.2, this.cameraPitch));
    });

    // Zoom molette
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance += e.deltaY * 0.01;
      this.cameraDistance = Math.max(this.cameraMinDistance, Math.min(this.cameraMaxDistance, this.cameraDistance));
    }, { passive: false });

    // Clavier
    document.addEventListener('keydown', (e) => {
      if (this.isChatActive()) return;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    this.moveState.forward  = true; break;
        case 'KeyS': case 'ArrowDown':  this.moveState.backward = true; break;
        case 'KeyA': case 'ArrowLeft':  this.moveState.left     = true; break;
        case 'KeyD': case 'ArrowRight': this.moveState.right    = true; break;
        case 'ShiftLeft': case 'ShiftRight': this.moveState.sprint = true; break;
        case 'Space':
          e.preventDefault();
          if (this.canJump) {
            this.playerBody.velocity.y = 10;
            this.canJump = false;
          }
          break;
        case 'KeyE': this.toggleEditor(); break;
        case 'KeyT':
          e.preventDefault();
          this.openChat();
          break;
        case 'Escape':
          if (this.editorMode) this.toggleEditor();
          break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    this.moveState.forward  = false; break;
        case 'KeyS': case 'ArrowDown':  this.moveState.backward = false; break;
        case 'KeyA': case 'ArrowLeft':  this.moveState.left     = false; break;
        case 'KeyD': case 'ArrowRight': this.moveState.right    = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.moveState.sprint = false; break;
      }
    });

    // Click pour sélection éditeur
    canvas.addEventListener('mousedown', (e) => {
      if (this.editorMode && e.button === 0) this.editorPick(e);
    });
  }

  // ==============================
  //  PLATFORM RENDERING
  // ==============================
  createPlatformMesh(data) {
    const [sx, sy, sz] = data.size || [2, 0.4, 2];
    const geo = new THREE.BoxGeometry(sx, sy, sz);

    let mat;
    const color = new THREE.Color(data.color || '#6688cc');

    if (data.material === 'emissive') {
      mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: data.emissiveIntensity || 0.5,
        metalness: 0.5,
        roughness: 0.3
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.2,
        roughness: 0.7,
        transparent: data.type === 'falling',
        opacity: 1
      });
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...(data.position || [0, 0, 0]));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.platformId = data.id;
    mesh.userData.platformType = data.type;

    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: color.clone().multiplyScalar(1.5),
      transparent: true,
      opacity: 0.3
    });
    mesh.add(new THREE.LineSegments(edges, lineMat));

    this.scene.add(mesh);

    const halfExtents = new CANNON.Vec3(sx / 2, sy / 2, sz / 2);
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(halfExtents),
      position: new CANNON.Vec3(...(data.position || [0, 0, 0])),
      material: data.type === 'bouncy' ? this.bouncyMaterial : this.platformMaterial
    });
    this.physicsWorld.addBody(body);

    const entry = { mesh, body, data };
    this.platformMeshes.set(data.id, entry);
    return entry;
  }

  clearPlatforms() {
    for (const [id, pData] of this.platformMeshes) {
      this.scene.remove(pData.mesh);
      this.physicsWorld.removeBody(pData.body);
    }
    this.platformMeshes.clear();
    this.fallingPlatforms.clear();
  }

  async loadPlatforms() {
    try {
      const res = await fetch('/api/platforms');
      const data = await res.json();
      this.clearPlatforms();
      data.platforms.forEach(p => this.createPlatformMesh(p));
      this.platforms = data.platforms;
      this.updateEditorPlatformList();
      this.notify(`Loaded ${data.platforms.length} platforms`, 'info');
    } catch (e) {
      console.error('Failed to load platforms:', e);
    }
  }

  // ==============================
  //  MULTIPLAYER
  // ==============================
  connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${location.host}`);

    this.ws.onopen = () => this.notify('Connected to server', 'success');

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.handleServerMessage(msg);
    };

    this.ws.onclose = () => {
      this.notify('Disconnected from server', 'error');
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onerror = () => {};
  }

  handleServerMessage(msg) {
    switch (msg.type) {
      case 'init':
        this.playerId = msg.playerId;
        this.playerColor = msg.color;
        // Appliquer la couleur au personnage
        this.playerMesh.children[0].material.color.set(msg.color);
        this.playerMesh.children[0].material.emissive.set(msg.color);
        this.playerMesh.children[0].material.emissiveIntensity = 0.15;
        document.getElementById('player-name').textContent = `Player_${msg.playerId}`;
        msg.players.forEach(p => {
          if (p.id !== this.playerId) this.addRemotePlayer(p);
        });
        this.updatePlayerCount();
        break;

      case 'player_joined':
        this.addRemotePlayer(msg.player);
        this.addChatMessage(`${msg.player.name} joined`, null, true);
        this.updatePlayerCount();
        break;

      case 'player_left':
        this.removeRemotePlayer(msg.playerId);
        this.addChatMessage('Player left', null, true);
        this.updatePlayerCount();
        break;

      case 'players_state':
        msg.players.forEach(p => {
          if (p.id !== this.playerId) this.updateRemotePlayer(p);
        });
        break;

      case 'chat':
        this.addChatMessage(msg.text, msg.name);
        break;

      case 'player_renamed':
        if (msg.playerId !== this.playerId) {
          const rp = this.remotePlayers.get(msg.playerId);
          if (rp) rp.name = msg.name;
        }
        break;

      case 'platform_added':
        this.createPlatformMesh(msg.platform);
        this.platforms.push(msg.platform);
        this.updateEditorPlatformList();
        break;

      case 'platform_removed':
        this.removePlatformMesh(msg.platformId);
        this.platforms = this.platforms.filter(p => p.id !== msg.platformId);
        this.updateEditorPlatformList();
        break;

      case 'platform_updated':
        this.removePlatformMesh(msg.platform.id);
        this.createPlatformMesh(msg.platform);
        break;

      case 'world_reset':
        this.clearPlatforms();
        msg.platforms.forEach(p => this.createPlatformMesh(p));
        this.platforms = msg.platforms;
        this.updateEditorPlatformList();
        this.playerBody.position.set(0, 5, 0);
        this.playerBody.velocity.setZero();
        this.notify('World regenerated!', 'info');
        break;

      case 'world_state_updated':
        if (msg.state) {
          if (msg.state.time_of_day !== undefined) this.updateTimeOfDay(msg.state.time_of_day);
          if (msg.state.weather) this.updateWeather(msg.state.weather);
        }
        break;

      case 'server_paused':
        this.notify('⏸️ Server paused by admin', 'warning');
        break;

      case 'server_resumed':
        this.notify('▶️ Server resumed', 'success');
        break;

      case 'kicked':
        this.notify(`❌ You were kicked: ${msg.reason}`, 'error');
        break;

      case 'teleport':
        if (msg.position) {
          this.playerBody.position.set(...msg.position);
          this.playerBody.velocity.setZero();
          this.notify('📍 Teleported by admin', 'info');
        }
        break;

      case 'auto_save':
        this.notify('💾 Auto-saved', 'info');
        break;
    }
  }

  addRemotePlayer(data) {
    if (this.remotePlayers.has(data.id)) return;

    const group = new THREE.Group();

    // Corps
    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.8, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color),
      metalness: 0.3,
      roughness: 0.6,
      emissive: new THREE.Color(data.color),
      emissiveIntensity: 0.15
    });
    const bodyPart = new THREE.Mesh(bodyGeo, bodyMat);
    bodyPart.castShadow = true;
    group.add(bodyPart);

    // Tête
    const headGeo = new THREE.SphereGeometry(0.3, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color).multiplyScalar(1.1),
      metalness: 0.2,
      roughness: 0.5
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.65;
    head.castShadow = true;
    group.add(head);

    // Yeux
    const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.8
    });
    const le = new THREE.Mesh(eyeGeo, eyeMat);
    le.position.set(-0.12, 0.68, 0.24);
    group.add(le);
    const re = new THREE.Mesh(eyeGeo, eyeMat);
    re.position.set(0.12, 0.68, 0.24);
    group.add(re);

    // Bras
    const armGeo = new THREE.CapsuleGeometry(0.1, 0.45, 6, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(data.color) });
    const la = new THREE.Mesh(armGeo, armMat);
    la.position.set(-0.45, 0.05, 0);
    la.castShadow = true;
    group.add(la);
    const ra = new THREE.Mesh(armGeo, armMat.clone());
    ra.position.set(0.45, 0.05, 0);
    ra.castShadow = true;
    group.add(ra);

    // Jambes
    const legGeo = new THREE.CapsuleGeometry(0.12, 0.4, 6, 8);
    const legMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color).multiplyScalar(0.7)
    });
    const ll = new THREE.Mesh(legGeo, legMat);
    ll.position.set(-0.15, -0.6, 0);
    group.add(ll);
    const rl = new THREE.Mesh(legGeo, legMat.clone());
    rl.position.set(0.15, -0.6, 0);
    group.add(rl);

    // Nom au-dessus
    const nameSprite = this.createTextSprite(data.name || data.id, data.color);
    nameSprite.position.y = 1.4;
    group.add(nameSprite);

    // Lumière
    const light = new THREE.PointLight(new THREE.Color(data.color), 0.3, 6);
    light.position.y = 1.0;
    group.add(light);

    group.position.set(...(data.position || [0, 2, 0]));
    this.scene.add(group);

    this.remotePlayers.set(data.id, {
      group,
      name: data.name,
      leftArm: la,
      rightArm: ra,
      leftLeg: ll,
      rightLeg: rl,
      targetPos: new THREE.Vector3(...(data.position || [0, 2, 0])),
      targetRot: new THREE.Euler(0, 0, 0),
      walkTime: 0
    });
  }

  createTextSprite(text, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.roundRect(10, 5, 236, 50, 10);
    ctx.fill();
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2, 0.5, 1);
    return sprite;
  }

  updateRemotePlayer(data) {
    const rp = this.remotePlayers.get(data.id);
    if (!rp) { this.addRemotePlayer(data); return; }
    rp.targetPos.set(...data.position);
    if (data.rotation) rp.targetRot.set(...data.rotation);
  }

  removeRemotePlayer(id) {
    const rp = this.remotePlayers.get(id);
    if (rp) {
      this.scene.remove(rp.group);
      this.remotePlayers.delete(id);
    }
    this.updatePlayerCount();
  }

  removePlatformMesh(id) {
    const pData = this.platformMeshes.get(id);
    if (pData) {
      this.scene.remove(pData.mesh);
      this.physicsWorld.removeBody(pData.body);
      this.platformMeshes.delete(id);
      this.fallingPlatforms.delete(id);
    }
  }

  sendPosition() {
    if (!this.ws || this.ws.readyState !== 1) return;
    const p = this.playerBody.position;
    const v = this.playerBody.velocity;
    this.ws.send(JSON.stringify({
      type: 'position',
      position: [
        Math.round(p.x * 100) / 100,
        Math.round(p.y * 100) / 100,
        Math.round(p.z * 100) / 100
      ],
      rotation: [0, this.cameraYaw, 0],
      velocity: [
        Math.round(v.x * 100) / 100,
        Math.round(v.y * 100) / 100,
        Math.round(v.z * 100) / 100
      ],
      animation: this.getPlayerAnimation()
    }));
  }

  getPlayerAnimation() {
    const v = this.playerBody.velocity;
    const speed = Math.sqrt(v.x * v.x + v.z * v.z);
    if (!this.canJump) return 'jump';
    if (speed > 5) return 'run';
    if (speed > 0.5) return 'walk';
    return 'idle';
  }

  updatePlayerCount() {
    const count = this.remotePlayers.size + 1;
    document.getElementById('player-count').textContent = `Players: ${count}`;
  }

  // ==============================
  //  EDITOR
  // ==============================
  toggleEditor() {
    this.editorMode = !this.editorMode;
    document.getElementById('editor-panel').classList.toggle('hidden', !this.editorMode);
    if (this.editorMode) this.updateEditorPlatformList();
  }

  editorPick() {
    if (!this.editorMode) return;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const meshes = [];
    this.platformMeshes.forEach(p => meshes.push(p.mesh));
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      this.selectPlatform(intersects[0].object.userData.platformId);
    } else {
      this.deselectPlatform();
    }
  }

  selectPlatform(id) {
    this.deselectPlatform();
    const pData = this.platformMeshes.get(id);
    if (!pData) return;
    this.selectedPlatform = id;
    pData.mesh.material.emissive = new THREE.Color(0xffffff);
    pData.mesh.material.emissiveIntensity = 0.3;
    document.getElementById('ed-selection-info').innerHTML = `
      <strong>ID:</strong> ${id}<br>
      <strong>Type:</strong> ${pData.data.type}<br>
      <strong>Pos:</strong> [${pData.data.position.map(v => v.toFixed(1)).join(', ')}]<br>
      <strong>Size:</strong> [${pData.data.size.map(v => v.toFixed(1)).join(', ')}]
    `;
    document.getElementById('ed-delete').disabled = false;
  }

  deselectPlatform() {
    if (this.selectedPlatform !== null) {
      const pData = this.platformMeshes.get(this.selectedPlatform);
      if (pData) {
        const c = new THREE.Color(pData.data.color);
        pData.mesh.material.emissive = pData.data.material === 'emissive' ? c : new THREE.Color(0x000000);
        pData.mesh.material.emissiveIntensity = pData.data.material === 'emissive' ? (pData.data.emissiveIntensity || 0.5) : 0;
      }
    }
    this.selectedPlatform = null;
    document.getElementById('ed-selection-info').textContent = 'Click a platform to select it';
    document.getElementById('ed-delete').disabled = true;
  }

  updateEditorPlatformList() {
    const list = document.getElementById('ed-platform-list');
    if (!list) return;
    list.innerHTML = '';
    this.platformMeshes.forEach((pData, id) => {
      const item = document.createElement('div');
      item.className = 'platform-item';
      item.innerHTML = `
        <div class="p-color" style="background:${pData.data.color}"></div>
        <span class="p-info">#${id}</span>
        <span class="p-type">${pData.data.type}</span>
      `;
      item.addEventListener('click', () => this.selectPlatform(id));
      list.appendChild(item);
    });
  }

  // ==============================
  //  UI SETUP
  // ==============================
  initUI() {
    document.getElementById('btn-editor').addEventListener('click', () => this.toggleEditor());
    document.getElementById('editor-close').addEventListener('click', () => this.toggleEditor());

    document.getElementById('ed-add').addEventListener('click', async () => {
      const data = {
        type: document.getElementById('ed-type').value,
        color: document.getElementById('ed-color').value,
        position: [
          parseFloat(document.getElementById('ed-px').value),
          parseFloat(document.getElementById('ed-py').value),
          parseFloat(document.getElementById('ed-pz').value)
        ],
        size: [
          parseFloat(document.getElementById('ed-sx').value),
          parseFloat(document.getElementById('ed-sy').value),
          parseFloat(document.getElementById('ed-sz').value)
        ],
        material: 'standard',
        isStatic: document.getElementById('ed-type').value === 'static'
      };
      const type = data.type;
      if (type === 'moving')   data.movement  = { axis: 'x', amplitude: 3, speed: 1 };
      if (type === 'falling')  { data.fallDelay = 0.8; data.respawnTime = 3; }
      if (type === 'bouncy')   data.bounceForce = 15;
      if (type === 'rotating') data.rotation  = { axis: 'y', speed: 1 };

      try {
        const res = await fetch('/api/platforms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        this.createPlatformMesh(result.platform);
        this.platforms.push(result.platform);
        this.updateEditorPlatformList();
        this.notify('Platform added!', 'success');
      } catch (e) {
        this.notify('Failed to add platform', 'error');
      }
    });

    document.getElementById('ed-delete').addEventListener('click', async () => {
      if (this.selectedPlatform === null) return;
      try {
        await fetch(`/api/platforms/${this.selectedPlatform}`, { method: 'DELETE' });
        this.removePlatformMesh(this.selectedPlatform);
        this.platforms = this.platforms.filter(p => p.id !== this.selectedPlatform);
        this.deselectPlatform();
        this.updateEditorPlatformList();
        this.notify('Platform deleted', 'info');
      } catch (e) {
        this.notify('Failed to delete', 'error');
      }
    });

    document.getElementById('ed-generate').addEventListener('click', async () => {
      const seed  = parseInt(document.getElementById('ed-seed').value)  || 42;
      const count = parseInt(document.getElementById('ed-count').value) || 30;
      try {
        await fetch('/api/platforms/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seed, count })
        });
        this.notify(`Generated (seed: ${seed})`, 'success');
        this.loadPlatforms();
        this.playerBody.position.set(0, 5, 0);
        this.playerBody.velocity.setZero();
      } catch (e) { this.notify('Generation failed', 'error'); }
    });

    document.getElementById('btn-generate').addEventListener('click', async () => {
      const seed = Math.floor(Math.random() * 100000);
      try {
        await fetch('/api/platforms/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seed, count: 30 })
        });
        this.loadPlatforms();
        this.playerBody.position.set(0, 5, 0);
        this.playerBody.velocity.setZero();
        this.notify(`New world! (seed: ${seed})`, 'success');
      } catch (e) { this.notify('Generation failed', 'error'); }
    });

    document.getElementById('btn-save').addEventListener('click', () => {
      document.getElementById('save-panel').classList.toggle('hidden');
      this.loadSavesList();
    });
    document.getElementById('btn-load').addEventListener('click', () => {
      document.getElementById('save-panel').classList.toggle('hidden');
      this.loadSavesList();
    });
    document.getElementById('save-close').addEventListener('click', () => {
      document.getElementById('save-panel').classList.add('hidden');
    });

    document.getElementById('save-confirm').addEventListener('click', async () => {
      const name = document.getElementById('save-name').value.trim();
      if (!name) return;
      try {
        await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        this.notify(`Level "${name}" saved!`, 'success');
        this.loadSavesList();
      } catch (e) { this.notify('Save failed', 'error'); }
    });

    document.getElementById('btn-export').addEventListener('click', () => this.exportGLTF());

    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const gltf = JSON.parse(text);
        await fetch('/api/import/gltf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gltf)
        });
        this.loadPlatforms();
        this.playerBody.position.set(0, 5, 0);
        this.playerBody.velocity.setZero();
        this.notify(`Imported ${file.name}`, 'success');
      } catch (e) { this.notify('Import failed', 'error'); }
      e.target.value = '';
    });

    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.code === 'Enter') {
        const text = chatInput.value.trim();
        if (text && this.ws?.readyState === 1) {
          this.ws.send(JSON.stringify({ type: 'chat', text }));
        }
        chatInput.value = '';
        chatInput.classList.remove('active');
        chatInput.blur();
      }
      if (e.code === 'Escape') {
        chatInput.value = '';
        chatInput.classList.remove('active');
        chatInput.blur();
      }
    });
  }

  isChatActive() {
    return document.getElementById('chat-input').classList.contains('active');
  }

  openChat() {
    const chatInput = document.getElementById('chat-input');
    chatInput.classList.add('active');
    chatInput.focus();
  }

  addChatMessage(text, name = null, system = false) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat-msg${system ? ' system' : ''}`;
    if (name) {
      div.innerHTML = `<span class="chat-name">${name}:</span>${this.escapeHtml(text)}`;
    } else {
      div.textContent = text;
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    while (container.children.length > 50) container.removeChild(container.firstChild);
  }

  escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  async loadSavesList() {
    try {
      const res = await fetch('/api/saves');
      const data = await res.json();
      const container = document.getElementById('saves-list');
      container.innerHTML = '';
      if (data.saves.length === 0) {
        container.innerHTML = '<div style="color:#666;font-size:13px;">No saves yet</div>';
        return;
      }
      data.saves.forEach(save => {
        const item = document.createElement('div');
        item.className = 'save-item';
        item.innerHTML = `
          <div>
            <div class="save-name">${save.name}</div>
            <div class="save-meta">${save.platformCount} platforms · ${new Date(save.createdAt).toLocaleDateString()}</div>
          </div>
        `;
        item.addEventListener('click', async () => {
          try {
            await fetch('/api/load', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: save.name })
            });
            this.loadPlatforms();
            this.playerBody.position.set(0, 5, 0);
            this.playerBody.velocity.setZero();
            this.notify(`Loaded "${save.name}"`, 'success');
            document.getElementById('save-panel').classList.add('hidden');
          } catch (e) { this.notify('Load failed', 'error'); }
        });
        container.appendChild(item);
      });
    } catch (e) { console.error('Failed to load saves:', e); }
  }

  async exportGLTF() {
    try {
      const exporter = new GLTFExporter();
      const exportScene = new THREE.Scene();
      this.platformMeshes.forEach(pData => {
        const clone = pData.mesh.clone();
        clone.userData = { ...pData.data };
        exportScene.add(clone);
      });
      exporter.parse(exportScene, (gltf) => {
        const blob = new Blob([JSON.stringify(gltf, null, 2)], { type: 'model/gltf+json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `etherworld_level_${Date.now()}.gltf`;
        a.click();
        URL.revokeObjectURL(url);
        this.notify('Exported as GLTF!', 'success');
      }, (error) => {
        this.exportGLTFFromServer();
      }, { binary: false });
    } catch (e) { this.exportGLTFFromServer(); }
  }

  async exportGLTFFromServer() {
    try {
      const res = await fetch('/api/export/gltf');
      const gltf = await res.json();
      const blob = new Blob([JSON.stringify(gltf, null, 2)], { type: 'model/gltf+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etherworld_level_${Date.now()}.gltf`;
      a.click();
      URL.revokeObjectURL(url);
      this.notify('Exported (server)!', 'success');
    } catch (e) { this.notify('Export failed', 'error'); }
  }

  notify(text, type = 'info') {
    const container = document.getElementById('notifications');
    const div = document.createElement('div');
    div.className = `notification ${type}`;
    div.textContent = text;
    container.appendChild(div);
    setTimeout(() => div.remove(), 3500);
  }

  // ==============================
  //  GAME LOOP
  // ==============================
  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time  = this.clock.getElapsedTime();

    this.physicsWorld.step(1 / 60, delta, 3);
    this.updatePlayerMovement(delta);
    this.updatePlayerAnimation(time, delta);
    this.updateCamera(delta);
    this.updatePlatforms(time, delta);
    this.updateRemotePlayers(delta);
    this.updateFallingPlatforms(delta);

    this.frameCount++;
    if (this.frameCount % 3 === 0) this.sendPosition();

    // Respawn
    if (this.playerBody.position.y < -50) {
      this.playerBody.position.set(0, 5, 0);
      this.playerBody.velocity.setZero();
      this.notify('You fell! Respawning...', 'info');
    }

    // FPS
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
      document.getElementById('fps-counter').textContent = `FPS: ${this.currentFps}`;
    }

    // HUD position
    const p = this.playerBody.position;
    document.getElementById('player-pos').textContent =
      `[${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}]`;

    this.renderer.render(this.scene, this.camera);
  }

  // ==============================
  //  MOUVEMENT 3ème PERSONNE
  // ==============================
  updatePlayerMovement(delta) {
    if (this.isChatActive()) return;

    const speed = this.moveState.sprint ? 16 : 9;

    // Direction basée sur la caméra (yaw)
    const forward = new THREE.Vector3(
      -Math.sin(this.cameraYaw),
      0,
      -Math.cos(this.cameraYaw)
    ).normalize();

    const right = new THREE.Vector3(
      -Math.sin(this.cameraYaw - Math.PI / 2),
      0,
      -Math.cos(this.cameraYaw - Math.PI / 2)
    ).normalize();

    const moveDir = new CANNON.Vec3(0, 0, 0);
    let isMoving = false;

    if (this.moveState.forward)  { moveDir.x += forward.x; moveDir.z += forward.z; isMoving = true; }
    if (this.moveState.backward) { moveDir.x -= forward.x; moveDir.z -= forward.z; isMoving = true; }
    if (this.moveState.left)     { moveDir.x += right.x;   moveDir.z += right.z;   isMoving = true; }
    if (this.moveState.right)    { moveDir.x -= right.x;   moveDir.z -= right.z;   isMoving = true; }

    const len = Math.sqrt(moveDir.x * moveDir.x + moveDir.z * moveDir.z);
    if (len > 0) {
      moveDir.x = (moveDir.x / len) * speed;
      moveDir.z = (moveDir.z / len) * speed;

      // Tourner le personnage vers la direction du mouvement
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      let currentAngle = this.playerMesh.rotation.y;
      let diff = targetAngle - currentAngle;

      // Plus court chemin de rotation
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      this.playerMesh.rotation.y += diff * Math.min(1, delta * 12);
    }

    this.playerBody.velocity.x = moveDir.x;
    this.playerBody.velocity.z = moveDir.z;

    // Déterminer l'animation
    const v = this.playerBody.velocity;
    const hSpeed = Math.sqrt(v.x * v.x + v.z * v.z);
    if (!this.canJump) {
      this.playerAnimState = 'jump';
    } else if (hSpeed > 5) {
      this.playerAnimState = 'run';
    } else if (hSpeed > 0.5) {
      this.playerAnimState = 'walk';
    } else {
      this.playerAnimState = 'idle';
    }
  }

  // ==============================
  //  ANIMATION PERSONNAGE
  // ==============================
  updatePlayerAnimation(time, delta) {
    const p = this.playerBody.position;

    // Position du mesh
    this.playerMesh.position.set(p.x, p.y - 0.3, p.z);

    const animSpeed = this.playerAnimState === 'run' ? 12 : 6;

    switch (this.playerAnimState) {
      case 'walk':
      case 'run':
        this.playerBobTime += delta * animSpeed;

        // Balancement bras
        this.leftArm.rotation.x = Math.sin(this.playerBobTime) * 0.6;
        this.rightArm.rotation.x = -Math.sin(this.playerBobTime) * 0.6;

        // Balancement jambes
        this.leftLeg.rotation.x = -Math.sin(this.playerBobTime) * 0.5;
        this.rightLeg.rotation.x = Math.sin(this.playerBobTime) * 0.5;

        // Léger bob vertical
        this.playerMesh.position.y += Math.abs(Math.sin(this.playerBobTime * 2)) * 0.05;
        break;

      case 'jump':
        // Bras levés
        this.leftArm.rotation.x = -0.8;
        this.rightArm.rotation.x = -0.8;
        this.leftArm.rotation.z = -0.3;
        this.rightArm.rotation.z = 0.3;

        // Jambes groupées
        this.leftLeg.rotation.x = 0.3;
        this.rightLeg.rotation.x = 0.3;
        break;

      case 'idle':
      default:
        // Retour doux à la position de repos
        this.leftArm.rotation.x  *= 0.9;
        this.rightArm.rotation.x *= 0.9;
        this.leftLeg.rotation.x  *= 0.9;
        this.rightLeg.rotation.x *= 0.9;
        this.leftArm.rotation.z  *= 0.9;
        this.rightArm.rotation.z *= 0.9;

        // Respiration subtile
        this.playerMesh.position.y += Math.sin(time * 2) * 0.02;
        break;
    }

    // Glow qui pulse
    if (this.playerGlow) {
      this.playerGlow.material.opacity = 0.4 + Math.sin(time * 3) * 0.2;
      const scale = 1 + Math.sin(time * 3) * 0.1;
      this.playerGlow.scale.set(scale, scale, scale);
    }
  }

  // ==============================
  //  CAMERA 3ème PERSONNE
  // ==============================
  updateCamera(delta) {
    const playerPos = new THREE.Vector3(
      this.playerBody.position.x,
      this.playerBody.position.y,
      this.playerBody.position.z
    );

    // Position cible de la caméra (sphérique autour du joueur)
    const camX = playerPos.x + this.cameraDistance * Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch);
    const camY = playerPos.y + this.cameraDistance * Math.sin(this.cameraPitch) + 2;
    const camZ = playerPos.z + this.cameraDistance * Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch);

    const targetCamPos = new THREE.Vector3(camX, camY, camZ);

    // Collision caméra — éviter de passer à travers les murs
    const rayDir = targetCamPos.clone().sub(playerPos).normalize();
    const ray = new THREE.Raycaster(playerPos.clone().add(new THREE.Vector3(0, 1, 0)), rayDir, 0, this.cameraDistance);
    const meshes = [];
    this.platformMeshes.forEach(p => meshes.push(p.mesh));
    const hits = ray.intersectObjects(meshes, false);

    if (hits.length > 0) {
      const hitDist = hits[0].distance - 0.5;
      if (hitDist < this.cameraDistance) {
        const ratio = Math.max(0.5, hitDist) / this.cameraDistance;
        targetCamPos.lerpVectors(playerPos.clone().add(new THREE.Vector3(0, 2, 0)), targetCamPos, ratio);
      }
    }

    // Interpolation douce
    this.cameraCurrentPos.lerp(targetCamPos, Math.min(1, delta * 8));
    this.camera.position.copy(this.cameraCurrentPos);

    // Regarder vers le joueur (légèrement au-dessus)
    this.cameraLookTarget.lerp(
      playerPos.clone().add(new THREE.Vector3(0, 1, 0)),
      Math.min(1, delta * 10)
    );
    this.camera.lookAt(this.cameraLookTarget);
  }

  updatePlatforms(time, delta) {
    this.platformMeshes.forEach((pData, id) => {
      const { mesh, body, data } = pData;

      if (data.type === 'moving' && data.movement) {
        const m = data.movement;
        const offset = Math.sin(time * m.speed) * m.amplitude;
        const pos = [...data.position];
        const axisIdx = m.axis === 'x' ? 0 : m.axis === 'y' ? 1 : 2;
        pos[axisIdx] += offset;
        body.position.set(pos[0], pos[1], pos[2]);
        mesh.position.set(pos[0], pos[1], pos[2]);
      }

      if (data.type === 'rotating' && data.rotation) {
        const r = data.rotation;
        const angle = time * r.speed;
        if (r.axis === 'y') { body.quaternion.setFromEuler(0, angle, 0); mesh.rotation.y = angle; }
        else if (r.axis === 'x') { body.quaternion.setFromEuler(angle, 0, 0); mesh.rotation.x = angle; }
        else { body.quaternion.setFromEuler(0, 0, angle); mesh.rotation.z = angle; }
      }

      if (this.fallingPlatforms.has(id)) {
        const fState = this.fallingPlatforms.get(id);
        if (fState.phase === 'falling') {
          mesh.position.copy(body.position);
          mesh.quaternion.copy(body.quaternion);
          mesh.material.opacity = Math.max(0, mesh.material.opacity - delta * 0.5);
        }
      }
    });
  }

  updateFallingPlatforms(delta) {
    this.fallingPlatforms.forEach((state, id) => {
      if (state.phase === 'shake') {
        const pData = this.platformMeshes.get(id);
        if (pData) {
          state.time += delta * 1000;
          pData.mesh.position.x = pData.data.position[0] + (Math.random() - 0.5) * 0.1;
          pData.mesh.position.z = pData.data.position[2] + (Math.random() - 0.5) * 0.1;
        }
      }
    });
  }

  updateRemotePlayers(delta) {
    this.remotePlayers.forEach((rp) => {
      // Interpoler position
      const prevPos = rp.group.position.clone();
      rp.group.position.lerp(rp.targetPos, Math.min(1, delta * 12));

      // Vérifier si en mouvement
      const moved = prevPos.distanceTo(rp.group.position);
      const isWalking = moved > 0.01;

      // Rotation vers la direction de déplacement
      if (isWalking) {
        const dir = rp.group.position.clone().sub(prevPos);
        const angle = Math.atan2(dir.x, dir.z);
        rp.group.rotation.y += (angle - rp.group.rotation.y) * Math.min(1, delta * 8);

        // Animer bras et jambes
        rp.walkTime += delta * 8;
        if (rp.leftArm)  rp.leftArm.rotation.x  =  Math.sin(rp.walkTime) * 0.5;
        if (rp.rightArm) rp.rightArm.rotation.x = -Math.sin(rp.walkTime) * 0.5;
        if (rp.leftLeg)  rp.leftLeg.rotation.x  = -Math.sin(rp.walkTime) * 0.4;
        if (rp.rightLeg) rp.rightLeg.rotation.x =  Math.sin(rp.walkTime) * 0.4;
      } else {
        // Retour au repos
        if (rp.leftArm)  rp.leftArm.rotation.x  *= 0.9;
        if (rp.rightArm) rp.rightArm.rotation.x *= 0.9;
        if (rp.leftLeg)  rp.leftLeg.rotation.x  *= 0.9;
        if (rp.rightLeg) rp.rightLeg.rotation.x *= 0.9;
      }
    });
  }

  // ==============================
  //  TIME & WEATHER (Admin hooks)
  // ==============================
  updateTimeOfDay(hours) {
    const t = hours / 24;

    const nightTop = new THREE.Color(0x0a0a2e);
    const dayTop   = new THREE.Color(0x1a3a6e);
    const nightBot = new THREE.Color(0x0a0a1a);
    const dayBot   = new THREE.Color(0x2a4a8e);

    const skyMesh = this.scene.children.find(
      c => c.type === 'Mesh' && c.geometry?.type === 'SphereGeometry'
    );
    if (skyMesh?.material?.uniforms) {
      const u = skyMesh.material.uniforms;
      u.topColor.value.lerpColors(nightTop, dayTop, Math.sin(t * Math.PI));
      u.bottomColor.value.lerpColors(nightBot, dayBot, Math.sin(t * Math.PI));
    }

    this.scene.children.filter(c => c.type === 'DirectionalLight').forEach(l => {
      l.intensity = 0.2 + Math.max(0, Math.sin(t * Math.PI)) * 1.4;
    });

    const stars = this.scene.children.find(c => c.type === 'Points');
    if (stars) stars.material.opacity = Math.max(0, 1 - Math.sin(t * Math.PI) * 2);

    this.scene.fog.density = 0.008 + (1 - Math.sin(t * Math.PI)) * 0.006;
  }

  updateWeather(weather) {
    const configs = {
      sunny:  { fog: 0x0a0a1a, density: 0.008 },
      cloudy: { fog: 0x223344, density: 0.012 },
      rainy:  { fog: 0x1a2233, density: 0.018 },
      snowy:  { fog: 0x334455, density: 0.015 },
      fog:    { fog: 0x445566, density: 0.025 },
      storm:  { fog: 0x0a1a22, density: 0.022 }
    };
    const cfg = configs[weather] || configs.sunny;
    this.scene.fog.color.setHex(cfg.fog);
    this.scene.fog.density = cfg.density;
    this.notify(`Weather: ${weather}`, 'info');
  }
}

// ============================================================
//  LAUNCH
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  window.game = new EtherWorldGame();
});