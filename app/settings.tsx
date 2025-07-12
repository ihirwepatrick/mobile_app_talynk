import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const colorScheme = useColorScheme() || 'dark';
  const router = useRouter();
  const C = colorScheme === 'dark'
    ? { background: '#18181b', card: '#232326', text: '#f3f4f6', border: '#27272a', primary: '#60a5fa' }
    : { background: '#f8fafc', card: '#fff', text: '#1e293b', border: '#e2e8f0', primary: '#3b82f6' };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}> 
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Settings</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.placeholder, { color: C.text }]}>Settings page coming soon...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 18,
    opacity: 0.7,
  },
}); 