import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type { UserProfile } from '../types';

interface SessionState {
  // Anonymous ID (always present)
  anonymousId: string;

  // Profile ID from database (set after profile sync)
  profileId: string | null;

  // Authenticated user (optional)
  userId: string | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;

  // Profile sync state
  isProfileSynced: boolean;

  // Loading state
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => void;
  setProfile: (profile: UserProfile) => void;
  setProfileId: (profileId: string) => void;
  setProfileSynced: (synced: boolean) => void;
  setUserId: (userId: string) => void;
  logout: () => void;
  upgradeToUser: (userId: string, profile: UserProfile) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      anonymousId: '',
      profileId: null,
      userId: null,
      profile: null,
      isAuthenticated: false,
      isProfileSynced: false,
      isLoading: true,
      isInitialized: false,

      // Initialize session (called on app mount or after hydration)
      initialize: () => {
        const state = get();

        // Skip if already initialized (idempotent)
        if (state.isInitialized) {
          return;
        }

        // Generate anonymous ID if not exists
        if (!state.anonymousId) {
          set({
            anonymousId: uuidv4(),
            isLoading: false,
            isInitialized: true,
          });
        } else {
          set({
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      // Set user profile
      setProfile: (profile) => {
        set({ profile });
      },

      // Set profile ID from database
      setProfileId: (profileId) => {
        set({ profileId });
      },

      // Set profile sync state
      setProfileSynced: (synced) => {
        set({ isProfileSynced: synced });
      },

      // Set authenticated user ID
      setUserId: (userId) => {
        set({
          userId,
          isAuthenticated: true,
        });
      },

      // Logout (keep anonymous ID but reset profile sync)
      logout: () => {
        set({
          userId: null,
          profile: null,
          profileId: null,
          isAuthenticated: false,
          isProfileSynced: false,
        });
      },

      // Upgrade anonymous session to authenticated user
      upgradeToUser: (userId, profile) => {
        set({
          userId,
          profile,
          isAuthenticated: true,
        });
      },
    }),
    {
      name: 'polydraft-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        anonymousId: state.anonymousId,
        profileId: state.profileId,
        userId: state.userId,
      }),
      onRehydrateStorage: () => (state) => {
        // Called after hydration completes
        if (state) {
          state.initialize();
        }
      },
    }
  )
);

// Selector hooks for convenience
export const useAnonymousId = () => useSessionStore((state) => state.anonymousId);
export const useProfileId = () => useSessionStore((state) => state.profileId);
export const useUserId = () => useSessionStore((state) => state.userId ?? state.anonymousId);
export const useIsAuthenticated = () => useSessionStore((state) => state.isAuthenticated);
export const useIsProfileSynced = () => useSessionStore((state) => state.isProfileSynced);
export const useProfile = () => useSessionStore((state) => state.profile);
