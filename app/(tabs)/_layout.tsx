import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable, View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { useAuth } from '@/lib/auth-context';

import Colors from '@/constants/Colors';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
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

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const C = COLORS[colorScheme ?? 'light'];
  const { logout } = useAuth();

  return (
    <RealtimeProvider>
      <AuthGuard>
        <Tabs
        screenOptions={{
          tabBarActiveTintColor: C.tabBarActive,
          tabBarInactiveTintColor: C.tabBarInactive,
          tabBarStyle: {
            backgroundColor: 'rgba(0,0,0,0.9)',
            borderTopColor: 'transparent',
            position: 'absolute',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          headerShown: useClientOnlyValue(false, true),
        }}>
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
  );
}
