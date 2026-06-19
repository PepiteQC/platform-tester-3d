// ════════════════════════════════════════════════════════════
//  TroxTEngine.mjs — Cerveau TroxT ESMpur, côté serveur
//  Branché sur Express + WebSocket EtherWorld
//  Pas de TypeScript, pas de localStorage
// ════════════════════════════════════════════════════════════
import crypto from "node:crypto";

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID().slice(0, 8);

// ── Mémoire épisodique in-process ────────────────────────────
class EpisodicMemory {
  #episodes = [];
  #max = 200;

  record({ type, source, content, importance = 0.5 }) {
    const ep = { id: uid(), type, source, content, importance, at: Date.now() };
    this.#episodes.unshift(ep);
    if (this.#episodes.length > this.#max) this.#episodes.length = this.#max;
    return ep.id;
  }

  search(query, limit = 5) {
    const q = query.toLowerCase();
    return this.#episodes
      .filter(e => e.content.toLowerCase().includes(q))
      .slice(0, limit);
  }

  recent(limit = 10) {
    return this.#episodes.slice(0, limit);
  }

  all() { return [...this.#episodes]; }
}

// ── Skills EtherWorld ─────────────────────────────────────────
function buildWorldSkills(worldRef, broadcast) {
  return {

    // Spawner un prop dans le monde
    spawn_prop: {
      description: "Spawner un objet dans le monde 3D",
      params: ["type", "name", "position", "color"],
      dangerous: false,
      handler: async ({ type = "cube", name = "TroxT Prop", position = [0,2,0], color = "#00e5ff" }) => {
        const prop = {
          id:        `prop_troxt_${uid()}`,
          name,
          type,
          position,
          rotation:  [0,0,0],
          size:      [1,1,1],
          color,
          material:  "poly_neon_cyan",
          interactive: false,
          locked:    false,
          metadata:  { spawnedBy: "troxt" },
          createdAt: now(),
          updatedAt: now(),
        };
        worldRef.props.push(prop);
        broadcast({ type: "prop_created", prop, source: "troxt" });
        return { ok: true, summary: `Prop "${name}" spawné en [${position.join(",")}]`, prop };
      }
    },

    // Créer une platform
    create_platform: {
      description: "Créer une nouvelle plateforme dans le monde",
      params: ["name", "position", "size", "color", "material"],
      dangerous: false,
      handler: async ({ name = "TroxT Platform", position = [0,0,-10], size = [4,0.5,4], color = "#2d3748", material = "poly_concrete_sidewalk" }) => {
        const platform = {
          id:       `platform_troxt_${uid()}`,
          name,
          type:     "platform",
          position,
          rotation: [0,0,0],
          size,
          color,
          material,
          safe:     false,
          locked:   false,
          createdAt: now(),
          updatedAt: now(),
        };
        worldRef.platforms.push(platform);
        broadcast({ type: "platform_created", platform, source: "troxt" });
        return { ok: true, summary: `Platform "${name}" créée`, platform };
      }
    },

    // Envoyer un message chat à tous les joueurs
    broadcast_chat: {
      description: "Envoyer un message chat à tous les joueurs connectés",
      params: ["message"],
      dangerous: false,
      handler: async ({ message = "Salut !" }) => {
        broadcast({ type: "chat", playerId: "troxt", name: "🤖 TroxT", message, at: now() });
        return { ok: true, summary: `Message broadcasté : "${message}"` };
      }
    },

    // État du monde
    get_world_state: {
      description: "Obtenir l'état actuel du monde (platforms, props, joueurs)",
      params: [],
      dangerous: false,
      handler: async () => {
        return {
          ok: true,
          summary: `${worldRef.platforms.length} platforms, ${worldRef.props.length} props, ${Object.keys(worldRef.players).length} joueurs`,
          detail: {
            platforms: worldRef.platforms.length,
            props:     worldRef.props.length,
            players:   Object.keys(worldRef.players).length,
            name:      worldRef.name,
            version:   worldRef.version,
          }
        };
      }
    },

    // Créer un snapshot
    create_snapshot: {
      description: "Créer un snapshot du monde",
      params: [],
      dangerous: false,
      handler: async () => {
        worldRef.updatedAt = now();
        return { ok: true, summary: "Snapshot créé", at: now() };
      }
    },

    // Téléporter un joueur
    teleport_player: {
      description: "Téléporter un joueur à une position",
      params: ["playerId", "position"],
      dangerous: false,
      handler: async ({ playerId, position = [0,5,0] }) => {
        const player = worldRef.players[playerId];
        if (!player) return { ok: false, summary: `Joueur ${playerId} non trouvé` };
        player.position = position;
        broadcast({ type: "teleport", playerId, position });
        return { ok: true, summary: `Joueur ${player.name} téléporté en [${position.join(",")}]` };
      }
    },

    // Lister les joueurs
    list_players: {
      description: "Lister les joueurs connectés",
      params: [],
      dangerous: false,
      handler: async () => {
        const players = Object.values(worldRef.players);
        return {
          ok: true,
          summary: `${players.length} joueur(s) en ligne`,
          detail: players.map(p => ({ id: p.id, name: p.name, position: p.position }))
        };
      }
    },

    // Reset du monde
    reset_world: {
      description: "Réinitialiser le monde à l'état par défaut",
      params: [],
      dangerous: true,
      handler: async () => {
        broadcast({ type: "world_reset", source: "troxt" });
        return { ok: true, summary: "Signal de reset envoyé" };
      }
    },

    // Nettoyer les props TroxT
    cleanup_troxt_props: {
      description: "Supprimer tous les props créés par TroxT",
      params: [],
      dangerous: true,
      handler: async () => {
        const before = worldRef.props.length;
        worldRef.props = worldRef.props.filter(p => p.metadata?.spawnedBy !== "troxt");
        const removed = before - worldRef.props.length;
        broadcast({ type: "world_saved", source: "troxt" });
        return { ok: true, summary: `${removed} props TroxT supprimés` };
      }
    },

    // Générer un monde procédural
    generate_world: {
      description: "Générer un monde procédural (tower/parkour/island/maze/spiral)",
      params: ["style", "theme", "seed", "count"],
      dangerous: true,
      handler: async ({ style = "tower", theme = "urban", seed, count = 20 }) => {
        const s = seed ?? Math.floor(Math.random() * 999999);
        const res = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/world/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seed: s, theme, style, count }),
        });
        const data = await res.json();
        return {
          ok: data.ok,
          summary: data.ok
            ? `Monde "${style}/${theme}" généré — ${data.platforms} platforms, seed ${s}`
            : `Erreur: ${data.error}`,
        };
      }
    },

    // Aide
    help: {
      description: "Afficher les skills disponibles",
      params: [],
      dangerous: false,
      handler: async (_, ctx) => {
        const list = Object.entries(ctx.skills)
          .map(([id, s]) => `• ${id} — ${s.description}`)
          .join("\n");
        return { ok: true, summary: "Skills disponibles :\n" + list };
      }
    },
  };
}

// ── Parsing d'intention naturelle ─────────────────────────────
function parseIntent(text) {
  const t = text.toLowerCase().trim();

  // Spawn prop
  if (t.match(/spawn|créer|crée|add|ajouter/) && t.match(/prop|cube|objet|box/)) {
    const colorM = t.match(/#[0-9a-f]{6}|rouge|bleu|vert|cyan|blanc|noir/);
    const color = colorM ? (colorM[0].startsWith("#") ? colorM[0] : { rouge:"#ff4444", bleu:"#4488ff", vert:"#44ff88", cyan:"#00e5ff", blanc:"#ffffff", noir:"#111111" }[colorM[0]]) : "#00e5ff";
    return { skill: "spawn_prop", params: { color, name: "TroxT Prop", position: [0, 2, 0] } };
  }

  // Platform
  if (t.match(/platform|plateforme|floor|sol/)) {
    return { skill: "create_platform", params: { name: "TroxT Platform" } };
  }

  // Chat / message
  if (t.match(/dis|envoie|broadcast|message|chat|annonce/)) {
    const quotedM = text.match(/["«](.+?)["»]/);
    const msg = quotedM ? quotedM[1] : text.replace(/^.*(dis|envoie|broadcast|message|chat|annonce)\s*/i, "").trim() || "Bonjour depuis TroxT !";
    return { skill: "broadcast_chat", params: { message: msg } };
  }

  // État du monde
  if (t.match(/état|etat|world|monde|status|info/)) {
    return { skill: "get_world_state", params: {} };
  }

  // Joueurs
  if (t.match(/joueurs?|players?|liste|list|online|connecté/)) {
    return { skill: "list_players", params: {} };
  }

  // Snapshot
  if (t.match(/snapshot|backup|sauvegarde/)) {
    return { skill: "create_snapshot", params: {} };
  }

  // Reset
  if (t.match(/reset|réinitialise|reinitialise/)) {
    return { skill: "reset_world", params: {} };
  }

  // Cleanup
  if (t.match(/cleanup|nettoie|supprime.*troxt|clear/)) {
    return { skill: "cleanup_troxt_props", params: {} };
  }

  // Aide
  if (t.match(/aide|help|skills?|capacité|que.*peux/)) {
    return { skill: "help", params: {} };
  }

  return null;
}

// ── Cerveau principal ─────────────────────────────────────────
export class TroxTEngine {
  #memory   = new EpisodicMemory();
  #skills   = {};
  #world    = null;
  #broadcast = null;
  #state = {
    online:          false,
    consciousnessLv: 7,
    cognitiveLoad:   0,
    totalRequests:   0,
    totalActions:    0,
    startedAt:       now(),
  };

  init(worldRef, broadcastFn) {
    this.#world     = worldRef;
    this.#broadcast = broadcastFn;
    this.#skills    = buildWorldSkills(worldRef, broadcastFn);
    this.#state.online = true;

    console.log("[TroxT] Engine initialisé — " + Object.keys(this.#skills).length + " skills chargés");

    // Annonce de démarrage
    setTimeout(() => {
      this.#broadcast({
        type:    "chat",
        playerId: "troxt",
        name:    "🤖 TroxT",
        message: "Je suis en ligne ! Dis-moi ce que tu veux construire.",
        at:      now(),
      });
    }, 2000);
  }

  // Traiter un message texte entrant
  async process(text, playerId = "anonymous") {
    this.#state.totalRequests++;
    this.#state.cognitiveLoad = Math.min(100, this.#state.cognitiveLoad + 15);

    // Mémoriser la requête
    this.#memory.record({
      type:       "user_input",
      source:     playerId,
      content:    text,
      importance: 0.7,
    });

    // Parser l'intention
    const intent = parseIntent(text);

    let response;

    if (intent && this.#skills[intent.skill]) {
      const skill = this.#skills[intent.skill];
      this.#state.totalActions++;

      try {
        const result = await skill.handler(intent.params, { skills: this.#skills });
        response = {
          ok:      true,
          skill:   intent.skill,
          summary: result.summary,
          detail:  result.detail ?? result.prop ?? result.platform ?? null,
        };

        // Mémoriser le succès
        this.#memory.record({
          type:       "action_result",
          source:     "troxt",
          content:    `[${intent.skill}] ${result.summary}`,
          importance: 0.8,
        });

      } catch (err) {
        response = { ok: false, skill: intent.skill, error: err.message };
      }

    } else {
      // Pas de skill matché → réponse conversationnelle
      const suggestions = this.#suggestFromMemory(text);
      response = {
        ok:       true,
        skill:    "chat",
        summary:  this.#generateResponse(text, suggestions),
        detail:   null,
      };
    }

    this.#state.cognitiveLoad = Math.max(0, this.#state.cognitiveLoad - 15);
    return response;
  }

  // Réponse conversationnelle
  #generateResponse(text, suggestions) {
    const recentCount = this.#memory.recent(3).length;
    const playerCount = this.#world ? Object.keys(this.#world.players).length : 0;

    const responses = [
      `Je t'entends, ${text.length > 20 ? "mais sois plus précis" : "dis-moi quoi faire"}. Essaie: "spawn un cube", "dis bonjour", "état du monde".`,
      `Hmm, je n'ai pas compris l'action. Il y a ${playerCount} joueur(s) en ligne. Que veux-tu faire ?`,
      `Je peux spawner des props, créer des platforms, envoyer des messages, lister les joueurs. Que veux-tu ?`,
      `Contexte: ${recentCount} actions récentes en mémoire. Dis-moi une action claire !`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Suggestions depuis mémoire
  #suggestFromMemory(query) {
    return this.#memory.search(query, 3).map(e => e.content);
  }

  // Exécuter un skill directement par ID
  async runSkill(skillId, params = {}) {
    const skill = this.#skills[skillId];
    if (!skill) return { ok: false, error: `Skill inconnu: ${skillId}` };
    try {
      const result = await skill.handler(params, { skills: this.#skills });
      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  getState() {
    return {
      ...this.#state,
      skillCount:   Object.keys(this.#skills).length,
      memorySize:   this.#memory.all().length,
      recentMemory: this.#memory.recent(5),
    };
  }

  listSkills() {
    return Object.entries(this.#skills).map(([id, s]) => ({
      id,
      description: s.description,
      params:      s.params,
      dangerous:   s.dangerous,
    }));
  }

  getMemory(limit = 20) {
    return this.#memory.recent(limit);
  }
}

export const troxtEngine = new TroxTEngine();
export default troxtEngine;

