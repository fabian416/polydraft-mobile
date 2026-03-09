import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Animated as RNAnimated,
  Dimensions,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { GameBackground } from '../components/game/GameBackground';
import { PixelText } from '../components/common';
import { LoadingSpinner } from '../components/common';
import { OutcomeDots } from '../components/explore/OutcomeDots';
import { useExploreStore } from '../stores/explore';
import { useWallet } from '../providers/WalletProvider';
import { getMarketById } from '../lib/api/ExploreService';
import { haptic } from '../lib/haptics';
import { playSound, type SoundName } from '../lib/audio';
import { buildUsdcTransferTransaction, sendAndConfirmTransfer } from '../lib/solana/transfer';
import { colors, spacing, borderRadius } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';
import type { ExploreMarket, ExploreOutcome } from '../types';

type EventDetailRoute = RouteProp<RootStackParamList, 'EventDetail'>;
type EventDetailNav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing[4] * 2;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.64;

// Swipe thresholds (matching DraftPicker)
const SWIPE_X_THRESHOLD = 80;
const SWIPE_Y_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 500;
const EXIT_X = 500;
const EXIT_Y = 500;
const MAX_ROTATION = 20;
const OVERLAY_ROTATION = 12;
const EXIT_DURATION = 200;

const AMOUNTS = [2, 5, 10, 25] as const;
type Amount = (typeof AMOUNTS)[number];

type BetDirection = 'yes' | 'no';
type PurchaseState = 'idle' | 'processing' | 'success' | 'error';

// ============================================
// Image fallback chain: outcome.image_slug → outcome.image_url → market.image_url → emoji
// ============================================

function resolveOutcomeImage(
  outcome: ExploreOutcome,
  market: ExploreMarket
): string | null {
  // image_slug would be a constructed URL in production
  if (outcome.image_url) return outcome.image_url;
  if (market.image_url) return market.image_url;
  return null;
}

function getCategoryEmoji(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('sport') || lower.includes('nba') || lower.includes('nfl')) return '\u{1F3C0}';
  if (lower.includes('politic') || lower.includes('election')) return '\u{1F5F3}\uFE0F';
  if (lower.includes('crypto') || lower.includes('bitcoin')) return '\u{1F4B0}';
  if (lower.includes('econ') || lower.includes('finance')) return '\u{1F4C8}';
  if (lower.includes('entertain') || lower.includes('oscar')) return '\u{1F3AC}';
  return '\u{1F3AF}';
}

// ============================================
// ActionButton (YES / NO / PASS with pixel shadow)
// ============================================

function ActionButton({
  label,
  color,
  shadowColor,
  onPress,
  icon,
}: {
  label: string;
  color: string;
  shadowColor: string;
  onPress: () => void;
  icon?: string;
}) {
  const translateY = useRef(new RNAnimated.Value(0)).current;

  const handlePressIn = () => {
    haptic('light');
    RNAnimated.timing(translateY, {
      toValue: 4,
      duration: 50,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    RNAnimated.timing(translateY, {
      toValue: 0,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.actionButtonWrap}
    >
      <View style={[styles.actionButtonShadow, { backgroundColor: shadowColor }]} />
      <RNAnimated.View
        style={[
          styles.actionButtonFace,
          { backgroundColor: color, transform: [{ translateY }] },
        ]}
      >
        <PixelText variant="heading" size="sm" color="#fff">
          {icon ? `${icon} ${label}` : label}
        </PixelText>
      </RNAnimated.View>
    </Pressable>
  );
}

// ============================================
// AmountChip
// ============================================

function AmountChip({
  amount,
  selected,
  onPress,
}: {
  amount: number;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new RNAnimated.Value(1)).current;

  const handlePress = () => {
    haptic('selection');
    playSound('amount_tick');
    RNAnimated.sequence([
      RNAnimated.timing(scale, { toValue: 0.9, duration: 60, useNativeDriver: true }),
      RNAnimated.spring(scale, { toValue: 1, damping: 12, stiffness: 200, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.amountChipWrap}>
      <RNAnimated.View
        style={[
          styles.amountChip,
          selected && styles.amountChipSelected,
          { transform: [{ scale }] },
        ]}
      >
        <PixelText
          variant="heading"
          size="sm"
          color={selected ? colors.game.gold : colors.textSecondary}
        >
          ${amount}
        </PixelText>
      </RNAnimated.View>
    </Pressable>
  );
}

// ============================================
// BetModal (accepts explicit outcome)
// ============================================

function BetModal({
  visible,
  direction,
  market,
  outcome,
  onClose,
}: {
  visible: boolean;
  direction: BetDirection;
  market: ExploreMarket;
  outcome: ExploreOutcome;
  onClose: () => void;
}) {
  const { publicKey, connected, connecting, connect, signTransaction } = useWallet();
  const { addPendingBet } = useExploreStore();
  const [selectedAmount, setSelectedAmount] = useState<Amount>(5);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');

  const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;
  const ctaTranslateY = useRef(new RNAnimated.Value(0)).current;

  const isYes = direction === 'yes';
  const accentColor = isYes ? '#22c55e' : '#ef4444';
  const accentDark = isYes ? '#15803d' : '#b91c1c';
  const probability = Math.round(outcome.probability * 100);

  useEffect(() => {
    if (visible) {
      playSound('nav_tick');
      RNAnimated.parallel([
        RNAnimated.spring(slideAnim, {
          toValue: 0,
          damping: 22,
          stiffness: 180,
          useNativeDriver: true,
        }),
        RNAnimated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      RNAnimated.parallel([
        RNAnimated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        RNAnimated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  const handleClose = useCallback(() => {
    haptic('light');
    playSound('modal_close');
    RNAnimated.parallel([
      RNAnimated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      RNAnimated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPurchaseState('idle');
      onClose();
    });
  }, [slideAnim, backdropOpacity, onClose]);

  const handleConnectAndBuy = useCallback(async () => {
    haptic('medium');

    if (!connected) {
      try {
        await connect();
      } catch (error) {
        console.error('Wallet connection failed:', error);
        haptic('error');
        return;
      }
      return;
    }

    if (!publicKey) return;

    setPurchaseState('processing');

    try {
      const amountInBaseUnits = selectedAmount * 1_000_000;
      const { transaction, blockhash, lastValidBlockHeight } =
        await buildUsdcTransferTransaction(publicKey, amountInBaseUnits);

      const signedTransaction = await signTransaction(transaction);
      const signature = await sendAndConfirmTransfer(
        signedTransaction,
        blockhash,
        lastValidBlockHeight,
      );

      console.log('Bet placed! Signature:', signature);

      addPendingBet({
        marketId: market.id,
        outcomeId: outcome.id,
        outcomeLabel: outcome.label,
        probability: outcome.probability,
        direction,
        amount: selectedAmount,
      });

      setPurchaseState('success');
      haptic('success');
      playSound('purchase_confirm');
      handleClose();
    } catch (error: any) {
      console.error('Purchase failed:', error);
      setPurchaseState('error');
      haptic('error');
      const message = error?.message?.includes('insufficient')
        ? 'Insufficient USDC balance. Please fund your wallet and try again.'
        : error?.message?.includes('User rejected')
          ? 'Transaction was cancelled.'
          : 'Purchase failed. Please try again.';

      Alert.alert('Purchase Failed', message);
      setPurchaseState('idle');
    }
  }, [
    connected, connect, publicKey, outcome, selectedAmount,
    signTransaction, addPendingBet, market.id, direction, handleClose,
  ]);

  const handleCtaPressIn = () => {
    RNAnimated.timing(ctaTranslateY, { toValue: 4, duration: 50, useNativeDriver: true }).start();
  };
  const handleCtaPressOut = () => {
    RNAnimated.timing(ctaTranslateY, { toValue: 0, duration: 80, useNativeDriver: true }).start();
  };

  const isProcessing = purchaseState === 'processing';
  const ctaLabel = !connected
    ? `Connect & Buy $${selectedAmount}`
    : isProcessing
      ? 'Processing...'
      : `Buy ${isYes ? 'Yes' : 'No'} $${selectedAmount}`;

  const ctaShadowTranslateY = ctaTranslateY.interpolate({
    inputRange: [0, 4],
    outputRange: [4, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <RNAnimated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </RNAnimated.View>

      <RNAnimated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.modalHeader}>
          <PixelText variant="heading" size="lg" color={accentColor}>
            BUY {isYes ? 'YES' : 'NO'}
          </PixelText>
          <TouchableOpacity onPress={handleClose} style={styles.modalCloseBtn}>
            <PixelText variant="heading" size="sm" color={colors.textMuted}>X</PixelText>
          </TouchableOpacity>
        </View>

        {market.image_url && (
          <View style={styles.modalImageWrap}>
            <Image source={{ uri: market.image_url }} style={styles.modalImage} resizeMode="cover" />
          </View>
        )}

        <View style={styles.modalOutcomeRow}>
          <View style={[styles.modalOutcomeDot, { backgroundColor: accentColor }]} />
          <PixelText variant="body" size="xl" color={colors.foreground} numberOfLines={1}>
            {outcome.label}
          </PixelText>
          <PixelText variant="heading" size="xl" color={accentColor}>
            {probability}%
          </PixelText>
        </View>

        {!connected && (
          <Pressable
            onPress={async () => { haptic('medium'); try { await connect(); } catch { haptic('error'); } }}
            style={styles.connectWalletBtn}
            disabled={connecting}
          >
            <View style={styles.connectWalletShadow} />
            <View style={styles.connectWalletFace}>
              <PixelText variant="heading" size="xs" color={colors.white}>
                {connecting ? 'CONNECTING...' : 'CONNECT WALLET'}
              </PixelText>
            </View>
          </Pressable>
        )}

        {connected && publicKey && (
          <View style={styles.walletConnectedRow}>
            <View style={styles.walletDot} />
            <PixelText variant="body" size="base" color={colors.textMuted}>
              {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
            </PixelText>
          </View>
        )}

        <View style={styles.amountSection}>
          <PixelText variant="heading" size="xs" color={colors.textMuted} uppercase>
            Select amount (USDC)
          </PixelText>
          <View style={styles.amountRow}>
            {AMOUNTS.map((amt) => (
              <AmountChip key={amt} amount={amt} selected={selectedAmount === amt} onPress={() => setSelectedAmount(amt)} />
            ))}
          </View>
        </View>

        <View style={styles.modalBottomRow}>
          <Pressable onPress={handleClose} style={styles.cancelBtn}>
            <PixelText variant="body" size="lg" color={colors.textMuted}>Cancel</PixelText>
          </Pressable>
          <View style={styles.ctaWrap}>
            <RNAnimated.View style={{ transform: [{ translateY: ctaTranslateY }] }}>
              <RNAnimated.View
                style={[styles.ctaShadow, { backgroundColor: connected ? accentDark : '#5b21b6', transform: [{ translateY: ctaShadowTranslateY }] }]}
              />
              <Pressable
                onPress={handleConnectAndBuy}
                onPressIn={handleCtaPressIn}
                onPressOut={handleCtaPressOut}
                disabled={isProcessing}
                style={[styles.ctaButton, { backgroundColor: connected ? accentColor : '#7c3aed', opacity: isProcessing ? 0.6 : 1 }]}
              >
                <PixelText variant="heading" size="xs" color={colors.white} numberOfLines={1}>
                  {ctaLabel}
                </PixelText>
              </Pressable>
            </RNAnimated.View>
          </View>
        </View>
      </RNAnimated.View>
    </Modal>
  );
}

// ============================================
// EventDetailScreen — Tinder-style swipe with gestures
// ============================================

export function EventDetailScreen() {
  const navigation = useNavigation<EventDetailNav>();
  const route = useRoute<EventDetailRoute>();
  const { eventId, swipeMode } = route.params;

  const {
    markets,
    currentOutcomeIndex,
    swipeModeEventIds,
    currentEventIndex,
    pendingBets,
    selectEvent,
    nextOutcome,
    nextEvent,
    setOutcomeIndex,
  } = useExploreStore();

  const [market, setMarket] = useState<ExploreMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [betDirection, setBetDirection] = useState<BetDirection>('yes');

  // Reanimated shared values for gesture
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const isExiting = useSharedValue(false);

  // Wrapper for playSound callable via runOnJS in gesture worklet
  const playSoundJS = useCallback((name: string) => playSound(name as SoundName), []);

  // Current outcome
  const currentOutcome = market?.outcomes[currentOutcomeIndex] ?? null;
  const totalOutcomes = market?.outcomes.length ?? 0;
  const isLastOutcome = currentOutcomeIndex >= totalOutcomes - 1;
  const isLastEvent = currentEventIndex >= swipeModeEventIds.length - 1;

  // Betted indices for dots
  const bettedIndices = market
    ? market.outcomes
        .map((o, i) => (pendingBets.some((b) => b.marketId === market.id && b.outcomeId === o.id) ? i : -1))
        .filter((i) => i >= 0)
    : [];

  // ---- Load initial event ----
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      setImageError(false);
      try {
        const data = await getMarketById(eventId);
        if (data) {
          setMarket(data);
          selectEvent(data);
        } else {
          setError('Market not found');
        }
      } catch {
        setError('Failed to load market');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, selectEvent]);

  // ---- Sync from store when advancing events ----
  const selectedEvent = useExploreStore((s) => s.selectedEvent);
  useEffect(() => {
    if (selectedEvent && selectedEvent.id !== market?.id) {
      setMarket(selectedEvent);
      setImageError(false);
      // Reset card position for new event
      translateX.value = 0;
      translateY.value = 0;
      cardOpacity.value = 1;
      isExiting.value = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent?.id]);

  // Reset card for new outcome
  const resetCard = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
    cardOpacity.value = 1;
    isExiting.value = false;
  }, [translateX, translateY, cardOpacity, isExiting]);

  // ---- Advance to next outcome/event ----
  const advanceAfterSwipe = useCallback(() => {
    if (!market) return;

    if (isLastOutcome) {
      if (swipeMode && !isLastEvent) {
        nextEvent();
        // resetCard will be called by the selectedEvent effect
      } else {
        navigation.goBack();
      }
    } else {
      nextOutcome();
      resetCard();
    }
  }, [market, isLastOutcome, isLastEvent, swipeMode, nextOutcome, nextEvent, navigation, resetCard]);

  // ---- Open BetModal ----
  const openBetModal = useCallback((direction: BetDirection) => {
    haptic('heavy');
    setBetDirection(direction);
    setModalVisible(true);
    // Reset card position (user stays on this outcome after modal)
    resetCard();
  }, [resetCard]);

  // ---- Pan gesture (swipe right=YES, left=NO, down=PASS) ----
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (isExiting.value) return;
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (isExiting.value) return;

      const absX = Math.abs(e.translationX);
      const absY = e.translationY; // positive = down
      const velX = Math.abs(e.velocityX);
      const velY = Math.abs(e.velocityY);

      const passedX = absX > SWIPE_X_THRESHOLD || velX > VELOCITY_THRESHOLD;
      const passedY = absY > SWIPE_Y_THRESHOLD || velY > VELOCITY_THRESHOLD;

      // PASS — swipe down
      if (passedY && e.translationY > 0 && absX < SWIPE_X_THRESHOLD) {
        isExiting.value = true;
        translateY.value = withTiming(EXIT_Y, { duration: EXIT_DURATION });
        cardOpacity.value = withTiming(0, { duration: EXIT_DURATION }, () => {
          runOnJS(haptic)('medium');
          runOnJS(playSoundJS)('carousel_slide');
          runOnJS(advanceAfterSwipe)();
        });
        return;
      }

      // Horizontal swipe
      if (absX > Math.abs(e.translationY)) {
        if (passedX) {
          isExiting.value = true;
          if (e.translationX > 0) {
            // Swipe RIGHT → YES
            translateX.value = withTiming(EXIT_X, { duration: EXIT_DURATION });
            cardOpacity.value = withTiming(0, { duration: EXIT_DURATION }, () => {
              runOnJS(playSoundJS)('focus_pop');
              runOnJS(openBetModal)('yes');
            });
          } else {
            // Swipe LEFT → NO
            translateX.value = withTiming(-EXIT_X, { duration: EXIT_DURATION });
            cardOpacity.value = withTiming(0, { duration: EXIT_DURATION }, () => {
              runOnJS(playSoundJS)('focus_pop');
              runOnJS(openBetModal)('no');
            });
          }
          return;
        }
      }

      // Spring back
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  // ---- Animated styles ----
  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-MAX_ROTATION, 0, MAX_ROTATION],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
      ],
      opacity: cardOpacity.value,
    };
  });

  // YES overlay (swipe right)
  const overlayYesStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_X_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // NO overlay (swipe left)
  const overlayNoStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, -SWIPE_X_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // PASS overlay (swipe down)
  const overlayPassStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, SWIPE_Y_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // ---- Button handlers (fallback for non-gesture) ----
  const handleYes = useCallback(() => { playSound('focus_pop'); openBetModal('yes'); }, [openBetModal]);
  const handleNo = useCallback(() => { playSound('focus_pop'); openBetModal('no'); }, [openBetModal]);
  const handlePass = useCallback(() => {
    haptic('medium');
    playSound('carousel_slide');
    advanceAfterSwipe();
  }, [advanceAfterSwipe]);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ---- Resolve image for current outcome ----
  const outcomeImageUrl = currentOutcome && market
    ? resolveOutcomeImage(currentOutcome, market)
    : null;
  const hasValidImage = !!outcomeImageUrl && !imageError;
  const probability = currentOutcome ? Math.round(currentOutcome.probability * 100) : 0;

  // ---- Loading ----
  if (loading) {
    return (
      <ScreenContainer>
        <GameBackground />
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <PixelText variant="heading" size="sm" color={colors.foreground}>{'<'}</PixelText>
          </TouchableOpacity>
          <PixelText variant="heading" size="sm" uppercase>Loading...</PixelText>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContainer}>
          <LoadingSpinner label="Loading market..." />
        </View>
      </ScreenContainer>
    );
  }

  // ---- Error ----
  if (error || !market) {
    return (
      <ScreenContainer>
        <GameBackground />
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <PixelText variant="heading" size="sm" color={colors.foreground}>{'<'}</PixelText>
          </TouchableOpacity>
          <PixelText variant="heading" size="sm" uppercase>Error</PixelText>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContainer}>
          <PixelText variant="body" size="lg" color={colors.textMuted}>
            {error || 'Market not found'}
          </PixelText>
          <Pressable onPress={handleBack} style={styles.errorBackBtn}>
            <PixelText variant="body" size="lg" color={colors.foreground}>Go Back</PixelText>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // ---- No outcomes ----
  if (!currentOutcome || totalOutcomes === 0) {
    return (
      <ScreenContainer>
        <GameBackground />
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <PixelText variant="heading" size="sm" color={colors.foreground}>{'<'}</PixelText>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <PixelText variant="body" size="sm" color={colors.foreground}>{market.category.toUpperCase()}</PixelText>
          </View>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContainer}>
          <PixelText variant="body" size="lg" color={colors.textMuted}>No outcomes available</PixelText>
          <Pressable onPress={handleBack} style={styles.errorBackBtn}>
            <PixelText variant="body" size="lg" color={colors.foreground}>Go Back</PixelText>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <GameBackground />

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <PixelText variant="heading" size="sm" color={colors.foreground}>{'<'}</PixelText>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <PixelText variant="body" size="xs" color={colors.textMuted} uppercase>
            {market.category}
          </PixelText>
          <PixelText variant="body" size="sm" color={colors.foreground} numberOfLines={1}>
            {market.title}
          </PixelText>
        </View>
        {totalOutcomes > 1 && (
          <View style={styles.counterBadge}>
            <PixelText variant="heading" size="xs" color={colors.game.gold}>
              {currentOutcomeIndex + 1}
            </PixelText>
            <PixelText variant="body" size="xs" color={colors.textMuted}>
              {' / '}{totalOutcomes}
            </PixelText>
          </View>
        )}
        <Pressable onPress={handleBack} style={styles.backTextBtn}>
          <PixelText variant="heading" size="sm" color={colors.textMuted}>Back</PixelText>
        </Pressable>
      </View>

      {/* Swipeable Card */}
      <View style={styles.cardContainer}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, cardAnimatedStyle]}>
            {/* === YES Overlay === */}
            <Animated.View style={[styles.overlay, styles.overlayYes, overlayYesStyle]}>
              <View style={styles.overlayLabelContainer}>
                <PixelText variant="heading" size="2xl" color={colors.white} style={styles.overlayLabelYes}>
                  YES
                </PixelText>
              </View>
            </Animated.View>

            {/* === NO Overlay === */}
            <Animated.View style={[styles.overlay, styles.overlayNo, overlayNoStyle]}>
              <View style={styles.overlayLabelContainer}>
                <PixelText variant="heading" size="2xl" color={colors.white} style={styles.overlayLabelNo}>
                  NO
                </PixelText>
              </View>
            </Animated.View>

            {/* === PASS Overlay === */}
            <Animated.View style={[styles.overlay, styles.overlayPass, overlayPassStyle]}>
              <View style={styles.overlayLabelContainer}>
                <PixelText variant="heading" size="2xl" color={colors.white}>
                  PASS
                </PixelText>
              </View>
            </Animated.View>

            {/* === Card Image === */}
            <View style={styles.cardImageArea}>
              {hasValidImage ? (
                <Image
                  source={{ uri: outcomeImageUrl! }}
                  style={styles.cardImage}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <View style={styles.cardImagePlaceholder}>
                  <PixelText variant="heading" size="3xl" color={colors.textMuted}>
                    {getCategoryEmoji(market.category)}
                  </PixelText>
                </View>
              )}

              {/* Category badge */}
              <View style={styles.cardBadgeRow}>
                <View style={styles.categoryBadge}>
                  <PixelText variant="heading" size="xs" color={colors.white} uppercase>
                    {market.subcategory || market.category}
                  </PixelText>
                </View>
                {market.status === 'active' && (
                  <View style={styles.liveBadge}>
                    <PixelText variant="heading" size="xs" color={colors.game.success} uppercase>
                      LIVE
                    </PixelText>
                  </View>
                )}
              </View>
            </View>

            {/* === Card Info (outcome) === */}
            <View style={styles.cardInfo}>
              <PixelText
                variant="body"
                size="xl"
                color={colors.foreground}
                numberOfLines={2}
                style={styles.cardTitle}
              >
                {market.title}
              </PixelText>

              <View style={styles.divider} />

              {/* Outcome row */}
              <View style={styles.outcomeRow}>
                <View style={styles.outcomeLabel}>
                  <View style={styles.outcomeDot} />
                  <PixelText variant="body" size="xl" color={colors.foreground} numberOfLines={1}>
                    {currentOutcome.label}
                  </PixelText>
                </View>
                <PixelText variant="heading" size="2xl" color={colors.game.gold}>
                  {probability}%
                </PixelText>
              </View>

              {/* Volume */}
              {market.volume > 0 && (
                <View style={styles.volumeRow}>
                  <PixelText variant="body" size="sm" color={colors.textMuted}>
                    Vol: ${market.volume >= 1_000_000
                      ? `${(market.volume / 1_000_000).toFixed(1)}M`
                      : market.volume >= 1_000
                        ? `${(market.volume / 1_000).toFixed(1)}K`
                        : market.volume.toLocaleString()}
                  </PixelText>
                </View>
              )}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Outcome dots */}
      {totalOutcomes > 1 && (
        <View style={styles.dotsContainer}>
          <OutcomeDots
            total={totalOutcomes}
            current={currentOutcomeIndex}
            bettedIndices={bettedIndices}
          />
        </View>
      )}

      {/* Action buttons row */}
      <View style={styles.actionsRow}>
        <ActionButton
          label="NO"
          icon={'\u2190'}
          color="#ef4444"
          shadowColor="#b91c1c"
          onPress={handleNo}
        />
        <ActionButton
          label="PASS"
          icon={'\u2193'}
          color="#6b7280"
          shadowColor="#4b5563"
          onPress={handlePass}
        />
        <ActionButton
          label="YES"
          icon={'\u2192'}
          color="#22c55e"
          shadowColor="#15803d"
          onPress={handleYes}
        />
      </View>

      {/* Bet modal */}
      {currentOutcome && (
        <BetModal
          visible={modalVisible}
          direction={betDirection}
          market={market}
          outcome={currentOutcome}
          onClose={handleCloseModal}
        />
      )}
    </ScreenContainer>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    zIndex: 10,
    gap: spacing[2],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTextBtn: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  errorBackBtn: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.card.bg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.card.border,
  },

  // Card
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  card: {
    width: CARD_WIDTH,
    maxHeight: CARD_HEIGHT,
    backgroundColor: '#151528',
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.card.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },

  // Swipe overlays
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
  },
  overlayYes: {
    backgroundColor: 'rgba(34, 197, 94, 0.6)',
  },
  overlayNo: {
    backgroundColor: 'rgba(239, 68, 68, 0.6)',
  },
  overlayPass: {
    backgroundColor: 'rgba(107, 114, 128, 0.6)',
  },
  overlayLabelContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayLabelYes: {
    transform: [{ rotate: `${OVERLAY_ROTATION}deg` }],
  },
  overlayLabelNo: {
    transform: [{ rotate: `${-OVERLAY_ROTATION}deg` }],
  },

  // Card image
  cardImageArea: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.game.secondary,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.game.primary,
  },
  cardBadgeRow: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  liveBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.game.success + '60',
  },

  // Card info
  cardInfo: {
    padding: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: '#151528',
    gap: spacing[2],
  },
  cardTitle: {
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a4a',
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  outcomeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  outcomeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.game.gold,
  },
  volumeRow: {
    alignItems: 'center',
  },

  // Dots
  dotsContainer: {
    paddingVertical: spacing[2],
    alignItems: 'center',
  },

  // Action buttons
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
  },
  actionButtonWrap: {
    flex: 1,
    height: 52,
    position: 'relative',
  },
  actionButtonShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: -4,
    borderRadius: borderRadius.lg,
  },
  actionButtonFace: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },

  // Modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f0f23',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.card.border,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md,
  },
  modalImageWrap: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing[3],
    backgroundColor: colors.game.secondary,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalOutcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  modalOutcomeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectWalletBtn: {
    height: 48,
    position: 'relative',
    marginBottom: spacing[4],
  },
  connectWalletShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: -4,
    borderRadius: borderRadius.lg,
    backgroundColor: '#5b21b6',
  },
  connectWalletFace: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: '#7c3aed',
  },
  walletConnectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  amountSection: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  amountRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  amountChipWrap: {
    flex: 1,
  },
  amountChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    backgroundColor: '#1a1a32',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.card.border,
  },
  amountChipSelected: {
    borderColor: colors.game.gold,
    backgroundColor: '#1f1f3a',
  },
  modalBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  cancelBtn: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.card.border,
  },
  ctaWrap: {
    flex: 1,
    height: 48,
  },
  ctaShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    height: 4,
    borderRadius: borderRadius.lg,
  },
  ctaButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
  },
});
