// Feature management for toilet facilities - COMPREHENSIVE FIX

export interface ToiletFeatures {
  paid: boolean;
  wheelchair: boolean;
  gender: 'male' | 'female' | 'unisex' | 'separate';
  baby: boolean;
  shower: boolean;
  toiletType: 'western' | 'indian' | 'both';
  napkinVendor: boolean;
}

export interface FeatureBadge {
  id: string;
  label: string;
  icon: string;
  color: string;
  backgroundColor: string;
  priority: number;
}

// FIXED: More precise gender parsing
const parseGender = (gender: string | null): 'male' | 'female' | 'unisex' | 'separate' => {
  if (!gender) return 'unisex';
  const g = gender.toLowerCase().trim();
  
  console.log('🚻 Parsing gender:', `"${gender}"` , '-> normalized:', `"${g}"`);
  
  // Exact matches first
  if (g === 'male' || g === 'men' || g === 'gents' || g === 'man') return 'male';
  if (g === 'female' || g === 'women' || g === 'ladies' || g === 'woman') return 'female';
  if (g === 'separate' || g === 'both genders' || g === 'male and female') return 'separate';
  if (g === 'unisex' || g === 'mixed' || g === 'all' || g === 'common') return 'unisex';
  
  // Partial matches
  if (g.includes('male') && !g.includes('female')) return 'male';
  if (g.includes('female') && !g.includes('male')) return 'female';
  if (g.includes('separate') || (g.includes('male') && g.includes('female'))) return 'separate';
  
  console.log('⚠️ Unknown gender value, defaulting to unisex:', gender);
  return 'unisex';
};

const parseToiletType = (type: string | null): 'western' | 'indian' | 'both' => {
  if (!type) return 'western';
  const t = type.toLowerCase().trim();
  
  console.log('🚽 Parsing toilet type:', `"${type}"`, '-> normalized:', `"${t}"`);
  
  if (t === 'both' || t.includes('both') || (t.includes('western') && t.includes('indian'))) return 'both';
  if (t === 'indian' || t === 'squat' || t.includes('indian')) return 'indian';
  if (t === 'western' || t === 'sitting' || t.includes('western')) return 'western';
  
  return 'western';
};

// Convert database strings to boolean features
export const parseToiletFeatures = (toilet: any): ToiletFeatures => {
  const features = {
    paid: toilet.is_paid === 'Yes' || toilet.is_paid === 'Paid',
    wheelchair: toilet.wheelchair === 'Yes',
    gender: parseGender(toilet.gender),
    baby: toilet.baby === 'Yes',
    shower: toilet.shower === 'Yes',
    toiletType: parseToiletType(toilet.westernorindian),
    napkinVendor: toilet.napkin_vendor === 'Yes'
  };
  
  console.log('📊 Parsed features:', features);
  return features;
};

// COMPREHENSIVE FEATURE BADGE GENERATION
export const getFeatureBadges = (toilet: any): FeatureBadge[] => {
  const badges: FeatureBadge[] = [];

  console.log('🏷️ === FEATURE BADGE GENERATION START ===');
  console.log('🏢 Toilet:', toilet.name || 'Unknown');
  console.log('📋 Raw data:', {
    is_paid: toilet.is_paid,
    wheelchair: toilet.wheelchair,
    gender: toilet.gender,
    baby: toilet.baby,
    shower: toilet.shower,
    westernorindian: toilet.westernorindian,
    napkin_vendor: toilet.napkin_vendor
  });

  // 1. PAYMENT STATUS
  if (toilet.is_paid === 'No' || toilet.is_paid === 'Free' || toilet.is_paid === null || toilet.is_paid === undefined) {
    badges.push({
      id: 'free',
      label: 'Free',
      icon: 'star',
      color: '#FFFFFF',
      backgroundColor: '#34C759',
      priority: 1
    });
    console.log('✅ Added FREE badge');
  } else if (toilet.is_paid === 'Yes' || toilet.is_paid === 'Paid') {
    badges.push({
      id: 'paid',
      label: 'Paid',
      icon: 'dollar-sign',
      color: '#FFFFFF',
      backgroundColor: '#FF9500',
      priority: 2
    });
    console.log('✅ Added PAID badge');
  }

  // 2. WHEELCHAIR ACCESSIBILITY
  if (toilet.wheelchair === 'Yes') {
    badges.push({
      id: 'wheelchair',
      label: 'Accessible',
      icon: 'wheelchair',
      color: '#FFFFFF',
      backgroundColor: '#007AFF',
      priority: 3
    });
    console.log('✅ Added WHEELCHAIR badge');
  }

  // 3. GENDER FACILITIES - FIXED LOGIC
  const genderType = parseGender(toilet.gender);
  console.log('🚻 Final gender type:', genderType);
  
  switch (genderType) {
    case 'male':
      badges.push({
        id: 'gender-male',
        label: 'Men Only',
        icon: 'user',
        color: '#FFFFFF',
        backgroundColor: '#2196F3',
        priority: 4
      });
      console.log('✅ Added MEN ONLY badge');
      break;
    case 'female':
      badges.push({
        id: 'gender-female',
        label: 'Women Only',
        icon: 'user',
        color: '#FFFFFF',
        backgroundColor: '#E91E63',
        priority: 4
      });
      console.log('✅ Added WOMEN ONLY badge');
      break;
    case 'separate':
      badges.push({
        id: 'gender-separate',
        label: 'Separate',
        icon: 'users',
        color: '#FFFFFF',
        backgroundColor: '#8E44AD',
        priority: 4
      });
      console.log('✅ Added SEPARATE badge');
      break;
    case 'unisex':
      badges.push({
        id: 'gender-unisex',
        label: 'Unisex',
        icon: 'user',
        color: '#FFFFFF',
        backgroundColor: '#6C757D',
        priority: 5
      });
      console.log('✅ Added UNISEX badge');
      break;
  }

  // 4. BABY CHANGING
  if (toilet.baby === 'Yes') {
    badges.push({
      id: 'baby',
      label: 'Baby Care',
      icon: 'baby',
      color: '#FFFFFF',
      backgroundColor: '#E91E63',
      priority: 6
    });
    console.log('✅ Added BABY CARE badge');
  }

  // 5. SHOWER FACILITIES
  if (toilet.shower === 'Yes') {
    badges.push({
      id: 'shower',
      label: 'Shower',
      icon: 'droplets',
      color: '#FFFFFF',
      backgroundColor: '#00BCD4',
      priority: 7
    });
    console.log('✅ Added SHOWER badge');
  }

  // 6. NAPKIN VENDOR - COMPREHENSIVE CHECK
  console.log('🧻 === NAPKIN VENDOR CHECK ===');
  console.log('🧻 Raw value:', toilet.napkin_vendor);
  console.log('🧻 Type:', typeof toilet.napkin_vendor);
  console.log('🧻 Strict equality check (=== "Yes"):', toilet.napkin_vendor === 'Yes');
  console.log('🧻 Loose equality check (== "Yes"):', toilet.napkin_vendor == 'Yes');
  console.log('🧻 Trimmed check:', toilet.napkin_vendor?.toString().trim() === 'Yes');
  
  if (toilet.napkin_vendor === 'Yes' || 
      toilet.napkin_vendor?.toString().trim() === 'Yes' ||
      toilet.napkin_vendor?.toLowerCase().trim() === 'yes') {
    badges.push({
      id: 'napkin-vendor',
      label: 'Napkin Vendor',
      icon: 'package',
      color: '#FFFFFF',
      backgroundColor: '#9C27B0',
      priority: 8
    });
    console.log('✅ Added NAPKIN VENDOR badge');
  } else {
    console.log('❌ Napkin vendor NOT added - value does not match criteria');
  }

  // 7. TOILET TYPE - SEPARATE BADGES FOR BOTH
  const toiletType = parseToiletType(toilet.westernorindian);
  console.log('🚽 Final toilet type:', toiletType);
  
  switch (toiletType) {
    case 'western':
      badges.push({
        id: 'western',
        label: 'Western',
        icon: 'home',
        color: '#FFFFFF',
        backgroundColor: '#FF6B35',
        priority: 9
      });
      console.log('✅ Added WESTERN badge');
      break;
    case 'indian':
      badges.push({
        id: 'indian',
        label: 'Indian',
        icon: 'square',
        color: '#FFFFFF',
        backgroundColor: '#795548',
        priority: 10
      });
      console.log('✅ Added INDIAN badge');
      break;
    case 'both':
      badges.push({
        id: 'western-type',
        label: 'Western',
        icon: 'home',
        color: '#FFFFFF',
        backgroundColor: '#FF6B35',
        priority: 9
      });
      badges.push({
        id: 'indian-type',
        label: 'Indian',
        icon: 'square',
        color: '#FFFFFF',
        backgroundColor: '#795548',
        priority: 10
      });
      console.log('✅ Added BOTH toilet type badges (Western + Indian)');
      break;
  }

  // Sort by priority
  const sortedBadges = badges.sort((a, b) => a.priority - b.priority);
  
  console.log('🏷️ === FINAL RESULTS ===');
  console.log('🏷️ Total badges generated:', sortedBadges.length);
  console.log('🏷️ Badge list:', sortedBadges.map(b => `${b.label} (${b.id})`));
  console.log('🏷️ === FEATURE BADGE GENERATION END ===');
  
  return sortedBadges;
};

// Get feature icon component
export const getFeatureIcon = (iconName: string, size: number = 16, color: string = '#FFFFFF') => {
  return { iconName, size, color };
};

// Filter toilets by features
export const filterToiletsByFeatures = (toilets: any[], filters: Partial<ToiletFeatures>): any[] => {
  return toilets.filter(toilet => {
    const features = parseToiletFeatures(toilet);
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && features[key as keyof ToiletFeatures] !== value) {
        return false;
      }
    }
    
    return true;
  });
};

// Get feature summary text
export const getFeatureSummary = (toilet: any): string => {
  const badges = getFeatureBadges(toilet);
  if (badges.length === 0) return 'Basic facilities';
  
  const labels = badges.slice(0, 3).map(badge => badge.label);
  if (badges.length > 3) {
    return `${labels.join(', ')} +${badges.length - 3} more`;
  }
  
  return labels.join(', ');
};

// Validation functions
export const validateFeatureData = (toilet: any): boolean => {
  const validPaymentValues = ['Yes', 'No', 'Free', 'Paid', null, undefined];
  const validYesNoValues = ['Yes', 'No', null, undefined];
  const validGenderValues = ['Male', 'Female', 'Unisex', 'Separate', 'male', 'female', 'unisex', 'separate', null, undefined];
  const validToiletTypes = ['Western', 'Indian', 'Both', 'western', 'indian', 'both', null, undefined];

  return (
    validPaymentValues.includes(toilet.is_paid) &&
    validYesNoValues.includes(toilet.wheelchair) &&
    validGenderValues.includes(toilet.gender) &&
    validYesNoValues.includes(toilet.baby) &&
    validYesNoValues.includes(toilet.shower) &&
    validToiletTypes.includes(toilet.westernorindian) &&
    validYesNoValues.includes(toilet.napkin_vendor)
  );
};

// Debug function to test feature parsing
export const debugFeatures = (toilet: any) => {
  console.log('🔍 === FEATURE DEBUG ===');
  console.log('Raw toilet data:', toilet);
  console.log('Parsed features:', parseToiletFeatures(toilet));
  console.log('Generated badges:', getFeatureBadges(toilet));
  console.log('Validation result:', validateFeatureData(toilet));
  console.log('🔍 === DEBUG END ===');
};