// FIXED OpenNowPage with proper features display and working hours formatting

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, MapPin, Clock, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { getOpenToilets, Toilet } from '@/lib/supabase';
import { getCurrentLocation, LocationData, getToiletDistance } from '@/lib/location';
import { formatWorkingHours, getStatusColor, getStatusText } from '@/lib/workingHours';
import FeatureBadges from '@/components/FeatureBadges';

export default function OpenNowPage() {
  const router = useRouter();
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [distanceCalculationStatus, setDistanceCalculationStatus] = useState<string>('');

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    await getUserLocation();
    await loadToilets();
  };

  const getUserLocation = async () => {
    try {
      console.log('📍 Getting user location for Open Now...');
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation(location);
        console.log('✅ Got user location for Open Now:', location);
      } else {
        console.log('⚠️ Could not get user location, using default');
        setUserLocation({
          latitude: 12.9716,
          longitude: 77.5946
        });
      }
    } catch (error) {
      console.error('❌ Error getting location for Open Now:', error);
      setUserLocation({
        latitude: 12.9716,
        longitude: 77.5946
      });
    }
  };

  const loadToilets = async () => {
    try {
      setLoading(true);
      console.log('🕐 === LOADING OPEN TOILETS WITH LAZY LOADING ===');
      
      setDistanceCalculationStatus('Loading open toilets...');
      
      // ENHANCED: Use getOpenToilets with lazy loading
      const data = await getOpenToilets(
        userLocation || undefined,
        (updatedToilets) => {
          // Progressive update callback
          setToilets([...updatedToilets]);
          const googleCount = updatedToilets.filter(t => t.isGoogleDistance).length;
          setDistanceCalculationStatus(`Calculated ${googleCount}/${updatedToilets.length} accurate distances`);
        }
      );
      
      console.log(`🕐 Loaded ${data.length} open toilets with lazy loading`);
      setToilets(data);
      setDistanceCalculationStatus('');
    } catch (error) {
      console.error('❌ Error loading open toilets:', error);
      Alert.alert('Error', 'Failed to load toilets. Please try again.');
      setDistanceCalculationStatus('');
    } finally {
      setLoading(false);
    }
  };

  // ENHANCED: Get highlights like Top Rated page
  const getHighlights = (toilet: Toilet): string[] => {
    const highlights = [];
    if (toilet.rating && toilet.rating >= 4.5) highlights.push('Excellent');
    if (toilet.wheelchair === 'Yes') highlights.push('Accessible');
    if (toilet.is_paid === 'No' || toilet.is_paid === 'Free') highlights.push('Free');
    if (toilet.shower === 'Yes') highlights.push('Shower');
    if (toilet.baby === 'Yes') highlights.push('Baby Care');
    return highlights.slice(0, 3);
  };

  // ENHANCED: Get badge color like Top Rated page
  const getBadgeColor = (rating: number | null) => {
    if (!rating) return '#666';
    if (rating >= 4.8) return '#E74C3C'; // VIP
    if (rating >= 4.6) return '#8E44AD'; // Premium
    if (rating >= 4.4) return '#2980B9'; // Executive
    return '#34C759'; // Good
  };

  const getBadgeText = (rating: number | null) => {
    if (!rating) return 'Open';
    if (rating >= 4.8) return 'VIP';
    if (rating >= 4.6) return 'Premium';
    if (rating >= 4.4) return 'Executive';
    return 'Quality';
  };

  // ENHANCED: Use Google API distance
  const getDistance = (toilet: Toilet): string => {
    return getToiletDistance(toilet, userLocation || undefined);
  };

  const getTimeColor = (workingHours: string | null) => {
    if (!workingHours) return '#34C759';
    if (workingHours.includes('24') || workingHours.includes('Always')) return '#34C759';
    return '#34C759'; // Assume open for demo
  };

  const getOpenStatus = (toilet: Toilet) => {
    if (!toilet.working_hours) return 'Open 24/7';
    if (toilet.working_hours.includes('24')) return 'Open 24/7';
    return formatWorkingHours(toilet.working_hours); // Use proper formatting
  };

  const navigateToToiletDetail = (toilet: Toilet) => {
    router.push({
      pathname: '/toilet-detail',
      params: { toiletId: toilet.uuid }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading open toilets with lazy distance calculation...</Text>
          {distanceCalculationStatus && (
            <Text style={styles.distanceStatusText}>{distanceCalculationStatus}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Open Now</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>{toilets.length} toilets currently open</Text>
        <Text style={styles.resultsSubtext}>
          Real-time availability • {userLocation ? 'With accurate Google distances' : 'Enable location for distances'}
        </Text>
        {distanceCalculationStatus && (
          <Text style={styles.distanceStatusText}>{distanceCalculationStatus}</Text>
        )}
      </View>

      {/* Toilet List */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {toilets.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Open Toilets</Text>
            <Text style={styles.emptyStateText}>
              No toilets appear to be open right now. This might be due to:
              {'\n'}• Limited operating hours data
              {'\n'}• All facilities currently closed
              {'\n'}• Database connectivity issues
            </Text>
          </View>
        ) : (
          toilets.map((toilet, index) => (
            <TouchableOpacity 
              key={toilet.uuid} 
              style={styles.toiletCard}
              onPress={() => navigateToToiletDetail(toilet)}
              activeOpacity={0.7}
            >
              <View style={styles.openBadge}>
                <CheckCircle size={14} color="#34C759" fill="#34C759" />
                <Text style={styles.openBadgeText}>OPEN</Text>
              </View>
              
              {toilet.isGoogleDistance && (
                <View style={styles.googleBadge}>
                  <Text style={styles.googleBadgeText}>📍</Text>
                </View>
              )}
              
              <Image 
                source={{ 
                  uri: toilet.image_url || 'https://images.pexels.com/photos/6585756/pexels-photo-6585756.jpeg?auto=compress&cs=tinysrgb&w=400'
                }} 
                style={styles.toiletImage} 
              />
              
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.toiletName} numberOfLines={1}>
                      {toilet.name || 'Public Toilet'}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: getBadgeColor(toilet.rating) }]}>
                      <Text style={styles.badgeText}>{getBadgeText(toilet.rating)}</Text>
                    </View>
                  </View>
                  <View style={styles.distanceContainer}>
                    <MapPin size={12} color="#007AFF" />
                    <Text style={styles.distanceText}>{getDistance(toilet)}</Text>
                    {toilet.isGoogleDistance && (
                      <Text style={styles.googleIndicator}>📍</Text>
                    )}
                  </View>
                </View>

                <View style={styles.ratingRow}>
                  <View style={styles.ratingContainer}>
                    <Star size={16} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.ratingText}>{toilet.rating?.toFixed(1) || 'N/A'}</Text>
                    <Text style={styles.reviewCount}>({toilet.reviews || 0} reviews)</Text>
                  </View>
                  
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(toilet.working_hours) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(toilet.working_hours) }]}>
                      {getStatusText(toilet.working_hours)}
                    </Text>
                  </View>
                </View>

                {toilet.durationText && (
                  <View style={styles.durationRow}>
                    <Clock size={12} color="#666" />
                    <Text style={styles.durationText}>
                      {toilet.durationText} drive
                    </Text>
                  </View>
                )}

                <View style={styles.hoursRow}>
                  <Clock size={12} color="#666" />
                  <Text style={styles.hoursText}>
                    {getOpenStatus(toilet)}
                  </Text>
                </View>

                {/* ENHANCED: Add highlights like Top Rated page */}
                <View style={styles.highlightsContainer}>
                  {getHighlights(toilet).map((highlight, index) => (
                    <View key={index} style={styles.highlightTag}>
                      <Text style={styles.highlightText}>"{highlight}"</Text>
                    </View>
                  ))}
                </View>

                {/* ENHANCED: Use FeatureBadges component like Top Rated page */}
                <FeatureBadges toilet={toilet} maxBadges={4} size="small" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  distanceStatusText: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultsCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  resultsSubtext: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  toiletCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  openBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  openBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 4,
  },
  googleBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 2,
  },
  googleBadgeText: {
    fontSize: 12,
  },
  toiletImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#f0f0f0',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameContainer: {
    flex: 1,
    marginRight: 12,
  },
  toiletName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 4,
  },
  googleIndicator: {
    fontSize: 10,
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hoursText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  highlightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  highlightTag: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  highlightText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '500',
    fontStyle: 'italic',
  },
});