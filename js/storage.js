import { SAVE_KEY, SAVE_VERSION } from './config.js';
import { getState } from './state.js';

export function saveGame() {
  try {
    const state = getState();
    // Normalise in-flight workers so they reload as idle
    const snap = JSON.parse(JSON.stringify(state));
    for (const w of snap.workers) { w.status = 'idle'; w.targetHexKey = null; }
    localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function resetGame() {
  localStorage.removeItem(SAVE_KEY);
}
