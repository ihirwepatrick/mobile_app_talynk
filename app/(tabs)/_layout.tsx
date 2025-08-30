import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable, View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
 
import AuthGuard from '@/components/AuthGuard';
import RealtimeProvider from '@/lib/realtime-context';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

const COLORS = {
  light: {
    tabBarBg: '#fff',
    tabBarBorder: '#e5e7eb',
    tabBarActive: '#007AFF',
    tabBarInactive: '#666',
  },
  dark: {
    tabBarBg: '#18181b',
    tabBarBorder: '#27272a',
    tabBarActive: '#60a5fa',
    tabBarInactive: '#a1a1aa',
  },
};

function CustomTabBar({ state, descriptors, navigation }: { state: any; descriptors: any; navigation: any }) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#18181b' : '#fff';
  const active = isDark ? '#fff' : '#18181b';
  const inactive = isDark ? '#a1a1aa' : '#666';
  const blue = '#007AFF';

  const icons = [
    <Feather name="home" size={26} />, // Feed
    <Feather name="users" size={26} />, // Explore
    <Feather name="plus" size={32} color={blue} />, // Upload
    <Feather name="bell" size={26} />, // Notifications
    <Feather name="user" size={26} />, // Profile
  ];
  const labels = ['Home', 'Explore', 'Upload video', 'Notifications', 'My account'];

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: 'transparent',
      height: 56 + insets.bottom,
      paddingBottom: insets.bottom,
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    }}>
      {state.routes.map((route: any, idx: number) => {
        const isFocused = state.index === idx;
        const onPress = () => {
          if (!isFocused) navigation.navigate(route.name);
        };
        // Center button
        if (idx === 2) {
          const iconColor = isFocused ? (isDark ? '#fff' : '#18181b') : inactive;
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 60 }}
            >
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isFocused ? (isDark ? '#232326' : '#f0f0f0') : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 2,
                overflow: 'hidden',
              }}>
                <Feather name="plus" size={26} color={iconColor} />
              </View>
              <Text style={{ color: isFocused ? (isDark ? '#fff' : '#18181b') : inactive, fontSize: 13, fontWeight: isFocused ? 'bold' : '500' }}>{labels[idx]}</Text>
            </TouchableOpacity>
          );
        }
        // Other tabs
        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.8}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 60 }}
          >
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isFocused ? (isDark ? '#232326' : '#f0f0f0') : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 2,
              overflow: 'hidden',
            }}>
              {React.cloneElement(icons[idx], { color: isFocused ? (isDark ? '#fff' : '#18181b') : inactive })}
            </View>
            <Text style={{ color: isFocused ? (isDark ? '#fff' : '#18181b') : inactive, fontSize: 13, fontWeight: isFocused ? 'bold' : '500' }}>{labels[idx]}</Text>
            {isFocused && idx !== 2 && (
              <View style={{ height: 4, width: 32, backgroundColor: blue, borderRadius: 2, marginTop: 2 }} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const C = COLORS[colorScheme ?? 'light'];
  const { logout } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <RealtimeProvider>
    <AuthGuard>
      <Tabs
            tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
            }}
          >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: 'Create',
            tabBarIcon: ({ color }) => <TabBarIcon name="plus" color={color} />,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            tabBarIcon: ({ color }) => <TabBarIcon name="bell" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          }}
        />
      </Tabs>
    </AuthGuard>
    </RealtimeProvider>
    </View>
  );
}
