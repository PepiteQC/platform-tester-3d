// ============================================================
//  TroxT — EtherWorld Landing Page
// ============================================================

// ── PARTICLES ────────────────────────────────────────────────
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
resize();
window.addEventListener('resize', () => { resize(); initP(); });

const COUNT = 70;
let pts = [];
function initP() {
  pts = Array.from({ length: COUNT }, () => ({
    x: Math.random()*canvas.width, y: Math.random()*canvas.height,
    vx: (Math.random()-.5)*.35, vy: (Math.random()-.5)*.35,
    r: Math.random()*1.8+.4, a: Math.random()*.5+.2,
    c: Math.random()>.5 ? '123,111,255' : '0,212,255'
  }));
}
initP();

function drawP() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pts.length; i++)
    for (let j = i+1; j < pts.length; j++) {
      const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.sqrt(dx*dx+dy*dy);
      if (d<130) { ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.strokeStyle=`rgba(123,111,255,${.07*(1-d/130)})`; ctx.lineWidth=.5; ctx.stroke(); }
    }
  pts.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(${p.c},${p.a})`; ctx.fill();
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3); g.addColorStop(0,`rgba(${p.c},.08)`); g.addColorStop(1,'transparent');
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r*3,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
    p.x+=p.vx; p.y+=p.vy;
    if(p.x<0)p.x=canvas.width; if(p.x>canvas.width)p.x=0;
    if(p.y<0)p.y=canvas.height; if(p.y>canvas.height)p.y=0;
  });
  requestAnimationFrame(drawP);
}
drawP();

// ── MODULE CARDS ─────────────────────────────────────────────
document.querySelectorAll('.mod-card').forEach(card => {
  const color = card.dataset.color;
  if (!color) return;
  const name = card.querySelector('.mod-name');
  if (name) name.style.color = color;
  card.addEventListener('mouseenter', () => { card.style.borderColor=color+'44'; card.style.boxShadow=`0 16px 48px ${color}22`; });
  card.addEventListener('mouseleave', () => { card.style.borderColor=''; card.style.boxShadow=''; });
});

// ── SCROLL ANIMATIONS ────────────────────────────────────────
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
}, { threshold:.1, rootMargin:'0px 0px -50px 0px' });

document.querySelectorAll('.card,.mod-card,.arch-node,.arch-core,.s-label,.s-title,.s-desc,.cta-title,.cta-desc').forEach((el,i) => {
  el.style.cssText += `opacity:0;transform:translateY(24px);transition:opacity .55s ease ${i*.05}s,transform .55s ease ${i*.05}s;`;
  obs.observe(el);
});
const vs = document.createElement('style');
vs.textContent = '.vis{opacity:1!important;transform:translateY(0)!important}';
document.head.appendChild(vs);

// ── NAV SCROLL ───────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.querySelector('.nav').style.background = scrollY>40 ? 'rgba(5,8,16,.97)' : 'rgba(5,8,16,.85)';
});

// ── PARALLAX ─────────────────────────────────────────────────
const hv = document.querySelector('.hero-visual');
if (hv) document.addEventListener('mousemove', e => {
  hv.style.transform = `translate(${(e.clientX/innerWidth-.5)*14}px,${(e.clientY/innerHeight-.5)*14}px)`;
});

// ── TERMINAL REPLAY ──────────────────────────────────────────
const term = document.querySelector('.terminal');
if (term) new IntersectionObserver(e => {
  if (e[0].isIntersecting) term.querySelectorAll('.tl').forEach(l => { l.style.animation='none'; l.offsetHeight; l.style.animation=''; });
}, { threshold:.6 }).observe(term);


// ════════════════════════════════════════════════════════════
//  ETHERPRISM — RP DATABASE ADMIN
// ════════════════════════════════════════════════════════════

let prismCurrentTable = null;
let prismTables = [];

function esc(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

// ── LOAD STATS ───────────────────────────────────────────────
async function prismLoadStats() {
  try {
    const data = await (await fetch('/api/prism-admin/stats')).json();
    document.getElementById('prism-db-status').textContent   = 'online';
    document.getElementById('prism-table-count').textContent = data.table_count;
    document.getElementById('prism-row-count').textContent   = data.total_rows;
    document.getElementById('prism-query-count').textContent = data.meta?.total_queries ?? 0;
    document.querySelector('.prism-status-dot').className     = 'prism-status-dot online';
    prismTables = data.tables;
    prismRenderTabs();
  } catch {
    document.getElementById('prism-db-status').textContent = 'offline';
    document.querySelector('.prism-status-dot').className   = 'prism-status-dot offline';
  }
}

// ── RENDER TABS ──────────────────────────────────────────────
function prismRenderTabs() {
  const container = document.getElementById('prism-table-tabs');
  if (prismTables.length === 0) {
    container.innerHTML = '<span class="prism-tabs-loading">No tables — click "Seed Database"</span>';
    return;
  }
  const icons = { players:'👤', vehicles:'🚗', houses:'🏠', shops:'🏪', jobs:'💼', inventory:'🎒', factions:'⚔️', bank_accounts:'💰' };
  container.innerHTML = prismTables.map(t => `
    <button class="prism-tab ${t.name===prismCurrentTable?'active':''}" data-table="${t.name}">
      ${icons[t.name]||'📋'} ${t.name} <span class="tab-count">${t.rows}</span>
    </button>
  `).join('');

  container.querySelectorAll('.prism-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      prismCurrentTable = tab.dataset.table;
      prismRenderTabs();
      prismLoadTable(tab.dataset.table);
    });
  });

  if (!prismCurrentTable && prismTables.length > 0) {
    prismCurrentTable = prismTables[0].name;
    prismRenderTabs();
    prismLoadTable(prismCurrentTable);
  }
}

// ── LOAD TABLE ───────────────────────────────────────────────
async function prismLoadTable(tableName) {
  const area = document.getElementById('prism-table-area');
  try {
    const data = await (await fetch(`/api/prism/${tableName}`)).json();
    const rows = data.rows;
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

    let html = `
      <div class="prism-table-toolbar">
        <h3>${tableName} <span style="color:var(--dim);font-weight:400;font-size:13px">(${rows.length} rows)</span></h3>
        <div class="prism-table-toolbar-actions">
          <button class="prism-admin-btn create small" onclick="prismOpenInsert('${tableName}')">➕ Insert</button>
          <button class="prism-admin-btn danger small" onclick="prismTruncate('${tableName}')">🗑️ Truncate</button>
          <button class="prism-admin-btn danger small" onclick="prismDropTable('${tableName}')">💥 Drop</button>
        </div>
      </div>`;

    if (rows.length === 0) {
      html += '<div class="prism-empty">Table is empty — click Insert to add rows</div>';
    } else {
      html += `<div class="prism-table-scroll"><table class="prism-table">
        <thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}<th>Actions</th></tr></thead>
        <tbody>${rows.map(row => `<tr>
          ${cols.map(c => {
            let v = row[c];
            if (v===null||v===undefined) v='<span style="color:#555">null</span>';
            else if (typeof v==='object') v=JSON.stringify(v).slice(0,40);
            else v=esc(String(v));
            return `<td>${v}</td>`;
          }).join('')}
          <td class="prism-row-actions">
            <button class="prism-row-btn" onclick="prismOpenEdit('${tableName}',${row.id})">✏️</button>
            <button class="prism-row-btn del" onclick="prismDeleteRow('${tableName}',${row.id})">🗑️</button>
          </td>
        </tr>`).join('')}</tbody></table></div>`;
    }
    area.innerHTML = html;
  } catch {
    area.innerHTML = '<div class="prism-empty">Failed to load table</div>';
  }
}

// ── SEED ─────────────────────────────────────────────────────
document.getElementById('btn-seed').addEventListener('click', async () => {
  await fetch('/api/prism-admin/seed', { method:'POST' });
  await prismLoadStats();
  if (prismCurrentTable) prismLoadTable(prismCurrentTable);
});

// ── REFRESH ──────────────────────────────────────────────────
document.getElementById('btn-refresh-prism').addEventListener('click', async () => {
  await prismLoadStats();
  if (prismCurrentTable) prismLoadTable(prismCurrentTable);
});

// ── CREATE TABLE ─────────────────────────────────────────────
document.getElementById('btn-create-table').addEventListener('click', () => {
  document.getElementById('modal-create-table').classList.remove('hidden');
  document.getElementById('new-table-name').value = '';
  document.getElementById('new-table-name').focus();
});

document.getElementById('cancel-create-table').addEventListener('click', () => {
  document.getElementById('modal-create-table').classList.add('hidden');
});

document.getElementById('confirm-create-table').addEventListener('click', async () => {
  const name = document.getElementById('new-table-name').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'_');
  if (!name) return;
  await fetch('/api/prism-admin/create-table', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name })
  });
  document.getElementById('modal-create-table').classList.add('hidden');
  prismCurrentTable = name;
  await prismLoadStats();
  prismLoadTable(name);
});

// ── TRUNCATE ─────────────────────────────────────────────────
window.prismTruncate = async function(table) {
  if (!confirm(`TRUNCATE "${table}"? All rows will be deleted.`)) return;
  await fetch(`/api/prism-admin/truncate/${table}`, { method:'POST' });
  await prismLoadStats();
  prismLoadTable(table);
};

// ── DROP TABLE ───────────────────────────────────────────────
window.prismDropTable = async function(table) {
  if (!confirm(`DROP TABLE "${table}"? This cannot be undone!`)) return;
  await fetch(`/api/prism-admin/drop-table/${table}`, { method:'DELETE' });
  prismCurrentTable = null;
  await prismLoadStats();
  document.getElementById('prism-table-area').innerHTML = '<div class="prism-empty">Table dropped</div>';
};

// ── DELETE ROW ───────────────────────────────────────────────
window.prismDeleteRow = async function(table, id) {
  if (!confirm(`Delete row #${id}?`)) return;
  await fetch(`/api/prism/${table}/${id}`, { method:'DELETE' });
  await prismLoadStats();
  prismLoadTable(table);
};

// ── INSERT ROW ───────────────────────────────────────────────
window.prismOpenInsert = function(table) {
  document.getElementById('insert-table-name').textContent = table;
  const fieldsDiv = document.getElementById('insert-fields');
  const t = prismTables.find(x => x.name === table);
  const cols = (t?.columns || []).filter(c => c!=='id' && c!=='created_at' && c!=='updated_at');

  if (cols.length === 0) {
    fieldsDiv.innerHTML = `
      <div class="insert-custom-row" style="display:flex;gap:8px;margin-bottom:8px">
        <input type="text" class="insert-key" placeholder="field name" style="flex:1">
        <input type="text" class="insert-val" placeholder="value" style="flex:1">
      </div>
      <button class="prism-admin-btn small" onclick="prismAddInsertField()">+ Add Field</button>
    `;
  } else {
    fieldsDiv.innerHTML = cols.map(c =>
      `<label>${c}:<input type="text" class="insert-field" data-col="${c}" placeholder="${c}"></label>`
    ).join('');
  }
  document.getElementById('modal-insert-row').classList.remove('hidden');
};

window.prismAddInsertField = function() {
  const div = document.getElementById('insert-fields');
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px';
  row.innerHTML = '<input type="text" class="insert-key" placeholder="field name" style="flex:1"><input type="text" class="insert-val" placeholder="value" style="flex:1">';
  const addBtn = div.querySelector('.prism-admin-btn');
  if (addBtn) div.insertBefore(row, addBtn);
  else div.appendChild(row);
};

document.getElementById('cancel-insert').addEventListener('click', () => {
  document.getElementById('modal-insert-row').classList.add('hidden');
});

document.getElementById('confirm-insert').addEventListener('click', async () => {
  const table = document.getElementById('insert-table-name').textContent;
  const body = {};

  document.querySelectorAll('.insert-field').forEach(inp => {
    if (inp.value.trim()) body[inp.dataset.col] = inp.value.trim();
  });

  const keys = document.querySelectorAll('.insert-key');
  const vals = document.querySelectorAll('.insert-val');
  keys.forEach((k, i) => {
    if (k.value.trim() && vals[i]?.value.trim()) body[k.value.trim()] = vals[i].value.trim();
  });

  if (Object.keys(body).length === 0) return;

  await fetch(`/api/prism/${table}`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  document.getElementById('modal-insert-row').classList.add('hidden');
  await prismLoadStats();
  prismLoadTable(table);
});

// ── EDIT ROW ─────────────────────────────────────────────────
window.prismOpenEdit = async function(table, id) {
  const data = await (await fetch(`/api/prism/${table}/${id}`)).json();
  const row = data.row;
  const cols = Object.keys(row).filter(c => c!=='id' && c!=='created_at' && c!=='updated_at');

  document.getElementById('edit-table-name').textContent = table;
  document.getElementById('edit-row-id').textContent = `#${id}`;
  document.getElementById('edit-fields').innerHTML = cols.map(c =>
    `<label>${c}:<input type="text" class="edit-field" data-col="${c}" value="${row[c]!=null ? row[c] : ''}"></label>`
  ).join('');

  const modal = document.getElementById('modal-edit-row');
  modal.dataset.table = table;
  modal.dataset.id = id;
  modal.classList.remove('hidden');
};

document.getElementById('cancel-edit').addEventListener('click', () => {
  document.getElementById('modal-edit-row').classList.add('hidden');
});

document.getElementById('confirm-edit').addEventListener('click', async () => {
  const modal = document.getElementById('modal-edit-row');
  const table = modal.dataset.table;
  const id = modal.dataset.id;
  const body = {};

  document.querySelectorAll('.edit-field').forEach(inp => {
    body[inp.dataset.col] = inp.value;
  });

  await fetch(`/api/prism/${table}/${id}`, {
    method:'PUT', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  modal.classList.add('hidden');
  await prismLoadStats();
  prismLoadTable(table);
});

// ── INIT + AUTO REFRESH ──────────────────────────────────────
prismLoadStats();
setInterval(() => {
  prismLoadStats();
  if (prismCurrentTable) prismLoadTable(prismCurrentTable);
}, 5000);

console.log('%c⬡ EtherWorld — TroxT', 'color:#7b6fff;font-size:18px;font-weight:900');
console.log('%cEtherPrism Database — Online', 'color:#00d4ff;font-size:12px');