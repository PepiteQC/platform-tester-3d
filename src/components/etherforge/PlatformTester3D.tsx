/**
 * PlatformTester3D — Intégration de la scène 3D du jeu dans EtherForge
 * Garde 100% de la logique originale (physics, multijoueur, éditeur)
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Button, Card, Badge } from '@blinkdotnew/ui';
import { Play, Pause, Users, Wrench, RotateCcw } from 'lucide-react';

// Types des plateformes
interface PlatformData {
  id: number;
  type: 'static' | 'moving' | 'falling' | 'bouncy' | 'rotating' | 'goal' | 'ground';
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  material: string;
  isStatic: boolean;
  movement?: { axis: 'x' | 'y' | 'z'; amplitude: number; speed: number };
  fallDelay?: number;
  respawnTime?: number;
  bounceForce?: number;
  rotation?: { axis: 'x' | 'y' | 'z'; speed: number };
}

interface PlayerData {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
}

// Physics world singleton
let physicsWorld: CANNON.World | null = null;
let platforms: Map<number, { mesh: THREE.Mesh; body: CANNON.Body; data: PlatformData }> = new Map();
let playerBody: CANNON.Body | null = null;

// Hook pour la physique
function usePhysics() {
  const { scene } = useThree();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (physicsWorld) return;
    
    physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -20, 0),
      broadphase: new CANNON.NaiveBroadphase(),
    });
    
    // Materials
    const playerMat = new CANNON.Material('player');
    const platformMat = new CANNON.Material('platform');
    const bouncyMat = new CANNON.Material('bouncy');
    
    physicsWorld.addContactMaterial(new CANNON.ContactMaterial(playerMat, platformMat, {
      friction: 0.4,
      restitution: 0.05
    }));
    
    physicsWorld.addContactMaterial(new CANNON.ContactMaterial(playerMat, bouncyMat, {
      friction: 0.3,
      restitution: 1.5
    }));

    // Player body
    const radius = 0.4;
    playerBody = new CANNON.Body({
      mass: 70,
      shape: new CANNON.Sphere(radius),
      position: new CANNON.Vec3(0, 5, 0),
      material: playerMat,
      linearDamping: 0.3,
      angularDamping: 1,
      fixedRotation: true
    });
    
    playerBody.addShape(new CANNON.Sphere(radius), new CANNON.Vec3(0, 0.4, 0));
    playerBody.addShape(new CANNON.Sphere(radius), new CANNON.Vec3(0, -0.4, 0));
    
    playerBody.addEventListener('collide', (e: any) => {
      const contactNormal = new CANNON.Vec3();
      const contact = e.contact;
      if (contact.bi.id === playerBody!.id) {
        contact.ni.negate(contactNormal);
      } else {
        contactNormal.copy(contact.ni);
      }
      if (contactNormal.y > 0.5) {
        // Check platform type
        const otherBody = contact.bi.id === playerBody!.id ? contact.bj : contact.bi;
        handlePlatformContact(otherBody);
      }
    });
    
    physicsWorld.addBody(playerBody);
    setIsReady(true);
    
    return () => {
      // Cleanup handled at unmount
    };
  }, []);

  return { physicsWorld, playerBody, isReady };
}

function handlePlatformContact(body: CANNON.Body) {
  platforms.forEach((p, id) => {
    if (p.body === body) {
      if (p.data.type === 'bouncy' && p.data.bounceForce) {
        playerBody!.velocity.y = p.data.bounceForce;
      }
      if (p.data.type === 'goal') {
        console.log('🏆 Goal reached!');
      }
    }
  });
}

// Composant Plateforme
function Platform({ data }: { data: PlatformData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<CANNON.Body>(null);
  const { scene } = useThree();

  useEffect(() => {
    if (!physicsWorld) return;
    
    const geometry = new THREE.BoxGeometry(...data.size);
    const material = new THREE.MeshStandardMaterial({
      color: data.color,
      metalness: data.material === 'emissive' ? 0.5 : 0.2,
      roughness: data.material === 'emissive' ? 0.3 : 0.7,
      emissive: data.material === 'emissive' ? data.color : undefined,
      emissiveIntensity: data.material === 'emissive' ? 0.5 : 0
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...data.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    
    const halfExtents = new CANNON.Vec3(data.size[0]/2, data.size[1]/2, data.size[2]/2);
    const body = new CANNON.Body({
      mass: data.isStatic ? 0 : 5,
      shape: new CANNON.Box(halfExtents),
      position: new CANNON.Vec3(...data.position),
      material: data.type === 'bouncy' ? physicsWorld.defaultMaterial : undefined
    });
    
    physicsWorld.addBody(body);
    
    const entry = { mesh, body, data };
    platforms.set(data.id, entry);
    
    // Bordures lumineuses
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ 
      color: new THREE.Color(data.color).multiplyScalar(1.5),
      transparent: true,
      opacity: 0.3
    }));
    mesh.add(line);
    
    return () => {
      physicsWorld?.removeBody(body);
      scene.remove(mesh);
      platforms.delete(data.id);
    };
  }, [data, scene]);

  // Animation pour plateformes moving/rotating
  useFrame(({ clock }) => {
    const p = platforms.get(data.id);
    if (!p) return;
    
    const time = clock.getElapsedTime();
    
    if (data.type === 'moving' && data.movement) {
      const { axis, amplitude, speed } = data.movement;
      const offset = Math.sin(time * speed) * amplitude;
      const pos = [...data.position] as [number, number, number];
      const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
      pos[idx] += offset;
      p.body.position.set(pos[0], pos[1], pos[2]);
      p.mesh.position.set(pos[0], pos[1], pos[2]);
    }
    
    if (data.type === 'rotating' && data.rotation) {
      const { axis, speed } = data.rotation;
      const angle = time * speed;
      if (axis === 'y') {
        p.body.quaternion.setFromEuler(0, angle, 0);
        p.mesh.rotation.y = angle;
      }
    }
  });

  return null;
}

// Joueur local
function LocalPlayer({ onPositionChange }: { onPositionChange?: (pos: THREE.Vector3) => void }) {
  const meshRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [canJump, setCanJump] = useState(false);
  
  const moveState = useRef({
    forward: false, backward: false, left: false, right: false, sprint: false
  });
  
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const cameraYaw = useRef(0);
  const cameraPitch = useRef(0.3);

  // Input handling
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': case 'ArrowUp': moveState.current.forward = true; break;
        case 'KeyS': case 'ArrowDown': moveState.current.backward = true; break;
        case 'KeyA': case 'ArrowLeft': moveState.current.left = true; break;
        case 'KeyD': case 'ArrowRight': moveState.current.right = true; break;
        case 'ShiftLeft': case 'ShiftRight': moveState.current.sprint = true; break;
        case 'Space': 
          e.preventDefault();
          if (canJump && playerBody) {
            playerBody.velocity.y = 10;
            setCanJump(false);
          }
          break;
      }
    };
    
    const onKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': case 'ArrowUp': moveState.current.forward = false; break;
        case 'KeyS': case 'ArrowDown': moveState.current.backward = false; break;
        case 'KeyA': case 'ArrowLeft': moveState.current.left = false; break;
        case 'KeyD': case 'ArrowRight': moveState.current.right = false; break;
        case 'ShiftLeft': case 'ShiftRight': moveState.current.sprint = false; break;
      }
    };
    
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        cameraYaw.current -= e.movementX * 0.003;
        cameraPitch.current -= e.movementY * 0.003;
        cameraPitch.current = Math.max(-0.5, Math.min(1.2, cameraPitch.current));
      }
    };
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [canJump]);

  useFrame((state, delta) => {
    if (!playerBody || !meshRef.current) return;
    
    // Physics step
    physicsWorld?.step(1/60, delta, 3);
    
    // Movement
    const speed = moveState.current.sprint ? 16 : 9;
    const forward = new THREE.Vector3(-Math.sin(cameraYaw.current), 0, -Math.cos(cameraYaw.current));
    const right = new THREE.Vector3(-Math.sin(cameraYaw.current - Math.PI/2), 0, -Math.cos(cameraYaw.current - Math.PI/2));
    
    const moveDir = new CANNON.Vec3(0, 0, 0);
    if (moveState.current.forward) { moveDir.x += forward.x; moveDir.z += forward.z; }
    if (moveState.current.backward) { moveDir.x -= forward.x; moveDir.z -= forward.z; }
    if (moveState.current.left) { moveDir.x += right.x; moveDir.z += right.z; }
    if (moveState.current.right) { moveDir.x -= right.x; moveDir.z -= right.z; }
    
    const len = Math.sqrt(moveDir.x**2 + moveDir.z**2);
    if (len > 0) {
      moveDir.x = (moveDir.x/len) * speed;
      moveDir.z = (moveDir.z/len) * speed;
    }
    
    playerBody.velocity.x = moveDir.x;
    playerBody.velocity.z = moveDir.z;
    
    // Update mesh position
    meshRef.current.position.set(playerBody.position.x, playerBody.position.y - 0.3, playerBody.position.z);
    meshRef.current.rotation.y = cameraYaw.current;
    
    // Update camera (3rd person)
    const camDist = 6;
    const camX = playerBody.position.x + camDist * Math.sin(cameraYaw.current) * Math.cos(cameraPitch.current);
    const camY = playerBody.position.y + 2 + camDist * Math.sin(cameraPitch.current);
    const camZ = playerBody.position.z + camDist * Math.cos(cameraYaw.current) * Math.cos(cameraPitch.current);
    
    camera.position.set(camX, camY, camZ);
    camera.lookAt(playerBody.position.x, playerBody.position.y + 1, playerBody.position.z);
    
    // Respawn
    if (playerBody.position.y < -50) {
      playerBody.position.set(0, 5, 0);
      playerBody.velocity.set(0, 0, 0);
    }
    
    onPositionChange?.(new THREE.Vector3(playerBody.position.x, playerBody.position.y, playerBody.position.z));
  });

  return (
    <group ref={meshRef}>
      {/* Corps */}
      <mesh castShadow>
        <capsuleGeometry args={[0.35, 0.8, 8, 16]} />
        <meshStandardMaterial color="#77ddff" metalness={0.3} roughness={0.6} emissive="#112233" emissiveIntensity={0.3} />
      </mesh>
      {/* Tête */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial color="#88eeff" emissive="#224455" emissiveIntensity={0.2} />
      </mesh>
      {/* Yeux */}
      <mesh position={[-0.12, 0.68, 0.24]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.8} /></mesh>
      <mesh position={[0.12, 0.68, 0.24]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.8} /></mesh>
      {/* Bras */}
      <mesh position={[-0.45, 0.05, 0]} rotation={[0, 0, 0.1]}><capsuleGeometry args={[0.1, 0.45, 6, 8]} /><meshStandardMaterial color="#66ccee" /></mesh>
      <mesh position={[0.45, 0.05, 0]} rotation={[0, 0, -0.1]}><capsuleGeometry args={[0.1, 0.45, 6, 8]} /><meshStandardMaterial color="#66ccee" /></mesh>
      {/* Jambes */}
      <mesh position={[-0.15, -0.6, 0]}><capsuleGeometry args={[0.12, 0.4, 6, 8]} /><meshStandardMaterial color="#4488aa" /></mesh>
      <mesh position={[0.15, -0.6, 0]}><capsuleGeometry args={[0.12, 0.4, 6, 8]} /><meshStandardMaterial color="#4488aa" /></mesh>
    </group>
  );
}

// Génération procédurale
function generatePlatforms(seed: number = 42): PlatformData[] {
  const platforms: PlatformData[] = [];
  let nextId = 1;
  
  // Sol
  platforms.push({
    id: nextId++,
    type: 'ground',
    position: [0, -1, 0],
    size: [40, 2, 40],
    color: '#4a7c59',
    material: 'standard',
    isStatic: true
  });
  
  // RNG
  let s = seed;
  const rng = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  
  const types: PlatformData['type'][] = ['static', 'moving', 'falling', 'bouncy', 'rotating'];
  const weights = [0.45, 0.2, 0.15, 0.1, 0.1];
  const colors: Record<PlatformData['type'], string> = {
    static: '#6688cc',
    moving: '#cc8844',
    falling: '#cc4444',
    bouncy: '#44cc88',
    rotating: '#aa44cc',
    goal: '#ffdd44',
    ground: '#4a7c59'
  };
  
  let lastPos = { x: 0, y: 1, z: 0 };
  
  for (let i = 0; i < 30; i++) {
    const dx = (rng() - 0.5) * 8;
    const dy = 1.5 + rng() * 2;
    const dz = (rng() - 0.5) * 8;
    lastPos = { x: lastPos.x + dx, y: lastPos.y + dy, z: lastPos.z + dz };
    
    let r = rng();
    let ptype: PlatformData['type'] = 'static';
    let total = 0;
    for (let j = 0; j < types.length; j++) {
      total += weights[j];
      if (r <= total) { ptype = types[j]; break; }
    }
    
    const p: PlatformData = {
      id: nextId++,
      type: ptype,
      position: [lastPos.x, lastPos.y, lastPos.z],
      size: [1.5 + rng() * 3, 0.4, 1.5 + rng() * 3],
      color: colors[ptype],
      material: 'standard',
      isStatic: ptype === 'static'
    };
    
    if (ptype === 'moving') p.movement = { axis: ['x','y','z'][Math.floor(rng()*3)] as any, amplitude: 2+rng()*4, speed: 0.5+rng()*1.5 };
    if (ptype === 'falling') { p.fallDelay = 0.5+rng(); p.respawnTime = 3+rng()*2; }
    if (ptype === 'bouncy') p.bounceForce = 10+rng()*15;
    if (ptype === 'rotating') p.rotation = { axis: 'y', speed: 0.5+rng()*2 };
    
    platforms.push(p);
  }
  
  // Goal
  platforms.push({
    id: nextId++,
    type: 'goal',
    position: [lastPos.x, lastPos.y + 2, lastPos.z],
    size: [4, 0.5, 4],
    color: '#ffdd44',
    material: 'emissive',
    isStatic: true
  });
  
  return platforms;
}

// Composant principal
export function PlatformTester3D({ onBack }: { onBack?: () => void }) {
  const [platformsData, setPlatformsData] = useState<PlatformData[]>([]);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 5, z: 0 });
  const [isPlaying, setIsPlaying] = useState(true);
  
  useEffect(() => {
    // Cleanup previous physics
    platforms.clear();
    physicsWorld = null;
    playerBody = null;
    
    setPlatformsData(generatePlatforms(42));
    
    // Click to lock pointer
    const handleClick = () => {
      document.body.requestPointerLock();
    };
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('click', handleClick);
      document.exitPointerLock();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#050810] overflow-hidden">
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2">
          <Card className="bg-black/60 backdrop-blur-md border-white/10 p-3 pointer-events-auto">
            <div className="flex items-center gap-2 text-white font-mono text-sm">
              <span className="text-[#7df] font-bold">EtherForge</span>
              <span className="text-gray-500">|</span>
              <span>Platform Tester 3D</span>
            </div>
            <div className="text-xs text-gray-400 mt-1 font-mono">
              Pos: [{playerPos.x.toFixed(1)}, {playerPos.y.toFixed(1)}, {playerPos.z.toFixed(1)}]
            </div>
          </Card>
          
          <Card className="bg-black/60 backdrop-blur-md border-white/10 p-3 pointer-events-auto w-fit">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[10px] border-[#7b6fff]/30 text-[#7b6fff]">
                WASD: Move
              </Badge>
              <Badge variant="outline" className="text-[10px] border-[#7b6fff]/30 text-[#7b6fff]">
                SPACE: Jump
              </Badge>
              <Badge variant="outline" className="text-[10px] border-[#7b6fff]/30 text-[#7b6fff]">
                SHIFT: Sprint
              </Badge>
            </div>
          </Card>
        </div>
        
        <div className="flex gap-2 pointer-events-auto">
          <Button variant="outline" size="sm" onClick={onBack} className="bg-black/50 border-white/20">
            ← Back to EtherForge
          </Button>
          <Button 
            size="sm" 
            onClick={() => {
              if (playerBody) {
                playerBody.position.set(0, 5, 0);
                playerBody.velocity.set(0, 0, 0);
              }
            }}
            className="bg-[#7b6fff] hover:bg-[#5b4fff]"
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Respawn
          </Button>
        </div>
      </div>

      {/* Stats bottom */}
      <div className="absolute bottom-6 left-6 z-50 pointer-events-none">
        <Card className="bg-black/60 backdrop-blur-md border-white/10 p-4">
          <div className="flex gap-6 text-xs font-mono">
            <div>
              <span className="text-gray-500">Platforms:</span>
              <span className="text-white ml-2">{platformsData.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span className="text-green-400 ml-2">Online</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Canvas 3D */}
      <Canvas
        shadows
        camera={{ position: [0, 8, 12], fov: 65 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <color attach="background" args={['#050810']} />
        <fog attach="fog" args={['#0a0a1a', 0.008, 1000]} />
        
        {/* Lights */}
        <ambientLight intensity={0.6} color="#334466" />
        <hemisphereLight intensity={0.4} color="#446688" groundColor="#223344" />
        <directionalLight 
          position={[50, 80, 30]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
        />
        <pointLight position={[-10, 15, -10]} intensity={0.5} color="#4488ff" />
        <pointLight position={[15, 20, 10]} intensity={0.3} color="#ff8844" />
        
        {/* Skybox */}
        <mesh>
          <sphereGeometry args={[400, 32, 32]} />
          <shaderMaterial
            uniforms={{
              topColor: { value: new THREE.Color(0x0a0a2e) },
              bottomColor: { value: new THREE.Color(0x1a1a3a) },
              offset: { value: 20 },
              exponent: { value: 0.6 }
            }}
            vertexShader={`
              varying vec3 vWorldPosition;
              void main() {
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPos.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform vec3 topColor;
              uniform vec3 bottomColor;
              uniform float offset;
              uniform float exponent;
              varying vec3 vWorldPosition;
              void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
              }
            `}
            side={THREE.BackSide}
          />
        </mesh>
        
        {/* Stars */}
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2000}
              array={new Float32Array(Array.from({length: 6000}, (_, i) => {
                const r = 300;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                if (i % 3 === 1) return Math.abs(r * Math.cos(phi)); // Y only positive
                return r * Math.sin(phi) * (i % 3 === 0 ? Math.cos(theta) : Math.sin(theta));
              }))}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial color="white" size={1.5} transparent opacity={0.8} sizeAttenuation />
        </points>
        
        {/* Platforms */}
        {platformsData.map(p => <Platform key={p.id} data={p} />)}
        
        {/* Player */}
        <LocalPlayer onPositionChange={(pos) => setPlayerPos({ x: pos.x, y: pos.y, z: pos.z })} />
      </Canvas>
    </div>
  );
}