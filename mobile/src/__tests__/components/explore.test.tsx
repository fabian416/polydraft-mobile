import './setup';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ExploreCard } from '../../components/explore/ExploreCard';
import { CategoryFilter } from '../../components/explore/CategoryFilter';
import { OutcomeSelector } from '../../components/explore/OutcomeSelector';
import { ProbabilityBar } from '../../components/explore/ProbabilityBar';
import type { ExploreMarket, ExploreOutcome } from '../../types';

// ─── Fixtures ────────────────────────────────────────────────

const mockMarket: ExploreMarket = {
  id: 'market-1',
  title: 'Will ETH flip BTC?',
  category: 'crypto',
  volume: 500000,
  end_date: '2026-12-31T00:00:00Z',
  outcomes: [
    { id: 'o1', label: 'Yes', probability: 0.35, clob_id: 'c1' },
    { id: 'o2', label: 'No', probability: 0.65, clob_id: 'c2' },
  ],
  is_binary: true,
  status: 'active',
};

const mockOutcomes: ExploreOutcome[] = [
  { id: 'oa', label: 'Team Alpha', probability: 0.6, clob_id: 'ca' },
  { id: 'ob', label: 'Team Beta', probability: 0.4, clob_id: 'cb' },
];

// ─── ExploreCard ─────────────────────────────────────────────

describe('ExploreCard', () => {
  it('renders market title', () => {
    const { getByText } = render(
      <ExploreCard market={mockMarket} onPress={() => {}} />
    );
    expect(getByText('Will ETH flip BTC?')).toBeTruthy();
  });

  it('renders category badge', () => {
    const { getByText } = render(
      <ExploreCard market={mockMarket} onPress={() => {}} />
    );
    // PixelText uses uppercase prop via textTransform style, raw text is lowercase
    expect(getByText('crypto')).toBeTruthy();
  });

  it('renders probability percentages', () => {
    const { getByText } = render(
      <ExploreCard market={mockMarket} onPress={() => {}} />
    );
    expect(getByText('35%')).toBeTruthy();
    expect(getByText('65%')).toBeTruthy();
  });

  it('renders without crashing when market has no image', () => {
    const { toJSON } = render(
      <ExploreCard market={mockMarket} onPress={() => {}} />
    );
    expect(toJSON()).toBeTruthy();
  });
});

// ─── CategoryFilter ──────────────────────────────────────────

describe('CategoryFilter', () => {
  it('renders category labels', () => {
    const { getByText } = render(
      <CategoryFilter selected="all" onSelect={() => {}} />
    );
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Sports')).toBeTruthy();
    expect(getByText('Politics')).toBeTruthy();
    expect(getByText('Crypto')).toBeTruthy();
    expect(getByText('Economy')).toBeTruthy();
    expect(getByText('Entertainment')).toBeTruthy();
  });

  it('fires onSelect when category is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <CategoryFilter selected="all" onSelect={onSelect} />
    );
    fireEvent.press(getByText('Sports'));
    expect(onSelect).toHaveBeenCalledWith('sports');
  });

  it('fires onSelect with crypto key', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <CategoryFilter selected="all" onSelect={onSelect} />
    );
    fireEvent.press(getByText('Crypto'));
    expect(onSelect).toHaveBeenCalledWith('crypto');
  });
});

// ─── OutcomeSelector ─────────────────────────────────────────

describe('OutcomeSelector', () => {
  it('renders A and B option labels', () => {
    const { getByText } = render(
      <OutcomeSelector outcomes={mockOutcomes} onSelect={() => {}} />
    );
    expect(getByText('Team Alpha')).toBeTruthy();
    expect(getByText('Team Beta')).toBeTruthy();
  });

  it('renders probability percentages', () => {
    const { getByText } = render(
      <OutcomeSelector outcomes={mockOutcomes} onSelect={() => {}} />
    );
    expect(getByText('60%')).toBeTruthy();
    expect(getByText('40%')).toBeTruthy();
  });

  it('renders VS separator', () => {
    const { getByText } = render(
      <OutcomeSelector outcomes={mockOutcomes} onSelect={() => {}} />
    );
    expect(getByText('VS')).toBeTruthy();
  });

  it('fires onSelect when an option is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <OutcomeSelector outcomes={mockOutcomes} onSelect={onSelect} />
    );
    fireEvent.press(getByText('Team Alpha'));
    expect(onSelect).toHaveBeenCalledWith(mockOutcomes[0]);
  });

  it('returns null when fewer than 2 outcomes', () => {
    const { toJSON } = render(
      <OutcomeSelector
        outcomes={[mockOutcomes[0]]}
        onSelect={() => {}}
      />
    );
    expect(toJSON()).toBeNull();
  });
});

// ─── ProbabilityBar ──────────────────────────────────────────

describe('ProbabilityBar', () => {
  it('renders with correct percentages and labels', () => {
    const { getByText } = render(
      <ProbabilityBar
        probabilityA={0.6}
        probabilityB={0.4}
        labelA="Yes"
        labelB="No"
      />
    );
    expect(getByText('Yes 60%')).toBeTruthy();
    expect(getByText('40% No')).toBeTruthy();
  });

  it('renders without labels when showLabels is false', () => {
    const { queryByText } = render(
      <ProbabilityBar
        probabilityA={0.7}
        probabilityB={0.3}
        labelA="Yes"
        labelB="No"
        showLabels={false}
      />
    );
    expect(queryByText('Yes 70%')).toBeNull();
    expect(queryByText('30% No')).toBeNull();
  });

  it('renders with default labels when none provided', () => {
    const { getByText } = render(
      <ProbabilityBar probabilityA={0.5} probabilityB={0.5} />
    );
    expect(getByText('A 50%')).toBeTruthy();
    expect(getByText('50% B')).toBeTruthy();
  });

  it('renders with custom height', () => {
    const { toJSON } = render(
      <ProbabilityBar probabilityA={0.8} probabilityB={0.2} height={12} />
    );
    expect(toJSON()).toBeTruthy();
  });
});
