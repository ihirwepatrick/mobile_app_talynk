import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface MemoryStats {
  jsHeapSize?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
}

/**
 * Development-only memory monitor component
 * Shows current JS heap usage for debugging memory issues
 * 
 * @example
 * {__DEV__ && <MemoryMonitor />}
 */
const MemoryMonitorComponent: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<MemoryStats>({});

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      // Note: performance.memory is only available in some environments
      const memory = (performance as any).memory;
      if (memory) {
        setStats({
          jsHeapSize: memory.jsHeapSizeLimit,
          totalJSHeapSize: memory.totalJSHeapSize,
          usedJSHeapSize: memory.usedJSHeapSize,
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  const formatBytes = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getUsageColor = (): string => {
    if (!stats.usedJSHeapSize || !stats.jsHeapSize) return '#888';
    const usage = stats.usedJSHeapSize / stats.jsHeapSize;
    if (usage > 0.8) return '#ef4444'; // Red - critical
    if (usage > 0.6) return '#f59e0b'; // Orange - warning
    return '#22c55e'; // Green - good
  };

  if (!__DEV__) return null;

  if (!visible) {
    return (
      <TouchableOpacity 
        style={styles.minimizedButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.minimizedText}>📊</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => setVisible(false)}
      >
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Memory Monitor</Text>
      
      <View style={styles.statRow}>
        <Text style={styles.label}>Used:</Text>
        <Text style={[styles.value, { color: getUsageColor() }]}>
          {formatBytes(stats.usedJSHeapSize)}
        </Text>
      </View>
      
      <View style={styles.statRow}>
        <Text style={styles.label}>Total:</Text>
        <Text style={styles.value}>
          {formatBytes(stats.totalJSHeapSize)}
        </Text>
      </View>
      
      <View style={styles.statRow}>
        <Text style={styles.label}>Limit:</Text>
        <Text style={styles.value}>
          {formatBytes(stats.jsHeapSize)}
        </Text>
      </View>

      {stats.usedJSHeapSize && stats.jsHeapSize && (
        <View style={styles.progressContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${(stats.usedJSHeapSize / stats.jsHeapSize) * 100}%`,
                backgroundColor: getUsageColor(),
              }
            ]} 
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 12,
    borderRadius: 8,
    minWidth: 160,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#333',
  },
  minimizedButton: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  minimizedText: {
    fontSize: 18,
  },
  closeButton: {
    position: 'absolute',
    top: 4,
    right: 8,
    padding: 4,
  },
  closeText: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: '#888',
    fontSize: 11,
  },
  value: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export const MemoryMonitor = memo(MemoryMonitorComponent);
export default MemoryMonitor;




