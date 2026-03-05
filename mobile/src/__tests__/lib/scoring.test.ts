import {
  calculatePoints,
  calculatePackBonus,
  calculatePackScore,
  getTier,
  getTierBonus,
  formatProbability,
  formatDecimalOdds,
  calculateMaxPotentialPoints,
  calculateCombinedProbability,
} from '../../lib/scoring/calculator';

describe('Scoring Calculator', () => {
  describe('getTier', () => {
    it('classifies longshot correctly', () => {
      expect(getTier(0.05)).toBe('longshot');
      expect(getTier(0.09)).toBe('longshot');
    });

    it('classifies underdog correctly', () => {
      expect(getTier(0.1)).toBe('underdog');
      expect(getTier(0.24)).toBe('underdog');
    });

    it('classifies slight_underdog correctly', () => {
      expect(getTier(0.25)).toBe('slight_underdog');
      expect(getTier(0.39)).toBe('slight_underdog');
    });

    it('classifies tossup correctly', () => {
      expect(getTier(0.4)).toBe('tossup');
      expect(getTier(0.5)).toBe('tossup');
      expect(getTier(0.59)).toBe('tossup');
    });

    it('classifies favorite correctly', () => {
      expect(getTier(0.6)).toBe('favorite');
      expect(getTier(0.74)).toBe('favorite');
    });

    it('classifies heavy_favorite correctly', () => {
      expect(getTier(0.75)).toBe('heavy_favorite');
      expect(getTier(0.95)).toBe('heavy_favorite');
    });
  });

  describe('getTierBonus', () => {
    it('returns 0.5 for longshot', () => {
      expect(getTierBonus('longshot')).toBe(0.5);
    });

    it('returns 0.25 for underdog', () => {
      expect(getTierBonus('underdog')).toBe(0.25);
    });

    it('returns 0.1 for slight_underdog', () => {
      expect(getTierBonus('slight_underdog')).toBe(0.1);
    });

    it('returns 0 for tossup, favorite, heavy_favorite', () => {
      expect(getTierBonus('tossup')).toBe(0);
      expect(getTierBonus('favorite')).toBe(0);
      expect(getTierBonus('heavy_favorite')).toBe(0);
    });
  });

  describe('calculatePoints', () => {
    it('returns 0 points for incorrect pick', () => {
      const result = calculatePoints({ probabilityAtPick: 0.5, isCorrect: false });
      expect(result.points).toBe(0);
      expect(result.multiplier).toBe(0);
      expect(result.tierBonus).toBe(0);
    });

    it('calculates correct points for a 50/50 tossup', () => {
      const result = calculatePoints({ probabilityAtPick: 0.5, isCorrect: true });
      // multiplier = 1/0.5 = 2, base = 2, tierBonus = 0
      expect(result.points).toBe(2);
      expect(result.multiplier).toBe(2);
      expect(result.tier).toBe('tossup');
    });

    it('calculates correct points for a heavy favorite', () => {
      const result = calculatePoints({ probabilityAtPick: 0.8, isCorrect: true });
      // multiplier = 1/0.8 = 1.25, tierBonus = 0
      expect(result.points).toBe(1.25);
      expect(result.tier).toBe('heavy_favorite');
    });

    it('calculates correct points for a longshot with tier bonus', () => {
      const result = calculatePoints({ probabilityAtPick: 0.05, isCorrect: true });
      // multiplier = 1/0.05 = 20, tierBonus = 0.5
      expect(result.points).toBe(20.5);
      expect(result.multiplier).toBe(20);
      expect(result.tierBonus).toBe(0.5);
      expect(result.tier).toBe('longshot');
    });

    it('calculates correct points for an underdog with tier bonus', () => {
      const result = calculatePoints({ probabilityAtPick: 0.2, isCorrect: true });
      // multiplier = 1/0.2 = 5, tierBonus = 0.25
      expect(result.points).toBe(5.25);
      expect(result.tierBonus).toBe(0.25);
      expect(result.tier).toBe('underdog');
    });
  });

  describe('calculatePackBonus', () => {
    it('returns 5 for perfect pack (5/5)', () => {
      expect(calculatePackBonus(5, 5)).toBe(5);
    });

    it('returns 2 for 4/5 correct', () => {
      expect(calculatePackBonus(4, 5)).toBe(2);
    });

    it('returns 1 for 3/5 correct', () => {
      expect(calculatePackBonus(3, 5)).toBe(1);
    });

    it('returns 0 for 2/5 or fewer correct', () => {
      expect(calculatePackBonus(2, 5)).toBe(0);
      expect(calculatePackBonus(1, 5)).toBe(0);
      expect(calculatePackBonus(0, 5)).toBe(0);
    });
  });

  describe('calculatePackScore', () => {
    it('scores a full pack with mixed results', () => {
      const picks = [
        { probabilityAtPick: 0.5, isCorrect: true },   // 2 pts
        { probabilityAtPick: 0.5, isCorrect: true },   // 2 pts
        { probabilityAtPick: 0.5, isCorrect: false },  // 0 pts
        { probabilityAtPick: 0.5, isCorrect: true },   // 2 pts
        { probabilityAtPick: 0.5, isCorrect: false },  // 0 pts
      ];
      const result = calculatePackScore(picks);
      // 3 correct out of 5 -> packBonus = 1
      expect(result.correctCount).toBe(3);
      expect(result.packBonus).toBe(1);
      expect(result.totalPoints).toBe(7); // 6 + 1
      expect(result.breakdown).toHaveLength(5);
    });

    it('scores a perfect pack', () => {
      const picks = Array(5).fill({ probabilityAtPick: 0.5, isCorrect: true });
      const result = calculatePackScore(picks);
      expect(result.correctCount).toBe(5);
      expect(result.packBonus).toBe(5);
      // 5 * 2 + 5 = 15
      expect(result.totalPoints).toBe(15);
    });

    it('scores a zero pack', () => {
      const picks = Array(5).fill({ probabilityAtPick: 0.5, isCorrect: false });
      const result = calculatePackScore(picks);
      expect(result.correctCount).toBe(0);
      expect(result.packBonus).toBe(0);
      expect(result.totalPoints).toBe(0);
    });
  });

  describe('formatProbability', () => {
    it('formats probabilities as percentages', () => {
      expect(formatProbability(0.5)).toBe('50.0%');
      expect(formatProbability(0.123)).toBe('12.3%');
      expect(formatProbability(1)).toBe('100.0%');
    });
  });

  describe('formatDecimalOdds', () => {
    it('formats decimal odds', () => {
      expect(formatDecimalOdds(0.5)).toBe('2.00');
      expect(formatDecimalOdds(0.25)).toBe('4.00');
    });

    it('returns dash for zero probability', () => {
      expect(formatDecimalOdds(0)).toBe('-');
    });
  });

  describe('calculateMaxPotentialPoints', () => {
    it('calculates max potential for all-correct scenario', () => {
      const picks = [
        { probabilityAtPick: 0.5 },
        { probabilityAtPick: 0.5 },
        { probabilityAtPick: 0.5 },
        { probabilityAtPick: 0.5 },
        { probabilityAtPick: 0.5 },
      ];
      const result = calculateMaxPotentialPoints(picks);
      // Each pick = 2pts, pack bonus for 5/5 = 5
      expect(result.totalPoints).toBe(15);
      expect(result.packBonus).toBe(5);
    });
  });

  describe('calculateCombinedProbability', () => {
    it('multiplies probabilities together', () => {
      const picks = [
        { probabilityAtPick: 0.5 },
        { probabilityAtPick: 0.5 },
      ];
      expect(calculateCombinedProbability(picks)).toBe(0.25);
    });

    it('returns 0 for empty array', () => {
      expect(calculateCombinedProbability([])).toBe(0);
    });
  });
});
