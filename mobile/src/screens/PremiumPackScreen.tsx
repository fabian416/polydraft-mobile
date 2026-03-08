import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, Animated, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { GameBackground } from '../components/game/GameBackground';
import { PackSprite } from '../components/game/PackSprite';
import { PixelText } from '../components/common';
import { colors, spacing, shadows } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { useWallet } from '../providers/WalletProvider';
import { buildUsdcTransferTransaction, sendAndConfirmTransfer } from '../lib/solana/transfer';
import type { PackStackParamList } from '../navigation/types';

const usdcLogo = require('../../assets/images/usdc-logo.png');

type PremiumPackNav = NativeStackNavigationProp<PackStackParamList, 'PremiumPack'>;

type PurchaseState = 'idle' | 'processing' | 'success' | 'error';

export function PremiumPackScreen() {
  const navigation = useNavigation<PremiumPackNav>();
  const { publicKey, connected, connect, signTransaction } = useWallet();
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');

  // Press animation for the CTA button
  const buttonScale = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(buttonScale, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, [buttonScale]);

  const handlePressOut = useCallback(() => {
    Animated.timing(buttonScale, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [buttonScale]);

  const handlePurchase = useCallback(async () => {
    if (!publicKey) return;

    setPurchaseState('processing');
    haptic('medium');

    try {
      // 1. Build the USDC transfer transaction
      const { transaction, blockhash, lastValidBlockHeight } =
        await buildUsdcTransferTransaction(publicKey);

      // 2. Sign via Mobile Wallet Adapter
      const signedTransaction = await signTransaction(transaction);

      // 3. Send and confirm on-chain
      const signature = await sendAndConfirmTransfer(
        signedTransaction,
        blockhash,
        lastValidBlockHeight
      );

      console.log('Premium pack purchased! Signature:', signature);

      // 4. Success feedback
      setPurchaseState('success');
      haptic('success');

      // 5. Navigate to pack opening
      navigation.navigate('PackOpen', { premium: true });
    } catch (error: any) {
      console.error('Purchase failed:', error);
      setPurchaseState('error');
      haptic('error');

      const message =
        error?.message?.includes('insufficient')
          ? 'Insufficient USDC balance. Please fund your wallet and try again.'
          : error?.message?.includes('User rejected')
            ? 'Transaction was cancelled.'
            : 'Purchase failed. Please try again.';

      Alert.alert('Purchase Failed', message);
      setPurchaseState('idle');
    }
  }, [publicKey, signTransaction, navigation]);

  const handleConnectWallet = useCallback(async () => {
    haptic('medium');

    if (!connected) {
      try {
        await connect();
      } catch (error) {
        console.error('Wallet connection failed:', error);
        haptic('error');
      }
      return;
    }

    // Wallet is connected, initiate purchase
    await handlePurchase();
  }, [connected, connect, handlePurchase]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Interpolate press: translateY shifts down 4px when pressed
  const buttonTranslateY = buttonScale.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 4],
  });

  // Shadow offset shrinks when pressed (Balatro style)
  const shadowTranslateY = buttonScale.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 0],
  });

  // Determine button label based on state
  const isProcessing = purchaseState === 'processing';
  let buttonLabel = 'CONNECT WALLET';
  if (connected && isProcessing) {
    buttonLabel = 'PROCESSING...';
  } else if (connected) {
    buttonLabel = 'PAY 1 USDC';
  }

  // Truncated wallet address for display
  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  return (
    <ScreenContainer>
      <GameBackground />
      <View style={styles.content}>
        {/* Title */}
        <PixelText variant="heading" size="2xl" color={colors.game.gold}>
          PREMIUM PACK
        </PixelText>

        {/* Price */}
        <View style={styles.priceRow}>
          <Image source={usdcLogo} style={{ width: 24, height: 24 }} />
          <PixelText variant="heading" size="lg" color={colors.game.gold}>
            1 USDC
          </PixelText>
        </View>

        {/* Connected wallet address */}
        {connected && truncatedAddress && (
          <PixelText variant="body" size="base" color={colors.textMuted}>
            Wallet: {truncatedAddress}
          </PixelText>
        )}

        {/* Pack with golden glow */}
        <View style={styles.packContainer}>
          <View style={styles.packGlow}>
            <PackSprite premium size="hero" />
          </View>
        </View>

        {/* CTA Button */}
        <View style={styles.buttonArea}>
          <Animated.View style={{ transform: [{ translateY: buttonTranslateY }] }}>
            {/* Shadow layer */}
            <Animated.View
              style={[
                styles.buttonShadow,
                { transform: [{ translateY: shadowTranslateY }] },
              ]}
            />
            <Pressable
              onPress={handleConnectWallet}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={[
                styles.ctaButton,
                isProcessing && styles.ctaButtonDisabled,
              ]}
              disabled={isProcessing}
            >
              <PixelText variant="heading" size="base" color={colors.white}>
                {buttonLabel}
              </PixelText>
            </Pressable>
          </Animated.View>

          {/* Back button */}
          <Pressable onPress={handleBack} style={styles.backButton}>
            <PixelText variant="body" size="lg" color={colors.textMuted}>
              Back
            </PixelText>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing[1],
  },
  packContainer: {
    marginVertical: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  packGlow: {
    ...shadows.glow,
    shadowColor: colors.game.gold,
    shadowOpacity: 0.6,
    shadowRadius: 30,
  },
  buttonArea: {
    alignItems: 'center',
    gap: spacing[4],
    width: '100%',
    paddingHorizontal: spacing[4],
  },
  ctaButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  buttonShadow: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#5b21b6',
    borderRadius: 8,
  },
  backButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
  },
});
