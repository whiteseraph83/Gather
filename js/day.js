/**
 * Day / tax system
 *
 * Each day lasts DAY_DURATION seconds (real-time).
 * At day end, taxes are deducted from the player's resources.
 * Taxes grow proportionally each day.
 */

import { getState } from './state.js';
import { deductResources } from './resources.js';
import { RESOURCE_ICON, RESOURCE_LABEL } from './config.js';

export const DAY_DURATION = 360; // seconds per in-game day

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
  const state     = getState();
  const tax       = computeTax(day);
  const shortfall = {};
  const toPay     = {};

  for (const [r, amount] of Object.entries(tax)) {
    const have = state.resources[r] ?? 0;
    if (have >= amount) {
      toPay[r] = amount;
    } else {
      toPay[r]     = have;
      shortfall[r] = amount - have;
    }
  }

  deductResources(toPay);
  return { tax, shortfall };
}

// ── SVG Sun widget ─────────────────────────────────────────────────────────────

let _sunEl   = null;
let _miniEl  = null;
let _lastDay = -1; // track day changes to avoid re-rendering tax list every frame

export function initSunWidget() {
  _sunEl  = document.getElementById('sun-widget');
  _miniEl = document.getElementById('sun-mini');
  if (!_sunEl) return;

  // 80×80 viewBox. Center at (40,40), orbit ring radius 32, sun radius 16.
  _sunEl.innerHTML = `
    <svg id="sun-svg" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sg" cx="38%" cy="32%" r="62%">
          <stop offset="0%"   stop-color="#fff7b0"/>
          <stop offset="55%"  stop-color="#ffcc22"/>
          <stop offset="100%" stop-color="#e06800"/>
        </radialGradient>
        <radialGradient id="sg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#ffdd44" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#ffdd44" stop-opacity="0"/>
        </radialGradient>
        <filter id="sf" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Ambient glow behind sun -->
      <circle cx="40" cy="40" r="26" fill="url(#sg-glow)"/>

      <!-- 8 rays -->
      <g id="sun-rays" stroke="#ffd040" stroke-linecap="round" opacity="0.85">
        <line x1="40" y1="7"  x2="40" y2="15"/>
        <line x1="63" y1="17" x2="57.5" y2="22.5"/>
        <line x1="73" y1="40" x2="65" y2="40"/>
        <line x1="63" y1="63" x2="57.5" y2="57.5"/>
        <line x1="40" y1="73" x2="40" y2="65"/>
        <line x1="17" y1="63" x2="22.5" y2="57.5"/>
        <line x1="7"  y1="40" x2="15" y2="40"/>
        <line x1="17" y1="17" x2="22.5" y2="22.5"/>
      </g>

      <!-- Orbit track ring -->
      <circle cx="40" cy="40" r="32"
        fill="none" stroke="rgba(255,200,60,0.12)" stroke-width="4"/>

      <!-- Elapsed (darkened) arc -->
      <path id="sun-arc" fill="rgba(0,0,0,0)" d=""/>

      <!-- Orbit progress arc -->
      <path id="sun-progress" fill="none"
        stroke="rgba(255,220,80,0.55)" stroke-width="4"
        stroke-linecap="round" d=""/>

      <!-- Glowing dot at arc tip -->
      <circle id="sun-dot" cx="40" cy="8" r="4"
        fill="#ffe566" filter="url(#sf)"/>

      <!-- Sun body -->
      <circle cx="40" cy="40" r="16" fill="url(#sg)" filter="url(#sf)"/>

      <!-- Cross-hatch shine -->
      <ellipse cx="35" cy="35" rx="5" ry="3"
        fill="rgba(255,255,255,0.22)" transform="rotate(-30,35,35)"/>
    </svg>
  `;

  // Mini sun (mobile overlay) — same SVG structure, different IDs
  if (_miniEl) {
    _miniEl.innerHTML = `
      <svg id="sun-mini-svg" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="sgm" cx="38%" cy="32%" r="62%">
            <stop offset="0%"   stop-color="#fff7b0"/>
            <stop offset="55%"  stop-color="#ffcc22"/>
            <stop offset="100%" stop-color="#e06800"/>
          </radialGradient>
          <radialGradient id="sgm-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stop-color="#ffdd44" stop-opacity="0.55"/>
            <stop offset="100%" stop-color="#ffdd44" stop-opacity="0"/>
          </radialGradient>
          <filter id="sfm" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="40" cy="40" r="26" fill="url(#sgm-glow)"/>
        <g id="sun-mini-rays" stroke="#ffd040" stroke-linecap="round" opacity="0.85">
          <line x1="40" y1="7"  x2="40" y2="15"/>
          <line x1="63" y1="17" x2="57.5" y2="22.5"/>
          <line x1="73" y1="40" x2="65" y2="40"/>
          <line x1="63" y1="63" x2="57.5" y2="57.5"/>
          <line x1="40" y1="73" x2="40" y2="65"/>
          <line x1="17" y1="63" x2="22.5" y2="57.5"/>
          <line x1="7"  y1="40" x2="15" y2="40"/>
          <line x1="17" y1="17" x2="22.5" y2="22.5"/>
        </g>
        <circle cx="40" cy="40" r="32"
          fill="none" stroke="rgba(255,200,60,0.12)" stroke-width="4"/>
        <path id="sun-mini-arc" fill="rgba(0,0,0,0)" d=""/>
        <path id="sun-mini-progress" fill="none"
          stroke="rgba(255,220,80,0.55)" stroke-width="4"
          stroke-linecap="round" d=""/>
        <circle id="sun-mini-dot" cx="40" cy="8" r="4"
          fill="#ffe566" filter="url(#sfm)"/>
        <circle cx="40" cy="40" r="16" fill="url(#sgm)" filter="url(#sfm)"/>
        <ellipse cx="35" cy="35" rx="5" ry="3"
          fill="rgba(255,255,255,0.22)" transform="rotate(-30,35,35)"/>
      </svg>
    `;
  }
}

/** Called every frame with progress (0–1) and current day number. */
export function updateSunWidget(progress, day) {
  if (!_sunEl) return;

  _applySunProgress(progress,
    document.getElementById('sun-arc'),
    document.getElementById('sun-progress'),
    document.getElementById('sun-dot'),
    document.getElementById('sun-rays'),
  );

  _applySunProgress(progress,
    document.getElementById('sun-mini-arc'),
    document.getElementById('sun-mini-progress'),
    document.getElementById('sun-mini-dot'),
    document.getElementById('sun-mini-rays'),
  );

  // Update day number and tax list (only when day changes)
  if (day !== _lastDay) {
    _lastDay = day;
    _updateDayText(day);
  }
}

function _applySunProgress(progress, arc, progArc, dot, rays) {
  if (!arc || !progArc || !dot) return;

  const R          = 32;
  const cx         = 40, cy = 40;
  const startAngle = -Math.PI / 2;
  const endAngle   = startAngle + progress * Math.PI * 2;

  const dx = cx + R * Math.cos(endAngle);
  const dy = cy + R * Math.sin(endAngle);
  dot.setAttribute('cx', dx.toFixed(2));
  dot.setAttribute('cy', dy.toFixed(2));

  if (rays) rays.setAttribute('opacity', (0.85 - progress * 0.55).toFixed(2));

  if (progress <= 0.001) {
    arc.setAttribute('d', ''); arc.setAttribute('fill', 'rgba(0,0,0,0)');
    progArc.setAttribute('d', '');
  } else if (progress >= 0.999) {
    arc.setAttribute('fill', 'rgba(0,0,0,0.38)');
    arc.setAttribute('d', `M${cx},${cy} m0,-${R} A${R},${R},0,1,1,${(cx-0.001).toFixed(3)},${(cy-R).toFixed(3)} Z`);
    progArc.setAttribute('d', '');
  } else {
    const la = progress > 0.5 ? 1 : 0;
    const sx = cx + R * Math.cos(startAngle);
    const sy = cy + R * Math.sin(startAngle);
    arc.setAttribute('fill', 'rgba(0,0,0,0.32)');
    arc.setAttribute('d', `M${cx},${cy} L${sx.toFixed(2)},${sy.toFixed(2)} A${R},${R},0,${la},1,${dx.toFixed(2)},${dy.toFixed(2)} Z`);
    progArc.setAttribute('d', `M${sx.toFixed(2)},${sy.toFixed(2)} A${R},${R},0,${la},1,${dx.toFixed(2)},${dy.toFixed(2)}`);
  }
}

function _updateDayText(day) {
  const numEl  = document.getElementById('day-number');
  const taxEl  = document.getElementById('day-tax-list');
  if (numEl) numEl.textContent = day;
  if (!taxEl) return;

  const tax = computeTax(day);
  taxEl.innerHTML = Object.entries(tax)
    .map(([r, n]) => {
      const icon  = RESOURCE_ICON[r]  ?? '';
      const label = RESOURCE_LABEL[r] ?? r;
      return `<span class="day-tax-item" data-taxres="${r}" data-taxamt="${n}"><span class="day-tax-amt">${n}</span>${icon} ${label}</span>`;
    })
    .join('');
}

/** Update green/normal colour of each tax row based on current resources. */
export function updateTaxColors() {
  const state  = getState();
  const items  = document.querySelectorAll('.day-tax-item[data-taxres]');
  for (const el of items) {
    const r    = el.dataset.taxres;
    const need = Number(el.dataset.taxamt);
    const have = state.resources?.[r] ?? 0;
    el.classList.toggle('paid', have >= need);
  }
}
