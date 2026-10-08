// ── Hex Domain · Internationalisation ─────────────────────────────────────────
// Supported: 'en' (default), 'it'

import {
  RESOURCE_LABEL, HEX_LABEL, RESEARCH_RECIPES, CRAFT_RECIPES,
} from './config.js';

const LANG_KEY = 'hexdomain_lang';
let _lang = localStorage.getItem(LANG_KEY) ?? 'en';

export const getLang = () => _lang;
export const setLang = (l) => { _lang = l; localStorage.setItem(LANG_KEY, l); };

// ── General UI string table ────────────────────────────────────────────────────

const S = {
  // Sidebar
  'sidebar.population':     { it:'Popolazione',        en:'Settlers'       },
  'sidebar.total':          { it:'Totale',              en:'Total'          },
  'sidebar.idle':           { it:'Idle',                en:'Idle'           },
  'sidebar.active':         { it:'Occupati',            en:'Active'         },
  'sidebar.resources':      { it:'Risorse',             en:'Resources'      },
  'sidebar.tribute':        { it:'Tasse giornaliere',   en:'Daily Tribute'  },
  'sidebar.day':            { it:'Giorno',              en:'Day'            },
  'sidebar.newgame':        { it:'↺ Nuova partita',     en:'↺ New Game'    },
  'sidebar.tooltip':        {
    it:'Al termine di ogni giornata vengono detratte le tasse. Se le paghi interamente ricevi un bonus a scelta tra 3 opzioni. Le tasse aumentano ogni giorno.',
    en:'At the end of each day, tributes are collected. Pay in full to claim a boon from 3 choices. Tribute grows each day.',
  },
  // Modals
  'modal.build':            { it:'🏗 Costruisci',            en:'🏗 Build'         },
  'modal.research':         { it:'🔬 Albero della Ricerca',  en:'🔬 Arcane Arts'   },
  'modal.levelup.prefix':   { it:'🌅 Tasse pagate — Giorno', en:'🌅 Tribute Paid — Day' },
  'modal.levelup.choose':   { it:'Scegli un potenziamento:', en:'Choose your boon:' },
  // Worker statuses
  'worker.idle':            { it:'In attesa',    en:'Idle'        },
  'worker.going':           { it:'In viaggio',   en:'Travelling'  },
  'worker.returning':       { it:'In rientro',   en:'Returning'   },
  'worker.researching':     { it:'In ricerca',   en:'Studying'    },
  'worker.healing':         { it:'In cura',      en:'Healing'     },
  'worker.crafting':        { it:'Al lavoro',    en:'Working'     },
  // Worker UI
  'worker.name':            { it:'Lavoratore',   en:'Settler'     },
  'worker.sick.badge':      { it:'🤒 Malato',    en:'🤒 Ailing'   },
  'worker.slow.badge':      { it:'🐌 Rallentato', en:'🐌 Slowed'  },
  'worker.recall.btn':      { it:'↩ Richiama',   en:'↩ Recall'   },
  'worker.recall.ing':      { it:'↩…',           en:'↩…'         },
  'worker.recall.title':    { it:'Richiama al villaggio', en:'Recall to village' },
  'worker.recall.ing.title':{ it:'Già in rientro',        en:'Already returning' },
  'worker.auto.on':         { it:'🔄 Auto ON',   en:'🔄 Auto ON'  },
  'worker.auto':            { it:'🔄 Auto',      en:'🔄 Auto'     },
  'worker.auto.sick.title': { it:'Non disponibile mentre il lavoratore è malato', en:'Unavailable while settler is ailing' },
  'worker.evolve.btn':      { it:'Evolvi (3🥇)', en:'Evolve (3🥇)' },
  // Panels – Gather
  'panel.gather.yield':     { it:'Produzione',   en:'Yield'   },
  'panel.gather.consume':   { it:'Consumo',      en:'Upkeep'  },
  'panel.gather.or':        { it:' o ',          en:' or '    },
  'panel.gather.busy':      { it:'Lavoratore già assegnato.',    en:'A settler is already assigned here.' },
  'panel.upgrade.btn':      { it:'⬆ Potenzia a Lvl',            en:'⬆ Upgrade to Lvl'                   },
  'panel.upgrade.locked':   { it:'Ricerca',                      en:'Research'                           },
  'panel.upgrade.hint2':    { it:'per sbloccare il potenziamento.', en:'to unlock the upgrade.'          },
  // Panels – Casa
  'panel.casa.normal':      { it:'Ha aggiunto 1 lavoratore al villaggio.',     en:'Added 1 settler to the village.'        },
  'panel.casa.upgraded':    { it:'Casa potenziata — 2 lavoratori generati.',   en:'Upgraded dwelling — 2 settlers granted.' },
  'panel.casa.hint':        { it:'Ricerca "Casa Livello 2" per sbloccare il potenziamento (+1 lavoratore).', en:'Research "Dwelling Level 2" to unlock the upgrade (+1 settler).' },
  'panel.casa.upgrade.btn': { it:'⬆ Potenzia a Livello 2',  en:'⬆ Upgrade to Level 2' },
  // Panels – Ricerca
  'panel.ricerca.going':    { it:'Ricercatore in viaggio…',  en:'Scholar travelling…' },
  'panel.ricerca.returning':{ it:'Ricercatore in rientro…',  en:'Scholar returning…'  },
  'panel.ricerca.recall':   { it:'↩ Richiama lavoratore',    en:'↩ Recall settler'    },
  'panel.ricerca.open':     { it:'🔬 Apri Albero della Ricerca', en:'🔬 Open Arcane Arts' },
  // Panels – CraftStation
  'panel.craft.going':      { it:'Lavoratore in viaggio…',  en:'Settler travelling…' },
  'panel.craft.returning':  { it:'Lavoratore in rientro…',  en:'Settler returning…'  },
  'panel.craft.recall':     { it:'↩ Richiama lavoratore',   en:'↩ Recall settler'    },
  'panel.craft.choose':     { it:'Scegli ricetta',          en:'Choose Recipe'       },
  // Panels – Ospedale
  'panel.hosp.empty':       { it:'✅ Nessun malato da curare.', en:'✅ No ailing settlers to heal.' },
  'panel.hosp.healing':     { it:'in cura',                    en:'healing'                        },
  // Panels – Build / Unknown
  'panel.build.info':       { it:'Territorio disponibile per la costruzione.', en:'Land available for construction.' },
  'panel.build.btn':        { it:'🏗 Scegli cosa costruire', en:'🏗 Choose what to build' },
  'panel.unknown':          { it:'🏗 Territorio inesplorato', en:'🏗 Uncharted Land'       },
  // Demolish
  'panel.demolish.btn':     { it:'🗑 Demolisci esagono',           en:'🗑 Demolish Hex'                         },
  'panel.demolish.mid':     { it:'? Riceverai il 40% delle risorse.', en:'? You will recover 40% of its resources.' },
  // Countdown
  'time.remaining':         { it:'s rimanenti',  en:'s remaining' },
  // Consume panel
  'consume.empty':          { it:'Nessun consumo in corso', en:'No active upkeep' },
  // Research modal
  'research.search.ph':     { it:'🔍 Cerca ricerca…',        en:'🔍 Search arcane arts…'   },
  'research.inprogress':    { it:'🔬 In corso...',            en:'🔬 In progress...'        },
  'research.busy':          { it:'⚙ Hex già occupato',        en:'⚙ Hex already occupied'  },
  'research.locked':        { it:'🔒 Risorse insufficienti',  en:'🔒 Insufficient resources' },
  'research.start':         { it:'▶ Avvia ricerca',           en:'▶ Begin Study'            },
  'research.permit.avail':  { it:'✋ {n} permesso disponibile', en:'✋ {n} permit available'  },
  'research.permit.built':  { it:'{n} già costruit{s} — costo aumentato', en:'{n} already built — cost increased' },
  // Build modal
  'build.btn':              { it:'Costruisci',         en:'Build'          },
  'build.locked':           { it:'🔒 Insufficiente',  en:'🔒 Insufficient' },
  'build.permits':          { it:'permessi',           en:'permits'        },
  'build.built':            { it:'già costruit{s}',    en:'already built'  },
  // Craft modal
  'craft.start':            { it:'▶ Avvia',            en:'▶ Craft'        },
  'craft.locked':           { it:'🔒 Insufficiente',  en:'🔒 Insufficient' },
  // Toast messages
  'toast.no_worker':        { it:'⚠ Nessun lavoratore disponibile',  en:'⚠ No settlers available'      },
  'toast.no_sick':          { it:'⚠ Nessun malato da curare',         en:'⚠ No ailing settlers to heal' },
  'toast.no_sick_send':     { it:'⚠ Nessun malato da inviare',        en:'⚠ No ailing settlers to send' },
  'toast.built':            { it:'costruita!',              en:'built!'             },
  'toast.craft.start':      { it:'⚙ Avviato:',              en:'⚙ Started:'         },
  'toast.craft.bad':        { it:'✘ Ingredienti insufficienti', en:'✘ Insufficient ingredients' },
  'toast.res.bad':          { it:'✘ Risorse insufficienti',   en:'✘ Insufficient resources'   },
  'toast.research.start':   { it:'🔬 Ricerca avviata:',       en:'🔬 Study begun:'            },
  'toast.research.done':    { it:'✅ Ricerca completata:',    en:'✅ Study complete:'          },
  'toast.upgrade.level':    { it:'potenziata a Lvl',          en:'upgraded to Lvl'            },
  'toast.upgrade.fail':     { it:'✘ Impossibile potenziare',  en:'✘ Cannot upgrade'           },
  'toast.demolish.done':    { it:'🗑 Demolito. Recuperato:',  en:'🗑 Demolished. Recovered:'   },
  'toast.demolish.only':    { it:'🗑 Esagono demolito.',       en:'🗑 Hex demolished.'          },
  'toast.day.paid':         { it:'Tasse pagate — scegli un bonus!', en:'Tribute paid — claim your boon!' },
  'toast.day.tax':          { it:'Tasse:',              en:'Tribute:'         },
  'toast.day.short':        { it:'(mancano:',           en:'(short:'          },
  // Confirms
  'confirm.reset':          { it:'Vuoi davvero ricominciare? Tutti i progressi andranno persi.', en:'Start anew? All progress will be lost.' },
  'confirm.demolish':       { it:'Demolire',            en:'Demolish'         },
  // Gear button
  'gear.title':             { it:'Modalità gestione — clicca gli hex per aprire la modal', en:'Management mode — click hexes to open their panel' },
  // Update banner
  'update.message':         { it:'🔄 Nuova versione disponibile!', en:'🔄 New version available!' },
  'update.btn':             { it:'Aggiorna ora',          en:'Update now'       },
  // Bonus descriptions (support {amt}, {res}, {mult}, {dur} vars)
  'bonus.grant.desc':          { it:'Ottieni subito {amt} {res}',                        en:'Immediately gain {amt} {res}'               },
  'bonus.speed_worker.desc':   { it:'I lavoratori si muovono ×{mult} per {dur}s',        en:'Settlers move ×{mult} faster for {dur}s'    },
  'bonus.speed_research.desc': { it:'La ricerca avanza ×{mult} per {dur}s',              en:'Arcane study advances ×{mult} for {dur}s'   },
  'bonus.resource_mult.desc':  { it:'Ogni raccolta fornisce ×{mult} risorse per {dur}s', en:'Each harvest yields ×{mult} resources for {dur}s' },
};

/** Return the current-language string for `key`. Supports {var} substitution. */
export function t(key, vars = {}) {
  const entry = S[key];
  if (!entry) return key;
  let str = entry[_lang] ?? entry.it ?? key;
  for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, v);
  return str;
}

// ── Resource labels / descriptions ────────────────────────────────────────────

const _RES_EN = {
  pietra:'Stone', acqua:'Water',  grano:'Grain',   legno:'Timber',
  carne:'Meat',   sabbia:'Sand',  ferro:'Iron',    mana:'Mana', ricerca:'Lore',
  pane:'Bread',   stufato:'Stew', mattoni:'Masonry', lingotti:'Ingots',
};

export const resLabel = (r) =>
  _lang === 'en' ? (_RES_EN[r] ?? RESOURCE_LABEL[r] ?? r) : (RESOURCE_LABEL[r] ?? r);

const _RES_DESC_EN = {
  pietra:   'Stone · Quarried from the Quarry. Used for building and forging.',
  acqua:    'Water · Drawn from the Lake. Core ingredient for food and construction.',
  grano:    'Grain · Harvested from the Field. Essential ingredient for provisions.',
  legno:    'Timber · Felled from the Forest. Primary building material.',
  carne:    'Meat · Gathered from the Pasture or Hunting Ground. Ingredient for provisions.',
  sabbia:   'Sand · Collected from the Wasteland. Used in masonry production.',
  ferro:    'Iron · Mined from the Mine. Required to forge ingots and tools.',
  mana:     'Mana ✨ · Rare arcane energy (~0.5% per harvest or craft). Required to build an Arcane Tower and for Arcane Alloy at the Forge.',
  ricerca:  'Lore 🔬 · Generated by a settler in the Arcane Tower (1 every 5s). Spent to unlock arcane arts.',
  pane:     'Bread · Processed provisions. Produced at the Cookhouse.',
  stufato:  'Stew · Rich provisions. Produced at the Cookhouse.',
  mattoni:  'Masonry · Advanced building material. Produced at the Forge or Sawmill.',
  lingotti: 'Ingots · Refined metal. Produced at the Forge.',
};

export const resDesc = (r) =>
  _lang === 'en' ? (_RES_DESC_EN[r] ?? null) : null; // null → caller uses its own IT desc

// ── Hex labels ────────────────────────────────────────────────────────────────

const _HEX_EN = {
  starter:'Village',      field:'Field',      quarry:'Quarry',    lake:'Lake',
  forest:'Forest',        pasture:'Pasture',  desert:'Wasteland', mine:'Mine',
  ricerca:'Arcane Tower', cucina:'Cookhouse', fabbro:'Forge',
  casa:'Dwelling',        ospedale:'Infirmary', falegnameria:'Sawmill', caccia:'Hunting Ground',
};

export const hexLabel = (type) =>
  _lang === 'en' ? (_HEX_EN[type] ?? HEX_LABEL[type] ?? type) : (HEX_LABEL[type] ?? type);

// Hex modal title (with icon prefix)
const _HEX_MODAL_EN = {
  starter:'🏘 Village',   ricerca:'🔬 Arcane Tower', cucina:'🍳 Cookhouse',
  fabbro:'🔨 Forge',      falegnameria:'🪚 Sawmill',  caccia:'🎯 Hunting Ground',
  casa:'🏠 Dwelling',     ospedale:'🏥 Infirmary',
};
const _HEX_MODAL_IT = {
  starter:'🏘 Villaggio', ricerca:'🔬 Ricerca',    cucina:'🍳 Cucina',
  fabbro:'🔨 Fabbro',     falegnameria:'🪚 Falegnameria', caccia:'🎯 Caccia',
  casa:'🏠 Casa',         ospedale:'🏥 Ospedale',
};
export const hexModalLabel = (type) =>
  (_lang === 'en' ? _HEX_MODAL_EN : _HEX_MODAL_IT)[type];

// Craft station modal title (icon + localized name)
export const craftModalTitle = (type) => {
  const icon = { cucina:'🍳', fabbro:'🔨', falegnameria:'🪚', caccia:'🎯' }[type] ?? '🔨';
  return `${icon} ${hexLabel(type)}`;
};

// ── Research recipes ──────────────────────────────────────────────────────────

const _RECIPE_EN = {
  sblocca_cucina:        { label:'Unlock Cookhouse',      desc:'Allows building 1 Cookhouse to produce processed food' },
  sblocca_fabbro:        { label:'Unlock Forge',          desc:'Allows building 1 Forge to smelt metals'              },
  sblocca_casa:          { label:'Unlock Dwelling',       desc:'Allows building 1 Dwelling (+1 permanent settler)'    },
  casa_lv2:              { label:'Dwelling Level 2',      desc:'Unlocks Dwelling upgrades. Each upgraded Dwelling grants a new permanent settler.' },
  sblocca_ospedale:      { label:'Unlock Infirmary',      desc:'Allows building 1 Infirmary to heal ailing settlers'  },
  sblocca_falegnameria:  { label:'Unlock Sawmill',        desc:'Allows building 1 Sawmill to process timber'          },
  sblocca_caccia:        { label:'Unlock Hunting Ground', desc:'Allows building 1 Hunting Ground'                     },
  velocita_lavoratori:   { label:'Swift Feet',            desc:'Settlers move 50% faster'                             },
  automazione:           { label:'Autonomy',              desc:'Settlers can be set to autonomous mode'               },
  evoluzione_lavoratore: { label:'Evolve Settler',        desc:'Allows evolving settlers (speed ×2)'                  },
  campo_lv2:    { label:'Field Level 2',      desc:'Unlocks Field upgrade (+3 🌾 per harvest)'     },
  campo_lv3:    { label:'Field Level 3',      desc:'Max Field upgrade (+6 🌾 per harvest)'         },
  cava_lv2:     { label:'Quarry Level 2',     desc:'Unlocks Quarry upgrade (+3 🪨 per harvest)'    },
  cava_lv3:     { label:'Quarry Level 3',     desc:'Max Quarry upgrade (+6 🪨 per harvest)'        },
  lago_lv2:     { label:'Lake Level 2',       desc:'Unlocks Lake upgrade (+3 💧 per harvest)'      },
  lago_lv3:     { label:'Lake Level 3',       desc:'Max Lake upgrade (+6 💧 per harvest)'          },
  bosco_lv2:    { label:'Forest Level 2',     desc:'Unlocks Forest upgrade (+3 🪵 per harvest)'    },
  bosco_lv3:    { label:'Forest Level 3',     desc:'Max Forest upgrade (+6 🪵 per harvest)'        },
  pascolo_lv2:  { label:'Pasture Level 2',    desc:'Unlocks Pasture upgrade (+2 🥩 per harvest)'   },
  pascolo_lv3:  { label:'Pasture Level 3',    desc:'Max Pasture upgrade (+4 🥩 per harvest)'       },
  deserto_lv2:  { label:'Wasteland Level 2',  desc:'Unlocks Wasteland upgrade (+3 🏖 per harvest)' },
  deserto_lv3:  { label:'Wasteland Level 3',  desc:'Max Wasteland upgrade (+6 🏖 per harvest)'     },
  miniera_lv2:  { label:'Mine Level 2',       desc:'Unlocks Mine upgrade (+2 ⚙ per harvest)'      },
  miniera_lv3:  { label:'Mine Level 3',       desc:'Max Mine upgrade (+4 ⚙ per harvest)'          },
};

export const recipeLabel = (id) =>
  _lang === 'en'
    ? (_RECIPE_EN[id]?.label ?? RESEARCH_RECIPES[id]?.label ?? id)
    : (RESEARCH_RECIPES[id]?.label ?? id);
export const recipeDesc = (id) =>
  _lang === 'en'
    ? (_RECIPE_EN[id]?.desc  ?? RESEARCH_RECIPES[id]?.desc  ?? '')
    : (RESEARCH_RECIPES[id]?.desc  ?? '');

// ── Craft recipes ─────────────────────────────────────────────────────────────

const _CRAFT_EN = {
  cucina: {
    pane_artigianale: { label:'Artisan Bread', desc:'Transform grain and water into bread' },
    stufato_ricco:    { label:'Hearty Stew',   desc:'An elaborate recipe'                  },
    pasto_misto:      { label:'Mixed Platter', desc:'A balanced recipe'                    },
  },
  fabbro: {
    lingotti_puri:      { label:'Pure Ingots',        desc:'Refine iron into ingots'        },
    mattoni_rinforzati: { label:'Reinforced Masonry', desc:'Extra-sturdy building blocks'   },
    lega_preziosa:      { label:'Arcane Alloy',       desc:'Magic enhances the metal'       },
  },
  falegnameria: {
    assi:      { label:'Lumber Planks',  desc:'Worked raw timber'    },
    mobili:    { label:'Fine Furniture', desc:'Expert woodworking'   },
    strumenti: { label:'Crafted Tools',  desc:'Combined implements'  },
  },
  caccia: {
    lepre:     { label:'Hare Hunt 🐇',  desc:'Quick hunt'              },
    cervo:     { label:'Stag Hunt 🦌',  desc:'High meat yield'         },
    cinghiale: { label:'Boar Hunt 🐗',  desc:'Excellent yield, slower' },
  },
};

export const craftLabel = (station, rid) =>
  _lang === 'en'
    ? (_CRAFT_EN[station]?.[rid]?.label ?? CRAFT_RECIPES[station]?.[rid]?.label ?? rid)
    : (CRAFT_RECIPES[station]?.[rid]?.label ?? rid);
export const craftDesc = (station, rid) =>
  _lang === 'en'
    ? (_CRAFT_EN[station]?.[rid]?.desc  ?? CRAFT_RECIPES[station]?.[rid]?.desc  ?? '')
    : (CRAFT_RECIPES[station]?.[rid]?.desc  ?? '');

// ── Achievement labels / descriptions ─────────────────────────────────────────

const _ACHIEV_EN = {
  wood_15:     { label:'Lumberjack',       desc:'Gather 15 🪵 timber'        },
  stone_15:    { label:'Quarryman',        desc:'Gather 15 🪨 stone'          },
  grain_15:    { label:'Farmer',           desc:'Gather 15 🌾 grain'          },
  water_15:    { label:'Fisher',           desc:'Gather 15 💧 water'          },
  meat_10:     { label:'Hunter',           desc:'Gather 10 🥩 meat'           },
  sand_15:     { label:'Wasteland Walker', desc:'Gather 15 🏖 sand'           },
  iron_10:     { label:'Miner',            desc:'Gather 10 ⚙ iron'            },
  ricerca_15:  { label:'Scholar',          desc:'Accumulate 15 🔬 lore'       },
  bread_3:     { label:'Baker',            desc:'Hold 3 🍞 bread'             },
  lingot_2:    { label:'Metallurgist',     desc:'Hold 2 🥇 ingots'            },
  mattoni_3:   { label:'Mason',            desc:'Hold 3 🧱 masonry'           },
  build_3:     { label:'Builder',          desc:'Construct 3 new hexes'       },
  build_6:     { label:'Urbanist',         desc:'Construct 6 new hexes'       },
  build_10:    { label:'Architect',        desc:'Construct 10 new hexes'      },
  ricerca_hex: { label:'Arcanist',         desc:'Build an Arcane Tower'       },
  special_1:   { label:'Specialist',       desc:'Build a special structure'   },
  upgrade_1:   { label:'Enhancer',         desc:'Upgrade a hex to Level 2'    },
  pop_3:       { label:'Hamlet',           desc:'Reach 3 settlers'            },
  pop_5:       { label:'Borough',          desc:'Reach 5 settlers'            },
  research_1:  { label:'Pioneer',          desc:'Complete 1 study'            },
  research_3:  { label:'Sage',             desc:'Complete 3 studies'          },
  craft_1:     { label:'Artisan',          desc:'Complete 1 craft'            },
  craft_5:     { label:'Master Crafter',   desc:'Complete 5 crafts'           },
  mana_1:      { label:'Mystic',           desc:'Find 1 ✨ mana'              },
  meat_25:     { label:'Butcher',          desc:'Gather 25 🥩 meat total'     },
  wood_40:     { label:'Woodcutter',       desc:'Gather 40 🪵 timber'         },
};

export const achievLabel = (id) => _lang === 'en' ? (_ACHIEV_EN[id]?.label ?? null) : null;
export const achievDesc  = (id) => _lang === 'en' ? (_ACHIEV_EN[id]?.desc  ?? null) : null;

// ── Bonus option labels ───────────────────────────────────────────────────────

const _BONUS_LABEL_EN = {
  speed_worker:   'Swift Settlers',
  speed_research: 'Arcane Surge',
  resource_mult:  'Bountiful Harvest',
};
const _BONUS_LABEL_IT = {
  speed_worker:   'Lavoratori veloci',
  speed_research: 'Ricerca accelerata',
  resource_mult:  'Raccolta doppia',
};

export const bonusLabel = (type) =>
  (_lang === 'en' ? _BONUS_LABEL_EN : _BONUS_LABEL_IT)[type] ?? type;

// ── Apply language to static DOM elements ─────────────────────────────────────
// Elements with data-i18n get their textContent updated; data-i18n-title their title.

export function applyLangDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
}
