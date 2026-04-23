import { getState } from './state.js';

export function getResource(name) {
  return getState().resources[name] ?? 0;
}

export function addResources(payload) {
  const res = getState().resources;
  for (const [name, amount] of Object.entries(payload)) {
    res[name] = (res[name] ?? 0) + amount;
  }
}

export function deductResources(cost) {
  const res = getState().resources;
  for (const [name, amount] of Object.entries(cost)) {
    res[name] = (res[name] ?? 0) - amount;
  }
}

export function canAfford(cost) {
  const res = getState().resources;
  return Object.entries(cost).every(([name, amount]) => (res[name] ?? 0) >= amount);
}
