import { SPECIAL_HEX_TYPES, RESOURCE_ICON, RESOURCE_LABEL, PERMIT_TYPES } from './config.js';

// ── Achievement pool ──────────────────────────────────────────────────────────

export const ACHIEVEMENT_POOL = [
  // Resources
  { id:'wood_15',     label:'Boscaiolo',    desc:'Raccogli 15 🪵 legno',          check: s     => (s.resources.legno    ?? 0) >= 15 },
  { id:'stone_15',    label:'Scalpellino',  desc:'Raccogli 15 🪨 pietra',         check: s     => (s.resources.pietra   ?? 0) >= 15 },
  { id:'grain_15',    label:'Contadino',    desc:'Raccogli 15 🌾 grano',          check: s     => (s.resources.grano    ?? 0) >= 15 },
  { id:'water_15',    label:'Pescatore',    desc:'Raccogli 15 💧 acqua',          check: s     => (s.resources.acqua    ?? 0) >= 15 },
  { id:'meat_10',     label:'Cacciatore',   desc:'Raccogli 10 🥩 carne',          check: s     => (s.resources.carne    ?? 0) >= 10 },
  { id:'sand_15',     label:'Desertore',    desc:'Raccogli 15 🏖 sabbia',         check: s     => (s.resources.sabbia   ?? 0) >= 15 },
  { id:'iron_10',     label:'Minatore',     desc:'Raccogli 10 ⚙ ferro',           check: s     => (s.resources.ferro    ?? 0) >= 10 },
  { id:'ricerca_15',  label:'Studioso',     desc:'Accumula 15 🔬 ricerca',        check: s     => (s.resources.ricerca  ?? 0) >= 15 },
  { id:'bread_3',     label:'Fornaio',      desc:'Possiedi 3 🍞 pane',            check: s     => (s.resources.pane     ?? 0) >= 3  },
  { id:'lingot_2',    label:'Metallurgo',   desc:'Possiedi 2 🥇 lingotti',        check: s     => (s.resources.lingotti ?? 0) >= 2  },
  { id:'mattoni_3',   label:'Muratore',     desc:'Possiedi 3 🧱 mattoni',         check: s     => (s.resources.mattoni  ?? 0) >= 3  },
  // Buildings
  { id:'build_3',     label:'Costruttore',  desc:'Costruisci 3 nuovi esagoni',    check:(s, h) => h.ownedCount >= 4  },
  { id:'build_6',     label:'Urbanista',    desc:'Costruisci 6 nuovi esagoni',    check:(s, h) => h.ownedCount >= 7  },
  { id:'build_10',    label:'Architetto',   desc:'Costruisci 10 nuovi esagoni',   check:(s, h) => h.ownedCount >= 11 },
  { id:'ricerca_hex', label:'Ricercatore',  desc:'Costruisci un Hex Ricerca',     check:(s, h) => h.hasType('ricerca') },
  { id:'special_1',   label:'Specialista',  desc:'Costruisci una struttura speciale', check:(s, h) => h.hasSpecial },
  { id:'upgrade_1',   label:'Potenziatore', desc:'Potenzia un esagono a Lvl 2',   check:(s, h) => h.hasUpgrade },
  // Population
  { id:'pop_3',       label:'Villaggetto',  desc:'Raggiungi 3 abitanti',          check: s     => s.population >= 3 },
  { id:'pop_5',       label:'Borgo',        desc:'Raggiungi 5 abitanti',          check: s     => s.population >= 5 },
  // Research
  { id:'research_1',  label:'Pioniere',     desc:'Completa 1 ricerca',            check:(s, h) => h.totalResearched >= 1 },
  { id:'research_3',  label:'Scienziato',   desc:'Completa 3 ricerche',           check:(s, h) => h.totalResearched >= 3 },
  // Stats
  { id:'craft_1',     label:'Artigiano',    desc:'Completa 1 lavorazione',        check: s     => (s.stats?.totalCrafted   ?? 0) >= 1  },
  { id:'craft_5',     label:'Maestro',      desc:'Completa 5 lavorazioni',        check: s     => (s.stats?.totalCrafted   ?? 0) >= 5  },
  { id:'mana_1',      label:'Mistico',      desc:'Trova 1 ✨ mana casuale',       check: s     => (s.stats?.totalManaFound ?? 0) >= 1  },
  { id:'meat_25',     label:'Macellaio',    desc:'Raccogli 25 🥩 carne in totale', check: s     => (s.resources.carne ?? 0) >= 25 },
  { id:'wood_40',     label:'Taglialegna',  desc:'Raccogli 40 🪵 legno',          check: s     => (s.resources.legno ?? 0) >= 40 },
];

/** Compute derived helpers used by achievement conditions. */
export function computeHelpers(state) {
  const owned = Object.values(state.hexes ?? {}).filter(h => h.owned);
  return {
    ownedCount:      owned.length,
    hasSpecial:      owned.some(h => SPECIAL_HEX_TYPES.includes(h.type)),
    hasUpgrade:      owned.some(h => (h.level ?? 1) > 1),
    hasType:         (type) => owned.some(h => h.type === type),
    totalResearched: (state.research?.unlocked?.length ?? 0) +
      Object.values(state.research?.permits ?? {}).reduce((a, v) => a + v, 0) +
      Object.values(state.buildCount ?? {}).reduce((a, v) => a + v, 0),
  };
}

/** Pick `count` random achievements not in `exclude` set.
 *  Falls back to the full pool if not enough remain. */
export function pickAchievements(count = 3, exclude = new Set()) {
  let pool = ACHIEVEMENT_POOL.filter(a => !exclude.has(a.id));
  if (pool.length < count) pool = [...ACHIEVEMENT_POOL]; // reset if exhausted
  const result = [];
  const available = [...pool];
  while (result.length < count && available.length > 0) {
    const idx = Math.floor(Math.random() * available.length);
    result.push(available.splice(idx, 1)[0].id);
  }
  return result;
}

// ── Bonus pool ────────────────────────────────────────────────────────────────

const _BONUS_POOL = [
  { type:'grant', resource:'legno',    baseAmt:18 },
  { type:'grant', resource:'pietra',   baseAmt:18 },
  { type:'grant', resource:'grano',    baseAmt:18 },
  { type:'grant', resource:'acqua',    baseAmt:18 },
  { type:'grant', resource:'carne',    baseAmt:14 },
  { type:'grant', resource:'sabbia',   baseAmt:18 },
  { type:'grant', resource:'ferro',    baseAmt:12 },
  { type:'grant', resource:'ricerca',  baseAmt:12 },
  { type:'grant', resource:'pane',     baseAmt:4  },
  { type:'grant', resource:'mattoni',  baseAmt:3  },
  { type:'grant', resource:'lingotti', baseAmt:2  },
  { type:'speed_worker',   baseMult:1.5, baseDur:120, label:'Lavoratori veloci'  },
  { type:'speed_research', baseMult:2.0, baseDur:120, label:'Ricerca accelerata' },
  { type:'resource_mult',  baseMult:2.0, baseDur:60,  label:'Raccolta doppia'    },
];

/** Generate 3 unique scaled bonus choices for the given level. */
export function generateBonusChoices(level) {
  const pool = [..._BONUS_POOL];
  const choices = [];
  while (choices.length < 3 && pool.length > 0) {
    const idx  = Math.floor(Math.random() * pool.length);
    choices.push(_scaledOption(pool.splice(idx, 1)[0], level));
  }
  return choices;
}

function _scaledOption(base, level) {
  const lv = Math.max(1, level);
  if (base.type === 'grant') {
    const amt = Math.round(base.baseAmt * (1 + (lv - 1) * 0.4));
    return {
      type:      'grant',
      label:     `+${amt} ${RESOURCE_ICON[base.resource] ?? ''} ${RESOURCE_LABEL[base.resource] ?? base.resource}`,
      desc:      `Ottieni subito ${amt} ${RESOURCE_LABEL[base.resource] ?? base.resource}`,
      applyData: { resource: base.resource, amount: amt },
    };
  }
  const mult = +(base.baseMult + (lv - 1) * 0.12).toFixed(2);
  const dur  = Math.round(base.baseDur  * (1 + (lv - 1) * 0.18));
  const emoji = base.type === 'speed_worker' ? '⚡' : base.type === 'speed_research' ? '🔬' : '📦';
  return {
    type:      base.type,
    label:     `${emoji} ${base.label} ×${mult}`,
    desc:      base.type === 'resource_mult'
      ? `Ogni raccolta fornisce ×${mult} risorse per ${dur}s`
      : base.type === 'speed_worker'
        ? `I lavoratori si muovono ×${mult} per ${dur}s`
        : `La ricerca avanza ×${mult} per ${dur}s`,
    applyData: { multiplier: mult, durationSec: dur },
  };
}
