import { HEX_SIZE, HEX_COLOR, HEX_LABEL, RESEARCH_GEN_TIME, RESEARCH_RECIPES, workerLabel } from './config.js';
import { hexToPixel, hexPath, hexKey } from './hex.js';
import { getWorkers, sickHealTime } from './workers.js';
import { getState } from './state.js';
import { isGearModeActive } from './gearMode.js';

// ── Visual constants ──────────────────────────────────────────────────────────

const GAP       = 6;               // gap between hex tiles (visual separation)
const DEPTH     = 5;               // 3D extrusion depth (px)
const DS        = HEX_SIZE - GAP;  // drawn size of each hex face
const LIGHT     = { x: -0.707, y: -0.707 }; // normalised vector toward light source (upper-left)

// ── Preloaded hex images ──────────────────────────────────────────────────────

function _loadImg(src) { const i = new Image(); i.src = src; return i; }

const _HEX_IMG = {
  starter:      _loadImg('assets/HEX_villaggio.png'),
  field:        _loadImg('assets/HEX_campo_coltivazione.png'),
  quarry:       _loadImg('assets/HEX_cava_di_pietra.png'),
  desert:       _loadImg('assets/HEX_deserto.png'),
  forest:       _loadImg('assets/HEX_foresta.png'),
  lake:         _loadImg('assets/HEX_lago.png'),
  pasture:      _loadImg('assets/HEX_pascolo.png'),
  ricerca:      _loadImg('assets/HEX_ricerca.png'),
  caccia:       _loadImg('assets/HEX_caccia.png'),
  cucina:       _loadImg('assets/HEX_cucina.png'),
  mine:         _loadImg('assets/HEX_miniera.png'),
  fabbro:       _loadImg('assets/HEX_fabbro.png'),
  falegnameria: _loadImg('assets/HEX_falegname.png'),
  ospedale:     _loadImg('assets/HEX_ospedale.png'),
  casa:         _loadImg('assets/HEX_casa.png'),
};

// ── Module state ──────────────────────────────────────────────────────────────

let _selectedKey = null;
export function setSelectedHex(k) { _selectedKey = k; }
export function getSelectedHex()  { return _selectedKey; }

// ── Hover animation state ─────────────────────────────────────────────────────

let _hoveredKey  = null;
const _hoverTime = new Map(); // key → timestamp of hover start

export function setHoveredHex(key) {
  if (key === _hoveredKey) return;
  // New hover target: record start time
  if (key) _hoverTime.set(key, Date.now());
  _hoveredKey = key;
}

/**
 * Applies a brief "lift + flip squish" transform centred on (cx, cy).
 * Call ctx.save() before and ctx.restore() after.
 * Returns true if an animation is still in progress (needs continuous rendering).
 */
function _applyHoverAnim(ctx, cx, cy, key) {
  const t0 = _hoverTime.get(key);
  if (t0 == null) return false;

  const DUR = 220; // ms
  const t   = Math.min(1, (Date.now() - t0) / DUR);
  const s   = Math.sin(t * Math.PI);          // 0 → 1 → 0 bell curve
  const scaleX  = 1 - 0.09 * s;              // subtle X squish (flip illusion)
  const liftY   = -4 * s;                    // lift up by 4px at peak

  if (t >= 1) { _hoverTime.delete(key); return false; }

  ctx.translate(cx, cy + liftY);
  ctx.scale(scaleX, 1);
  ctx.translate(-cx, -(cy + liftY));
  return true;
}

// ── Colour utilities ──────────────────────────────────────────────────────────

function _rgb(hex) {
  const n = parseInt(hex.replace('#',''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
function _hex(r, g, b) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function lighten(c, a) { const [r,g,b]=_rgb(c); return _hex(r+a,g+a,b+a); }
function darken(c, a)  { const [r,g,b]=_rgb(c); return _hex(r-a,g-a,b-a); }
function rgba(c, a)    { const [r,g,b]=_rgb(c); return `rgba(${r},${g},${b},${a})`; }

// ── Hex vertex helper ─────────────────────────────────────────────────────────

function _verts(cx, cy, size) {
  const v = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i + Math.PI / 6;
    v.push({ x: cx + size * Math.cos(a), y: cy + size * Math.sin(a) });
  }
  return v;
}

// ── Background (world-space hex grid + vignette) ──────────────────────────────

let _bgGrid = null; // cached offscreen canvas
export function invalidateBg() { _bgGrid = null; }

function _buildBgGrid(camera, w, h) {
  const oc = document.createElement('canvas');
  oc.width = w; oc.height = h;
  const bc = oc.getContext('2d');
  bc.fillStyle = '#06080f';
  bc.fillRect(0, 0, w, h);
  return oc;
}

function _drawBackground(ctx, camera, w, h) {
  if (!_bgGrid || _bgGrid.width !== w || _bgGrid.height !== h) {
    _bgGrid = _buildBgGrid(camera, w, h);
  }
  ctx.drawImage(_bgGrid, 0, 0);

  // World-space faint hex grid (moves with camera)
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);

  const invS  = 1 / camera.scale;
  const left  = (-camera.x) * invS - HEX_SIZE * 3;
  const top   = (-camera.y) * invS - HEX_SIZE * 3;
  const right = (w - camera.x) * invS + HEX_SIZE * 3;
  const bot   = (h - camera.y) * invS + HEX_SIZE * 3;
  const step  = HEX_SIZE * Math.sqrt(3);
  const vstep = HEX_SIZE * 1.5;
  const qFrom = Math.floor(left / step) - 1;
  const qTo   = Math.ceil(right / step) + 1;
  const rFrom = Math.floor(top / vstep) - 1;
  const rTo   = Math.ceil(bot / vstep) + 1;

  ctx.strokeStyle = 'rgba(255,255,255,0.028)';
  ctx.lineWidth   = 0.7;
  for (let r = rFrom; r <= rTo; r++) {
    for (let q = qFrom; q <= qTo; q++) {
      const { x, y } = hexToPixel(q, r);
      hexPath(ctx, x, y, HEX_SIZE - 1);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Screen-space vignette
  const vig = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.68);
  vig.addColorStop(0,   'rgba(0,0,0,0)');
  vig.addColorStop(0.6, 'rgba(0,0,0,0.1)');
  vig.addColorStop(1,   'rgba(0,0,0,0.65)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

// ── 3D depth face (extruded side of tile) ─────────────────────────────────────

function _drawDepth(ctx, cx, cy, color) {
  const vT = _verts(cx,          cy,          DS);
  const vB = _verts(cx + DEPTH*0.3, cy + DEPTH, DS);

  // Only the lower-facing edges are visible as side faces
  // For CW pointy-top hex: edges 5→0, 0→1, 1→2, 2→3
  const sideIdx = [5, 0, 1, 2];
  for (const i of sideIdx) {
    const j  = (i + 1) % 6;
    const ex = vT[j].x - vT[i].x,  ey = vT[j].y - vT[i].y;
    const len = Math.sqrt(ex*ex + ey*ey);
    // Outward normal for CW polygon
    const nx = ey/len, ny = -ex/len;
    const dot = nx * LIGHT.x + ny * LIGHT.y;
    const shade = 55 + Math.round(Math.abs(dot) * 25);

    ctx.beginPath();
    ctx.moveTo(vT[i].x, vT[i].y);
    ctx.lineTo(vT[j].x, vT[j].y);
    ctx.lineTo(vB[j].x, vB[j].y);
    ctx.lineTo(vB[i].x, vB[i].y);
    ctx.closePath();
    ctx.fillStyle = darken(color, shade);
    ctx.fill();
    // Thin seam
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

// ── Top face: gradient + texture ──────────────────────────────────────────────

function _drawFace(ctx, cx, cy, color, type) {
  const g = ctx.createLinearGradient(
    cx - DS*0.55, cy - DS*0.65,
    cx + DS*0.45, cy + DS*0.55
  );
  g.addColorStop(0,    lighten(color, 48));
  g.addColorStop(0.28, lighten(color, 22));
  g.addColorStop(0.60, color);
  g.addColorStop(1,    darken(color, 38));

  hexPath(ctx, cx, cy, DS);
  ctx.fillStyle = g;
  ctx.fill();

  _drawTexture(ctx, cx, cy, DS, type);
}

function _drawTexture(ctx, cx, cy, size, type) {
  hexPath(ctx, cx, cy, size);
  ctx.save();
  ctx.clip();

  const _img = _HEX_IMG[type];
  if (_img && _img.complete && _img.naturalWidth > 0) {
    const hw = size * Math.sqrt(3) / 2;
    ctx.drawImage(_img, cx - hw, cy - size, hw * 2, size * 2);
  } else switch (type) {
    case 'lake': {
      // Water shimmer — radial highlight
      const s = ctx.createRadialGradient(cx-size*0.25, cy-size*0.25, 0, cx, cy, size*0.95);
      s.addColorStop(0,   'rgba(200,240,255,0.22)');
      s.addColorStop(0.45,'rgba(120,200,255,0.06)');
      s.addColorStop(1,   'rgba(0,0,40,0.18)');
      ctx.fillStyle = s;
      ctx.fillRect(cx-size, cy-size, size*2, size*2);
      // Ripple arcs
      ctx.strokeStyle = 'rgba(180,230,255,0.12)';
      ctx.lineWidth = 1;
      for (let r = 0; r < 3; r++) {
        ctx.beginPath();
        ctx.arc(cx, cy + r*size*0.22, size*(0.3+r*0.2), 0, Math.PI*2);
        ctx.stroke();
      }
      break;
    }
    case 'forest': {
      // Canopy dots
      for (let i = 0; i < 7; i++) {
        const a = i * Math.PI*2/7, r = size*0.32;
        ctx.beginPath();
        ctx.arc(cx + r*Math.cos(a), cy + r*Math.sin(a), size*0.13, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, size*0.13, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fill();
      break;
    }
    case 'quarry':
    case 'mine': {
      // Rock cracks
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 1.2;
      const cracks = [
        [[-0.15,-0.35],[0.22,0.08],[-0.04,0.38]],
        [[0.10,-0.22],[-0.18,0.04]],
        [[-0.28,0.18],[0.05,0.30]],
      ];
      for (const pts of cracks) {
        ctx.beginPath();
        pts.forEach(([px,py],k) => {
          const m = k===0 ? ctx.moveTo.bind(ctx) : ctx.lineTo.bind(ctx);
          m(cx+px*size, cy+py*size);
        });
        ctx.stroke();
      }
      break;
    }
    case 'field': {
      // Furrow rows
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.9;
      for (let row = -4; row <= 4; row++) {
        ctx.beginPath();
        ctx.moveTo(cx - size, cy + row*size*0.165);
        ctx.lineTo(cx + size, cy + row*size*0.165);
        ctx.stroke();
      }
      break;
    }
    case 'pasture': {
      // Grass tufts
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      for (let i = 0; i < 9; i++) {
        const a = i*Math.PI*2/9, r = size*0.33;
        ctx.beginPath();
        ctx.arc(cx+r*Math.cos(a), cy+r*Math.sin(a), size*0.065, 0, Math.PI*2);
        ctx.fill();
      }
      break;
    }
    case 'desert': {
      // Sand dune waves
      ctx.strokeStyle = 'rgba(255,220,120,0.18)';
      ctx.lineWidth = 1.2;
      for (let row = -2; row <= 2; row++) {
        ctx.beginPath();
        ctx.moveTo(cx - size, cy + row*size*0.22);
        ctx.quadraticCurveTo(cx - size*0.3, cy + row*size*0.22 - size*0.10, cx, cy + row*size*0.22);
        ctx.quadraticCurveTo(cx + size*0.3, cy + row*size*0.22 + size*0.10, cx + size, cy + row*size*0.22);
        ctx.stroke();
      }
      // Cactus dot hint
      ctx.fillStyle = 'rgba(80,140,60,0.22)';
      ctx.beginPath();
      ctx.arc(cx + size*0.18, cy - size*0.15, size*0.06, 0, Math.PI*2);
      ctx.fill();
      break;
    }
    case 'starter': break;
    case 'ricerca': {
      // Circuit dots
      ctx.fillStyle = 'rgba(100,150,255,0.25)';
      const pts = [[-0.3,-0.3],[0.3,-0.3],[0,0],[0.3,0.3],[-0.3,0.3]];
      for (const [px,py] of pts) {
        ctx.beginPath();
        ctx.arc(cx+px*size, cy+py*size, size*0.07, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(100,150,255,0.20)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cx-size*0.3,cy-size*0.3); ctx.lineTo(cx,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+size*0.3,cy-size*0.3); ctx.lineTo(cx,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+size*0.3,cy+size*0.3); ctx.stroke();
      break;
    }
    case 'cucina': {
      // Flame shape
      ctx.strokeStyle = 'rgba(255,140,30,0.35)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        const ox = (i-1)*size*0.22;
        ctx.beginPath();
        ctx.moveTo(cx+ox, cy+size*0.25);
        ctx.quadraticCurveTo(cx+ox-size*0.1, cy, cx+ox, cy-size*0.25);
        ctx.quadraticCurveTo(cx+ox+size*0.1, cy, cx+ox, cy+size*0.25);
        ctx.stroke();
      }
      break;
    }
    case 'fabbro': {
      // Crossed hammer marks
      ctx.strokeStyle = 'rgba(180,180,180,0.30)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx-size*0.25,cy-size*0.25); ctx.lineTo(cx+size*0.25,cy+size*0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+size*0.25,cy-size*0.25); ctx.lineTo(cx-size*0.25,cy+size*0.25); ctx.stroke();
      break;
    }
    case 'casa': {
      // Window grid
      ctx.strokeStyle = 'rgba(255,220,140,0.30)';
      ctx.lineWidth = 0.8;
      for (const [ox,oy] of [[-0.18,-0.12],[0.12,-0.12],[-0.18,0.18],[0.12,0.18]]) {
        ctx.strokeRect(cx+ox*size, cy+oy*size, size*0.18, size*0.18);
      }
      break;
    }
    case 'ospedale': {
      // Red cross
      ctx.fillStyle = 'rgba(220,30,30,0.30)';
      ctx.fillRect(cx-size*0.07, cy-size*0.30, size*0.14, size*0.60);
      ctx.fillRect(cx-size*0.30, cy-size*0.07, size*0.60, size*0.14);
      break;
    }
    case 'falegnameria': {
      // Wood grain
      ctx.strokeStyle = 'rgba(180,120,60,0.25)';
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - size, cy + i*size*0.18);
        ctx.quadraticCurveTo(cx, cy + i*size*0.18 + size*0.06, cx + size, cy + i*size*0.18);
        ctx.stroke();
      }
      break;
    }
    case 'caccia': {
      // Animal tracks (dots)
      ctx.fillStyle = 'rgba(80,180,60,0.28)';
      const tracks = [[-0.15,0.25],[-0.05,0.10],[0.10,0.00],[0.20,-0.15],[0.05,-0.28]];
      for (const [px,py] of tracks) {
        ctx.beginPath();
        ctx.arc(cx+px*size, cy+py*size, size*0.055, 0, Math.PI*2);
        ctx.fill();
      }
      break;
    }
  }

  // Universal: subtle inner top-left highlight (ambient occlusion inversion)
  const ao = ctx.createRadialGradient(cx-size*0.3, cy-size*0.4, 0, cx, cy, size);
  ao.addColorStop(0,   'rgba(255,255,255,0.07)');
  ao.addColorStop(0.6, 'rgba(255,255,255,0.01)');
  ao.addColorStop(1,   'rgba(0,0,0,0.10)');
  ctx.fillStyle = ao;
  ctx.fillRect(cx-size, cy-size, size*2, size*2);

  ctx.restore();
}

// ── Bevel edges (per-edge light/shadow stroke) ─────────────────────────────────

function _drawBevel(ctx, cx, cy) {
  const v = _verts(cx, cy, DS);
  for (let i = 0; i < 6; i++) {
    const j  = (i+1) % 6;
    const ex = v[j].x - v[i].x,  ey = v[j].y - v[i].y;
    const len = Math.sqrt(ex*ex + ey*ey);
    const nx = ey/len, ny = -ex/len;          // outward normal (CW polygon)
    const dot = nx * LIGHT.x + ny * LIGHT.y;  // illumination factor

    ctx.beginPath();
    ctx.moveTo(v[i].x, v[i].y);
    ctx.lineTo(v[j].x, v[j].y);

    if (dot > 0.15) {
      ctx.strokeStyle = `rgba(255,255,255,${0.10 + dot * 0.40})`;
      ctx.lineWidth   = dot > 0.55 ? 2 : 1.5;
    } else if (dot < -0.15) {
      ctx.strokeStyle = `rgba(0,0,0,${0.15 + Math.abs(dot) * 0.35})`;
      ctx.lineWidth   = 1.5;
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth   = 1;
    }
    ctx.stroke();
  }
}

// ── Label (icon + name) ───────────────────────────────────────────────────────

const _ICONS = {
  starter:'🏘', field:'🌾',  quarry:'🪨', lake:'💧',
  forest:'🌲',  pasture:'🐄', desert:'🏜', mine:'⛏',
  ricerca:'🔬', cucina:'🍳', fabbro:'🔨', casa:'🏠',
  ospedale:'🏥', falegnameria:'🪚', caccia:'🎯',
};

function _drawLabel(ctx, cx, cy, type) {
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur   = 4;

  ctx.font      = `${Math.round(DS*0.27)}px sans-serif`;
  ctx.fillText(_ICONS[type] ?? '', cx, cy - DS*0.10);
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.font      = `600 ${Math.round(DS*0.17)}px 'Palatino Linotype',Palatino,Georgia,serif`;
  ctx.fillText(HEX_LABEL[type] ?? type, cx, cy + DS*0.30);
  ctx.restore();
}

function _drawUpgradeBadge(ctx, cx, cy, level) {
  if (!level || level <= 1) return;

  // Position: bottom of hex, inscribed within the lower hex edge
  // For a flat-topped hex, bottom vertex is at cy + DS.
  // We place the star centred on the bottom vertex area.
  const R  = DS * 0.34;           // star outer radius (larger)
  const bx = cx;
  const by = cy + DS * 0.58;      // slightly above the bottom edge

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur  = 5;

  // Draw 5-pointed star
  const points = 5;
  const inner  = R * 0.42;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r     = i % 2 === 0 ? R : inner;
    const px    = bx + r * Math.cos(angle);
    const py    = by + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();

  // Gold gradient fill
  const grad = ctx.createRadialGradient(bx, by - R * 0.2, 0, bx, by, R);
  grad.addColorStop(0, '#ffe566');
  grad.addColorStop(1, '#c07800');
  ctx.fillStyle = grad;
  ctx.fill();

  // Thin dark outline
  ctx.shadowBlur  = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth   = 0.8;
  ctx.stroke();

  // Level number in centre — fixed size regardless of star radius
  ctx.fillStyle    = '#3a1e00';
  ctx.font         = `bold 9px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(level, bx, by + 0.5);
  ctx.restore();
}

// ── Draw one owned hex ────────────────────────────────────────────────────────

function _drawOwnedHex(ctx, cx, cy, hex, isSelected, pulse) {
  const color = HEX_COLOR[hex.type] ?? '#444';

  // 1 ── Drop shadow
  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,20,0.65)';
  ctx.shadowBlur    = 10;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 4;
  hexPath(ctx, cx, cy, DS);
  ctx.fillStyle = color; // fill needed to trigger shadow
  ctx.fill();
  ctx.restore();

  // 2 ── Extruded depth faces
  _drawDepth(ctx, cx, cy, color);

  // 3 ── Top face + texture
  _drawFace(ctx, cx, cy, color, hex.type);

  // 4 ── Bevel edge highlights / shadows
  _drawBevel(ctx, cx, cy);

  // 5 ── Selection ring + animated glow
  if (isSelected) {
    const glow = 0.45 + pulse * 0.55;
    ctx.save();
    ctx.shadowColor = `rgba(255,215,0,${glow * 0.6})`;
    ctx.shadowBlur  = 14 + pulse * 6;
    hexPath(ctx, cx, cy, DS + 1);
    ctx.strokeStyle = `rgba(255,215,0,${0.7 + pulse * 0.3})`;
    ctx.lineWidth   = 2.5;
    ctx.stroke();
    // Outer soft ring
    hexPath(ctx, cx, cy, DS + 4);
    ctx.strokeStyle = `rgba(255,215,0,${0.15 * pulse})`;
    ctx.lineWidth   = 6;
    ctx.stroke();
    ctx.restore();
  }

  // 6 ── Labels
  _drawLabel(ctx, cx, cy, hex.type);
  _drawUpgradeBadge(ctx, cx, cy, hex.level);
}

// ── Draw one purchasable (unknown) hex ───────────────────────────────────────

function _drawPurchasableHex(ctx, cx, cy, isSelected, pulse) {
  // Shadow
  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,20,0.5)';
  ctx.shadowBlur    = 6;
  ctx.shadowOffsetY = 3;
  hexPath(ctx, cx, cy, DS);
  ctx.fillStyle = '#0a0c16';
  ctx.fill();
  ctx.restore();

  // Face gradient
  hexPath(ctx, cx, cy, DS);
  const fg = ctx.createRadialGradient(cx-DS*0.2, cy-DS*0.2, 0, cx, cy, DS);
  fg.addColorStop(0,   'rgba(40,40,70,0.9)');
  fg.addColorStop(0.7, 'rgba(12,12,28,0.95)');
  fg.addColorStop(1,   'rgba(0,0,0,1)');
  ctx.fillStyle = fg;
  ctx.fill();

  // Bevel (subtle)
  const v = _verts(cx, cy, DS);
  for (let i = 0; i < 6; i++) {
    const j  = (i+1) % 6;
    const ex = v[j].x-v[i].x, ey = v[j].y-v[i].y;
    const len = Math.sqrt(ex*ex+ey*ey);
    const dot = (ey/len)*LIGHT.x + (-ex/len)*LIGHT.y;
    ctx.beginPath();
    ctx.moveTo(v[i].x, v[i].y);
    ctx.lineTo(v[j].x, v[j].y);
    ctx.strokeStyle = dot > 0
      ? `rgba(255,255,255,${0.04 + dot*0.10})`
      : `rgba(0,0,0,${0.15 + Math.abs(dot)*0.15})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // "?" label
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur   = 4;
  ctx.fillStyle    = isSelected
    ? `rgba(255,215,0,${0.65 + pulse*0.35})`
    : 'rgba(80,80,120,0.7)';
  ctx.font = `bold ${Math.round(DS*0.28)}px 'Palatino Linotype',Georgia,serif`;
  ctx.fillText('?', cx, cy);
  ctx.restore();

  // Selection highlight
  if (isSelected) {
    ctx.save();
    ctx.shadowColor = `rgba(255,215,0,${0.4*pulse})`;
    ctx.shadowBlur  = 10 + pulse*6;
    hexPath(ctx, cx, cy, DS + 1);
    ctx.strokeStyle = `rgba(255,215,0,${0.5 + 0.4*pulse})`;
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.restore();
  }
}

// ── Trip lines ────────────────────────────────────────────────────────────────

function _drawTripLines(ctx, workers) {
  const base  = hexToPixel(0, 0);
  const dashOffset = (Date.now() / 60) % 20; // animated dash march

  ctx.save();
  for (const w of workers) {
    if (w.status === 'idle') continue;
    const dx = w.targetX - base.x, dy = w.targetY - base.y;
    const dist = Math.hypot(dx, dy);

    // Glowing outer line
    ctx.setLineDash([8, 7]);
    ctx.lineDashOffset = -dashOffset;
    ctx.strokeStyle  = 'rgba(255,200,60,0.22)';
    ctx.lineWidth    = 5;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(w.targetX, w.targetY);
    ctx.stroke();

    // Bright inner dash
    ctx.strokeStyle = 'rgba(255,220,100,0.65)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Direction arrowhead at midpoint
    if (dist > 20) {
      const t   = w.status === 'going' ? 0.52 : 0.48;
      const ax  = base.x + dx * t, ay = base.y + dy * t;
      const ang = w.status === 'going'
        ? Math.atan2(dy, dx)
        : Math.atan2(-dy, -dx);
      const al  = 8;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(ax + al*Math.cos(ang),           ay + al*Math.sin(ang));
      ctx.lineTo(ax + al*Math.cos(ang+2.4),       ay + al*Math.sin(ang+2.4));
      ctx.lineTo(ax + al*Math.cos(ang-2.4),       ay + al*Math.sin(ang-2.4));
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,220,100,0.8)';
      ctx.fill();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
}

// ── Workers ───────────────────────────────────────────────────────────────────

function _drawWorkers(ctx) {
  const workers = getWorkers();
  const R = HEX_SIZE * 0.18;

  for (const w of workers) {
    const busy = w.status !== 'idle';
    const sick = w.sick;
    const slow = w.resourcePenalty;
    const auto = w.auto;

    // Base colour: sick → red, busy → orange, idle → green
    const baseC = sick ? '#8b1a1a' : busy ? '#e67e22' : '#27ae60';
    const rimC  = sick ? '#e84040' : busy ? '#f39c12' : '#2ecc71';
    const glowC = sick ? 'rgba(200,30,30,0.85)' : busy ? 'rgba(230,126,34,0.8)' : 'rgba(46,204,113,0.7)';

    // Glow (sick workers pulse red)
    ctx.save();
    ctx.shadowColor = glowC;
    ctx.shadowBlur  = sick ? 14 : 10;
    ctx.beginPath();
    ctx.arc(w.x, w.y, R, 0, Math.PI*2);
    ctx.fillStyle = baseC;
    ctx.fill();
    ctx.restore();

    // Rim
    ctx.beginPath();
    ctx.arc(w.x, w.y, R, 0, Math.PI*2);
    ctx.strokeStyle = rimC;
    ctx.lineWidth   = sick ? 2 : 1.5;
    ctx.stroke();

    // Inner shine
    const shine = ctx.createRadialGradient(
      w.x - R*0.35, w.y - R*0.35, 0,
      w.x, w.y, R
    );
    shine.addColorStop(0, 'rgba(255,255,255,0.30)');
    shine.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(w.x, w.y, R, 0, Math.PI*2);
    ctx.fillStyle = shine;
    ctx.fill();

    // Letter label
    ctx.save();
    ctx.shadowColor  = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur   = 3;
    ctx.fillStyle    = '#fff';
    ctx.font         = `bold ${Math.round(R*1.15)}px 'Palatino Linotype',Georgia,serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(workerLabel(w.id), w.x, w.y);
    ctx.restore();

    // ── Status badges (small circles with icon at edges) ──────────────────
    const BR = R * 0.42;  // badge radius
    const d  = R * 0.72;  // distance from centre to badge centre

    function _badge(ox, oy, fill, rim, label) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(w.x + ox, w.y + oy, BR, 0, Math.PI*2);
      ctx.fillStyle   = fill;
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur  = 4;
      ctx.fill();
      ctx.strokeStyle = rim;
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.shadowBlur  = 0;
      ctx.fillStyle   = '#fff';
      ctx.font        = `bold ${Math.round(BR * 1.1)}px sans-serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w.x + ox, w.y + oy + 0.5);
      ctx.restore();
    }

    if (sick)  _badge( d, -d, '#c0392b', '#ff6b6b', '🤒');   // top-right: sick
    if (slow)  _badge(-d, -d, '#1a6691', '#5bc0de', '🐌');   // top-left:  slow
    if (auto)  _badge( d,  d, '#2d6a2d', '#6fcf6f', 'A');    // bottom-right: auto
  }
}

// ── Research clock overlay ────────────────────────────────────────────────────

function _drawResearchClock(ctx, cx, cy, progress) {
  const R     = DS * 0.62;   // clock ring radius
  const start = -Math.PI / 2; // 12 o'clock
  const end   = start + Math.PI * 2 * progress;
  const glow  = 0.3 + progress * 0.7; // increases as clock fills

  ctx.save();

  // Background ring (dim track)
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(100,120,255,0.12)';
  ctx.lineWidth   = 3;
  ctx.stroke();

  // Filled arc (progress)
  if (progress > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, start, end);
    ctx.shadowColor = `rgba(120,160,255,${glow * 0.9})`;
    ctx.shadowBlur  = 10 + progress * 14;
    ctx.strokeStyle = `rgba(${Math.round(140 + progress*80)},${Math.round(160 + progress*60)},255,${0.55 + progress * 0.45})`;
    ctx.lineWidth   = 3.5;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Glowing dot at arc tip
    const tipX = cx + R * Math.cos(end);
    const tipY = cy + R * Math.sin(end);
    ctx.beginPath();
    ctx.arc(tipX, tipY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle   = `rgba(200,220,255,${0.7 + progress * 0.3})`;
    ctx.shadowColor = `rgba(160,200,255,${glow})`;
    ctx.shadowBlur  = 16;
    ctx.fill();
  }

  // Hex face bloom (radial glow that grows with progress)
  const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, DS * 0.8);
  bloom.addColorStop(0,   `rgba(80,100,255,${0.04 + progress * 0.14})`);
  bloom.addColorStop(0.6, `rgba(60,80,220,${0.02 + progress * 0.06})`);
  bloom.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(cx - DS, cy - DS, DS * 2, DS * 2);

  ctx.restore();
}

// ── Heal clock overlay (red, for ospedale) ───────────────────────────────────

function _drawHealClock(ctx, cx, cy, progress) {
  const R     = DS * 0.62;
  const start = -Math.PI / 2;
  const end   = start + Math.PI * 2 * progress;
  const glow  = 0.3 + progress * 0.7;

  ctx.save();

  // Background ring
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(180,40,40,0.14)';
  ctx.lineWidth   = 3;
  ctx.stroke();

  // Filled arc
  if (progress > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, start, end);
    ctx.shadowColor = `rgba(220,60,60,${glow * 0.9})`;
    ctx.shadowBlur  = 10 + progress * 14;
    ctx.strokeStyle = `rgba(220,${Math.round(60 - progress * 20)},${Math.round(60 - progress * 20)},${0.55 + progress * 0.45})`;
    ctx.lineWidth   = 3.5;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Glowing dot at arc tip
    const tipX = cx + R * Math.cos(end);
    const tipY = cy + R * Math.sin(end);
    ctx.beginPath();
    ctx.arc(tipX, tipY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle   = `rgba(255,140,140,${0.7 + progress * 0.3})`;
    ctx.shadowColor = `rgba(255,80,80,${glow})`;
    ctx.shadowBlur  = 16;
    ctx.fill();
  }

  // Subtle red bloom
  const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, DS * 0.8);
  bloom.addColorStop(0,   `rgba(200,40,40,${0.04 + progress * 0.10})`);
  bloom.addColorStop(0.6, `rgba(160,30,30,${0.02 + progress * 0.04})`);
  bloom.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(cx - DS, cy - DS, DS * 2, DS * 2);

  ctx.restore();
}

// ── Main render ───────────────────────────────────────────────────────────────

export function render(canvas, ctx, camera, state) {
  const { width: w, height: h } = canvas;
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 320);

  // Background
  _drawBackground(ctx, camera, w, h);

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);

  const hexes = Object.values(state.hexes);

  // Pass 1: purchasable hexes (bottom layer, no depth)
  for (const hex of hexes) {
    if (hex.owned) continue;
    const { x, y } = hexToPixel(hex.q, hex.r);
    const key    = hexKey(hex.q, hex.r);
    const isSel  = _selectedKey === key;
    const isHov  = _hoveredKey  === key;
    if (isHov) {
      ctx.save();
      _applyHoverAnim(ctx, x, y, key);
    }
    _drawPurchasableHex(ctx, x, y, isSel, pulse);
    if (isHov) ctx.restore();
  }

  // Pass 2: owned hex depth faces only (drawn before top faces so owned hexes
  //         never cover their own neighbour's depth strip)
  for (const hex of hexes) {
    if (!hex.owned) continue;
    const { x, y } = hexToPixel(hex.q, hex.r);
    const color = HEX_COLOR[hex.type] ?? '#444';
    _drawDepth(ctx, x, y, color);
  }

  // Pass 3: owned hex top faces + bevel + selection + labels
  for (const hex of hexes) {
    if (!hex.owned) continue;
    const { x, y } = hexToPixel(hex.q, hex.r);
    const key    = hexKey(hex.q, hex.r);
    const color  = HEX_COLOR[hex.type] ?? '#444';
    const isSel  = _selectedKey === key;
    const isHov  = _hoveredKey  === key || _hoverTime.has(key);

    // Hover lift transform (top face only — depth stays grounded, enhancing 3D)
    if (isHov) {
      ctx.save();
      _applyHoverAnim(ctx, x, y, key);
    }

    // Drop shadow
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,20,0.65)';
    ctx.shadowBlur    = 10;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 4;
    hexPath(ctx, x, y, DS);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();

    _drawFace(ctx, x, y, color, hex.type);
    _drawBevel(ctx, x, y);

    if (isSel) {
      const glow = 0.45 + pulse * 0.55;
      ctx.save();
      ctx.shadowColor = `rgba(255,215,0,${glow*0.6})`;
      ctx.shadowBlur  = 14 + pulse*6;
      hexPath(ctx, x, y, DS + 1);
      ctx.strokeStyle = `rgba(255,215,0,${0.7 + pulse*0.3})`;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
      hexPath(ctx, x, y, DS + 4);
      ctx.strokeStyle = `rgba(255,215,0,${0.15*pulse})`;
      ctx.lineWidth   = 6;
      ctx.stroke();
      ctx.restore();
    }
    _drawLabel(ctx, x, y, hex.type);
    _drawUpgradeBadge(ctx, x, y, hex.level);

    // Research clock overlay for ricerca hex with active researcher
    if (hex.type === 'ricerca') {
      const researcher = getWorkers().find(
        w => w.status === 'researching' && w.targetHexKey === key
      );
      if (researcher) {
        const state = getState();
        const ra    = (state.research?.active ?? []).find(a => a.hexKey === key);
        let progress;
        if (ra) {
          // Active recipe: show recipe completion progress
          const recipe = RESEARCH_RECIPES[ra.recipeId];
          progress = recipe ? Math.min(1, ra.elapsed / recipe.time) : 0;
        } else {
          // No recipe: show passive ricerca accumulation cycle
          progress = Math.min(1, (researcher.researchAccum ?? 0) / RESEARCH_GEN_TIME);
        }
        _drawResearchClock(ctx, x, y, progress);
      }
    }

    // Heal clock overlay for ospedale hex with active healing
    if (hex.type === 'ospedale') {
      const healer = getWorkers().find(
        w => w.status === 'healing' && w.targetHexKey === key
      );
      if (healer) {
        const healTotal = sickHealTime(getState());
        const progress  = Math.min(1, (healer.healElapsed ?? 0) / healTotal);
        _drawHealClock(ctx, x, y, progress);
      }
    }

    // Gear mode overlay: ⚙ on owned non-starter hexes
    if (isGearModeActive() && hex.owned && hex.type !== 'starter') {
      ctx.save();
      // Dark backdrop covering most of the hex face
      ctx.globalAlpha = 0.72;
      ctx.fillStyle   = '#000';
      ctx.beginPath();
      ctx.arc(x, y, DS * 0.78, 0, Math.PI * 2);
      ctx.fill();
      // ⚙ icon — use a large font; emoji often renders at ~60% of specified size
      ctx.globalAlpha  = 1.0;
      ctx.font         = `${Math.round(DS * 1.6)}px sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚙', x, y + DS * 0.06); // tiny nudge down to visually centre emoji
      ctx.restore();
    }

    if (isHov) ctx.restore();
  }

  // Pass 4: trip lines
  _drawTripLines(ctx, getWorkers());

  // Pass 5: workers
  _drawWorkers(ctx);

  ctx.restore();
}
