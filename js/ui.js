import {
  RESOURCE_LIST, RESOURCE_LABEL, RESOURCE_ICON,
  HEX_LABEL, HEX_YIELD, BUILD_COST,
  RESEARCH_RECIPES, CRAFT_RECIPES,
} from './config.js';
import { getState } from './state.js';
import { getWorkers, getIdleCount, recallResearcher, recallCrafter, evolveWorker, toggleWorkerAuto } from './workers.js';
import { hexDistance, keyToHex, hexKey } from './hex.js';
import { getSelectedHex } from './render.js';
import { canAfford } from './resources.js';
import { getAvailableBuildTypes, buildHex } from './economy.js';

// ── Resource tooltips ─────────────────────────────────────────────────────────

const RESOURCE_DESC = {
  pietra:   'Pietra · Raccolta dalla Cava. Usata per costruire e forgiare.',
  acqua:    'Acqua · Raccolta dal Lago. Ingrediente base per cibo e costruzioni.',
  grano:    'Grano · Raccolto dal Campo. Ingrediente fondamentale per il cibo.',
  legno:    'Legno · Raccolto dal Bosco. Materiale da costruzione principale.',
  carne:    'Carne · Raccolta dal Pascolo o dalla Caccia. Ingrediente per il cibo.',
  sabbia:   'Sabbia · Raccolta dal Deserto. Usata per la produzione di mattoni.',
  ferro:    'Ferro · Raccolto dalla Miniera. Necessario per forgiare lingotti e strumenti.',
  mana:     'Mana ✨ · Energia magica rarissima. Appare casualmente raccogliendo qualsiasi risorsa o creando oggetti artigianali (~4% per raccolta, ~3% per crafting). Necessario per costruire l\'Hex Ricerca e per la Lega Preziosa al Fabbro.',
  ricerca:  'Ricerca 🔬 · Generata da un lavoratore nell\'Hex Ricerca (1 ogni 15s). Si spende per sbloccare nuove tecnologie.',
  pane:     'Pane · Cibo lavorato. Si produce artigianalmente o nella Cucina.',
  stufato:  'Stufato · Cibo ricco. Si produce artigianalmente o nella Cucina.',
  mattoni:  'Mattoni · Materiale da costruzione avanzato. Si produce dalla pietra e sabbia, o nella Falegnameria.',
  lingotti: 'Lingotti · Metallo raffinato. Si produce dal ferro, o al Fabbro con ricette speciali.',
};

let _cb           = {};
let _resHexKey    = null;
let _craftHexKey  = null;
let _craftHexType = null;
let _buildHexQ    = 0;
let _buildHexR    = 0;
let _hexModalKey  = null;

// ── Research modal ────────────────────────────────────────────────────────────

export function openResearchModal(hexKey, state) {
  _resHexKey = hexKey;
  _populateResearchModal(state);
  document.getElementById('research-modal').classList.remove('hidden');
}

export function closeResearchModal() {
  document.getElementById('research-modal').classList.add('hidden');
}

function _populateResearchModal(state) {
  const container = document.getElementById('research-modal-content');
  container.innerHTML = '';
  const unlocked  = state.research?.unlocked ?? [];
  const actives   = state.research?.active   ?? [];

  for (const [id, recipe] of Object.entries(RESEARCH_RECIPES)) {
    const done      = unlocked.includes(recipe.unlocks);
    const inProgress = !done && actives.some(a => RESEARCH_RECIPES[a.recipeId]?.unlocks === recipe.unlocks);
    const hexActive  = !done && actives.find(a => a.hexKey === _resHexKey);
    const affordable = !done && !inProgress && !hexActive && canAfford(recipe.cost);
    const costStr    = Object.entries(recipe.cost).map(([r,n]) => `${n}${RESOURCE_ICON[r]}`).join(' ');

    const card = document.createElement('div');
    card.className = `research-card ${done ? 'completed' : ''}`;

    card.innerHTML =
      `<div class="research-card-name">${recipe.label}</div>` +
      `<div class="research-card-desc">${recipe.desc}</div>` +
      `<div class="research-card-meta">
        <span>${costStr}</span>
        <span class="meta-time">⏱ ${recipe.time}s</span>
      </div>`;

    if (!done) {
      let btnLabel;
      if (inProgress)     btnLabel = '🔬 In corso...';
      else if (hexActive) btnLabel = '⚙ Hex già occupato';
      else if (!affordable) btnLabel = '🔒 Risorse insufficienti';
      else                btnLabel = '▶ Avvia ricerca';

      const btn = _makeBtn(btnLabel, 'research-card-btn',
        () => {
          _cb.onStartResearch?.(id, _resHexKey);
          closeResearchModal();
          updateUI();
        },
        inProgress || hexActive || !canAfford(recipe.cost)
      );
      card.appendChild(btn);
    }

    container.appendChild(card);
  }
}

// ── Craft modal ───────────────────────────────────────────────────────────────

const CRAFT_MODAL_TITLES = {
  cucina:'🍳 Cucina', fabbro:'🔨 Fabbro', falegnameria:'🪚 Falegnameria', caccia:'🎯 Caccia',
};

export function openCraftModal(hexKey, hexType, state) {
  _craftHexKey  = hexKey;
  _craftHexType = hexType;
  document.getElementById('craft-modal-title').textContent = CRAFT_MODAL_TITLES[hexType] ?? '🔨 Ricette';
  _populateCraftModal(state);
  document.getElementById('craft-modal').classList.remove('hidden');
}

export function closeCraftModal() {
  document.getElementById('craft-modal').classList.add('hidden');
}

function _populateCraftModal(state) {
  const container = document.getElementById('craft-modal-content');
  container.innerHTML = '';
  const recipeMap = CRAFT_RECIPES[_craftHexType] ?? {};

  for (const [rid, recipe] of Object.entries(recipeMap)) {
    const hasInputs  = recipe.inputs && Object.keys(recipe.inputs).length > 0;
    const affordable = !hasInputs || canAfford(recipe.inputs);

    const card = document.createElement('div');
    card.className = `research-card ${affordable ? '' : 'locked'}`;

    const outStr  = Object.entries(recipe.output).map(([r,n]) => `${n}${RESOURCE_ICON[r]}`).join(' ');
    const costStr = hasInputs
      ? Object.entries(recipe.inputs).map(([r,n]) => `${n}${RESOURCE_ICON[r]}`).join(' ') + ' → ' + outStr
      : '→ ' + outStr;

    card.innerHTML =
      `<div class="research-card-name">${recipe.label}</div>` +
      (recipe.desc ? `<div class="research-card-desc">${recipe.desc}</div>` : '') +
      `<div class="research-card-meta">
        <span>${costStr}</span>
        <span class="meta-time">⏱ ${recipe.time}s</span>
      </div>`;

    const btn = _makeBtn(
      affordable ? '▶ Avvia' : '🔒 Insufficiente',
      'research-card-btn',
      () => { _cb.onStartCraft?.(_craftHexKey, rid); closeCraftModal(); updateUI(); },
      !affordable
    );
    card.appendChild(btn);
    container.appendChild(card);
  }
}

// ── Build modal ───────────────────────────────────────────────────────────────

const BUILD_ICONS = {
  field:'🌾', quarry:'🪨', lake:'💧', forest:'🌲', pasture:'🐄',
  desert:'🏜', mine:'⛏', ricerca:'🔬', cucina:'🍳', fabbro:'🔨',
  casa:'🏠', ospedale:'🏥', falegnameria:'🪚', caccia:'🎯',
};

export function openBuildModal(q, r) {
  _buildHexQ = q;
  _buildHexR = r;
  _populateBuildModal();
  document.getElementById('build-modal').classList.remove('hidden');
}

export function closeBuildModal() {
  document.getElementById('build-modal').classList.add('hidden');
}

function _populateBuildModal() {
  const container = document.getElementById('build-modal-content');
  container.innerHTML = '';
  const types = getAvailableBuildTypes();

  for (const type of types) {
    const cost       = BUILD_COST[type];
    const affordable = canAfford(cost);
    const costStr    = Object.entries(cost).map(([r,n]) => `${n}${RESOURCE_ICON[r]}`).join(' ');

    const card = document.createElement('div');
    card.className = `build-card ${affordable ? '' : 'build-card-locked'}`;

    card.innerHTML =
      `<div class="build-card-icon">${BUILD_ICONS[type] ?? '🏗'}</div>` +
      `<div class="build-card-name">${HEX_LABEL[type] ?? type}</div>` +
      `<div class="build-card-cost">${costStr}</div>`;

    const btn = document.createElement('button');
    btn.className   = 'build-card-btn';
    btn.textContent = affordable ? 'Costruisci' : '🔒 Insufficiente';
    btn.disabled    = !affordable;
    btn.addEventListener('click', () => {
      _cb.onBuild?.(_buildHexQ, _buildHexR, type);
      closeBuildModal();
      updateUI();
    });
    card.appendChild(btn);

    if (affordable) {
      card.addEventListener('click', e => {
        if (e.target !== btn) btn.click();
      });
    }

    container.appendChild(card);
  }
}

// ── Hex action modal ──────────────────────────────────────────────────────────

const HEX_MODAL_LABELS = {
  starter:      '🏘 Villaggio',
  ricerca:      '🔬 Ricerca',
  cucina:       '🍳 Cucina',
  fabbro:       '🔨 Fabbro',
  falegnameria: '🪚 Falegnameria',
  caccia:       '🎯 Caccia',
  casa:         '🏠 Casa',
  ospedale:     '🏥 Ospedale',
};

export function openHexModal(key) {
  _hexModalKey = key;
  _populateHexModal(getState());
  document.getElementById('hex-modal').classList.remove('hidden');
}

export function closeHexModal() {
  document.getElementById('hex-modal').classList.add('hidden');
}

function _populateHexModal(state) {
  if (!_hexModalKey) return;
  const container = document.getElementById('hex-modal-content');
  container.innerHTML = '';
  const hex = state.hexes[_hexModalKey];
  if (!hex) return;

  const titleEl = document.getElementById('hex-modal-title');

  if (hex.owned) {
    titleEl.textContent = HEX_MODAL_LABELS[hex.type] ?? (HEX_LABEL[hex.type] ?? hex.type);
    _renderOwnedHex(container, hex, _hexModalKey, state);
  } else if (hex.purchasable) {
    titleEl.textContent = '🏗 Territorio inesplorato';
    _renderBuildMenu(container, hex, _hexModalKey, state);
  }
}

// ── Static build ──────────────────────────────────────────────────────────────

export function buildUI(callbacks) {
  _cb = callbacks;

  // Research modal
  document.getElementById('modal-close-btn')
    .addEventListener('click', closeResearchModal);
  document.getElementById('research-modal')
    .addEventListener('click', e => {
      if (e.target === e.currentTarget) closeResearchModal();
    });

  // Build modal
  document.getElementById('build-modal-close-btn')
    .addEventListener('click', closeBuildModal);
  document.getElementById('build-modal')
    .addEventListener('click', e => {
      if (e.target === e.currentTarget) closeBuildModal();
    });

  // Craft modal
  document.getElementById('craft-modal-close-btn')
    .addEventListener('click', closeCraftModal);
  document.getElementById('craft-modal')
    .addEventListener('click', e => {
      if (e.target === e.currentTarget) closeCraftModal();
    });

  // Hex action modal
  document.getElementById('hex-modal-close-btn')
    .addEventListener('click', closeHexModal);
  document.getElementById('hex-modal')
    .addEventListener('click', e => {
      if (e.target === e.currentTarget) closeHexModal();
    });

  const list = document.getElementById('resource-list');
  list.innerHTML = '';
  for (const r of RESOURCE_LIST) {
    const div = document.createElement('div');
    div.className = 'resource-row';
    div.title = RESOURCE_DESC[r] ?? '';
    div.innerHTML =
      `<span class="res-icon">${RESOURCE_ICON[r]}</span>` +
      `<span class="res-name">${RESOURCE_LABEL[r]}</span>` +
      `<span class="res-amount" id="res-amt-${r}">0</span>`;
    list.appendChild(div);
  }
}

// ── Dynamic update ────────────────────────────────────────────────────────────

export function updateUI() {
  const state   = getState();
  const workers = getWorkers();
  const idle    = getIdleCount();

  document.getElementById('pop-total').textContent   = state.population;
  document.getElementById('workers-idle').textContent = idle;
  document.getElementById('workers-busy').textContent = workers.length - idle;

  for (const r of RESOURCE_LIST) {
    const el  = document.getElementById(`res-amt-${r}`);
    if (!el) continue;
    const val = state.resources[r] ?? 0;
    el.textContent = val;
    el.className   = 'res-amount' + (val > 0 ? ' nonzero' : '');
  }

  // Live-refresh open modals
  if (!document.getElementById('hex-modal').classList.contains('hidden')) {
    _populateHexModal(state);
  }
  if (!document.getElementById('research-modal').classList.contains('hidden')) {
    _populateResearchModal(state);
  }
  if (!document.getElementById('craft-modal').classList.contains('hidden')) {
    _populateCraftModal(state);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _makeBtn(text, cls, onClick, disabled = false) {
  const b = document.createElement('button');
  b.className   = cls;
  b.textContent = text;
  b.disabled    = disabled;
  b.addEventListener('click', onClick);
  return b;
}

// ── Owned hex panels ──────────────────────────────────────────────────────────

function _renderOwnedHex(container, hex, selKey, state) {
  switch (hex.type) {
    case 'starter':     return _panelVillaggio(container, state);
    case 'ricerca':     return _panelRicerca(container, hex, selKey, state);
    case 'cucina':
    case 'fabbro':
    case 'falegnameria':
    case 'caccia':      return _panelCraftStation(container, hex, selKey, state);
    case 'casa':        return _panelCasa(container);
    case 'ospedale':    return _panelOspedale(container, hex, selKey, state);
    default:            return _panelGather(container, hex, selKey);
  }
}

function _panelGather(container, hex, selKey) {
  const { q, r } = keyToHex(selKey);
  const yieldMap = HEX_YIELD[hex.type] ?? {};
  const yieldStr = Object.entries(yieldMap).map(([res, n]) => `${n} ${RESOURCE_LABEL[res]}`).join(', ');

  const info = document.createElement('div');
  info.className = 'hex-info-type';
  info.textContent = `Produzione: ${yieldStr}`;
  container.appendChild(info);

  const workers = getWorkers();
  const busy    = workers.some(w => w.targetHexKey === selKey && w.status !== 'idle');

  if (busy) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Lavoratore già in viaggio o al lavoro.';
    container.appendChild(hint);
  } else {
    container.appendChild(_makeBtn('👷 Invia lavoratore', 'action-btn', () => {
      _cb.onHarvest?.(q, r);
      closeHexModal();
    }));
  }
}

function _panelVillaggio(container, state) {
  const workers  = getWorkers();
  const unlocked = state.research?.unlocked ?? [];
  const canEvolve = unlocked.includes('evoluzione');
  const canAuto   = unlocked.includes('automazione');

  for (const w of workers) {
    const div = document.createElement('div');
    div.className = 'worker-row';

    let icon, label;
    if (w.sick) {
      icon = '🤒'; label = 'Malato';
    } else if (w.type === 'evolved') {
      icon = '⭐'; label = 'Lavoratore Evoluto';
    } else {
      icon = '👷'; label = 'Lavoratore';
    }

    const statusText = {
      idle:        'In attesa',
      going:       'In viaggio',
      returning:   'In rientro',
      researching: 'In ricerca',
      healing:     'In cura',
      crafting:    'Al lavoro',
    }[w.status] ?? w.status;

    div.innerHTML =
      `<span class="worker-icon">${icon}</span>` +
      `<span class="worker-label">${label} #${w.id + 1}</span>` +
      `<span class="worker-status">${statusText}</span>`;

    if (canAuto && !w.sick) {
      const autoBtn = _makeBtn(
        w.auto ? '🔄 Auto ON' : '🔄 Auto OFF',
        `worker-auto-btn ${w.auto ? 'active' : ''}`,
        () => { toggleWorkerAuto(w.id); updateUI(); }
      );
      div.appendChild(autoBtn);
    }

    if (canEvolve && w.type === 'normal' && !w.sick) {
      const enough = canAfford({ lingotti:3 });
      const evBtn  = _makeBtn(
        `Evolvi (3🥇)`, 'worker-evolve-btn',
        () => { if (evolveWorker(w.id)) updateUI(); },
        !enough
      );
      div.appendChild(evBtn);
    }

    container.appendChild(div);
  }
}

function _panelRicerca(container, hex, selKey, state) {
  const { q, r } = keyToHex(selKey);
  const workers   = getWorkers();
  const ra        = (state.research?.active ?? []).find(a => a.hexKey === selKey);
  const resWorker = workers.find(w => w.status === 'researching' && w.targetHexKey === selKey);
  const goingWorker = workers.find(w => w.targetHexKey === selKey && (w.status === 'going' || w.status === 'returning'));

  if (!resWorker && !goingWorker) {
    container.appendChild(_makeBtn('👷 Invia ricercatore', 'action-btn', () => {
      _cb.onHarvest?.(q, r);
      closeHexModal();
    }));
    return;
  }

  if (goingWorker && !resWorker) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = goingWorker.status === 'going' ? 'Ricercatore in viaggio…' : 'Ricercatore in rientro…';
    container.appendChild(hint);
    return;
  }

  container.appendChild(_makeBtn('↩ Richiama lavoratore', 'action-btn secondary',
    () => { recallResearcher(resWorker.id); updateUI(); }
  ));

  const sep = document.createElement('hr');
  sep.className = 'panel-sep';
  container.appendChild(sep);

  if (ra) {
    const recipe = RESEARCH_RECIPES[ra.recipeId];
    const pct    = Math.min(100, Math.round((ra.elapsed / recipe.time) * 100));
    const remSec = Math.max(0, Math.round(recipe.time - ra.elapsed));
    const prog   = document.createElement('div');
    prog.className = 'research-active';
    prog.innerHTML =
      `<div class="research-name">🔬 ${recipe.label}</div>` +
      `<div class="research-bar-wrap"><div class="research-bar" style="width:${pct}%"></div></div>` +
      `<div class="research-time">${remSec}s rimanenti</div>`;
    container.appendChild(prog);
  } else {
    container.appendChild(_makeBtn('🔬 Apri Albero della Ricerca', 'action-btn',
      () => { closeHexModal(); openResearchModal(selKey, state); }
    ));
  }
}

function _panelCraftStation(container, hex, selKey, state) {
  const { q, r } = keyToHex(selKey);
  const workers  = getWorkers();
  const worker   = workers.find(w => w.targetHexKey === selKey && w.status === 'crafting');
  const going    = workers.find(w => w.targetHexKey === selKey && (w.status === 'going' || w.status === 'returning'));

  if (!worker && !going) {
    container.appendChild(_makeBtn('👷 Invia lavoratore', 'action-btn', () => {
      _cb.onHarvest?.(q, r);
      closeHexModal();
    }));
    return;
  }

  if (going && !worker) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = going.status === 'going' ? 'Lavoratore in viaggio…' : 'Lavoratore in rientro…';
    container.appendChild(hint);
    return;
  }

  container.appendChild(_makeBtn('↩ Richiama lavoratore', 'action-btn secondary',
    () => { recallCrafter(worker.id); updateUI(); }
  ));

  const ca = hex.craftActive;
  if (ca) {
    const recipe = CRAFT_RECIPES[hex.type]?.[ca.recipeId];
    if (recipe) {
      const pct    = Math.min(100, Math.round((ca.elapsed / recipe.time) * 100));
      const remSec = Math.max(0, Math.round(recipe.time - ca.elapsed));
      const prog   = document.createElement('div');
      prog.className = 'research-active';
      prog.innerHTML =
        `<div class="research-name">⚙ ${recipe.label}</div>` +
        `<div class="research-bar-wrap"><div class="research-bar" style="width:${pct}%"></div></div>` +
        `<div class="research-time">${remSec}s rimanenti</div>`;
      container.appendChild(prog);
    }
  } else {
    const icon = { cucina:'🍳', fabbro:'🔨', falegnameria:'🪚', caccia:'🎯' }[hex.type];
    container.appendChild(_makeBtn(`${icon} Scegli ricetta`, 'action-btn',
      () => { closeHexModal(); openCraftModal(selKey, hex.type, state); }
    ));
  }
}

function _panelCasa(container) {
  const info = document.createElement('div');
  info.className = 'hex-info-type';
  info.textContent = 'Ha aggiunto 1 lavoratore al villaggio.';
  container.appendChild(info);
}

function _panelOspedale(container, hex, selKey, state) {
  const { q, r } = keyToHex(selKey);
  const workers  = getWorkers();
  const healing  = workers.filter(w => w.status === 'healing' && w.targetHexKey === selKey);
  const sickIdle = workers.filter(w => w.sick && w.status === 'idle');

  if (healing.length > 0) {
    for (const w of healing) {
      const pct = Math.min(100, Math.round(((w.healElapsed ?? 0) / 30) * 100));
      const div = document.createElement('div');
      div.className = 'research-active';
      div.innerHTML =
        `<div class="research-name">🤒 Lavoratore #${w.id + 1} in cura</div>` +
        `<div class="research-bar-wrap"><div class="research-bar" style="width:${pct}%"></div></div>`;
      container.appendChild(div);
    }
  }

  if (sickIdle.length === 0 && healing.length === 0) {
    const info = document.createElement('div');
    info.className = 'hex-info-type';
    info.textContent = '✅ Nessun malato da curare.';
    container.appendChild(info);
    return;
  }

  if (sickIdle.length > 0) {
    container.appendChild(_makeBtn(
      `👷 Invia malato in cura (${sickIdle.length})`, 'action-btn',
      () => { _cb.onHealWorker?.(q, r); closeHexModal(); }
    ));
  }
}

// ── Build menu (purchasable hex) ──────────────────────────────────────────────

function _renderBuildMenu(container, hex, selKey, state) {
  const { q, r } = keyToHex(selKey);

  const info = document.createElement('div');
  info.className = 'hex-info-type';
  info.textContent = 'Territorio disponibile per la costruzione.';
  container.appendChild(info);

  container.appendChild(_makeBtn('🏗 Scegli cosa costruire', 'buy-btn',
    () => { closeHexModal(); openBuildModal(q, r); }
  ));
}
