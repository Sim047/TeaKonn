# TeaKonn Native

A fresh Expo (React Native) starter app for TeaKonn with minimal auth flow.

## Env
- `EXPO_PUBLIC_API_BASE` (default: https://teakonn-production.up.railway.app)
- `EXPO_PUBLIC_API_URL` (default: https://teakonn-production.up.railway.app/api)

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

Log in using your TeaKonn credentials; token persists via AsyncStorage.

Next: wire sockets and message list to `/api/messages`.
