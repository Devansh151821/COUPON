# CoupUp – Realtime (Firestore)

Cute + elegant coupon app for Bhavya 💖 with realtime sync across devices.

## Features
- Bhavya can **redeem** coupons (optional note for Snack)
- **Owner Mode** (PIN from env) can **mark completed**
- **Cooldowns**: 8 days for most, 15 for Plan a Date
- **Realtime** via Firebase Firestore
- PIN **not displayed** on page (read from env var)

## Setup
1) `npm install`
2) Create a Firebase project + enable **Firestore**.
3) In project root, create `.env` from `.env.example` and fill values:
   - `VITE_FB_*` from Firebase web config
   - `VITE_OWNER_PIN` (e.g., 152118)
4) (Optional) For quick testing, set Firestore rules to allow read/write for all (tighten later).

## Run
- `npm run dev`

## Deploy (Vercel)
- Add the same env vars in Vercel Project Settings → Environment Variables:
  `VITE_FB_API_KEY`, `VITE_FB_AUTH_DOMAIN`, `VITE_FB_PROJECT_ID`, `VITE_FB_STORAGE_BUCKET`,
  `VITE_FB_SENDER_ID`, `VITE_FB_APP_ID`, `VITE_OWNER_PIN`
- Build: `npm run build`
- Output: `dist`
