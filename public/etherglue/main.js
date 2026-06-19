// ============================================================
//  EtherGlue — Platform Tester Integration Entry v2.0
//  Se branche sur window.game apres son initialisation
// ============================================================

import { Game as EtherGlueGame } from "./Game.js";
import { ConstructionPackPlugin }  from "./plugins/ConstructionPack.js";
import { UltimatePropsPackPlugin } from "./plugins/UltimatePropsPack.js";

const MAX_TRIES = 120;
const POLL_MS   = 250;

let tries = 0;
let timer = null;

// ── Attendre que window.game soit dispo ───────────────────────
function waitForGame() {
  timer = setInterval(() => {
    tries++;

    if (window.game && window.game.scene && window.game.renderer) {
      clearInterval(timer);
      initEtherGlue(window.game);
      return;
    }

    if (tries >= MAX_TRIES) {
      clearInterval(timer);
      console.warn("[EtherGlue] window.game non trouvé après", MAX_TRIES * POLL_MS, "ms — abandon");
    }
  }, POLL_MS);
}

// ── Init EtherGlue ────────────────────────────────────────────
function initEtherGlue(sourceGame) {
  console.log("[EtherGlue] Branchement sur window.game...");

  const glue = new EtherGlueGame({ sourceGame });

  // Plugins
  glue.plugins.register(new ConstructionPackPlugin());
  glue.plugins.register(new UltimatePropsPackPlugin());

  // Initialisation
  glue.init();

  // Exposer globalement
  window.etherGlue = glue;
  window.EtherWorldAdminBridge = createAdminBridge(glue);

  // Notification dans le jeu
  if (typeof sourceGame.notify === "function") {
    sourceGame.notify("⚙ EtherGlue chargé — PhysicsGun actif !", "success");
  }

  // Touche G pour ouvrir le menu EtherGlue
  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyG" && !e.ctrlKey && !e.altKey) {
      const chatActive = document.getElementById("chat-input")?.classList.contains("active");
      if (chatActive) return;
      glue.ui.toggle();
    }
  });

  console.log("[EtherGlue] Initialisé — version", glue.version);
  console.log("[EtherGlue] Tools:", glue.tools.list?.() ?? "OK");
  console.log("[EtherGlue] Props:", glue.propFactory.list?.()?.length ?? "OK", "types");
}

// ── Bridge Admin ──────────────────────────────────────────────
function createAdminBridge(glue) {
  return {
    version: "2.0",
    __etherGluePatched: true,

    execute(command, payload = {}) {
      const text  = String(command || "").trim();
      const first = text.split(/\s+/)[0]?.toLowerCase();

      if (["glue", "etherglue", "gmod"].includes(first)) {
        return executeGlueCommand(glue, text, payload);
      }
      return null;
    },

    spawnProp(type, position, options = {}) {
      return glue.propFactory.spawn(type, { position, ...options });
    },

    getStatus() {
      return glue.status?.() ?? { ok: true };
    },

    listProps() {
      return glue.propFactory.list?.() ?? [];
    },

    listTools() {
      return glue.tools.list?.() ?? [];
    },

    etherGlue: glue,
  };
}

function executeGlueCommand(glue, command, payload = {}) {
  const parts  = command.split(/\s+/).filter(Boolean);
  const action = (parts[1] || "status").toLowerCase();

  if (action === "status") return { success: true, status: glue.status?.() };
  if (action === "props")  return { success: true, props:  glue.propFactory.list?.() };
  if (action === "tools")  return { success: true, tools:  glue.tools.list?.() };
  if (action === "toggle") { glue.ui.toggle(); return { success: true }; }

  return { success: false, error: `Commande inconnue: ${action}` };
}

// ── Démarrer ──────────────────────────────────────────────────
waitForGame();
