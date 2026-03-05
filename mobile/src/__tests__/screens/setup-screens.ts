/**
 * Screen-specific mocks for render tests.
 * Import this file in each screen test to get API/service/provider mocks.
 */

// API Service Mocks
jest.mock('../../lib/api/PackService', () => ({
  checkAvailability: jest.fn(async () => ({
    packsOpenedThisWeek: 0,
    packsRemaining: 2,
    canOpenPack: true,
    weeklyLimit: 2,
    weekStartsAt: new Date().toISOString(),
    weekEndsAt: new Date().toISOString(),
  })),
  createPackWithPicks: jest.fn(async () => ({ packId: 'test-pack-id' })),
  createPack: jest.fn(async () => ({ id: 'test-pack-id' })),
  createPicks: jest.fn(async () => ({ success: true })),
  getPackById: jest.fn(async () => null),
  getPacksByProfileId: jest.fn(async () => []),
  getWeeklyPackStatus: jest.fn(async () => ({
    packsOpenedThisWeek: 0,
    packsRemaining: 2,
    canOpenPack: true,
    weeklyLimit: 2,
  })),
  WEEKLY_PACK_LIMIT: 2,
}));

jest.mock('../../lib/api/ExploreService', () => ({
  getMarkets: jest.fn(async () => ({ markets: [], total: 0 })),
  getMarketById: jest.fn(async () => null),
  getActiveEvents: jest.fn(async () => []),
  getEventById: jest.fn(async () => null),
}));

jest.mock('../../lib/api/ProfileService', () => ({
  getOrCreateProfile: jest.fn(async () => null),
  fetchProfileById: jest.fn(async () => null),
  fetchProfileByAnonymousId: jest.fn(async () => null),
  updateDisplayName: jest.fn(async () => true),
  updateProfileStats: jest.fn(async () => true),
  generateRandomDisplayName: jest.fn(() => 'TestPlayer_1234'),
}));

jest.mock('../../lib/api/LeaderboardService', () => ({
  getLeaderboard: jest.fn(async () => ({
    entries: [],
    totalPlayers: 0,
    userRank: undefined,
    userPoints: undefined,
  })),
  getOrCreateWeeklyLeaderboard: jest.fn(async () => 'lb-id'),
  updateLeaderboardEntry: jest.fn(async () => true),
}));

jest.mock('../../lib/pools', () => ({
  getEventsForPack: jest.fn(async () => []),
  getPool: jest.fn(async () => null),
  selectEventsFromPool: jest.fn(() => []),
  hasValidPool: jest.fn(async () => false),
  getPoolStats: jest.fn(async () => null),
}));

jest.mock('../../lib/scoring/calculator', () => ({
  formatProbability: jest.fn((p: number) => `${Math.round(p * 100)}%`),
  calculatePoints: jest.fn(() => ({
    points: 1,
    multiplier: 1,
    tierBonus: 0,
    tier: 'tossup',
  })),
  getTier: jest.fn(() => 'tossup'),
}));

jest.mock('../../lib/audio', () => ({
  playSound: jest.fn(),
  stopSound: jest.fn(),
}));

jest.mock('../../providers/WalletProvider', () => ({
  WalletProvider: ({ children }: { children: React.ReactNode }) => children,
  useWallet: () => ({
    publicKey: null,
    connected: false,
    connecting: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    signTransaction: jest.fn(),
    signMessage: jest.fn(),
  }),
}));

export {};
