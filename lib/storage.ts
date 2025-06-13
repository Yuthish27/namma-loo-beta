// lib/storage.ts - Fixed storage utilities with proper error handling

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage keys
const STORAGE_KEYS = {
  RECENT_SEARCHES: 'recent_searches',
  SAVED_TOILETS: 'saved_toilets',
  USER_PREFERENCES: 'user_preferences',
  LOCATION_CACHE: 'location_cache'
};

// Recent searches management
export interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount: number;
}

export const saveRecentSearch = async (query: string, resultCount: number = 0): Promise<void> => {
  try {
    const searches = await getRecentSearches();
    
    // Remove existing search with same query
    const filtered = searches.filter(search => search.query.toLowerCase() !== query.toLowerCase());
    
    // Add new search at the beginning
    const newSearch: RecentSearch = {
      query: query.trim(),
      timestamp: Date.now(),
      resultCount
    };
    
    const updated = [newSearch, ...filtered].slice(0, 10); // Keep only 10 recent searches
    
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updated));
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updated));
    }
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
};

export const getRecentSearches = async (): Promise<RecentSearch[]> => {
  try {
    let data: string | null;
    
    if (Platform.OS === 'web') {
      data = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
    } else {
      data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
    }
    
    if (!data) return [];
    
    const searches: RecentSearch[] = JSON.parse(data);
    
    // Filter out searches older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return searches.filter(search => search.timestamp > thirtyDaysAgo);
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
};

export const clearRecentSearches = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
    }
  } catch (error) {
    console.error('Error clearing recent searches:', error);
  }
};

// Saved toilets management
export interface SavedToilet {
  toiletId: string;
  name: string;
  address: string;
  rating: number | null;
  savedAt: number;
  notes?: string;
}

export const saveToilet = async (toilet: any, notes?: string): Promise<void> => {
  try {
    const saved = await getSavedToilets();
    
    // Remove if already saved
    const filtered = saved.filter(item => item.toiletId !== toilet.uuid);
    
    // Add to saved
    const newSaved: SavedToilet = {
      toiletId: toilet.uuid,
      name: toilet.name || 'Public Toilet',
      address: toilet.address || 'Address not available',
      rating: toilet.rating,
      savedAt: Date.now(),
      notes
    };
    
    const updated = [newSaved, ...filtered];
    
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEYS.SAVED_TOILETS, JSON.stringify(updated));
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_TOILETS, JSON.stringify(updated));
    }
  } catch (error) {
    console.error('Error saving toilet:', error);
  }
};

export const unsaveToilet = async (toiletId: string): Promise<void> => {
  try {
    const saved = await getSavedToilets();
    const filtered = saved.filter(item => item.toiletId !== toiletId);
    
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEYS.SAVED_TOILETS, JSON.stringify(filtered));
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_TOILETS, JSON.stringify(filtered));
    }
  } catch (error) {
    console.error('Error unsaving toilet:', error);
  }
};

export const getSavedToilets = async (): Promise<SavedToilet[]> => {
  try {
    let data: string | null;
    
    if (Platform.OS === 'web') {
      data = localStorage.getItem(STORAGE_KEYS.SAVED_TOILETS);
    } else {
      data = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_TOILETS);
    }
    
    if (!data) return [];
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting saved toilets:', error);
    return [];
  }
};

export const isToiletSaved = async (toiletId: string): Promise<boolean> => {
  try {
    const saved = await getSavedToilets();
    return saved.some(item => item.toiletId === toiletId);
  } catch (error) {
    console.error('Error checking if toilet is saved:', error);
    return false;
  }
};

// User preferences
export interface UserPreferences {
  defaultRadius: number;
  preferredFeatures: string[];
  notifications: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export const saveUserPreferences = async (preferences: Partial<UserPreferences>): Promise<void> => {
  try {
    const current = await getUserPreferences();
    const updated = { ...current, ...preferences };
    
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
    }
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
};

export const getUserPreferences = async (): Promise<UserPreferences> => {
  try {
    let data: string | null;
    
    if (Platform.OS === 'web') {
      data = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    } else {
      data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    }
    
    if (!data) {
      return {
        defaultRadius: 10,
        preferredFeatures: [],
        notifications: true,
        theme: 'auto'
      };
    }
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return {
      defaultRadius: 10,
      preferredFeatures: [],
      notifications: true,
      theme: 'auto'
    };
  }
};