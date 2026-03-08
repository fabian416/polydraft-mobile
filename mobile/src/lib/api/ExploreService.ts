/**
 * Explore Service
 *
 * Direct Supabase calls for Explore mode markets.
 * Replaces the web app's /api/explore/markets route.
 */

import { supabase } from '../supabase/client';
import type { Event, EventCategory } from '../../types';

// ============================================
// Types (local to mobile, matching web ExploreMarket)
// ============================================

export interface ExploreOutcome {
  id: string;
  label: string;
  probability: number;
  image_url?: string;
  image_slug?: string;
  clob_id: string;
  ticker?: string;
}

export interface ExploreMarket {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  category: string;
  subcategory?: string;
  volume: number;
  end_date: string;
  event_ticker?: string;
  outcomes: ExploreOutcome[];
  is_binary: boolean;
  status: 'active' | 'closed' | 'resolved';
  created_at?: string;
}

// ============================================
// DB Row types for the join
// ============================================

interface ExploreOutcomeRow {
  id: string;
  event_id: string;
  label: string;
  probability: number;
  image_url?: string;
  image_slug?: string;
  clob_id?: string;
  ticker?: string;
}

interface EventWithOutcomes extends Event {
  explore_outcomes: ExploreOutcomeRow[];
}

// ============================================
// Transform Helper
// ============================================

function transformEventToExploreMarket(event: EventWithOutcomes): ExploreMarket {
  // Use real explore_outcomes from DB if available, fallback to event fields
  let outcomes: ExploreOutcome[];

  if (event.explore_outcomes && event.explore_outcomes.length > 0) {
    outcomes = event.explore_outcomes.map((o) => ({
      id: o.id,
      label: o.label,
      probability: o.probability,
      image_url: o.image_url,
      image_slug: o.image_slug,
      clob_id: o.clob_id || event.polymarket_market_id || event.venue_event_id || event.id,
      ticker: o.ticker,
    }));
  } else {
    // Fallback: construct from event fields
    outcomes = [
      {
        id: `${event.id}-a`,
        label: event.outcome_a_label,
        probability: event.outcome_a_probability,
        clob_id: event.polymarket_market_id || event.venue_event_id || event.id,
      },
      {
        id: `${event.id}-b`,
        label: event.outcome_b_label,
        probability: event.outcome_b_probability,
        clob_id: event.polymarket_market_id || event.venue_event_id || event.id,
      },
    ];

    if (event.supports_draw && event.outcome_draw_label && event.outcome_draw_probability) {
      outcomes.push({
        id: `${event.id}-draw`,
        label: event.outcome_draw_label,
        probability: event.outcome_draw_probability,
        clob_id: event.polymarket_market_id || event.venue_event_id || event.id,
      });
    }
  }

  const isBinary =
    outcomes.length === 2 &&
    (outcomes[0].label === 'Yes' || outcomes[1].label === 'No');

  let status: 'active' | 'closed' | 'resolved' = 'active';
  if (event.status === 'resolved') {
    status = 'resolved';
  } else if (event.status === 'pending_resolution') {
    status = 'closed';
  }

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    image_url: event.image_url,
    category: event.category,
    subcategory: event.subcategory,
    volume: event.volume || 0,
    end_date: event.resolution_deadline_at || event.event_start_at || '',
    event_ticker: event.polymarket_slug || event.venue_slug,
    outcomes,
    is_binary: isBinary,
    status,
    created_at: event.created_at,
  };
}

// ============================================
// Service Functions
// ============================================

/**
 * Get explore markets.
 * Queries events with explore_outcomes join, filtered by is_featured + active/upcoming.
 * Matches the web backend query: src/lib/supabase/explore.ts
 */
export async function getMarkets(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  search?: string;
}): Promise<{
  markets: ExploreMarket[];
  total: number;
}> {
  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;

  let query = supabase
    .from('events')
    .select('*, explore_outcomes(*)', { count: 'exact' })
    .eq('is_featured', true)
    .in('status', ['upcoming', 'active'])
    .order('volume', { ascending: false });

  if (params?.category) {
    query = query.ilike('category', params.category);
  }
  if (params?.search) {
    query = query.ilike('title', `%${params.search}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data: events, error, count } = await query;

  if (error) {
    console.error('Error fetching explore markets:', error);
    return { markets: [], total: 0 };
  }

  const markets = (events || []).map((e: any) => transformEventToExploreMarket(e as EventWithOutcomes));
  return { markets, total: count ?? markets.length };
}

/**
 * Get a single market/event by ID (with explore_outcomes).
 */
export async function getMarketById(eventId: string): Promise<ExploreMarket | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*, explore_outcomes(*)')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error('Error fetching market:', error);
    return null;
  }

  return transformEventToExploreMarket(data as EventWithOutcomes);
}

/**
 * Get active events (for general browsing).
 */
export async function getActiveEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('status', ['upcoming', 'active'])
    .order('priority_score', { ascending: false });

  if (error) {
    console.error('Error fetching active events:', error);
    return [];
  }
  return (data ?? []) as Event[];
}

/**
 * Get a single event by ID (raw Event type).
 */
export async function getEventById(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error('Error fetching event:', error);
    return null;
  }
  return data as Event;
}
