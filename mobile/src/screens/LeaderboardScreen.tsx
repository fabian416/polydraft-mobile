import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { Header } from '../components/layout/Header';
import { PixelText } from '../components/common/PixelText';
import { PixelCard } from '../components/common/PixelCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { LeaderboardRow } from '../components/game/LeaderboardRow';
import { useSessionStore } from '../stores/session';
import {
  getLeaderboard,
  type LeaderboardEntry,
  type LeaderboardResponse,
} from '../lib/api/LeaderboardService';
import { colors, spacing } from '../lib/theme';

function getWeekDates(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (d: Date) =>
    `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;

  return `${fmt(monday)} — ${fmt(sunday)}`;
}

export function LeaderboardScreen() {
  const anonymousId = useSessionStore((s) => s.anonymousId);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!anonymousId) return;
    try {
      setError(null);
      const result = await getLeaderboard(10, 0, anonymousId);
      setData(result);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [anonymousId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const myRank = data?.userRank;
  const myPoints = data?.userPoints ?? 0;

  const renderItem = useCallback(
    ({ item }: { item: LeaderboardEntry }) => (
      <LeaderboardRow
        rank={item.rank}
        displayName={item.displayName}
        totalPoints={item.totalPoints}
        packsOpened={item.packsOpened}
        accuracy={item.accuracy}
        isCurrentUser={item.isCurrentUser}
      />
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: LeaderboardEntry) => item.profileId,
    []
  );

  const ListHeader = (
    <View style={styles.header}>
      {/* Title */}
      <View style={styles.titleSection}>
        <PixelText variant="heading" size="lg" color={colors.foreground}>
          Weekly Leaderboard
        </PixelText>
        <PixelText variant="body" size="sm" color={colors.textMuted}>
          {getWeekDates()}
        </PixelText>
      </View>

      {/* My Position Card */}
      <PixelCard style={styles.myPositionCard}>
        <View style={styles.myPositionRow}>
          <View>
            <PixelText variant="body" size="sm" color={colors.textMuted}>
              Your Position
            </PixelText>
            <PixelText variant="heading" size="xl" color={colors.foreground}>
              {myRank != null ? `#${myRank}` : '—'}
            </PixelText>
          </View>
          <View style={styles.myPositionRight}>
            <PixelText variant="body" size="sm" color={colors.textMuted}>
              Points
            </PixelText>
            <PixelText variant="heading" size="xl" color={colors.game.gold}>
              {myPoints.toFixed(1)}
            </PixelText>
          </View>
        </View>
      </PixelCard>
    </View>
  );

  const ListEmpty = isLoading ? (
    <LoadingSpinner label="Loading leaderboard..." />
  ) : error ? (
    <View style={styles.emptyState}>
      <PixelText variant="body" size="base" color={colors.game.accent}>
        {error}
      </PixelText>
    </View>
  ) : (
    <View style={styles.emptyState}>
      <PixelText variant="body" size="4xl" style={styles.emptyIcon}>
        {'🏆'}
      </PixelText>
      <PixelText variant="body" size="base" color={colors.textMuted}>
        No players yet this week.
      </PixelText>
      <PixelText variant="body" size="sm" color={colors.textSecondary}>
        Be the first to open a pack!
      </PixelText>
    </View>
  );

  const ListFooter =
    data && data.entries.length > 0 ? (
      <View style={styles.footer}>
        <PixelText variant="body" size="sm" color={colors.textMuted}>
          Showing top {data.entries.length} of {data.totalPlayers} players
        </PixelText>
      </View>
    ) : null;

  return (
    <ScreenContainer>
      <Header />
      <FlatList
        data={data?.entries ?? []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.game.gold}
            colors={[colors.game.gold]}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  header: {
    marginBottom: spacing[4],
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  myPositionCard: {
    marginBottom: spacing[2],
  },
  myPositionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  myPositionRight: {
    alignItems: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  emptyIcon: {
    marginBottom: spacing[4],
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing[4],
  },
});
