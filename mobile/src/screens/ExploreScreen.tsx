import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { PixelText, PixelButton } from '../components/common';
import { ExploreCard } from '../components/explore/ExploreCard';
import { CategoryFilter } from '../components/explore/CategoryFilter';
import { LoadingSpinner } from '../components/common';
import { useExploreStore } from '../stores/explore';
import { getMarkets } from '../lib/api/ExploreService';
import { colors, spacing, borderRadius, borderWidth } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';
import type { ExploreMarket } from '../types';

type ExploreNav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 2;
const CARD_GAP = spacing[3];
const HORIZONTAL_PADDING = spacing[4];
const CARD_WIDTH =
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

export function ExploreScreen() {
  const navigation = useNavigation<ExploreNav>();
  const {
    markets,
    isLoadingMarkets,
    marketsError,
    hasMore,
    setMarkets,
    appendMarkets,
    setLoadingMarkets,
    setMarketsError,
  } = useExploreStore();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const loadingRef = useRef(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getQueryParams = useCallback(() => ({
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    search: searchQuery.trim() || undefined,
  }), [selectedCategory, searchQuery]);

  // Initial fetch
  useEffect(() => {
    if (markets.length > 0) return;
    loadMarkets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when category changes
  useEffect(() => {
    loadMarkets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      loadMarkets();
    }, 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadMarkets = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMarkets(true);

    try {
      const { markets: data } = await getMarkets(getQueryParams());
      setMarkets(data);
    } catch {
      setMarketsError('Failed to load markets');
    } finally {
      setLoadingMarkets(false);
      loadingRef.current = false;
    }
  }, [setMarkets, setLoadingMarkets, setMarketsError, getQueryParams]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    loadingRef.current = false;
    try {
      const { markets: data } = await getMarkets(getQueryParams());
      setMarkets(data);
    } catch {
      setMarketsError('Failed to refresh markets');
    } finally {
      setRefreshing(false);
    }
  }, [setMarkets, setMarketsError, getQueryParams]);

  const handleEndReached = useCallback(async () => {
    if (loadingRef.current || !hasMore || isLoadingMarkets) return;
    loadingRef.current = true;
    setLoadingMarkets(true);

    try {
      const { markets: data } = await getMarkets({
        ...getQueryParams(),
        offset: markets.length,
      });
      appendMarkets(data, null);
    } catch {
      // silent fail on pagination
    } finally {
      setLoadingMarkets(false);
      loadingRef.current = false;
    }
  }, [hasMore, isLoadingMarkets, appendMarkets, setLoadingMarkets, getQueryParams, markets.length]);

  const handleCardPress = useCallback(
    (market: ExploreMarket) => {
      navigation.navigate('EventDetail', { eventId: market.id });
    },
    [navigation]
  );

  // Markets are already filtered server-side by category and search
  const filteredMarkets = markets;

  const pendingBets = useExploreStore((s) => s.pendingBets);

  const renderCard = useCallback(
    ({ item }: { item: ExploreMarket }) => {
      const hasBet = pendingBets.some((b) => b.marketId === item.id);
      return (
        <View style={{ width: CARD_WIDTH }}>
          <ExploreCard
            market={item}
            onPress={() => handleCardPress(item)}
            hasBet={hasBet}
          />
        </View>
      );
    },
    [handleCardPress, pendingBets]
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMarkets || markets.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.game.gold} />
        <PixelText variant="body" size="xs" color={colors.textMuted}>
          Loading more...
        </PixelText>
      </View>
    );
  }, [isLoadingMarkets, markets.length]);

  const renderEmpty = useCallback(() => {
    if (isLoadingMarkets) return null;

    if (marketsError && markets.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <PixelText variant="body" size="lg" color={colors.textMuted}>
            Failed to load markets
          </PixelText>
          <PixelButton title="Try Again" variant="secondary" onPress={loadMarkets} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <PixelText variant="body" size="lg" color={colors.textMuted}>
          No markets found
        </PixelText>
      </View>
    );
  }, [isLoadingMarkets, marketsError, markets.length, loadMarkets]);

  // Initial loading
  if (isLoadingMarkets && markets.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <PixelText variant="heading" size="lg" uppercase>
            Explore
          </PixelText>
        </View>
        <View style={styles.loadingContainer}>
          <LoadingSpinner label="Loading markets..." />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <PixelText variant="heading" size="lg" uppercase>
          Explore
        </PixelText>
      </View>

      {/* Search input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search markets..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Category filter */}
      <CategoryFilter
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* Markets grid */}
      <FlatList
        data={filteredMarkets}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.game.gold}
            colors={[colors.game.gold]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  searchContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  searchInput: {
    backgroundColor: colors.card.bg,
    borderWidth: borderWidth.thin,
    borderColor: colors.card.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    color: colors.foreground,
    fontFamily: 'VT323-Regular',
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
  },
  columnWrapper: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    gap: spacing[4],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
