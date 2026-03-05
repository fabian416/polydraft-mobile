import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TAB_ICONS: Record<string, string> = {
  Home: '🏠',
  Game: '🎮',
  Explore: '🔍',
  Leaderboard: '🏆',
  Profile: '👤',
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = route.name;
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
            <Text style={[styles.icon, !isFocused && styles.iconInactive]}>
              {icon}
            </Text>
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
  icon: {
    fontSize: 24,
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
