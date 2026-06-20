'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  || 'ws://localhost:3000';

// Dimensions tuile couloir (plus large que la chambre)
const TW   = 72;   // tile width
const TH   = 36;   // tile height
const WH   = 96;   // wall height
const DW   = 28;   // door width
const DH   = 72;   // door height

// 20 portes — 10 à gauche, 10 à droite du couloir
const TOTAL_DOORS  = 20;
const DOORS_SIDE   = 10;
const CORRIDOR_LEN = 22; // tuiles de long
const CORRIDOR_W   = 6;  // tuiles de large

const C = {
  bg:       '#08080E',
  floor1:   '#0E1018',
  floor2:   '#111420',
  wall_L:   '#141826',
  wall_R:   '#0C0E18',
  violet:   '#4A3AFF',
  cyan:     '#00E0FF',
  magenta:  '#FF3AF2',
  green:    '#00FF9D',
  red:      '#FF3A3A',
  orange:   '#FF9A3A',
  yellow:   '#FFD700',
  light:    '#F2F2F2',
  dim:      'rgba(242,242,242,0.4)',
};

// ═══════════════════════════════════════════════════════════════
//  MATH ISO
// ═══════════════════════════════════════════════════════════════
const isoX = (tx, ty, ox) => (tx - ty) * (TW / 2) + ox;
const isoY = (tx, ty, oy) => (tx + ty) * (TH / 2) + oy;

// ═══════════════════════════════════════════════════════════════
//  GÉNÉRATION DES 20 PORTES
// ═══════════════════════════════════════════════════════════════
function generateDoors(floorData = []) {
  return Array.from({ length: TOTAL_DOORS }, (_, i) => {
    const side    = i < DOORS_SIDE ? 'left' : 'right';  // gauche ou droite
    const idx     = i < DOORS_SIDE ? i : i - DOORS_SIDE;
    const ty      = 1 + idx * 2;                         // espacées de 2 tuiles
    const tx      = side === 'left' ? 0 : CORRIDOR_W - 1;
    const aptNum  = `A-${floorData.floorNumber ?? 1}-${String(i + 1).padStart(2, '0')}`;
    const apt     = floorData.apartments?.[i];
    return {
      id:          apt?.door_id  ?? i + 1,
      aptId:       apt?.id       ?? i + 1,
      aptNumber:   apt?.apt_number ?? aptNum,
      tx, ty, side,
      isLocked:    apt?.door_locked ?? true,
      ownerName:   apt?.owner_name  ?? null,
      ownerId:     apt?.owner_id    ?? null,
      rentPrice:   apt?.rent_price  ?? 600,
      isForRent:   apt?.is_for_rent ?? true,
      hasActivity: false,
      justChanged: false,
    };
  });
}

// ═══════════════════════════════════════════════════════════════
//  DESSIN — TUILE SOL
// ═══════════════════════════════════════════════════════════════
function drawTile(ctx, x, y, col1, col2, alpha) {
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(x, y - TH/2); ctx.lineTo(x + TW/2, y);
  ctx.lineTo(x, y + TH/2); ctx.lineTo(x - TW/2, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - TW/2, y, x + TW/2, y);
  g.addColorStop(0, col1); g.addColorStop(1, col2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(74,58,255,0.12)';
  ctx.lineWidth = 0.5; ctx.stroke();
  ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════════
//  DESSIN — MUR GAUCHE
// ═══════════════════════════════════════════════════════════════
function drawWallLeft(ctx, x, y, h = WH) {
  ctx.beginPath();
  ctx.moveTo(x - TW/2, y);
  ctx.lineTo(x, y + TH/2);
  ctx.lineTo(x, y + TH/2 - h);
  ctx.lineTo(x - TW/2, y - h);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - TW/2, y, x, y);
  g.addColorStop(0, '#191C2E'); g.addColorStop(1, '#141826');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(74,58,255,0.1)'; ctx.lineWidth = 0.5; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - TW/2, y - h + 5);
  ctx.lineTo(x, y + TH/2 - h + 5);
  ctx.strokeStyle = 'rgba(74,58,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
}

// ═══════════════════════════════════════════════════════════════
//  DESSIN — MUR DROIT
// ═══════════════════════════════════════════════════════════════
function drawWallRight(ctx, x, y, h = WH) {
  ctx.beginPath();
  ctx.moveTo(x + TW/2, y);
  ctx.lineTo(x, y + TH/2);
  ctx.lineTo(x, y + TH/2 - h);
  ctx.lineTo(x + TW/2, y - h);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y, x + TW/2, y);
  g.addColorStop(0, '#0C0E18'); g.addColorStop(1, '#0A0C14');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(0,224,255,0.06)'; ctx.lineWidth = 0.5; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + TH/2 - h + 5);
  ctx.lineTo(x + TW/2, y - h + 5);
  ctx.strokeStyle = 'rgba(0,224,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
}

// ═══════════════════════════════════════════════════════════════
//  DESSIN — 🚪 PORTE
// ═══════════════════════════════════════════════════════════════
function drawDoorInWall(ctx, x, y, door, t, hovered) {
  const { isLocked, side, justChanged, hasActivity } = door;
  const lockColor = isLocked ? C.red : C.green;
  const pulse     = Math.sin(t * 0.004) * 0.4;
  const urgPulse  = justChanged ? Math.abs(Math.sin(t * 0.01)) : 0;

  ctx.save();
  ctx.translate(x, y);

  if (side === 'left') {
    const dw = DW, dh = DH;

    ctx.beginPath();
    ctx.moveTo(-dw - 4, -dh - TH/2);
    ctx.lineTo(0, -dh - TH/2 + dw * 0.3);
    ctx.lineTo(0, -TH/2 + dw * 0.3);
    ctx.lineTo(-dw - 4, -TH/2);
    ctx.closePath();
    ctx.fillStyle = '#050508'; ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-dw, -dh - TH/2 + 4);
    ctx.lineTo(0, -dh - TH/2 + 4 + dw * 0.28);
    ctx.lineTo(0, -TH/2 + dw * 0.28);
    ctx.lineTo(-dw, -TH/2 + 4);
    ctx.closePath();
    const pg = ctx.createLinearGradient(-dw, -dh, 0, -dh);
    pg.addColorStop(0, isLocked ? '#1A0505' : '#051A10');
    pg.addColorStop(1, isLocked ? '#2A0808' : '#0A2A18');
    ctx.fillStyle = pg; ctx.fill();

    ctx.shadowColor = lockColor;
    ctx.shadowBlur  = 8 + pulse * 6 + urgPulse * 12;
    ctx.strokeStyle = lockColor + (hovered ? 'EE' : '88');
    ctx.lineWidth   = hovered ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(-dw, -dh - TH/2 + 4);
    ctx.lineTo(0, -dh - TH/2 + 4 + dw * 0.28);
    ctx.lineTo(0, -TH/2 + dw * 0.28);
    ctx.lineTo(-dw, -TH/2 + 4);
    ctx.closePath(); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle   = lockColor;
    ctx.shadowColor = lockColor; ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(-5, -TH/2 - 14, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font      = 'bold 9px monospace';
    ctx.fillStyle = hovered ? lockColor : C.dim;
    ctx.textAlign = 'center';
    ctx.fillText(door.aptNumber, -dw/2 - 2, -dh/2 - TH/2 - 8);

    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = lockColor; ctx.shadowBlur = 8 + urgPulse * 10;
    ctx.fillStyle = lockColor;
    ctx.fillText(isLocked ? '🔒' : '🔓', -dw/2, -dh - TH/2 - 2);
    ctx.shadowBlur = 0;

  } else {
    const dw = DW, dh = DH;

    ctx.beginPath();
    ctx.moveTo(dw + 4, -dh - TH/2);
    ctx.lineTo(0, -dh - TH/2 + dw * 0.3);
    ctx.lineTo(0, -TH/2 + dw * 0.3);
    ctx.lineTo(dw + 4, -TH/2);
    ctx.closePath();
    ctx.fillStyle = '#050508'; ctx.fill();

    ctx.beginPath();
    ctx.moveTo(dw, -dh - TH/2 + 4);
    ctx.lineTo(0, -dh - TH/2 + 4 + dw * 0.28);
    ctx.lineTo(0, -TH/2 + dw * 0.28);
    ctx.lineTo(dw, -TH/2 + 4);
    ctx.closePath();
    const pg = ctx.createLinearGradient(0, -dh, dw, -dh);
    pg.addColorStop(0, isLocked ? '#1A0505' : '#051A10');
    pg.addColorStop(1, isLocked ? '#2A0808' : '#0A2A18');
    ctx.fillStyle = pg; ctx.fill();

    ctx.shadowColor = lockColor;
    ctx.shadowBlur  = 8 + pulse * 6 + urgPulse * 12;
    ctx.strokeStyle = lockColor + (hovered ? 'EE' : '88');
    ctx.lineWidth   = hovered ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(dw, -dh - TH/2 + 4);
    ctx.lineTo(0, -dh - TH/2 + 4 + dw * 0.28);
    ctx.lineTo(0, -TH/2 + dw * 0.28);
    ctx.lineTo(dw, -TH/2 + 4);
    ctx.closePath(); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle   = lockColor;
    ctx.shadowColor = lockColor; ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(5, -TH/2 - 14, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.rotate(0.27);
    ctx.font      = 'bold 9px monospace';
    ctx.fillStyle = hovered ? lockColor : C.dim;
    ctx.textAlign = 'center';
    ctx.fillText(door.aptNumber, dw/2 + 2, -dh/2 - TH/2 - 8);
    ctx.restore();

    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = lockColor; ctx.shadowBlur = 8 + urgPulse * 10;
    ctx.fillStyle = lockColor;
    ctx.fillText(isLocked ? '🔒' : '🔓', dw/2, -dh - TH/2 - 2);
    ctx.shadowBlur = 0;
  }

  if (hovered) {
    ctx.beginPath();
    ctx.ellipse(0, 4, TW/3, TH/4, 0, 0, Math.PI * 2);
    const hg = ctx.createRadialGradient(0, 4, 0, 0, 4, TW/3);
    hg.addColorStop(0, lockColor + '30');
    hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg; ctx.fill();
  }

  if (!door.ownerName && door.isForRent) {
    ctx.font      = 'bold 8px monospace';
    ctx.fillStyle = C.yellow;
    ctx.shadowColor = C.yellow; ctx.shadowBlur = 6;
    ctx.textAlign = 'center';
    ctx.fillText('À LOUER', side === 'left' ? -DW/2 : DW/2, -WH + 8);
    ctx.shadowBlur = 0;
  }
  if (hasActivity) {
    ctx.font      = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👣', side === 'left' ? -DW/2 : DW/2, -WH + 20);
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  DESSIN — LAMPE PLAFOND
// ═══════════════════════════════════════════════════════════════
function drawCeilingLight(ctx, x, y, t, idx) {
  const phase  = t * 0.003 + idx * 1.2;
  const bright = 0.6 + Math.sin(phase) * 0.2;
  ctx.save();
  ctx.translate(x, y - WH + 6);
  const neonG = ctx.createLinearGradient(-18, 0, 18, 0);
  neonG.addColorStop(0, `rgba(0,224,255,0)`);
  neonG.addColorStop(0.3, `rgba(0,224,255,${bright})`);
  neonG.addColorStop(0.7, `rgba(0,224,255,${bright})`);
  neonG.addColorStop(1, `rgba(0,224,255,0)`);
  ctx.fillStyle   = neonG;
  ctx.shadowColor = C.cyan;
  ctx.shadowBlur  = 14;
  ctx.fillRect(-18, -2, 36, 3);
  ctx.shadowBlur = 0;
  const floorG = ctx.createRadialGradient(0, WH - 10, 0, 0, WH - 10, 40);
  floorG.addColorStop(0, `rgba(0,224,255,${bright * 0.08})`);
  floorG.addColorStop(1, 'transparent');
  ctx.fillStyle = floorG;
  ctx.beginPath(); ctx.ellipse(0, WH - 10, 40, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  DESSIN — AVATAR JOUEUR
// ═══════════════════════════════════════════════════════════════
function drawCorridorAvatar(ctx, x, y, t, name = 'Toi') {
  ctx.save(); ctx.translate(x, y);
  const bob = Math.sin(t * 0.007) * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 2, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0D1020';
  ctx.fillRect(-5, -12 + bob, 4, 12); ctx.fillRect(1, -12 + bob, 4, 12);
  const bodyG = ctx.createLinearGradient(0, -25 + bob, 0, -10 + bob);
  bodyG.addColorStop(0, '#1E2564'); bodyG.addColorStop(1, '#141840');
  ctx.fillStyle = bodyG;
  ctx.beginPath(); ctx.roundRect(-6, -25 + bob, 12, 14, 3); ctx.fill();
  ctx.strokeStyle = C.violet; ctx.lineWidth = 1; ctx.stroke();
  const headG = ctx.createRadialGradient(0, -31 + bob, 1, 0, -31 + bob, 6);
  headG.addColorStop(0, '#F5D8C5'); headG.addColorStop(1, '#E0C0A8');
  ctx.fillStyle = headG;
  ctx.beginPath(); ctx.arc(0, -31 + bob, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.violet; ctx.shadowColor = C.violet; ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.ellipse(0, -35 + bob, 6, 4, 0, Math.PI, 2 * Math.PI); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = C.cyan; ctx.shadowColor = C.cyan; ctx.shadowBlur = 3;
  ctx.beginPath(); ctx.arc(-2, -31 + bob, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, -31 + bob, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = C.cyan; ctx.textAlign = 'center';
  ctx.shadowColor = C.cyan; ctx.shadowBlur = 6;
  ctx.fillText(name, 0, -42 + bob);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function EtherWorldCorridor({
  floorId        = 1,
  floorNumber    = 1,
  buildingName   = 'EtherWorld Tower',
  characterId    = 1,
  characterName  = 'Toi',
  hasMagneticCard = true,
  onEnterApartment = null,
}) {
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const timeRef    = useRef(0);

  const [doors, setDoors]       = useState(() => generateDoors({ floorNumber }));
  const doorsRef = useRef(doors);
  useEffect(() => { doorsRef.current = doors; }, [doors]);

  const [camOffset, setCamOffset] = useState(0);
  const camRef    = useRef(0);
  const dragCam   = useRef({ active: false, startX: 0, startCam: 0 });

  const [hoveredDoor, setHoveredDoor]   = useState(null);
  const [selectedDoor, setSelectedDoor] = useState(null);
  const hoveredRef  = useRef(null);
  const selectedRef = useRef(null);
  useEffect(() => { hoveredRef.current  = hoveredDoor;  }, [hoveredDoor]);
  useEffect(() => { selectedRef.current = selectedDoor; }, [selectedDoor]);

  const [avatarPos, setAvatarPos]     = useState({ tx: CORRIDOR_W / 2, ty: 5 });
  const avatarRef = useRef({ tx: CORRIDOR_W / 2, ty: 5 });
  useEffect(() => { avatarRef.current = avatarPos; }, [avatarPos]);

  const [alerts, setAlerts]   = useState([]);
  const addAlert = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setAlerts(prev => [...prev.slice(-3), { id, msg, type }]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 5000);
  }, []);

  const [stats, setStats] = useState({ unlocked: 0, forRent: 0, occupied: 0 });

  useEffect(() => {
    fetch(`${API_URL}/buildings/floor/${floorId}`)
      .then(r => r.json())
      .then(data => {
        if (data.apartments) {
          setDoors(generateDoors({ floorNumber, apartments: data.apartments }));
        }
      })
      .catch(() => {});
  }, [floorId, floorNumber]);

  useEffect(() => {
    setStats({
      unlocked: doors.filter(d => !d.isLocked).length,
      forRent:  doors.filter(d => d.isForRent && !d.ownerName).length,
      occupied: doors.filter(d => !!d.ownerName).length,
    });
  }, [doors]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'AUTH', characterId }));
      ws.send(JSON.stringify({ type: 'JOIN_FLOOR', floorId }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      if (msg.type === 'DOOR_STATE_CHANGED') {
        setDoors(prev => prev.map(d =>
          d.aptId === msg.apartmentId
            ? { ...d, isLocked: msg.isLocked, justChanged: true }
            : d
        ));
        setTimeout(() => {
          setDoors(prev => prev.map(d =>
            d.aptId === msg.apartmentId ? { ...d, justChanged: false } : d
          ));
        }, 2000);
        addAlert(
          `${msg.isLocked ? '🔒' : '🔓'} Porte ${msg.apartmentId} ${msg.isLocked ? 'barrée' : 'débarrée'}`,
          msg.isLocked ? 'success' : 'warning'
        );
      }

      if (msg.type === 'DOOR_UNLOCKED_ALERT') {
        addAlert(`⚠️ Apt ${msg.apartmentId} ouvert — étage ${floorNumber}`, 'warning');
        setDoors(prev => prev.map(d =>
          d.aptId === msg.apartmentId ? { ...d, hasActivity: true } : d
        ));
      }

      if (msg.type === 'DOOR_FORCED') {
        addAlert(`🚨 PORTE FORCÉE — Apt ${msg.apartmentId} !`, 'danger');
        setDoors(prev => prev.map(d =>
          d.aptId === msg.apartmentId
            ? { ...d, isLocked: false, justChanged: true, hasActivity: true }
            : d
        ));
      }
    };
    return () => ws.close();
  }, [floorId, floorNumber, characterId, addAlert]);

  useEffect(() => { camRef.current = camOffset; }, [camOffset]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getBaseOffset = useCallback((canvas) => {
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.width / dpr;
    const H   = canvas.height / dpr;
    const ox = W / 2 + camRef.current;
    const oy = H * 0.45;
    return { ox, oy, W, H };
  }, []);

  useEffect(() => {
    const loop = (ts) => {
      timeRef.current = ts;
      renderScene();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const renderScene = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const dpr    = window.devicePixelRatio || 1;
    const { ox, oy, W, H } = getBaseOffset(canvas);
    const t      = timeRef.current;
    const drs    = doorsRef.current;
    const hov    = hoveredRef.current;
    const av     = avatarRef.current;

    ctx.save(); ctx.scale(dpr, dpr);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#05050A'); bg.addColorStop(1, '#0A0A14');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const drawCalls = [];

    for (let tx = 0; tx < CORRIDOR_W; tx++) {
      for (let ty = 0; ty < CORRIDOR_LEN; ty++) {
        const x = isoX(tx, ty, ox);
        const y = isoY(tx, ty, oy);
        const z = tx + ty;
        const even = (tx + ty) % 2 === 0;
        drawCalls.push({
          z, x, y,
          fn: () => drawTile(ctx, x, y, even ? '#0E1018' : '#111420', even ? '#12151E' : '#141820'),
        });
      }
    }

    for (let ty = 0; ty < CORRIDOR_LEN; ty++) {
      const x = isoX(0, ty, ox);
      const y = isoY(0, ty, oy);
      const z = ty - 0.5;
      drawCalls.push({ z, x, y, fn: () => drawWallLeft(ctx, x, y) });
    }

    for (let ty = 0; ty < CORRIDOR_LEN; ty++) {
      const x = isoX(CORRIDOR_W - 1, ty, ox);
      const y = isoY(CORRIDOR_W - 1, ty, oy);
      const z = CORRIDOR_W - 1 + ty - 0.3;
      drawCalls.push({ z, x, y, fn: () => drawWallRight(ctx, x, y) });
    }

    for (let ty = 2; ty < CORRIDOR_LEN; ty += 4) {
      const cx = CORRIDOR_W / 2 - 0.5;
      const x  = isoX(cx, ty, ox);
      const y  = isoY(cx, ty, oy);
      drawCalls.push({ z: cx + ty - 0.1, x, y, fn: () => drawCeilingLight(ctx, x, y, t, ty) });
    }

    for (const door of drs) {
      const x = isoX(door.tx, door.ty, ox);
      const y = isoY(door.tx, door.ty, oy);
      const z = door.tx + door.ty + (door.side === 'left' ? -0.4 : 0.4);
      drawCalls.push({ z, x, y, fn: () => drawDoorInWall(ctx, x, y, door, t, hov?.id === door.id) });
    }

    const ax = isoX(av.tx, av.ty, ox);
    const ay = isoY(av.tx, av.ty, oy);
    drawCalls.push({ z: av.tx + av.ty + 0.5, x: ax, y: ay, fn: () => drawCorridorAvatar(ctx, ax, ay, t, 'Toi') });

    drawCalls.sort((a, b) => a.z - b.z);
    drawCalls.forEach(dc => dc.fn());

    const vig = ctx.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }, [getBaseOffset]);

  const hitTestDoor = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect   = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const { ox, oy } = getBaseOffset(canvas);
    let   closest = null, minDist = 40;

    for (const door of doorsRef.current) {
      const x = isoX(door.tx, door.ty, ox);
      const y = isoY(door.tx, door.ty, oy);
      const dist = Math.hypot(sx - x, sy - y);
      if (dist < minDist) { minDist = dist; closest = door; }
    }
    return closest;
  }, [getBaseOffset]);

  const handleDoorAction = useCallback(async (door, action) => {
    if (!hasMagneticCard && door.ownerId !== characterId) {
      addAlert('❌ Pas de carte magnétique pour cet appart', 'danger');
      return;
    }
    if (action === 'enter') {
      onEnterApartment?.(door.aptId);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/doors/${door.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, action: door.isLocked ? 'unlock' : 'lock' }),
      });
      const data = await res.json();
      if (data.success) {
        setDoors(prev => prev.map(d => d.id === door.id ? { ...d, isLocked: data.isLocked, justChanged: true } : d));
        addAlert(data.isLocked ? '🔒 Porte barrée' : '🔓 Porte débarrée', 'success');
        setTimeout(() => setDoors(prev => prev.map(d => d.id === door.id ? { ...d, justChanged: false } : d)), 2000);
      }
    } catch {
      setDoors(prev => prev.map(d => d.id === door.id ? { ...d, isLocked: !d.isLocked, justChanged: true } : d));
      addAlert('🔓 Porte (mode local)', 'warning');
      setTimeout(() => setDoors(prev => prev.map(d => d.id === door.id ? { ...d, justChanged: false } : d)), 2000);
    }
  }, [hasMagneticCard, characterId, addAlert, onEnterApartment]);

  const touchStart = useRef({ x: 0, y: 0, time: 0, moved: false });

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now(), moved: false };
    dragCam.current = { active: true, startX: t.clientX, startCam: camRef.current };
    const door = hitTestDoor(t.clientX, t.clientY);
    setHoveredDoor(door);
  }, [hitTestDoor]);

  const handleTouchMove = useCallback((e) => {
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    if (Math.abs(dx) > 8) touchStart.current.moved = true;
    if (dragCam.current.active) {
      const newCam = dragCam.current.startCam + (t.clientX - dragCam.current.startX);
      setCamOffset(Math.max(-400, Math.min(400, newCam)));
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    dragCam.current.active = false;
    if (touchStart.current.moved) return;
    const t = e.changedTouches[0];
    const door = hitTestDoor(t.clientX, t.clientY);
    if (door) {
      setSelectedDoor(door);
    } else {
      setSelectedDoor(null);
    }
  }, [hitTestDoor]);

  const handleMouseMove = useCallback((e) => {
    const door = hitTestDoor(e.clientX, e.clientY);
    setHoveredDoor(door);
  }, [hitTestDoor]);

  const handleClick = useCallback((e) => {
    const door = hitTestDoor(e.clientX, e.clientY);
    if (door) setSelectedDoor(door);
    else setSelectedDoor(null);
  }, [hitTestDoor]);

  const sel = selectedDoor;

  return (
    <div style={{ position:'fixed', inset:0, background:C.bg, fontFamily:"'Segoe UI',monospace", display:'flex', flexDirection:'column', overflow:'hidden', userSelect:'none' }}>

      {/* HEADER */}
      <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:20, background:'linear-gradient(180deg,rgba(5,5,10,0.98) 0%,transparent 100%)', padding:'12px 16px 28px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${C.violet},${C.cyan})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:`0 0 14px ${C.violet}66` }}>🏢</div>
          <div>
            <div style={{ fontSize:14, fontWeight:900, color:C.light, letterSpacing:'0.04em' }}>{buildingName}</div>
            <div style={{ fontSize:10, color:C.cyan, letterSpacing:'0.18em', marginTop:1 }}>
              {floorNumber === 0 ? 'REZ-DE-CHAUSSÉE' : `${floorNumber === 4 ? 'PENTHOUSE' : `${floorNumber}ER`} ÉTAGE`} — COULOIR
            </div>
          </div>
        </div>

        {/* Stats live */}
        <div style={{ display:'flex', gap:6 }}>
          {[
            { label:'🔓 OUVERTES', val: stats.unlocked, c: stats.unlocked > 0 ? C.orange : C.dim },
            { label:'🏠 OCCUPÉS',  val: stats.occupied, c: C.cyan },
            { label:'🔑 À LOUER',  val: stats.forRent,  c: C.yellow },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'4px 8px', textAlign:'center', minWidth:52 }}>
              <div style={{ fontSize:13, fontWeight:800, color: s.c }}>{s.val}</div>
              <div style={{ fontSize:7, color:C.dim, letterSpacing:'0.08em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CANVAS */}
      <canvas
        ref={canvasRef}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', cursor: hoveredDoor ? 'pointer' : 'grab', touchAction:'none' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* HINT SCROLL */}
      <div style={{ position:'absolute', top:'50%', left:12, transform:'translateY(-50%)', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', gap:4, opacity:0.4 }}>
        <div style={{ fontSize:18, color:C.cyan }}>◀</div>
        <div style={{ fontSize:8, color:C.dim, writingMode:'vertical-rl', letterSpacing:'0.15em' }}>FAIRE DÉFILER</div>
      </div>
      <div style={{ position:'absolute', top:'50%', right:12, transform:'translateY(-50%)', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', gap:4, opacity:0.4 }}>
        <div style={{ fontSize:18, color:C.cyan }}>▶</div>
        <div style={{ fontSize:8, color:C.dim, writingMode:'vertical-rl', letterSpacing:'0.15em' }}>FAIRE DÉFILER</div>
      </div>

      {/* ALERTES TEMPS RÉEL */}
      <div style={{ position:'absolute', top:80, right:12, zIndex:50, display:'flex', flexDirection:'column', gap:6, maxWidth:240 }}>
        {alerts.map(a => (
          <div key={a.id} style={{ background: a.type==='danger'?'rgba(255,58,58,0.15)':a.type==='warning'?'rgba(255,154,58,0.15)':'rgba(0,255,157,0.1)', border:`1px solid ${a.type==='danger'?C.red:a.type==='warning'?C.orange:C.green}55`, borderRadius:10, padding:'8px 12px', fontSize:11, color:C.light, fontWeight:600, backdropFilter:'blur(10px)', animation:'slideIn 0.3s ease' }}>
            {a.msg}
          </div>
        ))}
      </div>

      {/* PANNEAU PORTE SÉLECTIONNÉE */}
      {sel && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:40, background:'rgba(6,6,14,0.97)', borderTop:`1px solid ${sel.isLocked?C.red:C.green}44`, borderRadius:'20px 20px 0 0', padding:'18px 20px 30px', backdropFilter:'blur(20px)' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
            <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.12)' }} />
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:28 }}>{sel.isLocked ? '🔒' : '🔓'}</span>
                <div>
                  <div style={{ fontSize:18, fontWeight:900, color:C.light }}>{sel.aptNumber}</div>
                  <div style={{ fontSize:11, color: sel.isLocked ? C.red : C.green, marginTop:2 }}>
                    {sel.isLocked ? 'VERROUILLÉ' : '⚠️ DÉVERROUILLÉ — ATTENTION'}
                  </div>
                </div>
              </div>
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4 }}>
                <div style={{ fontSize:12, color:C.dim }}>
                  👤 {sel.ownerName ?? 'Inoccupé'} &nbsp;·&nbsp; 💰 {sel.rentPrice}$/mois
                </div>
                <div style={{ fontSize:11, color: sel.isForRent && !sel.ownerName ? C.yellow : C.dim }}>
                  {sel.isForRent && !sel.ownerName ? '🔑 Disponible à la location' : sel.ownerName ? '🏠 Occupé' : '🚫 Non disponible'}
                </div>
              </div>
            </div>

            <button onClick={() => setSelectedDoor(null)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'8px 12px', color:C.dim, fontSize:13, cursor:'pointer' }}>✕</button>
          </div>

          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <DoorActionBtn
              icon="🚪" label="Entrer"
              color={C.cyan}
              disabled={sel.isLocked && sel.ownerId !== characterId}
              onPress={() => handleDoorAction(sel, 'enter')}
            />

            {sel.ownerId === characterId && (
              <DoorActionBtn
                icon={sel.isLocked ? '🔓' : '🔒'}
                label={sel.isLocked ? 'Débarrer' : 'Barrer'}
                color={sel.isLocked ? C.green : C.red}
                onPress={() => handleDoorAction(sel, 'toggle')}
              />
            )}

            {sel.isForRent && !sel.ownerName && (
              <DoorActionBtn
                icon="🔑" label={`Louer — ${sel.rentPrice}$`}
                color={C.yellow}
                onPress={async () => {
                  try {
                    const res = await fetch(`${API_URL}/buildings/apartment/${sel.aptId}/rent`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ characterId }),
                    });
                    const d = await res.json();
                    if (d.success) {
                      addAlert(`✅ Appart ${sel.aptNumber} loué ! Carte: ${d.cardUid}`, 'success');
                      setSelectedDoor(null);
                    } else addAlert('❌ ' + d.error, 'danger');
                  } catch { addAlert('❌ Impossible de louer', 'danger'); }
                }}
              />
            )}

            {sel.isLocked && sel.ownerId !== characterId && (
              <DoorActionBtn
                icon="🔧" label="Crocheter"
                color={C.magenta}
                onPress={async () => {
                  addAlert('🔧 Crochetage en cours...', 'warning');
                  try {
                    const res = await fetch(`${API_URL}/doors/${sel.id}/lockpick`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ characterId }),
                    });
                    const d = await res.json();
                    if (d.success) {
                      setDoors(prev => prev.map(dr => dr.id === sel.id ? { ...dr, isLocked: false } : dr));
                      addAlert('✅ Crochetage réussi !', 'success');
                    } else addAlert('❌ Crochetage échoué !', 'danger');
                  } catch {
                    addAlert(Math.random() > 0.4 ? '✅ Crochetage réussi (local) !' : '❌ Crochetage échoué !', 'warning');
                  }
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* LÉGENDE MINIMAP */}
      {!sel && (
        <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)', zIndex:30, display:'flex', gap:12, alignItems:'center', background:'rgba(6,6,14,0.85)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'8px 18px', backdropFilter:'blur(12px)' }}>
          <LegendDot color={C.red}    label="Barré" />
          <LegendDot color={C.green}  label="Ouvert ⚠️" />
          <LegendDot color={C.yellow} label="À louer" />
          <LegendDot color={C.cyan}   label="Occupé" />
          <div style={{ width:1, height:16, background:'rgba(255,255,255,0.1)' }} />
          <div style={{ fontSize:10, color:C.dim }}>← Glisser →</div>
        </div>
      )}

      {/* MINIMAP 20 PORTES */}
      <div style={{ position:'absolute', bottom:sel ? 220 : 70, right:12, zIndex:30, background:'rgba(6,6,14,0.9)', border:`1px solid ${C.violet}33`, borderRadius:12, padding:'8px', backdropFilter:'blur(10px)' }}>
        <div style={{ fontSize:8, color:C.dim, letterSpacing:'0.12em', marginBottom:6, textAlign:'center' }}>PLAN ÉTAGE</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(10,10px)', gap:2 }}>
          {doors.map((door, i) => (
            <div key={door.id} title={door.aptNumber} onClick={() => setSelectedDoor(door)} style={{ width:10, height:10, borderRadius:2, background: door.isLocked ? (door.ownerName ? C.cyan + '88' : C.dim + '44') : C.green + 'CC', border: sel?.id === door.id ? `1px solid ${C.light}` : '1px solid transparent', cursor:'pointer', transition:'all 0.2s', boxShadow: !door.isLocked ? `0 0 4px ${C.green}` : 'none' }} />
          ))}
        </div>
        <div style={{ fontSize:7, color:C.dim, marginTop:5, textAlign:'center' }}>
          {doors.filter(d => !d.isLocked).length} porte(s) ouvertes
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>
    </div>
  );
}

function DoorActionBtn({ icon, label, color, onPress, disabled = false }) {
  return (
    <button
      onClick={!disabled ? onPress : undefined}
      style={{ background: disabled ? 'rgba(255,255,255,0.03)' : `rgba(${hexToRgb(color)},0.14)`, border: `1px solid ${disabled ? 'rgba(255,255,255,0.08)' : color + '55'}`, borderRadius:12, padding:'10px 16px', color: disabled ? 'rgba(255,255,255,0.25)' : C.light, fontSize:13, fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:8, transition:'all 0.15s', boxShadow: !disabled ? `0 0 10px ${color}22` : 'none' }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ fontSize:11 }}>{label}</span>
    </button>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ width:8, height:8, borderRadius:'50%', background:color, boxShadow:`0 0 5px ${color}` }} />
      <span style={{ fontSize:10, color:'rgba(242,242,242,0.5)' }}>{label}</span>
    </div>
  );
}

function hexToRgb(hex = '#000000') {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `${r},${g},${b}`;
}