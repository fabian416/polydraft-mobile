import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { PixelText, PixelButton } from '../components/common';
import { DraftPicker } from '../components/game/DraftPicker';
import { ProgressDots } from '../components/game/ProgressDots';
import { useCurrentPackStore } from '../stores/currentPack';
import { useMyPacksStore } from '../stores/myPacks';
import { useSessionStore } from '../stores/session';
import { getEventsForPack } from '../lib/pools';
import { createPackWithPicks } from '../lib/api/PackService';
import { colors, spacing } from '../lib/theme';
import type { PackStackParamList } from '../navigation/types';
import type { Event, Outcome, UserPack, UserPick } from '../types';

type NavProp = NativeStackNavigationProp<PackStackParamList, 'PackOpen'>;

type Phase = 'loading' | 'drafting' | 'submitting' | 'error';

interface PickedEvent {
  event: Event;
  outcome: Outcome;
}

export function PackOpenScreen() {
  const navigation = useNavigation<NavProp>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [events, setEvents] = useState<Event[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pickedEvents, setPickedEvents] = useState<PickedEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const { anonymousId, profileId } = useSessionStore();
  const setPack = useCurrentPackStore((s) => s.setPack);
  const completeDraft = useCurrentPackStore((s) => s.completeDraft);
  const addPack = useMyPacksStore((s) => s.addPack);

  // Load events on mount
  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const evts = await getEventsForPack('sports', 5);
        if (cancelled) return;

        if (evts.length < 5) {
          setErrorMessage('Not enough events available. Please try again later.');
          setPhase('error');
          return;
        }

        setEvents(evts);
        setPhase('drafting');
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading events:', err);
        setErrorMessage('Failed to load events. Please try again.');
        setPhase('error');
      }
    }

    loadEvents();
    return () => { cancelled = true; };
  }, []);

  // Handle picking an outcome for the current event
  const handlePick = useCallback(
    (outcome: Outcome) => {
      if (phase !== 'drafting' || currentIndex >= events.length) return;

      const event = events[currentIndex];
      const newPicked = [...pickedEvents, { event, outcome }];
      setPickedEvents(newPicked);

      if (newPicked.length < events.length) {
        // Advance to next card
        setCurrentIndex(currentIndex + 1);
      } else {
        // All picks made, submit pack
        submitPack(newPicked);
      }
    },
    [phase, currentIndex, events, pickedEvents]
  );

  // Submit the pack to the backend
  const submitPack = async (picks: PickedEvent[]) => {
    setPhase('submitting');

    const packId = uuidv4();
    const now = new Date().toISOString();
    const effectiveProfileId = profileId || anonymousId;

    // Build pick inputs
    const pickInputs = picks.map((pe, index) => {
      const prob =
        pe.outcome === 'a'
          ? pe.event.outcome_a_probability
          : pe.outcome === 'b'
            ? pe.event.outcome_b_probability
            : pe.event.outcome_draw_probability ?? 0.5;

      const oppProb =
        pe.outcome === 'a'
          ? pe.event.outcome_b_probability
          : pe.outcome === 'b'
            ? pe.event.outcome_a_probability
            : pe.event.outcome_a_probability;

      return {
        id: uuidv4(),
        eventId: pe.event.id,
        position: index + 1,
        pickedOutcome: pe.outcome,
        pickedAt: now,
        probabilitySnapshot: prob,
        oppositeProbabilitySnapshot: oppProb,
        drawProbabilitySnapshot: pe.event.outcome_draw_probability,
      };
    });

    // Create pack in database
    const result = await createPackWithPicks(
      {
        id: packId,
        profileId: effectiveProfileId,
        anonymousId,
        packTypeSlug: 'sports',
        openedAt: now,
      },
      pickInputs
    );

    if ('error' in result) {
      console.error('Failed to create pack:', result.error);
      // Continue anyway with local state — pack will sync later
    }

    // Build local UserPack and UserPick objects
    const userPack: UserPack = {
      id: packId,
      user_id: effectiveProfileId,
      pack_type_id: '',
      opened_at: now,
      resolution_status: 'pending',
      current_reveal_index: 0,
      total_points: 0,
      correct_picks: 0,
      created_at: now,
      updated_at: now,
    };

    const userPicks: (UserPick & { event: Event })[] = pickInputs.map((pi, index) => ({
      id: pi.id,
      user_pack_id: packId,
      event_id: pi.eventId,
      event: picks[index].event,
      position: pi.position,
      picked_outcome: pi.pickedOutcome,
      picked_at: pi.pickedAt,
      probability_snapshot: pi.probabilitySnapshot,
      opposite_probability_snapshot: pi.oppositeProbabilitySnapshot,
      draw_probability_snapshot: pi.drawProbabilitySnapshot,
      is_resolved: false,
      is_correct: undefined,
      points_awarded: 0,
      reveal_animation_played: false,
      created_at: now,
    }));

    // Update stores
    const packEvents = picks.map((pe) => pe.event);
    setPack(userPack, packEvents);
    completeDraft(userPicks as UserPick[]);
    addPack(userPack, packEvents, userPicks);

    // Navigate to reveal
    navigation.replace('PackReveal', { packId });
  };

  // Current event to display
  const currentEvent = events[currentIndex];

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <ScreenContainer>
        <View style={styles.container}>
          {/* Loading */}
          {phase === 'loading' && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.game.gold} />
              <PixelText variant="body" size="lg" color={colors.textMuted} style={styles.loadingText}>
                Loading events...
              </PixelText>
            </View>
          )}

          {/* Error */}
          {phase === 'error' && (
            <View style={styles.centered}>
              <PixelText variant="body" size="lg" color={colors.game.failure} style={styles.errorText}>
                {errorMessage}
              </PixelText>
              <PixelButton
                title="Try Again"
                variant="primary"
                onPress={() => {
                  setPhase('loading');
                  setErrorMessage('');
                  setEvents([]);
                  setCurrentIndex(0);
                  setPickedEvents([]);
                  // Re-trigger load
                  getEventsForPack('sports', 5).then((evts) => {
                    if (evts.length < 5) {
                      setErrorMessage('Not enough events available.');
                      setPhase('error');
                    } else {
                      setEvents(evts);
                      setPhase('drafting');
                    }
                  }).catch(() => {
                    setErrorMessage('Failed to load events.');
                    setPhase('error');
                  });
                }}
              />
            </View>
          )}

          {/* Drafting */}
          {phase === 'drafting' && currentEvent && (
            <View style={styles.draftContainer}>
              {/* Header */}
              <View style={styles.headerSection}>
                <PixelText variant="heading" size="lg" color={colors.game.gold} style={styles.headerTitle}>
                  Make Your Picks
                </PixelText>
                <PixelText variant="body" size="sm" color={colors.textMuted} style={styles.headerSubtitle}>
                  Swipe to choose
                </PixelText>
                <ProgressDots
                  total={events.length}
                  current={currentIndex}
                  completedCount={pickedEvents.length}
                />
              </View>

              {/* Draft Card */}
              <View style={styles.cardSection}>
                <DraftPicker
                  event={currentEvent}
                  position={currentIndex + 1}
                  total={events.length}
                  onPick={handlePick}
                />
              </View>
            </View>
          )}

          {/* Submitting */}
          {phase === 'submitting' && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.game.gold} />
              <PixelText variant="body" size="lg" color={colors.textMuted} style={styles.loadingText}>
                Submitting your picks...
              </PixelText>
            </View>
          )}
        </View>
      </ScreenContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  loadingText: {
    marginTop: spacing[4],
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  draftContainer: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  headerTitle: {
    marginBottom: spacing[1],
  },
  headerSubtitle: {
    marginBottom: spacing[3],
  },
  cardSection: {
    flex: 1,
  },
});
