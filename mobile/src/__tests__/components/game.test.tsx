import './setup';
import React from 'react';
import { render } from '@testing-library/react-native';
import { DraftPicker } from '../../components/game/DraftPicker';
import { PackSprite } from '../../components/game/PackSprite';
import { WeeklyStats } from '../../components/game/WeeklyStats';
import { EventCard } from '../../components/game/EventCard';
import { ProgressDots } from '../../components/game/ProgressDots';
import { LeaderboardRow } from '../../components/game/LeaderboardRow';
import { ProfileStats } from '../../components/game/ProfileStats';
import type { Event } from '../../types';

// ─── Fixtures ────────────────────────────────────────────────

const mockEvent: Event = {
  id: 'event-1',
  venue: 'polymarket',
  title: 'Will BTC reach $100k?',
  outcome_a_label: 'Yes',
  outcome_b_label: 'No',
  outcome_a_probability: 0.65,
  outcome_b_probability: 0.35,
  category: 'crypto',
  subcategory: 'Bitcoin',
  status: 'active',
  is_featured: false,
  priority_score: 50,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockVsEvent: Event = {
  ...mockEvent,
  id: 'event-2',
  title: 'Lakers vs Warriors',
  outcome_a_label: 'Lakers',
  outcome_b_label: 'Warriors',
  outcome_a_probability: 0.45,
  outcome_b_probability: 0.55,
  category: 'sports',
  subcategory: 'NBA',
};

// ─── DraftPicker ─────────────────────────────────────────────

describe('DraftPicker', () => {
  it('renders event title for Yes/No market', () => {
    const { getByText } = render(
      <DraftPicker event={mockEvent} position={1} total={5} onPick={() => {}} />
    );
    expect(getByText('Will BTC reach $100k?')).toBeTruthy();
  });

  it('renders VS format for head-to-head markets', () => {
    const { getByText } = render(
      <DraftPicker event={mockVsEvent} position={1} total={5} onPick={() => {}} />
    );
    expect(getByText('Warriors vs Lakers')).toBeTruthy();
  });

  it('renders outcome buttons with labels', () => {
    const { getByText } = render(
      <DraftPicker event={mockEvent} position={1} total={5} onPick={() => {}} />
    );
    expect(getByText('Yes')).toBeTruthy();
    expect(getByText('No')).toBeTruthy();
  });

  it('renders position counter', () => {
    const { getByText } = render(
      <DraftPicker event={mockEvent} position={3} total={5} onPick={() => {}} />
    );
    expect(getByText('3/5')).toBeTruthy();
  });

  it('renders category badge', () => {
    const { getByText } = render(
      <DraftPicker event={mockEvent} position={1} total={5} onPick={() => {}} />
    );
    expect(getByText('Bitcoin')).toBeTruthy();
  });

  it('renders hint text', () => {
    const { getByText } = render(
      <DraftPicker event={mockEvent} position={1} total={5} onPick={() => {}} />
    );
    expect(getByText('Tap an outcome to pick')).toBeTruthy();
  });
});

// ─── PackSprite ──────────────────────────────────────────────

describe('PackSprite', () => {
  it('renders free pack variant', () => {
    const { getByText } = render(<PackSprite />);
    expect(getByText('P')).toBeTruthy();
  });

  it('renders premium pack variant', () => {
    const { getByText } = render(<PackSprite premium />);
    expect(getByText('$')).toBeTruthy();
    expect(getByText('PRO')).toBeTruthy();
  });

  it('renders with sm size', () => {
    const { toJSON } = render(<PackSprite size="sm" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with lg size', () => {
    const { toJSON } = render(<PackSprite size="lg" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders disabled state', () => {
    const { toJSON } = render(<PackSprite disabled />);
    expect(toJSON()).toBeTruthy();
  });
});

// ─── WeeklyStats ─────────────────────────────────────────────

describe('WeeklyStats', () => {
  it('renders stat values', () => {
    const { getByText } = render(
      <WeeklyStats
        totalPoints={150}
        packsOpened={12}
        correctPicks={8}
        totalPicks={15}
        currentStreak={3}
      />
    );
    expect(getByText('150')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
    expect(getByText('8')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('renders accuracy percentage', () => {
    const { getByText } = render(
      <WeeklyStats
        totalPoints={100}
        packsOpened={10}
        correctPicks={7}
        totalPicks={10}
        currentStreak={2}
      />
    );
    expect(getByText('70%')).toBeTruthy();
  });

  it('renders weekly rank when provided', () => {
    const { getByText } = render(
      <WeeklyStats
        totalPoints={200}
        packsOpened={20}
        correctPicks={15}
        totalPicks={20}
        currentStreak={5}
        weeklyRank={42}
      />
    );
    expect(getByText('#42')).toBeTruthy();
  });

  it('handles zero total picks gracefully', () => {
    const { getByText } = render(
      <WeeklyStats
        totalPoints={0}
        packsOpened={0}
        correctPicks={0}
        totalPicks={0}
        currentStreak={0}
      />
    );
    expect(getByText('0%')).toBeTruthy();
  });
});

// ─── EventCard ───────────────────────────────────────────────

describe('EventCard', () => {
  it('renders event title', () => {
    const { getByText } = render(
      <EventCard event={mockEvent} pickedOutcome="a" />
    );
    expect(getByText('Will BTC reach $100k?')).toBeTruthy();
  });

  it('renders picked outcome label', () => {
    const { getByText } = render(
      <EventCard event={mockEvent} pickedOutcome="a" />
    );
    expect(getByText('Yes')).toBeTruthy();
  });

  it('renders category badge', () => {
    const { getByText } = render(
      <EventCard event={mockEvent} pickedOutcome="b" />
    );
    expect(getByText('Bitcoin')).toBeTruthy();
  });

  it('renders result when showResult is true and correct', () => {
    const { getByText } = render(
      <EventCard
        event={mockEvent}
        pickedOutcome="a"
        isCorrect={true}
        pointsAwarded={2.5}
        showResult
      />
    );
    expect(getByText('CORRECT')).toBeTruthy();
  });

  it('renders WRONG when incorrect', () => {
    const { getByText } = render(
      <EventCard
        event={mockEvent}
        pickedOutcome="b"
        isCorrect={false}
        showResult
      />
    );
    expect(getByText('WRONG')).toBeTruthy();
  });
});

// ─── ProgressDots ────────────────────────────────────────────

describe('ProgressDots', () => {
  it('renders correct number of dots', () => {
    const { toJSON } = render(
      <ProgressDots total={5} current={2} completedCount={2} />
    );
    const tree = toJSON() as any;
    // The container View should have 5 child dot Views
    expect(tree.children).toHaveLength(5);
  });

  it('renders with different totals', () => {
    const { toJSON } = render(
      <ProgressDots total={3} current={0} completedCount={0} />
    );
    const tree = toJSON() as any;
    expect(tree.children).toHaveLength(3);
  });

  it('renders without crashing at boundaries', () => {
    const { toJSON } = render(
      <ProgressDots total={1} current={0} completedCount={0} />
    );
    expect(toJSON()).toBeTruthy();
  });
});

// ─── LeaderboardRow ──────────────────────────────────────────

describe('LeaderboardRow', () => {
  it('renders rank, name, and points', () => {
    const { getByText } = render(
      <LeaderboardRow
        rank={1}
        displayName="Player1"
        totalPoints={250.5}
        packsOpened={20}
        accuracy={0.8}
      />
    );
    expect(getByText('1')).toBeTruthy();
    expect(getByText('Player1')).toBeTruthy();
    expect(getByText('250.5')).toBeTruthy();
  });

  it('renders rank change indicator (up)', () => {
    const { getByText } = render(
      <LeaderboardRow
        rank={2}
        displayName="Climber"
        totalPoints={200}
        packsOpened={15}
        accuracy={0.7}
        previousRank={5}
      />
    );
    // rank 2, previousRank 5: rank < previousRank => up arrow
    expect(getByText('\u2191')).toBeTruthy();
  });

  it('renders rank change indicator (down)', () => {
    const { getByText } = render(
      <LeaderboardRow
        rank={5}
        displayName="Dropper"
        totalPoints={100}
        packsOpened={10}
        accuracy={0.5}
        previousRank={2}
      />
    );
    expect(getByText('\u2193')).toBeTruthy();
  });

  it('renders rank change indicator (no change)', () => {
    const { getByText } = render(
      <LeaderboardRow
        rank={3}
        displayName="Stable"
        totalPoints={150}
        packsOpened={12}
        accuracy={0.6}
        previousRank={3}
      />
    );
    expect(getByText('\u2014')).toBeTruthy();
  });

  it('renders current user indicator', () => {
    const { getByText } = render(
      <LeaderboardRow
        rank={1}
        displayName="Me"
        totalPoints={300}
        packsOpened={25}
        accuracy={0.9}
        isCurrentUser
      />
    );
    expect(getByText(' (You)')).toBeTruthy();
  });
});

// ─── ProfileStats ────────────────────────────────────────────

describe('ProfileStats', () => {
  it('renders stat grid with labels and values', () => {
    const stats = [
      { label: 'Points', value: '1,250' },
      { label: 'Packs', value: '42' },
      { label: 'Accuracy', value: '78%' },
      { label: 'Streak', value: '5' },
    ];

    const { getByText } = render(<ProfileStats stats={stats} />);
    expect(getByText('Points')).toBeTruthy();
    expect(getByText('1,250')).toBeTruthy();
    expect(getByText('Packs')).toBeTruthy();
    expect(getByText('42')).toBeTruthy();
    expect(getByText('Accuracy')).toBeTruthy();
    expect(getByText('78%')).toBeTruthy();
    expect(getByText('Streak')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('renders empty stats array', () => {
    const { toJSON } = render(<ProfileStats stats={[]} />);
    expect(toJSON()).toBeTruthy();
  });
});
