// lib/location.ts - Enhanced with global cache integration
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { globalDistanceCache } from './globalDistanceCache';

// GET YOUR API KEY FROM: https://console.cloud.google.com/
// Enable "Distance Matrix API" in Google Cloud Console
const GOOGLE_MAPS_API_KEY = 'AIzaSyC1pMiLFiimoY1dWsJarkTiNzc-PWg_SlE'; // Replace with your actual API key

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GoogleDistanceResult {
  distanceKm: number;
  distanceText: string;
  durationText: string;
  durationMinutes: number;
  isGoogleDistance: boolean;
}

// ENHANCED CACHING SYSTEM
interface CacheEntry {
  result: GoogleDistanceResult;
  timestamp: number;
  userLocation: string; // "lat,lng" format
}

interface DistanceCache {
  [toiletId: string]: CacheEntry;
}

const CACHE_KEY = 'google_distance_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 500; // Maximum number of cached entries

// In-memory cache for faster access
let memoryCache: Map<string, CacheEntry> = new Map();

// Generate cache key for distance calculation
const getCacheKey = (userLat: number, userLng: number, toiletId: string): string => {
  return `${userLat.toFixed(4)}_${userLng.toFixed(4)}_${toiletId}`;
};

// Load cache from storage
const loadCache = async (): Promise<void> => {
  try {
    let cacheData: string | null;
    
    if (Platform.OS === 'web') {
      cacheData = localStorage.getItem(CACHE_KEY);
    } else {
      cacheData = await AsyncStorage.getItem(CACHE_KEY);
    }
    
    if (cacheData) {
      const cache: DistanceCache = JSON.parse(cacheData);
      const now = Date.now();
      
      // Load valid entries into memory cache
      Object.entries(cache).forEach(([key, entry]) => {
        if (now - entry.timestamp < CACHE_DURATION) {
          memoryCache.set(key, entry);
        }
      });
      
      console.log(`📋 Loaded ${memoryCache.size} cached distance entries`);
    }
  } catch (error) {
    console.error('❌ Error loading distance cache:', error);
    memoryCache.clear();
  }
};

// Save cache to storage
const saveCache = async (): Promise<void> => {
  try {
    const now = Date.now();
    const cacheToSave: DistanceCache = {};
    
    // Only save valid entries
    memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp < CACHE_DURATION) {
        cacheToSave[key] = entry;
      }
    });
    
    // Limit cache size
    const entries = Object.entries(cacheToSave);
    if (entries.length > MAX_CACHE_SIZE) {
      // Keep only the most recent entries
      const sortedEntries = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const limitedCache: DistanceCache = {};
      
      sortedEntries.slice(0, MAX_CACHE_SIZE).forEach(([key, entry]) => {
        limitedCache[key] = entry;
      });
      
      const cacheData = JSON.stringify(limitedCache);
      
      if (Platform.OS === 'web') {
        localStorage.setItem(CACHE_KEY, cacheData);
      } else {
        await AsyncStorage.setItem(CACHE_KEY, cacheData);
      }
    } else {
      const cacheData = JSON.stringify(cacheToSave);
      
      if (Platform.OS === 'web') {
        localStorage.setItem(CACHE_KEY, cacheData);
      } else {
        await AsyncStorage.setItem(CACHE_KEY, cacheData);
      }
    }
    
    console.log(`💾 Saved ${Object.keys(cacheToSave).length} distance entries to cache`);
  } catch (error) {
    console.error('❌ Error saving distance cache:', error);
  }
};

// Get cached distance
const getCachedDistance = (userLat: number, userLng: number, toiletId: string): GoogleDistanceResult | null => {
  const cacheKey = getCacheKey(userLat, userLng, toiletId);
  const cached = memoryCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`📋 Using cached distance for toilet ${toiletId}`);
    return cached.result;
  }
  
  return null;
};

// Cache distance result
const cacheDistance = (userLat: number, userLng: number, toiletId: string, result: GoogleDistanceResult): void => {
  const cacheKey = getCacheKey(userLat, userLng, toiletId);
  const entry: CacheEntry = {
    result,
    timestamp: Date.now(),
    userLocation: `${userLat},${userLng}`
  };
  
  memoryCache.set(cacheKey, entry);
  
  // Save to persistent storage (debounced)
  clearTimeout((global as any).cacheSaveTimeout);
  (global as any).cacheSaveTimeout = setTimeout(saveCache, 1000);
};

// Initialize cache on module load
loadCache();

// Get user's current location
export const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    console.log('📍 Requesting location permission...');
    
    // Check if location services are enabled
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      console.log('❌ Location services are disabled');
      return null;
    }
    
    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('❌ Location permission denied, status:', status);
      return null;
    }

    console.log('✅ Location permission granted, getting position...');
    
    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeout: 15000,
      maximumAge: 60000,
    });

    const locationData: LocationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };

    console.log('✅ Location obtained:', {
      lat: locationData.latitude.toFixed(6),
      lng: locationData.longitude.toFixed(6),
      accuracy: locationData.accuracy + 'm'
    });
    
    return locationData;
  } catch (error) {
    console.error('❌ Error getting location:', error);
    return null;
  }
};

// ENHANCED: Get accurate distance using Google Distance Matrix API with caching
export const getGoogleDistance = async (
  userLat: number,
  userLng: number,
  toiletLat: number,
  toiletLng: number,
  toiletId?: string
): Promise<GoogleDistanceResult | null> => {
  try {
    // Check cache first if we have a toilet ID
    if (toiletId) {
      const cached = getCachedDistance(userLat, userLng, toiletId);
      if (cached) {
        return cached;
      }
    }
    
    console.log('🗺️ === CALLING GOOGLE DISTANCE API ===');
    console.log(`From: ${userLat.toFixed(6)}, ${userLng.toFixed(6)}`);
    console.log(`To: ${toiletLat.toFixed(6)}, ${toiletLng.toFixed(6)}`);
    
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      console.error('❌ Google Maps API key not configured!');
      return null;
    }
    
    const origin = `${userLat},${userLng}`;
    const destination = `${toiletLat},${toiletLng}`;
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
                `origins=${encodeURIComponent(origin)}&` +
                `destinations=${encodeURIComponent(destination)}&` +
                `units=metric&` +
                `mode=driving&` +
                `key=${GOOGLE_MAPS_API_KEY}`;
    
    console.log('🌐 Making API request to Google...');
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📊 Google API response status:', data.status);
    
    if (data.status === 'OK' && 
        data.rows && 
        data.rows[0] && 
        data.rows[0].elements && 
        data.rows[0].elements[0] && 
        data.rows[0].elements[0].status === 'OK') {
      
      const element = data.rows[0].elements[0];
      const distanceKm = element.distance.value / 1000;
      const durationMinutes = element.duration.value / 60;
      
      const result: GoogleDistanceResult = {
        distanceKm,
        distanceText: element.distance.text,
        durationText: element.duration.text,
        durationMinutes,
        isGoogleDistance: true
      };
      
      // Cache the result if we have a toilet ID
      if (toiletId) {
        cacheDistance(userLat, userLng, toiletId, result);
      }
      
      console.log('✅ Google Distance result:', result);
      return result;
    } else {
      console.error('❌ Google API error or no route found:', {
        status: data.status,
        errorMessage: data.error_message,
        elementStatus: data.rows?.[0]?.elements?.[0]?.status
      });
      return null;
    }
  } catch (error) {
    console.error('❌ Error calling Google Distance API:', error);
    return null;
  }
};

// NEW: Progressive distance calculation for lazy loading
export const calculateDistancesProgressively = async (
  userLat: number,
  userLng: number,
  toilets: Array<{ latitude: number; longitude: number; uuid: string; name?: string }>,
  onProgress: (toiletId: string, result: GoogleDistanceResult) => void,
  batchSize: number = 5
): Promise<void> => {
  console.log('🔄 === PROGRESSIVE DISTANCE CALCULATION ===');
  console.log(`Processing ${toilets.length} toilets in batches of ${batchSize}`);
  
  // Process toilets in small batches to avoid overwhelming the API
  for (let i = 0; i < toilets.length; i += batchSize) {
    const batch = toilets.slice(i, i + batchSize);
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toilets.length / batchSize)}`);
    
    // Process batch in parallel
    const promises = batch.map(async (toilet) => {
      try {
        // Check cache first
        const cached = getCachedDistance(userLat, userLng, toilet.uuid);
        if (cached) {
          onProgress(toilet.uuid, cached);
          return;
        }
        
        // Calculate new distance
        const result = await getGoogleDistance(userLat, userLng, toilet.latitude, toilet.longitude, toilet.uuid);
        
        if (result) {
          onProgress(toilet.uuid, result);
        } else {
          // Fallback calculation
          const fallbackDistance = calculateDistanceFallback(userLat, userLng, toilet.latitude, toilet.longitude);
          const fallbackResult: GoogleDistanceResult = {
            distanceKm: fallbackDistance,
            distanceText: formatDistance(fallbackDistance),
            durationText: `~${Math.round(fallbackDistance * 2)} mins`,
            durationMinutes: fallbackDistance * 2,
            isGoogleDistance: false
          };
          onProgress(toilet.uuid, fallbackResult);
        }
      } catch (error) {
        console.error(`❌ Error calculating distance for ${toilet.name}:`, error);
        // Provide fallback
        const fallbackDistance = calculateDistanceFallback(userLat, userLng, toilet.latitude, toilet.longitude);
        const fallbackResult: GoogleDistanceResult = {
          distanceKm: fallbackDistance,
          distanceText: formatDistance(fallbackDistance),
          durationText: `~${Math.round(fallbackDistance * 2)} mins`,
          durationMinutes: fallbackDistance * 2,
          isGoogleDistance: false
        };
        onProgress(toilet.uuid, fallbackResult);
      }
    });
    
    await Promise.all(promises);
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < toilets.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log('✅ Progressive distance calculation complete');
};

// ENHANCED: Get distances for multiple toilets in batch with comprehensive caching
export const getBatchGoogleDistances = async (
  userLat: number,
  userLng: number,
  toilets: Array<{ latitude: number; longitude: number; uuid: string; name?: string }>
): Promise<Map<string, GoogleDistanceResult>> => {
  try {
    console.log('🗺️ === BATCH GOOGLE DISTANCE API WITH CACHING ===');
    console.log(`Getting distances for ${toilets.length} toilets...`);
    
    const results = new Map<string, GoogleDistanceResult>();
    const uncachedToilets: Array<{ latitude: number; longitude: number; uuid: string; name?: string; index: number }> = [];
    
    // Check cache for each toilet first
    toilets.forEach((toilet, index) => {
      const cached = getCachedDistance(userLat, userLng, toilet.uuid);
      if (cached) {
        results.set(toilet.uuid, cached);
        console.log(`📋 Using cached distance for ${toilet.name || toilet.uuid}`);
      } else {
        uncachedToilets.push({ ...toilet, index });
      }
    });
    
    console.log(`📋 Found ${results.size} cached, need to fetch ${uncachedToilets.length}`);
    
    if (uncachedToilets.length === 0) {
      console.log('✅ All distances found in cache!');
      return results;
    }
    
    const origin = `${userLat},${userLng}`;
    
    // Google allows up to 25 destinations per request
    const batchSize = 25;
    const batches = [];
    
    for (let i = 0; i < uncachedToilets.length; i += batchSize) {
      batches.push(uncachedToilets.slice(i, i + batchSize));
    }
    
    console.log(`📦 Processing ${batches.length} batches for uncached toilets...`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} toilets...`);
      
      const destinations = batch
        .map(toilet => `${toilet.latitude},${toilet.longitude}`)
        .join('|');
      
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
                  `origins=${encodeURIComponent(origin)}&` +
                  `destinations=${encodeURIComponent(destinations)}&` +
                  `units=metric&` +
                  `mode=driving&` +
                  `key=${GOOGLE_MAPS_API_KEY}`;
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' && data.rows && data.rows[0]) {
          const elements = data.rows[0].elements;
          
          elements.forEach((element: any, index: number) => {
            if (element.status === 'OK') {
              const toilet = batch[index];
              const distanceKm = element.distance.value / 1000;
              const durationMinutes = element.duration.value / 60;
              
              const result: GoogleDistanceResult = {
                distanceKm,
                distanceText: element.distance.text,
                durationText: element.duration.text,
                durationMinutes,
                isGoogleDistance: true
              };
              
              results.set(toilet.uuid, result);
              
              // Cache the result
              cacheDistance(userLat, userLng, toilet.uuid, result);
              
              console.log(`✅ ${toilet.name || 'Toilet'}: ${element.distance.text}`);
            } else {
              console.warn(`⚠️ No route to ${batch[index].name || 'toilet'}: ${element.status}`);
              
              // Add fallback result for failed Google API calls
              const toilet = batch[index];
              const fallbackDistance = calculateDistanceFallback(userLat, userLng, toilet.latitude, toilet.longitude);
              
              if (fallbackDistance < 999) {
                const fallbackResult: GoogleDistanceResult = {
                  distanceKm: fallbackDistance,
                  distanceText: formatDistance(fallbackDistance),
                  durationText: `~${Math.round(fallbackDistance * 2)} mins`,
                  durationMinutes: fallbackDistance * 2,
                  isGoogleDistance: false
                };
                
                results.set(toilet.uuid, fallbackResult);
                console.log(`🔄 Using fallback for ${toilet.name || 'toilet'}: ${fallbackResult.distanceText}`);
              }
            }
          });
        } else {
          console.error('❌ Batch API error:', data.status, data.error_message);
          
          // Add fallback results for entire batch
          batch.forEach(toilet => {
            const fallbackDistance = calculateDistanceFallback(userLat, userLng, toilet.latitude, toilet.longitude);
            
            if (fallbackDistance < 999) {
              const fallbackResult: GoogleDistanceResult = {
                distanceKm: fallbackDistance,
                distanceText: formatDistance(fallbackDistance),
                durationText: `~${Math.round(fallbackDistance * 2)} mins`,
                durationMinutes: fallbackDistance * 2,
                isGoogleDistance: false
              };
              
              results.set(toilet.uuid, fallbackResult);
            }
          });
        }
        
        // Add small delay between batches to avoid rate limiting
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (batchError) {
        console.error(`❌ Error in batch ${batchIndex + 1}:`, batchError);
        
        // Add fallback results for failed batch
        batch.forEach(toilet => {
          const fallbackDistance = calculateDistanceFallback(userLat, userLng, toilet.latitude, toilet.longitude);
          
          if (fallbackDistance < 999) {
            const fallbackResult: GoogleDistanceResult = {
              distanceKm: fallbackDistance,
              distanceText: formatDistance(fallbackDistance),
              durationText: `~${Math.round(fallbackDistance * 2)} mins`,
              durationMinutes: fallbackDistance * 2,
              isGoogleDistance: false
            };
            
            results.set(toilet.uuid, fallbackResult);
          }
        });
      }
    }
    
    console.log(`✅ Got distances for ${results.size}/${toilets.length} toilets (${results.size - (toilets.length - uncachedToilets.length)} from API, ${toilets.length - uncachedToilets.length} from cache)`);
    return results;
  } catch (error) {
    console.error('❌ Error in batch Google Distance API:', error);
    return new Map();
  }
};

// FIXED: Corrected Haversine formula with proper validation
export const calculateDistanceFallback = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  console.log('🔄 Using fallback distance calculation...');
  
  // Validate coordinates
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    console.error('❌ Invalid coordinates for fallback calculation');
    return 999;
  }
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  if (distance < 0 || distance > 20000 || isNaN(distance)) {
    console.error('❌ Unrealistic fallback distance:', distance);
    return 999;
  }
  
  return distance;
};

// ENHANCED: Main distance calculation function that prioritizes Google API
export const calculateDistance = async (
  userLat: number,
  userLng: number,
  toiletLat: number,
  toiletLng: number,
  toiletId?: string
): Promise<GoogleDistanceResult> => {
  try {
    // Validate all coordinates
    if (!isValidCoordinate(userLat, userLng) || !isValidCoordinate(toiletLat, toiletLng)) {
      console.error('❌ Invalid coordinates provided to calculateDistance');
      return {
        distanceKm: 999,
        distanceText: 'Unknown',
        durationText: 'Unknown',
        durationMinutes: 0,
        isGoogleDistance: false
      };
    }
    
    // Try Google API first
    const googleResult = await getGoogleDistance(userLat, userLng, toiletLat, toiletLng, toiletId);
    
    if (googleResult) {
      return googleResult;
    }
    
    // Fallback to Haversine calculation
    console.log('🔄 Google API failed, using fallback calculation');
    const fallbackDistance = calculateDistanceFallback(userLat, userLng, toiletLat, toiletLng);
    
    return {
      distanceKm: fallbackDistance,
      distanceText: formatDistance(fallbackDistance),
      durationText: `~${Math.round(fallbackDistance * 2)} mins`,
      durationMinutes: fallbackDistance * 2,
      isGoogleDistance: false
    };
  } catch (error) {
    console.error('❌ Error in calculateDistance:', error);
    return {
      distanceKm: 999,
      distanceText: 'Unknown',
      durationText: 'Unknown',
      durationMinutes: 0,
      isGoogleDistance: false
    };
  }
};

// FIXED: Format distance for display with comprehensive validation
export const formatDistance = (distance: number | undefined | null): string => {
  try {
    // Handle undefined, null, or invalid values
    if (distance === undefined || distance === null || isNaN(distance)) {
      console.warn('⚠️ formatDistance received invalid value:', distance);
      return 'Unknown';
    }
    
    // Convert to number if it's a string
    const numDistance = typeof distance === 'string' ? parseFloat(distance) : distance;
    
    // Handle unrealistic distances
    if (numDistance >= 999 || numDistance < 0 || isNaN(numDistance)) {
      return 'Unknown';
    }
    
    // Format the distance
    if (numDistance < 1) {
      const meters = Math.round(numDistance * 1000);
      return `${meters}m`;
    } else {
      return `${numDistance.toFixed(1)}km`;
    }
  } catch (error) {
    console.error('❌ Error in formatDistance:', error);
    return 'Unknown';
  }
};

// Test function to verify Google API is working
export const testGoogleDistanceAPI = async (): Promise<void> => {
  console.log('🧪 === TESTING GOOGLE DISTANCE API ===');
  
  try {
    // Test with known locations: Mumbai to Delhi
    const mumbaiLat = 19.0760;
    const mumbaiLng = 72.8777;
    const delhiLat = 28.7041;
    const delhiLng = 77.1025;
    
    console.log('🧪 Testing Mumbai to Delhi (should be ~1150km)...');
    
    const result = await getGoogleDistance(mumbaiLat, mumbaiLng, delhiLat, delhiLng);
    
    if (result) {
      console.log('✅ Google API test successful!');
      console.log(`📏 Distance: ${result.distanceText}`);
      console.log(`⏱️ Duration: ${result.durationText}`);
      
      if (result.distanceKm > 1000 && result.distanceKm < 1300) {
        console.log('✅ Distance seems reasonable for Mumbai-Delhi');
      } else {
        console.warn('⚠️ Distance seems off for Mumbai-Delhi:', result.distanceKm);
      }
    } else {
      console.error('❌ Google API test failed');
      console.log('🔧 Check your API key and make sure Distance Matrix API is enabled');
    }
  } catch (error) {
    console.error('❌ Error testing Google API:', error);
  }
};

// FIXED: Validate coordinates with proper checks
export const isValidCoordinate = (lat: number, lng: number): boolean => {
  try {
    // Check if values are numbers
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      console.error('❌ Coordinates are not numbers:', lat, lng);
      return false;
    }
    
    // Check for NaN
    if (isNaN(lat) || isNaN(lng)) {
      console.error('❌ Coordinates are NaN:', lat, lng);
      return false;
    }
    
    // Check valid ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error('❌ Coordinates out of valid range:', lat, lng);
      return false;
    }
    
    // Check for null island (0,0)
    if (lat === 0 && lng === 0) {
      console.error('❌ Coordinates are 0,0 (likely invalid)');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error validating coordinates:', error);
    return false;
  }
};

// Check if user is within a certain radius of a location
export const isWithinRadius = async (
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  radiusKm: number
): Promise<boolean> => {
  try {
    const result = await calculateDistance(userLat, userLng, targetLat, targetLng);
    return result.distanceKm <= radiusKm && result.distanceKm < 999;
  } catch (error) {
    console.error('❌ Error checking radius:', error);
    return false;
  }
};

// ENHANCED: Safe distance getter for toilets with GLOBAL CACHE priority
export const getToiletDistance = (toilet: any, userLocation?: LocationData): string => {
  try {
    // PRIORITY 1: Check global cache first
    if (userLocation && toilet.uuid) {
      const globalCacheResult = globalDistanceCache.getDistance(toilet.uuid);
      if (globalCacheResult) {
        return globalCacheResult.distanceText;
      }
    }
    
    // PRIORITY 2: Check if toilet has Google distance data
    if (toilet.distanceText && toilet.distanceText !== 'Unknown' && toilet.isGoogleDistance) {
      return toilet.distanceText;
    }
    
    // PRIORITY 3: Check if toilet has any distance text
    if (toilet.distanceText && toilet.distanceText !== 'Unknown') {
      return toilet.distanceText;
    }
    
    // PRIORITY 4: Check if toilet has calculated distance
    if (toilet.distance !== undefined && toilet.distance !== null && toilet.distance < 999) {
      return formatDistance(toilet.distance);
    }
    
    // PRIORITY 5: Try to calculate distance if we have coordinates (this will be async, so return placeholder)
    if (userLocation && toilet.latitude && toilet.longitude) {
      // This is a synchronous fallback - the async Google API call should happen elsewhere
      const fallbackDistance = calculateDistanceFallback(
        userLocation.latitude,
        userLocation.longitude,
        toilet.latitude,
        toilet.longitude
      );
      
      if (fallbackDistance < 999) {
        return formatDistance(fallbackDistance);
      }
    }
    
    // Fallback
    return 'Calculating...';
  } catch (error) {
    console.error('❌ Error getting toilet distance:', error);
    return 'Distance unknown';
  }
};

// NEW: Lazy loading function that returns toilets immediately with fallback distances, then updates progressively
export const addGoogleDistancesToToiletsLazy = async (
  toilets: any[],
  userLocation: LocationData,
  onProgressUpdate?: (updatedToilets: any[]) => void
): Promise<any[]> => {
  try {
    console.log('🔄 === LAZY LOADING GOOGLE DISTANCES ===');
    console.log(`Processing ${toilets.length} toilets with lazy loading...`);
    
    if (!userLocation || toilets.length === 0) {
      console.log('⚠️ No user location or no toilets to process');
      return toilets.map(toilet => ({
        ...toilet,
        distance: 999,
        distanceText: 'Location required',
        durationText: 'Unknown',
        isGoogleDistance: false
      }));
    }
    
    // Filter toilets with valid coordinates
    const toiletsWithCoords = toilets.filter(toilet => 
      toilet.latitude && 
      toilet.longitude && 
      isValidCoordinate(toilet.latitude, toilet.longitude)
    );
    
    console.log(`📍 Found ${toiletsWithCoords.length} toilets with valid coordinates`);
    
    if (toiletsWithCoords.length === 0) {
      return toilets.map(toilet => ({
        ...toilet,
        distance: 999,
        distanceText: 'Location unknown',
        durationText: 'Unknown',
        isGoogleDistance: false
      }));
    }
    
    // STEP 1: Return toilets immediately with fallback distances
    const toiletsWithFallback = toilets.map(toilet => {
      if (toilet.latitude && toilet.longitude && isValidCoordinate(toilet.latitude, toilet.longitude)) {
        const fallbackDistance = calculateDistanceFallback(
          userLocation.latitude,
          userLocation.longitude,
          toilet.latitude,
          toilet.longitude
        );
        
        return {
          ...toilet,
          distance: fallbackDistance,
          distanceText: 'Calculating...',
          durationText: 'Calculating...',
          isGoogleDistance: false
        };
      } else {
        return {
          ...toilet,
          distance: 999,
          distanceText: 'Location unknown',
          durationText: 'Unknown',
          isGoogleDistance: false
        };
      }
    });
    
    // Sort by fallback distance initially
    toiletsWithFallback.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    
    // STEP 2: Start progressive Google distance calculation in background
    if (onProgressUpdate) {
      calculateDistancesProgressively(
        userLocation.latitude,
        userLocation.longitude,
        toiletsWithCoords.map(t => ({
          latitude: t.latitude,
          longitude: t.longitude,
          uuid: t.uuid,
          name: t.name
        })),
        (toiletId: string, result: GoogleDistanceResult) => {
          // Update the specific toilet with Google distance
          const updatedToilets = toiletsWithFallback.map(toilet => {
            if (toilet.uuid === toiletId) {
              return {
                ...toilet,
                distance: result.distanceKm,
                distanceText: result.distanceText,
                durationText: result.durationText,
                durationMinutes: result.durationMinutes,
                isGoogleDistance: result.isGoogleDistance
              };
            }
            return toilet;
          });
          
          // Sort by updated distances
          updatedToilets.sort((a, b) => (a.distance || 999) - (b.distance || 999));
          
          // Notify about the update
          onProgressUpdate(updatedToilets);
        },
        3 // Small batch size for progressive updates
      );
    }
    
    console.log(`✅ Returning ${toiletsWithFallback.length} toilets with fallback distances (Google distances calculating in background)`);
    return toiletsWithFallback;
    
  } catch (error) {
    console.error('❌ Error in lazy loading Google distances:', error);
    return toilets.map(toilet => ({
      ...toilet,
      distance: 999,
      distanceText: 'Error calculating distance',
      durationText: 'Unknown',
      isGoogleDistance: false
    }));
  }
};

// ENHANCED: Add Google distances to toilet objects with GLOBAL CACHE integration
export const addGoogleDistancesToToilets = async (
  toilets: any[],
  userLocation: LocationData
): Promise<any[]> => {
  try {
    console.log('🗺️ === ADDING GOOGLE DISTANCES TO TOILETS WITH GLOBAL CACHE ===');
    console.log(`Processing ${toilets.length} toilets...`);
    
    if (!userLocation || toilets.length === 0) {
      console.log('⚠️ No user location or no toilets to process');
      return toilets.map(toilet => ({
        ...toilet,
        distance: 999,
        distanceText: 'Location required',
        durationText: 'Unknown',
        isGoogleDistance: false
      }));
    }
    
    // Filter toilets with valid coordinates
    const toiletsWithCoords = toilets.filter(toilet => 
      toilet.latitude && 
      toilet.longitude && 
      isValidCoordinate(toilet.latitude, toilet.longitude)
    );
    
    console.log(`📍 Found ${toiletsWithCoords.length} toilets with valid coordinates`);
    
    if (toiletsWithCoords.length === 0) {
      return toilets.map(toilet => ({
        ...toilet,
        distance: 999,
        distanceText: 'Location unknown',
        durationText: 'Unknown',
        isGoogleDistance: false
      }));
    }
    
    // Check if global cache is available
    const isGlobalCacheLoaded = globalDistanceCache.isCacheLoaded();
    console.log('🗂️ Global cache status:', isGlobalCacheLoaded ? 'Loaded' : 'Not loaded');
    
    if (isGlobalCacheLoaded) {
      // Use global cache for instant results
      const toiletsWithDistances = toilets.map(toilet => {
        const globalCacheResult = globalDistanceCache.getDistance(toilet.uuid);
        
        if (globalCacheResult) {
          return {
            ...toilet,
            distance: globalCacheResult.distanceKm,
            distanceText: globalCacheResult.distanceText,
            durationText: globalCacheResult.durationText,
            durationMinutes: globalCacheResult.durationMinutes,
            isGoogleDistance: globalCacheResult.isGoogleDistance
          };
        } else {
          // Fallback for toilets not in global cache
          return {
            ...toilet,
            distance: 999,
            distanceText: 'Location unknown',
            durationText: 'Unknown',
            isGoogleDistance: false
          };
        }
      });
      
      // Sort by distance (closest first)
      toiletsWithDistances.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      
      console.log(`✅ Successfully used global cache for ${toiletsWithDistances.length} toilets`);
      return toiletsWithDistances;
    } else {
      // Fallback to batch processing if global cache not available
      console.log('🔄 Global cache not available, using batch processing...');
      
      // Get Google distances in batch
      const distanceResults = await getBatchGoogleDistances(
        userLocation.latitude,
        userLocation.longitude,
        toiletsWithCoords.map(t => ({
          latitude: t.latitude,
          longitude: t.longitude,
          uuid: t.uuid,
          name: t.name
        }))
      );
      
      // Merge distance data with toilet data
      const toiletsWithDistances = toilets.map(toilet => {
        const distanceResult = distanceResults.get(toilet.uuid);
        
        if (distanceResult) {
          return {
            ...toilet,
            distance: distanceResult.distanceKm,
            distanceText: distanceResult.distanceText,
            durationText: distanceResult.durationText,
            durationMinutes: distanceResult.durationMinutes,
            isGoogleDistance: distanceResult.isGoogleDistance
          };
        } else {
          // Fallback for toilets without coordinates or failed API calls
          return {
            ...toilet,
            distance: 999,
            distanceText: 'Location unknown',
            durationText: 'Unknown',
            isGoogleDistance: false
          };
        }
      });
      
      // Sort by distance (closest first)
      toiletsWithDistances.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      
      console.log(`✅ Successfully added Google distances to ${toiletsWithDistances.length} toilets`);
      
      return toiletsWithDistances;
    }
  } catch (error) {
    console.error('❌ Error adding Google distances to toilets:', error);
    return toilets.map(toilet => ({
      ...toilet,
      distance: 999,
      distanceText: 'Error calculating distance',
      durationText: 'Unknown',
      isGoogleDistance: false
    }));
  }
};

// Clear cache function for debugging
export const clearDistanceCache = async (): Promise<void> => {
  try {
    memoryCache.clear();
    
    if (Platform.OS === 'web') {
      localStorage.removeItem(CACHE_KEY);
    } else {
      await AsyncStorage.removeItem(CACHE_KEY);
    }
    
    console.log('🗑️ Distance cache cleared');
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
};

// Get cache statistics
export const getCacheStats = (): { size: number; validEntries: number; expiredEntries: number } => {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;
  
  memoryCache.forEach(entry => {
    if (now - entry.timestamp < CACHE_DURATION) {
      validEntries++;
    } else {
      expiredEntries++;
    }
  });
  
  return {
    size: memoryCache.size,
    validEntries,
    expiredEntries
  };
};