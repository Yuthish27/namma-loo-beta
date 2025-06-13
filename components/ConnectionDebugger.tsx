import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { testConnection } from '@/lib/supabase';

interface ConnectionDebuggerProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export default function ConnectionDebugger({ onConnectionChange }: ConnectionDebuggerProps) {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);

  const checkConnection = async () => {
    setConnectionStatus('testing');
    setError(null);
    
    try {
      const result = await testConnection();
      
      if (result.success) {
        setConnectionStatus('connected');
        setDetails(result.details);
        onConnectionChange?.(true);
      } else {
        setConnectionStatus('failed');
        setError(result.error || 'Unknown error');
        setDetails(result.details);
        onConnectionChange?.(false);
      }
    } catch (err: any) {
      setConnectionStatus('failed');
      setError(err.message);
      onConnectionChange?.(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'failed': return '#F44336';
      default: return '#FF9800';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '✅ Connected';
      case 'failed': return '❌ Failed';
      default: return '🔄 Testing...';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Connection Error:</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {details && connectionStatus === 'connected' && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsText}>
            Records in database: {details.count || 'Unknown'}
          </Text>
        </View>
      )}
      
      {details && connectionStatus === 'failed' && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Debug Info:</Text>
          <Text style={styles.detailsText}>
            {JSON.stringify(details, null, 2)}
          </Text>
        </View>
      )}
      
      <TouchableOpacity style={styles.retryButton} onPress={checkConnection}>
        <Text style={styles.retryText}>Test Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 16,
  },
  statusIndicator: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  errorTitle: {
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 4,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  detailsContainer: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  detailsTitle: {
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  detailsText: {
    color: '#2e7d32',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});