import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Button, Divider, List, Switch } from 'react-native-paper';
import { WhatsAppService } from '@/lib/whatsapp-service';

const COLORS = {
  light: {
    background: '#f8fafc',
    card: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    primary: '#22c55e',
    secondary: '#3b82f6',
    accent: '#f59e0b',
    surface: '#ffffff',
    outline: '#e2e8f0',
    danger: '#ef4444',
  },
  dark: {
    background: '#0f172a',
    card: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    primary: '#22c55e',
    secondary: '#60a5fa',
    accent: '#fbbf24',
    surface: '#1e293b',
    outline: '#334155',
    danger: '#f87171',
  },
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const colorScheme = useColorScheme() || 'light';
  const colors = COLORS[colorScheme];

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing feature coming soon!');
  };

  const handleMyProducts = () => {
    Alert.alert('My Products', 'View your listed products feature coming soon!');
  };

  const handleOrderHistory = () => {
    router.push('/(tabs)/notifications'); // Redirect to orders tab
  };

  const handleContactSupport = async () => {
    const message = 'Hello! I need support with the FarmMarket Pro app.';
    await WhatsAppService.contactBusiness(message);
  };

  const handleRateApp = () => {
    // In a real app, this would open the app store
    Alert.alert('Rate App', 'Thank you for using FarmMarket Pro! App store rating feature coming soon.');
  };

  const handleShareApp = async () => {
    try {
      const message = 'Check out FarmMarket Pro - the best app for farming products in Rwanda! 🌾';
      await WhatsAppService.contactBusiness(message);
    } catch (error) {
      Alert.alert('Error', 'Failed to share app');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: logout 
        }
      ]
    );
  };

  const openWebsite = () => {
    Linking.openURL('https://farmmarket.rw');
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://farmmarket.rw/privacy');
  };

  const openTermsOfService = () => {
    Linking.openURL('https://farmmarket.rw/terms');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Profile 👤
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <Card style={[styles.userCard, { backgroundColor: colors.card }]} mode="elevated">
          <View style={styles.userContent}>
            <View style={styles.userInfo}>
              <Image
                source={
                  user?.profile_picture 
                    ? { uri: user.profile_picture }
                    : require('../../assets/images/icon.png')
                }
                style={styles.avatar}
              />
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {user?.name || 'Farmer'}
                </Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                  {user?.email || 'farmer@farmmarket.rw'}
                </Text>
                <View style={styles.userBadge}>
                  <MaterialIcons name="verified-user" size={14} color={colors.primary} />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    Verified Farmer
                  </Text>
                </View>
              </View>
            </View>
            
            <Button
              mode="outlined"
              onPress={handleEditProfile}
              style={styles.editButton}
              labelStyle={{ fontSize: 12 }}
            >
              Edit Profile
            </Button>
          </View>
        </Card>

        {/* Quick Stats */}
        <Card style={[styles.statsCard, { backgroundColor: colors.card }]} mode="elevated">
          <View style={styles.statsContent}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>12</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Orders</Text>
            </View>
            <Divider style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.secondary }]}>3</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Products</Text>
            </View>
            <Divider style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>4.8</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rating</Text>
            </View>
          </View>
        </Card>

        {/* Menu Items */}
        <Card style={[styles.menuCard, { backgroundColor: colors.card }]} mode="elevated">
          <List.Section>
            <List.Item
              title="My Products"
              description="Manage your listed products"
              left={props => <List.Icon {...props} icon="package-variant" color={colors.primary} />}
              right={props => <List.Icon {...props} icon="chevron-right" color={colors.textSecondary} />}
              onPress={handleMyProducts}
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
            />
            
            <Divider />
            
            <List.Item
              title="Order History"
              description="View all your orders"
              left={props => <List.Icon {...props} icon="history" color={colors.secondary} />}
              right={props => <List.Icon {...props} icon="chevron-right" color={colors.textSecondary} />}
              onPress={handleOrderHistory}
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
            />
            
            <Divider />
            
            <List.Item
              title="Contact Support"
              description="Get help via WhatsApp"
              left={props => <List.Icon {...props} icon="headset" color="#25d366" />}
              right={props => <List.Icon {...props} icon="chevron-right" color={colors.textSecondary} />}
              onPress={handleContactSupport}
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
            />
          </List.Section>
        </Card>

        {/* Settings */}
        <Card style={[styles.menuCard, { backgroundColor: colors.card }]} mode="elevated">
          <List.Section>
            <List.Item
              title="Push Notifications"
              description="Receive order updates"
              left={props => <List.Icon {...props} icon="bell" color={colors.accent} />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  color={colors.primary}
                />
              )}
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
            />
            
            <Divider />
            
            <List.Item
              title="Rate App"
              description="Help us improve"
              left={props => <List.Icon {...props} icon="star" color={colors.accent} />}
              right={props => <List.Icon {...props} icon="chevron-right" color={colors.textSecondary} />}
              onPress={handleRateApp}
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
            />
            
            <Divider />
            
            <List.Item
              title="Share App"
              description="Tell your friends"
              left={props => <List.Icon {...props} icon="share" color={colors.secondary} />}
              right={props => <List.Icon {...props} icon="chevron-right" color={colors.textSecondary} />}
              onPress={handleShareApp}
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
            />
          </List.Section>
        </Card>

        {/* Legal & Info */}
        <Card style={[styles.menuCard, { backgroundColor: colors.card }]} mode="elevated">
          <List.Section>
            <List.Item
              title="Privacy Policy"
              left={props => <List.Icon {...props} icon="shield-check" color={colors.textSecondary} />}
              right={props => <List.Icon {...props} icon="open-in-new" color={colors.textSecondary} />}
              onPress={openPrivacyPolicy}
              titleStyle={{ color: colors.text }}
            />
            
            <Divider />
            
            <List.Item
              title="Terms of Service"
              left={props => <List.Icon {...props} icon="file-document" color={colors.textSecondary} />}
              right={props => <List.Icon {...props} icon="open-in-new" color={colors.textSecondary} />}
              onPress={openTermsOfService}
              titleStyle={{ color: colors.text }}
            />
            
            <Divider />
            
            <List.Item
              title="Visit Website"
              left={props => <List.Icon {...props} icon="web" color={colors.textSecondary} />}
              right={props => <List.Icon {...props} icon="open-in-new" color={colors.textSecondary} />}
              onPress={openWebsite}
              titleStyle={{ color: colors.text }}
            />
          </List.Section>
        </Card>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: colors.textSecondary }]}>
            FarmMarket Pro v1.0.0
          </Text>
          <Text style={[styles.appDescription, { color: colors.textSecondary }]}>
            Your trusted partner for farming products
          </Text>
        </View>

        {/* Logout Button */}
        <Button
          mode="contained"
          onPress={handleLogout}
          style={[styles.logoutButton, { backgroundColor: colors.danger }]}
          contentStyle={styles.logoutButtonContent}
          labelStyle={styles.logoutButtonText}
          icon="logout"
        >
          Logout
        </Button>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userCard: {
    marginVertical: 16,
    borderRadius: 12,
  },
  userContent: {
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    borderRadius: 8,
  },
  statsCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  statsContent: {
    flexDirection: 'row',
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 20,
  },
  menuCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appVersion: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  appDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});