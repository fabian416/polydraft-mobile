import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { PixelText, PixelCard } from '../components/common';
import { colors, spacing, borderRadius, borderWidth, shadows } from '../lib/theme';
import type { RootStackParamList, MainTabParamList } from '../navigation/types';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

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
            size="3xl"
            color={colors.foreground}
            shadow
          >
            POLYDRAFT
          </PixelText>
        </Animated.View>

        <Animated.View style={{ opacity: subtitleAnim }}>
          <PixelText
            variant="body"
            size="lg"
            color={colors.textMuted}
            style={styles.subtitle}
          >
            Choose your mode
          </PixelText>
        </Animated.View>

        {/* Mode Cards */}
        <View style={styles.cardsContainer}>
          {/* Explore Card */}
          <ModeCard
            anim={cardAnim1}
            title="EXPLORE"
            description="Browse prediction markets"
            badge="Jupiter"
            accentColor="#a855f7"
            badgeColor="#a855f7"
            icon="🔮"
            onPress={() => navigation.navigate('Explore')}
          />

          {/* Play Draft Card */}
          <ModeCard
            anim={cardAnim2}
            title="PLAY DRAFT"
            description="Open packs & make picks"
            badge="Weekly"
            accentColor={colors.game.gold}
            badgeColor={colors.game.gold}
            icon="🃏"
            onPress={() => navigation.navigate('Game')}
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
  icon: string;
  onPress: () => void;
}

function ModeCard({
  anim,
  title,
  description,
  badge,
  accentColor,
  badgeColor,
  icon,
  onPress,
}: ModeCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, {
          toValue: -4,
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
  }, [iconFloat]);

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
      style={{
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
      }}
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
          <Animated.View style={{ transform: [{ translateY: iconFloat }] }}>
            <PixelText variant="body" size="4xl">
              {icon}
            </PixelText>
          </Animated.View>

          {/* Title */}
          <PixelText
            variant="heading"
            size="lg"
            color={accentColor}
            shadow
          >
            {title}
          </PixelText>

          {/* Description */}
          <PixelText
            variant="body"
            size="base"
            color={colors.textMuted}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  titleContainer: {
    marginBottom: spacing[2],
  },
  subtitle: {
    marginBottom: spacing[8],
  },
  cardsContainer: {
    width: '100%',
    gap: spacing[4],
  },
  modeCard: {
    backgroundColor: colors.card.bg,
    borderWidth: borderWidth.thick,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    minHeight: 180,
    ...shadows.pixelLg,
  },
  cardBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
});
