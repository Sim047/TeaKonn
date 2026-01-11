# TeaKonn Native

This app is now a simple launcher: it opens the TeaKonn website in the device browser on startup.

## Env
- `EXPO_PUBLIC_WEB_URL` — website to open (or set `expo.extra.webUrl` in `app.json`)
- `EXPO_PUBLIC_API_BASE` (optional)
- `EXPO_PUBLIC_API_URL` (optional)

## Scripts
- `npm start` — start dev server (tunnel)
- `npm run android` — build & run native project
- `npm run build:apk` — EAS Android production build
- `npm run update` — EAS OTA update to `production`

## Quick Start
```
cd AppNative
npm install
npm start
```

Behavior: opens `EXPO_PUBLIC_WEB_URL` (or `extra.webUrl`) externally; provides a fallback button to open manually.

## Notes
- If you prefer an in-app WebView, use the implementation in `App/App.tsx` as a reference and adjust accordingly.
