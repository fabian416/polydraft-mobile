import React, { useCallback } from 'react';
import { View, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { Header } from '../components/layout/Header';
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

export function MyPacksScreen() {
  const navigation = useNavigation<NavProp>();
  const packSummaries = usePackSummaries();
  const pendingReveals = useTotalPendingReveals();

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Small delay to simulate refresh
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
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.game.gold}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <PixelText variant="body" size="3xl" style={styles.emptyIcon}>
              📦
            </PixelText>
            <PixelText variant="body" size="lg" color={colors.textMuted} style={styles.emptyText}>
              No packs yet
            </PixelText>
            <PixelText variant="body" size="base" color={colors.textMuted}>
              Open your first pack to get started!
            </PixelText>
          </View>
        }
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
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing[16],
  },
  emptyIcon: {
    marginBottom: spacing[3],
  },
  emptyText: {
    marginBottom: spacing[1],
  },
});
