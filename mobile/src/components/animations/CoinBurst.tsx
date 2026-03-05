import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../lib/theme';

interface CoinBurstProps {
  count?: number;
  symbols?: string[];
  origin?: { x: number; y: number };
  radius?: number;
  duration?: number;
  delay?: number;
  onComplete?: () => void;
  active?: boolean;
}

const DEFAULT_SYMBOLS = ['$', '*', '+', '#', '%'];

interface Particle {
  id: number;
  symbol: string;
  targetX: number;
  targetY: number;
  particleDelay: number;
  scale: number;
  anim: Animated.Value;
}

export function CoinBurst({
  count = 12,
  symbols = DEFAULT_SYMBOLS,
  origin = { x: 0, y: 0 },
  radius = 150,
  duration = 1500,
  delay = 0,
  onComplete,
  active = true,
}: CoinBurstProps) {
  const [visible, setVisible] = useState(active);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const particles = useMemo<Particle[]>(() => {
    return [...Array(count)].map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const randomRadius = radius * (0.6 + Math.random() * 0.4);
      const targetX = Math.cos(angle) * randomRadius;
      const targetY = Math.sin(angle) * randomRadius;
      const symbol = symbols[i % symbols.length];
      const particleDelay = delay + Math.random() * 150;
      const scale = 0.8 + Math.random() * 0.6;

      return {
        id: i,
        symbol,
        targetX,
        targetY,
        particleDelay,
        scale,
        anim: new Animated.Value(0),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    setVisible(true);

    const animations = particles.map((p) =>
      Animated.sequence([
        Animated.delay(p.particleDelay),
        Animated.timing(p.anim, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(animations).start(() => {
      setVisible(false);
      onCompleteRef.current?.();
    });
  }, [active, particles, duration]);

  if (!visible) return null;

  return (
    <View style={[styles.container, { left: origin.x, top: origin.y }]} pointerEvents="none">
      {particles.map((p) => {
        const translateX = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.targetX],
        });
        const translateY = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.targetY],
        });
        const scale = p.anim.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, p.scale, p.scale * 0.3],
        });
        const opacity = p.anim.interpolate({
          inputRange: [0, 0.2, 0.7, 1],
          outputRange: [0, 1, 1, 0],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                transform: [{ translateX }, { translateY }, { scale }],
                opacity,
              },
            ]}
          >
            <Text style={styles.particleText}>{p.symbol}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

// Golden coins burst
export function GoldCoinBurst(props: Partial<CoinBurstProps>) {
  return (
    <CoinBurst
      count={16}
      symbols={['$', '$', '*', '$', '+']}
      radius={180}
      {...props}
    />
  );
}

// Mini burst for point counting
export function MiniCoinBurst(props: Partial<CoinBurstProps>) {
  return (
    <CoinBurst
      count={6}
      symbols={['+', '*', '#']}
      radius={60}
      duration={800}
      {...props}
    />
  );
}

// Trophy celebration burst
export function TrophyBurst(props: Partial<CoinBurstProps>) {
  return (
    <CoinBurst
      count={8}
      symbols={['!', '*', '#', '%']}
      radius={120}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
  particleText: {
    fontSize: 24,
    color: colors.game.gold,
    fontWeight: 'bold',
  },
});
