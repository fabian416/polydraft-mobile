// ============================================
// App Constants
// ============================================

// API
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://polydraft.app';
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Pack limits
export const CARDS_PER_PACK = 5;
export const WEEKLY_PACK_LIMIT = 2;
export const REVEAL_DELAY_MS = 500;
export const CARD_FLIP_DURATION_MS = 600;

// Points
export const POINTS_CORRECT_BASE = 100;
export const POINTS_STREAK_BONUS = 25;

// Leaderboard
export const LEADERBOARD_PAGE_SIZE = 50;
export const LEADERBOARD_REFRESH_INTERVAL_MS = 60_000;

// Animation durations
export const ANIMATION = {
  packOpen: 800,
  cardFlip: 600,
  cardReveal: 500,
  popIn: 300,
  slideUp: 300,
  bounceIn: 500,
  shimmer: 3000,
} as const;

// Layout
export const TAB_BAR_HEIGHT = 80;
export const HEADER_HEIGHT = 56;
export const CARD_ASPECT_RATIO = 3 / 4;

// Storage keys
export const STORAGE_KEYS = {
  authToken: 'polydraft_auth_token',
  anonymousId: 'polydraft_anonymous_id',
  onboardingComplete: 'polydraft_onboarding_complete',
  lastPackOpened: 'polydraft_last_pack_opened',
} as const;
