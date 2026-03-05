/**
 * Wallet Gate (React Native)
 *
 * Guard component that requires wallet connection and authentication
 * before rendering children. Shows connect UI if not authenticated.
 */

import React, { useEffect, useCallback, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useWallet } from '../../providers/WalletProvider';
import { WalletButton } from './WalletButton';
import { authenticateWithWallet } from '../../lib/solana/wallet-auth';
import { colors, fonts, fontSize, spacing, borderRadius, borderWidth } from '../../lib/theme';

type AuthStatus = 'idle' | 'connecting' | 'signing' | 'verifying' | 'authenticated' | 'error';

interface WalletGateProps {
  children: ReactNode;
  onAuthenticated?: (token: string, walletAddress: string, profileId: string) => void;
}

export function WalletGate({ children, onAuthenticated }: WalletGateProps) {
  const { publicKey, connected, signMessage } = useWallet();
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) return;

    try {
      setStatus('signing');
      setError(null);

      const result = await authenticateWithWallet(publicKey, signMessage);

      setStatus('authenticated');
      setJwt(result.token);
      onAuthenticated?.(result.token, result.walletAddress, result.profileId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setStatus('error');
      setError(message);
    }
  }, [publicKey, signMessage, onAuthenticated]);

  // Auto-trigger auth when wallet connects
  useEffect(() => {
    if (connected && publicKey && status === 'idle') {
      setStatus('connecting');
      authenticate();
    }
  }, [connected, publicKey, status, authenticate]);

  // Authenticated — render app
  if (status === 'authenticated' && jwt) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Polydraft</Text>
        <Text style={styles.subtitle}>Connect your wallet to play</Text>

        {status === 'error' && error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {status === 'signing' || status === 'verifying' || status === 'connecting' ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.game.accent} />
            <Text style={styles.loadingText}>
              {status === 'signing' && 'Sign the message in your wallet...'}
              {status === 'verifying' && 'Verifying signature...'}
              {status === 'connecting' && 'Connecting...'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setStatus('idle');
                authenticate();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Sign Message</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.connectContainer}>
            <WalletButton />
            {status === 'error' && (
              <TouchableOpacity
                onPress={() => {
                  setStatus('idle');
                  authenticate();
                }}
              >
                <Text style={styles.tryAgainText}>Try again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.game.bg,
    padding: spacing[8],
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSize.xl,
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginBottom: spacing[8],
  },
  errorBox: {
    marginBottom: spacing[6],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: borderWidth.thin,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: fontSize.base,
    color: '#f87171',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: spacing[4],
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  retryButton: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.game.accent,
    borderRadius: borderRadius.lg,
  },
  retryText: {
    fontFamily: fonts.body,
    fontSize: fontSize.base,
    color: colors.black,
  },
  connectContainer: {
    alignItems: 'center',
    gap: spacing[4],
  },
  tryAgainText: {
    fontFamily: fonts.body,
    fontSize: fontSize.base,
    color: colors.game.accent,
    textDecorationLine: 'underline',
  },
});
