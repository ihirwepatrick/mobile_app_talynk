# FarmMarket Pro Mobile App

A React Native mobile application for farmers to buy and sell agricultural products, tools, and equipment in Rwanda. Built with Expo and featuring WhatsApp integration for direct seller communication.

## Features

- **Product Marketplace**: Browse chemicals, tools, seeds, fertilizers, and equipment
- **WhatsApp Integration**: Direct communication with sellers via WhatsApp
- **Category Filtering**: Easy navigation through product categories
- **Search Functionality**: Find specific products quickly
- **Product Details**: Comprehensive product information and specifications
- **Order Management**: Track your orders and purchase history
- **Seller Profiles**: View seller information and contact details
- **Modern UI**: Clean, farmer-friendly interface using React Native Paper

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Expo Router** for navigation
- **React Native Paper** for Material Design components
- **WhatsApp Business API** integration
- **AsyncStorage** for local data persistence
- **Expo Image Picker** for product images

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Scan the QR code with Expo Go app on your mobile device

### Development

- **iOS Simulator**: Press `i` in the terminal
- **Android Emulator**: Press `a` in the terminal
- **Web**: Press `w` in the terminal

## Project Structure

```
mobile-app/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Main tab navigation
│   │   ├── index.tsx      # Home/Products screen
│   │   ├── explore.tsx    # Explore/Search screen
│   │   ├── create.tsx     # Add product screen
│   │   ├── notifications.tsx # Orders screen
│   │   └── profile.tsx    # Profile screen
│   ├── auth/              # Authentication screens
│   │   ├── login.tsx      # Login screen
│   │   └── register.tsx   # Registration screen
│   ├── product/           # Product detail screens
│   │   └── [id].tsx       # Product detail screen
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
├── lib/                   # Core libraries
│   ├── products-api.ts    # Product API functions
│   ├── whatsapp-service.ts # WhatsApp integration
│   ├── auth-context.tsx   # Authentication context
│   └── config.ts          # App configuration
├── types/                 # TypeScript type definitions
└── assets/               # Images and static assets
```

## Key Features

### WhatsApp Integration

The app includes seamless WhatsApp integration allowing farmers to:
- Contact sellers directly about product availability
- Send pre-formatted product inquiry messages
- Get support from the business via WhatsApp

### Product Categories

- **Chemicals**: Pesticides, herbicides, fungicides
- **Tools**: Hand tools, farming implements
- **Seeds**: Quality seeds for all crops
- **Fertilizers**: Organic and synthetic fertilizers
- **Equipment**: Tractors, machinery, equipment

### User Experience

- Clean, intuitive interface designed for farmers
- Large, clear product images
- Easy-to-read pricing and specifications
- Quick contact options for each product
- Offline-friendly design

## Configuration

### WhatsApp Business Number

Update the business WhatsApp number in `lib/config.ts`:

```typescript
export const WHATSAPP_BUSINESS_NUMBER = '+250788123456';
```

### Product Categories

Customize product categories in `lib/config.ts`:

```typescript
export const PRODUCT_CATEGORIES = [
  { id: 'chemicals', name: 'Chemicals', icon: 'flask', color: '#ef4444' },
  // Add more categories...
];
```

## Building for Production

### Android

```bash
eas build --platform android
```

### iOS

```bash
eas build --platform ios
```

## Deployment

The app can be deployed to:
- Google Play Store (Android)
- Apple App Store (iOS)
- Expo Go (for testing)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on both platforms
5. Submit a pull request

## Support

For support and questions:
- WhatsApp: +250788123456
- Email: support@farmmarket.rw
- Website: https://farmmarket.rw

## License

This project is licensed under the MIT License.