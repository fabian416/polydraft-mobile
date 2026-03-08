import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { GameBackground } from '../components/game/GameBackground';
import { PixelText } from '../components/common';
import { ProbabilityBar } from '../components/explore/ProbabilityBar';
import { LoadingSpinner } from '../components/common';
import { useExploreStore } from '../stores/explore';
import { useWallet } from '../providers/WalletProvider';
import { getMarketById } from '../lib/api/ExploreService';
import { haptic } from '../lib/haptics';
import { buildUsdcTransferTransaction, sendAndConfirmTransfer } from '../lib/solana/transfer';
import { colors, spacing, borderRadius } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';
import type { ExploreMarket } from '../types';

type EventDetailRoute = RouteProp<RootStackParamList, 'EventDetail'>;
type EventDetailNav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing[4] * 2;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.62;

const AMOUNTS = [2, 5, 10, 25] as const;
type Amount = (typeof AMOUNTS)[number];

type BetDirection = 'yes' | 'no';
type PurchaseState = 'idle' | 'processing' | 'success' | 'error';

// ============================================
// ActionButton (YES / NO / PASS with pixel shadow)
// ============================================

function ActionButton({
  label,
  color,
  shadowColor,
  onPress,
}: {
  label: string;
  color: string;
  shadowColor: string;
  onPress: () => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    haptic('light');
    Animated.timing(translateY, {
      toValue: 4,
      duration: 50,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(translateY, {
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
      {/* Shadow layer */}
      <View style={[styles.actionButtonShadow, { backgroundColor: shadowColor }]} />
      {/* Button face */}
      <Animated.View
        style={[
          styles.actionButtonFace,
          { backgroundColor: color, transform: [{ translateY }] },
        ]}
      >
        <PixelText variant="heading" size="sm" color="#fff">
          {label}
        </PixelText>
      </Animated.View>
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
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    haptic('selection');
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 60, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 200, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.amountChipWrap}>
      <Animated.View
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
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// BetModal
// ============================================

function BetModal({
  visible,
  direction,
  market,
  onClose,
}: {
  visible: boolean;
  direction: BetDirection;
  market: ExploreMarket;
  onClose: () => void;
}) {
  const { publicKey, connected, connecting, connect, signTransaction } = useWallet();
  const { addPendingBet } = useExploreStore();
  const [selectedAmount, setSelectedAmount] = useState<Amount>(5);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Button press animation
  const ctaTranslateY = useRef(new Animated.Value(0)).current;

  const isYes = direction === 'yes';
  const accentColor = isYes ? '#22c55e' : '#ef4444';
  const accentDark = isYes ? '#15803d' : '#b91c1c';

  const outcomeA = market.outcomes[0];
  const outcomeB = market.outcomes[1];
  const outcome = isYes ? outcomeA : outcomeB;
  const probability = outcome ? Math.round(outcome.probability * 100) : 50;

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 22,
          stiffness: 180,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  const handleClose = useCallback(() => {
    haptic('light');
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
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

    if (!publicKey || !outcome) return;

    setPurchaseState('processing');

    try {
      const amountInBaseUnits = selectedAmount * 1_000_000; // USDC has 6 decimals
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
    connected,
    connect,
    publicKey,
    outcome,
    selectedAmount,
    signTransaction,
    addPendingBet,
    market.id,
    direction,
    handleClose,
  ]);

  const handleCtaPressIn = () => {
    Animated.timing(ctaTranslateY, {
      toValue: 4,
      duration: 50,
      useNativeDriver: true,
    }).start();
  };

  const handleCtaPressOut = () => {
    Animated.timing(ctaTranslateY, {
      toValue: 0,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  const isProcessing = purchaseState === 'processing';
  const ctaLabel = !connected
    ? `Connect & Buy $${selectedAmount}`
    : isProcessing
      ? 'Processing...'
      : `Buy ${isYes ? 'Yes' : 'No'} $${selectedAmount}`;

  // CTA shadow shrink
  const ctaShadowTranslateY = ctaTranslateY.interpolate({
    inputRange: [0, 4],
    outputRange: [4, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <PixelText variant="heading" size="lg" color={accentColor}>
            BUY {isYes ? 'YES' : 'NO'}
          </PixelText>
          <TouchableOpacity onPress={handleClose} style={styles.modalCloseBtn}>
            <PixelText variant="heading" size="sm" color={colors.textMuted}>
              X
            </PixelText>
          </TouchableOpacity>
        </View>

        {/* Event image compact */}
        {market.image_url && (
          <View style={styles.modalImageWrap}>
            <Image
              source={{ uri: market.image_url }}
              style={styles.modalImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Outcome + probability */}
        <View style={styles.modalOutcomeRow}>
          <View style={[styles.modalOutcomeDot, { backgroundColor: accentColor }]} />
          <PixelText variant="body" size="xl" color={colors.foreground} numberOfLines={1}>
            {outcome?.label ?? (isYes ? 'Yes' : 'No')}
          </PixelText>
          <PixelText variant="heading" size="xl" color={accentColor}>
            {probability}%
          </PixelText>
        </View>

        {/* Connect Wallet button (only when not connected) */}
        {!connected && (
          <Pressable
            onPress={async () => {
              haptic('medium');
              try {
                await connect();
              } catch {
                haptic('error');
              }
            }}
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

        {/* Connected wallet indicator */}
        {connected && publicKey && (
          <View style={styles.walletConnectedRow}>
            <View style={styles.walletDot} />
            <PixelText variant="body" size="base" color={colors.textMuted}>
              {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
            </PixelText>
          </View>
        )}

        {/* Amount selector */}
        <View style={styles.amountSection}>
          <PixelText variant="heading" size="xs" color={colors.textMuted} uppercase>
            Select amount (USDC)
          </PixelText>
          <View style={styles.amountRow}>
            {AMOUNTS.map((amt) => (
              <AmountChip
                key={amt}
                amount={amt}
                selected={selectedAmount === amt}
                onPress={() => setSelectedAmount(amt)}
              />
            ))}
          </View>
        </View>

        {/* Bottom buttons */}
        <View style={styles.modalBottomRow}>
          {/* Cancel */}
          <Pressable onPress={handleClose} style={styles.cancelBtn}>
            <PixelText variant="body" size="lg" color={colors.textMuted}>
              Cancel
            </PixelText>
          </Pressable>

          {/* CTA */}
          <View style={styles.ctaWrap}>
            <Animated.View style={{ transform: [{ translateY: ctaTranslateY }] }}>
              <Animated.View
                style={[
                  styles.ctaShadow,
                  {
                    backgroundColor: connected ? accentDark : '#5b21b6',
                    transform: [{ translateY: ctaShadowTranslateY }],
                  },
                ]}
              />
              <Pressable
                onPress={handleConnectAndBuy}
                onPressIn={handleCtaPressIn}
                onPressOut={handleCtaPressOut}
                disabled={isProcessing}
                style={[
                  styles.ctaButton,
                  {
                    backgroundColor: connected ? accentColor : '#7c3aed',
                    opacity: isProcessing ? 0.6 : 1,
                  },
                ]}
              >
                <PixelText variant="heading" size="xs" color={colors.white} numberOfLines={1}>
                  {ctaLabel}
                </PixelText>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ============================================
// Helpers
// ============================================

function getCategoryEmoji(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('sport')) return '(ball)';
  if (lower.includes('politic')) return '(vote)';
  if (lower.includes('crypto')) return '(btc)';
  if (lower.includes('econ')) return '(chart)';
  if (lower.includes('entertain')) return '(film)';
  return '(mkt)';
}

// ============================================
// EventDetailScreen
// ============================================

export function EventDetailScreen() {
  const navigation = useNavigation<EventDetailNav>();
  const route = useRoute<EventDetailRoute>();
  const { eventId } = route.params;
  const { selectEvent } = useExploreStore();

  const [market, setMarket] = useState<ExploreMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [betDirection, setBetDirection] = useState<BetDirection>('yes');

  // Card entrance animation
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
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
    return () => selectEvent(null);
  }, [eventId, selectEvent]);

  // Animate card in when market loads
  useEffect(() => {
    if (market) {
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          damping: 16,
          stiffness: 140,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [market, cardScale, cardOpacity]);

  const handleYes = useCallback(() => {
    haptic('heavy');
    setBetDirection('yes');
    setModalVisible(true);
  }, []);

  const handleNo = useCallback(() => {
    haptic('heavy');
    setBetDirection('no');
    setModalVisible(true);
  }, []);

  const handlePass = useCallback(() => {
    haptic('medium');
    navigation.goBack();
  }, [navigation]);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  // Loading
  if (loading) {
    return (
      <ScreenContainer>
        <GameBackground />
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <PixelText variant="heading" size="sm" color={colors.foreground}>
              {'<'}
            </PixelText>
          </TouchableOpacity>
          <PixelText variant="heading" size="sm" uppercase>
            Loading...
          </PixelText>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContainer}>
          <LoadingSpinner label="Loading market..." />
        </View>
      </ScreenContainer>
    );
  }

  // Error
  if (error || !market) {
    return (
      <ScreenContainer>
        <GameBackground />
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <PixelText variant="heading" size="sm" color={colors.foreground}>
              {'<'}
            </PixelText>
          </TouchableOpacity>
          <PixelText variant="heading" size="sm" uppercase>
            Error
          </PixelText>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContainer}>
          <PixelText variant="body" size="lg" color={colors.textMuted}>
            {error || 'Market not found'}
          </PixelText>
          <Pressable onPress={() => navigation.goBack()} style={styles.errorBackBtn}>
            <PixelText variant="body" size="lg" color={colors.foreground}>
              Go Back
            </PixelText>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const outcomeA = market.outcomes[0];
  const outcomeB = market.outcomes[1];
  const hasValidImage = !!market.image_url && !imageError;

  return (
    <ScreenContainer>
      <GameBackground />

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <PixelText variant="heading" size="sm" color={colors.foreground}>
            {'<'}
          </PixelText>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <PixelText variant="body" size="sm" color={colors.foreground} numberOfLines={1}>
            {market.category.toUpperCase()}
          </PixelText>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Card */}
      <View style={styles.cardContainer}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: cardScale }], opacity: cardOpacity },
          ]}
        >
          {/* Image area */}
          <View style={styles.cardImageArea}>
            {hasValidImage ? (
              <Image
                source={{ uri: market.image_url! }}
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
            {/* Category badge overlay */}
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

          {/* Info section */}
          <View style={styles.cardInfo}>
            <PixelText
              variant="body"
              size="xl"
              color={colors.foreground}
              numberOfLines={3}
              style={styles.cardTitle}
            >
              {market.title}
            </PixelText>

            {/* Probability bar */}
            {outcomeA && outcomeB && (
              <View style={styles.cardProbability}>
                <ProbabilityBar
                  probabilityA={outcomeA.probability}
                  probabilityB={outcomeB.probability}
                  labelA={outcomeA.label}
                  labelB={outcomeB.label}
                  height={10}
                  showLabels
                />
              </View>
            )}

            {/* Volume */}
            {market.volume > 0 && (
              <View style={styles.cardVolume}>
                <PixelText variant="body" size="sm" color={colors.textMuted}>
                  Vol: ${market.volume.toLocaleString()}
                </PixelText>
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      {/* Action buttons row */}
      <View style={styles.actionsRow}>
        <ActionButton
          label="NO"
          color="#ef4444"
          shadowColor="#b91c1c"
          onPress={handleNo}
        />
        <ActionButton
          label="PASS"
          color="#6b7280"
          shadowColor="#4b5563"
          onPress={handlePass}
        />
        <ActionButton
          label="YES"
          color="#22c55e"
          shadowColor="#15803d"
          onPress={handleYes}
        />
      </View>

      {/* Bet modal */}
      <BetModal
        visible={modalVisible}
        direction={betDirection}
        market={market}
        onClose={handleCloseModal}
      />
    </ScreenContainer>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  // Center (loading/error)
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

  // Card container
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
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  cardProbability: {
    marginBottom: spacing[2],
  },
  cardVolume: {
    alignItems: 'center',
  },

  // Action buttons row
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
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

  // Modal image
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

  // Modal outcome
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

  // Connect wallet
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

  // Connected wallet row
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

  // Amount selector
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

  // Modal bottom
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
