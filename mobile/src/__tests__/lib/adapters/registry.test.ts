/**
 * Venue Adapter Registry Tests
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

import { venueRegistry } from '../../../lib/adapters/registry';
import type { VenueAdapter } from '../../../lib/adapters/types';

function makeMockAdapter(venueId: string): VenueAdapter {
  return {
    venueId,
    displayName: `Mock ${venueId}`,
    fetchMarkets: jest.fn().mockResolvedValue([]),
    fetchMarket: jest.fn().mockResolvedValue(null),
    fetchPrices: jest.fn().mockResolvedValue([]),
    checkResolution: jest.fn().mockResolvedValue({ resolved: false }),
    toEvent: jest.fn().mockReturnValue({}),
    isValidMarket: jest.fn().mockReturnValue(true),
  };
}

describe('VenueAdapterRegistry', () => {
  beforeEach(() => {
    venueRegistry.clear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register and get', () => {
    it('registers and retrieves an adapter', () => {
      const adapter = makeMockAdapter('jupiter');
      venueRegistry.register(adapter);

      const retrieved = venueRegistry.get('jupiter');
      expect(retrieved).toBe(adapter);
    });

    it('throws when getting unregistered adapter', () => {
      expect(() => venueRegistry.get('nonexistent')).toThrow(
        'No adapter registered for venue: nonexistent'
      );
    });

    it('overwrites adapter with warning', () => {
      const adapter1 = makeMockAdapter('jupiter');
      const adapter2 = makeMockAdapter('jupiter');

      venueRegistry.register(adapter1);
      venueRegistry.register(adapter2);

      expect(venueRegistry.get('jupiter')).toBe(adapter2);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('getOrNull', () => {
    it('returns null for unregistered venue', () => {
      expect(venueRegistry.getOrNull('fake')).toBeNull();
    });

    it('returns adapter when registered', () => {
      const adapter = makeMockAdapter('polymarket');
      venueRegistry.register(adapter);
      expect(venueRegistry.getOrNull('polymarket')).toBe(adapter);
    });
  });

  describe('has', () => {
    it('returns false when not registered', () => {
      expect(venueRegistry.has('jupiter')).toBe(false);
    });

    it('returns true when registered', () => {
      venueRegistry.register(makeMockAdapter('jupiter'));
      expect(venueRegistry.has('jupiter')).toBe(true);
    });
  });

  describe('getVenueIds', () => {
    it('returns all registered venue IDs', () => {
      venueRegistry.register(makeMockAdapter('jupiter'));
      venueRegistry.register(makeMockAdapter('polymarket'));

      const ids = venueRegistry.getVenueIds();
      expect(ids).toContain('jupiter');
      expect(ids).toContain('polymarket');
    });
  });

  describe('getAll', () => {
    it('returns all registered adapters', () => {
      venueRegistry.register(makeMockAdapter('jupiter'));
      venueRegistry.register(makeMockAdapter('polymarket'));

      const all = venueRegistry.getAll();
      expect(all.length).toBe(2);
    });
  });

  describe('getDefault', () => {
    it('returns adapter for active venue', () => {
      venueRegistry.register(makeMockAdapter('jupiter'));

      const def = venueRegistry.getDefault();
      expect(def.venueId).toBe('jupiter');
    });

    it('throws if active venue has no adapter', () => {
      expect(() => venueRegistry.getDefault()).toThrow();
    });
  });

  describe('getDefaultVenueId', () => {
    it('returns the active venue ID', () => {
      expect(venueRegistry.getDefaultVenueId()).toBe('jupiter');
    });
  });

  describe('unregister', () => {
    it('removes a registered adapter', () => {
      venueRegistry.register(makeMockAdapter('jupiter'));
      expect(venueRegistry.has('jupiter')).toBe(true);

      const result = venueRegistry.unregister('jupiter');
      expect(result).toBe(true);
      expect(venueRegistry.has('jupiter')).toBe(false);
    });

    it('returns false for non-existent adapter', () => {
      expect(venueRegistry.unregister('fake')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all registered adapters', () => {
      venueRegistry.register(makeMockAdapter('jupiter'));
      venueRegistry.register(makeMockAdapter('polymarket'));

      venueRegistry.clear();
      expect(venueRegistry.getAll().length).toBe(0);
    });
  });
});
