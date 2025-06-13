// Recent toilet cache system for tracking viewed/searched toilets
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface RecentToiletEntry {
  toiletId: string;
  name: string;
  address: string;
  rating?: number;
  image_url?: string;
  searchQuery?: string; // The query that led to this toilet
  viewedAt: number;
  searchedAt?: number;
  viewCount: number;
}

interface RecentToiletCache {
  [toiletId: string]: RecentToiletEntry;
}

const CACHE_KEY = 'recent_toilet_cache';
const MAX_RECENT_TOILETS = 20; // Keep only the 20 most recent

class RecentToiletCacheManager {
  private cache: Map<string, RecentToiletEntry> = new Map();
  private listeners: Set<(recentToilets: RecentToiletEntry[]) => void> = new Set();

  constructor() {
    this.loadCache();
  }

  // Subscribe to cache updates
  subscribe(callback: (recentToilets: RecentToiletEntry[]) => void) {
    this.listeners.add(callback);
    // Immediately call with current data
    callback(this.getRecentToilets());
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners of cache updates
  private notifyListeners() {
    const recentToilets = this.getRecentToilets();
    this.listeners.forEach(callback => callback(recentToilets));
  }

  // Load cache from storage
  private async loadCache(): Promise<void> {
    try {
      let cacheData: string | null;
      
      if (Platform.OS === 'web') {
        cacheData = localStorage.getItem(CACHE_KEY);
      } else {
        cacheData = await AsyncStorage.getItem(CACHE_KEY);
      }
      
      if (cacheData) {
        const cache: RecentToiletCache = JSON.parse(cacheData);
        
        // Load into memory cache
        Object.entries(cache).forEach(([toiletId, entry]) => {
          this.cache.set(toiletId, entry);
        });
        
        console.log(`📋 Loaded ${this.cache.size} recent toilet entries`);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('❌ Error loading recent toilet cache:', error);
      this.cache.clear();
    }
  }

  // Save cache to storage
  private async saveCache(): Promise<void> {
    try {
      const cacheToSave: RecentToiletCache = {};
      
      // Convert Map to object for storage
      this.cache.forEach((entry, toiletId) => {
        cacheToSave[toiletId] = entry;
      });
      
      const cacheData = JSON.stringify(cacheToSave);
      
      if (Platform.OS === 'web') {
        localStorage.setItem(CACHE_KEY, cacheData);
      } else {
        await AsyncStorage.setItem(CACHE_KEY, cacheData);
      }
      
      console.log(`💾 Saved ${Object.keys(cacheToSave).length} recent toilet entries`);
    } catch (error) {
      console.error('❌ Error saving recent toilet cache:', error);
    }
  }

  // Add a toilet to recent searches (when user searches and finds it)
  async addRecentSearch(toilet: any, searchQuery: string): Promise<void> {
    try {
      const now = Date.now();
      const toiletId = toilet.uuid || toilet.id;
      
      if (!toiletId) {
        console.warn('⚠️ Cannot add toilet to recent searches: missing ID');
        return;
      }

      const existing = this.cache.get(toiletId);
      
      const entry: RecentToiletEntry = {
        toiletId,
        name: toilet.name || 'Public Toilet',
        address: toilet.address || 'Address not available',
        rating: toilet.rating,
        image_url: toilet.image_url,
        searchQuery,
        viewedAt: existing?.viewedAt || now,
        searchedAt: now,
        viewCount: existing?.viewCount || 0
      };

      this.cache.set(toiletId, entry);
      await this.trimCache();
      await this.saveCache();
      this.notifyListeners();
      
      console.log(`🔍 Added toilet to recent searches: ${entry.name} (query: "${searchQuery}")`);
    } catch (error) {
      console.error('❌ Error adding recent search:', error);
    }
  }

  // Add a toilet to recent views (when user clicks and views toilet detail)
  async addRecentView(toilet: any): Promise<void> {
    try {
      const now = Date.now();
      const toiletId = toilet.uuid || toilet.id;
      
      if (!toiletId) {
        console.warn('⚠️ Cannot add toilet to recent views: missing ID');
        return;
      }

      const existing = this.cache.get(toiletId);
      
      const entry: RecentToiletEntry = {
        toiletId,
        name: toilet.name || 'Public Toilet',
        address: toilet.address || 'Address not available',
        rating: toilet.rating,
        image_url: toilet.image_url,
        searchQuery: existing?.searchQuery,
        viewedAt: now,
        searchedAt: existing?.searchedAt,
        viewCount: (existing?.viewCount || 0) + 1
      };

      this.cache.set(toiletId, entry);
      await this.trimCache();
      await this.saveCache();
      this.notifyListeners();
      
      console.log(`👁️ Added toilet to recent views: ${entry.name} (view count: ${entry.viewCount})`);
    } catch (error) {
      console.error('❌ Error adding recent view:', error);
    }
  }

  // Get recent toilets sorted by most recent activity
  getRecentToilets(): RecentToiletEntry[] {
    const entries = Array.from(this.cache.values());
    
    // Sort by most recent activity (either viewed or searched)
    entries.sort((a, b) => {
      const aLatest = Math.max(a.viewedAt, a.searchedAt || 0);
      const bLatest = Math.max(b.viewedAt, b.searchedAt || 0);
      return bLatest - aLatest;
    });
    
    return entries;
  }

  // Get recent searches (toilets that were found via search)
  getRecentSearches(): RecentToiletEntry[] {
    const entries = Array.from(this.cache.values());
    
    // Filter only entries that have search queries
    const searchEntries = entries.filter(entry => entry.searchQuery);
    
    // Sort by search date
    searchEntries.sort((a, b) => (b.searchedAt || 0) - (a.searchedAt || 0));
    
    return searchEntries;
  }

  // Get most viewed toilets
  getMostViewed(): RecentToiletEntry[] {
    const entries = Array.from(this.cache.values());
    
    // Filter entries with views and sort by view count
    const viewedEntries = entries.filter(entry => entry.viewCount > 0);
    viewedEntries.sort((a, b) => b.viewCount - a.viewCount);
    
    return viewedEntries.slice(0, 10); // Top 10 most viewed
  }

  // Check if a toilet is in recent cache
  isRecentToilet(toiletId: string): boolean {
    return this.cache.has(toiletId);
  }

  // Get a specific recent toilet entry
  getRecentToilet(toiletId: string): RecentToiletEntry | null {
    return this.cache.get(toiletId) || null;
  }

  // Remove a toilet from recent cache
  async removeRecentToilet(toiletId: string): Promise<void> {
    try {
      if (this.cache.delete(toiletId)) {
        await this.saveCache();
        this.notifyListeners();
        console.log(`🗑️ Removed toilet from recent cache: ${toiletId}`);
      }
    } catch (error) {
      console.error('❌ Error removing recent toilet:', error);
    }
  }

  // Clear all recent toilets
  async clearRecentToilets(): Promise<void> {
    try {
      this.cache.clear();
      await this.saveCache();
      this.notifyListeners();
      console.log('🗑️ Cleared all recent toilets');
    } catch (error) {
      console.error('❌ Error clearing recent toilets:', error);
    }
  }

  // Trim cache to maximum size
  private async trimCache(): Promise<void> {
    if (this.cache.size <= MAX_RECENT_TOILETS) {
      return;
    }

    const entries = this.getRecentToilets();
    const toKeep = entries.slice(0, MAX_RECENT_TOILETS);
    
    // Clear cache and re-add only the entries to keep
    this.cache.clear();
    toKeep.forEach(entry => {
      this.cache.set(entry.toiletId, entry);
    });
    
    console.log(`✂️ Trimmed recent toilet cache to ${this.cache.size} entries`);
  }

  // Get cache statistics
  getStats() {
    const entries = this.getRecentToilets();
    const searchEntries = this.getRecentSearches();
    const viewedEntries = entries.filter(e => e.viewCount > 0);
    
    return {
      totalEntries: entries.length,
      searchEntries: searchEntries.length,
      viewedEntries: viewedEntries.length,
      totalViews: entries.reduce((sum, entry) => sum + entry.viewCount, 0),
      oldestEntry: entries.length > 0 ? new Date(Math.min(...entries.map(e => Math.min(e.viewedAt, e.searchedAt || e.viewedAt)))) : null,
      newestEntry: entries.length > 0 ? new Date(Math.max(...entries.map(e => Math.max(e.viewedAt, e.searchedAt || e.viewedAt)))) : null
    };
  }
}

// Export singleton instance
export const recentToiletCache = new RecentToiletCacheManager();