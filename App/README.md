# TeaKonn Expo App (App/)

Expo React Native app under `App/` folder.

## Configure
Set API URL and base before running:

```powershell
$env:EXPO_PUBLIC_API_URL = "https://teakonn-backend.onrender.com/api"
$env:EXPO_PUBLIC_API_BASE = "https://teakonn-backend.onrender.com"
```

Or fill `extra.apiUrl`/`extra.apiBase` in `app.json`.

## Run
```powershell
Push-Location "c:\Users\SK\Desktop\TeaKonn\App"
npm install
npx expo start
Pop-Location
```

## Includes
- Login (axios)
- Events list and join
- Socket client listening to `participant_joined`

## Next
- Add navigation and more screens (Dashboard, My Events, Chat)
- Persist token with SecureStore
- Native theming/components
