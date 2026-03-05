/**
 * Scoring Calculator for Polydraft (Mobile)
 *
 * Works like Polymarket: each pick is a $1 bet.
 * Payout = $1 * (1 / probability)
 *
 * Pack = $5 total (5 picks x $1 each)
 */

export interface ScoringParams {
  probabilityAtPick: number;
  isCorrect: boolean;
}

export interface ScoringResult {
  points: number;
  multiplier: number;
  tierBonus: number;
  tier: 'longshot' | 'underdog' | 'slight_underdog' | 'tossup' | 'favorite' | 'heavy_favorite';
}

const BASE_POINTS = 1;

export function getTier(probability: number): ScoringResult['tier'] {
  if (probability < 0.1) return 'longshot';
  if (probability < 0.25) return 'underdog';
  if (probability < 0.4) return 'slight_underdog';
  if (probability < 0.6) return 'tossup';
  if (probability < 0.75) return 'favorite';
  return 'heavy_favorite';
}

export function getTierBonus(tier: ScoringResult['tier']): number {
  switch (tier) {
    case 'longshot':
      return 0.5;
    case 'underdog':
      return 0.25;
    case 'slight_underdog':
      return 0.1;
    default:
      return 0;
  }
}

export function calculatePoints({ probabilityAtPick, isCorrect }: ScoringParams): ScoringResult {
  const tier = getTier(probabilityAtPick);
  const tierBonus = getTierBonus(tier);

  if (!isCorrect) {
    return { points: 0, multiplier: 0, tierBonus: 0, tier };
  }

  const multiplier = 1 / probabilityAtPick;
  const basePoints = BASE_POINTS * multiplier;
  const totalPoints = basePoints + tierBonus;

  return {
    points: Math.round(totalPoints * 100) / 100,
    multiplier: Math.round(multiplier * 100) / 100,
    tierBonus,
    tier,
  };
}

export function calculatePackBonus(correctCount: number, totalPicks: number = 5): number {
  if (correctCount === totalPicks) return 5;
  if (correctCount === totalPicks - 1) return 2;
  if (correctCount === totalPicks - 2) return 1;
  return 0;
}

export function calculatePackScore(
  picks: Array<{ probabilityAtPick: number; isCorrect: boolean }>
): {
  totalPoints: number;
  correctCount: number;
  packBonus: number;
  breakdown: ScoringResult[];
} {
  const breakdown = picks.map((pick) => calculatePoints(pick));
  const totalPickPoints = breakdown.reduce((sum, result) => sum + result.points, 0);
  const correctCount = breakdown.filter((r) => r.points > 0).length;
  const packBonus = calculatePackBonus(correctCount, picks.length);

  return {
    totalPoints: Math.round((totalPickPoints + packBonus) * 100) / 100,
    correctCount,
    packBonus,
    breakdown,
  };
}

export function formatProbability(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

export function formatDecimalOdds(probability: number): string {
  if (probability === 0) return '-';
  return (1 / probability).toFixed(2);
}

export function getTierColor(tier: ScoringResult['tier']): string {
  switch (tier) {
    case 'longshot':
      return '#ef4444';
    case 'underdog':
      return '#f97316';
    case 'slight_underdog':
      return '#eab308';
    case 'tossup':
      return '#84cc16';
    case 'favorite':
      return '#22c55e';
    case 'heavy_favorite':
      return '#14b8a6';
    default:
      return '#6b7280';
  }
}

export function calculateMaxPotentialPoints(
  picks: Array<{ probabilityAtPick: number }>
): {
  totalPoints: number;
  breakdown: ScoringResult[];
  packBonus: number;
} {
  const breakdown = picks.map((pick) =>
    calculatePoints({ probabilityAtPick: pick.probabilityAtPick, isCorrect: true })
  );
  const totalPickPoints = breakdown.reduce((sum, result) => sum + result.points, 0);
  const packBonus = calculatePackBonus(picks.length, picks.length);

  return {
    totalPoints: Math.round((totalPickPoints + packBonus) * 100) / 100,
    breakdown,
    packBonus,
  };
}

export function calculateCombinedProbability(
  picks: Array<{ probabilityAtPick: number }>
): number {
  if (picks.length === 0) return 0;
  return picks.reduce((product, pick) => product * pick.probabilityAtPick, 1);
}
