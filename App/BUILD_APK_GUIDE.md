# Build APK Guide for TeaKonn App

## ✅ Configuration Complete!

Your app is now configured to build APK files. Below are the steps to create your APK.

---

## 🚀 Method 1: EAS Build (Recommended)

This is the easiest method and builds your APK in the cloud.

### Prerequisites
1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```

2. Login to your Expo account (create one at expo.dev if you don't have):
   ```bash
   eas login
   ```

3. Configure your project (first time only):
   ```bash
   cd App
   eas build:configure
   ```

### Build the APK

**For a preview/testing APK:**
```bash
eas build --platform android --profile preview
```

**For a production APK:**
```bash
eas build --platform android --profile production
```

### Download Your APK
- After the build completes (takes 10-20 minutes), you'll get a download link
- Download the APK from the provided URL
- Share this APK with users - they can install it directly on Android devices

---

## 🛠️ Method 2: Local Build (Alternative)

This method builds locally but requires more setup.

### Prerequisites
1. Install Android Studio: https://developer.android.com/studio
2. Set up Android SDK and environment variables
3. Install Java Development Kit (JDK 17 or later)

### Build Commands

1. Navigate to your app directory:
   ```bash
   cd App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate Android project files:
   ```bash
   npx expo prebuild --platform android
   ```

4. Build the APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   (On Windows: `gradlew.bat assembleRelease`)

5. Your APK will be at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

---

## 📦 What You Get

- **APK File**: An Android Package file that users can download and install
- **File Size**: Typically 30-50 MB for Expo apps
- **Installation**: Users need to enable "Install from Unknown Sources" in their Android settings

---

## 🔒 For Production/Play Store

If you want to publish to Google Play Store:

1. Create a keystore for signing:
   ```bash
   eas credentials
   ```

2. Build with production profile:
   ```bash
   eas build --platform android --profile production
   ```

3. Upload the APK/AAB to Google Play Console

---

## 🐛 Troubleshooting

### EAS Build Issues
- Make sure you're logged in: `eas whoami`
- Check your project ID in app.json matches your Expo project
- View build logs at: https://expo.dev/accounts/[your-username]/projects/teakonn-expo-app/builds

### Local Build Issues
- Ensure ANDROID_HOME environment variable is set
- Check Java version: `java --version` (should be 17+)
- Clear gradle cache: `cd android && ./gradlew clean`

---

## 📱 Testing Your APK

1. **On Physical Device**:
   - Enable Developer Options
   - Enable "Install Unknown Apps" for your browser/file manager
   - Download and tap the APK to install

2. **On Emulator**:
   - Drag and drop APK onto the emulator window
   - Or use: `adb install path/to/your-app.apk`

---

## 🎯 Quick Start (Recommended)

Run these commands in your terminal:

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Navigate to app directory
cd App

# 4. Build APK
eas build --platform android --profile preview
```

Wait for the build to complete, then download your APK from the link provided!

---

## 📝 Notes

- **First build** takes longer (15-25 minutes) as it sets up the environment
- **Subsequent builds** are faster (10-15 minutes)
- APK files can be shared via any file-sharing method (Google Drive, Dropbox, direct download, etc.)
- Users don't need Google Play Store to install your APK
- For auto-updates, consider using Expo Updates or publishing to Play Store

