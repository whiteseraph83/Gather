import { BUILD_COST, DEFAULT_BUILD_TYPES, SPECIAL_HEX_TYPES,
         PERMIT_TYPES, RESEARCH_RECIPES, HEX_UPGRADES } from './config.js';
import { getState } from './state.js';
import { canAfford, deductResources, addResources } from './resources.js';
import { hexKey } from './hex.js';
import { refreshPurchasable } from './map.js';
import { addWorker } from './workers.js';

// ── Cost scaling for permit-type hexes ────────────────────────────────────────

/** Build cost for a type, scaled by how many have already been built. */
export function getScaledBuildCost(type, state) {
  const base = BUILD_COST[type] ?? {};
  if (!PERMIT_TYPES.has(type)) return base;
  const n = state.buildCount?.[type] ?? 0;
  if (n === 0) return base;
  const factor = 1 + n * 0.75;
  const result = {};
  for (const [r, v] of Object.entries(base)) {
    result[r] = Math.ceil(v * factor);
  }
  return result;
}

/** Research cost for a recipe, scaled by how many of that type have been built. */
export function getPermitResearchCost(recipeId, state) {
  const recipe = RESEARCH_RECIPES[recipeId];
  if (!recipe || !PERMIT_TYPES.has(recipe.unlocks)) return recipe?.cost ?? {};
  const n = (state.buildCount?.[recipe.unlocks] ?? 0) +
            (state.research?.permits?.[recipe.unlocks] ?? 0);
  if (n === 0) return recipe.cost;
  const factor = 1 + n * 0.75;
  const result = {};
  for (const [r, v] of Object.entries(recipe.cost)) {
    result[r] = Math.ceil(v * factor);
  }
  return result;
}

// ── Build hex ─────────────────────────────────────────────────────────────────

export function buildHex(q, r, type) {
  const state = getState();
  const key   = hexKey(q, r);
  const hex   = state.hexes[key];

  if (!hex || hex.owned || !hex.purchasable) return false;

  // Permit check for special hexes
  if (PERMIT_TYPES.has(type)) {
    const permits = state.research?.permits ?? {};
    if ((permits[type] ?? 0) <= 0) return false;
    permits[type]--;
  }

  const cost = getScaledBuildCost(type, state);
  if (!canAfford(cost)) return false;
  deductResources(cost);

  state.hexes[key] = { q, r, type, owned: true, level: 1, craftActive: null };

  // Track build count
  if (!state.buildCount) state.buildCount = {};
  state.buildCount[type] = (state.buildCount[type] ?? 0) + 1;

  if (type === 'casa') {
    state.population++;
    addWorker();
  }

  refreshPurchasable(state);
  return true;
}

// ── Upgrade hex ───────────────────────────────────────────────────────────────

export function upgradeHex(key) {
  const state   = getState();
  const hex     = state.hexes[key];
  if (!hex || !hex.owned) return false;

  const upgrades     = HEX_UPGRADES[hex.type] ?? [];
  const currentLevel = hex.level ?? 1;
  const next         = upgrades.find(u => u.level === currentLevel + 1);
  if (!next) return false;

  const unlocked = state.research?.unlocked ?? [];
  if (!unlocked.includes(next.unlocks)) return false;
  if (!canAfford(next.buildCost)) return false;

  deductResources(next.buildCost);
  hex.level = next.level;
  return true;
}

// ── Demolish hex ──────────────────────────────────────────────────────────────

export function demolishHex(key) {
  const state = getState();
  const hex   = state.hexes[key];
  if (!hex || !hex.owned || hex.type === 'starter') return false;

  // Partial refund: 40% of base build cost (not scaled)
  const baseCost = BUILD_COST[hex.type] ?? {};
  const refund   = {};
  for (const [r, v] of Object.entries(baseCost)) {
    const amt = Math.floor(v * 0.4);
    if (amt > 0) refund[r] = amt;
  }
  if (Object.keys(refund).length) addResources(refund);

  // Mark as unowned purchasable again
  state.hexes[key] = {
    q: hex.q, r: hex.r,
    type: 'empty', owned: false, purchasable: true,
  };

  refreshPurchasable(state);
  return refund;
}

// ── Available build types ─────────────────────────────────────────────────────

export function getAvailableBuildTypes() {
  const state   = getState();
  const permits = state.research?.permits ?? {};
  const types   = [...DEFAULT_BUILD_TYPES];
  for (const id of SPECIAL_HEX_TYPES) {
    if ((permits[id] ?? 0) > 0 && !types.includes(id)) types.push(id);
  }
  return types;
}
