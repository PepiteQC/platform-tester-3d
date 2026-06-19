// src/components/PentagonNav.tsx (visuel corrigé)
import { useState } from "react";

const MODULES = [
  { id: 'game', label: 'EtherWorld', icon: '🎮', color: '#44cc88', desc: 'Character Creator 4K — Physique + AI Render' },
  { id: 'forge', label: 'EtherForge', icon: '⚒️', color: '#ff8844', desc: 'Builder 3D interactif' },
  { id: 'prism', label: 'EtherPrism', icon: '🗄️', color: '#4488ff', desc: 'TroxtPrisma Manager' },
  { id: 'lens', label: 'EtherLens', icon: '🔬', color: '#ff4488', desc: 'Agent Console + Hub Analytique' },
  { id: 'weave', label: 'EtherWeave', icon: '🧵', color: '#dd44ff', desc: 'Textures procédurales' },
];

export function PentagonNav({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="relative w-[400px] h-[420px] flex items-center justify-center">
      {/* Cercles décoratifs avec glow */}
      {[340, 290, 240].map(s => (
        <div key={s} className="absolute w-[340px] h-[340px] rounded-full border border-cyan-500/10" style={{ width: s, height: s }} />
      ))}

      {/* Lignes du pentagone avec gradient */}
      <svg className="absolute w-[400px] h-[400px] pointer-events-none">
        <defs>
          <linearGradient id="pentagonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7b6fff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        {MODULES.map((m, i) => {
          const next = MODULES[(i + 1) % MODULES.length];
          const a1 = ((m.angleDeg - 90) * Math.PI) / 180;
          const a2 = ((next.angleDeg - 90) * Math.PI) / 180;
          const x1 = 200 + 140 * Math.cos(a1), y1 = 200 + 140 * Math.sin(a1);
          const x2 = 200 + 140 * Math.cos(a2), y2 = 200 + 140 * Math.sin(a2);
          const isHov = hovered === m.id || hovered === next.id;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isHov ? m.color : "url(#pentagonGrad)"}
              strokeWidth={isHov ? 2 : 1}
              style={{ transition: 'stroke 0.4s, stroke-width 0.4s' }} />
          );
        })}
      </svg>

      {/* Points du pentagone */}
      {MODULES.map(m => {
        const angle = ((m.angleDeg - 90) * Math.PI) / 180;
        const x = 140 * Math.cos(angle), y = 140 * Math.sin(angle);
        const isHov = hovered === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            onMouseEnter={() => setHovered(m.id)}
            onMouseLeave={() => setHovered(null)}
            className="absolute flex flex-col items-center justify-center rounded-full border-2 transition-all duration-300"
            style={{
              left: `calc(50% + ${x}px - 44px)`,
              top: `calc(50% + ${y}px - 44px)`,
              width: '88px', height: '88px',
              borderColor: isHov ? m.color : `${m.color}44`,
              background: isHov ? `${m.color}33` : 'rgba(10,12,24,0.9)',
              boxShadow: isHov ? `0 0 50px ${m.color}66, 0 0 20px ${m.color}33` : '0 4px 16px rgba(0,0,0,0.4)',
              transform: isHov ? 'scale(1.22)' : 'scale(1)',
            }}
          >
            <span className="text-3xl">{m.icon}</span>
            <span className="text-xs font-bold mt-1" style={{ color: isHov ? m.color : '#888' }}>{m.label}</span>
          </button>
        );
      })}

      {/* TroxT Avatar au centre */}
      <div className="absolute z-30">
        <TroxTAvatar3D onClick={() => onSelect('troxt')} />
      </div>

      {/* Tooltip */}
      {hovered && hovered !== 'troxt' && (
        <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 bg-black/90 border border-cyan-500/30 rounded-xl px-4 py-2 text-xs text-slate-400 whitespace-nowrap shadow-2xl">
          {MODULES.find(m => m.id === hovered)?.desc}
        </div>
      )}
    </div>
  );
}