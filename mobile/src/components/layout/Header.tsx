import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function Header() {
  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>P</Text>
        </View>
        <Text style={styles.logoText}>
          Poly<Text style={styles.logoAccent}>draft</Text>
        </Text>
      </View>
      <View style={styles.pointsBadge}>
        <Text style={styles.pointsStar}>★</Text>
        <Text style={styles.pointsText}>0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a0a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    backgroundColor: '#00ff88',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  logoText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: '#00ff88',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pointsStar: {
    color: '#ffd700',
    fontSize: 14,
  },
  pointsText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
