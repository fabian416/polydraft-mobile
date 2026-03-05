import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../../lib/theme';

interface PixelDissolveProps {
  /** Width of the dissolving region */
  width: number;
  /** Height of the dissolving region */
  height: number;
  /** Size of each pixel block */
  blockSize?: number;
  /** Duration in ms */
  duration?: number;
  /** Color of the pixels (defaults to gold) */
  color?: string;
  /** Called when animation completes */
  onComplete?: () => void;
  /** Whether animation is active */
  active?: boolean;
}

interface Block {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  blockColor: string;
  anim: Animated.Value;
}

/**
 * Pixel dissolve effect using Animated API.
 * Creates a grid of small square "pixel" views that scatter outward
 * with physics-like motion and fade out.
 *
 * Since React Native can't sample image pixels like canvas,
 * we use the component's area to create colored pixel blocks
 * that burst outward from their grid positions.
 */
export function PixelDissolve({
  width,
  height,
  blockSize = 8,
  duration = 2000,
  color = colors.game.gold,
  onComplete,
  active = true,
}: PixelDissolveProps) {
  const [visible, setVisible] = useState(active);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const blocks = useMemo<Block[]>(() => {
    const result: Block[] = [];
    const cx = width / 2;
    const cy = height / 2;
    let id = 0;

    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        const dx = x + blockSize / 2 - cx;
        const dy = y + blockSize / 2 - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        const speed = 30 + Math.random() * 70;

        // Slight color variation for visual interest
        const variation = Math.random() > 0.5 ? color : colors.game.accent;

        result.push({
          id: id++,
          x,
          y,
          vx: nx * speed + (Math.random() - 0.5) * 20,
          vy: ny * speed - 40 + (Math.random() - 0.5) * 20,
          blockColor: variation,
          anim: new Animated.Value(0),
        });
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    setVisible(true);

    // Stagger start times based on distance from center for a ripple effect
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    const animations = blocks.map((b) => {
      const dx = b.x - cx;
      const dy = b.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const staggerDelay = (dist / maxDist) * 200;

      return Animated.sequence([
        Animated.delay(staggerDelay),
        Animated.timing(b.anim, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      setVisible(false);
      onCompleteRef.current?.();
    });
  }, [active, blocks, width, height, duration]);

  if (!visible) return null;

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      {blocks.map((b) => {
        // Simulate physics: position = initial + velocity * t
        // t goes from 0 to 1 over duration
        const translateX = b.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, b.vx * 3],
        });
        const translateY = b.anim.interpolate({
          inputRange: [0, 1],
          // Add gravity effect: vy*t + 0.5*g*t^2 approximated
          outputRange: [0, b.vy * 3 + 50],
        });
        const opacity = b.anim.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [1, 0.8, 0],
        });
        const scale = b.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.3],
        });
        const rotate = b.anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${(Math.random() - 0.5) * 720}deg`],
        });

        return (
          <Animated.View
            key={b.id}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: blockSize,
              height: blockSize,
              backgroundColor: b.blockColor,
              transform: [{ translateX }, { translateY }, { scale }, { rotate }],
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    overflow: 'visible',
  },
});
