import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTotalPendingReveals } from '../../stores';

const TAB_ICONS: Record<string, string> = {
  Game: '🎮',
  Explore: '🔮',
  MyPacks: '📦',
  Leaderboard: '🏆',
  Profile: '👤',
};

const TAB_LABELS: Record<string, string> = {
  Game: 'Draft',
  Explore: 'Explore',
  MyPacks: 'My Packs',
  Leaderboard: 'Ranks',
  Profile: 'Profile',
};

function PendingRevealsBadge({ count }: { count: number }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [count, pulseAnim]);

  if (count <= 0) return null;

  return (
    <Animated.View
      style={[
        styles.badge,
        { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Text style={styles.badgeText}>{count}</Text>
    </Animated.View>
  );
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const pendingReveals = useTotalPendingReveals();

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = TAB_LABELS[route.name] ?? route.name;
        const isFocused = state.index === index;
        const icon = TAB_ICONS[route.name] ?? '?';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            {isFocused && <View style={styles.activeIndicator} />}
            <View style={styles.iconContainer}>
              <Text style={[styles.icon, !isFocused && styles.iconInactive]}>
                {icon}
              </Text>
              {route.name === 'MyPacks' && (
                <PendingRevealsBadge count={pendingReveals} />
              )}
            </View>
            <Text style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 10, 26, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: -1,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00ff88',
  },
  iconContainer: {
    position: 'relative',
  },
  icon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ffd700',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  iconInactive: {
    opacity: 0.5,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
  labelActive: {
    color: '#00ff88',
    fontWeight: 'bold',
  },
  labelInactive: {
    color: '#6b7280',
  },
});
