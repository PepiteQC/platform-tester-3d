/**
 * EtherForgeShell — Conteneur principal avec navigation entre modes
 * Ne modifie PAS les composants existants, juste les route
 */
import { useState } from 'react';
import { 
  AppShell, 
  AppShellSidebar, 
  AppShellMain,
  SidebarGroup,
  SidebarItem,
  Button,
  Badge
} from '@blinkdotnew/ui';
import { 
  Box, 
  Gamepad2, 
  Hammer,
  ChevronLeft,
  Play
} from 'lucide-react';
import { ProjectMenu } from './ProjectMenu';
import { BuilderUI } from './BuilderUI';
import { PlatformTester3D } from './PlatformTester3D';
import { useBuilderStore } from '@/store/useBuilderStore';

type EtherForgeMode = 'menu' | 'builder' | 'platform-tester';

export function EtherForgeShell() {
  const [mode, setMode] = useState<EtherForgeMode>('menu');
  const currentProject = useBuilderStore((state) => state.currentProject);

  // Si on est dans le builder et qu'on a un projet, afficher BuilderUI
  // Sinon afficher le menu ou le platform tester
  const renderContent = () => {
    switch (mode) {
      case 'platform-tester':
        return <PlatformTester3D onBack={() => setMode('menu')} />;
      
      case 'builder':
        if (currentProject) {
          return <BuilderUI />;
        }
        return <ProjectMenu />;
      
      case 'menu':
      default:
        return (
          <div className="min-h-screen bg-[#060606] text-white flex flex-col items-center justify-center p-6">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#7b6fff]/20 blur-[120px] rounded-full" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00d4ff]/20 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-4xl w-full z-10 text-center mb-12">
              <Badge className="bg-[#7b6fff]/10 text-[#7b6fff] border-[#7b6fff]/20 px-4 py-1 text-[10px] font-bold uppercase tracking-widest mb-6">
                EtherForge v2.0 — Integrated
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 mb-4">
                EtherForge Studio
              </h1>
              <p className="text-lg text-white/40 max-w-2xl mx-auto font-medium">
                Choose your workspace: Design architectural spaces or test 3D platforming physics in real-time.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full z-10">
              {/* Card Builder */}
              <div 
                className="group relative bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-[#7b6fff]/50 rounded-2xl p-8 cursor-pointer transition-all duration-500"
                onClick={() => setMode('builder')}
              >
                <div className="w-16 h-16 rounded-2xl bg-[#7b6fff] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-[#7b6fff]/20">
                  <Hammer className="text-white w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-3 tracking-tight">Poly Builder</h2>
                <p className="text-white/40 leading-relaxed mb-6">
                  Professional HD furniture and architecture builder. 
                  Create interior designs with PBR materials and real-time lighting.
                </p>
                <div className="flex items-center gap-3 text-sm font-bold text-[#7b6fff] group-hover:gap-5 transition-all">
                  <span>OPEN BUILDER</span>
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </div>
              </div>

              {/* Card Platform Tester */}
              <div 
                className="group relative bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-[#43e97b]/50 rounded-2xl p-8 cursor-pointer transition-all duration-500"
                onClick={() => setMode('platform-tester')}
              >
                <div className="w-16 h-16 rounded-2xl bg-[#43e97b] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-[#43e97b]/20">
                  <Gamepad2 className="text-black w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-3 tracking-tight">Platform Tester 3D</h2>
                <p className="text-white/40 leading-relaxed mb-6">
                  Physics-based 3D platformer with procedural generation.
                  Test gameplay mechanics, multiplayer, and level design.
                </p>
                <div className="flex items-center gap-3 text-sm font-bold text-[#43e97b] group-hover:gap-5 transition-all">
                  <span>LAUNCH GAME</span>
                  <Play className="w-4 h-4 fill-current" />
                </div>
              </div>
            </div>

            <div className="mt-12 flex gap-4 text-xs text-white/20 font-mono z-10">
              <span className="flex items-center gap-1"><Box className="w-3 h-3" /> Three.js Engine</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Hammer className="w-3 h-3" /> Cannon-ES Physics</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Gamepad2 className="w-3 h-3" /> WebSocket Multiplayer</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-screen bg-[#060606]">
      {renderContent()}
    </div>
  );
}