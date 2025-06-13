// Global distance cache that loads once when app opens
import { LocationData, getBatchGoogleDistances, GoogleDistanceResult } from './location';
import { supabase } from './supabase';

interface GlobalCacheEntry {
  result: GoogleDistanceResult;
  timestamp: number;
}

interface GlobalDistanceCache {
  [toiletId: string]: GlobalCacheEntry;
}

class GlobalDistanceCacheManager {
  private cache: Map<string, GlobalCacheEntry> = new Map();
  private isLoaded = false;
  private isLoading = false;
  private userLocation: LocationData | null = null;
  private listeners: Set<(cache: Map<string, GlobalCacheEntry>) => void> = new Set();

  // Subscribe to cache updates
  subscribe(callback: (cache: Map<string, GlobalCacheEntry>) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners of cache updates
  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.cache));
  }

  // Initialize the global cache with all toilets
  async initializeCache(userLocation: LocationData): Promise<void> {
    if (this.isLoading || (this.isLoaded && this.userLocation && 
        Math.abs(this.userLocation.latitude - userLocation.latitude) < 0.001 &&
        Math.abs(this.userLocation.longitude - userLocation.longitude) < 0.001)) {
      console.log('🗂️ Global cache already loaded or loading for this location');
      return;
    }

    try {
      this.isLoading = true;
      this.userLocation = userLocation;
      
      console.log('🗂️ === INITIALIZING GLOBAL DISTANCE CACHE ===');
      console.log('📍 User location:', userLocation);

      // Get all toilets from database
      const { data: toilets, error } = await supabase
        .from('kakoos')
        .select('uuid, name, latitude, longitude')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        console.error('❌ Error fetching toilets for global cache:', error);
        return;
      }

      if (!toilets || toilets.length === 0) {
        console.log('⚠️ No toilets found for global cache');
        return;
      }

      console.log(`📊 Loading distances for ${toilets.length} toilets into global cache...`);

      // Get all distances in batch
      const distanceResults = await getBatchGoogleDistances(
        userLocation.latitude,
        userLocation.longitude,
        toilets.map(t => ({
          latitude: t.latitude,
          longitude: t.longitude,
          uuid: t.uuid,
          name: t.name
        }))
      );

      // Store in cache
      const timestamp = Date.now();
      distanceResults.forEach((result, toiletId) => {
        this.cache.set(toiletId, {
          result,
          timestamp
        });
      });

      this.isLoaded = true;
      console.log(`✅ Global distance cache loaded with ${this.cache.size} entries`);
      
      // Notify all listeners
      this.notifyListeners();

    } catch (error) {
      console.error('❌ Error initializing global distance cache:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Get distance from cache
  getDistance(toiletId: string): GoogleDistanceResult | null {
    const entry = this.cache.get(toiletId);
    if (!entry) return null;

    // Check if entry is still valid (1 hour)
    const isValid = (Date.now() - entry.timestamp) < (60 * 60 * 1000);
    if (!isValid) {
      this.cache.delete(toiletId);
      return null;
    }

    return entry.result;
  }

  // Check if cache is loaded
  isCacheLoaded(): boolean {
    return this.isLoaded;
  }

  // Check if cache is loading
  isCacheLoading(): boolean {
    return this.isLoading;
  }

  // Get cache size
  getCacheSize(): number {
    return this.cache.size;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    this.isLoaded = false;
    this.userLocation = null;
    console.log('🗑️ Global distance cache cleared');
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      userLocation: this.userLocation
    };
  }
}

// Export singleton instance
export const globalDistanceCache = new GlobalDistanceCacheManager();