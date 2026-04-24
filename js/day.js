/**
 * Day / tax system
 *
 * Each day lasts DAY_DURATION seconds (real-time).
 * At day end, taxes are deducted from the player's resources.
 * Taxes grow proportionally each day.
 * If the player can't pay a resource it simply bottoms out at 0 (no hard penalty here).
 */

import { getState } from './state.js';
import { deductResources } from './resources.js';

export const DAY_DURATION = 120; // seconds per in-game day

// Base tax for day 1.  Scaled by (1 + (day-1) * 0.15) each subsequent day.
const BASE_TAX = {
  legno:  2,
  pietra: 2,
  grano:  2,
  acqua:  2,
};

// Resources cycled as the "extra" tax item (one rotates per day)
const EXTRA_TAX_CYCLE = ['carne', 'sabbia', 'ferro', 'ricerca'];

/** Compute taxes due for a given day number (1-indexed). */
export function computeTax(day) {
  const scale = 1 + (day - 1) * 0.15;
  const tax   = {};
  for (const [r, base] of Object.entries(BASE_TAX)) {
    tax[r] = Math.round(base * scale);
  }
  // Rotate extra resource
  const extra = EXTRA_TAX_CYCLE[(day - 1) % EXTRA_TAX_CYCLE.length];
  tax[extra]  = (tax[extra] ?? 0) + Math.round(2 * scale);
  return tax;
}

/** Apply end-of-day taxes. Returns { tax, shortfall } for display. */
export function applyTax(day) {
  const state    = getState();
  const tax      = computeTax(day);
  const shortfall = {};
  const toPay   = {};

  for (const [r, amount] of Object.entries(tax)) {
    const have = state.resources[r] ?? 0;
    if (have >= amount) {
      toPay[r] = amount;
    } else {
      toPay[r]      = have;           // pay what we have
      shortfall[r]  = amount - have;  // record gap (for toast)
    }
  }

  deductResources(toPay);
  return { tax, shortfall };
}

// ── SVG Sun widget ─────────────────────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';
let _sunEl = null;   // the #sun-widget element

export function initSunWidget() {
  _sunEl = document.getElementById('sun-widget');
  if (!_sunEl) return;
  // Build the SVG inside
  _sunEl.innerHTML = `
    <svg id="sun-svg" viewBox="0 0 60 60" xmlns="${SVG_NS}">
      <!-- Passed arc (darkened) -->
      <circle cx="30" cy="30" r="22"
        fill="none" stroke="rgba(0,0,0,0)" stroke-width="0"/>
      <path id="sun-passed-arc" fill="rgba(0,0,0,0.35)" d=""/>
      <!-- Sun circle -->
      <circle cx="30" cy="30" r="14"
        fill="url(#sun-grad)" filter="url(#sun-glow)"/>
      <!-- Hand -->
      <line id="sun-hand" x1="30" y1="30" x2="30" y2="10"
        stroke="#ffe066" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Day number -->
      <text id="sun-day-text" x="30" y="34"
        text-anchor="middle" font-size="8"
        font-family="'Palatino Linotype',Georgia,serif"
        font-weight="700" fill="#3a2000">1</text>
      <defs>
        <radialGradient id="sun-grad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stop-color="#ffe57a"/>
          <stop offset="100%" stop-color="#e08010"/>
        </radialGradient>
        <filter id="sun-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
    </svg>
    <div id="sun-tooltip" class="sun-tooltip hidden"></div>
  `;

  _sunEl.addEventListener('mouseenter', _showTooltip);
  _sunEl.addEventListener('mouseleave', () => {
    const tt = document.getElementById('sun-tooltip');
    if (tt) tt.classList.add('hidden');
  });
  _sunEl.addEventListener('click', _showTooltip);
}

function _showTooltip() {
  const state = getState();
  const day   = state.day ?? 1;
  const tax   = computeTax(day);
  const tt    = document.getElementById('sun-tooltip');
  if (!tt) return;
  const lines = Object.entries(tax).map(([r, n]) => `${n} ${r}`).join(', ');
  tt.textContent = `Giorno ${day} — Tasse: ${lines}`;
  tt.classList.remove('hidden');
}

/** Called every frame with dt (seconds). Updates SVG hand + arc. */
export function updateSunWidget(progress, day) {
  if (!_sunEl) return;
  const hand = document.getElementById('sun-hand');
  const arc  = document.getElementById('sun-passed-arc');
  const txt  = document.getElementById('sun-day-text');
  if (!hand || !arc || !txt) return;

  const angle = progress * Math.PI * 2 - Math.PI / 2; // 0 → -π/2 (12 o'clock)
  const R     = 22;
  const cx    = 30, cy = 30;

  // Hand tip
  const hx = cx + (R - 4) * Math.cos(angle);
  const hy = cy + (R - 4) * Math.sin(angle);
  hand.setAttribute('x2', hx.toFixed(2));
  hand.setAttribute('y2', hy.toFixed(2));

  // Darkened passed arc (pie slice from top going clockwise)
  if (progress <= 0) {
    arc.setAttribute('d', '');
  } else if (progress >= 1) {
    arc.setAttribute('d', `M${cx},${cy} m0,-${R} A${R},${R},0,1,1,${cx - 0.001},${cy - R} Z`);
  } else {
    const startAngle = -Math.PI / 2;
    const endAngle   = angle;
    const largeArc   = progress > 0.5 ? 1 : 0;
    const sx = cx + R * Math.cos(startAngle);
    const sy = cy + R * Math.sin(startAngle);
    const ex = cx + R * Math.cos(endAngle);
    const ey = cy + R * Math.sin(endAngle);
    arc.setAttribute('d', `M${cx},${cy} L${sx.toFixed(2)},${sy.toFixed(2)} A${R},${R},0,${largeArc},1,${ex.toFixed(2)},${ey.toFixed(2)} Z`);
  }

  txt.textContent = day;
}
