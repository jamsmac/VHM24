# VendHub Mobile - Build & Deploy Guide

## Prerequisites

1. **Node.js** >= 18
2. **Expo CLI**: `npm install -g eas-cli`
3. **Expo Account**: Create at https://expo.dev

## Setup

### 1. Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 2. Configure Project

```bash
eas build:configure
```

### 3. Set Environment Variables

Update `eas.json` with your actual values:
- `API_URL` for each environment

### 4. Configure App Credentials

**iOS:**
1. Create App ID in Apple Developer Portal
2. Generate Push Notification Certificate
3. EAS will handle the rest automatically

**Android:**
1. Create project in Firebase Console
2. Download `google-services.json`
3. Create Service Account for Play Store
4. Download `google-service-account.json`

### 5. Add API Keys

Update `app.json`:
- `ios.config.googleMapsApiKey`
- `android.config.googleMaps.apiKey`

Get keys from [Google Cloud Console](https://console.cloud.google.com).

## Building

### Development Build (for testing)

```bash
# iOS Simulator
eas build --profile development --platform ios

# Android APK
eas build --profile development --platform android
```

### Preview Build (internal testing)

```bash
# Both platforms
eas build --profile preview --platform all

# iOS only
eas build --profile preview --platform ios

# Android only
eas build --profile preview --platform android
```

### Production Build

```bash
# Both platforms
eas build --profile production --platform all

# iOS only (for App Store)
eas build --profile production --platform ios

# Android only (for Play Store)
eas build --profile production --platform android
```

## Submitting to Stores

### iOS (App Store)

```bash
eas submit --platform ios
```

Required in `eas.json`:
- `submit.production.ios.appleId`
- `submit.production.ios.ascAppId`
- `submit.production.ios.appleTeamId`

### Android (Google Play)

```bash
eas submit --platform android
```

Required:
- `google-service-account.json` file
- App registered in Google Play Console

## OTA Updates

Push updates without rebuilding:

```bash
# Production
eas update --branch production --message "Bug fix"

# Preview
eas update --branch preview --message "New feature"
```

## Testing Checklist

Before submitting:

- [ ] All screens work correctly
- [ ] Offline mode works
- [ ] Push notifications received
- [ ] Location permissions handled
- [ ] Camera captures photos
- [ ] Photos upload successfully
- [ ] Tasks can be completed
- [ ] Login/logout works
- [ ] App icon and splash screen correct
- [ ] No crash on launch

## Troubleshooting

### Build Fails

```bash
# Clear cache
eas build --clear-cache --platform [ios|android]
```

### iOS Signing Issues

```bash
# Reset credentials
eas credentials
```

### Android Keystore Issues

```bash
# Create new keystore
eas credentials --platform android
```

## Useful Commands

```bash
# Check build status
eas build:list

# View build logs
eas build:view [BUILD_ID]

# Cancel build
eas build:cancel [BUILD_ID]

# Check credentials
eas credentials

# Update runtime version
eas build:version:set
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| API_URL | Backend API endpoint | Yes |
| GOOGLE_MAPS_API_KEY | Google Maps API key | Yes (for maps) |

## Support

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)

---

**Last Updated**: 2025-01-15
