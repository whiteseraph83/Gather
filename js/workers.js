import { WORKER_SPEED, HEX_YIELD, HEAL_TIME, RESEARCH_GEN_TIME,
         CRAFT_RECIPES, RESEARCH_RECIPES, MANA_DROP_RATE,
         PERMIT_TYPES, computeHexYield } from './config.js';
import { hexToPixel, hexKey } from './hex.js';
import { getState } from './state.js';
import { canAfford, deductResources, addResources } from './resources.js';

const _workers = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAY_TYPES = new Set(['ricerca', 'ospedale', 'cucina', 'fabbro', 'falegnameria', 'caccia']);

function _effectiveSpeed(worker) {
  const unlocked = getState().research?.unlocked ?? [];
  let speed = WORKER_SPEED;
  if (unlocked.includes('velocita')) speed *= 1.5;
  if (worker.type === 'evolved')      speed *= 2;
  return speed;
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initWorkers(state) {
  _workers.length = 0;
  const base = hexToPixel(0, 0);
  for (const w of state.workers) {
    _workers.push({
      id:             w.id,
      status:         'idle',
      type:           w.type       ?? 'normal',
      auto:           w.auto       ?? false,
      sick:           w.sick       ?? false,
      healElapsed:    0,
      researchAccum:  0,
      craftElapsed:   0,
      x:              base.x,
      y:              base.y,
      baseX:          base.x,
      baseY:          base.y,
      targetX:        0,
      targetY:        0,
      payload:        {},
      targetHexKey:   null,
      lastHexKey:     w.lastHexKey ?? null,
    });
  }
}

export function getWorkers()   { return _workers; }
export function getIdleCount() { return _workers.filter(w => w.status === 'idle' && !w.sick).length; }

// ── Dispatch ──────────────────────────────────────────────────────────────────

export function dispatchWorker(q, r) {
  const state = getState();
  const key   = hexKey(q, r);
  const hex   = state.hexes[key];

  if (!hex || !hex.owned || hex.type === 'starter') return false;

  const needsSick = hex.type === 'ospedale';
  const worker    = _workers.find(w =>
    w.status === 'idle' && (needsSick ? w.sick : !w.sick)
  );
  if (!worker) return false;

  const target        = hexToPixel(q, r);
  worker.status       = 'going';
  worker.x            = worker.baseX;
  worker.y            = worker.baseY;
  worker.targetX      = target.x;
  worker.targetY      = target.y;
  worker.payload      = {};
  worker.targetHexKey = key;
  worker.lastHexKey   = key;

  if (!STAY_TYPES.has(hex.type)) {
    worker.payload = computeHexYield(hex);
  }

  const sw = state.workers.find(w => w.id === worker.id);
  if (sw) { sw.status = 'going'; sw.targetHexKey = key; sw.lastHexKey = key; }
  return true;
}

// ── Recall ────────────────────────────────────────────────────────────────────

/** Universal recall: works for any worker status, returns them to base. */
export function recallWorker(workerId) {
  const state  = getState();
  const worker = _workers.find(w => w.id === workerId);
  if (!worker || worker.status === 'idle' || worker.status === 'returning') return;

  if (worker.status === 'crafting') {
    const hex = state.hexes[worker.targetHexKey];
    if (hex) hex.craftActive = null;
  }
  if (worker.status === 'researching' && Array.isArray(state.research?.active)) {
    state.research.active = state.research.active.filter(a => a.hexKey !== worker.targetHexKey);
  }

  worker.status = 'returning';
  const sw = state.workers.find(w => w.id === workerId);
  if (sw) { sw.status = 'returning'; sw.targetHexKey = null; }
}

/** Recall a worker stationed at a craft hex; forfeits the active craft. */
export function recallCrafter(workerId) {
  recallWorker(workerId);
}

/** Recall a researching worker; forfeits the research for that hex. */
export function recallResearcher(workerId) {
  recallWorker(workerId);
}

// ── Workers management ────────────────────────────────────────────────────────

export function addWorker() {
  const state = getState();
  const id    = _workers.length;
  const base  = hexToPixel(0, 0);
  _workers.push({
    id, status:'idle', type:'normal', auto:false, sick:false,
    healElapsed:0, researchAccum:0, craftElapsed:0,
    x:base.x, y:base.y, baseX:base.x, baseY:base.y,
    targetX:0, targetY:0, payload:{}, targetHexKey:null, lastHexKey:null,
  });
  state.workers.push({
    id, status:'idle', targetHexKey:null, lastHexKey:null,
    type:'normal', auto:false, sick:false,
  });
}

export function evolveWorker(workerId) {
  const state  = getState();
  const worker = _workers.find(w => w.id === workerId);
  if (!worker || worker.type === 'evolved') return false;
  if (!canAfford({ lingotti:3 })) return false;
  deductResources({ lingotti:3 });
  worker.type = 'evolved';
  const sw = state.workers.find(w => w.id === workerId);
  if (sw) sw.type = 'evolved';
  return true;
}

export function toggleWorkerAuto(workerId) {
  const state  = getState();
  const worker = _workers.find(w => w.id === workerId);
  if (!worker) return;
  worker.auto = !worker.auto;
  const sw = state.workers.find(w => w.id === workerId);
  if (sw) sw.auto = worker.auto;
}

// ── Update loop ───────────────────────────────────────────────────────────────

export function updateWorkers(dt, onComplete, onResearchComplete, onCraftComplete, onToast) {
  const state = getState();

  // Advance all active research timers
  const actives = state.research?.active;
  if (Array.isArray(actives) && actives.length > 0) {
    const toFinish = [];
    for (const ra of actives) {
      const hasResearcher = _workers.some(
        w => w.status === 'researching' && w.targetHexKey === ra.hexKey
      );
      if (!hasResearcher) continue;
      ra.elapsed += dt;
      const recipe = RESEARCH_RECIPES[ra.recipeId];
      if (recipe && ra.elapsed >= recipe.time) toFinish.push(ra);
    }
    for (const ra of toFinish) {
      const recipe = RESEARCH_RECIPES[ra.recipeId];
      const id     = recipe.unlocks;
      // Permit types go to permits; everything else is a permanent unlock
      if (PERMIT_TYPES.has(id)) {
        if (!state.research.permits) state.research.permits = {};
        state.research.permits[id] = (state.research.permits[id] ?? 0) + 1;
      } else {
        if (!state.research.unlocked.includes(id)) state.research.unlocked.push(id);
      }
      state.research.active = actives.filter(a => a !== ra);
      onResearchComplete?.(id, recipe.label);
    }
  }

  const pendingAutoDispatch = [];

  for (const w of _workers) {
    if (w.status === 'idle') continue;

    // Healing
    if (w.status === 'healing') {
      w.healElapsed = (w.healElapsed ?? 0) + dt;
      if (w.healElapsed >= HEAL_TIME) {
        w.sick = false; w.healElapsed = 0; w.status = 'returning';
        const sw = state.workers.find(s => s.id === w.id);
        if (sw) { sw.sick = false; sw.status = 'returning'; }
        onToast?.('💊 Lavoratore guarito!');
      }
      continue;
    }

    // Crafting
    if (w.status === 'crafting') {
      const hex = state.hexes[w.targetHexKey];
      const ca  = hex?.craftActive;
      if (ca) {
        const recipe = CRAFT_RECIPES[hex.type]?.[ca.recipeId];
        if (recipe) {
          ca.elapsed += dt;
          if (ca.elapsed >= recipe.time) {
            const output = { ...recipe.output };
            addResources(output);
            if (Math.random() < MANA_DROP_RATE) { addResources({ mana:1 }); output.mana = (output.mana ?? 0) + 1; }
            hex.craftActive = null;
            onCraftComplete?.(w.id, output);
          }
        }
      }
      continue;
    }

    // Researching: passive ricerca generation
    if (w.status === 'researching') {
      w.researchAccum = (w.researchAccum ?? 0) + dt;
      if (w.researchAccum >= RESEARCH_GEN_TIME) {
        w.researchAccum -= RESEARCH_GEN_TIME;
        addResources({ ricerca: 1 });
        onToast?.('🔬 +1 Ricerca');
      }
      continue;
    }

    // Movement
    const tx   = w.status === 'going' ? w.targetX : w.baseX;
    const ty   = w.status === 'going' ? w.targetY : w.baseY;
    const dx   = tx - w.x, dy = ty - w.y;
    const dist = Math.hypot(dx, dy);
    const step = _effectiveSpeed(w) * dt;

    if (dist <= step) {
      w.x = tx; w.y = ty;

      if (w.status === 'going') {
        const hex = state.hexes[w.targetHexKey];

        if (hex?.type === 'ricerca') {
          w.status = 'researching'; w.researchAccum = 0;
          const sw = state.workers.find(s => s.id === w.id);
          if (sw) sw.status = 'researching';
          continue;
        }

        if (hex?.type === 'ospedale') {
          w.status = 'healing'; w.healElapsed = 0;
          const sw = state.workers.find(s => s.id === w.id);
          if (sw) sw.status = 'healing';
          continue;
        }

        if (CRAFT_RECIPES[hex?.type]) {
          w.status = 'crafting'; w.craftElapsed = 0;
          const sw = state.workers.find(s => s.id === w.id);
          if (sw) sw.status = 'crafting';
          continue;
        }

        w.status = 'returning';
      } else {
        // Arrived back at base
        const payload = { ...w.payload };
        w.status = 'idle'; w.payload = {};

        const sw = state.workers.find(s => s.id === w.id);
        if (sw) { sw.status = 'idle'; sw.targetHexKey = null; }

        // Rare mana drop
        if (Math.random() < MANA_DROP_RATE) payload.mana = (payload.mana ?? 0) + 1;

        if (Object.keys(payload).length > 0) onComplete(w.id, payload);

        // Auto-dispatch: skip STAY_TYPES to avoid infinite loops after recall
        if (w.auto && w.lastHexKey && !w.sick) {
          const lastHex = state.hexes[w.lastHexKey];
          if (lastHex?.owned && !STAY_TYPES.has(lastHex.type)) {
            pendingAutoDispatch.push(w.lastHexKey);
          }
        }
      }
    } else {
      w.x += (dx / dist) * step;
      w.y += (dy / dist) * step;
    }
  }

  for (const key of pendingAutoDispatch) {
    const hex = state.hexes[key];
    if (hex?.owned) dispatchWorker(hex.q, hex.r);
  }
}
