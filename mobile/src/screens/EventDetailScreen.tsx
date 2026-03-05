import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { PixelText, PixelButton, PixelCard } from '../components/common';
import { ProbabilityBar } from '../components/explore/ProbabilityBar';
import { OutcomeSelector } from '../components/explore/OutcomeSelector';
import { LoadingSpinner } from '../components/common';
import { useExploreStore } from '../stores/explore';
import { getMarketById } from '../lib/api/ExploreService';
import { colors, spacing, borderRadius, borderWidth, shadows } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';
import type { ExploreMarket, ExploreOutcome } from '../types';

type EventDetailRoute = RouteProp<RootStackParamList, 'EventDetail'>;
type EventDetailNav = NativeStackNavigationProp<RootStackParamList>;

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getCategoryEmoji(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('sport')) return '(ball)';
  if (lower.includes('politic')) return '(vote)';
  if (lower.includes('crypto')) return '(btc)';
  if (lower.includes('econ')) return '(chart)';
  if (lower.includes('entertain')) return '(film)';
  return '(mkt)';
}

export function EventDetailScreen() {
  const navigation = useNavigation<EventDetailNav>();
  const route = useRoute<EventDetailRoute>();
  const { eventId } = route.params;

  const { selectEvent, addPendingBet } = useExploreStore();

  const [market, setMarket] = useState<ExploreMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<ExploreOutcome | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getMarketById(eventId);
        if (data) {
          setMarket(data);
          selectEvent(data);
        } else {
          setError('Market not found');
        }
      } catch {
        setError('Failed to load market');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => selectEvent(null);
  }, [eventId, selectEvent]);

  const handleOutcomeSelect = useCallback((outcome: ExploreOutcome) => {
    setSelectedOutcome((prev) => (prev?.id === outcome.id ? null : outcome));
  }, []);

  const handleAddBet = useCallback(() => {
    if (!market || !selectedOutcome) return;
    addPendingBet({
      marketId: market.id,
      outcomeId: selectedOutcome.id,
      outcomeLabel: selectedOutcome.label,
      probability: selectedOutcome.probability,
      direction: 'yes',
    });
    navigation.goBack();
  }, [market, selectedOutcome, addPendingBet, navigation]);

  // Loading
  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <PixelText variant="heading" size="sm" color={colors.foreground}>
              {'<'}
            </PixelText>
          </TouchableOpacity>
          <PixelText variant="heading" size="sm" uppercase>
            Loading...
          </PixelText>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContainer}>
          <LoadingSpinner label="Loading market..." />
        </View>
      </ScreenContainer>
    );
  }

  // Error
  if (error || !market) {
    return (
      <ScreenContainer>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <PixelText variant="heading" size="sm" color={colors.foreground}>
              {'<'}
            </PixelText>
          </TouchableOpacity>
          <PixelText variant="heading" size="sm" uppercase>
            Error
          </PixelText>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContainer}>
          <PixelText variant="body" size="lg" color={colors.textMuted}>
            {error || 'Market not found'}
          </PixelText>
          <PixelButton
            title="Go Back"
            variant="secondary"
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScreenContainer>
    );
  }

  const outcomeA = market.outcomes[0];
  const outcomeB = market.outcomes[1];
  const hasValidImage = !!market.image_url && !imageError;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <PixelText variant="heading" size="sm" color={colors.foreground}>
            {'<'}
          </PixelText>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <PixelText variant="body" size="sm" color={colors.foreground} numberOfLines={1}>
            {market.title}
          </PixelText>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Image */}
        <View style={styles.imageContainer}>
          {hasValidImage ? (
            <Image
              source={{ uri: market.image_url! }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <PixelText variant="heading" size="3xl" color={colors.textMuted}>
                {getCategoryEmoji(market.category)}
              </PixelText>
            </View>
          )}
        </View>

        {/* Title + Badges */}
        <View style={styles.section}>
          <PixelText variant="body" size="xl" color={colors.foreground}>
            {market.title}
          </PixelText>

          <View style={styles.badges}>
            <View style={[styles.badge, styles.categoryBadge]}>
              <PixelText variant="body" size="xs" color={colors.white} uppercase>
                {market.category}
              </PixelText>
            </View>
            {market.subcategory && (
              <View style={[styles.badge, styles.subcategoryBadge]}>
                <PixelText variant="body" size="xs" color={colors.textSecondary} uppercase>
                  {market.subcategory}
                </PixelText>
              </View>
            )}
            <View style={[styles.badge, styles.statusBadge]}>
              <PixelText variant="body" size="xs" color={colors.game.success} uppercase>
                {market.status}
              </PixelText>
            </View>
          </View>
        </View>

        {/* Description */}
        {market.description && (
          <View style={styles.section}>
            <PixelText variant="body" size="base" color={colors.textSecondary}>
              {market.description}
            </PixelText>
          </View>
        )}

        {/* Probability */}
        {outcomeA && outcomeB && (
          <PixelCard style={styles.probabilityCard}>
            <PixelText
              variant="heading"
              size="xs"
              color={colors.textMuted}
              uppercase
              style={styles.sectionLabel}
            >
              Probability
            </PixelText>
            <ProbabilityBar
              probabilityA={outcomeA.probability}
              probabilityB={outcomeB.probability}
              labelA={outcomeA.label}
              labelB={outcomeB.label}
              height={12}
              showLabels
            />
          </PixelCard>
        )}

        {/* Outcome Selector */}
        <PixelCard style={styles.outcomeCard}>
          <PixelText
            variant="heading"
            size="xs"
            color={colors.textMuted}
            uppercase
            style={styles.sectionLabel}
          >
            Pick an Outcome
          </PixelText>
          <OutcomeSelector
            outcomes={market.outcomes}
            selectedId={selectedOutcome?.id}
            onSelect={handleOutcomeSelect}
          />
        </PixelCard>

        {/* Event Info */}
        <PixelCard style={styles.infoCard}>
          <PixelText
            variant="heading"
            size="xs"
            color={colors.textMuted}
            uppercase
            style={styles.sectionLabel}
          >
            Details
          </PixelText>

          {market.end_date && (
            <View style={styles.infoRow}>
              <PixelText variant="body" size="sm" color={colors.textMuted}>
                Resolution
              </PixelText>
              <PixelText variant="body" size="sm" color={colors.foreground}>
                {formatDate(market.end_date)}
              </PixelText>
            </View>
          )}

          {market.volume > 0 && (
            <View style={styles.infoRow}>
              <PixelText variant="body" size="sm" color={colors.textMuted}>
                Volume
              </PixelText>
              <PixelText variant="body" size="sm" color={colors.foreground}>
                ${market.volume.toLocaleString()}
              </PixelText>
            </View>
          )}
        </PixelCard>

        {/* Spacer for bottom button */}
        <View style={{ height: spacing[20] }} />
      </ScrollView>

      {/* Action button */}
      {selectedOutcome && (
        <View style={styles.actionBar}>
          <PixelButton
            title={`Pick ${selectedOutcome.label} (${Math.round(selectedOutcome.probability * 100)}%)`}
            variant="gold"
            size="lg"
            onPress={handleAddBet}
            style={styles.actionButton}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  scrollContent: {
    paddingBottom: spacing[4],
  },
  imageContainer: {
    aspectRatio: 16 / 9,
    width: '100%',
    backgroundColor: colors.game.secondary + '50',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.game.primary,
  },
  section: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[2],
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: borderWidth.thin,
  },
  categoryBadge: {
    backgroundColor: colors.game.accent + '20',
    borderColor: colors.game.accent + '50',
  },
  subcategoryBadge: {
    backgroundColor: colors.card.bg,
    borderColor: colors.card.border,
  },
  statusBadge: {
    backgroundColor: colors.game.success + '20',
    borderColor: colors.game.success + '50',
  },
  probabilityCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
  },
  outcomeCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
  },
  infoCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
  },
  sectionLabel: {
    marginBottom: spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.card.border + '50',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.background + 'F0',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  actionButton: {
    width: '100%',
  },
});
