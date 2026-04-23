import { AUTOSAVE_MS, RESEARCH_RECIPES, CRAFT_RECIPES } from './config.js';
import { initState, getState } from './state.js';
import { loadGame, saveGame, resetGame } from './storage.js';
import { refreshPurchasable } from './map.js';
import { initWorkers, updateWorkers, dispatchWorker, getWorkers } from './workers.js';
import { addResources, canAfford, deductResources } from './resources.js';
import { buildHex } from './economy.js';
import { render, invalidateBg } from './render.js';
import { buildUI, updateUI, openCraftModal } from './ui.js';
import { initInput } from './input.js';
import { hexToPixel } from './hex.js';

const SIDEBAR_W = 280;

let canvas, ctx, camera;

// ── Initialisation ────────────────────────────────────────────────────────────

function init() {
  const saved = loadGame();
  initState(saved);
  const state = getState();

  // Field migration for saves that lack new fields
  if (!state.research) {
    state.research = { active: [], unlocked: [] };
  }
  // Migrate active from null/object to array
  if (!Array.isArray(state.research.active)) {
    state.research.active = state.research.active ? [state.research.active] : [];
  }
  for (const hex of Object.values(state.hexes)) {
    if (hex.craftActive === undefined) hex.craftActive = null;
    delete hex.recipe; // legacy field no longer used
  }
  for (const w of state.workers) {
    if (w.type       == null) w.type       = 'normal';
    if (w.auto       == null) w.auto       = false;
    if (w.sick       == null) w.sick       = false;
    if (w.lastHexKey == null) w.lastHexKey = null;
  }

  refreshPurchasable(state);
  initWorkers(state);

  canvas = document.getElementById('map-canvas');
  ctx    = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const basePos = hexToPixel(0, 0);
  camera = {
    x:     canvas.width  / 2 - basePos.x,
    y:     canvas.height / 2 - basePos.y,
    scale: 1.0,
  };

  buildUI({
    onHarvest(q, r) {
      if (!dispatchWorker(q, r)) showToast('⚠ Nessun lavoratore disponibile');
      updateUI();
    },
    onBuild(q, r, type) {
      if (buildHex(q, r, type)) {
        saveGame();
        showToast(`✔ ${HEX_LABEL_CAP[type] ?? type} costruita!`);
      }
      updateUI();
    },
    onStartCraft(hexKey, recipeId) {
      const st      = getState();
      const hex     = st.hexes[hexKey];
      if (!hex) return;
      const recipe  = CRAFT_RECIPES[hex.type]?.[recipeId];
      if (!recipe) return;
      if (recipe.inputs && !canAfford(recipe.inputs)) { showToast('✘ Ingredienti insufficienti'); return; }
      if (recipe.inputs) deductResources(recipe.inputs);
      hex.craftActive = { recipeId, elapsed: 0 };
      saveGame();
      showToast(`⚙ Avviato: ${recipe.label}`);
      updateUI();
    },
    onStartResearch(recipeId, hexKey) {
      const st     = getState();
      const recipe = RESEARCH_RECIPES[recipeId];
      if (!recipe) return;
      if (st.research.active.some(a => a.hexKey === hexKey)) return; // this hex already researching
      if (st.research.active.some(a => RESEARCH_RECIPES[a.recipeId]?.unlocks === recipe.unlocks)) return; // same tech already in progress
      if (!canAfford(recipe.cost)) { showToast('✘ Ricerca insufficiente'); return; }
      deductResources(recipe.cost);
      st.research.active.push({ recipeId, elapsed: 0, hexKey });
      saveGame();
      showToast(`🔬 Ricerca avviata: ${recipe.label}`);
      updateUI();
    },
    onHealWorker(q, r) {
      if (!dispatchWorker(q, r)) showToast('⚠ Nessun malato da inviare');
      updateUI();
    },
  });

  initInput(canvas, camera, () => updateUI(), onAction);

  // Mobile sidebar toggle
  const sidebarEl       = document.getElementById('sidebar');
  const sidebarToggle   = document.getElementById('sidebar-toggle');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const openSidebar  = () => { sidebarEl.classList.add('open'); sidebarBackdrop.classList.add('visible'); sidebarToggle.textContent = '✕'; };
  const closeSidebar = () => { sidebarEl.classList.remove('open'); sidebarBackdrop.classList.remove('visible'); sidebarToggle.textContent = '☰'; };
  sidebarToggle.addEventListener('click', () => sidebarEl.classList.contains('open') ? closeSidebar() : openSidebar());
  sidebarBackdrop.addEventListener('click', closeSidebar);

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Vuoi davvero ricominciare? Tutti i progressi andranno persi.')) {
      resetGame();
      location.reload();
    }
  });

  setInterval(saveGame, AUTOSAVE_MS);
  updateUI();
  requestAnimationFrame(() => { resizeCanvas(); requestAnimationFrame(loop); });
}

// Capitalize hex type name for toast messages
const HEX_LABEL_CAP = {
  field:'Campo', quarry:'Cava', lake:'Lago', forest:'Bosco', pasture:'Pascolo',
  desert:'Deserto', mine:'Miniera', ricerca:'Ricerca', cucina:'Cucina',
  fabbro:'Fabbro', casa:'Casa', ospedale:'Ospedale', falegnameria:'Falegnameria', caccia:'Caccia',
};

// ── Hex click action ─────────────────────────────────────────────────────────

function onAction(q, r) {
  const state = getState();
  const key   = `${q},${r}`;
  const hex   = state.hexes[key];
  if (!hex || !hex.owned) return;

  switch (hex.type) {
    case 'starter':
    case 'casa':
      return;

    case 'ospedale': {
      if (!dispatchWorker(q, r)) showToast('⚠ Nessun malato da inviare');
      else saveGame();
      updateUI();
      break;
    }

    case 'ricerca': {
      const busy = getWorkers().some(w => w.targetHexKey === key && w.status !== 'idle');
      if (busy) return;
      if (!dispatchWorker(q, r)) showToast('⚠ Nessun lavoratore disponibile');
      updateUI();
      break;
    }

    case 'cucina':
    case 'fabbro':
    case 'falegnameria':
    case 'caccia': {
      const stationed = getWorkers().find(w => w.targetHexKey === key && w.status === 'crafting');
      if (stationed) {
        if (!hex.craftActive) openCraftModal(key, hex.type, getState());
        return;
      }
      const busy = getWorkers().some(w => w.targetHexKey === key && w.status !== 'idle');
      if (busy) return;
      if (!dispatchWorker(q, r)) showToast('⚠ Nessun lavoratore disponibile');
      else saveGame();
      updateUI();
      break;
    }

    default: {
      if (!dispatchWorker(q, r)) showToast('⚠ Nessun lavoratore disponibile');
      updateUI();
      break;
    }
  }
}

// ── Game loop ─────────────────────────────────────────────────────────────────

let lastTime    = 0;
let uiTickAccum = 0; // accumulator for periodic UI refresh (progress bars)

function loop(timestamp) {
  try {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime  = timestamp;

    updateWorkers(
      dt,
      (_id, payload) => {
        addResources(payload);
        saveGame();
        showToast(payload.mana ? '✨ Trovato Mana! 📦 Risorse raccolte!' : '📦 Risorse raccolte!');
        updateUI();
      },
      (_id, label) => {
        saveGame();
        showToast(`✅ Ricerca completata: ${label}!`);
        updateUI();
      },
      (_id, output) => {
        saveGame();
        showToast(output.mana ? '✅ Creazione completata! ✨ +1 Mana!' : '✅ Creazione completata!');
        updateUI();
      },
      (msg) => {
        saveGame();
        showToast(msg);
        updateUI();
      }
    );

    // Refresh UI every second for smooth progress bars (research/healing)
    uiTickAccum += dt;
    if (uiTickAccum >= 1) {
      uiTickAccum = 0;
      const st = getState();
      const hasActive = (st.research?.active?.length > 0) ||
        getWorkers().some(w => w.status === 'healing' || w.status === 'researching' || w.status === 'crafting');
      if (hasActive) updateUI();
    }

    render(canvas, ctx, camera, getState());
  } catch (e) {
    console.error('[HexDomain loop error]', e);
  }

  requestAnimationFrame(loop);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resizeCanvas() {
  const rect    = canvas.getBoundingClientRect();
  canvas.width  = rect.width  > 10 ? Math.round(rect.width)  : Math.max(200, window.innerWidth  - SIDEBAR_W);
  canvas.height = rect.height > 10 ? Math.round(rect.height) : Math.max(200, window.innerHeight);
  invalidateBg();
}

let _toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
