/**
 * Wallet Connect Button (React Native)
 *
 * Pixel-art styled button for connecting/disconnecting the Solana wallet.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { useWallet } from '../../providers/WalletProvider';
import { colors, fonts, fontSize, spacing, borderRadius, borderWidth, shadows } from '../../lib/theme';

export function WalletButton() {
  const { publicKey, connected, connecting, connect, disconnect } = useWallet();

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  if (connecting) {
    return (
      <View style={[styles.button, styles.buttonConnecting]}>
        <ActivityIndicator size="small" color={colors.black} />
        <Text style={styles.buttonText}>Connecting...</Text>
      </View>
    );
  }

  if (connected && truncatedAddress) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.buttonConnected]}
        onPress={disconnect}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>{truncatedAddress}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, styles.buttonDisconnected]}
      onPress={connect}
      activeOpacity={0.8}
    >
      <Text style={styles.buttonText}>Connect Wallet</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: borderWidth.base,
    minWidth: 180,
    ...shadows.pixel,
  },
  buttonDisconnected: {
    backgroundColor: colors.game.accent,
    borderColor: colors.game.accent,
  },
  buttonConnected: {
    backgroundColor: colors.game.secondary,
    borderColor: colors.game.accent,
  },
  buttonConnecting: {
    backgroundColor: colors.game.accent,
    borderColor: colors.game.accent,
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.sm,
    color: colors.white,
    textTransform: 'uppercase',
  },
});
