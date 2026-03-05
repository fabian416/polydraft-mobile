/**
 * Sequential Resolution Logic (Mobile)
 *
 * Manages the sequential reveal of pack results.
 * Cards must be revealed in order (1 -> 2 -> 3 -> 4 -> 5),
 * regardless of when events actually resolved.
 */

import type { UserPack, UserPick } from '../../types';

// ============================================
// Types
// ============================================

export interface RevealStatus {
  canRevealNext: boolean;
  nextRevealPosition: number | null;
  nextPick: UserPick | null;
  pendingPositions: number[];
  isFullyRevealed: boolean;
  revealedCount: number;
  resolvedCount: number;
}

export interface RevealResult {
  position: number;
  isCorrect: boolean;
  pointsAwarded: number;
  isPackComplete: boolean;
  totalPoints: number;
  correctCount: number;
}

// ============================================
// Core Logic
// ============================================

export function getRevealStatus(pack: UserPack): RevealStatus {
  const picks = pack.picks ?? [];
  const currentIndex = pack.current_reveal_index;

  const sortedPicks = [...picks].sort((a, b) => a.position - b.position);

  const revealedCount = sortedPicks.filter((p) => p.reveal_animation_played).length;
  const resolvedCount = sortedPicks.filter((p) => p.is_resolved).length;

  const pendingPositions = sortedPicks
    .filter((p) => !p.is_resolved)
    .map((p) => p.position);

  const isFullyRevealed = revealedCount >= picks.length;

  if (isFullyRevealed) {
    return {
      canRevealNext: false,
      nextRevealPosition: null,
      nextPick: null,
      pendingPositions,
      isFullyRevealed: true,
      revealedCount,
      resolvedCount,
    };
  }

  const nextPick = sortedPicks[currentIndex];

  if (!nextPick) {
    return {
      canRevealNext: false,
      nextRevealPosition: null,
      nextPick: null,
      pendingPositions,
      isFullyRevealed: false,
      revealedCount,
      resolvedCount,
    };
  }

  const canRevealNext = nextPick.is_resolved && !nextPick.reveal_animation_played;

  return {
    canRevealNext,
    nextRevealPosition: canRevealNext ? nextPick.position : null,
    nextPick: canRevealNext ? nextPick : null,
    pendingPositions,
    isFullyRevealed: false,
    revealedCount,
    resolvedCount,
  };
}

export function canRevealPosition(pack: UserPack, position: number): boolean {
  const picks = pack.picks ?? [];
  const currentIndex = pack.current_reveal_index;

  if (position !== currentIndex + 1) return false;

  const pick = picks.find((p) => p.position === position);
  if (!pick) return false;

  return pick.is_resolved && !pick.reveal_animation_played;
}

export function getQueuedReveals(pack: UserPack): UserPick[] {
  const picks = pack.picks ?? [];
  return [...picks]
    .sort((a, b) => a.position - b.position)
    .filter((pick) => !pick.reveal_animation_played && pick.is_resolved);
}

export function calculatePackTotals(picks: UserPick[]): {
  totalPoints: number;
  correctCount: number;
  resolvedCount: number;
} {
  const resolvedPicks = picks.filter((p) => p.is_resolved);
  return {
    totalPoints: resolvedPicks.reduce((sum, p) => sum + p.points_awarded, 0),
    correctCount: resolvedPicks.filter((p) => p.is_correct).length,
    resolvedCount: resolvedPicks.length,
  };
}

export function getPackStatusMessage(pack: UserPack): string {
  const status = getRevealStatus(pack);

  if (status.isFullyRevealed) {
    const totals = calculatePackTotals(pack.picks ?? []);
    return `Pack complete! ${totals.correctCount}/5 correct`;
  }

  if (status.canRevealNext) {
    return `Ready to reveal card ${status.nextRevealPosition}!`;
  }

  if (status.pendingPositions.length > 0) {
    const nextPending = Math.min(...status.pendingPositions);
    return `Waiting for event ${nextPending} to resolve...`;
  }

  return `${status.revealedCount}/5 revealed`;
}

export function formatRevealProgress(pack: UserPack): {
  label: string;
  resolved: number;
  revealed: number;
  total: number;
  percentage: number;
} {
  const picks = pack.picks ?? [];
  const total = picks.length;
  const resolved = picks.filter((p) => p.is_resolved).length;
  const revealed = picks.filter((p) => p.reveal_animation_played).length;
  const percentage = total > 0 ? Math.round((revealed / total) * 100) : 0;

  return { label: `${revealed}/${total}`, resolved, revealed, total, percentage };
}
