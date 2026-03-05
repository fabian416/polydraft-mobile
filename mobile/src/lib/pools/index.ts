/**
 * Pool Selection Logic for Polydraft (Mobile)
 *
 * Fetches event pools from Supabase and selects events
 * using rarity-based selection for pack generation.
 */

import { supabase } from '../supabase/client';
import type { Event, EventCategory, Rarity, RarityInfo } from '../../types';
import {
  rollTargetRarity,
  getEventRarity,
  calculatePLow,
  getFallbackRarities,
  distanceToRarityBin,
} from '../rarity';
import Constants from 'expo-constants';

// Default venue; can be overridden via app config
const ACTIVE_VENUE =
  Constants.expoConfig?.extra?.ACTIVE_VENUE ??
  process.env.EXPO_PUBLIC_ACTIVE_VENUE ??
  'polymarket';

// ============================================
// Types
// ============================================

export interface EventPool {
  id: string;
  name: string;
  pack_type: string;
  min_events_required: number;
  events: Event[];
}

interface DBPool {
  id: string;
  slug: string;
  name: string;
  venue: string;
  pack_type: string;
  period: string | null;
  min_events_required: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DBEvent {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  outcome_a_label: string;
  outcome_b_label: string;
  outcome_a_probability: number;
  outcome_b_probability: number;
  outcome_draw_label: string | null;
  outcome_draw_probability: number | null;
  supports_draw: boolean;
  status: string;
  event_start_at: string | null;
  resolution_deadline_at: string | null;
  polymarket_slug: string | null;
  polymarket_market_id: string | null;
  polymarket_id: string | null;
  volume: number | null;
  venue: string | null;
  venue_event_id: string | null;
  venue_slug: string | null;
  image_url: string | null;
  description: string | null;
  pool_id: string | null;
  period: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Pool Fetching
// ============================================

async function getPoolFromDB(venue: string, packType: string): Promise<EventPool | null> {
  const { data: pool, error: poolError } = await supabase
    .from('pools')
    .select('*')
    .eq('venue', venue)
    .eq('pack_type', packType)
    .eq('is_active', true)
    .single();

  if (poolError || !pool) {
    console.warn(`No active pool found for venue=${venue}, pack_type=${packType}`);
    return null;
  }

  const dbPool = pool as DBPool;

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .eq('pool_id', dbPool.id)
    .eq('status', 'upcoming');

  if (eventsError) {
    console.error('Error fetching events for pool:', eventsError);
    return null;
  }

  const dbEvents = (events || []) as DBEvent[];
  const now = new Date().toISOString();

  const mappedEvents: Event[] = dbEvents.map((e) => ({
    id: e.id,
    venue: e.venue || venue,
    venue_event_id: e.venue_event_id || undefined,
    venue_slug: e.venue_slug || undefined,
    polymarket_market_id: e.polymarket_market_id || undefined,
    polymarket_slug: e.polymarket_slug || undefined,
    polymarket_id: e.polymarket_id || undefined,
    volume: e.volume || undefined,
    title: e.title,
    image_url: e.image_url || undefined,
    description: e.description || undefined,
    category: e.category as EventCategory,
    subcategory: e.subcategory || undefined,
    outcome_a_label: e.outcome_a_label,
    outcome_b_label: e.outcome_b_label,
    outcome_a_probability: e.outcome_a_probability,
    outcome_b_probability: e.outcome_b_probability,
    outcome_draw_label: e.outcome_draw_label || undefined,
    outcome_draw_probability: e.outcome_draw_probability || undefined,
    supports_draw: e.supports_draw,
    status: e.status as Event['status'],
    event_start_at: e.event_start_at || undefined,
    resolution_deadline_at: e.resolution_deadline_at || undefined,
    is_featured: false,
    priority_score: 0,
    created_at: e.created_at || now,
    updated_at: e.updated_at || now,
  }));

  return {
    id: dbPool.slug,
    name: dbPool.name,
    pack_type: dbPool.pack_type,
    min_events_required: dbPool.min_events_required,
    events: mappedEvents,
  };
}

export async function getPool(packType: string): Promise<EventPool | null> {
  return getPoolFromDB(ACTIVE_VENUE, packType);
}

// ============================================
// Selection Helpers
// ============================================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickRandom<T>(array: T[]): T | null {
  if (array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

function addRarityInfo(event: Event, targetRarity: Rarity): Event {
  const pLow = calculatePLow(event.outcome_a_probability, event.outcome_b_probability);
  const rarity = getEventRarity(event.outcome_a_probability, event.outcome_b_probability);

  const rarityInfo: RarityInfo = { pLow, rarity, targetRarity };
  return { ...event, rarityInfo };
}

function filterEventsByRarity(events: Event[], targetRarity: Rarity): Event[] {
  return events.filter(
    (event) =>
      getEventRarity(event.outcome_a_probability, event.outcome_b_probability) === targetRarity
  );
}

function findClosestToRarity(events: Event[], targetRarity: Rarity): Event | null {
  if (events.length === 0) return null;
  let closest: Event | null = null;
  let minDistance = Infinity;

  for (const event of events) {
    const pLow = calculatePLow(event.outcome_a_probability, event.outcome_b_probability);
    const distance = distanceToRarityBin(pLow, targetRarity);
    if (distance < minDistance) {
      minDistance = distance;
      closest = event;
    }
  }
  return closest;
}

function selectEventForRarity(
  availableEvents: Event[],
  targetRarity: Rarity
): { event: Event; targetRarity: Rarity } | null {
  const matching = filterEventsByRarity(availableEvents, targetRarity);
  if (matching.length > 0) {
    const event = pickRandom(matching);
    if (event) return { event, targetRarity };
  }

  const fallbacks = getFallbackRarities(targetRarity);
  for (const fallback of fallbacks) {
    if (fallback === targetRarity) continue;
    const fallbackEvents = filterEventsByRarity(availableEvents, fallback);
    if (fallbackEvents.length > 0) {
      const event = pickRandom(fallbackEvents);
      if (event) return { event, targetRarity };
    }
  }

  const closest = findClosestToRarity(availableEvents, targetRarity);
  if (closest) return { event: closest, targetRarity };

  return null;
}

// ============================================
// Public API
// ============================================

export function selectEventsFromPool(pool: EventPool, count: number): Event[] {
  const selectedEvents: Event[] = [];
  const usedEventIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    const targetRarity = rollTargetRarity();
    const available = pool.events.filter((e) => !usedEventIds.has(e.id));

    if (available.length === 0) {
      console.warn(`Pool "${pool.name}" ran out of events after selecting ${i} cards`);
      break;
    }

    const result = selectEventForRarity(available, targetRarity);
    if (result) {
      const eventWithRarity = addRarityInfo(result.event, result.targetRarity);
      selectedEvents.push(eventWithRarity);
      usedEventIds.add(result.event.id);
    }
  }

  return selectedEvents;
}

export async function getEventsForPack(packType: string, count: number = 5): Promise<Event[]> {
  const pool = await getPool(packType);
  if (!pool) {
    console.error(`No pool found for pack type: ${packType}`);
    return [];
  }

  if (pool.events.length < pool.min_events_required) {
    console.error(
      `Pool "${pool.name}" doesn't have enough events. ` +
        `Required: ${pool.min_events_required}, Available: ${pool.events.length}`
    );
    return [];
  }

  return selectEventsFromPool(pool, count);
}

export async function hasValidPool(packType: string): Promise<boolean> {
  const pool = await getPool(packType);
  return pool !== null && pool.events.length >= pool.min_events_required;
}

export async function getPoolStats(
  packType: string
): Promise<{ totalEvents: number; minRequired: number; isValid: boolean } | null> {
  const pool = await getPool(packType);
  if (!pool) return null;

  return {
    totalEvents: pool.events.length,
    minRequired: pool.min_events_required,
    isValid: pool.events.length >= pool.min_events_required,
  };
}
