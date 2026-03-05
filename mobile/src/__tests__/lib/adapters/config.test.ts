/**
 * Venue Config Tests
 */

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        ACTIVE_VENUE: 'jupiter',
      },
    },
  },
}));

import {
  getActiveVenueId,
  getActiveVenue,
  getVenueConfig,
  getEnabledVenues,
  isVenueEnabled,
  getVenueRules,
  getVenueFeatures,
  getVenueTheme,
  venueConfigs,
} from '../../../lib/adapters/config';

describe('Venue Config', () => {
  describe('venueConfigs', () => {
    it('has polymarket and jupiter configs', () => {
      expect(venueConfigs.polymarket).toBeDefined();
      expect(venueConfigs.jupiter).toBeDefined();
    });

    it('polymarket has correct structure', () => {
      const pm = venueConfigs.polymarket;
      expect(pm.venueId).toBe('polymarket');
      expect(pm.displayName).toBe('Polymarket');
      expect(pm.rules.picksPerPack).toBe(5);
      expect(pm.rules.weeklyPackLimit).toBe(2);
      expect(pm.enabled).toBe(true);
    });

    it('jupiter has correct structure', () => {
      const jup = venueConfigs.jupiter;
      expect(jup.venueId).toBe('jupiter');
      expect(jup.rules.allowCashout).toBe(true);
      expect(jup.features.instantExecution).toBe(true);
    });
  });

  describe('getActiveVenueId', () => {
    it('returns jupiter as default', () => {
      expect(getActiveVenueId()).toBe('jupiter');
    });
  });

  describe('getActiveVenue', () => {
    it('returns the jupiter config', () => {
      const venue = getActiveVenue();
      expect(venue.venueId).toBe('jupiter');
      expect(venue.displayName).toBe('Jupiter');
    });
  });

  describe('getVenueConfig', () => {
    it('returns config for known venue', () => {
      const config = getVenueConfig('polymarket');
      expect(config).not.toBeNull();
      expect(config!.venueId).toBe('polymarket');
    });

    it('returns null for unknown venue', () => {
      const config = getVenueConfig('unknown-venue');
      expect(config).toBeNull();
    });
  });

  describe('getEnabledVenues', () => {
    it('returns all enabled venues', () => {
      const enabled = getEnabledVenues();
      expect(enabled.length).toBeGreaterThanOrEqual(2);
      expect(enabled.every((v) => v.enabled)).toBe(true);
    });
  });

  describe('isVenueEnabled', () => {
    it('returns true for active venue', () => {
      expect(isVenueEnabled('jupiter')).toBe(true);
    });

    it('returns false for non-active venue', () => {
      expect(isVenueEnabled('polymarket')).toBe(false);
    });
  });

  describe('getVenueRules', () => {
    it('returns rules for known venue', () => {
      const rules = getVenueRules('jupiter');
      expect(rules.picksPerPack).toBe(5);
      expect(rules.weeklyPackLimit).toBe(2);
      expect(rules.allowCashout).toBe(true);
    });

    it('returns defaults for unknown venue', () => {
      const rules = getVenueRules('fake');
      expect(rules.picksPerPack).toBe(5);
      expect(rules.allowCashout).toBe(false);
    });
  });

  describe('getVenueFeatures', () => {
    it('returns features for known venue', () => {
      const features = getVenueFeatures('jupiter');
      expect(features.instantExecution).toBe(true);
      expect(features.walletRequired).toBe(false);
    });

    it('returns defaults for unknown venue', () => {
      const features = getVenueFeatures('fake');
      expect(features.walletRequired).toBe(false);
    });
  });

  describe('getVenueTheme', () => {
    it('returns theme for known venue', () => {
      const theme = getVenueTheme('jupiter');
      expect(theme.accentColor).toBe('#22c55e');
      expect(theme.logo).toBe('jupiter');
    });

    it('returns default theme for unknown venue', () => {
      const theme = getVenueTheme('fake');
      expect(theme.accentColor).toBe('#6366f1');
      expect(theme.logo).toBe('default');
    });
  });
});
