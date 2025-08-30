import React from 'react';
import { Tabs } from 'expo-router';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';

import RealtimeProvider from '@/lib/realtime-context';

function CustomTabBar({ state, descriptors, navigation }: { state: any; descriptors: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const bg = '#000000';
  const active = '#ffffff';
  const inactive = '#666666';
  const primary = '#60a5fa';

  const icons = [
    <Feather name="home" size={26} />, // Feed
    <Feather name="search" size={26} />, // Explore
    <Feather name="plus" size={32} color={primary} />, // Create
    <Feather name="bell" size={26} />, // Notifications
    <Feather name="user" size={26} />, // Profile
  ];

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: bg,
      height: 60 + insets.bottom,
      paddingBottom: insets.bottom,
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 0.5,
      borderTopColor: '#333333',
    }}>
      {state.routes.map((route: any, idx: number) => {
        const isFocused = state.index === idx;
        const onPress = () => {
          if (!isFocused) navigation.navigate(route.name);
        };

        // Center create button
        if (idx === 2) {
          return (
            <View key={route.key} style={{ flex: 1, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                style={{
                  width: 48,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="plus" size={20} color="#000000" />
              </TouchableOpacity>
            </View>
          );
        }

        // Other tabs
        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.8}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 50 }}
          >
            {React.cloneElement(icons[idx], { 
              color: isFocused ? active : inactive,
              size: isFocused ? 28 : 24
            })}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <RealtimeProvider>
        <Tabs
          tabBar={props => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="explore" />
          <Tabs.Screen name="create" />
          <Tabs.Screen name="notifications" />
          <Tabs.Screen name="profile" />
        </Tabs>
      </RealtimeProvider>
    </View>
  );
}