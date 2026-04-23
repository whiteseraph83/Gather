import { hexKey, getNeighbors } from './hex.js';

/** Recompute the set of purchasable (adjacent, unowned) hexes. */
export function refreshPurchasable(state) {
  // Drop all non-owned hexes, then re-add adjacency frontier
  for (const key of Object.keys(state.hexes)) {
    if (!state.hexes[key].owned) delete state.hexes[key];
  }

  for (const hex of Object.values(state.hexes)) {
    if (!hex.owned) continue;
    for (const nb of getNeighbors(hex.q, hex.r)) {
      const key = hexKey(nb.q, nb.r);
      if (!state.hexes[key]) {
        state.hexes[key] = { q: nb.q, r: nb.r, type: 'unknown', owned: false, purchasable: true };
      }
    }
  }
}
