# TeaKonn Expo App (App/)

Expo React Native app under `App/` folder.

Note: This app now acts as a launcher and opens the TeaKonn website in the device browser on launch.

## Configure
Set website URL (and API if needed) before running:

```powershell
$env:EXPO_PUBLIC_WEB_URL = "https://tea-konn.vercel.app"
$env:EXPO_PUBLIC_API_URL = "https://teakonn-backend.onrender.com/api"
$env:EXPO_PUBLIC_API_BASE = "https://teakonn-backend.onrender.com"
```

Or fill `extra.webUrl`, `extra.apiUrl`/`extra.apiBase` in `app.json`.

## Run
```powershell
Push-Location "c:\Users\SK\Desktop\TeaKonn\App"
npm install
npx expo start
Pop-Location
```

## Behavior
- Opens `extra.webUrl` (or `EXPO_PUBLIC_WEB_URL`) in the external browser.
- Provides a fallback "Open Website" button if opening fails.

## Next
- Optionally switch to in-app WebView instead of external browser.
- Add universal link/deep link handling if needed.
