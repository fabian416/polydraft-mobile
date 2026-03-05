import { Platform } from 'react-native';

// ============================================
// Color Palette
// ============================================

export const colors = {
  // Base
  background: '#0a0a1a',
  foreground: '#f1f5f9',

  // Game colors
  game: {
    bg: '#1a1a2e',
    primary: '#16213e',
    secondary: '#0f3460',
    accent: '#e94560',
    gold: '#ffd700',
    success: '#4ade80',
    failure: '#6b7280',
    warning: '#fbbf24',
  },

  // Card colors
  card: {
    bg: '#1e293b',
    border: '#334155',
    hover: '#2d3748',
  },

  // Outcome colors
  outcome: {
    a: '#3b82f6', // blue
    b: '#ef4444', // red
    draw: '#a855f7', // purple
    selected: '#22c55e', // green
  },

  // Rarity colors
  rarity: {
    common: '#9ca3af',
    uncommon: '#22c55e',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#ffd700',
  },

  // Utility
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.6)',
  border: '#334155',
  textMuted: '#94a3b8',
  textSecondary: '#cbd5e1',
} as const;

// ============================================
// Typography
// ============================================

export const fonts = {
  heading: Platform.select({
    ios: 'PressStart2P-Regular',
    android: 'PressStart2P-Regular',
    default: 'PressStart2P-Regular',
  }),
  body: Platform.select({
    ios: 'VT323-Regular',
    android: 'VT323-Regular',
    default: 'VT323-Regular',
  }),
  mono: Platform.select({
    ios: 'JetBrainsMono-Regular',
    android: 'JetBrainsMono-Regular',
    default: 'JetBrainsMono-Regular',
  }),
} as const;

export const fontSize = {
  xs: 8,
  sm: 10,
  base: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

export const lineHeight = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 36,
  '4xl': 56,
} as const;

// ============================================
// Spacing (multiples of 4)
// ============================================

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

// ============================================
// Border Radius
// ============================================

export const borderRadius = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 16,
  full: 9999,
} as const;

// ============================================
// Shadows
// ============================================

export const shadows = {
  pixel: {
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  pixelLg: {
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
    elevation: 6,
  },
  glow: {
    shadowColor: colors.game.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  glowSuccess: {
    shadowColor: colors.game.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

// ============================================
// Border Widths
// ============================================

export const borderWidth = {
  thin: 1,
  base: 2,
  thick: 3,
  heavy: 4,
} as const;

// ============================================
// Combined Theme Export
// ============================================

export const theme = {
  colors,
  fonts,
  fontSize,
  lineHeight,
  spacing,
  borderRadius,
  shadows,
  borderWidth,
} as const;

export type Theme = typeof theme;
export default theme;
