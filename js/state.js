import { RESOURCE_LIST, SAVE_VERSION } from './config.js';

let _state = null;

export function createInitialState() {
  const resources = {};
  for (const r of RESOURCE_LIST) resources[r] = 0;
  resources.mana = 1;

  return {
    version: SAVE_VERSION,
    population: 1,
    resources,
    hexes: {
      '0,0':  { q:  0, r:  0, type: 'starter',  owned: true },
      '1,0':  { q:  1, r:  0, type: 'quarry',   owned: true },
      '1,-1': { q:  1, r: -1, type: 'lake',     owned: true },
      '0,-1': { q:  0, r: -1, type: 'field',    owned: true },
      '-1,0': { q: -1, r:  0, type: 'forest',   owned: true },
      '-1,1': { q: -1, r:  1, type: 'pasture',  owned: true },
      '0,1':  { q:  0, r:  1, type: 'desert',   owned: true },
    },
    workers: [
      { id:0, status:'idle', targetHexKey:null, lastHexKey:null, type:'normal', auto:false, sick:false },
    ],
    research: {
      active:   [],    // [{ recipeId, elapsed, hexKey }, ...] — one per ricerca hex
      unlocked: [],
    },
  };
}

export function getState()       { return _state; }
export function setState(s)      { _state = s; }
export function initState(saved) { _state = saved ?? createInitialState(); }
