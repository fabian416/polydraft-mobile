import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated, Easing, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { PixelText } from '../components/common';
import { colors, spacing, borderRadius, borderWidth, shadows } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';

type HomeNav = NativeStackNavigationProp<RootStackParamList>;

const jupiterLogo = require('../../assets/images/jupiter-logo.png');

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const titleAnim = useRef(new Animated.Value(0)).current;
  const cardAnim1 = useRef(new Animated.Value(0)).current;
  const cardAnim2 = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.spring(titleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(subtitleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnim1, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnim2, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [titleAnim, subtitleAnim, cardAnim1, cardAnim2]);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Title */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: titleAnim,
              transform: [
                {
                  translateY: titleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <PixelText
            variant="heading"
            size="2xl"
            color={colors.foreground}
            shadow
          >
            POLYDRAFT
          </PixelText>
        </Animated.View>

        <Animated.View style={[styles.subtitleWrap, { opacity: subtitleAnim }]}>
          <PixelText
            variant="body"
            size="lg"
            color={colors.textMuted}
          >
            Choose your mode
          </PixelText>
        </Animated.View>

        {/* Mode Cards - Stacked */}
        <View style={styles.cardsContainer}>
          {/* Explore Card */}
          <ModeCard
            anim={cardAnim1}
            title="EXPLORE"
            description="Browse prediction markets"
            badge="Jupiter"
            accentColor="#a855f7"
            badgeColor="#a855f7"
            iconType="image"
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Explore' })
            }
          />

          {/* Play Draft Card */}
          <ModeCard
            anim={cardAnim2}
            title="PLAY DRAFT"
            description="Open packs & make picks"
            badge="Weekly"
            accentColor={colors.game.gold}
            badgeColor={colors.game.gold}
            iconType="emoji"
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Game' })
            }
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

interface ModeCardProps {
  anim: Animated.Value;
  title: string;
  description: string;
  badge: string;
  accentColor: string;
  badgeColor: string;
  iconType: 'image' | 'emoji';
  onPress: () => void;
}

function ModeCard({
  anim,
  title,
  description,
  badge,
  accentColor,
  badgeColor,
  iconType,
  onPress,
}: ModeCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      iconType === 'emoji'
        ? // Joker rotate wobble
          Animated.sequence([
            Animated.timing(iconFloat, {
              toValue: 5,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(iconFloat, {
              toValue: -5,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(iconFloat, {
              toValue: 0,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        : // Jupiter float
          Animated.sequence([
            Animated.timing(iconFloat, {
              toValue: -6,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(iconFloat, {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
    );
    animation.start();
    return () => animation.stop();
  }, [iconFloat, iconType]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
            {
              scale: Animated.multiply(
                anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
                scaleAnim
              ),
            },
          ],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={[
            styles.modeCard,
            { borderColor: accentColor + '99' },
          ]}
        >
          {/* Badge */}
          <View style={[styles.cardBadge, { backgroundColor: badgeColor + 'cc' }]}>
            <PixelText
              variant="heading"
              size="xs"
              color={badgeColor === colors.game.gold ? colors.black : colors.white}
              uppercase
            >
              {badge}
            </PixelText>
          </View>

          {/* Icon */}
          {iconType === 'image' ? (
            <Animated.View style={{ transform: [{ translateY: iconFloat }] }}>
              <Image
                source={jupiterLogo}
                style={styles.jupiterLogo}
                resizeMode="contain"
              />
            </Animated.View>
          ) : (
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: iconFloat.interpolate({
                      inputRange: [-5, 0, 5],
                      outputRange: ['-5deg', '0deg', '5deg'],
                    }),
                  },
                ],
              }}
            >
              <PixelText variant="body" size="4xl">
                {'\u{1F0CF}'}
              </PixelText>
            </Animated.View>
          )}

          {/* Title */}
          <PixelText
            variant="heading"
            size="xl"
            color={accentColor}
            shadow
            style={styles.cardTitle}
          >
            {title}
          </PixelText>

          {/* Description */}
          <PixelText
            variant="body"
            size="base"
            color={colors.textMuted}
            style={styles.cardDescription}
          >
            {description}
          </PixelText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    marginBottom: spacing[1],
    alignItems: 'center',
  },
  subtitleWrap: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  cardsContainer: {
    width: '100%',
    gap: spacing[4],
  },
  cardWrapper: {
  },
  modeCard: {
    backgroundColor: colors.card.bg,
    borderWidth: borderWidth.thick,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    minHeight: 190,
    ...shadows.pixelLg,
  },
  cardBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  jupiterLogo: {
    width: 56,
    height: 56,
  },
  cardTitle: {
    textAlign: 'center',
  },
  cardDescription: {
    textAlign: 'center',
  },
});
