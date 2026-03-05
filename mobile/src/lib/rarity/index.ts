/**
 * Rarity System for Polydraft (Mobile)
 *
 * Rarity is determined by the "underdog" probability (p_low = min(p1, p2)).
 * Lower p_low = rarer card.
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RarityConfig {
  name: string;
  hex: string;
  minPLow: number;
  maxPLow: number;
}

export const RARITY_CONFIG: Record<Rarity, RarityConfig> = {
  legendary: {
    name: 'Legendary',
    hex: '#f97316',
    minPLow: 0.0,
    maxPLow: 0.02,
  },
  epic: {
    name: 'Epic',
    hex: '#a855f7',
    minPLow: 0.02,
    maxPLow: 0.05,
  },
  rare: {
    name: 'Rare',
    hex: '#3b82f6',
    minPLow: 0.05,
    maxPLow: 0.15,
  },
  uncommon: {
    name: 'Uncommon',
    hex: '#22c55e',
    minPLow: 0.15,
    maxPLow: 0.3,
  },
  common: {
    name: 'Common',
    hex: '#9ca3af',
    minPLow: 0.3,
    maxPLow: 0.5,
  },
};

export const DROP_RATES: Record<Rarity, number> = {
  common: 0.59,
  uncommon: 0.25,
  rare: 0.11,
  epic: 0.03,
  legendary: 0.02,
};

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export function calculatePLow(p1: number, p2: number): number {
  return Math.min(p1, p2);
}

export function getRarityFromPLow(pLow: number): Rarity {
  const clamped = Math.max(0, Math.min(0.5, pLow));
  if (clamped < 0.02) return 'legendary';
  if (clamped < 0.05) return 'epic';
  if (clamped < 0.15) return 'rare';
  if (clamped < 0.3) return 'uncommon';
  return 'common';
}

export function getEventRarity(outcomeAProbability: number, outcomeBProbability: number): Rarity {
  const pLow = calculatePLow(outcomeAProbability, outcomeBProbability);
  return getRarityFromPLow(pLow);
}

export function getRarityConfig(rarity: Rarity): RarityConfig {
  return RARITY_CONFIG[rarity];
}

export function rollTargetRarity(): Rarity {
  const roll = Math.random();
  let cumulative = 0;
  for (const rarity of RARITY_ORDER) {
    cumulative += DROP_RATES[rarity];
    if (roll < cumulative) return rarity;
  }
  return 'common';
}

export function eventMatchesRarity(
  outcomeAProbability: number,
  outcomeBProbability: number,
  targetRarity: Rarity
): boolean {
  return getEventRarity(outcomeAProbability, outcomeBProbability) === targetRarity;
}

export function distanceToRarityBin(pLow: number, targetRarity: Rarity): number {
  const config = RARITY_CONFIG[targetRarity];
  if (pLow >= config.minPLow && pLow < config.maxPLow) return 0;
  if (pLow < config.minPLow) return config.minPLow - pLow;
  return pLow - config.maxPLow;
}

export function getFallbackRarities(targetRarity: Rarity): Rarity[] {
  const targetIndex = RARITY_ORDER.indexOf(targetRarity);
  return RARITY_ORDER.slice(0, targetIndex + 1).reverse();
}
