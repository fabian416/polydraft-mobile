import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { PixelText, PixelButton, PixelCard } from '../components/common';
import { EventCard } from '../components/game/EventCard';
import { useStoredPack } from '../stores/myPacks';
import { colors, spacing, borderRadius } from '../lib/theme';
import type { PackStackParamList, RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<PackStackParamList & RootStackParamList, 'PackDetail'>;
type DetailRoute = RouteProp<PackStackParamList, 'PackDetail'>;

export function PackDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<DetailRoute>();
  const { packId } = route.params;

  const storedPack = useStoredPack(packId);

  if (!storedPack) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <PixelText variant="body" size="lg" color={colors.textMuted}>
            Pack not found
          </PixelText>
          <PixelButton
            title="Back to Game"
            variant="outline"
            onPress={() => navigation.getParent()?.navigate('MainTabs', { screen: 'Game' })}
            style={styles.backButton}
          />
        </View>
      </ScreenContainer>
    );
  }

  const picks = [...storedPack.picks].sort((a, b) => a.position - b.position);
  const totalPoints = picks.reduce((sum, p) => sum + (p.points_awarded || 0), 0);
  const correctCount = picks.filter((p) => p.is_correct).length;
  const accuracy = picks.length > 0 ? Math.round((correctCount / picks.length) * 100) : 0;

  const openedDate = new Date(storedPack.pack.opened_at);
  const dateStr = openedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Pack Header */}
        <View style={styles.header}>
          <PixelText variant="heading" size="lg" color={colors.game.gold}>
            PACK RESULTS
          </PixelText>
          <PixelText variant="body" size="base" color={colors.textMuted}>
            {dateStr}
          </PixelText>
        </View>

        {/* Stats Summary */}
        <PixelCard variant="gold" style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <PixelText variant="body" size="3xl" color={colors.game.gold}>
                ${totalPoints.toFixed(2)}
              </PixelText>
              <PixelText variant="body" size="base" color={colors.textMuted}>
                USD WON
              </PixelText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <PixelText variant="body" size="3xl" color={colors.game.success}>
                {correctCount}/{picks.length}
              </PixelText>
              <PixelText variant="body" size="base" color={colors.textMuted}>
                CORRECT
              </PixelText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <PixelText variant="body" size="3xl">
                {accuracy}%
              </PixelText>
              <PixelText variant="body" size="base" color={colors.textMuted}>
                ACCURACY
              </PixelText>
            </View>
          </View>
        </PixelCard>

        {/* Picks List */}
        <View style={styles.picksSection}>
          <PixelText variant="heading" size="sm" style={styles.sectionTitle}>
            YOUR PICKS
          </PixelText>

          {picks.map((pick) => (
            <EventCard
              key={pick.id}
              event={pick.event}
              pickedOutcome={pick.picked_outcome}
              isCorrect={pick.is_resolved ? pick.is_correct : null}
              pointsAwarded={pick.points_awarded}
              showResult={pick.is_resolved}
            />
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <PixelButton
            title="Back to Game"
            variant="gold"
            onPress={() => navigation.getParent()?.navigate('MainTabs', { screen: 'Game' })}
            style={styles.actionButton}
          />
          <PixelButton
            title="My Packs"
            variant="outline"
            onPress={() => navigation.getParent()?.navigate('MyPacks')}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  backButton: {
    marginTop: spacing[4],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  statsCard: {
    marginBottom: spacing[6],
    alignItems: 'center',
    paddingVertical: spacing[5],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.card.border,
  },
  picksSection: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  actions: {
    gap: spacing[3],
  },
  actionButton: {
    width: '100%',
  },
});
