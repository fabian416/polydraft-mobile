import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { PixelText, PixelButton } from '../components/common';
import { DraftPicker } from '../components/game/DraftPicker';
import { ProgressDots } from '../components/game/ProgressDots';
import { PackSprite } from '../components/game/PackSprite';
import { PackBurst } from '../components/animations/PackBurst';
import { useCurrentPackStore } from '../stores/currentPack';
import { useMyPacksStore } from '../stores/myPacks';
import { useSessionStore } from '../stores/session';
import { playSound } from '../lib/audio';
import { haptic } from '../lib/haptics';
import { getEventsForPack } from '../lib/pools';
import { createPackWithPicks } from '../lib/api/PackService';
import { checkAvailability, WEEKLY_PACK_LIMIT } from '../lib/api/PackService';
import {
  calculatePoints,
  calculateMaxPotentialPoints,
  calculateCombinedProbability,
  formatProbability,
} from '../lib/scoring/calculator';
import { getEventRarity, getRarityConfig } from '../lib/rarity';
import { colors, spacing, borderRadius, shadows } from '../lib/theme';
import { useWalletAuthStore } from '../stores/walletAuth';
import { buildPurchaseTransaction, sendPurchaseTransaction, PREMIUM_PACK_PRICE } from '../lib/solana/purchase';
import { buildUsdcTransferTransaction, sendAndConfirmTransfer } from '../lib/solana/transfer';
import { Connection, PublicKey } from '@solana/web3.js';
import { RPC_URL } from '../lib/solana/constants';
import type { PackStackParamList } from '../navigation/types';
import type { Event, Outcome, UserPack, UserPick } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<PackStackParamList, 'PackOpen'>;
type PackOpenRoute = RouteProp<PackStackParamList, 'PackOpen'>;

type Phase =
  | 'loading'
  | 'checking'
  | 'blocked'
  | 'payment'
  | 'confirming_tx'
  | 'opening'
  | 'dissolving'
  | 'revealing'
  | 'swiping'
  | 'submitting'
  | 'confirming'
  | 'error';

interface PickedEvent {
  event: Event;
  outcome: Outcome;
}

const CONFETTI_COLORS = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7dc6f', '#a855f7'];

export function PackOpenScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<PackOpenRoute>();
  const isPremium = route.params?.premium === true;

  const [phase, setPhase] = useState<Phase>('loading');
  const [events, setEvents] = useState<Event[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pickedEvents, setPickedEvents] = useState<PickedEvent[]>([]);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Premium pack state
  const [paymentSignature, setPaymentSignature] = useState<string | null>(null);
  const [buyerWallet, setBuyerWallet] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const packIdRef = useRef<string>(uuidv4());
  const packId = packIdRef.current;

  const { anonymousId, profileId } = useSessionStore();
  const { walletAddress, status: walletStatus } = useWalletAuthStore();
  const isWalletConnected = walletStatus === 'authenticated' && !!walletAddress;
  const setPack = useCurrentPackStore((s) => s.setPack);
  const completeDraft = useCurrentPackStore((s) => s.completeDraft);
  const addPack = useMyPacksStore((s) => s.addPack);

  // Animations
  const wobbleAnim = useRef(new Animated.Value(0)).current;
  const packScaleAnim = useRef(new Animated.Value(1)).current;
  const tapPulseAnim = useRef(new Animated.Value(0.5)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;

  // Idle: pack is alive, nervous, barely contained — begging to be opened
  useEffect(() => {
    if (phase === 'opening') {
      // Nervous wobble — quick twitchy rotation like it's shivering
      const wobble = Animated.loop(
        Animated.sequence([
          Animated.timing(wobbleAnim, {
            toValue: -2.5, duration: 120,
            easing: Easing.inOut(Easing.ease), useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: 2.5, duration: 120,
            easing: Easing.inOut(Easing.ease), useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: -1, duration: 100,
            easing: Easing.inOut(Easing.ease), useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: 1, duration: 100,
            easing: Easing.inOut(Easing.ease), useNativeDriver: true,
          }),
          // Brief pause — like catching its breath
          Animated.timing(wobbleAnim, {
            toValue: 0, duration: 300,
            easing: Easing.out(Easing.ease), useNativeDriver: true,
          }),
        ])
      );
      wobble.start();

      // Antsy float — bouncy, not smooth
      const float = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -6, duration: 600,
            easing: Easing.out(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 2, duration: 400,
            easing: Easing.in(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: -3, duration: 500,
            easing: Easing.out(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0, duration: 500,
            easing: Easing.inOut(Easing.ease), useNativeDriver: true,
          }),
        ])
      );
      float.start();

      // Breathing — like it's pulsing with energy
      const breathe = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.04, duration: 800,
            easing: Easing.out(Easing.ease), useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 0.97, duration: 600,
            easing: Easing.in(Easing.ease), useNativeDriver: true,
          }),
        ])
      );
      breathe.start();

      // "Tap to Open" pulse
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(tapPulseAnim, {
            toValue: 1, duration: 800,
            easing: Easing.out(Easing.ease), useNativeDriver: true,
          }),
          Animated.timing(tapPulseAnim, {
            toValue: 0.2, duration: 800,
            easing: Easing.in(Easing.ease), useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        wobble.stop();
        float.stop();
        breathe.stop();
        pulse.stop();
      };
    }
  }, [phase, wobbleAnim, floatAnim, breatheAnim, tapPulseAnim]);

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
        setPhase('checking');
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

  // Check availability
  useEffect(() => {
    if (phase !== 'checking') return;

    // Premium packs skip weekly limit — go straight to payment
    if (isPremium) {
      setPhase('payment');
      return;
    }

    async function check() {
      try {
        const status = await checkAvailability(anonymousId);
        if (status.canOpenPack) {
          setPhase('opening');
        } else {
          setPhase('blocked');
        }
      } catch {
        // Local-first: allow opening if API fails
        setPhase('opening');
      }
    }

    check();
  }, [phase, anonymousId, isPremium]);

  // Prevent auto-tap: only enable after a real touch-up cycle on this screen
  const tapEnabledRef = useRef(false);
  const mountTimeRef = useRef(0);
  useEffect(() => {
    if (phase === 'opening') {
      tapEnabledRef.current = false;
      mountTimeRef.current = Date.now();
    } else {
      tapEnabledRef.current = false;
    }
  }, [phase]);

  // Handle tap: it's already nervous — you just make it BURST
  const handleOpenPack = useCallback(() => {
    if (phase !== 'opening' || !tapEnabledRef.current) return;
    tapEnabledRef.current = false;

    haptic('heavy');

    // Kill idle anims — take over
    floatAnim.stopAnimation();
    breatheAnim.stopAnimation();
    wobbleAnim.stopAnimation();
    floatAnim.setValue(0);
    breatheAnim.setValue(1);

    // Frantic death rattle — shake violently while crushing down
    const deathRattle = Animated.loop(
      Animated.sequence([
        Animated.timing(wobbleAnim, { toValue: -10, duration: 30, useNativeDriver: true }),
        Animated.timing(wobbleAnim, { toValue: 10, duration: 30, useNativeDriver: true }),
      ])
    );
    deathRattle.start();

    // Crush it down fast
    Animated.timing(packScaleAnim, {
      toValue: 0.65,
      duration: 350,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // BANG — spring up huge
      deathRattle.stop();
      wobbleAnim.setValue(0);
      haptic('heavy');
      playSound('pack_open');

      Animated.spring(packScaleAnim, {
        toValue: 1.4,
        tension: 500,
        friction: 3,
        useNativeDriver: true,
      }).start(() => {
        // Vanish
        haptic('heavy');
        Animated.timing(packScaleAnim, {
          toValue: 0,
          duration: 120,
          easing: Easing.in(Easing.back(5)),
          useNativeDriver: true,
        }).start(() => {
          setPhase('dissolving');
        });
      });
    });
  }, [phase, packScaleAnim, wobbleAnim, floatAnim, breatheAnim]);

  // Handle premium pack payment
  const handlePayment = useCallback(async () => {
    if (!isWalletConnected || !walletAddress) return;

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const buyerPubkey = new PublicKey(walletAddress);
      const connection = new Connection(RPC_URL, 'confirmed');

      // Build the transaction (purchase via program)
      const { transaction, blockhash, lastValidBlockHeight } =
        await buildPurchaseTransaction(buyerPubkey, packId);

      // TODO: Sign the transaction via Mobile Wallet Adapter
      // For now, this is a placeholder — MWA integration requires transact() callback
      // const signedTx = await signTransaction(transaction);
      // const result = await sendPurchaseTransaction(signedTx, blockhash, lastValidBlockHeight);

      // Simulated: in production, replace with actual MWA signing flow
      const result = await sendPurchaseTransaction(transaction, blockhash, lastValidBlockHeight);

      setPaymentSignature(result.signature);
      setBuyerWallet(walletAddress);
      setPhase('confirming_tx');
      setPaymentLoading(false);

      // Wait for on-chain confirmation
      await connection.confirmTransaction(
        {
          signature: result.signature,
          blockhash: result.blockhash,
          lastValidBlockHeight: result.lastValidBlockHeight,
        },
        'confirmed'
      );

      playSound('pack_open');
      setPhase('opening');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Payment failed';
      console.error('[PREMIUM] Payment error:', msg);
      setPaymentError(msg);
      setPhase('payment');
      setPaymentLoading(false);
    }
  }, [isWalletConnected, walletAddress, packId]);

  // Reveal cards one by one
  useEffect(() => {
    if (phase === 'revealing' && revealedCards.length < events.length) {
      const timer = setTimeout(() => {
        playSound('card_deal');
        setRevealedCards((prev) => [...prev, prev.length]);
      }, 200);
      return () => clearTimeout(timer);
    } else if (phase === 'revealing' && revealedCards.length >= events.length) {
      const timer = setTimeout(() => setPhase('swiping'), 600);
      return () => clearTimeout(timer);
    }
  }, [phase, revealedCards, events]);

  // Handle picking an outcome for the current event
  const handlePick = useCallback(
    (outcome: Outcome) => {
      if (phase !== 'swiping' || currentIndex >= events.length) return;

      playSound('card_pick');

      const event = events[currentIndex];
      const newPicked = [...pickedEvents, { event, outcome }];
      setPickedEvents(newPicked);

      if (newPicked.length < events.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // All picks made, submit
        submitPack(newPicked);
      }
    },
    [phase, currentIndex, events, pickedEvents]
  );

  // Submit the pack to the backend
  const submitPack = async (picks: PickedEvent[]) => {
    setPhase('submitting');

    const now = new Date().toISOString();
    const effectiveProfileId = profileId || anonymousId;

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
    const hasPremiumData = isPremium && paymentSignature && buyerWallet;
    const result = await createPackWithPicks(
      {
        id: packId,
        profileId: effectiveProfileId,
        anonymousId,
        packTypeSlug: 'sports',
        openedAt: now,
        ...(hasPremiumData && {
          isPremium: true,
          paymentSignature,
          paymentAmount: PREMIUM_PACK_PRICE / 1_000_000,
          buyerWallet,
        }),
      },
      pickInputs
    );

    if ('error' in result) {
      console.error('Failed to create pack:', result.error);
      // Continue anyway — local-first
    }

    // Build local objects
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
      ...(hasPremiumData && {
        is_premium: true,
        payment_signature: paymentSignature,
        payment_amount: PREMIUM_PACK_PRICE / 1_000_000,
        buyer_wallet: buyerWallet,
      }),
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

    // ===== MOCK RESOLUTION FOR TESTING =====
    // Randomly resolve each pick (60% correct) so reveals work without Supabase
    const mockResolvedPicks = userPicks.map((pick) => {
      const isCorrect = Math.random() < 0.6;
      const scoring = calculatePoints({
        probabilityAtPick: pick.probability_snapshot,
        isCorrect,
      });
      return {
        ...pick,
        is_resolved: true,
        is_correct: isCorrect,
        resolved_at: now,
        points_awarded: scoring.points,
        event: {
          ...pick.event!,
          winning_outcome: isCorrect
            ? pick.picked_outcome
            : (pick.picked_outcome === 'a' ? 'b' : 'a') as Outcome,
          status: 'resolved' as const,
        },
      };
    });
    // ===== END MOCK =====

    // Update userPack stats from mock-resolved picks
    const correctCount = mockResolvedPicks.filter(p => p.is_correct).length;
    const totalPoints = mockResolvedPicks.reduce((sum, p) => sum + p.points_awarded, 0);
    userPack.total_points = totalPoints;
    userPack.correct_picks = correctCount;
    userPack.resolution_status = 'fully_resolved';

    // Update stores
    const packEvents = picks.map((pe) => pe.event);
    setPack(userPack, packEvents);
    completeDraft(mockResolvedPicks as UserPick[]);
    addPack(userPack, packEvents, mockResolvedPicks);

    // Show confirming celebration
    setPhase('confirming');
  };

  // Calculate jackpot potential
  const jackpotData = useMemo(() => {
    if (pickedEvents.length !== events.length || events.length === 0) return null;

    const picks = pickedEvents.map(({ event, outcome }) => ({
      probabilityAtPick:
        outcome === 'a'
          ? event.outcome_a_probability
          : outcome === 'b'
            ? event.outcome_b_probability
            : event.outcome_draw_probability ?? 0,
    }));
    const maxPoints = calculateMaxPotentialPoints(picks);
    const combinedProb = calculateCombinedProbability(picks);
    return { maxPoints, combinedProb };
  }, [pickedEvents, events]);

  const handleLetsGo = useCallback(() => {
    navigation.replace('PackReveal', { packId });
  }, [navigation, packId]);

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

          {/* Checking */}
          {phase === 'checking' && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.game.gold} />
              <PixelText variant="body" size="lg" color={colors.textMuted} style={styles.loadingText}>
                Checking availability...
              </PixelText>
            </View>
          )}

          {/* Blocked */}
          {phase === 'blocked' && (
            <View style={styles.centered}>
              <PixelText variant="body" size="4xl" style={styles.blockedEmoji}>
                {'\u23F3'}
              </PixelText>
              <PixelText variant="heading" size="xl" style={styles.blockedTitle}>
                Weekly Limit Reached
              </PixelText>
              <PixelText variant="body" size="lg" color={colors.textMuted} style={styles.blockedText}>
                You've opened all your free packs this week.{'\n'}Come back next Monday for more!
              </PixelText>
              <View style={styles.blockedButtons}>
                <PixelButton
                  title="Back to Home"
                  variant="primary"
                  onPress={() => navigation.getParent()?.navigate('MainTabs', { screen: 'Game' })}
                />
                <PixelButton
                  title="View My Packs"
                  variant="secondary"
                  onPress={() => navigation.getParent()?.navigate('MainTabs', { screen: 'MyPacks' })}
                />
              </View>
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
                  setRevealedCards([]);
                  getEventsForPack('sports', 5).then((evts) => {
                    if (evts.length < 5) {
                      setErrorMessage('Not enough events available.');
                      setPhase('error');
                    } else {
                      setEvents(evts);
                      setPhase('checking');
                    }
                  }).catch(() => {
                    setErrorMessage('Failed to load events.');
                    setPhase('error');
                  });
                }}
              />
            </View>
          )}

          {/* Payment — Premium Packs */}
          {phase === 'payment' && (
            <View style={styles.centered}>
              <PackSprite size="lg" premium glowing />

              <PixelText variant="heading" size="xl" color={colors.game.gold} style={styles.paymentTitle}>
                PREMIUM PACK
              </PixelText>
              <PixelText variant="body" size="lg" color={colors.game.gold} style={styles.paymentPrice}>
                100 PLAY
              </PixelText>

              {paymentError && (
                <View style={styles.paymentErrorBox}>
                  <PixelText variant="body" size="sm" color={colors.game.failure} style={styles.paymentErrorText}>
                    {paymentError}
                  </PixelText>
                </View>
              )}

              <View style={styles.paymentButtons}>
                {!isWalletConnected ? (
                  <PixelButton
                    title="CONNECT WALLET"
                    variant="secondary"
                    onPress={() => {
                      // TODO: Integrate Mobile Wallet Adapter connection flow
                      console.log('[PREMIUM] Wallet connection not yet implemented on mobile');
                    }}
                    style={styles.paymentButton}
                  />
                ) : (
                  <PixelButton
                    title={paymentLoading ? 'PROCESSING...' : 'PAY & OPEN'}
                    variant="primary"
                    onPress={handlePayment}
                    disabled={paymentLoading}
                    style={styles.paymentButton}
                  />
                )}

                <PixelButton
                  title="Back"
                  variant="secondary"
                  onPress={() => navigation.getParent()?.navigate('MainTabs', { screen: 'Game' })}
                  style={styles.paymentButton}
                />
              </View>

              {isWalletConnected && (
                <PixelText variant="body" size="xs" color={colors.textMuted} style={styles.walletLabel}>
                  {walletAddress!.slice(0, 8)}...{walletAddress!.slice(-4)}
                </PixelText>
              )}
            </View>
          )}

          {/* Confirming Transaction */}
          {phase === 'confirming_tx' && (
            <View style={styles.centered}>
              <PackSprite size="lg" premium />
              <ActivityIndicator size="large" color={colors.game.gold} style={styles.txSpinner} />
              <PixelText variant="heading" size="lg" color={colors.game.gold} style={styles.txTitle}>
                Confirming transaction...
              </PixelText>
              {paymentSignature && (
                <PixelText variant="body" size="xs" color={colors.textMuted} style={styles.txSig}>
                  {paymentSignature.slice(0, 8)}...{paymentSignature.slice(-8)}
                </PixelText>
              )}
            </View>
          )}

          {/* Opening — Tap to Open Pack (Balatro style) */}
          {phase === 'opening' && (
            <View style={styles.centered}>
              <Pressable
                onPressIn={() => {
                  if (Date.now() - mountTimeRef.current > 800) {
                    tapEnabledRef.current = true;
                  }
                }}
                onPress={handleOpenPack}
              >
                <Animated.View
                  style={{
                    transform: [
                      { translateY: floatAnim },
                      { rotate: wobbleAnim.interpolate({ inputRange: [-8, 8], outputRange: ['-8deg', '8deg'] }) },
                      { scale: Animated.multiply(packScaleAnim, breatheAnim) },
                    ],
                  }}
                >
                  <PackSprite size="hero" premium={isPremium} />
                </Animated.View>
              </Pressable>
              <Animated.View style={{ opacity: tapPulseAnim, marginTop: spacing[8] }}>
                <PixelText variant="heading" size="lg" color={colors.foreground}>
                  Tap to Open
                </PixelText>
              </Animated.View>
            </View>
          )}

          {/* Dissolving — Pack burst particles */}
          {phase === 'dissolving' && (
            <View style={styles.centered}>
              <PackBurst onComplete={() => setPhase('revealing')} />
            </View>
          )}

          {/* Revealing — Cards fan out one by one */}
          {phase === 'revealing' && (
            <View style={styles.centered}>
              <View style={styles.revealGrid}>
                {events.map((event, index) => {
                  const rarity =
                    event.rarityInfo?.rarity ??
                    getEventRarity(event.outcome_a_probability, event.outcome_b_probability);
                  const rarityConfig = getRarityConfig(rarity);
                  const isRevealed = revealedCards.includes(index);

                  return (
                    <RevealMiniCard
                      key={event.id}
                      revealed={isRevealed}
                      borderColor={rarityConfig.hex}
                      subcategory={event.subcategory}
                      showGlow={rarity === 'rare' || rarity === 'epic' || rarity === 'legendary'}
                    />
                  );
                })}
              </View>
              <PixelText variant="body" size="lg" style={styles.revealCount}>
                {revealedCards.length} / {events.length} cards
              </PixelText>
            </View>
          )}

          {/* Swiping — Make Your Picks */}
          {phase === 'swiping' && currentEvent && (
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
                  key={currentEvent.id}
                  event={currentEvent}
                  position={currentIndex + 1}
                  total={events.length}
                  onPick={handlePick}
                />
              </View>

              {/* Picked summary strip */}
              {pickedEvents.length > 0 && (
                <View style={styles.pickedStrip}>
                  {pickedEvents.map(({ event, outcome }) => {
                    const rarity =
                      event.rarityInfo?.rarity ??
                      getEventRarity(event.outcome_a_probability, event.outcome_b_probability);
                    const rarityConfig = getRarityConfig(rarity);
                    const label =
                      outcome === 'a'
                        ? event.outcome_a_label
                        : outcome === 'b'
                          ? event.outcome_b_label
                          : event.outcome_draw_label || 'Draw';
                    const chipColor =
                      outcome === 'a' ? '#3b82f6' : outcome === 'b' ? '#ef4444' : colors.game.gold;

                    return (
                      <View
                        key={event.id}
                        style={[
                          styles.pickedChip,
                          {
                            borderColor: rarityConfig.hex,
                            backgroundColor: chipColor + '30',
                          },
                        ]}
                      >
                        <PixelText variant="body" size="xs" color={chipColor}>
                          {label.slice(0, 3).toUpperCase()}
                        </PixelText>
                      </View>
                    );
                  })}
                </View>
              )}
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

          {/* Confirming — Jackpot Celebration (Balatro style) */}
          {phase === 'confirming' && jackpotData && (
            <JackpotScreen
              jackpotData={jackpotData}
              pickedEvents={pickedEvents}
              onLetsGo={handleLetsGo}
            />
          )}
        </View>
      </ScreenContainer>
    </GestureHandlerRootView>
  );
}

// ===== Mini card for revealing phase =====

function RevealMiniCard({
  revealed,
  borderColor,
  subcategory,
  showGlow,
}: {
  revealed: boolean;
  borderColor: string;
  subcategory?: string;
  showGlow: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(-180)).current;

  useEffect(() => {
    if (revealed) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, stiffness: 400, damping: 25, useNativeDriver: true }),
        Animated.spring(rotateAnim, { toValue: 0, stiffness: 400, damping: 25, useNativeDriver: true }),
      ]).start();
    }
  }, [revealed, scaleAnim, rotateAnim]);

  const sub = (subcategory ?? '').toLowerCase();
  const emoji =
    sub === 'nba' ? '\u{1F3C0}' :
    sub === 'nfl' ? '\u{1F3C8}' :
    sub === 'epl' || sub === 'laliga' || sub === 'ucl' || sub === 'soccer' ? '\u26BD' :
    sub === 'f1' ? '\u{1F3CE}\uFE0F' :
    sub === 'mlb' ? '\u26BE' :
    sub === 'tennis' ? '\u{1F3BE}' :
    '\u{1F3AF}';

  return (
    <Animated.View
      style={[
        styles.miniCard,
        {
          borderColor,
          transform: [
            { scale: scaleAnim },
            {
              rotate: rotateAnim.interpolate({
                inputRange: [-180, 0],
                outputRange: ['-180deg', '0deg'],
              }),
            },
          ],
          ...(showGlow && {
            shadowColor: borderColor,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 12,
            shadowOpacity: 0.6,
          }),
        },
      ]}
    >
      <PixelText variant="body" size="xl">
        {emoji}
      </PixelText>
    </Animated.View>
  );
}

// ===== Jackpot Screen (Balatro-style celebration) =====

function JackpotScreen({
  jackpotData,
  pickedEvents,
  onLetsGo,
}: {
  jackpotData: { maxPoints: { totalPoints: number }; combinedProb: number };
  pickedEvents: Array<{ event: Event; outcome: Outcome }>;
  onLetsGo: () => void;
}) {
  // Staggered entrance animations
  const titleScale = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const chipsOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const amountScale = useRef(new Animated.Value(0.5)).current;
  const jackpotGlow = useRef(new Animated.Value(0.6)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Title slam in
    Animated.spring(titleScale, {
      toValue: 1, tension: 200, friction: 8, delay: 200,
      useNativeDriver: true,
    }).start();

    // Jackpot card slides up
    Animated.parallel([
      Animated.spring(cardSlide, {
        toValue: 0, tension: 80, friction: 10, delay: 500,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1, duration: 300, delay: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Amount pop
    Animated.spring(amountScale, {
      toValue: 1, tension: 150, friction: 6, delay: 800,
      useNativeDriver: true,
    }).start();

    // Chips fade in
    Animated.timing(chipsOpacity, {
      toValue: 1, duration: 400, delay: 1100,
      useNativeDriver: true,
    }).start();

    // Button fade in
    Animated.timing(btnOpacity, {
      toValue: 1, duration: 400, delay: 1400,
      useNativeDriver: true,
    }).start();

    // Jackpot glow pulse (continuous)
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(jackpotGlow, {
          toValue: 1, duration: 1000,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(jackpotGlow, {
          toValue: 0.5, duration: 1000,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ])
    );
    glow.start();

    return () => glow.stop();
  }, []);

  const handlePressIn = () => {
    Animated.timing(btnScale, { toValue: 0.94, duration: 50, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(btnScale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.centered}>
      {/* Continuous confetti rain */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {CONFETTI_COLORS.map((color, i) =>
          Array.from({ length: 8 }, (_, j) => (
            <ConfettiParticle
              key={`${i}-${j}`}
              color={color}
              startX={Math.random() * SCREEN_WIDTH}
              delay={Math.random() * 2000}
            />
          ))
        )}
      </View>

      {/* Title — slams in with scale */}
      <Animated.View style={{
        transform: [{ scale: titleScale }],
        marginBottom: spacing[2],
      }}>
        <PixelText variant="body" size="4xl">
          {'\u{1F3B0}'}
        </PixelText>
      </Animated.View>

      <Animated.View style={{
        transform: [{ scale: titleScale }],
        marginBottom: spacing[4],
        alignItems: 'center',
      }}>
        <PixelText variant="heading" size="xl" color={colors.game.gold} style={{ textAlign: 'center' }}>
          PICKS LOCKED IN!
        </PixelText>
      </Animated.View>

      {/* Jackpot Card — hero element, big and dominant */}
      <Animated.View style={[
        styles.jackpotCard,
        {
          transform: [{ translateY: cardSlide }],
          opacity: cardOpacity,
        },
      ]}>
        <Animated.View style={{ opacity: jackpotGlow }}>
          <PixelText variant="heading" size="sm" color={colors.game.gold} uppercase style={styles.jackpotLabel}>
            POTENTIAL JACKPOT
          </PixelText>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: amountScale }], alignItems: 'center' }}>
          <PixelText variant="heading" size="2xl" style={styles.jackpotAmount}>
            ${jackpotData.maxPoints.totalPoints.toFixed(2)} USD
          </PixelText>
        </Animated.View>

        <PixelText variant="body" size="lg" color={colors.textMuted} style={styles.jackpotSub}>
          If you nail all 5 picks!
        </PixelText>
        <PixelText variant="body" size="lg" color={colors.game.gold}>
          {'\u{1F3B2}'} {formatProbability(jackpotData.combinedProb)} chance
        </PixelText>
      </Animated.View>

      {/* Pick chips */}
      <Animated.View style={[styles.confirmChips, { opacity: chipsOpacity }]}>
        {pickedEvents.map(({ event, outcome }) => {
          const prob =
            outcome === 'a'
              ? event.outcome_a_probability
              : outcome === 'b'
                ? event.outcome_b_probability
                : event.outcome_draw_probability ?? 0;
          const label =
            outcome === 'a'
              ? event.outcome_a_label
              : outcome === 'b'
                ? event.outcome_b_label
                : event.outcome_draw_label || 'Draw';
          const rarity =
            event.rarityInfo?.rarity ??
            getEventRarity(event.outcome_a_probability, event.outcome_b_probability);
          const rarityConfig = getRarityConfig(rarity);

          return (
            <View
              key={event.id}
              style={[styles.confirmChip, { borderColor: rarityConfig.hex }]}
            >
              <PixelText variant="body" size="sm">
                {label.slice(0, 3).toUpperCase()}
              </PixelText>
              <PixelText variant="body" size="xs" color={colors.textMuted}>
                {formatProbability(prob)}
              </PixelText>
            </View>
          );
        })}
      </Animated.View>

      {/* CTA Button — big, juicy, Balatro-style */}
      <Animated.View style={{ opacity: btnOpacity }}>
        <Pressable onPress={onLetsGo} onPressIn={handlePressIn} onPressOut={handlePressOut}>
          <View style={styles.letsGoBtnShadow} />
          <Animated.View style={[styles.letsGoBtn, { transform: [{ scale: btnScale }] }]}>
            <PixelText variant="heading" size="xl" color="#fff">
              LET'S GO!
            </PixelText>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ===== Confetti Particle =====

function ConfettiParticle({
  color,
  startX,
  delay,
}: {
  color: string;
  startX: number;
  delay: number;
}) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const drift = (Math.random() - 0.5) * 200;
    const duration = 2500 + Math.random() * 1500;

    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT + 100,
            duration,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(translateX, {
            toValue: drift,
            duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: duration * 0.5,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration * 0.3,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(rotate, {
            toValue: Math.random() > 0.5 ? 360 : -360,
            duration,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [delay, translateY, translateX, opacity, rotate]);

  const isCircle = Math.random() > 0.5;
  const size = 6 + Math.random() * 6;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: -20,
        width: size,
        height: isCircle ? size : size * 1.5,
        borderRadius: isCircle ? size / 2 : 2,
        backgroundColor: color,
        opacity,
        transform: [
          { translateY },
          { translateX },
          {
            rotate: rotate.interpolate({
              inputRange: [-360, 360],
              outputRange: ['-360deg', '360deg'],
            }),
          },
        ],
      }}
    />
  );
}

// ===== Styles =====

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
  // Blocked
  blockedEmoji: {
    marginBottom: spacing[4],
  },
  blockedTitle: {
    marginBottom: spacing[4],
  },
  blockedText: {
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  blockedButtons: {
    gap: spacing[3],
    width: '100%',
    maxWidth: 300,
  },
  // Payment
  paymentTitle: {
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  paymentPrice: {
    marginBottom: spacing[6],
  },
  paymentErrorBox: {
    width: '100%',
    maxWidth: 340,
    marginBottom: spacing[4],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  paymentErrorText: {
    textAlign: 'center',
  },
  paymentButtons: {
    gap: spacing[3],
    width: '100%',
    maxWidth: 340,
  },
  paymentButton: {
    width: '100%',
  },
  walletLabel: {
    marginTop: spacing[3],
  },
  // Confirming Tx
  txSpinner: {
    marginTop: spacing[6],
  },
  txTitle: {
    marginTop: spacing[4],
  },
  txSig: {
    marginTop: spacing[2],
  },
  // Revealing
  revealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[3],
    maxWidth: 300,
  },
  miniCard: {
    width: 56,
    height: 80,
    backgroundColor: colors.game.primary,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revealCount: {
    marginTop: spacing[6],
  },
  // Swiping
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
  pickedStrip: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  pickedChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  // Confirming — Jackpot
  jackpotCard: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: 'rgba(180, 134, 11, 0.12)',
    borderWidth: 2,
    borderColor: colors.game.gold,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    marginBottom: spacing[4],
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  jackpotLabel: {
    marginBottom: spacing[2],
    letterSpacing: 4,
  },
  jackpotAmount: {
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  jackpotSub: {
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  confirmChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  confirmChip: {
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  letsGoBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: -4,
    backgroundColor: '#b91c1c',
    borderRadius: borderRadius.lg,
  },
  letsGoBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
});
