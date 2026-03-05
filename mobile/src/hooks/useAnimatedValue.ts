import { useCallback, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface SpringConfig {
  stiffness?: number;
  damping?: number;
  mass?: number;
  useNativeDriver?: boolean;
}

interface TimingConfig {
  duration?: number;
  easing?: (value: number) => number;
  useNativeDriver?: boolean;
}

interface UseAnimatedValueReturn {
  /** The Animated.Value instance */
  value: Animated.Value;
  /** Animate to target with spring physics */
  spring: (toValue: number, config?: SpringConfig) => void;
  /** Animate to target with timing curve */
  timing: (toValue: number, config?: TimingConfig) => void;
  /** Set value immediately without animation */
  setValue: (value: number) => void;
  /** Stop any running animation */
  stop: () => void;
}

/**
 * Helper hook for creating and managing an Animated.Value.
 * Provides convenience methods for spring and timing animations.
 */
export function useAnimatedValue(initialValue: number = 0): UseAnimatedValueReturn {
  const animRef = useRef(new Animated.Value(initialValue));
  const runningRef = useRef<Animated.CompositeAnimation | null>(null);

  const stop = useCallback(() => {
    if (runningRef.current) {
      runningRef.current.stop();
      runningRef.current = null;
    }
  }, []);

  const spring = useCallback((toValue: number, config?: SpringConfig) => {
    stop();
    const anim = Animated.spring(animRef.current, {
      toValue,
      stiffness: config?.stiffness ?? 200,
      damping: config?.damping ?? 20,
      mass: config?.mass ?? 1,
      useNativeDriver: config?.useNativeDriver ?? true,
    });
    runningRef.current = anim;
    anim.start(() => {
      runningRef.current = null;
    });
  }, [stop]);

  const timing = useCallback((toValue: number, config?: TimingConfig) => {
    stop();
    const anim = Animated.timing(animRef.current, {
      toValue,
      duration: config?.duration ?? 300,
      easing: config?.easing ?? Easing.out(Easing.cubic),
      useNativeDriver: config?.useNativeDriver ?? true,
    });
    runningRef.current = anim;
    anim.start(() => {
      runningRef.current = null;
    });
  }, [stop]);

  const setValue = useCallback((v: number) => {
    stop();
    animRef.current.setValue(v);
  }, [stop]);

  return {
    value: animRef.current,
    spring,
    timing,
    setValue,
    stop,
  };
}
