import {
  RESOURCE_LIST, RESOURCE_LABEL, RESOURCE_ICON,
  HEX_LABEL, HEX_YIELD, BUILD_COST,
  RESEARCH_RECIPES, CRAFT_RECIPES,
  PERMIT_TYPES, HEX_UPGRADES, computeHexYield, workerLabel, getHexConsume,
} from './config.js';
import { getState } from './state.js';
import { getWorkers, getIdleCount, recallWorker, evolveWorker, toggleWorkerAuto } from './workers.js';
import { hexDistance, keyToHex, hexKey } from './hex.js';
import { getSelectedHex } from './render.js';
import { canAfford, getResource } from './resources.js';
import { getAvailableBuildTypes, buildHex, getScaledBuildCost,
         getPermitResearchCost, upgradeHex, demolishHex } from './economy.js';

// ── Resource tooltips ─────────────────────────────────────────────────────────

const RESOURCE_DESC = {
  pietra:   'Pietra · Raccolta dalla Cava. Usata per costruire e forgiare.',
  acqua:    'Acqua · Raccolta dal Lago. Ingrediente base per cibo e costruzioni.',
  grano:    'Grano · Raccolto dal Campo. Ingrediente fondamentale per il cibo.',
  legno:    'Legno · Raccolto dal Bosco. Materiale da costruzione principale.',
  carne:    'Carne · Raccolta dal Pascolo o dalla Caccia. Ingrediente per il cibo.',
  sabbia:   'Sabbia · Raccolta dal Deserto. Usata per la produzione di mattoni.',
  ferro:    'Ferro · Raccolto dalla Miniera. Necessario per forgiare lingotti e strumenti.',
  mana:     'Mana ✨ · Energia magica rarissima (~0.5% per raccolta o crafting). Necessario per costruire Ricerca e per la Lega Preziosa al Fabbro.',
  ricerca:  'Ricerca 🔬 · Generata da un lavoratore nell\'Hex Ricerca (1 ogni 5s). Si spende per sbloccare tecnologie.',
  pane:     'Pane · Cibo lavorato. Si produce nella Cucina.',
  stufato:  'Stufato · Cibo ricco. Si produce nella Cucina.',
  mattoni:  'Mattoni · Materiale da costruzione avanzato. Si produce al Fabbro o in Falegnameria.',
  lingotti: 'Lingotti · Metallo raffinato. Si produce al Fabbro.',
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
  const unlocked = state.research?.unlocked ?? [];
  const actives  = state.research?.active   ?? [];
  const permits  = state.research?.permits  ?? {};

  for (const [id, recipe] of Object.entries(RESEARCH_RECIPES)) {
    const isPermit = PERMIT_TYPES.has(recipe.unlocks);

    // For upgrade/general: standard done check
    const done       = !isPermit && unlocked.includes(recipe.unlocks);
    const inProgress = !done && actives.some(a => RESEARCH_RECIPES[a.recipeId]?.unlocks === recipe.unlocks);
    const hexActive  = !done && actives.find(a => a.hexKey === _resHexKey);

    // For permits: use scaled cost
    const actualCost = isPermit ? getPermitResearchCost(id, state) : recipe.cost;
    const affordable = !done && !inProgress && !hexActive && canAfford(actualCost);
    const costStr    = _costHtml(actualCost);

    const card = document.createElement('div');
    card.className = `research-card ${done ? 'completed' : ''}`;

    // Extra info for permit types
    let extraInfo = '';
    if (isPermit) {
      const built   = state.buildCount?.[recipe.unlocks] ?? 0;
      const pending = permits[recipe.unlocks] ?? 0;
      if (pending > 0)  extraInfo = `<div class="research-permit-badge">✋ ${pending} permesso disponibile</div>`;
      else if (built > 0) extraInfo = `<div class="research-permit-badge dim">${built} già costruit${built>1?'e':'a'} — costo aumentato</div>`;
    }

    card.innerHTML =
      `<div class="research-card-name">${recipe.label}</div>` +
      `<div class="research-card-desc">${recipe.desc}</div>` +
      extraInfo +
      `<div class="research-card-meta">
        <span>${costStr}</span>
        <span class="meta-time">⏱ ${recipe.time}s</span>
      </div>`;

    if (!done) {
      let btnLabel;
      if (inProgress)      btnLabel = '🔬 In corso...';
      else if (hexActive)  btnLabel = '⚙ Hex già occupato';
      else if (!affordable) btnLabel = '🔒 Risorse insufficienti';
      else                 btnLabel = '▶ Avvia ricerca';

      const btn = _makeBtn(btnLabel, 'research-card-btn',
        () => {
          _cb.onStartResearch?.(id, _resHexKey);
          closeResearchModal();
          updateUI();
        },
        inProgress || !!hexActive || !canAfford(actualCost)
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

    const outStr  = Object.entries(recipe.output).map(([r, n]) => `${n}${RESOURCE_ICON[r]}`).join(' ');
    const costStr = hasInputs
      ? _costHtml(recipe.inputs) + ' → ' + outStr
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
  const state = getState();
  const types = getAvailableBuildTypes();

  for (const type of types) {
    const cost       = getScaledBuildCost(type, state);
    const affordable = canAfford(cost);
    const costStr    = _costHtml(cost);

    // Show how many permits are pending for permit types
    let permitBadge = '';
    if (PERMIT_TYPES.has(type)) {
      const p = state.research?.permits?.[type] ?? 0;
      const n = state.buildCount?.[type] ?? 0;
      if (p > 1) permitBadge = `<div class="build-card-permit">${p} permessi</div>`;
      if (n > 0) permitBadge += `<div class="build-card-permit dim">${n} già costruit${n>1?'e':'a'}</div>`;
    }

    const card = document.createElement('div');
    card.className = `build-card ${affordable ? '' : 'build-card-locked'}`;

    card.innerHTML =
      `<div class="build-card-icon">${BUILD_ICONS[type] ?? '🏗'}</div>` +
      `<div class="build-card-name">${HEX_LABEL[type] ?? type}</div>` +
      `<div class="build-card-cost">${costStr}</div>` +
      permitBadge;

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
      card.addEventListener('click', e => { if (e.target !== btn) btn.click(); });
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
    const level    = hex.level ?? 1;
    const levelTag = level > 1 ? ` <span class="hex-level-badge">Lvl ${level}</span>` : '';
    titleEl.innerHTML = (HEX_MODAL_LABELS[hex.type] ?? (HEX_LABEL[hex.type] ?? hex.type)) + levelTag;
    _renderOwnedHex(container, hex, _hexModalKey, state);

    // Demolish button (not for starter)
    if (hex.type !== 'starter') {
      const sep = document.createElement('hr');
      sep.className = 'panel-sep';
      container.appendChild(sep);

      container.appendChild(_makeBtn('🗑 Demolisci esagono', 'action-btn danger-action',
        () => {
          if (confirm(`Demolire ${HEX_LABEL[hex.type] ?? hex.type}? Riceverai il 40% delle risorse.`)) {
            const refund = _cb.onDemolish?.(_hexModalKey);
            closeHexModal();
          }
        }
      ));
    }
  } else if (hex.purchasable) {
    titleEl.textContent = '🏗 Territorio inesplorato';
    _renderBuildMenu(container, hex, _hexModalKey, state);
  }
}

// ── Static build ──────────────────────────────────────────────────────────────

export function buildUI(callbacks) {
  _cb = callbacks;

  document.getElementById('modal-close-btn')
    .addEventListener('click', closeResearchModal);
  document.getElementById('research-modal')
    .addEventListener('click', e => { if (e.target === e.currentTarget) closeResearchModal(); });

  document.getElementById('build-modal-close-btn')
    .addEventListener('click', closeBuildModal);
  document.getElementById('build-modal')
    .addEventListener('click', e => { if (e.target === e.currentTarget) closeBuildModal(); });

  document.getElementById('craft-modal-close-btn')
    .addEventListener('click', closeCraftModal);
  document.getElementById('craft-modal')
    .addEventListener('click', e => { if (e.target === e.currentTarget) closeCraftModal(); });

  document.getElementById('hex-modal-close-btn')
    .addEventListener('click', closeHexModal);
  document.getElementById('hex-modal')
    .addEventListener('click', e => { if (e.target === e.currentTarget) closeHexModal(); });

  // Delegated listener for village worker buttons (recall / auto / evolve).
  // These buttons are destroyed and recreated every updateUI() tick, so we
  // attach ONE persistent listener to the stable container instead.
  document.getElementById('hex-modal-content')
    .addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const { action, workerId } = btn.dataset;
      const id = Number(workerId);
      if (action === 'recall') {
        recallWorker(id); updateUI();
      } else if (action === 'auto') {
        toggleWorkerAuto(id); updateUI();
      } else if (action === 'evolve') {
        if (evolveWorker(id)) updateUI();
      }
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

// ── Level-up modal ────────────────────────────────────────────────────────────

let _onBonusSelect = null;

export function openLevelUpModal(level, choices, onSelect) {
  _onBonusSelect = onSelect;
  document.getElementById('levelup-num').textContent = level;
  const container = document.getElementById('levelup-modal-content');
  container.innerHTML = '';

  for (const choice of choices) {
    const card = document.createElement('div');
    card.className = 'levelup-card';
    card.innerHTML =
      `<div class="levelup-card-label">${choice.label}</div>` +
      `<div class="levelup-card-desc">${choice.desc}</div>`;
    card.addEventListener('click', () => {
      document.getElementById('levelup-modal').classList.add('hidden');
      _onBonusSelect?.(choice);
    });
    container.appendChild(card);
  }

  document.getElementById('levelup-modal').classList.remove('hidden');
}

// ── Dynamic update ────────────────────────────────────────────────────────────

/**
 * updateUI(fullModal)
 *   fullModal = true  → full rebuild of any open modal (use after player actions)
 *   fullModal = false → lightweight in-place update only (use from game-loop callbacks)
 *                       avoids destroying/recreating DOM elements that cause flicker
 *                       and missed clicks
 */
export function updateUI(fullModal = true) {
  const state   = getState();
  const workers = getWorkers();
  const idle    = getIdleCount();

  document.getElementById('pop-total').textContent    = state.population;
  document.getElementById('workers-idle').textContent  = idle;
  document.getElementById('workers-busy').textContent  = workers.length - idle;

  for (const r of RESOURCE_LIST) {
    const el  = document.getElementById(`res-amt-${r}`);
    if (!el) continue;
    const val = state.resources[r] ?? 0;
    el.textContent = val;
    el.className   = 'res-amount' + (val > 0 ? ' nonzero' : '');
  }


  const hexModalOpen      = !document.getElementById('hex-modal').classList.contains('hidden');
  const researchModalOpen = !document.getElementById('research-modal').classList.contains('hidden');
  const craftModalOpen    = !document.getElementById('craft-modal').classList.contains('hidden');

  if (fullModal) {
    if (hexModalOpen)      _populateHexModal(state);
    if (researchModalOpen) _populateResearchModal(state);
    if (craftModalOpen)    _populateCraftModal(state);
  } else {
    // Lightweight: update only dynamic text/state inside open modals, no innerHTML wipe
    if (hexModalOpen)      _lightTickHexModal(state);
    if (researchModalOpen) _populateResearchModal(state); // small enough to rebuild safely
    if (craftModalOpen)    _populateCraftModal(state);   // same
  }
}

// ── Lightweight in-place hex modal tick ───────────────────────────────────────
// Updates worker status text and recall-button state without touching innerHTML.
function _lightTickHexModal(state) {
  if (!_hexModalKey) return;
  const hex = state.hexes[_hexModalKey];
  if (!hex || hex.type !== 'starter') return; // only village has dynamic worker rows

  const STATUS_LABEL = {
    idle:'In attesa', going:'In viaggio', returning:'In rientro',
    researching:'In ricerca', healing:'In cura', crafting:'Al lavoro',
  };

  for (const w of getWorkers()) {
    // Status text
    const stEl = document.querySelector(`[data-wstatus="${w.id}"]`);
    if (stEl) {
      const dest = w.targetHexKey && state.hexes[w.targetHexKey]
        ? ` → ${HEX_LABEL[state.hexes[w.targetHexKey].type] ?? '?'}` : '';
      stEl.textContent = (STATUS_LABEL[w.status] ?? w.status) + dest;
    }
    // Recall button
    const rb = document.querySelector(`button[data-action="recall"][data-worker-id="${w.id}"]`);
    if (rb) {
      const returning = w.status === 'returning';
      rb.disabled     = returning;
      rb.textContent  = returning ? '↩…' : '↩ Richiama';
      rb.title        = returning ? 'Già in rientro' : 'Richiama al villaggio';
    }
    // Auto button label
    const ab = document.querySelector(`button[data-action="auto"][data-worker-id="${w.id}"]`);
    if (ab) {
      ab.textContent = w.auto ? '🔄 Auto ON' : '🔄 Auto';
      ab.className   = `worker-action-btn ${w.auto ? 'active' : ''}`;
      ab.disabled    = w.sick;
      ab.title       = w.sick ? 'Non disponibile mentre il lavoratore è malato' : '';
    }
    // Status badges
    const bb = document.querySelector(`[data-wbadges="${w.id}"]`);
    if (bb) bb.innerHTML = _workerBadgesHtml(w);
  }
}


function _renderConsumptions(state) {
  const el = document.getElementById('consume-list');
  if (!el) return;

  // Show the pending consumption of all workers currently on a trip (going or crafting)
  const pending = {};
  for (const w of getWorkers()) {
    if (w.status === 'idle' || w.status === 'returning') continue;
    if (!w.consume) continue;
    for (const [r, n] of Object.entries(w.consume)) {
      pending[r] = (pending[r] ?? 0) + n;
    }
  }

  const entries = Object.entries(pending).filter(([, n]) => n > 0);
  if (entries.length === 0) {
    el.innerHTML = '<span class="consume-empty">Nessun consumo in corso</span>';
    return;
  }

  el.innerHTML = entries
    .map(([r, n]) => `<span class="consume-item"><span class="consume-minus">-${n}</span> ${RESOURCE_ICON[r] ?? r} ${RESOURCE_LABEL[r] ?? r}</span>`)
    .join('');
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

function _workerBadgesHtml(w) {
  const badges = [];
  if (w.sick)            badges.push(`<span class="wbadge wbadge-sick">🤒 Malato</span>`);
  if (w.resourcePenalty) badges.push(`<span class="wbadge wbadge-slow">🐌 Rallentato</span>`);
  if (w.auto)            badges.push(`<span class="wbadge wbadge-auto">🔄 Auto</span>`);
  return badges.join('');
}

function _costStr(cost) {
  return Object.entries(cost).map(([r, n]) => `${n}${RESOURCE_ICON[r]}`).join(' ');
}

/** Renders cost entries as HTML spans — dim (low-opacity) when not enough, bright when sufficient. */
function _costHtml(cost) {
  return Object.entries(cost)
    .map(([r, n]) => {
      const have = getResource(r) >= n;
      return `<span class="cost-entry ${have ? 'cost-ok' : 'cost-missing'}">${n}${RESOURCE_ICON[r]}</span>`;
    })
    .join(' ');
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
    default:            return _panelGather(container, hex, selKey, state);
  }
}

function _panelGather(container, hex, selKey, state) {
  const { q, r } = keyToHex(selKey);
  const yieldMap  = computeHexYield(hex);
  const yieldStr  = Object.entries(yieldMap).map(([res, n]) => `${n} ${RESOURCE_LABEL[res]}`).join(', ');
  const level     = hex.level ?? 1;

  const info = document.createElement('div');
  info.className = 'hex-info-type';
  info.textContent = `Produzione: ${yieldStr}`;
  container.appendChild(info);

  // Consumption preview (lake/pasture are random — show both options)
  const isRandom = hex.type === 'lake' || hex.type === 'pasture';
  const lv = hex.level ?? 1;
  const consumeMap = isRandom ? { grano: lv, carne: lv } : getHexConsume(hex.type, lv);
  const consumeEntries = Object.entries(consumeMap).filter(([, n]) => n > 0);
  if (consumeEntries.length > 0) {
    const consumeEl = document.createElement('div');
    consumeEl.className = 'hex-consume-info';
    const parts = consumeEntries.map(([r, n]) => `-${n} ${RESOURCE_ICON[r] ?? r} ${RESOURCE_LABEL[r] ?? r}`);
    consumeEl.textContent = `Consumo: ${parts.join(isRandom ? ' o ' : ', ')}`;
    container.appendChild(consumeEl);
  }

  const workers = getWorkers();
  const busy    = workers.some(w => w.targetHexKey === selKey && w.status !== 'idle' && w.status !== 'returning');

  if (busy) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Lavoratore già assegnato.';
    container.appendChild(hint);
  } else if (getWorkers().some(w => w.status === 'idle')) {
    container.appendChild(_makeBtn('👷 Invia lavoratore', 'action-btn', () => {
      _cb.onHarvest?.(q, r);
      closeHexModal();
    }));
  } else {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Nessun lavoratore disponibile.';
    container.appendChild(hint);
  }

  // Upgrade section
  const upgrades    = HEX_UPGRADES[hex.type] ?? [];
  const nextUpgrade = upgrades.find(u => u.level === level + 1);
  if (nextUpgrade) {
    const unlocked   = state.research?.unlocked ?? [];
    const isUnlocked = unlocked.includes(nextUpgrade.unlocks);
    const sep = document.createElement('hr');
    sep.className = 'panel-sep';
    container.appendChild(sep);

    if (isUnlocked) {
      const canAff   = canAfford(nextUpgrade.buildCost);
      const costDesc = _costStr(nextUpgrade.buildCost);
      container.appendChild(_makeBtn(
        `⬆ Potenzia a Lvl ${nextUpgrade.level} — ${costDesc}`,
        'action-btn' + (canAff ? '' : ' secondary'),
        () => { _cb.onUpgrade?.(_hexModalKey); closeHexModal(); },
        !canAff
      ));
    } else {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = `Ricerca "${HEX_LABEL[hex.type]} Livello ${nextUpgrade.level}" per sbloccare il potenziamento.`;
      container.appendChild(hint);
    }
  }
}

function _panelVillaggio(container, state) {
  const workers   = getWorkers();
  const unlocked  = state.research?.unlocked ?? [];
  const canEvolve = unlocked.includes('evoluzione');
  const canAuto   = unlocked.includes('automazione');

  for (const w of workers) {
    const div = document.createElement('div');
    div.className = 'worker-row';

    const icon = w.sick ? '🤒' : w.type === 'evolved' ? '⭐' : '👷';

    const statusText = {
      idle:        'In attesa',
      going:       'In viaggio',
      returning:   'In rientro',
      researching: 'In ricerca',
      healing:     'In cura',
      crafting:    'Al lavoro',
    }[w.status] ?? w.status;

    let dest = '';
    if (w.targetHexKey && state.hexes[w.targetHexKey]) {
      dest = ` → ${HEX_LABEL[state.hexes[w.targetHexKey].type] ?? '?'}`;
    }

    // ── Top row: icon · name · [actions] ──────────────────────────────────
    const topRow = document.createElement('div');
    topRow.className = 'worker-row-top';
    topRow.innerHTML =
      `<span class="worker-icon">${icon}</span>` +
      `<span class="worker-label">Lavoratore ${workerLabel(w.id)}</span>`;

    const actions = document.createElement('div');
    actions.className = 'worker-row-actions';

    // Recall button
    if (w.status !== 'idle') {
      const returning = w.status === 'returning';
      const recallBtn = document.createElement('button');
      recallBtn.className = 'worker-action-btn';
      recallBtn.textContent = returning ? '↩…' : '↩ Richiama';
      recallBtn.title    = returning ? 'Già in rientro' : 'Richiama al villaggio';
      recallBtn.disabled = returning;
      recallBtn.dataset.action   = 'recall';
      recallBtn.dataset.workerId = w.id;
      actions.appendChild(recallBtn);
    }

    if (canAuto) {
      const autoBtn = document.createElement('button');
      autoBtn.className = `worker-action-btn ${w.auto ? 'active' : ''}`;
      autoBtn.textContent = w.auto ? '🔄 Auto ON' : '🔄 Auto';
      autoBtn.disabled = w.sick;
      autoBtn.title = w.sick ? 'Non disponibile mentre il lavoratore è malato' : '';
      autoBtn.dataset.action   = 'auto';
      autoBtn.dataset.workerId = w.id;
      actions.appendChild(autoBtn);
    }

    if (canEvolve && w.type === 'normal' && !w.sick) {
      const enough = canAfford({ lingotti:3 });
      const evBtn  = document.createElement('button');
      evBtn.className = 'worker-action-btn evolve';
      evBtn.textContent = 'Evolvi (3🥇)';
      evBtn.disabled = !enough;
      evBtn.dataset.action   = 'evolve';
      evBtn.dataset.workerId = w.id;
      actions.appendChild(evBtn);
    }

    topRow.appendChild(actions);
    div.appendChild(topRow);

    // ── Bottom row: status pill · badges ───────────────────────────────────
    const botRow = document.createElement('div');
    botRow.className = 'worker-row-bottom';
    botRow.innerHTML =
      `<span class="worker-status" data-wstatus="${w.id}">${statusText}${dest}</span>` +
      `<span class="worker-badges" data-wbadges="${w.id}">${_workerBadgesHtml(w)}</span>`;
    div.appendChild(botRow);

    container.appendChild(div);
  }
}

function _panelRicerca(container, hex, selKey, state) {
  const { q, r }    = keyToHex(selKey);
  const workers     = getWorkers();
  const ra          = (state.research?.active ?? []).find(a => a.hexKey === selKey);
  const resWorker   = workers.find(w => w.status === 'researching' && w.targetHexKey === selKey);
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
    () => { recallWorker(resWorker.id); updateUI(); }
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
  const { q, r }  = keyToHex(selKey);
  const workers   = getWorkers();
  const worker    = workers.find(w => w.targetHexKey === selKey && w.status === 'crafting');
  const going     = workers.find(w => w.targetHexKey === selKey && (w.status === 'going' || w.status === 'returning'));

  if (!worker && !going) {
    if (getWorkers().some(w => w.status === 'idle')) {
      container.appendChild(_makeBtn('👷 Invia lavoratore', 'action-btn', () => {
        _cb.onHarvest?.(q, r);
        closeHexModal();
      }));
    } else {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = 'Nessun lavoratore disponibile.';
      container.appendChild(hint);
    }
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
    () => { recallWorker(worker.id); updateUI(); }
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
        `<div class="research-name">🤒 Lavoratore ${workerLabel(w.id)} in cura</div>` +
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
