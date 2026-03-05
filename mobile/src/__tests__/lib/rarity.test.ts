import {
  calculatePLow,
  getRarityFromPLow,
  getEventRarity,
  eventMatchesRarity,
  distanceToRarityBin,
  getFallbackRarities,
  RARITY_ORDER,
  DROP_RATES,
} from '../../lib/rarity';

describe('Rarity System', () => {
  describe('calculatePLow', () => {
    it('returns the minimum of two probabilities', () => {
      expect(calculatePLow(0.7, 0.3)).toBe(0.3);
      expect(calculatePLow(0.4, 0.6)).toBe(0.4);
      expect(calculatePLow(0.5, 0.5)).toBe(0.5);
    });

    it('handles extreme probabilities', () => {
      expect(calculatePLow(0.01, 0.99)).toBe(0.01);
      expect(calculatePLow(0.99, 0.01)).toBe(0.01);
    });
  });

  describe('getRarityFromPLow', () => {
    it('returns legendary for pLow < 0.02', () => {
      expect(getRarityFromPLow(0.01)).toBe('legendary');
      expect(getRarityFromPLow(0.0)).toBe('legendary');
      expect(getRarityFromPLow(0.019)).toBe('legendary');
    });

    it('returns epic for 0.02 <= pLow < 0.05', () => {
      expect(getRarityFromPLow(0.02)).toBe('epic');
      expect(getRarityFromPLow(0.04)).toBe('epic');
    });

    it('returns rare for 0.05 <= pLow < 0.15', () => {
      expect(getRarityFromPLow(0.05)).toBe('rare');
      expect(getRarityFromPLow(0.14)).toBe('rare');
    });

    it('returns uncommon for 0.15 <= pLow < 0.3', () => {
      expect(getRarityFromPLow(0.15)).toBe('uncommon');
      expect(getRarityFromPLow(0.29)).toBe('uncommon');
    });

    it('returns common for pLow >= 0.3', () => {
      expect(getRarityFromPLow(0.3)).toBe('common');
      expect(getRarityFromPLow(0.5)).toBe('common');
    });

    it('clamps to range [0, 0.5]', () => {
      expect(getRarityFromPLow(-1)).toBe('legendary');
      expect(getRarityFromPLow(1.0)).toBe('common');
    });
  });

  describe('getEventRarity', () => {
    it('calculates rarity from two outcome probabilities', () => {
      // 70% vs 30% -> pLow = 0.3 -> common
      expect(getEventRarity(0.7, 0.3)).toBe('common');

      // 99% vs 1% -> pLow = 0.01 -> legendary
      expect(getEventRarity(0.99, 0.01)).toBe('legendary');

      // 90% vs 10% -> pLow = 0.1 -> rare
      expect(getEventRarity(0.9, 0.1)).toBe('rare');
    });
  });

  describe('eventMatchesRarity', () => {
    it('returns true when event matches target rarity', () => {
      expect(eventMatchesRarity(0.99, 0.01, 'legendary')).toBe(true);
      expect(eventMatchesRarity(0.5, 0.5, 'common')).toBe(true);
    });

    it('returns false when event does not match', () => {
      expect(eventMatchesRarity(0.5, 0.5, 'legendary')).toBe(false);
      expect(eventMatchesRarity(0.99, 0.01, 'common')).toBe(false);
    });
  });

  describe('distanceToRarityBin', () => {
    it('returns 0 when pLow is inside the bin', () => {
      expect(distanceToRarityBin(0.01, 'legendary')).toBe(0);
      expect(distanceToRarityBin(0.4, 'common')).toBe(0);
    });

    it('returns positive distance when outside', () => {
      // pLow = 0.5, legendary bin = [0, 0.02) -> distance = 0.5 - 0.02 = 0.48
      expect(distanceToRarityBin(0.5, 'legendary')).toBeCloseTo(0.48);
    });
  });

  describe('getFallbackRarities', () => {
    it('returns rarities from target down to common', () => {
      expect(getFallbackRarities('epic')).toEqual(['epic', 'rare', 'uncommon', 'common']);
    });

    it('returns just common for common target', () => {
      expect(getFallbackRarities('common')).toEqual(['common']);
    });

    it('returns all rarities for legendary', () => {
      expect(getFallbackRarities('legendary')).toEqual([
        'legendary', 'epic', 'rare', 'uncommon', 'common',
      ]);
    });
  });

  describe('DROP_RATES', () => {
    it('sums to 1.0', () => {
      const total = RARITY_ORDER.reduce((sum, r) => sum + DROP_RATES[r], 0);
      expect(total).toBeCloseTo(1.0);
    });
  });
});
