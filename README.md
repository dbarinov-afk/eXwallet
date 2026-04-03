# eXwallet

eXwallet is a trader-first TON wallet demo focused on one contest-friendly workflow: define a target buy, watch the market, and execute through STON.fi when the level is reached.

## Stack

- React + TypeScript + Vite
- TON AppKit + Tonkeeper
- STON.fi API and SDK
- TonAPI for wallet balances

## Local setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Run `npm run dev`

## Environment

- `VITE_TONCONNECT_MANIFEST_URL`: public manifest URL for TonConnect. The demo dApp manifest is used by default for local testing.
- `VITE_EXW_APP_URL`: your deployed app URL
- `VITE_TONCENTER_KEY`: optional Toncenter key for higher request limits

## Notes

- Orders are stored locally in the browser with `localStorage`
- Monitoring is off-chain and execution remains user-signed
- Before production deploy, update [`public/tonconnect-manifest.json`](/Users/barden/Desktop/Rust/eXwallet/public/tonconnect-manifest.json) to your final Vercel domain
