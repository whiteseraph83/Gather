// ── Game constants ────────────────────────────────────────────────────────────

export const HEX_SIZE          = 52;
export const MIN_SCALE         = 0.5;
export const MAX_SCALE         = 2.0;
export const INITIAL_SCALE     = 1.0;
export const AUTOSAVE_MS       = 30_000;
export const WORKER_SPEED      = 95;
export const SAVE_KEY          = 'hexdomain_save';
export const SAVE_VERSION      = 5;
export const GAME_VERSION      = '1.13';
export const HEAL_TIME         = 30;
export const RESEARCH_GEN_TIME = 5;
export const MANA_DROP_RATE    = 0.012; // ~1.2% per gather/craft completion

// ── Permit types (each research grants ONE build permit, consumed on build) ───

export const PERMIT_TYPES = new Set([
  'casa', 'cucina', 'fabbro', 'ospedale', 'falegnameria', 'caccia',
]);

// ── Worker label helper ───────────────────────────────────────────────────────

export function workerLabel(id) {
  if (id < 26) return String.fromCharCode(65 + id);
  return String.fromCharCode(65 + Math.floor(id / 26) - 1) +
         String.fromCharCode(65 + (id % 26));
}

// ── Hex types ─────────────────────────────────────────────────────────────────

export const HEX_TYPE = Object.freeze({
  STARTER:      'starter',
  FIELD:        'field',
  QUARRY:       'quarry',
  LAKE:         'lake',
  FOREST:       'forest',
  PASTURE:      'pasture',
  DESERT:       'desert',
  MINE:         'mine',
  RICERCA:      'ricerca',
  CUCINA:       'cucina',
  FABBRO:       'fabbro',
  CASA:         'casa',
  OSPEDALE:     'ospedale',
  FALEGNAMERIA: 'falegnameria',
  CACCIA:       'caccia',
});

export const HEX_COLOR = {
  starter:      '#7a5832',
  field:        '#8c7010',
  quarry:       '#4e3e32',
  lake:         '#103c72',
  forest:       '#0c3818',
  pasture:      '#246018',
  desert:       '#b87018',
  mine:         '#201408',
  ricerca:      '#1a1060',
  cucina:       '#6b2a00',
  fabbro:       '#1c1c1c',
  casa:         '#5c3820',
  ospedale:     '#c0d8e0',
  falegnameria: '#3d2010',
  caccia:       '#1a3a08',
};

export const HEX_LABEL = {
  starter:      'Villaggio',
  field:        'Campo',
  quarry:       'Cava',
  lake:         'Lago',
  forest:       'Bosco',
  pasture:      'Pascolo',
  desert:       'Deserto',
  mine:         'Miniera',
  ricerca:      'Ricerca',
  cucina:       'Cucina',
  fabbro:       'Fabbro',
  casa:         'Casa',
  ospedale:     'Ospedale',
  falegnameria: 'Falegnameria',
  caccia:       'Caccia',
};

export const RANDOM_HEX_TYPES = [
  'field','quarry','lake','forest','pasture','desert','mine',
];

export const DEFAULT_BUILD_TYPES = [
  'field','quarry','lake','forest','pasture','desert','mine','ricerca',
];

export const SPECIAL_HEX_TYPES = [
  'cucina','fabbro','casa','ospedale','falegnameria','caccia',
];

// ── Resources ─────────────────────────────────────────────────────────────────

export const RESOURCE_LIST = [
  'pietra','acqua','grano','legno','carne','sabbia','ferro','mana','ricerca',
  'pane','stufato','mattoni','lingotti',
];

export const RESOURCE_LABEL = {
  pietra:'Pietra', acqua:'Acqua',   grano:'Grano',    legno:'Legno',
  carne:'Carne',   sabbia:'Sabbia', ferro:'Ferro',    mana:'Mana',  ricerca:'Ricerca',
  pane:'Pane',     stufato:'Stufato', mattoni:'Mattoni', lingotti:'Lingotti',
};

export const RESOURCE_ICON = {
  pietra:'🪨', acqua:'💧',  grano:'🌾',  legno:'🪵',
  carne:'🥩',  sabbia:'🏖', ferro:'⚙',  mana:'✨', ricerca:'🔬',
  pane:'🍞',   stufato:'🍲', mattoni:'🧱', lingotti:'🥇',
};

export const HEX_YIELD = {
  starter:      { pietra:2, acqua:2, grano:2, legno:2, carne:1, sabbia:2, ferro:1 },
  field:        { grano:4 },
  quarry:       { pietra:4 },
  lake:         { acqua:4 },
  forest:       { legno:4 },
  pasture:      { carne:3 },
  desert:       { sabbia:4 },
  mine:         { ferro:3 },
  caccia:       { carne:4 },
};

// ── Hex upgrades (base hex level-up system) ───────────────────────────────────

export const HEX_UPGRADES = {
  field:   [
    { level:2, unlocks:'field_2',   buildCost:{legno:12, pietra:5},    yieldBonus:{grano:3}  },
    { level:3, unlocks:'field_3',   buildCost:{legno:30, pietra:15},   yieldBonus:{grano:6}  },
  ],
  quarry:  [
    { level:2, unlocks:'quarry_2',  buildCost:{ferro:5,  pietra:12},   yieldBonus:{pietra:3} },
    { level:3, unlocks:'quarry_3',  buildCost:{ferro:15, pietra:30},   yieldBonus:{pietra:6} },
  ],
  lake:    [
    { level:2, unlocks:'lake_2',    buildCost:{acqua:15, legno:8},     yieldBonus:{acqua:3}  },
    { level:3, unlocks:'lake_3',    buildCost:{acqua:40, legno:20},    yieldBonus:{acqua:6}  },
  ],
  forest:  [
    { level:2, unlocks:'forest_2',  buildCost:{legno:18, pietra:5},    yieldBonus:{legno:3}  },
    { level:3, unlocks:'forest_3',  buildCost:{legno:45, pietra:15},   yieldBonus:{legno:6}  },
  ],
  pasture: [
    { level:2, unlocks:'pasture_2', buildCost:{grano:12, legno:8},     yieldBonus:{carne:2}  },
    { level:3, unlocks:'pasture_3', buildCost:{grano:30, legno:20},    yieldBonus:{carne:4}  },
  ],
  desert:  [
    { level:2, unlocks:'desert_2',  buildCost:{sabbia:18, pietra:5},   yieldBonus:{sabbia:3} },
    { level:3, unlocks:'desert_3',  buildCost:{sabbia:45, pietra:15},  yieldBonus:{sabbia:6} },
  ],
  mine:    [
    { level:2, unlocks:'mine_2',    buildCost:{pietra:18, ferro:8},    yieldBonus:{ferro:2}  },
    { level:3, unlocks:'mine_3',    buildCost:{pietra:45, ferro:20},   yieldBonus:{ferro:4}  },
  ],
};

/** Compute the actual yield for a hex, including level bonuses. */
export function computeHexYield(hex) {
  const base    = { ...(HEX_YIELD[hex.type] ?? {}) };
  const level   = hex.level ?? 1;
  if (level <= 1) return base;
  for (const u of (HEX_UPGRADES[hex.type] ?? [])) {
    if (u.level <= level) {
      for (const [r, v] of Object.entries(u.yieldBonus)) {
        base[r] = (base[r] ?? 0) + v;
      }
    }
  }
  return base;
}

// ── Resource consumption per gather trip ──────────────────────────────────────
// Called at dispatch time; random choices (lake/pasture) are resolved then.

export function getHexConsume(hexType, level = 1) {
  const lv = Math.max(1, level);
  switch (hexType) {
    case 'forest':  return { ferro: lv };                                               // ascia di ferro
    case 'quarry':  return { ferro: lv };                                               // piccone di ferro
    case 'field':   return { acqua: lv };                                               // irrigazione
    case 'lake':    return Math.random() < 0.5 ? { grano: lv } : { carne: lv };        // esca
    case 'pasture': return Math.random() < 0.5 ? { grano: lv } : { carne: lv };        // mangime
    case 'desert':  return { acqua: lv };                                               // sete
    case 'mine':    return { legno: lv };                                               // puntelli di legno
    default:        return {};
  }
}

// ── Build costs (complex hexes are expensive) ─────────────────────────────────

export const BUILD_COST = {
  // Base resource hexes — cheap
  field:        { legno:2,   pietra:1 },
  quarry:       { legno:2,   pietra:3 },
  lake:         { legno:2,   acqua:3  },
  forest:       { legno:4,   grano:1  },
  pasture:      { legno:2,   grano:3  },
  desert:       { sabbia:4 },
  mine:         { pietra:5,  legno:2  },
  // Research
  ricerca:      { pietra:15, legno:15, mana:2 },
  // Special hexes (permits; costs scale with buildCount)
  cucina:       { legno:25,  pietra:12, grano:20 },
  fabbro:       { pietra:30, ferro:15,  legno:10 },
  casa:         { legno:25,  pietra:15 },
  ospedale:     { legno:25,  pietra:20, acqua:15 },
  falegnameria: { legno:35,  pietra:15 },
  caccia:       { legno:20,  carne:10  },
};

// ── Research recipes ──────────────────────────────────────────────────────────

export const RESEARCH_RECIPES = {
  // Special hexes (category:'special') — each gives 1 build permit
  sblocca_cucina:        { cost:{ricerca:8},  time:60,  unlocks:'cucina',        label:'Sblocca Cucina',        desc:'Permette di costruire 1 Cucina per produrre cibo lavorato',    category:'special' },
  sblocca_fabbro:        { cost:{ricerca:12}, time:90,  unlocks:'fabbro',        label:'Sblocca Fabbro',        desc:'Permette di costruire 1 Fabbro per forgiare metalli',          category:'special' },
  sblocca_casa:          { cost:{ricerca:5},  time:30,  unlocks:'casa',          label:'Sblocca Casa',          desc:'Permette di costruire 1 Casa (+1 lavoratore permanente)',       category:'special' },
  sblocca_ospedale:      { cost:{ricerca:18}, time:120, unlocks:'ospedale',      label:'Sblocca Ospedale',      desc:'Permette di costruire 1 Ospedale per curare i malati',         category:'special' },
  sblocca_falegnameria:  { cost:{ricerca:10}, time:75,  unlocks:'falegnameria',  label:'Sblocca Falegnameria',  desc:'Permette di costruire 1 Falegnameria per lavorare il legno',   category:'special' },
  sblocca_caccia:        { cost:{ricerca:6},  time:45,  unlocks:'caccia',        label:'Sblocca Caccia',        desc:'Permette di costruire 1 Campo di Caccia',                      category:'special' },

  // Permanent general unlocks (category:'general')
  velocita_lavoratori:   { cost:{ricerca:15}, time:180, unlocks:'velocita',      label:'Velocità Lavoratori',   desc:'I lavoratori si muovono il 50% più velocemente',               category:'general' },
  automazione:           { cost:{ricerca:20}, time:240, unlocks:'automazione',   label:'Automazione',           desc:'I lavoratori possono essere impostati in modalità automatica', category:'general' },
  evoluzione_lavoratore: { cost:{ricerca:30}, time:300, unlocks:'evoluzione',    label:'Evolvi Lavoratore',     desc:'Permette di evolvere i lavoratori (velocità ×2)',               category:'general' },

  // Hex upgrades (category:'upgrade') — permanent unlock, upgrade at hex
  campo_lv2:    { cost:{ricerca:10}, time:90,  unlocks:'field_2',   label:'Campo Livello 2',        desc:'Sblocca potenziamento dei Campi (+3 🌾 per raccolto)',          category:'upgrade' },
  campo_lv3:    { cost:{ricerca:25}, time:180, unlocks:'field_3',   label:'Campo Livello 3',        desc:'Potenziamento massimo dei Campi (+6 🌾 per raccolto)',          category:'upgrade' },
  cava_lv2:     { cost:{ricerca:10}, time:90,  unlocks:'quarry_2',  label:'Cava Livello 2',         desc:'Sblocca potenziamento delle Cave (+3 🪨 per raccolto)',         category:'upgrade' },
  cava_lv3:     { cost:{ricerca:25}, time:180, unlocks:'quarry_3',  label:'Cava Livello 3',         desc:'Potenziamento massimo delle Cave (+6 🪨 per raccolto)',         category:'upgrade' },
  lago_lv2:     { cost:{ricerca:10}, time:90,  unlocks:'lake_2',    label:'Lago Livello 2',         desc:'Sblocca potenziamento dei Laghi (+3 💧 per raccolto)',          category:'upgrade' },
  lago_lv3:     { cost:{ricerca:25}, time:180, unlocks:'lake_3',    label:'Lago Livello 3',         desc:'Potenziamento massimo dei Laghi (+6 💧 per raccolto)',          category:'upgrade' },
  bosco_lv2:    { cost:{ricerca:10}, time:90,  unlocks:'forest_2',  label:'Bosco Livello 2',        desc:'Sblocca potenziamento dei Boschi (+3 🪵 per raccolto)',         category:'upgrade' },
  bosco_lv3:    { cost:{ricerca:25}, time:180, unlocks:'forest_3',  label:'Bosco Livello 3',        desc:'Potenziamento massimo dei Boschi (+6 🪵 per raccolto)',         category:'upgrade' },
  pascolo_lv2:  { cost:{ricerca:10}, time:90,  unlocks:'pasture_2', label:'Pascolo Livello 2',      desc:'Sblocca potenziamento dei Pascoli (+2 🥩 per raccolto)',        category:'upgrade' },
  pascolo_lv3:  { cost:{ricerca:25}, time:180, unlocks:'pasture_3', label:'Pascolo Livello 3',      desc:'Potenziamento massimo dei Pascoli (+4 🥩 per raccolto)',        category:'upgrade' },
  deserto_lv2:  { cost:{ricerca:10}, time:90,  unlocks:'desert_2',  label:'Deserto Livello 2',      desc:'Sblocca potenziamento dei Deserti (+3 🏖 per raccolto)',        category:'upgrade' },
  deserto_lv3:  { cost:{ricerca:25}, time:180, unlocks:'desert_3',  label:'Deserto Livello 3',      desc:'Potenziamento massimo dei Deserti (+6 🏖 per raccolto)',        category:'upgrade' },
  miniera_lv2:  { cost:{ricerca:12}, time:90,  unlocks:'mine_2',    label:'Miniera Livello 2',      desc:'Sblocca potenziamento delle Miniere (+2 ⚙ per raccolto)',      category:'upgrade' },
  miniera_lv3:  { cost:{ricerca:30}, time:180, unlocks:'mine_3',    label:'Miniera Livello 3',      desc:'Potenziamento massimo delle Miniere (+4 ⚙ per raccolto)',      category:'upgrade' },
};

// ── Crafting station recipes ──────────────────────────────────────────────────
// Rule: no-input recipes (base) → lots of output
//       input-consuming recipes (complex) → 1 of output

export const CACCIA_RECIPES = {
  lepre:     { output:{carne:10}, time:20, label:'Lepre 🐇',     desc:'Caccia veloce' },
  cervo:     { output:{carne:22}, time:35, label:'Cervo 🦌',     desc:'Alta resa di carne' },
  cinghiale: { output:{carne:38}, time:50, label:'Cinghiale 🐗', desc:'Ottima resa, più lento' },
};

export const CUCINA_RECIPES = {
  pane_artigianale: { inputs:{grano:3, acqua:1},         output:{pane:1},           time:20, label:'Pane Artigianale', desc:'Trasforma grano e acqua in pane' },
  stufato_ricco:    { inputs:{carne:2, acqua:1, grano:2}, output:{stufato:1},        time:30, label:'Stufato Ricco',    desc:'Ricetta elaborata' },
  pasto_misto:      { inputs:{grano:1, carne:1, acqua:1}, output:{pane:1,stufato:1}, time:25, label:'Pasto Misto',      desc:'Ricetta equilibrata' },
};

export const FABBRO_RECIPES = {
  lingotti_puri:      { inputs:{ferro:3},          output:{lingotti:1},  time:30, label:'Lingotti Puri',      desc:'Raffina il ferro in lingotti' },
  mattoni_rinforzati: { inputs:{pietra:3, ferro:1}, output:{mattoni:1},  time:25, label:'Mattoni Rinforzati', desc:'Mattoni extra resistenti' },
  lega_preziosa:      { inputs:{ferro:4, mana:1},   output:{lingotti:3}, time:45, label:'Lega Preziosa',      desc:'La magia potenzia il metallo' },
};

export const FALEGNAMERIA_RECIPES = {
  assi:      { inputs:{legno:4},           output:{mattoni:1},  time:20, label:'Assi da Costruzione', desc:'Legname grezzo lavorato' },
  mobili:    { inputs:{legno:6, pietra:1}, output:{mattoni:1},  time:35, label:'Mobili',              desc:'Lavorazione fine del legno' },
  strumenti: { inputs:{legno:4, ferro:2},  output:{lingotti:1}, time:40, label:'Strumenti',           desc:'Attrezzi combinati' },
};

export const CRAFT_RECIPES = {
  cucina:       CUCINA_RECIPES,
  fabbro:       FABBRO_RECIPES,
  falegnameria: FALEGNAMERIA_RECIPES,
  caccia:       CACCIA_RECIPES,
};

// ── Hex grid ──────────────────────────────────────────────────────────────────

export const HEX_DIRS = [
  {q:1,r:0},{q:1,r:-1},{q:0,r:-1},
  {q:-1,r:0},{q:-1,r:1},{q:0,r:1},
];
