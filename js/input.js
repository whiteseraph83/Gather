import { MIN_SCALE, MAX_SCALE } from './config.js';
import { pixelToHex, hexKey } from './hex.js';
import { getState } from './state.js';
import { setSelectedHex, getSelectedHex, setHoveredHex } from './render.js';

/** Wire all canvas input events.
 *  onSelect(key|null) called when selection changes; onAction(q,r) called on owned hex click. */
export function initInput(canvas, camera, onSelect, onAction) {
  let dragActive = false;
  let dragStartX = 0, dragStartY = 0;
  let dragMoved  = false;

  // ── Pan (drag) ─────────────────────────────────────────────────────────────
  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    dragActive = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragMoved  = false;
  });

  window.addEventListener('mousemove', e => {
    if (!dragActive) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (!dragMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) dragMoved = true;
    if (dragMoved) {
      camera.x += dx;
      camera.y += dy;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    }
  });

  window.addEventListener('mouseup', () => { dragActive = false; });

  // ── Click → select hex ────────────────────────────────────────────────────
  canvas.addEventListener('click', e => {
    if (dragMoved) return; // was a drag, not a click

    const rect  = canvas.getBoundingClientRect();
    const sx    = e.clientX - rect.left;
    const sy    = e.clientY - rect.top;

    // Screen → world
    const wx = (sx - camera.x) / camera.scale;
    const wy = (sy - camera.y) / camera.scale;

    const { q, r } = pixelToHex(wx, wy);
    const key       = hexKey(q, r);
    const state     = getState();

    if (!state.hexes[key]) {
      setSelectedHex(null);
      onSelect(null);
      return;
    }

    setSelectedHex(key);
    onSelect(key);
    if (state.hexes[key].owned) onAction?.(q, r);
  });

  // ── Hover ────────────────────────────────────────────────────────────────
  canvas.addEventListener('mousemove', e => {
    if (dragMoved) return;
    const rect  = canvas.getBoundingClientRect();
    const sx    = e.clientX - rect.left;
    const sy    = e.clientY - rect.top;
    const wx    = (sx - camera.x) / camera.scale;
    const wy    = (sy - camera.y) / camera.scale;
    const { q, r } = pixelToHex(wx, wy);
    const key   = hexKey(q, r);
    const state = getState();
    setHoveredHex(state.hexes[key] ? key : null);
  });

  canvas.addEventListener('mouseleave', () => {
    setHoveredHex(null);
  });

  // ── Zoom (mouse wheel) ────────────────────────────────────────────────────
  canvas.addEventListener('wheel', e => {
    e.preventDefault();

    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const rect   = canvas.getBoundingClientRect();
    const sx     = e.clientX - rect.left;
    const sy     = e.clientY - rect.top;

    // World point under cursor
    const wx = (sx - camera.x) / camera.scale;
    const wy = (sy - camera.y) / camera.scale;

    camera.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, camera.scale * factor));

    // Keep world point under cursor
    camera.x = sx - wx * camera.scale;
    camera.y = sy - wy * camera.scale;
  }, { passive: false });
}
