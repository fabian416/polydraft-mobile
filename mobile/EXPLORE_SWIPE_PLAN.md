# Explore Swipe Flow - Implementation Plan

## 1. Current State Analysis

### Data Model

**`events` table** (Supabase)
- Core event fields: `id`, `title`, `description`, `image_url`, `category`, `subcategory`, `status`, `volume`
- Binary outcome fields: `outcome_a_label`, `outcome_a_probability`, `outcome_b_label`, `outcome_b_probability`
- Optional draw: `supports_draw`, `outcome_draw_label`, `outcome_draw_probability`
- Metadata: `is_featured`, `priority_score`, `venue`, `polymarket_market_id`

**`explore_outcomes` table** (Supabase, joined via `event_id`)
- `id`, `event_id`, `label`, `probability`, `image_url`, `image_slug`, `clob_id`, `ticker`
- This is the key table for multi-outcome events (e.g., 5+ candidates for a presidential nomination)

**`ExploreMarket` type** (`src/types/index.ts`)
- Wraps event + outcomes: `outcomes: ExploreOutcome[]` (can be 2, 3, 5, 10+ items)
- `is_binary`: true when exactly 2 outcomes and labels are Yes/No
- `status`: `'active' | 'closed' | 'resolved'`

**`ExploreOutcome` type**
- `id`, `label`, `probability`, `image_url`, `image_slug`, `clob_id`, `ticker`

### What Already Exists

**Zustand Store** (`src/stores/explore.ts`)
- Already has `currentOutcomeIndex`, `nextOutcome()`, `prevOutcome()`, `setOutcomeIndex()`
- Already has `useCurrentOutcome()` and `useOutcomeProgress()` selectors
- Already has `pendingBets: PendingBet[]` with `addPendingBet()`, `removePendingBet()`
- The store is ready for multi-outcome cycling -- it just isn't used by the UI yet

**ExploreService** (`src/lib/api/ExploreService.ts`)
- `getMarkets()` fetches events with `explore_outcomes(*)` join, ordered by volume desc
- `getMarketById()` fetches a single event with all outcomes
- `transformEventToExploreMarket()` maps DB rows to `ExploreMarket` (handles fallback to binary)

**EventDetailScreen** (`src/screens/EventDetailScreen.tsx`)
- Shows ONE card per event (the event itself, not individual outcomes)
- Has YES/NO/PASS buttons -- but they currently mean:
  - YES/NO: opens `BetModal` for outcome A or B (hardcoded binary assumption)
  - PASS: calls `navigation.goBack()` (exits back to grid)
- `BetModal` already handles: wallet connect, USDC amount selection ($2/$5/$10/$25), transaction signing
- Card has entrance animation (scale + opacity spring)

**ExploreScreen** (`src/screens/ExploreScreen.tsx`)
- 2-column FlatList grid of `ExploreCard` components
- Navigates to `EventDetail` with `{ eventId: market.id }`
- Has search, category filter, pagination

**ExploreCard** (`src/components/explore/ExploreCard.tsx`)
- Shows thumbnail + title + 2-outcome probability bar
- Only displays first 2 outcomes (binary assumption)

**ProgressDots** (`src/components/game/ProgressDots.tsx`)
- Already exists for pack reveal flow: `total`, `current`, `completedCount` props
- Pulsing gold dot for current, green for completed, gray for pending
- Can be reused directly for outcome dot indicators

**Gesture/Animation Libraries Available** (`package.json`)
- `react-native-gesture-handler` v2.30.0 (installed)
- `react-native-reanimated` v4.2.1 (installed)
- `react-native-worklets` v0.7.2 (installed)
- These are perfect for the swipe gestures -- no new dependencies needed

### Current Navigation Flow
```
ExploreScreen (grid) --tap card--> EventDetail (single event card, YES/NO/PASS)
                                          PASS --> goBack() to grid
```

---

## 2. Target UX Flow (Tinder-like)

### New Flow
```
ExploreScreen (grid) --tap card--> EventDetail (card-swipe mode)
                                     |
                                     |- Shows outcome 1/N for Event A as a card
                                     |- Card displays: event image, event title, outcome label, probability
                                     |- Dot indicators at bottom: [*] [ ] [ ] [ ] [ ]  (1/5)
                                     |
                                     |- YES button --> BetModal (bet FOR this outcome)
                                     |- NO button  --> BetModal (bet AGAINST this outcome)
                                     |- PASS (swipe down / tap) --> animate card out, show outcome 2/N
                                     |
                                     |- After all outcomes viewed for Event A:
                                     |    --> auto-advance to Event B (next event in the markets list)
                                     |    --> or show "No more events" card
                                     |
                                     |- Back button --> return to grid
```

### Card Content (per outcome)
```
+----------------------------------+
|  [Event Image - 16:9 ratio]      |
|  [CATEGORY badge]     [LIVE]     |
+----------------------------------+
|                                  |
|  "Democratic Presidential        |
|   Nominee 2028"                  |
|                                  |
|  ┌────────────────────────┐      |
|  │  [Candidate Image]     │      |
|  │  GAVIN NEWSOM           │      |
|  │  30%                    │      |
|  └────────────────────────┘      |
|                                  |
|  Vol: $1,234,567                 |
+----------------------------------+
      * * * * *    (4/5 dots)

     [NO]  [PASS]  [YES]
```

### Swipe Gestures
- **Swipe Down** (vertical) = PASS = next outcome (same as tapping PASS button)
- Card animates downward off-screen, next outcome card enters from top with spring
- Optional: swipe right = YES, swipe left = NO (stretch goal)

---

## 3. Detailed Implementation Plan

### 3.1 Extend the Explore Store

**File**: `src/stores/explore.ts`

Add fields/actions for multi-event queue navigation:

```ts
// New state fields
currentEventIndex: number;          // index into the markets[] array for swipe mode
swipeModeEventIds: string[];        // ordered list of event IDs for swipe-through

// New actions
setSwipeModeEvents: (ids: string[]) => void;
nextEvent: () => void;              // advance to next event (after all outcomes viewed)
setCurrentEventIndex: (index: number) => void;
```

The existing `nextOutcome()` already increments `currentOutcomeIndex` and clamps. We need to modify it (or add logic in the screen) so that when `currentOutcomeIndex` reaches the last outcome and PASS is pressed, it calls `nextEvent()`.

### 3.2 Update Navigation Types

**File**: `src/navigation/types.ts`

Change `EventDetail` params to support swipe mode:

```ts
EventDetail: {
  eventId: string;
  // Optional: start in swipe mode with the full event queue
  swipeMode?: boolean;
  startEventIndex?: number;
};
```

### 3.3 Rewrite EventDetailScreen for Outcome-Level Cards

**File**: `src/screens/EventDetailScreen.tsx`

This is the primary change. The screen must:

1. **Load all events up front** (or receive them from the store) when in swipe mode
2. **Track current event + current outcome** within that event
3. **Render the card** for ONE outcome at a time (not the whole event)
4. **Handle PASS** to cycle to next outcome, then next event
5. **Handle YES/NO** to open BetModal scoped to the current outcome
6. **Show dot indicators** for outcomes within the current event
7. **Animate transitions** between outcomes (swipe down / fade)

#### Key Changes

**Card rendering** -- currently shows `market.title` and a ProbabilityBar for 2 outcomes. Change to show:
- Event image + title (header, stays same)
- Single outcome card: outcome label, outcome probability, outcome image (if available)
- Replace ProbabilityBar with a single large probability display for the focused outcome

**PASS button behavior** -- currently calls `navigation.goBack()`. Change to:
```ts
const handlePass = () => {
  const { selectedEvent, currentOutcomeIndex, nextOutcome } = useExploreStore.getState();
  if (!selectedEvent) return;

  const isLastOutcome = currentOutcomeIndex >= selectedEvent.outcomes.length - 1;

  if (isLastOutcome) {
    // Move to next event
    advanceToNextEvent();
  } else {
    // Animate current card out, advance outcome index
    animateCardOut(() => {
      nextOutcome();
      animateCardIn();
    });
  }
};
```

**YES/NO buttons** -- currently hardcode outcome A/B. Change to use `currentOutcome`:
```ts
const handleYes = () => {
  const outcome = useExploreStore.getState().currentOutcome; // from selector
  setBetDirection('yes');
  setCurrentBetOutcome(outcome);
  setModalVisible(true);
};
```

**BetModal** -- currently derives outcome from `market.outcomes[0]` or `[1]` based on direction. Change to accept the specific outcome being bet on:
```ts
// BetModal props change
interface BetModalProps {
  visible: boolean;
  direction: BetDirection;
  market: ExploreMarket;
  outcome: ExploreOutcome;  // NEW: the specific outcome
  onClose: () => void;
}
```

### 3.4 Add Swipe Gesture Handler

**File**: `src/screens/EventDetailScreen.tsx` (inline, or extract to a component)

Use `react-native-gesture-handler` + `react-native-reanimated` for the swipe:

```ts
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

// In the component:
const translateY = useSharedValue(0);
const cardOpacity = useSharedValue(1);

const panGesture = Gesture.Pan()
  .onUpdate((e) => {
    // Only track downward swipes
    if (e.translationY > 0) {
      translateY.value = e.translationY;
      cardOpacity.value = 1 - (e.translationY / SCREEN_HEIGHT) * 0.5;
    }
  })
  .onEnd((e) => {
    if (e.translationY > SWIPE_THRESHOLD) {
      // Fling card down and advance
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
        runOnJS(handlePass)();
        translateY.value = -SCREEN_HEIGHT * 0.3; // position new card above
        translateY.value = withSpring(0);         // spring in from top
        cardOpacity.value = withTiming(1);
      });
    } else {
      // Snap back
      translateY.value = withSpring(0);
      cardOpacity.value = withTiming(1);
    }
  });

const animatedCardStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: translateY.value }],
  opacity: cardOpacity.value,
}));
```

### 3.5 Add Outcome Dot Indicator Component

**File**: `src/components/explore/OutcomeDots.tsx` (new file)

Reuse the pattern from `ProgressDots.tsx` but adapted for outcomes:

```ts
interface OutcomeDotsProps {
  total: number;
  current: number;     // 0-indexed
  bettedIndices?: number[];  // indices where user placed a bet
}
```

- Current dot: gold, pulsing (same as ProgressDots)
- Betted dot: green (user placed YES/NO bet on this outcome)
- Unseen dot: gray
- Seen/passed dot: slightly lighter gray

Display format: dots in a row, with "3/5" text label below or beside.

### 3.6 Update BetModal for Specific Outcome

**File**: `src/screens/EventDetailScreen.tsx` (BetModal is defined inline)

Changes:
- Accept `outcome: ExploreOutcome` as a prop instead of deriving from `market.outcomes[0/1]`
- The `direction` prop now means: YES = "I think this outcome wins", NO = "I think this outcome loses"
- Display the outcome label prominently: "GAVIN NEWSOM - 30%"
- After successful bet, record which outcome was betted on (update store)
- After closing modal, stay on the same outcome card (user can then PASS to next)

### 3.7 Handle Event Queue Navigation

**File**: `src/screens/EventDetailScreen.tsx`

When all outcomes for an event are exhausted (user hit PASS on the last one), advance to next event:

```ts
const advanceToNextEvent = () => {
  const { markets } = useExploreStore.getState();
  const currentIdx = markets.findIndex(m => m.id === market.id);

  if (currentIdx < markets.length - 1) {
    const nextMarket = markets[currentIdx + 1];
    // Reset outcome index and load next event
    selectEvent(nextMarket);
    // Optionally: navigation.replace('EventDetail', { eventId: nextMarket.id });
  } else {
    // No more events -- show end card or go back to grid
    navigation.goBack();
  }
};
```

**Alternative approach**: Instead of using `navigation.replace`, keep the same screen mounted and swap the `market` state. This avoids navigation transitions and feels more like Tinder (continuous swiping within one screen).

**Recommended**: Keep single screen mounted, swap market data. The screen manages its own `currentEvent` + `currentOutcomeIndex` state (sourced from the Zustand store).

### 3.8 Update ExploreScreen Navigation

**File**: `src/screens/ExploreScreen.tsx`

When user taps a card, enter swipe mode starting from that event:

```ts
const handleCardPress = useCallback(
  (market: ExploreMarket) => {
    // Store all market IDs for swipe-through
    const eventIds = filteredMarkets.map(m => m.id);
    const startIndex = eventIds.indexOf(market.id);
    setSwipeModeEvents(eventIds);
    setCurrentEventIndex(startIndex >= 0 ? startIndex : 0);
    navigation.navigate('EventDetail', {
      eventId: market.id,
      swipeMode: true,
      startEventIndex: startIndex,
    });
  },
  [navigation, filteredMarkets]
);
```

---

## 4. Data Flow

### Fetching
```
ExploreScreen loads markets via getMarkets()
  -> events + explore_outcomes join
  -> Each ExploreMarket has N outcomes

User taps event card
  -> Navigate to EventDetail with eventId
  -> EventDetail calls getMarketById(eventId) to get full outcome list
  -> Store: selectEvent(market) resets currentOutcomeIndex to 0
```

### Cycling Through Outcomes
```
Store state:
  selectedEvent: ExploreMarket (has .outcomes[])
  currentOutcomeIndex: number

PASS pressed:
  if currentOutcomeIndex < outcomes.length - 1:
    nextOutcome() -> currentOutcomeIndex++
  else:
    advanceToNextEvent() -> load next market from markets[], reset index to 0

YES/NO pressed:
  Open BetModal with outcomes[currentOutcomeIndex]
  On bet placed: addPendingBet({ marketId, outcomeId, ... })
  Stay on current outcome (user can PASS after)
```

### Event Preloading
For smooth transitions between events, prefetch the next event's data:
```ts
useEffect(() => {
  const { markets } = useExploreStore.getState();
  const nextIdx = markets.findIndex(m => m.id === market.id) + 1;
  if (nextIdx < markets.length) {
    // Prefetch silently
    getMarketById(markets[nextIdx].id);
  }
}, [market.id]);
```

---

## 5. Integration Points

### BetModal + Solana Payment (no changes needed to payment flow)
- `buildUsdcTransferTransaction(publicKey, amountInBaseUnits)` remains the same
- `sendAndConfirmTransfer(signedTx, blockhash, height)` remains the same
- Only change: BetModal receives the specific `ExploreOutcome` instead of deriving it from direction

### WalletProvider (no changes needed)
- `useWallet()` hook provides `connect`, `signTransaction`, `publicKey` as before

### Existing Store Actions (mostly reused)
- `nextOutcome()` / `prevOutcome()` -- already in the store
- `addPendingBet()` -- already in the store
- `useCurrentOutcome()` selector -- already in the store
- `useOutcomeProgress()` selector -- already returns `{ current, total }`

---

## 6. Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/screens/EventDetailScreen.tsx` | **Major rewrite** | Outcome-level card display, swipe gestures, dot indicators, updated PASS/YES/NO logic |
| `src/stores/explore.ts` | **Modify** | Add `currentEventIndex`, `swipeModeEventIds`, `nextEvent()`, `setSwipeModeEvents()` |
| `src/navigation/types.ts` | **Modify** | Add optional `swipeMode` and `startEventIndex` to `EventDetail` params |
| `src/screens/ExploreScreen.tsx` | **Modify** | Pass swipe mode context when navigating to EventDetail |
| `src/components/explore/OutcomeDots.tsx` | **Create** | Dot indicator component for outcome pagination |
| `src/components/explore/OutcomeCard.tsx` | **Create** | Extracted card component for a single outcome display |

### Files That Need NO Changes
- `src/lib/api/ExploreService.ts` -- queries already return all outcomes
- `src/lib/solana/transfer.ts` -- payment flow unchanged
- `src/providers/WalletProvider.tsx` -- wallet flow unchanged
- `src/components/explore/ExploreCard.tsx` -- grid card stays the same
- `src/components/explore/ProbabilityBar.tsx` -- may still be used in ExploreCard grid
- `src/navigation/RootNavigator.tsx` -- EventDetail screen registration unchanged

---

## 7. Step-by-Step Implementation Tasks

### Phase 1: Store & Navigation Setup
1. **Update `src/navigation/types.ts`** -- Add `swipeMode?` and `startEventIndex?` to EventDetail params
2. **Update `src/stores/explore.ts`** -- Add event queue state (`currentEventIndex`, `nextEvent()`, etc.)

### Phase 2: Outcome Card Component
3. **Create `src/components/explore/OutcomeCard.tsx`** -- Single outcome display card with:
   - Event image header (16:9)
   - Event title
   - Outcome-specific section: large label, large probability %, outcome image if available
   - Category badge, LIVE badge
   - Volume display
4. **Create `src/components/explore/OutcomeDots.tsx`** -- Dot indicators showing current/total outcomes, with bet markers

### Phase 3: EventDetailScreen Rewrite
5. **Rewrite `src/screens/EventDetailScreen.tsx`**:
   - Replace single-event card with outcome-level card (using OutcomeCard)
   - Change PASS to cycle through outcomes within an event, then advance to next event
   - Change YES/NO to reference `currentOutcome` instead of hardcoded outcome A/B
   - Add OutcomeDots below the card
   - Update BetModal to accept explicit outcome prop
6. **Add swipe gesture** using `react-native-gesture-handler` + `react-native-reanimated`:
   - Pan gesture on card, swipe down to PASS
   - Card exit animation (translate down + fade) + entrance animation (spring from above)
   - Swipe threshold (~120px vertical)

### Phase 4: ExploreScreen Integration
7. **Update `src/screens/ExploreScreen.tsx`**:
   - On card tap, store the event queue (market IDs) in the explore store
   - Pass swipe mode params to EventDetail navigation

### Phase 5: Polish & Edge Cases
8. **End-of-queue handling** -- When no more events remain:
   - Show a "You've seen all events!" card with a "Back to Explore" button
   - Or auto-navigate back to the grid
9. **Bet feedback on dots** -- After placing a bet, mark the outcome dot as green
10. **Outcome image support** -- If `ExploreOutcome.image_url` exists (candidate headshot), show it on the card
11. **Haptic feedback** -- Trigger appropriate haptics on swipe complete, bet placed
12. **Prefetch next event** -- Load the next event's data while user is viewing current one
13. **Binary event shortcut** -- For simple Yes/No events (2 outcomes), skip the swipe flow and show the classic card directly (or show only 1 card with YES/NO mapped directly)

### Phase 6: Testing
14. Test with multi-outcome events (5+ candidates)
15. Test with binary events (Yes/No)
16. Test swipe gesture on iOS and Android
17. Test wallet connection + USDC transfer flow through the new modal
18. Test pagination (viewing 20+ events in swipe mode)
19. Test rapid swiping (debounce/throttle outcome transitions)

---

## 8. Technical Considerations

### Animation Strategy
- Use `react-native-reanimated` shared values for card position (runs on UI thread)
- Card exit: `translateY` animates to `SCREEN_HEIGHT` over 200ms
- Card enter: new card starts at `translateY = -200`, springs to `0`
- Opacity fades in parallel
- All animations use `useNativeDriver: true` or Reanimated worklets

### Performance
- Only one card is rendered at a time (no virtualized list needed for outcomes)
- Event data is already in the Zustand store from the grid fetch
- Outcome images should use `expo-image` for caching if available, or React Native `Image`

### State Persistence
- `pendingBets` in the store tracks which outcomes the user has bet on
- This persists across navigation (Zustand store is global)
- Consider persisting to AsyncStorage for session recovery (stretch goal)

### Edge Cases
- Events with 1 outcome: skip straight to next event on PASS
- Events with 0 outcomes: skip entirely
- Network failure loading next event: show error state with retry
- User backs out mid-swipe: save position in store, resume on return
