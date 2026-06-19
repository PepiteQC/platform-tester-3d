import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TroxTShell } from "./agents/troxt/TroxTShell";
import { TroxTAgent } from "./agents/troxt/TroxTAgent";
import { useTroxT } from "./agents/troxt/TroxTContext";
import { PlatformTester3D } from "./systems/PlatformTester3D";
import { BuildingPRO } from "./systems/BuildingPRO";
import { AntiHack } from "./systems/AntiHack";
import { DevConsole } from "./systems/Console";
import { CharacterCreator } from "./systems/CharacterCreator";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
});

type View = "home" | "troxt" | "character" | "tester3d" | "building" | "antihack" | "console";

const NAV: {
  id: View;
  icon: string;
  label: string;
  color: string;
  desc: string;
}[] = [
  {
    id: "home",
    icon: "🌐",
    label: "EtherWorld",
    color: "#7b6fff",
    desc: "Accueil",
  },
  {
    id: "troxt",
    icon: "🧠",
    label: "TroxT Agent",
    color: "#44ff88",
    desc: "Cerveau IA Neural",
  },
  {
    id: "character",
    icon: "🧬",
    label: "Personnage",
    color: "#aa55ff",
    desc: "Créateur de personnage",
  },
  {
    id: "tester3d",
    icon: "🎮",
    label: "Platform 3D",
    color: "#ffaa44",
    desc: "Testeur 3D",
  },
  {
    id: "building",
    icon: "🏗️",
    label: "Building PRO",
    color: "#ff44aa",
    desc: "Éditeur RP",
  },
  {
    id: "antihack",
    icon: "🛡️",
    label: "Anti-Hack",
    color: "#ff2244",
    desc: "Sécurité",
  },
  {
    id: "console",
    icon: "⌨️",
    label: "Console",
    color: "#aaaaff",
    desc: "DevConsole",
  },
];

function WorldMetrics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [world, setWorld] = useState<any>(null);

  useEffect(() => {
    const fetch_ = () => {
      fetch("/api/admin/metrics")
        .then((r) => r.json())
        .then(setMetrics)
        .catch(() => {});
      fetch("/api/admin/world")
        .then((r) => r.json())
        .then(setWorld)
        .catch(() => {});
    };
    fetch_();
    const id = setInterval(fetch_, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {metrics && (
        <>
          <Pill
            icon="🟢"
            label="Serveur"
            value={metrics.server_status || "online"}
            color="#44ff88"
          />
          <Pill
            icon="⏱️"
            label="Uptime"
            value={metrics.uptime_formatted || "—"}
            color="#7b6fff"
          />
          <Pill
            icon="💾"
            label="RAM"
            value={`${metrics.memory?.percent ?? 0}%`}
            color="#ffaa44"
          />
          <Pill
            icon="🏗️"
            label="Plateformes"
            value={String(metrics.platform_count ?? 0)}
            color="#ff44aa"
          />
        </>
      )}
      {world && (
        <>
          <Pill
            icon="☁️"
            label="Météo"
            value={world.weather || "sunny"}
            color="#22aaff"
          />
          <Pill
            icon="🕐"
            label="Heure"
            value={`${world.time_of_day ?? 14}h`}
            color="#ffdd66"
          />
        </>
      )}
    </div>
  );
}

function Pill({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 10px",
        background: `${color}12`,
        border: `1px solid ${color}33`,
        borderRadius: "20px",
        fontSize: "11px",
      }}
    >
      <span>{icon}</span>
      <span style={{ color: "#555" }}>{label}:</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function HomeView() {
  const [world, setWorld] = useState<any>({
    weather: "sunny",
    time_of_day: 14,
  });

  useEffect(() => {
    fetch("/api/admin/world")
      .then((r) => r.json())
      .then(setWorld)
      .catch(() => {});
  }, []);

  const setWeather = async (w: string) => {
    await fetch("/api/admin/world", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weather: w }),
    });
    setWorld((s: any) => ({ ...s, weather: w }));
  };

  const WEATHERS = [
    { id: "sunny", icon: "☀️", label: "Soleil" },
    { id: "cloudy", icon: "⛅", label: "Nuageux" },
    { id: "rainy", icon: "🌧️", label: "Pluie" },
    { id: "storm", icon: "⛈️", label: "Orage" },
    { id: "snowy", icon: "❄️", label: "Neige" },
    { id: "fog", icon: "🌫️", label: "Brouillard" },
  ];

  const FEATURES = [
    {
      icon: "🧠",
      title: "TroxT Neural Agent",
      desc: "IA à mémoire épisodique, raisonnement ReAct+CoT, 12 skills, boucle autonome et introspection.",
      color: "#44ff88",
    },
    {
      icon: "🎮",
      title: "Platform Tester 3D",
      desc: "Moteur 3D complet avec physique, joueur contrôlable, plateformes dynamiques et génération procédurale.",
      color: "#ffaa44",
    },
    {
      icon: "🏗️",
      title: "Building PRO RP",
      desc: "Éditeur de maps RP avec 8 modes (Parkour, Ville, Prison, Police, Guerre, Zombie, Dragon, Espace).",
      color: "#ff44aa",
    },
    {
      icon: "🛡️",
      title: "Anti-Hack System",
      desc: "Surveillance temps réel, 10 types de violations, ban automatique, simulation et configuration avancée.",
      color: "#ff2244",
    },
    {
      icon: "⌨️",
      title: "DevConsole",
      desc: "Console de développement avec interception de logs, commandes API directes et bridge TroxT.",
      color: "#aaaaff",
    },
    {
      icon: "💾",
      title: "Saves & RP",
      desc: "Système de sauvegarde de niveaux, base joueurs RP, factions et historique anti-hack persistants.",
      color: "#7b6fff",
    },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 16px",
            background: "rgba(123,111,255,0.1)",
            border: "1px solid rgba(123,111,255,0.3)",
            borderRadius: "20px",
            marginBottom: "20px",
            fontSize: "11px",
            color: "#7b6fff",
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              background: "#44ff88",
              borderRadius: "50%",
            }}
          />
          PLATEFORME RP AVANCÉE · TESTER 3D · IA NEURALE
        </div>
        <h1
          style={{
            fontSize: "48px",
            fontWeight: 900,
            background:
              "linear-gradient(135deg, #7b6fff 0%, #44ff88 50%, #ff44aa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            margin: "0 0 12px",
          }}
        >
          EtherWorld
        </h1>
        <p
          style={{
            color: "#555",
            fontSize: "16px",
            maxWidth: "560px",
            margin: "0 auto 28px",
            lineHeight: 1.7,
          }}
        >
          Plateforme RP complète avec IA neurale TroxT, éditeur 3D Building PRO,
          anti-hack avancé et testeur de plateformes temps réel.
        </p>
        <WorldMetrics />
      </div>

      {/* Weather Quick Control */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#555",
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "12px",
          }}
        >
          ⚡ Contrôle Rapide — Météo
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {WEATHERS.map((w) => (
            <button
              key={w.id}
              onClick={() => setWeather(w.id)}
              style={{
                padding: "10px 18px",
                background:
                  world.weather === w.id
                    ? "rgba(123,111,255,0.2)"
                    : "rgba(255,255,255,0.04)",
                border: `1px solid ${world.weather === w.id ? "rgba(123,111,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "10px",
                color: world.weather === w.id ? "#7b6fff" : "#777",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "18px" }}>{w.icon}</span>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "16px",
        }}
      >
        {FEATURES.map((f) => (
          <div
            key={f.title}
            style={{
              padding: "20px",
              background: `${f.color}06`,
              border: `1px solid ${f.color}20`,
              borderRadius: "14px",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>
              {f.icon}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "14px",
                color: f.color,
                marginBottom: "8px",
              }}
            >
              {f.title}
            </div>
            <p
              style={{
                color: "#666",
                fontSize: "12px",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TroxTSendProxy({
  children,
}: {
  children: (fn: (msg: string) => void) => React.ReactNode;
}) {
  const troxt = useTroxT();
  return <>{children(troxt.sendMessage)}</>;
}

function AppContent() {
  const [view, setView] = useState<View>("home");
  const [worldState, setWorldState] = useState({
    weather: "sunny",
    timeOfDay: 14,
  });

  useEffect(() => {
    fetch("/api/admin/world")
      .then((r) => r.json())
      .then((d) =>
        setWorldState({
          weather: d.weather || "sunny",
          timeOfDay: d.time_of_day ?? 14,
        }),
      )
      .catch(() => {});
    const id = setInterval(() => {
      fetch("/api/admin/world")
        .then((r) => r.json())
        .then((d) =>
          setWorldState({
            weather: d.weather || "sunny",
            timeOfDay: d.time_of_day ?? 14,
          }),
        )
        .catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#050810",
        color: "#e8e8f0",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Top nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(5,8,16,0.98)",
          backdropFilter: "blur(20px)",
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setView(n.id)}
            title={n.desc}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "14px 18px",
              background: view === n.id ? `${n.color}12` : "transparent",
              border: "none",
              borderBottom:
                view === n.id
                  ? `2px solid ${n.color}`
                  : "2px solid transparent",
              color: view === n.id ? n.color : "#555",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 700,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              letterSpacing: "0.3px",
            }}
          >
            <span style={{ fontSize: "16px" }}>{n.icon}</span>
            <span
              style={{ display: window.innerWidth < 600 ? "none" : "inline" }}
            >
              {n.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {view === "home" && <HomeView />}
        {view === "troxt" && <TroxTAgent />}
        {view === "character" && <CharacterCreator />}
        {view === "tester3d" && (
          <PlatformTester3D
            weather={worldState.weather}
            timeOfDay={worldState.timeOfDay}
          />
        )}
        {view === "building" && <BuildingPRO />}
        {view === "antihack" && <AntiHack />}
        {view === "console" && (
          <TroxTSendProxy>
            {(sendToTroxT) => <DevConsole sendToTroxT={sendToTroxT} />}
          </TroxTSendProxy>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TroxTShell>
        <AppContent />
      </TroxTShell>
    </QueryClientProvider>
  );
}
