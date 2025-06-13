// Enhanced supabase.ts with GLOBAL CACHE integration
import { createClient } from '@supabase/supabase-js';
import { LocationData, addGoogleDistancesToToilets, getBatchGoogleDistances, getGoogleDistance, formatDistance, isValidCoordinate } from './location';

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Toilet {
  uuid: string;
  name?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  reviews?: number;
  working_hours?: string;
  is_paid?: string;
  wheelchair?: string;
  baby?: string;
  shower?: string;
  westernorindian?: string;
  napkin_vendor?: string;
  image_url?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: number;
  created_at?: string;
  updated_at?: string;
  
  // Google Distance fields (populated by our functions)
  distance?: number; // in kilometers
  distanceText?: string; // formatted text like "1.2 km"
  durationText?: string; // formatted text like "5 mins"
  durationMinutes?: number; // in minutes
  isGoogleDistance?: boolean; // whether this came from Google Maps API
}

export interface Review {
  id: number;
  toilet_id: string;
  user_id?: number;
  review_text?: string;
  rating?: number;
  created_at: string;
  users?: {
    id: number;
    name?: string;
    email?: string;
  };
}

export interface User {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  created_at?: string;
}

// Test database connection
export const testConnection = async (): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    if (!SUPABASE_URL || SUPABASE_URL === 'your-supabase-url') {
      return {
        success: false,
        error: 'Supabase URL not configured',
        details: { url: SUPABASE_URL }
      };
    }
    
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'your-supabase-anon-key') {
      return {
        success: false,
        error: 'Supabase anonymous key not configured',
        details: { key: SUPABASE_ANON_KEY }
      };
    }
    
    // Test with a simple query
    const { data, error, count } = await supabase
      .from('kakoos')
      .select('uuid', { count: 'exact', head: true });
    
    if (error) {
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
    
    console.log(`✅ Supabase connection successful. Found ${count} toilets.`);
    return {
      success: true,
      details: { toiletCount: count }
    };
    
  } catch (error: any) {
    console.error('❌ Supabase connection test failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown connection error',
      details: error
    };
  }
};

// ENHANCED: Get all toilets with GLOBAL CACHE integration
export const getToilets = async (
  userLocation?: LocationData,
  onProgressUpdate?: (toilets: Toilet[]) => void
): Promise<Toilet[]> => {
  try {
    console.log('📊 === FETCHING ALL TOILETS WITH GLOBAL CACHE ===');
    
    const { data, error } = await supabase
      .from('kakoos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching toilets:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No toilets found in database');
      return [];
    }
    
    console.log(`📍 Fetched ${data.length} toilets from database`);
    
    // If no user location, return without distances
    if (!userLocation) {
      console.log('📍 No user location provided, returning toilets without distances');
      return data.map(toilet => ({
        ...toilet,
        distance: undefined,
        distanceText: 'Location required',
        isGoogleDistance: false
      }));
    }
    
    // Use global cache for instant distance results
    console.log('🗂️ Using global cache for distance calculations...');
    const toiletsWithDistances = await addGoogleDistancesToToilets(data, userLocation);
    
    console.log(`✅ Successfully processed ${toiletsWithDistances.length} toilets with global cache`);
    return toiletsWithDistances;
    
  } catch (error) {
    console.error('❌ Error in getToilets:', error);
    throw error;
  }
};

// ENHANCED: Get toilets specifically for Near Me with optimized loading
export const getToiletsWithGoogleDistances = async (
  userLocation: LocationData,
  radiusKm: number = 5,
  limit: number = 25
): Promise<Toilet[]> => {
  try {
    console.log(`🗺️ === GETTING NEAR ME TOILETS WITH OPTIMIZED LOADING ===`);
    console.log(`Radius: ${radiusKm}km, Limit: ${limit}`);
    
    // Get all toilets with coordinates
    const { data, error } = await supabase
      .from('kakoos')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
    
    if (error) {
      console.error('❌ Error fetching toilets for Near Me:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No toilets with coordinates found');
      return [];
    }
    
    console.log(`📍 Found ${data.length} toilets with coordinates`);
    
    // Use batch processing for better performance
    const distanceResults = await getBatchGoogleDistances(
      userLocation.latitude,
      userLocation.longitude,
      data.map(t => ({
        latitude: t.latitude,
        longitude: t.longitude,
        uuid: t.uuid,
        name: t.name
      }))
    );
    
    // Merge distance data and filter by radius
    const toiletsWithDistances = data
      .map(toilet => {
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
          return {
            ...toilet,
            distance: 999,
            distanceText: 'Location unknown',
            durationText: 'Unknown',
            isGoogleDistance: false
          };
        }
      })
      .filter(toilet => toilet.distance !== undefined && toilet.distance <= radiusKm)
      .sort((a, b) => (a.distance || 999) - (b.distance || 999))
      .slice(0, limit);
    
    console.log(`✅ Found ${toiletsWithDistances.length} toilets within ${radiusKm}km using optimized loading`);
    
    return toiletsWithDistances;
    
  } catch (error) {
    console.error('❌ Error in getToiletsWithGoogleDistances:', error);
    throw error;
  }
};

// ENHANCED: Get top rated toilets with global cache
export const getTopRatedToilets = async (
  limit: number = 10,
  userLocation?: LocationData,
  onProgressUpdate?: (toilets: Toilet[]) => void
): Promise<Toilet[]> => {
  try {
    console.log(`⭐ === FETCHING TOP RATED TOILETS WITH GLOBAL CACHE ===`);
    console.log(`Limit: ${limit}`);
    
    const { data, error } = await supabase
      .from('kakoos')
      .select('*')
      .not('rating', 'is', null)
      .gte('rating', 4.0)
      .order('rating', { ascending: false })
      .order('reviews', { ascending: false })
      .limit(limit * 2); // Get more to filter by distance if needed
    
    if (error) {
      console.error('❌ Error fetching top rated toilets:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No highly rated toilets found');
      return [];
    }
    
    console.log(`⭐ Found ${data.length} highly rated toilets`);
    
    // If no user location, return top rated without distances
    if (!userLocation) {
      return data.slice(0, limit).map(toilet => ({
        ...toilet,
        distance: undefined,
        distanceText: 'Location required',
        isGoogleDistance: false
      }));
    }
    
    // Use global cache for distance calculations
    console.log('🗂️ Using global cache for top rated toilets...');
    const toiletsWithDistances = await addGoogleDistancesToToilets(data, userLocation);
    
    // Sort by rating first, then by distance
    toiletsWithDistances.sort((a, b) => {
      // First sort by rating
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
      
      // Then by distance
      if (a.distance === undefined) return 1;
      if (b.distance === undefined) return -1;
      return a.distance - b.distance;
    });
    
    console.log(`✅ Successfully processed ${toiletsWithDistances.length} top rated toilets with global cache`);
    
    return toiletsWithDistances.slice(0, limit);
    
  } catch (error) {
    console.error('❌ Error in getTopRatedToilets:', error);
    throw error;
  }
};

// ENHANCED: Get open toilets with global cache
export const getOpenToilets = async (
  userLocation?: LocationData,
  onProgressUpdate?: (toilets: Toilet[]) => void
): Promise<Toilet[]> => {
  try {
    console.log('🕐 === FETCHING OPEN TOILETS WITH GLOBAL CACHE ===');
    
    const { data, error } = await supabase
      .from('kakoos')
      .select('*')
      .order('rating', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching open toilets:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No toilets found');
      return [];
    }
    
    // Filter for potentially open toilets (basic filtering)
    const potentiallyOpen = data.filter(toilet => {
      const hours = toilet.working_hours?.toLowerCase() || '';
      return hours.includes('24') || 
             hours.includes('open') || 
             !hours.includes('closed') ||
             hours === '';
    });
    
    console.log(`🕐 Found ${potentiallyOpen.length} potentially open toilets`);
    
    // If no user location, return without distances
    if (!userLocation) {
      return potentiallyOpen.map(toilet => ({
        ...toilet,
        distance: undefined,
        distanceText: 'Location required',
        isGoogleDistance: false
      }));
    }
    
    // Use global cache for distance calculations
    console.log('🗂️ Using global cache for open toilets...');
    const toiletsWithDistances = await addGoogleDistancesToToilets(potentiallyOpen, userLocation);
    
    console.log(`✅ Successfully processed ${toiletsWithDistances.length} open toilets with global cache`);
    
    return toiletsWithDistances;
    
  } catch (error) {
    console.error('❌ Error in getOpenToilets:', error);
    throw error;
  }
};

// ENHANCED: Search toilets with global cache
export const searchToilets = async (
  query: string,
  userLocation?: LocationData,
  onProgressUpdate?: (toilets: Toilet[]) => void
): Promise<Toilet[]> => {
  try {
    console.log(`🔍 === SEARCHING TOILETS WITH GLOBAL CACHE ===`);
    console.log(`Query: "${query}"`);
    
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const { data, error } = await supabase
      .from('kakoos')
      .select('*')
      .or(`name.ilike.${searchTerm},address.ilike.${searchTerm},city.ilike.${searchTerm}`)
      .order('rating', { ascending: false });
    
    if (error) {
      console.error('❌ Error searching toilets:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No toilets found matching search');
      return [];
    }
    
    console.log(`🔍 Found ${data.length} toilets matching search`);
    
    // If no user location, return without distances
    if (!userLocation) {
      return data.map(toilet => ({
        ...toilet,
        distance: undefined,
        distanceText: 'Location required',
        isGoogleDistance: false
      }));
    }
    
    // Use global cache for distance calculations
    console.log('🗂️ Using global cache for search results...');
    const toiletsWithDistances = await addGoogleDistancesToToilets(data, userLocation);
    
    console.log(`✅ Successfully processed ${toiletsWithDistances.length} search results with global cache`);
    
    return toiletsWithDistances;
    
  } catch (error) {
    console.error('❌ Error in searchToilets:', error);
    throw error;
  }
};

// Get toilet by ID with Google distance
export const getToiletById = async (
  toiletId: string,
  userLocation?: LocationData
): Promise<Toilet | null> => {
  try {
    console.log(`🔍 Fetching toilet by ID: ${toiletId}`);
    
    const { data, error } = await supabase
      .from('kakoos')
      .select('*')
      .eq('uuid', toiletId)
      .single();
    
    if (error) {
      console.error('❌ Error fetching toilet by ID:', error);
      throw error;
    }
    
    if (!data) {
      console.log('⚠️ Toilet not found');
      return null;
    }
    
    // If no user location, return without distance
    if (!userLocation) {
      return {
        ...data,
        distance: undefined,
        distanceText: 'Location required',
        isGoogleDistance: false
      };
    }
    
    // Add Google distance to single toilet
    if (data.latitude && data.longitude && isValidCoordinate(data.latitude, data.longitude)) {
      console.log('🗺️ Adding Google distance to toilet detail...');
      
      const googleResult = await getGoogleDistance(
        userLocation.latitude,
        userLocation.longitude,
        data.latitude,
        data.longitude,
        data.uuid
      );
      
      if (googleResult) {
        return {
          ...data,
          distance: googleResult.distanceKm,
          distanceText: googleResult.distanceText,
          durationText: googleResult.durationText,
          durationMinutes: googleResult.durationMinutes,
          isGoogleDistance: googleResult.isGoogleDistance
        };
      }
    }
    
    // Return without distance if coordinates are invalid
    return {
      ...data,
      distance: undefined,
      distanceText: 'Location unknown',
      isGoogleDistance: false
    };
    
  } catch (error) {
    console.error('❌ Error in getToiletById:', error);
    throw error;
  }
};

// Get reviews for a toilet
export const getReviewsForToilet = async (toiletId: string): Promise<Review[]> => {
  try {
    console.log(`💬 Fetching reviews for toilet: ${toiletId}`);
    
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        users (
          id,
          name,
          email
        )
      `)
      .eq('toilet_id', toiletId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching reviews:', error);
      throw error;
    }
    
    console.log(`💬 Found ${data?.length || 0} reviews`);
    return data || [];
    
  } catch (error) {
    console.error('❌ Error in getReviewsForToilet:', error);
    throw error;
  }
};

// Create or get user
export const createOrGetUser = async (): Promise<User | null> => {
  try {
    // For demo purposes, create a default user
    const defaultUser = {
      name: 'Demo User',
      email: 'demo@example.com',
      phone: '+91 9876543210'
    };
    
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', defaultUser.email)
      .single();
    
    if (existingUser) {
      return existingUser;
    }
    
    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([defaultUser])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating user:', createError);
      return null;
    }
    
    return newUser;
    
  } catch (error) {
    console.error('❌ Error in createOrGetUser:', error);
    return null;
  }
};

// Create a review
export const createReview = async (
  toiletId: string,
  userId: number,
  reviewText: string,
  rating: number
): Promise<Review | null> => {
  try {
    console.log(`💬 Creating review for toilet: ${toiletId}`);
    
    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        toilet_id: toiletId,
        user_id: userId,
        review_text: reviewText,
        rating: rating
      }])
      .select(`
        *,
        users (
          id,
          name,
          email
        )
      `)
      .single();
    
    if (error) {
      console.error('❌ Error creating review:', error);
      throw error;
    }
    
    console.log('✅ Review created successfully');
    return data;
    
  } catch (error) {
    console.error('❌ Error in createReview:', error);
    throw error;
  }
};

// Create a report
export const createReport = async (
  toiletId: string,
  userId: number,
  issueText: string
): Promise<any> => {
  try {
    console.log(`🚨 Creating report for toilet: ${toiletId}`);
    
    const { data, error } = await supabase
      .from('reports')
      .insert([{
        toilet_id: toiletId,
        user_id: userId,
        issue_text: issueText
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating report:', error);
      throw error;
    }
    
    console.log('✅ Report created successfully');
    return data;
    
  } catch (error) {
    console.error('❌ Error in createReport:', error);
    throw error;
  }
};