import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable, View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import AuthGuard from '@/components/AuthGuard';

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
    <MaterialIcons name="home" size={26} />, // Home
    <MaterialIcons name="explore" size={26} />, // Explore
    <MaterialIcons name="add-shopping-cart" size={32} color={blue} />, // Add Product
    <MaterialIcons name="notifications" size={26} />, // Notifications
    <MaterialIcons name="person" size={26} />, // Profile
  ];
  const labels = ['Home', 'Explore', 'Add Product', 'Orders', 'Profile'];

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: 76 + insets.bottom, // slightly less height
      paddingBottom: insets.bottom + 2, // less padding
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    }}>
      {state.routes.map((route: any, idx: number) => {
        const isFocused = state.index === idx;
        const onPress = () => {
          if (!isFocused) navigation.navigate(route.name);
        };
        // Center button
        if (idx === 2) {
          return (
            <View key={route.key} style={{ flex: 1, alignItems: 'center', top: -36 }}>
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.18,
                  shadowRadius: 8,
                  elevation: 8,
                  borderWidth: 4,
                  borderColor: bg,
                }}
              >
                <MaterialIcons name="add-shopping-cart" size={32} color={blue} />
              </TouchableOpacity>
              <Text style={{ color: isDark ? '#fff' : '#222', fontSize: 13, marginTop: 2, fontWeight: '500' }}>{labels[idx]}</Text>
            </View>
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
    <AuthGuard>
      <Tabs
            tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: useClientOnlyValue(false, true),
            }}
          >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <TabBarIcon name="explore" color={color} />,
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: 'Add Product',
            tabBarIcon: ({ color }) => <TabBarIcon name="add-shopping-cart" color={color} />,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color }) => <TabBarIcon name="notifications" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <TabBarIcon name="person" color={color} />,
          }}
        />
      </Tabs>
    </AuthGuard>
    </View>
  );
}
