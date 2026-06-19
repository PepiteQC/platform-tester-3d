const state = {
  world: null,
  textures: [],
  settings: {},
  ws: null,
};

const $ = (id) => document.getElementById(id);

function token() {
  return localStorage.getItem("etherworld_admin_token") || $("adminToken").value || "";
}

function headers() {
  return {
    "Content-Type": "application/json",
    "x-admin-token": token(),
  };
}

function toast(message) {
  const box = $("toast");
  box.textContent = message;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), 2600);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }

  return data;
}

function num(id) {
  return Number($(id).value || 0);
}

function val(id) {
  return $(id).value;
}

function optionList(select, textures) {
  select.innerHTML = "";

  for (const texture of textures) {
    const opt = document.createElement("option");
    opt.value = texture.id;
    opt.textContent = `${texture.name} — ${texture.id}`;
    select.appendChild(opt);
  }
}

function render() {
  if (!state.world) return;

  $("statPlatforms").textContent = state.world.platforms.length;
  $("statProps").textContent = state.world.props.length;
  $("statTextures").textContent = state.textures.length;
  $("statPlayers").textContent = state.world.players.length;
  $("worldPreview").textContent = JSON.stringify(state.world, null, 2);

  optionList($("platformMaterial"), state.textures);
  optionList($("propMaterial"), state.textures);

  renderTextures();
  renderPlatforms();
  renderProps();
  renderLogs();
}

function renderTextures() {
  const box = $("textureList");
  box.innerHTML = "";

  for (const texture of state.textures) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="row">
        <div class="swatch" style="background:${texture.color}; box-shadow:0 0 16px ${texture.emission || "transparent"}"></div>
        <div>
          <h4>${escapeHtml(texture.name)}</h4>
          <p>${escapeHtml(texture.category)} · rough ${texture.roughness} · metal ${texture.metallic} · ${escapeHtml(texture.id)}</p>
          <p>${escapeHtml(texture.notes || "")}</p>
        </div>
      </div>
      <div class="item-actions">
        <button class="danger" data-delete-texture="${texture.id}">Delete</button>
      </div>
    `;

    box.appendChild(item);
  }

  box.querySelectorAll("[data-delete-texture]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api(`/api/poly-textures/${btn.dataset.deleteTexture}`, { method: "DELETE" });
      toast("Texture supprimée");
      await load();
    });
  });
}

function renderPlatforms() {
  const box = $("platformList");
  box.innerHTML = "";

  for (const platform of state.world.platforms) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div>
        <h4>${escapeHtml(platform.name)}</h4>
        <p>${escapeHtml(platform.type)} · ${escapeHtml(platform.material)} · pos [${platform.position.join(", ")}] · size [${platform.size.join(", ")}]</p>
        <p>${escapeHtml(platform.id)}</p>
      </div>
      <div class="item-actions">
        <button class="danger" data-delete-platform="${platform.id}" ${platform.id === "spawn_platform" ? "disabled" : ""}>Delete</button>
      </div>
    `;

    box.appendChild(item);
  }

  box.querySelectorAll("[data-delete-platform]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api(`/api/platforms/${btn.dataset.deletePlatform}`, { method: "DELETE" });
      toast("Platform supprimée");
      await load();
    });
  });
}

function renderProps() {
  const box = $("propList");
  box.innerHTML = "";

  for (const prop of state.world.props) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div>
        <h4>${escapeHtml(prop.name)}</h4>
        <p>${escapeHtml(prop.type)} · ${escapeHtml(prop.material)} · pos [${prop.position.join(", ")}] · size [${prop.size.join(", ")}]</p>
        <p>${escapeHtml(prop.id)}</p>
      </div>
      <div class="item-actions">
        <button class="danger" data-delete-prop="${prop.id}">Delete</button>
      </div>
    `;

    box.appendChild(item);
  }

  box.querySelectorAll("[data-delete-prop]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api(`/api/props/${btn.dataset.deleteProp}`, { method: "DELETE" });
      toast("Prop supprimé");
      await load();
    });
  });
}

function renderLogs() {
  const box = $("logList");
  box.innerHTML = "";

  for (const log of state.world.logs || []) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div>
        <h4>${escapeHtml(log.action)}</h4>
        <p>${escapeHtml(log.at)} · ${escapeHtml(log.id)}</p>
        <p>${escapeHtml(JSON.stringify(log.detail || {}))}</p>
      </div>
    `;

    box.appendChild(item);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function load() {
  const data = await api("/api/world-state");
  state.world = data.world;
  state.textures = data.textures;
  state.settings = data.settings;
  render();
}

function connectWs() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}`);

  state.ws = ws;

  ws.addEventListener("open", () => {
    $("wsLight").classList.add("on");
    $("serverStatus").textContent = "Live";
  });

  ws.addEventListener("close", () => {
    $("wsLight").classList.remove("on");
    $("serverStatus").textContent = "Déconnecté";
    setTimeout(connectWs, 1300);
  });

  ws.addEventListener("message", async (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    if (
      data.type === "platform_created" ||
      data.type === "platform_deleted" ||
      data.type === "platform_updated" ||
      data.type === "prop_created" ||
      data.type === "prop_deleted" ||
      data.type === "texture_created" ||
      data.type === "texture_deleted" ||
      data.type === "world_reset" ||
      data.type === "world_saved"
    ) {
      await load();
    }
  });
}

function bindTabs() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));

      btn.classList.add("active");
      $(btn.dataset.tab).classList.add("active");
      $("pageTitle").textContent = btn.textContent;
    });
  });
}

function bindActions() {
  $("adminToken").value = localStorage.getItem("etherworld_admin_token") || "";

  $("saveToken").addEventListener("click", () => {
    localStorage.setItem("etherworld_admin_token", $("adminToken").value);
    toast("Token sauvegardé");
  });

  $("refreshBtn").addEventListener("click", async () => {
    await load();
    toast("Refresh OK");
  });

  $("saveWorldBtn").addEventListener("click", async () => {
    await api("/api/world-state/save", { method: "POST", body: "{}" });
    toast("World sauvegardé");
    await load();
  });

  $("exportWorldBtn").addEventListener("click", async () => {
    const result = await api("/api/admin/export", { method: "POST", body: "{}" });
    toast(`Export créé : ${result.filename}`);
  });

  $("resetWorldBtn").addEventListener("click", async () => {
    if (!confirm("Reset complet du monde test?")) return;
    await api("/api/world-state/reset", { method: "POST", body: "{}" });
    toast("World reset");
    await load();
  });

  $("createTextureBtn").addEventListener("click", async () => {
    await api("/api/poly-textures", {
      method: "POST",
      body: JSON.stringify({
        name: val("texName") || "Poly Texture",
        category: val("texCategory") || "custom",
        color: val("texColor"),
        emission: val("texEmission"),
        roughness: num("texRoughness"),
        metallic: num("texMetallic"),
        normal: num("texNormal"),
        ao: num("texAo"),
        notes: val("texNotes"),
      }),
    });

    toast("Texture créée");
    await load();
  });

  $("createPlatformBtn").addEventListener("click", async () => {
    await api("/api/platforms", {
      method: "POST",
      body: JSON.stringify({
        name: val("platformName") || "Platform",
        type: val("platformType") || "custom",
        color: val("platformColor"),
        material: val("platformMaterial"),
        position: [num("platformX"), num("platformY"), num("platformZ")],
        size: [num("platformSX"), num("platformSY"), num("platformSZ")],
      }),
    });

    toast("Platform créée");
    await load();
  });

  $("createPropBtn").addEventListener("click", async () => {
    await api("/api/props", {
      method: "POST",
      body: JSON.stringify({
        name: val("propName") || "Prop",
        type: val("propType") || "cube",
        color: val("propColor"),
        material: val("propMaterial"),
        position: [num("propX"), num("propY"), num("propZ")],
        size: [num("propSX"), num("propSY"), num("propSZ")],
      }),
    });

    toast("Prop créé");
    await load();
  });

  document.querySelectorAll(".preset").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api("/api/admin/spawn-preset", {
        method: "POST",
        body: JSON.stringify({
          preset: btn.dataset.preset,
          position: [num("spawnX"), num("spawnY"), num("spawnZ")],
        }),
      });

      toast(`Spawn ${btn.dataset.preset}`);
      await load();
    });
  });
}

async function start() {
  bindTabs();
  bindActions();
  connectWs();

  try {
    await load();
    toast("Admin prêt");
  } catch (error) {
    toast(error.message);
    console.error(error);
  }
}

start();
