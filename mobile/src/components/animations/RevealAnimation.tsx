import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { UserPick, Event } from '../../types';
import { colors, fonts, fontSize, spacing, borderRadius, borderWidth } from '../../lib/theme';
import { Confetti, VictoryConfetti } from './Confetti';
import { GoldCoinBurst, TrophyBurst } from './CoinBurst';

interface RevealAnimationProps {
  pick: UserPick & { event: Event };
  onComplete: () => void;
}

type Phase = 'anticipation' | 'burst' | 'reveal' | 'celebration' | 'points';

const CONSOLATION_MESSAGES = [
  { text: 'So close!', symbol: '>' },
  { text: 'Next time!', symbol: '^' },
  { text: 'Keep going!', symbol: '>' },
  { text: 'Almost had it!', symbol: '~' },
  { text: "You'll get 'em!", symbol: '*' },
];

/**
 * Animated point counter that counts up from 0 to target.
 */
function AnimatedCounter({
  target,
  duration = 1500,
  decimals = 1,
  onComplete,
}: {
  target: number;
  duration?: number;
  decimals?: number;
  onComplete?: () => void;
}) {
  const [count, setCount] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(eased * target);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onCompleteRef.current?.();
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return <Text style={styles.counterText}>+${count.toFixed(decimals)}</Text>;
}

export function RevealAnimation({ pick, onComplete }: RevealAnimationProps) {
  const [phase, setPhase] = useState<Phase>('anticipation');
  const [canSkip, setCanSkip] = useState(false);
  const onCompleteRef = useRef(onComplete);

  // Animated values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const chestScale = useRef(new Animated.Value(1)).current;
  const chestRotate = useRef(new Animated.Value(0)).current;
  const cardFlip = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const pickedLabel =
    pick.picked_outcome === 'a'
      ? pick.event.outcome_a_label
      : pick.picked_outcome === 'b'
        ? pick.event.outcome_b_label
        : pick.event.outcome_draw_label || 'Draw';

  const winningOutcome = pick.event.winning_outcome;
  const winnerLabel = winningOutcome
    ? (winningOutcome === 'a'
        ? pick.event.outcome_a_label
        : winningOutcome === 'b'
          ? pick.event.outcome_b_label
          : pick.event.outcome_draw_label || 'Draw')
    : 'Unknown';

  const isWin = pick.is_correct === true;
  const consolation =
    CONSOLATION_MESSAGES[Math.floor(Math.random() * CONSOLATION_MESSAGES.length)];

  // Entry animation
  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [overlayOpacity]);

  // Anticipation trembling
  useEffect(() => {
    if (phase !== 'anticipation') return;

    const tremble = Animated.loop(
      Animated.sequence([
        Animated.timing(chestRotate, {
          toValue: 1,
          duration: 75,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(chestRotate, {
          toValue: -1,
          duration: 75,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(chestRotate, {
          toValue: 0,
          duration: 75,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    tremble.start();
    return () => tremble.stop();
  }, [phase, chestRotate]);

  // Burst animation
  useEffect(() => {
    if (phase !== 'burst') return;

    Animated.parallel([
      Animated.timing(chestScale, {
        toValue: 0,
        duration: 600,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [phase, chestScale]);

  // Reveal card flip
  useEffect(() => {
    if (phase !== 'reveal') return;

    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        stiffness: 200,
        damping: 20,
        useNativeDriver: true,
      }),
      Animated.timing(cardFlip, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [phase, cardScale, cardFlip]);

  // Phase timing
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setCanSkip(true), 1500));

    if (isWin) {
      timers.push(setTimeout(() => setPhase('burst'), 1200));
      timers.push(setTimeout(() => setPhase('reveal'), 2000));
      timers.push(setTimeout(() => setPhase('celebration'), 3500));
      timers.push(setTimeout(() => setPhase('points'), 5500));
      timers.push(setTimeout(() => onCompleteRef.current(), 7000));
    } else {
      timers.push(setTimeout(() => setPhase('burst'), 1200));
      timers.push(setTimeout(() => setPhase('reveal'), 2000));
      timers.push(setTimeout(() => setPhase('celebration'), 3500));
      timers.push(setTimeout(() => onCompleteRef.current(), 4500));
    }

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkip = useCallback(() => {
    if (canSkip) {
      onCompleteRef.current();
    }
  }, [canSkip]);

  const rotateInterpolation = chestRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-4deg', '0deg', '4deg'],
  });

  const flipInterpolation = cardFlip.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg'],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
      <Pressable style={styles.pressArea} onPress={handleSkip}>
        {/* ANTICIPATION */}
        {phase === 'anticipation' && (
          <Animated.View
            style={[
              styles.chestContainer,
              {
                transform: [
                  { scale: chestScale },
                  { rotate: rotateInterpolation },
                ],
              },
            ]}
          >
            <Text style={styles.chestIcon}>?</Text>
            <View style={styles.chestBox}>
              <Text style={styles.chestBoxText}>PACK</Text>
            </View>
          </Animated.View>
        )}

        {/* BURST */}
        {phase === 'burst' && (
          <View style={styles.centered}>
            <Animated.View
              style={{
                transform: [{ scale: chestScale }],
              }}
            >
              <View style={styles.chestBox}>
                <Text style={styles.chestBoxText}>PACK</Text>
              </View>
            </Animated.View>
            {isWin && <Confetti count={30} duration={2000} delay={200} />}
          </View>
        )}

        {/* REVEAL */}
        {phase === 'reveal' && (
          <Animated.View
            style={[
              styles.revealCard,
              isWin ? styles.revealCardWin : styles.revealCardLose,
              {
                transform: [
                  { scale: cardScale },
                  { perspective: 1000 },
                  { rotateY: flipInterpolation },
                ],
              },
            ]}
          >
            <Text style={[styles.resultIcon, { fontSize: 48 }]}>
              {isWin ? 'W' : 'L'}
            </Text>

            <Text
              style={[
                styles.resultText,
                isWin ? styles.resultTextWin : styles.resultTextLose,
              ]}
            >
              {isWin ? 'YOU WON!' : 'BETTER LUCK'}
            </Text>

            {!isWin && (
              <Text style={styles.resultSubText}>NEXT TIME</Text>
            )}

            <View style={styles.divider} />
            <Text style={styles.labelSmall}>Winner:</Text>
            <Text style={styles.labelValue}>{winnerLabel}</Text>

            <View style={styles.divider} />
            <Text style={styles.labelSmall}>Your pick:</Text>
            <Text
              style={[
                styles.pickLabel,
                { color: isWin ? colors.game.success : colors.game.failure },
              ]}
            >
              {pickedLabel}
            </Text>
          </Animated.View>
        )}

        {/* CELEBRATION (WIN) */}
        {phase === 'celebration' && isWin && (
          <View style={styles.centered}>
            <VictoryConfetti count={80} duration={4000} />
            <GoldCoinBurst radius={200} />
            <TrophyBurst delay={300} radius={150} />

            <View style={[styles.revealCard, styles.revealCardWin]}>
              <Text style={{ fontSize: 48, color: colors.game.gold }}>!</Text>
              <Text style={[styles.resultText, styles.resultTextWin]}>
                YOU WON!
              </Text>
              <Text style={styles.pickLabelSmall}>{pickedLabel}</Text>
            </View>
          </View>
        )}

        {/* CELEBRATION (LOSE) */}
        {phase === 'celebration' && !isWin && (
          <View style={styles.centered}>
            <Confetti
              count={15}
              colors={['#6b7280', '#9ca3af', '#d1d5db']}
              duration={2000}
            />

            <View style={[styles.revealCard, styles.revealCardLose]}>
              <Text style={{ fontSize: 48, color: colors.game.failure }}>X</Text>
              <Text style={styles.consolationText}>{consolation.text}</Text>
              <Text style={{ fontSize: 32, color: colors.game.failure, marginTop: 8 }}>
                {consolation.symbol}
              </Text>
              <Text style={styles.zeroPoints}>$0.00</Text>
            </View>
          </View>
        )}

        {/* POINTS (WIN ONLY) */}
        {phase === 'points' && isWin && (
          <View style={styles.centered}>
            <VictoryConfetti count={50} duration={3000} />
            <GoldCoinBurst count={8} radius={100} delay={300} />
            <GoldCoinBurst count={8} radius={80} delay={800} />

            <Text style={{ fontSize: 56, color: colors.game.gold, marginBottom: 16 }}>$</Text>
            <AnimatedCounter
              target={pick.points_awarded}
              duration={1200}
              decimals={2}
            />
            <Text style={styles.usdLabel}>USD</Text>
          </View>
        )}

        {/* Skip hint */}
        {canSkip && (
          <View style={styles.skipHint}>
            <Text style={styles.skipText}>Tap to skip</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 50,
  },
  pressArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestContainer: {
    alignItems: 'center',
  },
  chestIcon: {
    fontSize: 64,
    color: colors.game.gold,
    fontFamily: fonts.heading,
    marginBottom: spacing[2],
  },
  chestBox: {
    width: 80,
    height: 80,
    backgroundColor: colors.game.primary,
    borderWidth: borderWidth.heavy,
    borderColor: colors.game.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestBoxText: {
    fontSize: fontSize.sm,
    color: colors.game.gold,
    fontFamily: fonts.heading,
  },
  revealCard: {
    width: 280,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    alignItems: 'center',
    borderWidth: borderWidth.heavy,
  },
  revealCardWin: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderColor: colors.game.success,
  },
  revealCardLose: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    borderColor: colors.game.failure,
  },
  resultIcon: {
    color: colors.game.gold,
    fontFamily: fonts.heading,
    marginBottom: spacing[3],
  },
  resultText: {
    fontSize: fontSize['2xl'],
    fontFamily: fonts.heading,
    marginBottom: spacing[3],
  },
  resultTextWin: {
    color: colors.game.success,
  },
  resultTextLose: {
    color: colors.game.failure,
  },
  resultSubText: {
    fontSize: fontSize.lg,
    fontFamily: fonts.heading,
    color: colors.textMuted,
    marginBottom: spacing[3],
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: spacing[3],
  },
  labelSmall: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fonts.body,
    marginBottom: spacing[1],
  },
  labelValue: {
    fontSize: fontSize.lg,
    color: colors.white,
    fontFamily: fonts.body,
    fontWeight: 'bold',
  },
  pickLabel: {
    fontSize: fontSize.base,
    fontFamily: fonts.body,
    fontWeight: 'bold',
  },
  pickLabelSmall: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    fontFamily: fonts.body,
    marginTop: spacing[2],
  },
  consolationText: {
    fontSize: fontSize.xl,
    fontFamily: fonts.heading,
    color: colors.textSecondary,
    marginBottom: spacing[2],
  },
  zeroPoints: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fonts.body,
    marginTop: spacing[4],
  },
  counterText: {
    fontSize: fontSize['4xl'],
    color: colors.game.gold,
    fontFamily: fonts.heading,
    fontWeight: 'bold',
  },
  usdLabel: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontFamily: fonts.body,
    marginTop: spacing[2],
  },
  skipHint: {
    position: 'absolute',
    bottom: 32,
  },
  skipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fonts.body,
  },
});
