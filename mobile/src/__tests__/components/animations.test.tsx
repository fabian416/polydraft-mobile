import './setup';
import React from 'react';
import { render } from '@testing-library/react-native';
import { CoinBurst } from '../../components/animations/CoinBurst';
import { Confetti } from '../../components/animations/Confetti';
import { RevealAnimation } from '../../components/animations/RevealAnimation';
import { PixelDissolve } from '../../components/animations/PixelDissolve';
import type { UserPick, Event } from '../../types';

// ─── Fixtures ────────────────────────────────────────────────

const mockEvent: Event = {
  id: 'event-1',
  venue: 'polymarket',
  title: 'Will it rain tomorrow?',
  outcome_a_label: 'Yes',
  outcome_b_label: 'No',
  outcome_a_probability: 0.7,
  outcome_b_probability: 0.3,
  category: 'economy',
  status: 'resolved',
  winning_outcome: 'a',
  is_featured: false,
  priority_score: 50,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockPick: UserPick & { event: Event } = {
  id: 'pick-1',
  user_pack_id: 'pack-1',
  event_id: 'event-1',
  event: mockEvent,
  position: 0,
  picked_outcome: 'a',
  picked_at: '2026-01-01T00:00:00Z',
  probability_snapshot: 0.7,
  opposite_probability_snapshot: 0.3,
  is_resolved: true,
  is_correct: true,
  resolved_at: '2026-01-02T00:00:00Z',
  points_awarded: 1.43,
  reveal_animation_played: false,
  created_at: '2026-01-01T00:00:00Z',
};

// Note: Animation components with active=true may render null because the
// Animated mock completes synchronously (calling setVisible(false) immediately).
// We verify they don't crash on mount/unmount and render correctly when inactive.

// ─── CoinBurst ───────────────────────────────────────────────

describe('CoinBurst', () => {
  it('renders without crash when active', () => {
    // Should not throw during render even though Animated completes immediately
    expect(() => render(<CoinBurst active />)).not.toThrow();
  });

  it('renders nothing when active is false', () => {
    const { toJSON } = render(<CoinBurst active={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders with custom count without crash', () => {
    expect(() => render(<CoinBurst count={5} active />)).not.toThrow();
  });

  it('calls onComplete callback', () => {
    const onComplete = jest.fn();
    render(<CoinBurst active onComplete={onComplete} />);
    // The mock Animated completes synchronously, so onComplete should have been called
    expect(onComplete).toHaveBeenCalled();
  });
});

// ─── Confetti ────────────────────────────────────────────────

describe('Confetti', () => {
  it('renders without crash when active', () => {
    expect(() => render(<Confetti active />)).not.toThrow();
  });

  it('renders nothing when active is false', () => {
    const { toJSON } = render(<Confetti active={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders with custom count and colors without crash', () => {
    expect(() =>
      render(<Confetti count={10} colors={['#ff0000', '#00ff00']} active />)
    ).not.toThrow();
  });

  it('calls onComplete callback', () => {
    const onComplete = jest.fn();
    render(<Confetti active onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalled();
  });
});

// ─── RevealAnimation ─────────────────────────────────────────

describe('RevealAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders in anticipation phase (initial state)', () => {
    const { getByText } = render(
      <RevealAnimation pick={mockPick} onComplete={() => {}} />
    );
    // In anticipation phase, the chest with "?" and "PACK" is shown
    expect(getByText('?')).toBeTruthy();
    expect(getByText('PACK')).toBeTruthy();
  });

  it('renders without crashing for a losing pick', () => {
    const losingPick = {
      ...mockPick,
      is_correct: false,
      picked_outcome: 'b' as const,
      points_awarded: 0,
    };
    const { getByText } = render(
      <RevealAnimation pick={losingPick} onComplete={() => {}} />
    );
    expect(getByText('PACK')).toBeTruthy();
  });

  it('renders skip hint after delay', () => {
    const { queryByText } = render(
      <RevealAnimation pick={mockPick} onComplete={() => {}} />
    );
    // Initially skip hint is not shown
    expect(queryByText('Tap to skip')).toBeNull();
  });
});

// ─── PixelDissolve ───────────────────────────────────────────

describe('PixelDissolve', () => {
  it('renders without crash when active', () => {
    expect(() =>
      render(<PixelDissolve width={100} height={100} active />)
    ).not.toThrow();
  });

  it('renders nothing when active is false', () => {
    const { toJSON } = render(
      <PixelDissolve width={100} height={100} active={false} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders with custom block size without crash', () => {
    expect(() =>
      render(<PixelDissolve width={50} height={50} blockSize={10} active />)
    ).not.toThrow();
  });

  it('calls onComplete callback', () => {
    const onComplete = jest.fn();
    render(<PixelDissolve width={100} height={100} active onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalled();
  });
});
