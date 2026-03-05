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

// Featured market IDs for Explore mode
const FEATURED_POLYMARKET_IDS = [
  'POLY-31552',
  'POLY-33506',
  'POLY-34587',
  'POLY-67284',
  'POLY-16167',
  'POLY-42365',
  'POLY-31759',
  'POLY-86832',
];

// ============================================
// Transform Helper
// ============================================

function transformEventToExploreMarket(event: Event): ExploreMarket {
  const outcomes: ExploreOutcome[] = [
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

  const isBinary =
    outcomes.length === 2 &&
    (event.outcome_a_label === 'Yes' || event.outcome_b_label === 'No');

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
 * Get featured explore markets.
 * Replaces GET /api/explore/markets.
 */
export async function getMarkets(): Promise<{
  markets: ExploreMarket[];
  total: number;
}> {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .in('polymarket_id', FEATURED_POLYMARKET_IDS)
    .order('volume', { ascending: false });

  if (error) {
    console.error('Error fetching explore markets:', error);
    return { markets: [], total: 0 };
  }

  const markets = (events || []).map(transformEventToExploreMarket);
  return { markets, total: markets.length };
}

/**
 * Get a single market/event by ID.
 */
export async function getMarketById(eventId: string): Promise<ExploreMarket | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error('Error fetching market:', error);
    return null;
  }

  return transformEventToExploreMarket(data as Event);
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
