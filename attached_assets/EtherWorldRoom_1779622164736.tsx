'use client'

import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useEtherWorldStore } from '@/lib/etherworld/store'
import { RoomArchitecture, RoomLighting, SpawnParticles } from './room-architecture'
import { SecurityDoor, BathroomFixtures, WindowWithCurtains } from './door-system'
import { TerrainGround, TerrainSky, Clouds, SunMoon, Mountains, Vegetation, Water, Rocks, Pathway, ExteriorLighting } from './exterior-terrain'
import {
  LuxuryBed,
  Nightstand,
  ModernSofa,
  CoffeeTable,
  TVStand,
  GamingDesk,
  GamingChair,
  ArcadeMachine,
  MiniBar,
  Wardrobe,
  Safe,
  WallArt,
  Plant,
  Rug,
  CeilingLight,
  NeonSign,
  FloorLamp,
  DeskLamp,
  Bookshelf,
  DiningTable,
  KitchenIsland,
  Refrigerator,
  OvenStove,
  KitchenSink,
  BarStool,
  WineRack,
  Dishwasher,
  OutdoorLounge,
  HotTub,
  GardenTable,
  PottedTree,
  FirePit,
  OutdoorLamp,
  BalconyRailing,
  SunLounger,
  CandleSet,
  Sculpture,
  VaseFlowers,
  Clock,
  Mirror,
  CurtainSet,
} from './furniture'
import {
  HackingTerminal,
  HotelPhone,
  Jacuzzi,
  MusicSystem,
  SmartMirror,
  VendingMachine,
  SmartHomePad,
  Fireplace,
  TrophyCabinet,
  RoomServicePanel,
  SecurityPanel,
  CoffeeMachine,
  NewsTablet,
} from './interactive-objects'

export function EtherWorldRoom() {
  const [showSpawnParticles, setShowSpawnParticles] = useState(true)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSpawnParticles(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="w-full h-screen bg-background">
      <Canvas
        shadows
        camera={{ position: [10, 6, 12], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          {/* === EXTERIOR TERRAIN (visible through windows) === */}
          <TerrainSky />
          <ExteriorLighting />
          <Clouds count={12} />
          <SunMoon />
          <Mountains count={10} />
          <Vegetation />
          <Water />
          <Rocks />
          <Pathway />
          <TerrainGround size={200} />

          {/* Environment and lighting */}
          <Environment preset="night" />
          <RoomLighting />
          <fog attach="fog" args={['#0a0a0f', 12, 35]} />

          {/* Room structure */}
          <RoomArchitecture />

          {/* Spawn effect */}
          <SpawnParticles active={showSpawnParticles} />

          {/* === BEDROOM AREA (back right) === */}
          <group data-object-type="LuxuryBed">
            <LuxuryBed position={[3, 0, -6]} />
          </group>
          <Nightstand position={[1.5, 0, -6.5]} side="left" />
          <Nightstand position={[4.5, 0, -6.5]} side="right" />
          <FloorLamp position={[5.5, 0, -7]} />
          <HotelPhone position={[1.5, 0.52, -6.5]} />
          <SmartMirror position={[6.85, 1.6, -5.5]} rotation={[0, -Math.PI / 2, 0]} />
          <Mirror position={[6.85, 1.6, -3]} rotation={[0, -Math.PI / 2, 0]} size={[0.5, 1]} />
          <CandleSet position={[4.5, 0.52, -6.8]} />

          {/* === LIVING AREA (center) === */}
          <group data-object-type="ModernSofa">
            <ModernSofa position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />
          </group>
          <ModernSofa position={[-3, 0, -2]} rotation={[0, Math.PI / 2, 0]} />
          <group data-object-type="CoffeeTable">
            <CoffeeTable position={[-1, 0, -1.5]} />
          </group>
          <group data-object-type="TVStand">
            <TVStand position={[-5.5, 0, -1.5]} />
          </group>
          <FloorLamp position={[-5.5, 0, 1.5]} />
          <Rug position={[-1, 0.01, -1]} size={[4, 4]} />
          <MusicSystem position={[-5.3, 0.5, -0.5]} />
          <NewsTablet position={[-1, 0.38, -1.5]} rotation={[-Math.PI / 2 + 0.2, 0, 0.2]} />
          <Fireplace position={[-6.75, 1.2, -3]} rotation={[0, Math.PI / 2, 0]} />
          <VaseFlowers position={[-1, 0.38, -1.2]} />
          <Sculpture position={[-2, 0, -3]} rotation={[0, 0.3, 0]} />
          <Clock position={[-6.85, 2.5, -1]} rotation={[0, Math.PI / 2, 0]} />

          {/* === DINING AREA (front left) === */}
          <DiningTable position={[-4, 0, 5]} />
          <FloorLamp position={[-6, 0, 6.5]} />
          <RoomServicePanel position={[-6.85, 1.4, 5]} rotation={[0, Math.PI / 2, 0]} />
          <CandleSet position={[-4, 0.84, 5]} />

          {/* === KITCHEN AREA (front left extension) === */}
          <KitchenIsland position={[-4, 0, 8]} />
          <Refrigerator position={[-6.5, 0, 8.5]} rotation={[0, Math.PI / 2, 0]} />
          <OvenStove position={[-6.5, 0, 7]} rotation={[0, Math.PI / 2, 0]} />
          <KitchenSink position={[-6.5, 0, 5.5]} rotation={[0, Math.PI / 2, 0]} />
          <WineRack position={[-6.5, 0, 6.5]} rotation={[0, Math.PI / 2, 0]} />
          <Dishwasher position={[-6.5, 0, 9.5]} rotation={[0, Math.PI / 2, 0]} />
          <BarStool position={[-3.2, 0, 7.5]} />
          <BarStool position={[-4, 0, 7.5]} />
          <BarStool position={[-4.8, 0, 7.5]} />

          {/* === GAMING CORNER (right side) === */}
          <GamingDesk position={[5.5, 0, 2]} rotation={[0, -Math.PI / 2, 0]} />
          <GamingChair position={[4.2, 0, 2]} rotation={[0, Math.PI / 2, 0]} />
          <DeskLamp position={[5.8, 0.77, 1.5]} />
          <ArcadeMachine position={[5.8, 0, -2]} rotation={[0, -Math.PI / 2, 0]} />
          <Rug position={[5, 0.01, 2]} size={[2.5, 3]} />
          <HackingTerminal position={[5.5, 0, 4.5]} />
          <TrophyCabinet position={[6.3, 0, 4]} />

          {/* === MINI BAR / KITCHEN (front right) === */}
          <MiniBar position={[4, 0, 6.5]} />
          <CoffeeMachine position={[3.0, 0.95, 6.2]} />
          <VendingMachine position={[6.5, 0, 7]} rotation={[0, -Math.PI / 2, 0]} />

          {/* === SPA / JACUZZI AREA (front corner left) === */}
          <Jacuzzi position={[-5, 0, 6.5]} />

          {/* === BALCONY / EXTERIOR (through window) === */}
          <OutdoorLounge position={[0, 0, -10.5]} />
          <HotTub position={[-3, 0, -10.5]} />
          <GardenTable position={[3, 0, -10.5]} />
          <PottedTree position={[5, 0, -10]} size={1.2} />
          <PottedTree position={[-5, 0, -10]} size={0.8} />
          <FirePit position={[0, 0, -12]} />
          <OutdoorLamp position={[-4, 0, -11]} />
          <OutdoorLamp position={[4, 0, -11]} />
          <BalconyRailing position={[0, 0, -9.5]} size={[8, 1.1]} />
          <SunLounger position={[2, 0, -11.5]} rotation={[0, 0.3, 0]} />
          <SunLounger position={[-2, 0, -11.5]} rotation={[0, -0.3, 0]} />

          {/* === STORAGE & BOOKSHELF === */}
          <Wardrobe position={[6, 0, -5]} rotation={[0, -Math.PI / 2, 0]} />
          <Safe position={[5.5, 0, -7.5]} />
          <Bookshelf position={[-6, 0, -5]} rotation={[0, Math.PI / 2, 0]} />

          {/* === WALL PANELS (interactive controls) === */}
          <SmartHomePad position={[-0.8, 1.4, 8.82]} rotation={[0, Math.PI, 0]} />
          <SecurityPanel position={[0.8, 1.4, 8.82]} rotation={[0, Math.PI, 0]} />
          <SmartHomePad position={[6.85, 1.5, -7.5]} rotation={[0, -Math.PI / 2, 0]} />

          {/* === DECORATIVE ELEMENTS === */}
          <WallArt position={[6.9, 1.8, 0]} size={[0.8, 0.5]} />
          <WallArt position={[6.9, 1.8, -4]} size={[1, 0.6]} />
          <WallArt position={[0, 1.8, -8.9]} size={[1.5, 0.9]} />
          <WallArt position={[-4, 1.8, -8.9]} size={[1.2, 0.7]} />

          <Plant position={[6, 0, 5]} size={1.4} />
          <Plant position={[-6, 0, 7]} size={1.2} />
          <Plant position={[-6.5, 0, -2]} size={0.9} />
          <Plant position={[2, 0, 7]} size={1} />
          <Plant position={[0, 0.77, 5.5]} size={0.5} />
          <PottedTree position={[6.5, 0, -7.5]} size={0.7} />

          <Rug position={[3, 0.01, -5]} size={[3, 3.5]} />

          <NeonSign position={[6.85, 2.4, -6]} />
          <NeonSign position={[-6.85, 2.2, 3]} text="LOUNGE" color="#22c55e" />

          <CurtainSet position={[0, 2.8, -8.9]} width={6} />
          <CurtainSet position={[6.9, 2.8, 2]} rotation={[0, -Math.PI / 2, 0]} width={4} />

          <VaseFlowers position={[-4, 0.84, 5.2]} />
          <Sculpture position={[6, 0, 2]} rotation={[0, Math.PI / 4, 0]} />

          <CeilingLight position={[0, 3.45, 0]} />
          <CeilingLight position={[3, 3.45, -5]} />
          <CeilingLight position={[-3, 3.45, -5]} />
          <CeilingLight position={[3, 3.45, 5]} />
          <CeilingLight position={[-3, 3.45, 5]} />

          {/* === DOORS === */}
          <SecurityDoor
            position={[0, 0, 8.9]}
            rotation={[0, Math.PI, 0]}
            doorId="main"
            requiredLevel="resident"
          />
          <SecurityDoor
            position={[-5, 0, -4]}
            rotation={[0, 0, 0]}
            doorId="bathroom"
            requiredLevel="guest"
          />

          {/* === BATHROOM === */}
          <BathroomFixtures position={[-5, 0, -7]} />

          {/* === WINDOWS - panoramic === */}
          <WindowWithCurtains
            position={[0, 1.8, -8.9]}
            rotation={[0, 0, 0]}
            size={[6, 2.5]}
          />
          <WindowWithCurtains
            position={[6.9, 1.8, 2]}
            rotation={[0, -Math.PI / 2, 0]}
            size={[4, 2]}
          />

          {/* Camera controls */}
          <OrbitControls
            makeDefault
            minDistance={4}
            maxDistance={20}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
            target={[0, 1, 0]}
            enableDamping
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
