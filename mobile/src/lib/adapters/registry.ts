/**
 * Venue Adapter Registry (Mobile)
 *
 * Singleton registry for managing venue adapters.
 * Allows registering and retrieving adapters by venue ID.
 */

import type { VenueAdapter, VenueId } from './types';
import { getActiveVenueId } from './config';

class VenueAdapterRegistry {
  private adapters: Map<VenueId, VenueAdapter> = new Map();

  register(adapter: VenueAdapter): void {
    if (this.adapters.has(adapter.venueId)) {
      console.warn(`Adapter for venue "${adapter.venueId}" is being overwritten`);
    }
    this.adapters.set(adapter.venueId, adapter);
  }

  get(venueId: VenueId): VenueAdapter {
    const adapter = this.adapters.get(venueId);
    if (!adapter) {
      throw new Error(`No adapter registered for venue: ${venueId}`);
    }
    return adapter;
  }

  getOrNull(venueId: VenueId): VenueAdapter | null {
    return this.adapters.get(venueId) ?? null;
  }

  has(venueId: VenueId): boolean {
    return this.adapters.has(venueId);
  }

  getVenueIds(): VenueId[] {
    return Array.from(this.adapters.keys());
  }

  getAll(): VenueAdapter[] {
    return Array.from(this.adapters.values());
  }

  getDefault(): VenueAdapter {
    return this.get(getActiveVenueId());
  }

  getDefaultVenueId(): VenueId {
    return getActiveVenueId();
  }

  unregister(venueId: VenueId): boolean {
    return this.adapters.delete(venueId);
  }

  clear(): void {
    this.adapters.clear();
  }
}

export const venueRegistry = new VenueAdapterRegistry();

export type { VenueAdapterRegistry };
