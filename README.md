# Talynk Social Mobile App

A React Native mobile application for the Talynk social media platform, built with Expo.

## Features

- **Authentication**: Login and registration with JWT tokens
- **Feed**: Browse posts from all users with infinite scrolling
- **Explore**: Search for posts and content
- **Create Posts**: Share photos and videos with captions
- **Notifications**: Real-time notifications system
- **Profile**: User profiles with posts grid and statistics
- **Cross-platform**: Works on both iOS and Android

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Expo Router** for navigation
- **Axios** for API communication
- **AsyncStorage** for local data persistence
- **Expo Image Picker** for media selection
- **React Context** for state management

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device

### Installation

1. Clone the repository and navigate to the mobile app directory:
   ```bash
   cd mobile-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Scan the QR code with Expo Go app on your mobile device

### Development

- **iOS Simulator**: Press `i` in the terminal
- **Android Emulator**: Press `a` in the terminal
- **Web**: Press `w` in the terminal

## Project Structure

```
mobile-app/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Main tab navigation
│   │   ├── index.tsx      # Feed screen
│   │   ├── explore.tsx    # Explore/Search screen
│   │   ├── create.tsx     # Create post screen
│   │   ├── notifications.tsx # Notifications screen
│   │   └── profile.tsx    # Profile screen
│   ├── auth/              # Authentication screens
│   │   ├── login.tsx      # Login screen
│   │   └── register.tsx   # Registration screen
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   └── AuthGuard.tsx      # Authentication guard
├── lib/                   # Core libraries
│   ├── api.ts            # API service functions
│   ├── api-client.ts     # Axios client configuration
│   ├── auth-context.tsx  # Authentication context
│   └── config.ts         # App configuration
├── types/                 # TypeScript type definitions
│   └── index.ts          # App types and interfaces
└── assets/               # Images and static assets
```

## API Integration

The mobile app connects to the same backend API as the web application:

- **Base URL**: `https://talynk-backend.onrender.com`
- **Authentication**: JWT tokens stored in AsyncStorage
- **Endpoints**: Posts, users, notifications, and media upload

## Building for Production

### Android

1. Build the APK:
   ```bash
   eas build --platform android
   ```

2. Or build locally:
   ```bash
   expo run:android
   ```

### iOS

1. Build for iOS (requires macOS):
   ```bash
   eas build --platform ios
   ```

2. Or build locally:
   ```bash
   expo run:ios
   ```

## Store Deployment

### Google Play Store

1. Create a Google Play Console account
2. Upload the signed APK/AAB
3. Fill in app details and screenshots
4. Submit for review

### Apple App Store

1. Create an Apple Developer account
2. Upload the IPA file via Xcode or App Store Connect
3. Fill in app details and screenshots
4. Submit for review

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_API_URL=https://talynk-backend.onrender.com
```

### App Configuration

Update `app.json` for:
- App name and version
- Bundle identifiers
- Permissions
- Icons and splash screens

## Permissions

The app requires the following permissions:

- **Camera**: For taking photos and videos
- **Photo Library**: For selecting media from gallery
- **Internet**: For API communication

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `expo start -c`
2. **Permission errors**: Check device settings for camera/photo access
3. **API connection**: Verify backend URL in config
4. **Build errors**: Update Expo SDK and dependencies

### Development Tips

- Use Expo Go for rapid development and testing
- Enable hot reload for faster development
- Test on both iOS and Android devices
- Use React Native Debugger for debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository. 