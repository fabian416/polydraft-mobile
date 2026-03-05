/**
 * Venue Adapter Types (Mobile)
 *
 * Core interfaces for the venue-agnostic adapter system.
 * Adapters transform venue-specific data into a common format.
 */

import type { Event, EventCategory, Outcome } from '../../types';

// ============================================
// Venue Identification
// ============================================

export type VenueId = 'polymarket' | 'jupiter' | string;

// ============================================
// Venue Market Types (Common Format)
// ============================================

export interface VenueMarket {
  venueId: VenueId;
  venueMarketId: string;
  venueSlug?: string;
  venueConditionId?: string;

  title: string;
  description?: string;
  imageUrl?: string;

  outcomes: VenueOutcome[];
  supportsDraw: boolean;

  outcomeAProbability: number;
  outcomeBProbability: number;
  outcomeDrawProbability?: number;

  isActive: boolean;
  isClosed: boolean;
  isArchived: boolean;

  startDate?: string;
  endDate?: string;

  volume?: number;

  category?: EventCategory;
  subcategory?: string;
  tags?: string[];
}

export interface VenueOutcome {
  label: string;
  tokenId?: string;
  price: number;
  position: 'a' | 'b' | 'draw';
}

// ============================================
// Price Updates
// ============================================

export interface VenuePriceUpdate {
  venueMarketId: string;
  outcomeAProbability: number;
  outcomeBProbability: number;
  outcomeDrawProbability?: number;
  tokenPrices?: Array<{
    tokenId: string;
    price: number;
  }>;
  timestamp: string;
}

// ============================================
// Resolution
// ============================================

export interface VenueResolution {
  resolved: boolean;
  winningOutcome?: Outcome;
  winningPrice?: number;
  resolvedAt?: string;
}

// ============================================
// Fetch Parameters
// ============================================

export interface FetchMarketsParams {
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  limit?: number;
  offset?: number;
  category?: string;
  search?: string;
}

// ============================================
// Venue Adapter Interface
// ============================================

export interface VenueAdapter {
  readonly venueId: VenueId;
  readonly displayName: string;

  fetchMarkets(params: FetchMarketsParams): Promise<VenueMarket[]>;
  fetchMarket(marketId: string): Promise<VenueMarket | null>;
  searchMarkets?(query: string, limit?: number): Promise<VenueMarket[]>;

  fetchPrices(tokenIds: string[]): Promise<VenuePriceUpdate[]>;
  fetchTokenPrice?(tokenId: string): Promise<number | null>;

  checkResolution(marketId: string): Promise<VenueResolution>;

  toEvent(market: VenueMarket): Partial<Event>;
  isValidMarket(market: VenueMarket): boolean;
}

// ============================================
// Venue Event Input (for upsert operations)
// ============================================

export interface VenueEventInput {
  venue: VenueId;
  venueMarketId: string;
  venueSlug: string;
  venueInternalId?: string;

  title: string;
  description?: string;
  imageUrl?: string;

  outcomeALabel: string;
  outcomeBLabel: string;
  outcomeAProbability: number;
  outcomeBProbability: number;

  supportsDraw: boolean;
  outcomeDrawLabel?: string | null;
  outcomeDrawProbability?: number | null;

  tokens: Array<{
    outcome: Outcome;
    outcomeLabel: string;
    tokenId: string;
  }>;

  volume?: number;
  category?: EventCategory;
  subcategory?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
}
