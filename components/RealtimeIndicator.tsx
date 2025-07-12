import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRealtime } from '@/lib/realtime-context';
import { MaterialIcons } from '@expo/vector-icons';

interface RealtimeIndicatorProps {
  showText?: boolean;
}

export const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = ({ showText = false }) => {
  const { isConnected } = useRealtime();

  if (!showText && isConnected) {
    return null; // Don't show anything when connected and text is hidden
  }

  return (
    <View style={[styles.container, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]}>
      <MaterialIcons 
        name={isConnected ? 'wifi' : 'wifi-off'} 
        size={12} 
        color="#fff" 
      />
      {showText && (
        <Text style={styles.text}>
          {isConnected ? 'Live' : 'Offline'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
});

export default RealtimeIndicator; 