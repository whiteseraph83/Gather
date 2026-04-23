import { BUILD_COST, DEFAULT_BUILD_TYPES, SPECIAL_HEX_TYPES } from './config.js';
import { getState } from './state.js';
import { canAfford, deductResources, addResources } from './resources.js';
import { hexKey } from './hex.js';
import { refreshPurchasable } from './map.js';
import { addWorker } from './workers.js';

/** Build a specific hex type at (q,r). Costs BUILD_COST[type]. */
export function buildHex(q, r, type) {
  const state = getState();
  const key   = hexKey(q, r);
  const hex   = state.hexes[key];

  if (!hex || hex.owned || !hex.purchasable) return false;

  const cost = BUILD_COST[type];
  if (!cost || !canAfford(cost)) return false;

  deductResources(cost);
  state.hexes[key] = { q, r, type, owned: true, recipe: null };

  if (type === 'casa') {
    state.population++;
    addWorker();
  }

  refreshPurchasable(state);
  return true;
}

/** Returns the list of hex types the player can currently build. */
export function getAvailableBuildTypes() {
  const state    = getState();
  const unlocked = state.research?.unlocked ?? [];
  const types    = [...DEFAULT_BUILD_TYPES];
  for (const id of unlocked) {
    if (SPECIAL_HEX_TYPES.includes(id) && !types.includes(id)) {
      types.push(id);
    }
  }
  return types;
}

