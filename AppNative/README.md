# TeaKonn Native

A fresh Expo (React Native) starter app for TeaKonn with minimal auth flow.

## Env
- `EXPO_PUBLIC_API_BASE` (default: https://teakonn-production.up.railway.app)
- `EXPO_PUBLIC_API_URL` (default: https://teakonn-production.up.railway.app/api)
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` — OAuth client ID for Android
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` — OAuth client ID for iOS
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` — OAuth client ID for web fallback

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

## Google Login

This app supports Google Sign-In via Expo Auth Session.

- Create OAuth 2.0 client IDs in Google Cloud Console for Android and iOS.
- Add them to `app.json` under `expo.extra` as shown above.
- The flow retrieves an `id_token` from Google and exchanges it at `POST /api/auth/google` to get the TeaKonn JWT.

Run:

```
cd AppNative
npm install
npm start
```
