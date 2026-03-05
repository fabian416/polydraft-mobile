// Barrel exports for all Zustand stores

export {
  useCurrentPackStore,
  useCurrentPack,
  usePackEvents,
  useDraftPicks,
  useIsDraftComplete,
  useRevealQueue,
  usePickCount,
  useCanSubmitDraft,
  useNextRevealablePick,
  useIsPackFullyResolved,
} from './currentPack';

export {
  useMyPacksStore,
  useMyPacks,
  usePackOrder,
  usePackSummaries,
  useTotalPendingReveals,
  useActivePacksCount,
  useStoredPack,
  useActivePickPreviews,
} from './myPacks';
export type {
  StoredPack,
  PickPreview,
  PackStatus,
  PackSummary,
  ActivePickPreview,
} from './myPacks';

export {
  useExploreStore,
  useExploreMarkets,
  useSelectedExploreEvent,
  useCurrentOutcomeIndex,
  usePendingBets,
  useIsLoadingMarkets,
  useCurrentOutcome,
  useOutcomeProgress,
  useHasPendingBetForOutcome,
} from './explore';

export {
  useSessionStore,
  useAnonymousId,
  useProfileId,
  useUserId,
  useIsAuthenticated,
  useIsProfileSynced,
  useProfile,
} from './session';

export {
  useWalletAuthStore,
} from './walletAuth';
