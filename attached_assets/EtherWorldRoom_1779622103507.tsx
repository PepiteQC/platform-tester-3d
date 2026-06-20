'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════
const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  || 'ws://localhost:3000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const TILE_W = 64;
const TILE_H = 32;
const GRID   = 12;
const WALL_H = 80;

const C = {
  bg:      '#0A0A0F',
  floor1:  '#12141F',
  floor2:  '#161924',
  wall1:   '#141622',
  wall2:   '#0F1118',
  violet:  '#4A3AFF',
  cyan:    '#00E0FF',
  magenta: '#FF3AF2',
  green:   '#00FF9D',
  red:     '#FF3A3A',
  orange:  '#FF9A3A',
  light:   '#F2F2F2',
};

// ═══════════════════════════════════════════════════════════════
//  MATH ISO
// ═══════════════════════════════════════════════════════════════
function isoToScreen(tx, ty, ox, oy) {
  return { x: (tx - ty) * (TILE_W / 2) + ox, y: (tx + ty) * (TILE_H / 2) + oy };
}
function screenToIso(sx, sy, ox, oy) {
  const px = sx - ox, py = sy - oy;
  return {
    tx: Math.round((px / (TILE_W / 2) + py / (TILE_H / 2)) / 2),
    ty: Math.round((py / (TILE_H / 2) - px / (TILE_W / 2)) / 2),
  };
}
function clamp(t) { return Math.max(0, Math.min(GRID - 1, t)); }

// ═══════════════════════════════════════════════════════════════
//  PATHFINDING A*
// ═══════════════════════════════════════════════════════════════
function findPath(start, end, furnitures) {
  const blocked = new Set(furnitures.map(f => `${f.tx},${f.ty}`));
  const key = (x, y) => `${x},${y}`;
  const h   = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);
  const open   = [{ x: start.tx, y: start.ty, g: 0, f: 0, parent: null }];
  const closed  = new Set();
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    if (cur.x === end.tx && cur.y === end.ty) {
      const path = [];
      let node = cur;
      while (node) { path.unshift({ tx: node.x, ty: node.y }); node = node.parent; }
      return path;
    }
    closed.add(key(cur.x, cur.y));
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      if (closed.has(key(nx, ny)) || blocked.has(key(nx, ny))) continue;
      const g = cur.g + 1;
      const exist = open.find(n => n.x === nx && n.y === ny);
      if (exist && exist.g <= g) continue;
      if (exist) open.splice(open.indexOf(exist), 1);
      open.push({ x: nx, y: ny, g, f: g + h(nx, ny, end.tx, end.ty), parent: cur });
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//  DESSIN — SOL & MURS
// ═══════════════════════════════════════════════════════════════
function drawFloorTile(ctx, x, y, highlight) {
  const hw = TILE_W / 2, hh = TILE_H / 2;
  ctx.beginPath();
  ctx.moveTo(x, y - hh); ctx.lineTo(x + hw, y);
  ctx.lineTo(x, y + hh); ctx.lineTo(x - hw, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - hw, y, x + hw, y);
  if (highlight) { g.addColorStop(0,'#1E2236'); g.addColorStop(1,'#242842'); }
  else           { g.addColorStop(0, C.floor1); g.addColorStop(1, C.floor2); }
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(74,58,255,0.18)'; ctx.lineWidth = 0.5; ctx.stroke();
}

function drawWallLeft(ctx, x, y) {
  const hw = TILE_W / 2, hh = TILE_H / 2;
  ctx.beginPath();
  ctx.moveTo(x - hw, y); ctx.lineTo(x, y + hh);
  ctx.lineTo(x, y + hh - WALL_H); ctx.lineTo(x - hw, y - WALL_H);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - hw, y, x, y);
  g.addColorStop(0,'#1C1F30'); g.addColorStop(1,'#141622');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(74,58,255,0.12)'; ctx.lineWidth = 0.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(74,58,255,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - hw, y - WALL_H + 4); ctx.lineTo(x, y + hh - WALL_H + 4);
  ctx.stroke();
}

function drawWallRight(ctx, x, y) {
  const hw = TILE_W / 2, hh = TILE_H / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + hh); ctx.lineTo(x + hw, y);
  ctx.lineTo(x + hw, y - WALL_H); ctx.lineTo(x, y + hh - WALL_H);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y, x + hw, y);
  g.addColorStop(0,'#0E1018'); g.addColorStop(1,'#0F1118');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(0,224,255,0.08)'; ctx.lineWidth = 0.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,224,255,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + hh - WALL_H + 4); ctx.lineTo(x + hw, y - WALL_H + 4);
  ctx.stroke();
}

// ═══════════════════════════════════════════════════════════════
//  DESSIN — 🚪 PORTE ISOMÉTRIQUE
// ═══════════════════════════════════════════════════════════════
function drawDoor(ctx, x, y, isLocked, t) {
  ctx.save();
  ctx.translate(x, y);
  const pulse = Math.sin(t * 0.004) * 0.3;
  const doorColor = isLocked ? C.red : C.green;

  ctx.strokeStyle = doorColor;
  ctx.lineWidth = 2;
  ctx.shadowColor = doorColor;
  ctx.shadowBlur = 8 + pulse * 6;

  ctx.beginPath();
  ctx.moveTo(-22, -WALL_H + 10);
  ctx.lineTo(0,   -WALL_H + 10 + TILE_H / 2);
  ctx.lineTo(0,   -10 + TILE_H / 2);
  ctx.lineTo(-22, -10);
  ctx.closePath();
  const doorGrad = ctx.createLinearGradient(-22, -WALL_H, 0, -WALL_H);
  doorGrad.addColorStop(0, isLocked ? '#2A0A0A' : '#0A2A1A');
  doorGrad.addColorStop(1, isLocked ? '#1A0505' : '#051A10');
  ctx.fillStyle = doorGrad;
  ctx.fill();
  ctx.strokeStyle = doorColor + '88';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = doorColor + '44';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-20, -WALL_H + 16); ctx.lineTo(-2, -WALL_H + 16 + TILE_H * 0.4);
  ctx.lineTo(-2,  -WALL_H + 28 + TILE_H * 0.4); ctx.lineTo(-20, -WALL_H + 28);
  ctx.closePath(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-20, -WALL_H + 34); ctx.lineTo(-2, -WALL_H + 34 + TILE_H * 0.4);
  ctx.lineTo(-2,  -14 + TILE_H * 0.4); ctx.lineTo(-20, -14);
  ctx.closePath(); ctx.stroke();

  ctx.fillStyle = doorColor;
  ctx.shadowColor = doorColor;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(-6, -25, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = doorColor;
  ctx.shadowColor = doorColor;
  ctx.shadowBlur = 10 + pulse * 5;
  ctx.textAlign = 'center';
  ctx.fillText(isLocked ? '🔒' : '🔓', -11, -WALL_H + 55);

  ctx.shadowBlur = 14 + pulse * 8;
  ctx.strokeStyle = doorColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-22, -WALL_H + 10);
  ctx.lineTo(0, -WALL_H + 10 + TILE_H / 2);
  ctx.lineTo(0, -10 + TILE_H / 2);
  ctx.lineTo(-22, -10);
  ctx.closePath();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  DESSIN — 🔒 COFFRE ISOMÉTRIQUE
// ═══════════════════════════════════════════════════════════════
function drawSafe(ctx, x, y, isLocked, t) {
  ctx.save();
  ctx.translate(x, y - 10);
  const pulse = Math.sin(t * 0.005) * 0.25;
  const safeColor = isLocked ? C.orange : C.green;

  ctx.beginPath();
  ctx.moveTo(-14, 0); ctx.lineTo(0, 8); ctx.lineTo(0, 28); ctx.lineTo(-14, 20);
  ctx.closePath();
  ctx.fillStyle = '#1A1000'; ctx.fill();
  ctx.strokeStyle = safeColor + '44'; ctx.lineWidth = 0.5; ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(14, 0); ctx.lineTo(0, 8); ctx.lineTo(0, 28); ctx.lineTo(14, 20);
  ctx.closePath();
  ctx.fillStyle = '#0F0A00'; ctx.fill();
  ctx.strokeStyle = safeColor + '44'; ctx.lineWidth = 0.5; ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(14, 0); ctx.lineTo(0, 8); ctx.lineTo(-14, 0);
  ctx.closePath();
  const topG = ctx.createLinearGradient(-14, 0, 14, 0);
  topG.addColorStop(0, '#2A1800'); topG.addColorStop(0.5, '#3A2200'); topG.addColorStop(1, '#1A1000');
  ctx.fillStyle = topG; ctx.fill();
  ctx.strokeStyle = safeColor; ctx.lineWidth = 1;
  ctx.shadowColor = safeColor; ctx.shadowBlur = 6 + pulse * 8;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(5, 6, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#2A2A00'; ctx.fill();
  ctx.strokeStyle = safeColor; ctx.lineWidth = 1;
  ctx.shadowColor = safeColor; ctx.shadowBlur = 4;
  ctx.stroke();
  const rot = (t * 0.002) % (Math.PI * 2);
  ctx.beginPath();
  ctx.moveTo(5, 6);
  ctx.lineTo(5 + Math.cos(rot) * 4, 6 + Math.sin(rot) * 4);
  ctx.strokeStyle = safeColor; ctx.lineWidth = 1.5; ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = safeColor;
  ctx.shadowColor = safeColor; ctx.shadowBlur = 8 + pulse * 5;
  ctx.textAlign = 'center';
  ctx.fillText(isLocked ? '🔐' : '📂', -5, -6);

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  DESSIN — FURNITURE
// ═══════════════════════════════════════════════════════════════
function drawFurniture(ctx, type, x, y, rotation, selected, t) {
  ctx.save(); ctx.translate(x, y);
  if (selected) { ctx.shadowColor = C.violet; ctx.shadowBlur = 20; }
  switch (type) {
    case 'chair-nebula':  drawChairNebula(ctx, t); break;
    case 'table-prism':   drawTablePrism(ctx, t);  break;
    case 'bed-obsidian':  drawBedObsidian(ctx, t); break;
    case 'lamp-halo':     drawLampHalo(ctx, t);    break;
    case 'crystal-ether': drawCrystalEther(ctx, t);break;
    case 'neon-crown':    drawNeonCrown(ctx, t);   break;
    default:              drawUnknown(ctx); break;
  }
  if (selected) {
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(0, -TILE_H/2-3); ctx.lineTo(TILE_W/2+3,0);
    ctx.lineTo(0,TILE_H/2+3); ctx.lineTo(-TILE_W/2-3,0);
    ctx.closePath();
    ctx.strokeStyle='rgba(74,58,255,0.9)';ctx.lineWidth=1.5;
    ctx.setLineDash([5,4]); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawChairNebula(ctx,t){const p=Math.sin(t*.002)*3;ctx.beginPath();ctx.moveTo(-18,-10);ctx.lineTo(0,0);ctx.lineTo(0,12);ctx.lineTo(-18,2);ctx.closePath();ctx.fillStyle='#1A1248';ctx.fill();ctx.beginPath();ctx.moveTo(18,-10);ctx.lineTo(0,0);ctx.lineTo(0,12);ctx.lineTo(18,2);ctx.closePath();ctx.fillStyle='#221758';ctx.fill();ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(18,-10);ctx.lineTo(0,0);ctx.lineTo(-18,-10);ctx.closePath();const g=ctx.createLinearGradient(-18,-10,18,-10);g.addColorStop(0,'#2A1E6E');g.addColorStop(.5,'#3A2A9E');g.addColorStop(1,'#2A1E6E');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=C.violet;ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.moveTo(-18,-10);ctx.lineTo(-18,-26);ctx.lineTo(0,-36);ctx.lineTo(0,-20);ctx.closePath();ctx.fillStyle='#301E80';ctx.fill();ctx.strokeStyle=`rgba(255,58,242,${.5+p*.05})`;ctx.lineWidth=1;ctx.shadowColor=C.magenta;ctx.shadowBlur=4+p;ctx.beginPath();ctx.moveTo(-16,-24);ctx.lineTo(-2,-34);ctx.stroke();ctx.shadowBlur=0;}
function drawTablePrism(ctx,t){const p=Math.sin(t*.003)*3;ctx.beginPath();ctx.moveTo(-28,-4);ctx.lineTo(-28,12);ctx.lineTo(0,26);ctx.lineTo(0,10);ctx.closePath();ctx.fillStyle='#001A22';ctx.fill();ctx.beginPath();ctx.moveTo(28,-4);ctx.lineTo(28,12);ctx.lineTo(0,26);ctx.lineTo(0,10);ctx.closePath();ctx.fillStyle='#002233';ctx.fill();ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(28,-4);ctx.lineTo(0,10);ctx.lineTo(-28,-4);ctx.closePath();const g=ctx.createLinearGradient(-28,-4,28,-4);g.addColorStop(0,'#003344');g.addColorStop(.5,'#005566');g.addColorStop(1,'#002233');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=C.cyan;ctx.lineWidth=1;ctx.stroke();ctx.shadowColor=C.cyan;ctx.shadowBlur=8+p;ctx.fillStyle=`rgba(0,224,255,${.7+p*.05})`;ctx.beginPath();ctx.moveTo(0,-26);ctx.lineTo(6,-18);ctx.lineTo(0,-12);ctx.lineTo(-6,-18);ctx.closePath();ctx.fill();ctx.shadowBlur=0;}
function drawBedObsidian(ctx,t){const s=Math.sin(t*.001)*.15;ctx.beginPath();ctx.moveTo(-32,4);ctx.lineTo(0,20);ctx.lineTo(0,32);ctx.lineTo(-32,16);ctx.closePath();ctx.fillStyle='#0E0718';ctx.fill();ctx.beginPath();ctx.moveTo(32,4);ctx.lineTo(0,20);ctx.lineTo(0,32);ctx.lineTo(32,16);ctx.closePath();ctx.fillStyle='#120920';ctx.fill();ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(32,4);ctx.lineTo(0,20);ctx.lineTo(-32,4);ctx.closePath();const g=ctx.createLinearGradient(-32,4,32,4);g.addColorStop(0,'#1A0A2E');g.addColorStop(.5,'#200D38');g.addColorStop(1,'#1A0A2E');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=`rgba(74,58,255,${.3+s})`;ctx.lineWidth=.5;ctx.stroke();}
function drawLampHalo(ctx,t){const p=Math.sin(t*.004)*5;ctx.strokeStyle='#2A2A4A';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(0,-52);ctx.stroke();ctx.beginPath();ctx.moveTo(-12,-44);ctx.lineTo(12,-44);ctx.lineTo(8,-58);ctx.lineTo(-8,-58);ctx.closePath();const g=ctx.createLinearGradient(0,-58,0,-44);g.addColorStop(0,'#002233');g.addColorStop(1,'#003344');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=C.cyan;ctx.lineWidth=.8;ctx.stroke();ctx.fillStyle=`rgba(0,224,255,${.8+p*.02})`;ctx.shadowColor=C.cyan;ctx.shadowBlur=10+p;ctx.beginPath();ctx.arc(0,-51,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle=`rgba(0,224,255,${.5+p*.02})`;ctx.lineWidth=2;ctx.shadowBlur=12+p;ctx.beginPath();ctx.ellipse(0,-58,15+p,5,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;}
function drawCrystalEther(ctx,t){const p=Math.sin(t*.005)*4;const crystals=[{x:0,y:0,h:36,w:9,c:C.cyan,a:.7},{x:-11,y:4,h:26,w:6,c:C.violet,a:.6},{x:11,y:2,h:30,w:7,c:C.magenta,a:.65}];crystals.forEach(({x,y,h,w,c,a},i)=>{const yOff=Math.sin(t*.003+i)*2;ctx.save();ctx.translate(x,y+yOff);ctx.shadowColor=c;ctx.shadowBlur=8+p;ctx.beginPath();ctx.moveTo(0,-h);ctx.lineTo(w,0);ctx.lineTo(w*.7,h*.1);ctx.lineTo(-w*.7,h*.1);ctx.lineTo(-w,0);ctx.closePath();ctx.fillStyle=c+'99';ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=1;ctx.stroke();ctx.restore();});ctx.shadowBlur=0;}
function drawNeonCrown(ctx,t){const float=Math.sin(t*.003)*5;const pulse=Math.sin(t*.005)*.3;ctx.save();ctx.translate(0,float-5);const pts=[[-16,5],[-16,-4],[-10,-16],[-6,-4],[0,-20],[6,-4],[10,-16],[16,-4],[16,5]];ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);pts.forEach(([px,py])=>ctx.lineTo(px,py));ctx.closePath();const g=ctx.createLinearGradient(0,-20,0,5);g.addColorStop(0,'#3A006A');g.addColorStop(1,'#1A0030');ctx.fillStyle=g;ctx.fill();ctx.shadowColor=C.magenta;ctx.shadowBlur=10+pulse*10;ctx.strokeStyle=`rgba(255,58,242,${.8+pulse})`;ctx.lineWidth=2;ctx.stroke();ctx.shadowBlur=0;[[-10,-14],[0,-18],[10,-14]].forEach(([gx,gy],i)=>{const gc=[C.cyan,C.magenta,C.violet][i];ctx.fillStyle=gc;ctx.shadowColor=gc;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(gx,gy,3,0,Math.PI*2);ctx.fill();});ctx.shadowBlur=0;ctx.restore();}
function drawUnknown(ctx){ctx.fillStyle='#333';ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(20,-5);ctx.lineTo(0,10);ctx.lineTo(-20,-5);ctx.closePath();ctx.fill();}

// ═══════════════════════════════════════════════════════════════
//  DESSIN — AVATAR
// ═══════════════════════════════════════════════════════════════
function drawAvatar(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  const bob = Math.sin(t * 0.007) * 1.5;
  ctx.fillStyle='rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0,2,8,3,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#0D1020';
  ctx.fillRect(-6,-14+bob,5,14); ctx.fillRect(1,-14+bob,5,14);
  ctx.fillStyle=C.cyan; ctx.fillRect(-6,-15+bob,11,2);
  const bodyG=ctx.createLinearGradient(0,-28+bob,0,-12+bob);
  bodyG.addColorStop(0,'#1E2564'); bodyG.addColorStop(1,'#141840');
  ctx.fillStyle=bodyG;
  ctx.beginPath(); ctx.roundRect(-7,-28+bob,14,16,3); ctx.fill();
  ctx.strokeStyle=C.violet; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle='#1A1E50';
  ctx.beginPath(); ctx.roundRect(-11,-26+bob,4,10,2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(7,-26+bob,4,10,2); ctx.fill();
  ctx.fillStyle='#E8C8B8'; ctx.fillRect(-3,-32+bob,6,4);
  const headG=ctx.createRadialGradient(0,-34+bob,1,0,-34+bob,7);
  headG.addColorStop(0,'#F5D8C5'); headG.addColorStop(1,'#E0C0A8');
  ctx.fillStyle=headG; ctx.beginPath(); ctx.arc(0,-34+bob,7,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=C.violet; ctx.shadowColor=C.violet; ctx.shadowBlur=4;
  ctx.beginPath(); ctx.ellipse(0,-39+bob,7,4.5,0,Math.PI,2*Math.PI); ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle=C.cyan; ctx.shadowColor=C.cyan; ctx.shadowBlur=3;
  ctx.beginPath(); ctx.arc(-2.5,-34+bob,1.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(2.5,-34+bob,1.5,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  CATALOGUE MOBILIER
// ═══════════════════════════════════════════════════════════════
const CATALOG = [
  { id:'chair-nebula',  name:'Chaise Nébula',  emoji:'🪑', color:C.violet,  stock:5, w:1, h:1 },
  { id:'table-prism',   name:'Table Prisme',   emoji:'🔷', color:C.cyan,    stock:3, w:1, h:1 },
  { id:'bed-obsidian',  name:'Lit Obsidien',   emoji:'🛏', color:C.magenta, stock:2, w:1, h:1 },
  { id:'lamp-halo',     name:'Lampe Halo',     emoji:'💡', color:C.cyan,    stock:4, w:1, h:1 },
  { id:'crystal-ether', name:'Cristal Éther',  emoji:'💎', color:C.violet,  stock:6, w:1, h:1 },
  { id:'neon-crown',    name:'Couronne Néon',  emoji:'👑', color:C.magenta, stock:2, w:1, h:1 },
];

// ═══════════════════════════════════════════════════════════════
//  HOOK WEBSOCKET
// ═══════════════════════════════════════════════════════════════
function useEtherWorldWS({ apartmentId, floorId, characterId, onDoorChanged, onIntrusionAlert }) {
  const wsRef    = useRef(null);
  const [wsState, setWsState] = useState('disconnected');

  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    if (!characterId) return;
    setWsState('connecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsState('connected');
      ws.send(JSON.stringify({ type: 'AUTH', characterId }));
      if (floorId) ws.send(JSON.stringify({ type: 'JOIN_FLOOR', floorId }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      switch (msg.type) {
        case 'DOOR_STATE_CHANGED':
          if (msg.apartmentId === apartmentId) onDoorChanged?.(msg.isLocked);
          break;
        case 'DOOR_UNLOCKED_ALERT':
          onIntrusionAlert?.({ type: 'unlock_alert', ...msg });
          break;
        case 'DOOR_FORCED':
          if (msg.apartmentId === apartmentId) onIntrusionAlert?.({ type: 'forced', ...msg });
          break;
        case 'INTRUSION_ALERT':
          if (msg.apartmentId === apartmentId) onIntrusionAlert?.({ type: 'intrusion', ...msg });
          break;
      }
    };

    ws.onclose = () => setWsState('disconnected');
    ws.onerror = () => setWsState('disconnected');

    return () => {
      ws.send(JSON.stringify({ type: 'LEAVE_FLOOR' }));
      ws.close();
    };
  }, [characterId, apartmentId, floorId]);

  return { send, wsState };
}

// ═══════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function EtherWorldRoom({
  characterId   = 1,
  apartmentId   = 1,
  floorId       = 1,
  aptNumber     = 'A-1-01',
  initialLocked = true,
  hasMagneticCard = true,
}) {
  const canvasRef    = useRef(null);
  const rafRef       = useRef(null);
  const timeRef      = useRef(0);
  const longPressRef = useRef(null);
  const lastTapRef   = useRef(0);
  const pathTimerRef = useRef(0);
  const pathIndexRef = useRef(0);

  const [doorLocked, setDoorLocked]   = useState(initialLocked);
  const [safeLocked, setSafeLocked]   = useState(true);
  const doorLockedRef = useRef(doorLocked);
  const safeLockedRef = useRef(safeLocked);
  useEffect(() => { doorLockedRef.current = doorLocked; }, [doorLocked]);
  useEffect(() => { safeLockedRef.current = safeLocked; }, [safeLocked]);

  const [alerts, setAlerts] = useState([]);
  const addAlert = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev.slice(-2), { id, msg, type }]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 5000);
  }, []);

  const { send, wsState } = useEtherWorldWS({
    apartmentId, floorId, characterId,
    onDoorChanged: (isLocked) => {
      setDoorLocked(isLocked);
      addAlert(isLocked ? '🔒 Porte verrouillée' : '🔓 Porte déverrouillée', isLocked ? 'success' : 'warning');
    },
    onIntrusionAlert: (data) => {
      if (data.type === 'forced')    addAlert('🚨 VOTRE PORTE A ÉTÉ FORCÉE !', 'danger');
      if (data.type === 'intrusion') addAlert('🚨 INTRUSION DÉTECTÉE !', 'danger');
      if (data.type === 'unlock_alert') addAlert(`⚠️ Apt ${data.apartmentId} déverrouillé au ${floorId}e !`, 'warning');
    },
  });

  const [showSafeModal, setShowSafeModal] = useState(false);
  const [pinInput, setPinInput]           = useState('');
  const [pinError, setPinError]           = useState('');

  const [furnitures, setFurnitures] = useState([
    { id:1, type:'lamp-halo',     tx:2, ty:1, rotation:0 },
    { id:2, type:'crystal-ether', tx:8, ty:3, rotation:0 },
    { id:3, type:'chair-nebula',  tx:5, ty:5, rotation:0 },
    { id:4, type:'neon-crown',    tx:9, ty:8, rotation:0 },
  ]);
  const furnituresRef = useRef(furnitures);
  useEffect(() => { furnituresRef.current = furnitures; }, [furnitures]);

  const DOOR_TILE  = { tx: 0, ty: 3 };
  const SAFE_TILE  = { tx: 1, ty: 9 };

  const [avatar, setAvatar]         = useState({ tx:6, ty:7 });
  const avatarRef = useRef(avatar);
  useEffect(() => { avatarRef.current = avatar; }, [avatar]);

  const [avatarPath, setAvatarPath] = useState([]);
  const avatarPathRef = useRef([]);
  useEffect(() => { avatarPathRef.current = avatarPath; pathIndexRef.current = 0; }, [avatarPath]);

  const [selected, setSelected]     = useState(null);
  const selectedRef = useRef(null);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const [inventory, setInventory]   = useState(CATALOG.map(c => ({ ...c })));
  const [showInventory, setShowInventory] = useState(false);
  const [dragItem, setDragItem]     = useState(null);
  const dragRef = useRef(null);
  useEffect(() => { dragRef.current = dragItem; }, [dragItem]);

  const [toast, setToast]           = useState(`🏠 Bienvenue — Appart ${aptNumber}`);
  const showToast = useCallback((msg) => setToast(msg), []);

  const getOffset = useCallback((canvas) => {
    const dpr = window.devicePixelRatio || 1;
    return { ox: (canvas.width / dpr) / 2, oy: (canvas.height / dpr) * 0.18 };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    let lastTs = 0;
    const loop = (ts) => {
      const dt = ts - lastTs; lastTs = ts;
      timeRef.current = ts;
      pathTimerRef.current += dt;
      const path = avatarPathRef.current;
      if (path.length > 0 && pathTimerRef.current > 130) {
        pathTimerRef.current = 0;
        const idx = pathIndexRef.current;
        if (idx < path.length) { setAvatar(path[idx]); pathIndexRef.current++; }
        else setAvatarPath([]);
      }
      renderScene();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const renderScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.width / dpr, H = canvas.height / dpr;
    const { ox, oy } = getOffset(canvas);
    const t   = timeRef.current;
    const fur = furnituresRef.current;
    const av  = avatarRef.current;
    const sel = selectedRef.current;
    const drag= dragRef.current;

    ctx.save(); ctx.scale(dpr, dpr);

    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,H*.8);
    vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,0.5)');
    ctx.fillStyle = vig; ctx.fillRect(0,0,W,H);

    for (let tx = 0; tx < GRID; tx++)
      for (let ty = 0; ty < GRID; ty++) {
        const { x, y } = isoToScreen(tx, ty, ox, oy);
        drawFloorTile(ctx, x, y, (tx + ty) % 5 === 0);
      }

    for (let ty = 0; ty < GRID; ty++) {
      const { x, y } = isoToScreen(0, ty, ox, oy);
      if (ty !== DOOR_TILE.ty) drawWallLeft(ctx, x, y);
    }
    for (let tx = 0; tx < GRID; tx++) {
      const { x, y } = isoToScreen(tx, 0, ox, oy);
      drawWallRight(ctx, x, y);
    }

    const doorPos  = isoToScreen(DOOR_TILE.tx, DOOR_TILE.ty, ox, oy);
    const safePos  = isoToScreen(SAFE_TILE.tx, SAFE_TILE.ty, ox, oy);

    const items = [
      ...fur.map(f => ({ ...f, _z: f.tx + f.ty, _type: 'fur' })),
      { tx: DOOR_TILE.tx, ty: DOOR_TILE.ty, _z: DOOR_TILE.tx + DOOR_TILE.ty, _type: 'door' },
      { tx: SAFE_TILE.tx, ty: SAFE_TILE.ty, _z: SAFE_TILE.tx + SAFE_TILE.ty, _type: 'safe' },
      { ...av, _z: av.tx + av.ty, _type: 'av' },
    ].sort((a, b) => a._z - b._z);

    items.forEach(item => {
      const { x, y } = isoToScreen(item.tx, item.ty, ox, oy);
      if (item._type === 'av')   drawAvatar(ctx, x, y, t);
      else if (item._type === 'door') drawDoor(ctx, x, y, doorLockedRef.current, t);
      else if (item._type === 'safe') drawSafe(ctx, x, y, safeLockedRef.current, t);
      else drawFurniture(ctx, item.type, x, y - TILE_H/2, item.rotation, sel?.id === item.id, t);
    });

    if (drag?.isoX !== undefined) {
      const { x, y } = isoToScreen(drag.isoX, drag.isoY, ox, oy);
      ctx.globalAlpha = 0.55;
      drawFloorTile(ctx, x, y, true);
      drawFurniture(ctx, drag.type, x, y - TILE_H/2, 0, false, t);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }, [getOffset]);

  const toggleDoor = useCallback(async () => {
    if (!hasMagneticCard) { addAlert('❌ Pas de carte magnétique !', 'danger'); return; }
    const action = doorLocked ? 'unlock' : 'lock';
    try {
      const res = await fetch(`${API_URL}/doors/${apartmentId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setDoorLocked(data.isLocked);
        addAlert(data.isLocked ? '🔒 Porte barrée' : '🔓 Porte débarrée', 'success');
      } else {
        addAlert('❌ ' + data.error, 'danger');
      }
    } catch {
      setDoorLocked(v => !v);
      addAlert(doorLocked ? '🔓 Porte débarrée (local)' : '🔒 Porte barrée (local)', 'warning');
    }
  }, [doorLocked, hasMagneticCard, apartmentId, characterId, addAlert]);

  const submitSafeCode = useCallback(async () => {
    if (pinInput.length < 4) { setPinError('Code trop court'); return; }
    try {
      const res = await fetch(`${API_URL}/doors/safe/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apartmentId, characterId, code: pinInput }),
      });
      const data = await res.json();
      if (data.success) {
        setSafeLocked(data.isLocked);
        setShowSafeModal(false); setPinInput('');
        addAlert(data.isLocked ? '🔐 Coffre verrouillé' : '📂 Coffre ouvert', 'success');
      } else {
        setPinError('❌ Code incorrect');
      }
    } catch {
      if (pinInput === '1234') {
        setSafeLocked(v => !v);
        setShowSafeModal(false); setPinInput('');
        addAlert('📂 Coffre ouvert (local)', 'warning');
      } else {
        setPinError('❌ Code incorrect');
      }
    }
  }, [pinInput, apartmentId, characterId, addAlert]);

  const touchToTile = useCallback((touch) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { ox, oy } = getOffset(canvas);
    const { tx, ty } = screenToIso(touch.clientX - rect.left, touch.clientY - rect.top, ox, oy);
    if (tx < 0 || ty < 0 || tx >= GRID || ty >= GRID) return null;
    return { tx, ty };
  }, [getOffset]);

  const handleCanvasTouchStart = useCallback((e) => {
    e.preventDefault();
    const tile = touchToTile(e.touches[0]);
    if (!tile) return;

    if (tile.tx === DOOR_TILE.tx && tile.ty === DOOR_TILE.ty) {
      toggleDoor(); showToast('🚪 Interaction avec la porte...'); return;
    }
    if (tile.tx === SAFE_TILE.tx && tile.ty === SAFE_TILE.ty) {
      setShowSafeModal(true); setPinInput(''); setPinError(''); return;
    }

    longPressRef.current = setTimeout(() => {
      if (selectedRef.current) setShowDeleteConfirm(true);
    }, 600);

    const now = Date.now();
    lastTapRef.current = now;

    const fur = furnituresRef.current;
    const touched = fur.find(f => f.tx === tile.tx && f.ty === tile.ty);

    if (touched) {
      if (selectedRef.current?.id === touched.id) {
        setFurnitures(prev => prev.map(f =>
          f.id === touched.id ? { ...f, rotation: (f.rotation + 90) % 360 } : f
        ));
      } else {
        setSelected(touched);
        showToast(`✅ ${touched.type.replace('-', ' ')}`);
      }
    } else {
      setSelected(null);
      const av = avatarRef.current;
      const path = findPath(av, tile, fur);
      if (path && path.length > 1) {
        setAvatarPath(path.slice(1));
        showToast(`🚶 (${tile.tx},${tile.ty})`);
      }
    }
  }, [touchToTile, toggleDoor, showToast]);

  const handleCanvasTouchEnd = useCallback(() => clearTimeout(longPressRef.current), []);

  const handleInvDragStart = useCallback((e, itemId) => {
    e.stopPropagation();
    setDragItem({ type: itemId, x: e.touches[0].clientX, y: e.touches[0].clientY });
    setShowInventory(false);
  }, []);

  useEffect(() => {
    const handleMove = (e) => {
      const drag = dragRef.current; if (!drag) return;
      const tile = touchToTile(e.touches[0]);
      setDragItem(prev => ({ ...prev, x: e.touches[0].clientX, y: e.touches[0].clientY, ...(tile ? { isoX: tile.tx, isoY: tile.ty } : {}) }));
    };
    const handleEnd = (e) => {
      const drag = dragRef.current; if (!drag) return;
      const tile = touchToTile(e.changedTouches[0]);
      if (tile) {
        const fur = furnituresRef.current;
        const blocked = fur.some(f => f.tx === tile.tx && f.ty === tile.ty)
          || (tile.tx === DOOR_TILE.tx && tile.ty === DOOR_TILE.ty)
          || (tile.tx === SAFE_TILE.tx && tile.ty === SAFE_TILE.ty);
        const inv = inventory.find(i => i.id === drag.type);
        if (!blocked && inv?.stock > 0) {
          setFurnitures(prev => [...prev, { id: Date.now(), type: drag.type, tx: tile.tx, ty: tile.ty, rotation: 0 }]);
          setInventory(prev => prev.map(i => i.id === drag.type ? { ...i, stock: i.stock - 1 } : i));
          showToast(`✅ ${drag.type} placé !`);
        } else {
          showToast(blocked ? '❌ Tuile occupée !' : '❌ Stock épuisé !');
        }
      }
      setDragItem(null);
    };
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    return () => { window.removeEventListener('touchmove', handleMove); window.removeEventListener('touchend', handleEnd); };
  }, [inventory, touchToTile, showToast]);

  const deleteSelected = useCallback(() => {
    const sel = selectedRef.current; if (!sel) return;
    setFurnitures(prev => prev.filter(f => f.id !== sel.id));
    setInventory(prev => prev.map(i => i.id === sel.type ? { ...i, stock: i.stock + 1 } : i));
    setSelected(null);
    showToast(`🗑 Supprimé`);
  }, [showToast]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div style={{ position:'fixed',inset:0,background:C.bg,fontFamily:"'Segoe UI',sans-serif",display:'flex',flexDirection:'column',overflow:'hidden',userSelect:'none',WebkitUserSelect:'none' }}>

      {/* HEADER */}
      <div style={{ position:'absolute',top:0,left:0,right:0,zIndex:10,background:'linear-gradient(180deg,rgba(10,10,15,0.95) 0%,transparent 100%)',padding:'10px 16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${C.violet},${C.cyan})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>💎</div>
          <div>
            <div style={{ fontSize:13,fontWeight:800,color:'#F2F2F2',letterSpacing:'0.05em' }}>ETHERWORLD</div>
            <div style={{ fontSize:9,color:C.cyan,letterSpacing:'0.15em' }}>APT {aptNumber}</div>
          </div>
        </div>

        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          <div style={{ width:7,height:7,borderRadius:'50%',background: wsState==='connected'?C.green : wsState==='connecting'?C.orange : C.red, boxShadow:`0 0 6px ${wsState==='connected'?C.green:C.red}` }} />
          <div style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:'5px 12px',fontSize:11,color:'rgba(242,242,242,0.8)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{toast}</div>
        </div>
      </div>

      {/* CANVAS */}
      <canvas ref={canvasRef} style={{ position:'absolute',inset:0,width:'100%',height:'100%',touchAction:'none' }} onTouchStart={handleCanvasTouchStart} onTouchEnd={handleCanvasTouchEnd} />

      {/* ALERTES TEMPS RÉEL */}
      <div style={{ position:'absolute',top:70,right:12,zIndex:50,display:'flex',flexDirection:'column',gap:6,maxWidth:220 }}>
        {alerts.map(a => (
          <div key={a.id} style={{ background: a.type==='danger'?'rgba(255,58,58,0.15)':a.type==='warning'?'rgba(255,154,58,0.15)':'rgba(0,255,157,0.1)', border:`1px solid ${a.type==='danger'?C.red:a.type==='warning'?C.orange:C.green}55`, borderRadius:10,padding:'8px 12px',fontSize:11,color:'#F2F2F2',fontWeight:600,backdropFilter:'blur(10px)', animation:'slideIn 0.3s ease' }}>
            {a.msg}
          </div>
        ))}
      </div>

      {/* DRAG CURSOR */}
      {dragItem && (
        <div style={{ position:'fixed',left:dragItem.x-20,top:dragItem.y-50,width:40,height:40,background:`rgba(74,58,255,0.2)`,border:`2px solid ${C.violet}`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,pointerEvents:'none',zIndex:999,boxShadow:`0 0 20px ${C.violet}` }}>
          {CATALOG.find(c=>c.id===dragItem.type)?.emoji}
        </div>
      )}

      {/* PANNEAU SÉLECTION */}
      {selected && (
        <div style={{ position:'absolute',bottom:130,left:'50%',transform:'translateX(-50%)',background:'rgba(10,10,20,0.92)',border:`1px solid ${C.violet}44`,borderRadius:16,padding:'10px 16px',display:'flex',gap:10,zIndex:20,backdropFilter:'blur(10px)' }}>
          <span style={{ fontSize:11,color:C.cyan,alignSelf:'center',marginRight:4 }}>{selected.type.replace('-',' ')}</span>
          <ActionBtn icon="🔄" label="Rotation" color={C.violet} onPress={() => { setFurnitures(p=>p.map(f=>f.id===selected.id?{...f,rotation:(f.rotation+90)%360}:f)); }} />
          <ActionBtn icon="🗑" label="Supprimer" color={C.magenta} onPress={deleteSelected} />
          <ActionBtn icon="✖" label="Désélect." color="#666" onPress={() => setSelected(null)} />
        </div>
      )}

      {/* BARRE OUTILS BAS */}
      <div style={{ position:'absolute',bottom:0,left:0,right:0,zIndex:20,background:'linear-gradient(0deg,rgba(10,10,15,0.98) 0%,transparent 100%)',padding:'16px 16px 24px' }}>
        <div style={{ display:'flex',gap:8,marginBottom:10,justifyContent:'center',flexWrap:'wrap' }}>
          <ModeBtn icon={doorLocked?'🔒':'🔓'} label={doorLocked?'Débarrer':'Barrer'} active={false} color={doorLocked?C.red:C.green} onPress={toggleDoor} />
          <ModeBtn icon="🔐" label="Coffre" active={false} color={C.orange} onPress={() => { setShowSafeModal(true); setPinInput(''); setPinError(''); }} />
          <ModeBtn icon="📦" label="Inventaire" active={showInventory} color={C.violet} onPress={() => setShowInventory(v => !v)} />
          {selected && <ModeBtn icon="🗑" label="Supprimer" active={false} color={C.magenta} onPress={deleteSelected} />}
        </div>

        <div style={{ display:'flex',gap:6,justifyContent:'center' }}>
          {[
            { label:'Porte',      val: doorLocked ? '🔒 Barrée'  : '🔓 Ouverte', c: doorLocked ? C.red  : C.green  },
            { label:'Coffre',     val: safeLocked ? '🔐 Barré'   : '📂 Ouvert',  c: safeLocked ? C.orange : C.green },
            { label:'Meubles',    val: furnitures.length, c: C.cyan },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'4px 10px',textAlign:'center' }}>
              <div style={{ fontSize:12,fontWeight:800,color:s.c }}>{s.val}</div>
              <div style={{ fontSize:9,color:'rgba(242,242,242,0.4)',letterSpacing:'0.1em' }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL INVENTAIRE */}
      {showInventory && (
        <div style={{ position:'absolute',bottom:0,left:0,right:0,zIndex:30,background:'rgba(8,8,18,0.97)',borderTop:`1px solid ${C.violet}44`,borderRadius:'20px 20px 0 0',maxHeight:'55vh',display:'flex',flexDirection:'column',backdropFilter:'blur(20px)' }}>
          <div style={{ display:'flex',justifyContent:'center',padding:'10px 0 0' }}>
            <div style={{ width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)' }} />
          </div>
          <div style={{ padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            <span style={{ fontSize:13,fontWeight:800,color:C.cyan,letterSpacing:'0.1em' }}>📦 INVENTAIRE</span>
            <button onClick={()=>setShowInventory(false)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:18,cursor:'pointer' }}>✕</button>
          </div>
          <div style={{ overflowY:'auto',padding:'8px 16px 32px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
            {inventory.map(item => (
              <div key={item.id} onTouchStart={item.stock>0?(e)=>handleInvDragStart(e,item.id):undefined} style={{ background:item.stock>0?`linear-gradient(135deg,rgba(${hexToRgb(item.color)},0.12),rgba(${hexToRgb(item.color)},0.04))`:'rgba(255,255,255,0.02)',border:`1px solid ${item.stock>0?item.color+'44':'rgba(255,255,255,0.06)'}`,borderRadius:14,padding:'12px 8px',textAlign:'center',opacity:item.stock>0?1:0.4,cursor:item.stock>0?'grab':'default',position:'relative' }}>
                {item.stock>0 && <div style={{ position:'absolute',top:4,right:6,fontSize:9,color:item.color,fontWeight:800 }}>×{item.stock}</div>}
                <div style={{ fontSize:28,marginBottom:4 }}>{item.emoji}</div>
                <div style={{ fontSize:10,color:'rgba(242,242,242,0.7)',fontWeight:600,lineHeight:1.2 }}>{item.name}</div>
                {item.stock===0 && <div style={{ fontSize:9,color:C.magenta,marginTop:4 }}>ÉPUISÉ</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL COFFRE (CODE PIN) */}
      {showSafeModal && (
        <div style={{ position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)' }}>
          <div style={{ background:'#0E0E1A',border:`2px solid ${C.orange}66`,borderRadius:20,padding:'28px 24px',width:280,boxShadow:`0 0 40px ${C.orange}33` }}>
            <div style={{ textAlign:'center',marginBottom:20 }}>
              <div style={{ fontSize:36 }}>{safeLocked?'🔐':'📂'}</div>
              <div style={{ fontSize:16,fontWeight:800,color:C.orange,marginTop:8 }}>
                {safeLocked?'Déverrouiller le coffre':'Verrouiller le coffre'}
              </div>
              <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:4 }}>Entrez votre code PIN</div>
            </div>

            <div style={{ display:'flex',gap:8,justifyContent:'center',marginBottom:16 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width:44,height:52,borderRadius:10,background:'rgba(255,154,58,0.08)',border:`1px solid ${pinInput.length>i?C.orange:'rgba(255,255,255,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:C.orange,fontWeight:800 }}>
                  {pinInput[i] ? '●' : ''}
                </div>
              ))}
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12 }}>
              {[1,2,3,4,5,6,7,8,9,'⌫',0,'✓'].map((k,i) => (
                <button key={i} onClick={() => {
                  if (k==='⌫') { setPinInput(p=>p.slice(0,-1)); setPinError(''); }
                  else if (k==='✓') submitSafeCode();
                  else if (pinInput.length<4) { setPinInput(p=>p+k); setPinError(''); }
                }} style={{ padding:'14px',background: k==='✓'?`rgba(255,154,58,0.2)`:k==='⌫'?'rgba(255,58,58,0.1)':'rgba(255,255,255,0.05)',border:`1px solid ${k==='✓'?C.orange:k==='⌫'?C.red:'rgba(255,255,255,0.08)'}`,borderRadius:10,color: k==='✓'?C.orange:k==='⌫'?C.red:'#F2F2F2',fontSize:16,fontWeight:700,cursor:'pointer' }}>
                  {k}
                </button>
              ))}
            </div>

            {pinError && <div style={{ textAlign:'center',color:C.red,fontSize:12,marginBottom:8 }}>{pinError}</div>}

            <button onClick={()=>setShowSafeModal(false)} style={{ width:'100%',padding:12,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'rgba(255,255,255,0.5)',fontSize:13,cursor:'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* MODAL CARTES MAGNÉTIQUES */}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}

function ActionBtn({ icon, label, color, onPress }) {
  return (
    <button onTouchStart={(e)=>{e.preventDefault();onPress();}} onClick={onPress} style={{ background:`rgba(${hexToRgb(color)},0.15)`,border:`1px solid ${color}55`,borderRadius:10,padding:'8px 12px',color:'#F2F2F2',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,minWidth:56 }}>
      <span style={{fontSize:16}}>{icon}</span>
      <span style={{fontSize:9,color:'rgba(242,242,242,0.6)'}}>{label}</span>
    </button>
  );
}

function ModeBtn({ icon, label, active, color, onPress }) {
  return (
    <button onTouchStart={(e)=>{e.preventDefault();onPress();}} onClick={onPress} style={{ background:active?`rgba(${hexToRgb(color)},0.25)`:'rgba(255,255,255,0.04)',border:`1px solid ${active?color+'88':'rgba(255,255,255,0.1)'}`,borderRadius:12,padding:'8px 14px',color:active?color:'rgba(242,242,242,0.6)',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,boxShadow:active?`0 0 12px ${color}44`:'none',transition:'all 0.2s' }}>
      <span style={{fontSize:16}}>{icon}</span>
      <span style={{fontSize:11}}>{label}</span>
    </button>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}