import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

interface UseHoldToConfirmOptions {
  /** Whether the hold interaction is enabled */
  enabled: boolean;
  /** Called when hold completes successfully */
  onConfirm: () => void;
  /** Duration in ms to hold before confirming */
  holdDuration?: number;
}

interface UseHoldToConfirmReturn {
  /** Current progress 0-1 */
  progress: number;
  /** Animated.Value for progress (for driving animated styles) */
  animatedProgress: Animated.Value;
  /** Whether the hold has completed */
  isComplete: boolean;
  /** Whether currently holding */
  isHolding: boolean;
  /** Call on pressIn (start hold) */
  onPressIn: () => void;
  /** Call on pressOut (cancel hold) */
  onPressOut: () => void;
}

/**
 * Hook for long-press confirmation interactions.
 * Returns progress (0-1), handlers for pressIn/pressOut,
 * and an Animated.Value for driving visual feedback.
 */
export function useHoldToConfirm({
  enabled,
  onConfirm,
  holdDuration = 2000,
}: UseHoldToConfirmOptions): UseHoldToConfirmReturn {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  const animatedProgress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  // Sync Animated.Value to state for JS reads
  useEffect(() => {
    const id = animatedProgress.addListener(({ value }) => {
      setProgress(value);
    });
    return () => animatedProgress.removeListener(id);
  }, [animatedProgress]);

  const onPressIn = useCallback(() => {
    if (!enabled || isComplete) return;

    setIsHolding(true);
    animatedProgress.setValue(0);

    const anim = Animated.timing(animatedProgress, {
      toValue: 1,
      duration: holdDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // needed for JS listener
    });

    animationRef.current = anim;

    anim.start(({ finished }) => {
      if (finished) {
        setIsComplete(true);
        setIsHolding(false);
        onConfirmRef.current();
      }
    });
  }, [enabled, isComplete, holdDuration, animatedProgress]);

  const onPressOut = useCallback(() => {
    if (!isHolding) return;

    setIsHolding(false);

    // Cancel the fill animation
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    // Snap back to 0
    Animated.timing(animatedProgress, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isHolding, animatedProgress]);

  // Reset when enabled changes
  useEffect(() => {
    if (!enabled) {
      setIsComplete(false);
      setIsHolding(false);
      setProgress(0);
      animatedProgress.setValue(0);
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    }
  }, [enabled, animatedProgress]);

  return {
    progress,
    animatedProgress,
    isComplete,
    isHolding,
    onPressIn,
    onPressOut,
  };
}
