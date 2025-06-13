import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Filter, Star, MapPin, DollarSign, Accessibility as Wheelchair, Users, User, Baby, Droplets, Chrome as Home, Square, Package, Clock, CircleCheck as CheckCircle } from 'lucide-react-native';

export interface FilterOptions {
  // Distance filters
  maxDistance: number | null; // in km
  
  // Rating filters
  minRating: number | null;
  
  // Feature filters
  freeOnly: boolean;
  wheelchairAccessible: boolean;
  babyChanging: boolean;
  shower: boolean;
  napkinVendor: boolean;
  
  // Gender filters
  genderType: 'all' | 'male' | 'female' | 'unisex' | 'separate';
  
  // Toilet type filters
  toiletType: 'all' | 'western' | 'indian' | 'both';
  
  // Status filters
  openNow: boolean;
  
  // Review filters
  minReviews: number | null;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export const defaultFilters: FilterOptions = {
  maxDistance: null,
  minRating: null,
  freeOnly: false,
  wheelchairAccessible: false,
  babyChanging: false,
  shower: false,
  napkinVendor: false,
  genderType: 'all',
  toiletType: 'all',
  openNow: false,
  minReviews: null,
};

export default function FilterModal({ visible, onClose, onApplyFilters, currentFilters }: FilterModalProps) {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);
  
  const updateFilter = <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const resetFilters = () => {
    setFilters(defaultFilters);
  };
  
  const applyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };
  
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.maxDistance !== null) count++;
    if (filters.minRating !== null) count++;
    if (filters.freeOnly) count++;
    if (filters.wheelchairAccessible) count++;
    if (filters.babyChanging) count++;
    if (filters.shower) count++;
    if (filters.napkinVendor) count++;
    if (filters.genderType !== 'all') count++;
    if (filters.toiletType !== 'all') count++;
    if (filters.openNow) count++;
    if (filters.minReviews !== null) count++;
    return count;
  };
  
  const distanceOptions = [
    { label: 'Any distance', value: null },
    { label: 'Within 1 km', value: 1 },
    { label: 'Within 2 km', value: 2 },
    { label: 'Within 5 km', value: 5 },
    { label: 'Within 10 km', value: 10 },
  ];
  
  const ratingOptions = [
    { label: 'Any rating', value: null },
    { label: '3+ stars', value: 3 },
    { label: '4+ stars', value: 4 },
    { label: '4.5+ stars', value: 4.5 },
  ];
  
  const reviewOptions = [
    { label: 'Any reviews', value: null },
    { label: '5+ reviews', value: 5 },
    { label: '10+ reviews', value: 10 },
    { label: '20+ reviews', value: 20 },
  ];
  
  const genderOptions = [
    { label: 'All', value: 'all' as const, icon: Users },
    { label: 'Men Only', value: 'male' as const, icon: User },
    { label: 'Women Only', value: 'female' as const, icon: User },
    { label: 'Unisex', value: 'unisex' as const, icon: User },
    { label: 'Separate', value: 'separate' as const, icon: Users },
  ];
  
  const toiletTypeOptions = [
    { label: 'All Types', value: 'all' as const, icon: CheckCircle },
    { label: 'Western', value: 'western' as const, icon: Home },
    { label: 'Indian', value: 'indian' as const, icon: Square },
    { label: 'Both Types', value: 'both' as const, icon: CheckCircle },
  ];
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Filter size={20} color="#007AFF" />
            <Text style={styles.title}>Filters</Text>
            {getActiveFilterCount() > 0 && (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>{getActiveFilterCount()}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Distance Filter */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Distance</Text>
            </View>
            <View style={styles.optionGrid}>
              {distanceOptions.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.optionButton,
                    filters.maxDistance === option.value && styles.optionButtonActive
                  ]}
                  onPress={() => updateFilter('maxDistance', option.value)}
                >
                  <Text style={[
                    styles.optionText,
                    filters.maxDistance === option.value && styles.optionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Rating Filter */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star size={20} color="#FFD700" />
              <Text style={styles.sectionTitle}>Rating</Text>
            </View>
            <View style={styles.optionGrid}>
              {ratingOptions.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.optionButton,
                    filters.minRating === option.value && styles.optionButtonActive
                  ]}
                  onPress={() => updateFilter('minRating', option.value)}
                >
                  <Text style={[
                    styles.optionText,
                    filters.minRating === option.value && styles.optionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Reviews Filter */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star size={20} color="#666" />
              <Text style={styles.sectionTitle}>Reviews</Text>
            </View>
            <View style={styles.optionGrid}>
              {reviewOptions.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.optionButton,
                    filters.minReviews === option.value && styles.optionButtonActive
                  ]}
                  onPress={() => updateFilter('minReviews', option.value)}
                >
                  <Text style={[
                    styles.optionText,
                    filters.minReviews === option.value && styles.optionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Features & Amenities */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CheckCircle size={20} color="#34C759" />
              <Text style={styles.sectionTitle}>Features & Amenities</Text>
            </View>
            
            <View style={styles.switchContainer}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <DollarSign size={18} color="#34C759" />
                  <Text style={styles.switchText}>Free Only</Text>
                </View>
                <Switch
                  value={filters.freeOnly}
                  onValueChange={(value) => updateFilter('freeOnly', value)}
                  trackColor={{ false: '#E0E0E0', true: '#34C759' }}
                  thumbColor={filters.freeOnly ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Wheelchair size={18} color="#007AFF" />
                  <Text style={styles.switchText}>Wheelchair Accessible</Text>
                </View>
                <Switch
                  value={filters.wheelchairAccessible}
                  onValueChange={(value) => updateFilter('wheelchairAccessible', value)}
                  trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                  thumbColor={filters.wheelchairAccessible ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Baby size={18} color="#E91E63" />
                  <Text style={styles.switchText}>Baby Changing</Text>
                </View>
                <Switch
                  value={filters.babyChanging}
                  onValueChange={(value) => updateFilter('babyChanging', value)}
                  trackColor={{ false: '#E0E0E0', true: '#E91E63' }}
                  thumbColor={filters.babyChanging ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Droplets size={18} color="#00BCD4" />
                  <Text style={styles.switchText}>Shower Available</Text>
                </View>
                <Switch
                  value={filters.shower}
                  onValueChange={(value) => updateFilter('shower', value)}
                  trackColor={{ false: '#E0E0E0', true: '#00BCD4' }}
                  thumbColor={filters.shower ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Package size={18} color="#9C27B0" />
                  <Text style={styles.switchText}>Napkin Vendor</Text>
                </View>
                <Switch
                  value={filters.napkinVendor}
                  onValueChange={(value) => updateFilter('napkinVendor', value)}
                  trackColor={{ false: '#E0E0E0', true: '#9C27B0' }}
                  thumbColor={filters.napkinVendor ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Clock size={18} color="#FF9500" />
                  <Text style={styles.switchText}>Open Now</Text>
                </View>
                <Switch
                  value={filters.openNow}
                  onValueChange={(value) => updateFilter('openNow', value)}
                  trackColor={{ false: '#E0E0E0', true: '#FF9500' }}
                  thumbColor={filters.openNow ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
            </View>
          </View>
          
          {/* Gender Filter */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={20} color="#8E44AD" />
              <Text style={styles.sectionTitle}>Gender Facilities</Text>
            </View>
            <View style={styles.optionGrid}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    styles.iconOptionButton,
                    filters.genderType === option.value && styles.optionButtonActive
                  ]}
                  onPress={() => updateFilter('genderType', option.value)}
                >
                  <option.icon 
                    size={16} 
                    color={filters.genderType === option.value ? '#FFFFFF' : '#666'} 
                  />
                  <Text style={[
                    styles.optionText,
                    filters.genderType === option.value && styles.optionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Toilet Type Filter */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Home size={20} color="#FF6B35" />
              <Text style={styles.sectionTitle}>Toilet Type</Text>
            </View>
            <View style={styles.optionGrid}>
              {toiletTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    styles.iconOptionButton,
                    filters.toiletType === option.value && styles.optionButtonActive
                  ]}
                  onPress={() => updateFilter('toiletType', option.value)}
                >
                  <option.icon 
                    size={16} 
                    color={filters.toiletType === option.value ? '#FFFFFF' : '#666'} 
                  />
                  <Text style={[
                    styles.optionText,
                    filters.toiletType === option.value && styles.optionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        
        {/* Apply Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
            <Text style={styles.applyButtonText}>
              Apply Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    padding: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  filterCount: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resetButton: {
    padding: 4,
  },
  resetText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  iconOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  switchContainer: {
    gap: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  switchText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});