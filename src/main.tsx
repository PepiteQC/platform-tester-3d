import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary"; // Nécessite: npm install react-error-boundary
import App from "./App";
import "./index.css";

// ─── 1. GESTIONNAIRE DE CRASH (FALLBACK UI) ──────────────────────────────────
// Si le jeu ou le moteur 3D plante, cette interface s'affichera au lieu d'un écran blanc.
const GameCrashFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div style={{ padding: "20px", color: "white", backgroundColor: "#1a202c", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <h2 style={{ color: "#fc8181" }}>⚠️ EtherWorld a rencontré une erreur critique</h2>
      <pre style={{ background: "#2d3748", padding: "15px", borderRadius: "8px", maxWidth: "80%", overflow: "auto" }}>
        {error.message}
      </pre>
      <button 
        onClick={resetErrorBoundary}
        style={{ marginTop: "20px", padding: "10px 20px", background: "#3182ce", border: "none", color: "white", cursor: "pointer", borderRadius: "5px" }}
      >
        Redémarrer le client
      </button>
    </div>
  );
};

// ─── 2. ÉCRAN DE CHARGEMENT GLOBAL ───────────────────────────────────────────
// S'affiche pendant le chargement des gros composants (comme le moteur Three.js)
const GlobalLoader = () => (
  <div style={{ height: "100vh", width: "100vw", display: "flex", justifyContent: "center", alignItems: "center", background: "#0a0e1a", color: "#00e5ff", fontFamily: "monospace" }}>
    Initialisation de l'univers 3D...
  </div>
);

// ─── 3. INITIALISATION ROBUSTE ───────────────────────────────────────────────
const rootElement = document.getElementById("root");

// Sécurité : On s'assure que le DOM est bien prêt avant de lancer React
if (!rootElement) {
  throw new Error("Erreur fatale : Impossible de trouver l'élément HTML '#root'. L'application ne peut pas démarrer.");
}

const root = createRoot(rootElement);

root.render(
  // StrictMode aide à détecter les bugs de cycle de vie et les fuites de mémoire en dev
  <React.StrictMode>
    {/* Bouclier anti-crash : Empêche toute l'application de mourir si un composant échoue */}
    <ErrorBoundary FallbackComponent={GameCrashFallback} onReset={() => window.location.reload()}>
      {/* Suspense : Gère le chargement asynchrone des assets lourds du jeu */}
      <Suspense fallback={<GlobalLoader />}>
        {/* C'est ici que tu pourras ajouter tes Providers plus tard (ex: <SocketProvider>, <ThemeProvider>) */}
        <App />
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);