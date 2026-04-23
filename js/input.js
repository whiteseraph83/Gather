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

  // ── Touch: drag + pinch zoom ─────────────────────────────────────────────

  let _pinchDist = 0;

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      dragActive = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragMoved  = false;
    } else if (e.touches.length === 2) {
      dragActive = false;
      _pinchDist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      dragMoved = true; // block accidental tap on finger lift
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && dragActive) {
      const dx = e.touches[0].clientX - dragStartX;
      const dy = e.touches[0].clientY - dragStartY;
      if (!dragMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) dragMoved = true;
      if (dragMoved) {
        camera.x += dx;
        camera.y += dy;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
      }
    } else if (e.touches.length === 2 && _pinchDist > 0) {
      const dist   = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      const factor = dist / _pinchDist;
      const rect   = canvas.getBoundingClientRect();
      const midX   = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY   = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      const wx = (midX - camera.x) / camera.scale;
      const wy = (midY - camera.y) / camera.scale;
      camera.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, camera.scale * factor));
      camera.x = midX - wx * camera.scale;
      camera.y = midY - wy * camera.scale;
      _pinchDist = dist;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (e.touches.length === 0) {
      if (!dragMoved && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const rect  = canvas.getBoundingClientRect();
        const sx    = touch.clientX - rect.left;
        const sy    = touch.clientY - rect.top;
        const wx    = (sx - camera.x) / camera.scale;
        const wy    = (sy - camera.y) / camera.scale;
        const { q, r } = pixelToHex(wx, wy);
        const key       = hexKey(q, r);
        const state     = getState();
        if (!state.hexes[key]) {
          setSelectedHex(null);
          onSelect(null);
        } else {
          setSelectedHex(key);
          onSelect(key);
          if (state.hexes[key].owned) onAction?.(q, r);
        }
      }
      dragActive = false;
      _pinchDist = 0;
    }
  }, { passive: false });

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
