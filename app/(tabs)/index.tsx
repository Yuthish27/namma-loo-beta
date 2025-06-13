// FIXED HomeScreen with GLOBAL CACHE and proper distance display + FILTER INTEGRATION + TOILET IMAGES + AREA NAME PARSING + RECENT TOILET CACHE

import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, RefreshControl } from 'react-native';
import { Search, MapPin, Star, Clock, RefreshCw, Navigation, Share, Filter } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { getToilets, getTopRatedToilets, testConnection, searchToilets, Toilet } from '@/lib/supabase';
import { getCurrentLocation, LocationData, getToiletDistance } from '@/lib/location';
import { globalDistanceCache } from '@/lib/globalDistanceCache';
import { formatWorkingHours, getStatusColor, getStatusText } from '@/lib/workingHours';
import { getLocationDisplayName, getFormattedLocation } from '@/lib/addressParser';
import { recentToiletCache, RecentToiletEntry } from '@/lib/recentToiletCache';
import FeatureBadges from '@/components/FeatureBadges';
import FilterModal, { FilterOptions, defaultFilters } from '@/components/FilterModal';
import { applyFilters, getFilterSummary, getActiveFilterCount } from '@/lib/filtering';

// Mock storage functions - replace with your actual storage implementation
interface RecentSearch {
  query: string;
  resultCount: number;
  timestamp: Date;
}

const saveRecentSearch = async (query: string, resultCount: number): Promise<void> => {
  console.log('Saving recent search:', query, resultCount);
};

const getRecentSearches = async (): Promise<RecentSearch[]> => {
  return [
    { query: 'Public toilets in Nandanam', resultCount: 5, timestamp: new Date() },
    { query: 'Clean restrooms', resultCount: 8, timestamp: new Date() },
    { query: 'Accessible facilities', resultCount: 3, timestamp: new Date() },
    { query: 'Emergency toilets', resultCount: 12, timestamp: new Date() },
  ];
};

// Mock Share Modal Component
const ShareModal = ({ visible, onClose, toilet }: {
  visible: boolean;
  onClose: () => void;
  toilet: Toilet;
}) => {
  if (!visible) return null;
  
  return (
    <View style={modalStyles.overlay}>
      <View style={modalStyles.container}>
        <Text style={modalStyles.title}>Share {toilet.name || 'Toilet'}</Text>
        <Text style={modalStyles.subtitle}>Share functionality will be implemented here</Text>
        <TouchableOpacity style={modalStyles.button} onPress={onClose}>
          <Text style={modalStyles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [topRatedToilets, setTopRatedToilets] = useState<Toilet[]>([]);
  const [searchResults, setSearchResults] = useState<Toilet[]>([]);
  const [filteredToilets, setFilteredToilets] = useState<Toilet[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [recentToilets, setRecentToilets] = useState<RecentToiletEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedToilet, setSelectedToilet] = useState<Toilet | null>(null);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>(defaultFilters);
  const [globalCacheStatus, setGlobalCacheStatus] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      performSearch();
    } else {
      // Apply filters to all toilets when not searching
      applyFiltersToToilets();
    }
  }, [searchQuery, userLocation, toilets, currentFilters]);

  // ENHANCED: Initialize app with global cache and recent toilet cache
  const initializeApp = async () => {
    await getUserLocation();
    await loadToilets();
    await loadRecentSearches();
    
    // Subscribe to recent toilet cache updates
    recentToiletCache.subscribe((recentToilets) => {
      // ENHANCED: Only show toilets that were both searched AND viewed
      const searchedAndViewed = recentToilets.filter(toilet => 
        toilet.searchQuery && toilet.viewCount > 0
      );
      setRecentToilets(searchedAndViewed);
    });
  };

  const applyFiltersToToilets = async () => {
    try {
      const filtered = applyFilters(toilets, currentFilters, userLocation || undefined);
      setFilteredToilets(filtered);
      setSearchResults([]);
    } catch (error) {
      console.error('Error applying filters:', error);
      setFilteredToilets(toilets);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const searches = await getRecentSearches();
      setRecentSearches(searches);
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const getUserLocation = async () => {
    try {
      setLocationLoading(true);
      console.log('📍 === GETTING USER LOCATION FOR HOME SCREEN ===');
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation(location);
        console.log('✅ Got user location for Home Screen:', location);
        
        // ENHANCED: Initialize global distance cache
        setGlobalCacheStatus('Initializing global distance cache...');
        await globalDistanceCache.initializeCache(location);
        setGlobalCacheStatus(`Global cache loaded with ${globalDistanceCache.getCacheSize()} distances`);
        
        // Subscribe to cache updates
        globalDistanceCache.subscribe((cache) => {
          setGlobalCacheStatus(`Global cache: ${cache.size} distances loaded`);
          // Trigger re-render of toilets to show updated distances
          if (toilets.length > 0) {
            setToilets([...toilets]);
          }
          if (topRatedToilets.length > 0) {
            setTopRatedToilets([...topRatedToilets]);
          }
        });
        
      } else {
        console.log('⚠️ Could not get user location, using default');
        setUserLocation({
          latitude: 12.9716,
          longitude: 77.5946
        });
      }
    } catch (error) {
      console.error('❌ Error getting location for Home Screen:', error);
      setUserLocation({
        latitude: 12.9716,
        longitude: 77.5946
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      console.log('🔍 === PERFORMING SEARCH WITH GLOBAL CACHE ===');
      console.log(`Query: "${searchQuery}"`);
      
      // Search toilets - they will use global cache automatically
      const results = await searchToilets(searchQuery, userLocation || undefined);
      
      console.log(`📊 Search returned ${results.length} results`);
      
      // Apply filters to search results
      const filtered = applyFilters(results, currentFilters, userLocation || undefined);
      setSearchResults(filtered);
      
      // ENHANCED: Add search results to recent toilet cache
      filtered.forEach(toilet => {
        recentToiletCache.addRecentSearch(toilet, searchQuery);
      });
      
      // Save search to recent searches
      await saveRecentSearch(searchQuery, filtered.length);
      await loadRecentSearches();
      
      console.log(`✅ Search complete: ${filtered.length} filtered results`);
    } catch (error) {
      console.error('❌ Error searching toilets:', error);
      setSearchResults([]);
    }
  };

  const loadToilets = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('Testing connection...');
      
      const connectionResult = await testConnection();
      if (!connectionResult.success) {
        setConnectionStatus('Connection failed');
        setError(`Connection failed: ${connectionResult.error}`);
        console.error('Connection details:', connectionResult.details);
        return;
      }
      
      setConnectionStatus('Loading toilets with global cache...');
      
      // ENHANCED: Load all toilets - they will use global cache automatically
      console.log('🗺️ === LOADING ALL TOILETS WITH GLOBAL CACHE ===');
      const allToilets = await getToilets(userLocation || undefined);
      
      console.log(`📊 Loaded ${allToilets.length} toilets with global cache`);
      setToilets(allToilets);
      
      // ENHANCED: Load top rated toilets - they will use global cache automatically
      console.log('⭐ === LOADING TOP RATED TOILETS WITH GLOBAL CACHE ===');
      const topRated = await getTopRatedToilets(5, userLocation || undefined);
      
      console.log(`⭐ Loaded ${topRated.length} top rated toilets with global cache`);
      setTopRatedToilets(topRated);
      
      if (allToilets.length === 0) {
        setConnectionStatus('No toilets found in database');
        setError('The database appears to be empty. Please check if data has been imported.');
      } else {
        setConnectionStatus(`✅ Loaded ${allToilets.length} toilets with global cache`);
      }
      
      // Apply initial filters
      const filtered = applyFilters(allToilets, currentFilters, userLocation || undefined);
      setFilteredToilets(filtered);
      
    } catch (error: any) {
      console.error('❌ Error loading toilets:', error);
      setConnectionStatus('Error loading data');
      setError(error.message || 'Failed to load toilets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadToilets(), getUserLocation()]);
    setRefreshing(false);
  }, []);

  const handleApplyFilters = async (filters: FilterOptions) => {
    console.log('🔍 Applying new filters:', filters);
    setCurrentFilters(filters);
  };

  // ENHANCED: Safe distance calculation using global cache
  const getDistance = (toilet: Toilet): string => {
    return getToiletDistance(toilet, userLocation || undefined);
  };

  const navigateToToiletDetail = (toilet: Toilet) => {
    console.log('🚀 Navigating to toilet detail:', toilet.uuid);
    
    // ENHANCED: Add to recent views when navigating to detail
    recentToiletCache.addRecentView(toilet);
    
    router.push({
      pathname: '/toilet-detail',
      params: { toiletId: toilet.uuid }
    });
  };

  const navigateToNearMe = () => {
    router.push('/near-me');
  };

  const navigateToTopRated = () => {
    router.push('/top-rated');
  };

  const navigateToOpenNow = () => {
    router.push('/open-now');
  };

  const handleRecentSearchPress = async (search: RecentSearch) => {
    setSearchQuery(search.query);
  };

  // ENHANCED: Handle recent toilet press
  const handleRecentToiletPress = (recentToilet: RecentToiletEntry) => {
    // Navigate to toilet detail
    router.push({
      pathname: '/toilet-detail',
      params: { toiletId: recentToilet.toiletId }
    });
    
    // Update recent views
    recentToiletCache.addRecentView({
      uuid: recentToilet.toiletId,
      name: recentToilet.name,
      address: recentToilet.address,
      rating: recentToilet.rating,
      image_url: recentToilet.image_url
    });
  };

  const handleShareToilet = (toilet: Toilet) => {
    setSelectedToilet(toilet);
    setShareModalVisible(true);
  };

  const getDisplayToilets = () => {
    if (searchQuery.length > 0) {
      return searchResults;
    }
    return filteredToilets;
  };

  const activeFilterCount = getActiveFilterCount(currentFilters);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{connectionStatus}</Text>
        {locationLoading && (
          <Text style={styles.locationText}>Getting your location...</Text>
        )}
        {globalCacheStatus && (
          <Text style={styles.cacheStatusText}>{globalCacheStatus}</Text>
        )}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.retryButton} onPress={loadToilets}>
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Namma Loo</Text>
        <Text style={styles.subtitle}>Smart Toilet Finder by Sprint6</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>{connectionStatus}</Text>
          {userLocation && (
            <View style={styles.locationIndicator}>
              <Navigation size={12} color="#34C759" />
              <Text style={styles.locationText}>Global cache enabled</Text>
            </View>
          )}
        </View>
        {globalCacheStatus && (
          <Text style={styles.cacheStatusText}>{globalCacheStatus}</Text>
        )}
        {error && (
          <Text style={styles.errorStatusText}>{error}</Text>
        )}
      </View>

      {/* Search Bar with Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for toilets, locations..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Filter Button */}
        <TouchableOpacity 
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Filter size={20} color={activeFilterCount > 0 ? "#FFFFFF" : "#007AFF"} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <View style={styles.filterSummary}>
          <Text style={styles.filterSummaryText}>
            {getFilterSummary(currentFilters)}
          </Text>
          <TouchableOpacity 
            style={styles.clearFiltersButton}
            onPress={() => setCurrentFilters(defaultFilters)}
          >
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Results or Filtered Results */}
      {(searchQuery.length > 0 || activeFilterCount > 0) && (
        <View style={styles.searchResults}>
          <Text style={styles.sectionTitle}>
            {searchQuery.length > 0 
              ? `Search Results (${getDisplayToilets().length})`
              : `Filtered Results (${getDisplayToilets().length})`
            }
          </Text>
          {getDisplayToilets().length === 0 ? (
            <Text style={styles.noResultsText}>
              {searchQuery.length > 0 
                ? 'No toilets found matching your search and filters.'
                : 'No toilets match your current filters.'
              }
            </Text>
          ) : (
            getDisplayToilets().slice(0, 8).map((toilet) => (
              <TouchableOpacity 
                key={toilet.uuid} 
                style={styles.locationItem}
                onPress={() => navigateToToiletDetail(toilet)}
              >
                {/* ENHANCED: Toilet Image instead of share/location buttons */}
                <Image 
                  source={{ 
                    uri: toilet.image_url || 'https://images.pexels.com/photos/6585757/pexels-photo-6585757.jpeg?auto=compress&cs=tinysrgb&w=200'
                  }} 
                  style={styles.toiletThumbnail} 
                />
                
                <View style={styles.locationInfo}>
                  <View style={styles.locationHeader}>
                    <Text style={styles.locationName}>{toilet.name || 'Public Toilet'}</Text>
                  </View>
                  <View style={styles.locationMeta}>
                    <Star size={14} color="#FF9500" />
                    <Text style={styles.rating}>{toilet.rating?.toFixed(1) || 'N/A'}</Text>
                    <Text style={styles.distance}>• {getDistance(toilet)}</Text>
                    {toilet.isGoogleDistance && (
                      <Text style={styles.googleBadge}>📍</Text>
                    )}
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(toilet.working_hours) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(toilet.working_hours) }]}>
                      {getStatusText(toilet.working_hours)}
                    </Text>
                  </View>
                  {/* ENHANCED: Show area name from parsed address */}
                  <View style={styles.areaRow}>
                    <MapPin size={12} color="#666" />
                    <Text style={styles.areaText}>
                      {getLocationDisplayName(toilet.address || '')}
                    </Text>
                  </View>
                  <FeatureBadges toilet={toilet} maxBadges={3} size="small" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* Suggested Toilets */}
      {topRatedToilets.length > 0 && searchQuery.length === 0 && activeFilterCount === 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>Highly Rated Near You</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsContainer}
          >
            {topRatedToilets.map((toilet) => (
              <TouchableOpacity 
                key={toilet.uuid} 
                style={styles.suggestionCard}
                onPress={() => navigateToToiletDetail(toilet)}
              >
                <Image 
                  source={{ 
                    uri: toilet.image_url || 'https://images.pexels.com/photos/6585757/pexels-photo-6585757.jpeg?auto=compress&cs=tinysrgb&w=400'
                  }} 
                  style={styles.toiletImage} 
                />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.toiletName} numberOfLines={2}>
                      {toilet.name || 'Public Toilet'}
                    </Text>
                    {/* REMOVED: Share button from suggestion cards */}
                  </View>
                  
                  <View style={styles.ratingContainer}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.ratingText}>{toilet.rating?.toFixed(1) || 'N/A'}</Text>
                    <Text style={styles.distanceText}>• {getDistance(toilet)}</Text>
                    {toilet.isGoogleDistance && (
                      <Text style={styles.googleBadgeSmall}>📍</Text>
                    )}
                  </View>

                  <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(toilet.working_hours) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(toilet.working_hours) }]}>
                      {getStatusText(toilet.working_hours)}
                    </Text>
                  </View>

                  {/* ENHANCED: Show area name in suggestion cards */}
                  <View style={styles.areaContainer}>
                    <MapPin size={10} color="#666" />
                    <Text style={styles.areaTextSmall}>
                      {getLocationDisplayName(toilet.address || '')}
                    </Text>
                  </View>

                  <FeatureBadges toilet={toilet} maxBadges={2} size="small" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Quick Actions */}
      {searchQuery.length === 0 && activeFilterCount === 0 && (
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={navigateToNearMe}>
            <MapPin size={24} color="#007AFF" />
            <Text style={styles.actionText}>Near Me</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={navigateToTopRated}>
            <Star size={24} color="#FF9500" />
            <Text style={styles.actionText}>Top Rated</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={navigateToOpenNow}>
            <Clock size={24} color="#34C759" />
            <Text style={styles.actionText}>Open Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ENHANCED: Recently Viewed Section - MOVED UNDER QUICK ACTIONS */}
      {recentToilets.length > 0 && searchQuery.length === 0 && activeFilterCount === 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Viewed ({recentToilets.length})</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentToiletsContainer}
          >
            {recentToilets.slice(0, 10).map((recentToilet) => (
              <TouchableOpacity 
                key={recentToilet.toiletId} 
                style={styles.recentToiletCard}
                onPress={() => handleRecentToiletPress(recentToilet)}
              >
                <Image 
                  source={{ 
                    uri: recentToilet.image_url || 'https://images.pexels.com/photos/6585757/pexels-photo-6585757.jpeg?auto=compress&cs=tinysrgb&w=400'
                  }} 
                  style={styles.recentToiletImage} 
                />
                <View style={styles.recentToiletContent}>
                  <Text style={styles.recentToiletName} numberOfLines={2}>
                    {recentToilet.name}
                  </Text>
                  
                  <View style={styles.recentToiletMeta}>
                    {recentToilet.rating && (
                      <View style={styles.ratingContainer}>
                        <Star size={12} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.ratingText}>{recentToilet.rating.toFixed(1)}</Text>
                      </View>
                    )}
                    <Text style={styles.viewCountText}>• {recentToilet.viewCount} views</Text>
                  </View>

                  <Text style={styles.recentToiletArea} numberOfLines={1}>
                    {getLocationDisplayName(recentToilet.address)}
                  </Text>

                  
                  <Text style={styles.recentToiletTime}>
                    {new Date(recentToilet.viewedAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* All Toilets Section */}
      {toilets.length > 0 && searchQuery.length === 0 && activeFilterCount === 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Toilets ({toilets.length})</Text>
          {toilets.slice(0, 8).map((toilet) => (
            <TouchableOpacity 
              key={toilet.uuid} 
              style={styles.locationItem}
              onPress={() => navigateToToiletDetail(toilet)}
            >
              {/* ENHANCED: Toilet Image instead of share/location buttons */}
              <Image 
                source={{ 
                  uri: toilet.image_url || 'https://images.pexels.com/photos/6585757/pexels-photo-6585757.jpeg?auto=compress&cs=tinysrgb&w=200'
                }} 
                style={styles.toiletThumbnail} 
              />
              
              <View style={styles.locationInfo}>
                <View style={styles.locationHeader}>
                  <Text style={styles.locationName}>{toilet.name || 'Public Toilet'}</Text>
                </View>
                <View style={styles.locationMeta}>
                  <Star size={14} color="#FF9500" />
                  <Text style={styles.rating}>{toilet.rating?.toFixed(1) || 'N/A'}</Text>
                  <Text style={styles.distance}>• {getDistance(toilet)}</Text>
                  {toilet.isGoogleDistance && (
                    <Text style={styles.googleBadge}>📍</Text>
                  )}
                  <Text style={styles.reviewCount}>• {toilet.reviews} reviews</Text>
                </View>
                {/* ENHANCED: Show area name from parsed address */}
                <View style={styles.areaRow}>
                  <MapPin size={12} color="#666" />
                  <Text style={styles.areaText}>
                    {getLocationDisplayName(toilet.address || '')}
                  </Text>
                </View>
                <FeatureBadges toilet={toilet} maxBadges={3} size="small" />
              </View>
            </TouchableOpacity>
          ))}
          
          {toilets.length > 8 && (
            <TouchableOpacity style={styles.viewAllButton} onPress={navigateToNearMe}>
              <Text style={styles.viewAllText}>View All {toilets.length} Toilets</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Empty State */}
      {toilets.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No toilets found</Text>
          <Text style={styles.emptySubtext}>
            The database appears to be empty. Please check your connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadToilets}>
            <RefreshCw size={16} color="#fff" />
            <Text style={styles.retryText}>Retry Loading</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={currentFilters}
      />

      {/* Share Modal */}
      {selectedToilet && (
        <ShareModal
          visible={shareModalVisible}
          onClose={() => {
            setShareModalVisible(false);
            setSelectedToilet(null);
          }}
          toilet={selectedToilet}
        />
      )}
    </ScrollView>
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
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 12,
    color: '#34C759',
    textAlign: 'center',
    marginBottom: 10,
  },
  cacheStatusText: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  locationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorStatusText: {
    fontSize: 12,
    color: '#f44336',
    fontStyle: 'italic',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  clearText: {
    fontSize: 20,
    color: '#999',
    fontWeight: 'bold',
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#e3f2fd',
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  filterSummaryText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
    flex: 1,
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
  searchResults: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  suggestionsSection: {
    marginBottom: 30,
  },
  suggestionsContainer: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  suggestionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 16,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  toiletImage: {
    width: '100%',
    height: 140,
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
  toiletName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    lineHeight: 22,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  googleBadge: {
    fontSize: 12,
    marginLeft: 4,
  },
  googleBadgeSmall: {
    fontSize: 10,
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    marginLeft: 4,
  },
  // ENHANCED: New area display styles
  areaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  areaTextSmall: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    marginLeft: 20,
  },
  // ENHANCED: Recent toilets styles
  recentToiletsContainer: {
    paddingLeft: 0,
    paddingRight: 10,
  },
  recentToiletCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  recentToiletImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#f0f0f0',
  },
  recentToiletContent: {
    padding: 12,
  },
  recentToiletName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
    lineHeight: 18,
  },
  recentToiletMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  viewCountText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  recentToiletArea: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  searchQueryContainer: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  searchQueryText: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '500',
  },
  recentToiletTime: {
    fontSize: 10,
    color: '#999',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  // ENHANCED: New toilet thumbnail styles
  toiletThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  distance: {
    fontSize: 14,
    color: '#999',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#999',
    marginLeft: 4,
  },
  // ENHANCED: Area display styles for location items
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  areaText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  viewAllButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Modal styles for Share modal
const modalStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 300,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});