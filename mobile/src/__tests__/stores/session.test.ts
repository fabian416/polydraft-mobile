import { useSessionStore } from '../../stores/session';
import type { UserProfile } from '../../types';

// Reset store between tests
beforeEach(() => {
  useSessionStore.setState({
    anonymousId: '',
    profileId: null,
    userId: null,
    profile: null,
    isAuthenticated: false,
    isProfileSynced: false,
    isLoading: true,
    isInitialized: false,
  });
});

const mockProfile: UserProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  username: 'testplayer',
  display_name: 'Test Player',
  total_points: 42.5,
  total_packs_opened: 10,
  total_picks_made: 50,
  total_correct_picks: 30,
  current_streak: 3,
  longest_streak: 7,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('session store', () => {
  describe('initialize', () => {
    it('generates anonymous ID when none exists', () => {
      useSessionStore.getState().initialize();

      const state = useSessionStore.getState();
      expect(state.anonymousId).toBe('test-uuid-1234-5678-abcd');
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(true);
    });

    it('preserves existing anonymous ID', () => {
      useSessionStore.setState({ anonymousId: 'existing-id' });
      useSessionStore.getState().initialize();

      const state = useSessionStore.getState();
      expect(state.anonymousId).toBe('existing-id');
      expect(state.isInitialized).toBe(true);
    });

    it('is idempotent', () => {
      useSessionStore.getState().initialize();
      const firstId = useSessionStore.getState().anonymousId;

      useSessionStore.getState().initialize();
      expect(useSessionStore.getState().anonymousId).toBe(firstId);
    });
  });

  describe('setProfile', () => {
    it('stores the profile', () => {
      useSessionStore.getState().setProfile(mockProfile);
      expect(useSessionStore.getState().profile).toBe(mockProfile);
    });
  });

  describe('setProfileId', () => {
    it('stores the profile ID', () => {
      useSessionStore.getState().setProfileId('profile-123');
      expect(useSessionStore.getState().profileId).toBe('profile-123');
    });
  });

  describe('setProfileSynced', () => {
    it('sets synced state', () => {
      useSessionStore.getState().setProfileSynced(true);
      expect(useSessionStore.getState().isProfileSynced).toBe(true);
    });
  });

  describe('setUserId', () => {
    it('sets user ID and marks as authenticated', () => {
      useSessionStore.getState().setUserId('user-123');

      const state = useSessionStore.getState();
      expect(state.userId).toBe('user-123');
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('logout', () => {
    it('clears auth state but preserves anonymousId', () => {
      useSessionStore.setState({
        anonymousId: 'anon-123',
        userId: 'user-123',
        profile: mockProfile,
        profileId: 'profile-123',
        isAuthenticated: true,
        isProfileSynced: true,
      });

      useSessionStore.getState().logout();

      const state = useSessionStore.getState();
      expect(state.anonymousId).toBe('anon-123');
      expect(state.userId).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.profileId).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isProfileSynced).toBe(false);
    });
  });

  describe('upgradeToUser', () => {
    it('sets userId, profile, and marks as authenticated', () => {
      useSessionStore.getState().upgradeToUser('user-123', mockProfile);

      const state = useSessionStore.getState();
      expect(state.userId).toBe('user-123');
      expect(state.profile).toBe(mockProfile);
      expect(state.isAuthenticated).toBe(true);
    });
  });
});
