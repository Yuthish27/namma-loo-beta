// Filtering utilities for toilet search and display - ENHANCED FOR OPEN NOW

import { Toilet } from './supabase';
import { FilterOptions } from '@/components/FilterModal';
import { calculateDistance, LocationData } from './location';
import { isCurrentlyOpen } from './workingHours';

// Apply filters to toilet list
export const applyFilters = (
  toilets: Toilet[],
  filters: FilterOptions,
  userLocation?: LocationData
): Toilet[] => {
  console.log('🔍 Applying filters to', toilets.length, 'toilets');
  console.log('🔍 Filter options:', filters);
  
  let filteredToilets = [...toilets];
  
  // Distance filter
  if (filters.maxDistance !== null && userLocation) {
    filteredToilets = filteredToilets.filter(toilet => {
      if (!toilet.latitude || !toilet.longitude) return false;
      
      // Use existing distance if available, otherwise calculate
      let distance = toilet.distance;
      if (distance === undefined || distance === null) {
        distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          toilet.latitude,
          toilet.longitude
        );
      }
      
      return distance <= filters.maxDistance!;
    });
    console.log('📍 After distance filter:', filteredToilets.length, 'toilets');
  }
  
  // Rating filter
  if (filters.minRating !== null) {
    filteredToilets = filteredToilets.filter(toilet => {
      return toilet.rating !== null && toilet.rating >= filters.minRating!;
    });
    console.log('⭐ After rating filter:', filteredToilets.length, 'toilets');
  }
  
  // Reviews filter
  if (filters.minReviews !== null) {
    filteredToilets = filteredToilets.filter(toilet => {
      return toilet.reviews !== null && toilet.reviews >= filters.minReviews!;
    });
    console.log('💬 After reviews filter:', filteredToilets.length, 'toilets');
  }
  
  // Free only filter
  if (filters.freeOnly) {
    filteredToilets = filteredToilets.filter(toilet => {
      return toilet.is_paid === 'No' || toilet.is_paid === 'Free' || toilet.is_paid === null;
    });
    console.log('💰 After free filter:', filteredToilets.length, 'toilets');
  }
  
  // Wheelchair accessible filter
  if (filters.wheelchairAccessible) {
    filteredToilets = filteredToilets.filter(toilet => {
      return toilet.wheelchair === 'Yes';
    });
    console.log('♿ After wheelchair filter:', filteredToilets.length, 'toilets');
  }
  
  // Baby changing filter
  if (filters.babyChanging) {
    filteredToilets = filteredToilets.filter(toilet => {
      return toilet.baby === 'Yes';
    });
    console.log('👶 After baby filter:', filteredToilets.length, 'toilets');
  }
  
  // Shower filter
  if (filters.shower) {
    filteredToilets = filteredToilets.filter(toilet => {
      return toilet.shower === 'Yes';
    });
    console.log('🚿 After shower filter:', filteredToilets.length, 'toilets');
  }
  
  // Napkin vendor filter
  if (filters.napkinVendor) {
    filteredToilets = filteredToilets.filter(toilet => {
      return toilet.napkin_vendor === 'Yes';
    });
    console.log('🧻 After napkin vendor filter:', filteredToilets.length, 'toilets');
  }
  
  // Gender filter
  if (filters.genderType !== 'all') {
    filteredToilets = filteredToilets.filter(toilet => {
      const gender = toilet.gender?.toLowerCase().trim();
      
      switch (filters.genderType) {
        case 'male':
          return gender === 'male' || gender === 'men' || gender === 'gents' || gender === 'man';
        case 'female':
          return gender === 'female' || gender === 'women' || gender === 'ladies' || gender === 'woman';
        case 'unisex':
          return gender === 'unisex' || gender === 'mixed' || gender === 'all' || gender === 'common';
        case 'separate':
          return gender === 'separate' || gender === 'both genders' || gender === 'male and female';
        default:
          return true;
      }
    });
    console.log('🚻 After gender filter:', filteredToilets.length, 'toilets');
  }
  
  // Toilet type filter
  if (filters.toiletType !== 'all') {
    filteredToilets = filteredToilets.filter(toilet => {
      const type = toilet.westernorindian?.toLowerCase().trim();
      
      switch (filters.toiletType) {
        case 'western':
          return type === 'western' || type === 'sitting' || type?.includes('western');
        case 'indian':
          return type === 'indian' || type === 'squat' || type?.includes('indian');
        case 'both':
          return type === 'both' || type?.includes('both') || (type?.includes('western') && type?.includes('indian'));
        default:
          return true;
      }
    });
    console.log('🚽 After toilet type filter:', filteredToilets.length, 'toilets');
  }
  
  // ENHANCED: Open now filter with better logic
  if (filters.openNow) {
    console.log('🕐 === APPLYING OPEN NOW FILTER ===');
    filteredToilets = filteredToilets.filter(toilet => {
      const isOpen = isCurrentlyOpen(toilet.working_hours);
      console.log(`🕐 ${toilet.name}: ${isOpen ? 'OPEN' : 'CLOSED'} (hours: ${toilet.working_hours})`);
      return isOpen;
    });
    console.log('🕐 After open now filter:', filteredToilets.length,   'toilets');
  }
  
  console.log('✅ Final filtered results:', filteredToilets.length, 'toilets');
  return filteredToilets;
};

// Get filter summary text
export const getFilterSummary = (filters: FilterOptions): string => {
  const activeFilters: string[] = [];
  
  if (filters.maxDistance !== null) {
    activeFilters.push(`Within ${filters.maxDistance}km`);
  }
  
  if (filters.minRating !== null) {
    activeFilters.push(`${filters.minRating}+ stars`);
  }
  
  if (filters.minReviews !== null) {
    activeFilters.push(`${filters.minReviews}+ reviews`);
  }
  
  if (filters.freeOnly) {
    activeFilters.push('Free');
  }
  
  if (filters.wheelchairAccessible) {
    activeFilters.push('Accessible');
  }
  
  if (filters.babyChanging) {
    activeFilters.push('Baby changing');
  }
  
  if (filters.shower) {
    activeFilters.push('Shower');
  }
  
  if (filters.napkinVendor) {
    activeFilters.push('Napkin vendor');
  }
  
  if (filters.genderType !== 'all') {
    const genderLabels = {
      male: 'Men only',
      female: 'Women only',
      unisex: 'Unisex',
      separate: 'Separate'
    };
    activeFilters.push(genderLabels[filters.genderType]);
  }
  
  if (filters.toiletType !== 'all') {
    const typeLabels = {
      western: 'Western',
      indian: 'Indian',
      both: 'Both types'
    };
    activeFilters.push(typeLabels[filters.toiletType]);
  }
  
  if (filters.openNow) {
    activeFilters.push('Open now');
  }
  
  if (activeFilters.length === 0) {
    return 'No filters applied';
  }
  
  if (activeFilters.length <= 2) {
    return activeFilters.join(', ');
  }
  
  return `${activeFilters.slice(0, 2).join(', ')} +${activeFilters.length - 2} more`;
};

// Count active filters
export const getActiveFilterCount = (filters: FilterOptions): number => {
  let count = 0;
  
  if (filters.maxDistance !== null) count++;
  if (filters.minRating !== null) count++;
  if (filters.minReviews !== null) count++;
  if (filters.freeOnly) count++;
  if (filters.wheelchairAccessible) count++;
  if (filters.babyChanging) count++;
  if (filters.shower) count++;
  if (filters.napkinVendor) count++;
  if (filters.genderType !== 'all') count++;
  if (filters.toiletType !== 'all') count++;
  if (filters.openNow) count++;
  
  return count;
};

// Sort toilets based on filters and user preferences
export const sortFilteredToilets = (
  toilets: Toilet[],
  filters: FilterOptions,
  userLocation?: LocationData
): Toilet[] => {
  return toilets.sort((a, b) => {
    // If distance filter is applied, sort by distance first
    if (filters.maxDistance !== null && userLocation) {
      const distanceA = a.distance !== undefined ? a.distance : 999;
      const distanceB = b.distance !== undefined ? b.distance : 999;
      
      if (Math.abs(distanceA - distanceB) > 0.1) {
        return distanceA - distanceB;
      }
    }
    
    // If rating filter is applied, sort by rating
    if (filters.minRating !== null) {
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (Math.abs(ratingDiff) > 0.1) {
        return ratingDiff;
      }
    }
    
    // Default sort by rating, then by reviews
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (Math.abs(ratingDiff) > 0.1) {
      return ratingDiff;
    }
    
    return (b.reviews || 0) - (a.reviews || 0);
  });
};