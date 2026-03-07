import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { Header } from '../components/layout/Header';
import { GameBackground } from '../components/game/GameBackground';
import { PackSprite } from '../components/game/PackSprite';
import { PixelText, PixelCard } from '../components/common';
import { usePackSummaries, useTotalPendingReveals } from '../stores/myPacks';
import { colors, spacing, borderRadius } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';
import type { PackSummary, PackStatus } from '../stores/myPacks';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function getStatusLabel(status: PackStatus): string {
  switch (status) {
    case 'drafting':
      return 'In Progress';
    case 'waiting':
      return 'Waiting';
    case 'has_reveals':
      return 'Ready!';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}

function getStatusColor(status: PackStatus): string {
  switch (status) {
    case 'drafting':
      return colors.game.warning;
    case 'waiting':
      return colors.textMuted;
    case 'has_reveals':
      return colors.game.success;
    case 'completed':
      return colors.game.gold;
    default:
      return colors.textMuted;
  }
}

function PackCard({ pack, onPress }: { pack: PackSummary; onPress: () => void }) {
  const dateStr = new Date(pack.openedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const correctCount = pack.pickPreviews.filter((p) => p.isCorrect === true).length;
  const statusLabel = getStatusLabel(pack.status);
  const statusColor = getStatusColor(pack.status);

  return (
    <Pressable onPress={onPress}>
      <PixelCard style={styles.packCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <PixelText variant="body" size="lg">
              {dateStr}
            </PixelText>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '30' }]}>
              <PixelText variant="heading" size="xs" color={statusColor} uppercase>
                {statusLabel}
              </PixelText>
            </View>
          </View>
          <PixelText variant="body" size="xl" color={colors.game.gold}>
            ${pack.totalPoints.toFixed(2)}
          </PixelText>
        </View>

        {/* Pick previews */}
        <View style={styles.pickPreviews}>
          {pack.pickPreviews.map((preview, index) => (
            <View key={preview.eventId + index} style={styles.pickDot}>
              <View
                style={[
                  styles.dot,
                  preview.isCorrect === true && styles.dotCorrect,
                  preview.isCorrect === false && styles.dotIncorrect,
                  preview.isCorrect === null && styles.dotPending,
                ]}
              />
            </View>
          ))}
        </View>

        {/* Stats row */}
        <View style={styles.cardFooter}>
          <PixelText variant="body" size="base" color={colors.textMuted}>
            {correctCount}/{pack.totalPicks} correct
          </PixelText>
          <PixelText variant="body" size="base" color={colors.textMuted}>
            {pack.resolvedCount}/{pack.totalPicks} resolved
          </PixelText>
        </View>
      </PixelCard>
    </Pressable>
  );
}

function EmptyState() {
  const navigation = useNavigation<NavProp>();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pack float
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    float.start();

    // Button text pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      float.stop();
      pulse.stop();
    };
  }, [floatAnim, pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      tension: 150,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 150,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.emptyState}>
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <PackSprite size="xl" />
      </Animated.View>

      <View style={styles.emptyTextGroup}>
        <PixelText variant="heading" size="xl" color={colors.foreground}>
          NO PACKS YET
        </PixelText>
        <PixelText variant="body" size="base" color={colors.textMuted}>
          Open your first pack to start making picks!
        </PixelText>
      </View>

      <Pressable
        onPress={() => navigation.navigate('MainTabs', { screen: 'Game' })}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.openPackBtn, { transform: [{ scale: scaleAnim }] }]}>
          <Animated.View style={{ opacity: pulseAnim }}>
            <PixelText variant="heading" size="xl" color="#0a0a1a">
              OPEN PACK
            </PixelText>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

export function MyPacksScreen() {
  const navigation = useNavigation<NavProp>();
  const packSummaries = usePackSummaries();
  const pendingReveals = useTotalPendingReveals();

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handlePackPress = useCallback(
    (packId: string) => {
      navigation.navigate('PackFlow', {
        screen: 'PackDetail',
        params: { packId },
      });
    },
    [navigation]
  );

  const renderPack = useCallback(
    ({ item }: { item: PackSummary }) => (
      <PackCard pack={item} onPress={() => handlePackPress(item.id)} />
    ),
    [handlePackPress]
  );

  const keyExtractor = useCallback((item: PackSummary) => item.id, []);

  return (
    <ScreenContainer>
      <GameBackground />
      <Header />

      {/* Page Header */}
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderRow}>
          <PixelText variant="heading" size="lg">
            MY PACKS
          </PixelText>
          {pendingReveals > 0 && (
            <View style={styles.pendingBadge}>
              <PixelText variant="heading" size="xs" color={colors.game.gold}>
                {pendingReveals} READY
              </PixelText>
            </View>
          )}
        </View>
        {packSummaries.length > 0 && (
          <PixelText variant="body" size="base" color={colors.textMuted}>
            {packSummaries.length} pack{packSummaries.length !== 1 ? 's' : ''} total
          </PixelText>
        )}
      </View>

      {/* Pack List */}
      <FlatList
        data={packSummaries}
        renderItem={renderPack}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          packSummaries.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.game.gold}
          />
        }
        ListEmptyComponent={<EmptyState />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
    gap: spacing[3],
  },
  listContentEmpty: {
    flex: 1,
  },
  packCard: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  pickPreviews: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  pickDot: {
    flex: 1,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotCorrect: {
    backgroundColor: colors.game.success,
  },
  dotIncorrect: {
    backgroundColor: colors.game.failure,
  },
  dotPending: {
    backgroundColor: colors.card.border,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.card.border,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[6],
    paddingBottom: spacing[10],
  },
  emptyTextGroup: {
    alignItems: 'center',
    gap: spacing[2],
  },
  openPackBtn: {
    backgroundColor: colors.game.accent,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[5],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: colors.game.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
});
