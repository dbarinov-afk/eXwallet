# eXwallet

eXwallet is a TON trading alert assistant built for a vibecoding contest.

Instead of pretending to be a fully autonomous on-chain limit order protocol, eXwallet does one thing clearly:

- connect a TON wallet
- watch liquid TON tokens
- let the user set buy-below or sell-above price alarms
- trigger strong notifications when price hits
- open STON.fi execution right when the user is ready

## Live Demo

- Production: [https://exwallet-mu.vercel.app](https://exwallet-mu.vercel.app)

## What It Does

### Core flow

1. Connect Tonkeeper
2. Load portfolio balances and liquid TON tokens
3. Set a `buy below` or `sell above` alert in USD
4. Auto-monitor the market every 20 seconds
5. Trigger browser + in-app alerts when the level is hit
6. Execute through the embedded STON widget

### Main features

- Wallet connection with TON AppKit and Tonkeeper
- Portfolio view with token icons, grouped primary assets, and estimated USD value
- TON, STON, and USDT shown first, with other assets folded behind an expander
- Price alert builder for `buy low` and `sell high`
- Smart warning flow for targets that would trigger immediately
- Quick percentage presets for both buy and sell alerts
- Custom percent helper that applies a calculated target price
- One-click quick alerts from market cards
- Live market watchlist powered by STON.fi liquid assets
- Distance-to-trigger metric for every active alert
- Auto-refreshing alert monitor every 20 seconds
- Triggered alert center with direct `Execute` action
- Spotlight alert mode that is hard to miss during demos
- Browser notifications, sound cue, vibration, and test alert controls
- Recent alert history stored locally
- Embedded STON widget execution modal with retry logic and fallback to the STON site
- Fold-out TradingView market charts for supported tokens
- Visual sparkline-style token cards for fast scanning
- Local caching for balances and market data to soften rate limits and network hiccups

## Product Structure

### Home

- Hero with wallet connect and active alert count
- Portfolio snapshot
- Alert builder
- Market pulse with quick alert presets

### Alerts

- Triggered alerts
- Active monitored alerts
- Remove alert
- Execute when triggered

### Swap

- Direct STON widget launcher without creating an alert first

### Settings

- Browser notification preferences
- Sound / vibration / spotlight toggles
- Test alert
- Clear notifications
- Recent trigger history
- Reference docs links

## Why This MVP Is Honest

eXwallet does **not** silently run trades on the user's behalf.

This version is intentionally non-custodial:

- alerts are monitored off-chain in the browser
- execution is still user-signed
- Tonkeeper stays in control of the wallet
- STON.fi handles the actual swap surface

That makes the demo safer, easier to explain, and much more realistic for contest scope.

## Integrations

- React + TypeScript + Vite
- TON AppKit
- Tonkeeper / TonConnect
- STON.fi asset data and widget execution
- TonAPI portfolio balances
- TradingView embedded charts

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the app:

   ```bash
   npm run dev
   ```

3. Build production bundle:

   ```bash
   npm run build
   ```

## Environment

- `VITE_TONCONNECT_MANIFEST_URL`: public TonConnect manifest URL
- `VITE_EXW_APP_URL`: deployed app URL
- `VITE_TONCENTER_KEY`: optional Toncenter key for higher request limits

See [`./.env.example`](./.env.example).

## Clean Repo Notes

- No local `.env` file is tracked
- Only `.env.example` is committed
- Alert data, market cache, and settings are stored in browser `localStorage`
- Production manifest is public-safe and points to the deployed app domain

## Contest Pitch

eXwallet turns a TON wallet into a lightweight trading assistant:

- watch prices
- set clean entry and exit alerts
- get strong signals when price hits
- execute through STON.fi without leaving the flow
