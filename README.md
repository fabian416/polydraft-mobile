<p align="center">
  <img width="1536" height="1024" alt="Image" src="https://github.com/user-attachments/assets/462b6cad-4243-416f-8ecd-eb81b46ab7e2" />

<h1 align="center">Polydraft Mobile</h1>

<p align="center">
  <strong>Fantasy prediction market gaming on Android — open packs, draft picks, win points.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-SDK_55-000020?logo=expo" alt="Expo SDK 55" />
  <img src="https://img.shields.io/badge/React_Native-0.83-61DAFB?logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/Solana-Mainnet-9945FF?logo=solana" alt="Solana" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="MIT License" />
</p>

---

## What is Polydraft?

Polydraft is a prediction market gaming platform where players open packs of real-world prediction events, draft their picks, and earn points when outcomes resolve. Think fantasy sports meets trading cards — with real market data from Jupiter Prediction Markets on Solana.

Each pack contains 5 live prediction events. Swipe to pick outcomes, wait for the real world to play out, then reveal your results one by one. The harder the pick, the bigger the payout. Compete on the leaderboard and share your results.

This is the **native Android app** built with React Native and Expo, using Solana Mobile Wallet Adapter (MWA) for on-device wallet signing.

## Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/6e22341f-3fba-4c98-a01d-cd8a99cb6c65" width="24%" />
  <img src="https://github.com/user-attachments/assets/11a6cae3-b29f-43d9-878f-a1210f8f351e" width="24%" />
  <img src="https://github.com/user-attachments/assets/1589e0e4-8b1d-47fd-8605-7735fae580c6" width="24%" />
  <img src="https://github.com/user-attachments/assets/cb9009ae-dcc1-43b1-86c5-09f44082cd62" width="24%" />
</p>

## Features

- **Pack-based prediction system** — 5 picks per pack, each a real prediction market event
- **Real-time market data** — Live odds from Jupiter Prediction Markets
- **Retro pixel art aesthetic** — Balatro-inspired card design with rarity tiers
- **Odds-based scoring** — Harder picks pay more, with tier bonuses for longshots
- **Sequential reveal** — Cards reveal one by one as events resolve in the real world
- **Explore & trade** — Browse live markets and buy prediction contracts directly via Jupiter
- **USDC payments** — Premium packs purchased on-chain with USDC
- **Leaderboard** — Weekly and all-time rankings
- **Audio & haptics** — Sound effects and haptic feedback during pack opens and key interactions

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Mobile Client                        │
│  React Native + Expo + Zustand + Reanimated              │
│  Mobile Wallet Adapter (Phantom, Solflare, etc.)         │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│   Supabase   │ │    Solana    │ │  Jupiter Prediction  │
│              │ │              │ │  Markets             │
│ PostgreSQL   │ │ SPL Token    │ │                      │
│ Row-Level    │ │ Transfers    │ │  Market data         │
│ Security     │ │              │ │  Direct trading      │
│ Auth         │ │ MWA          │ │  Event capture       │
│              │ │ signAndSend  │ │  Resolution sync     │
│              │ │ Transactions │ │                      │
└──────────────┘ └──────────────┘ └──────────────────────┘
```

## Explore & Jupiter Integration

### Market Discovery

The **Explore** section lets players browse live prediction markets from Jupiter. Users can search, filter by category, and view real-time odds for any active market — all without opening a pack.

### Direct Purchases via Jupiter Prediction Market API

From Explore, users can buy prediction contracts directly through Jupiter's Prediction Market API:

1. **User selects an outcome** — picks YES or NO on any market
2. **API returns an unsigned `VersionedTransaction`** — built server-side with the exact trade parameters
3. **MWA signs and sends** — user approves in Phantom via Mobile Wallet Adapter's `signAndSendTransactions`
4. **On-chain confirmation** — transaction settles on Solana

This gives players a seamless trading experience without leaving the app, powered entirely by Jupiter's on-chain prediction market infrastructure.

## Solana Integration

### Mobile Wallet Adapter (MWA)

Polydraft Mobile uses `@solana-mobile/mobile-wallet-adapter-protocol-web3js` for native wallet interactions. All signing happens on-device through a single `transact()` session:

1. **Authorize** — `wallet.authorize()` with `chain: 'solana:mainnet'` and optional `auth_token` for silent reauth
2. **Sign and send** — `wallet.signAndSendTransactions()` handles both signing and RPC submission
3. **Confirm** — `connection.confirmTransaction()` with blockhash strategy outside the session

> **Note:** MWA returns base64-encoded addresses. Decoded with `toUint8Array()` from `js-base64` before constructing `PublicKey`.

### Purchase Flow

Premium packs are purchased on-chain with USDC:

```
Buyer ATA  ──→  Treasury ATA
         (1 USDC)
```

The transfer uses `createTransferCheckedInstruction` from `@solana/spl-token` — an atomic, verified operation that validates the token mint, decimal precision, and exact amount.

### Metro ESM Fix (Critical)

MWA packages ship with `"type": "module"` in their `package.json`. Metro may resolve the ESM build which lacks native crypto support, causing silent wallet failures. The fix in `metro.config.js`:

```javascript
config.resolver.unstable_conditionNames = ['require', 'react-native'];
```

This forces Metro to use the CJS/react-native entry where crypto delegates to the native Kotlin layer.

## Game Flow

```
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐    ┌────────────┐
│  Open   │───▶│  Draft  │───▶│   Wait   │───▶│ Reveal  │───▶│ Leaderboard│
│  Pack   │    │  Picks  │    │          │    │ Results │    │            │
└─────────┘    └─────────┘    └──────────┘    └─────────┘    └────────────┘
  5 events      Swipe to       Events          Cards flip      Points
  appear        pick A/B       resolve in      one by one      tallied,
                (or Draw)      the real         with            rank
                               world            animation       updated
```

**Scoring:**
- Each pick is a $1 bet. Payout = `1 / probability` at pick time
- A 10% pick pays 10x. A 50% pick pays 2x.
- Tier bonuses: longshots (< 10%) earn +$0.50, underdogs (10–25%) earn +$0.25
- Perfect pack (5/5) earns a +$5 bonus

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Expo SDK 55, React Native 0.83, TypeScript 5 |
| **State** | Zustand (persisted stores) |
| **Navigation** | React Navigation (native stack + bottom tabs) |
| **Animations** | React Native Reanimated, Gesture Handler |
| **Backend** | Supabase (PostgreSQL + Row-Level Security) |
| **Blockchain** | Solana Web3.js, SPL Token, Mobile Wallet Adapter |
| **Markets** | Jupiter Prediction Market API |
| **Testing** | Jest, React Native Testing Library |
| **Styling** | Pixel art font (VT323), Balatro-inspired rarity system |
| **Build** | EAS Build (cloud) |

## Getting Started

### Prerequisites

- Node.js 18+
- Android Studio (for Android builds)
- A Solana-compatible mobile wallet (Phantom, Solflare)

### Setup

```bash
# Install dependencies
npm install

# Generate native Android project
npx expo prebuild

# Run on connected device
npx expo run:android
```

> MWA requires a **physical Android device**. Emulators do not support wallet adapter intents.

### Environment Variables

Config lives in `.env` and `app.json` extras:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `EXPO_PUBLIC_ACTIVE_VENUE` | Market venue (default: `jupiter`) |
| `EXPO_PUBLIC_SOLANA_RPC_URL` | Solana RPC endpoint |
| `EXPO_PUBLIC_TREASURY_PUBKEY` | Treasury wallet for premium payments |
| `EXPO_PUBLIC_PAYMENT_METHOD` | Payment method: `program` or `transfer` |

## Project Structure

```
src/
├── components/       # UI components
│   ├── animations/   # Animation wrappers
│   ├── auth/         # Wallet connect / auth UI
│   ├── common/       # Shared primitives (PixelText, PixelButton)
│   ├── explore/      # Market browsing (ExploreCard, ProbabilityBar)
│   ├── game/         # Core game UI (PackSprite, GameBackground)
│   ├── layout/       # Screen layouts (ScreenContainer)
│   └── packs/        # Pack opening experience
├── hooks/            # Custom React hooks
├── lib/              # Business logic & services
│   ├── api/          # ExploreService, API clients
│   ├── jupiter/      # Jupiter Prediction Market integration
│   ├── rarity/       # Card rarity system
│   ├── scoring/      # Scoring engine
│   ├── solana/       # Wallet, transfers, constants
│   └── supabase/     # Supabase client & queries
├── navigation/       # React Navigation config
├── providers/        # WalletProvider, context providers
├── screens/          # Screen components
├── stores/           # Zustand stores
└── types/            # TypeScript type definitions
```

## Testing

```bash
npm test
```

Tests live in `src/__tests__/` and mirror the source tree.

## Building for Release

This project uses EAS Build:

```bash
# Android APK (preview)
npx eas build --platform android --profile preview

# Android AAB (production)
npx eas build --platform android --profile production
```

## License

MIT
