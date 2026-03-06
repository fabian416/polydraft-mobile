/**
 * Venue Configuration (Mobile)
 *
 * Configuration for each venue including rules, features, and theming.
 * Reads the active venue from Expo constants / env vars.
 */

import Constants from 'expo-constants';
import type { VenueId } from './types';

// ============================================
// Active Venue (from environment)
// ============================================

function resolveEnv(extraKey: string, envKey: string, fallback: string): string {
  const fromExtra = Constants.expoConfig?.extra?.[extraKey];
  if (fromExtra && !fromExtra.startsWith('$')) return fromExtra;
  const fromEnv = process.env[envKey];
  if (fromEnv && !fromEnv.startsWith('$')) return fromEnv;
  return fallback;
}

const ACTIVE_VENUE_ID = resolveEnv('ACTIVE_VENUE', 'EXPO_PUBLIC_ACTIVE_VENUE', 'polymarket') as VenueId;

// ============================================
// Config Interfaces
// ============================================

export interface VenueRules {
  picksPerPack: number;
  weeklyPackLimit: number;
  allowCashout: boolean;
}

export interface VenueFeatures {
  walletRequired: boolean;
  showOrderbook: boolean;
  instantExecution: boolean;
  supportsPartialSell: boolean;
}

export interface VenueTheme {
  accentColor: string;
  logo: string;
  backgroundColor?: string;
}

export interface VenueConfig {
  venueId: VenueId;
  displayName: string;
  description?: string;
  rules: VenueRules;
  features: VenueFeatures;
  theme: VenueTheme;
  api?: {
    baseUrl?: string;
    rateLimit?: number;
  };
  enabled: boolean;
}

// ============================================
// Predefined Venue Configs
// ============================================

export const venueConfigs: Record<string, VenueConfig> = {
  polymarket: {
    venueId: 'polymarket',
    displayName: 'Polymarket',
    description: 'Leading prediction market on Polygon',
    rules: {
      picksPerPack: 5,
      weeklyPackLimit: 2,
      allowCashout: false,
    },
    features: {
      walletRequired: false,
      showOrderbook: true,
      instantExecution: false,
      supportsPartialSell: true,
    },
    theme: {
      accentColor: '#6366f1',
      logo: 'polymarket',
      backgroundColor: '#0f0f23',
    },
    api: {
      baseUrl: 'https://gamma-api.polymarket.com',
      rateLimit: 60,
    },
    enabled: true,
  },

  jupiter: {
    venueId: 'jupiter',
    displayName: 'Jupiter',
    description: 'Prediction markets powered by Kalshi',
    rules: {
      picksPerPack: 5,
      weeklyPackLimit: 2,
      allowCashout: true,
    },
    features: {
      walletRequired: false,
      showOrderbook: false,
      instantExecution: true,
      supportsPartialSell: false,
    },
    theme: {
      accentColor: '#22c55e',
      logo: 'jupiter',
      backgroundColor: '#0a1628',
    },
    api: {
      baseUrl: 'https://api.elections.kalshi.com/trade-api/v2',
      rateLimit: 60,
    },
    enabled: true,
  },
};

// ============================================
// Active Venue Helpers
// ============================================

export function getActiveVenueId(): VenueId {
  if (!venueConfigs[ACTIVE_VENUE_ID]) {
    console.warn(`Invalid ACTIVE_VENUE: ${ACTIVE_VENUE_ID}, defaulting to polymarket`);
    return 'polymarket';
  }
  return ACTIVE_VENUE_ID;
}

export function getActiveVenue(): VenueConfig {
  return venueConfigs[getActiveVenueId()];
}

// ============================================
// Config Helpers
// ============================================

export function getVenueConfig(venueId: VenueId): VenueConfig | null {
  return venueConfigs[venueId] ?? null;
}

export function getEnabledVenues(): VenueConfig[] {
  return Object.values(venueConfigs).filter((config) => config.enabled);
}

export function isVenueEnabled(venueId: VenueId): boolean {
  return venueId === getActiveVenueId();
}

export function getVenueRules(venueId: VenueId): VenueRules {
  const config = venueConfigs[venueId];
  if (!config) {
    return { picksPerPack: 5, weeklyPackLimit: 2, allowCashout: false };
  }
  return config.rules;
}

export function getVenueFeatures(venueId: VenueId): VenueFeatures {
  const config = venueConfigs[venueId];
  if (!config) {
    return {
      walletRequired: false,
      showOrderbook: false,
      instantExecution: false,
      supportsPartialSell: true,
    };
  }
  return config.features;
}

export function getVenueTheme(venueId: VenueId): VenueTheme {
  const config = venueConfigs[venueId];
  if (!config) {
    return { accentColor: '#6366f1', logo: 'default' };
  }
  return config.theme;
}
