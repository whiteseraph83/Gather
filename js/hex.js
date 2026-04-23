import { HEX_SIZE, HEX_DIRS } from './config.js';

const SQRT3 = Math.sqrt(3);

/** Axial (q, r) → world pixel center (pointy-top hexes). */
export function hexToPixel(q, r) {
  return {
    x: HEX_SIZE * SQRT3 * (q + r / 2),
    y: HEX_SIZE * 1.5 * r,
  };
}

/** World pixel → nearest axial hex (pointy-top). */
export function pixelToHex(x, y) {
  const q = (SQRT3 / 3 * x - 1 / 3 * y) / HEX_SIZE;
  const r = (2 / 3 * y) / HEX_SIZE;
  return _cubeRound(q, r);
}

function _cubeRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if      (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds)             rr = -rq - rs;
  return { q: rq, r: rr };
}

export function hexKey(q, r)  { return `${q},${r}`; }
export function keyToHex(key) { const [q, r] = key.split(',').map(Number); return { q, r }; }

export function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

export function getNeighbors(q, r) {
  return HEX_DIRS.map(d => ({ q: q + d.q, r: r + d.r }));
}

/** Add a closed hex path at world center (cx, cy) to the current ctx path. */
export function hexPath(ctx, cx, cy, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i + Math.PI / 6; // pointy-top: first vertex at 30°
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}
