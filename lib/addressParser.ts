// Address parsing utilities to extract area names from full addresses

export interface ParsedAddress {
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  fullAddress: string;
}

// Common city names in India to help identify the city in address
const COMMON_CITIES = [
  'Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad',
  'Surat', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
  'Visakhapatnam', 'Pimpri', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra',
  'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan', 'Vasai', 'Varanasi',
  'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad',
  'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada',
  'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur',
  'Hubli', 'Tiruchirappalli', 'Bareilly', 'Mysore', 'Tiruppur', 'Gurgaon',
  'Aligarh', 'Jalandhar', 'Bhubaneswar', 'Salem', 'Warangal', 'Guntur',
  'Bhiwandi', 'Saharanpur', 'Gorakhpur', 'Bikaner', 'Amravati', 'Noida',
  'Jamshedpur', 'Bhilai', 'Cuttack', 'Firozabad', 'Kochi', 'Nellore',
  'Bhavnagar', 'Dehradun', 'Durgapur', 'Asansol', 'Rourkela', 'Nanded',
  'Kolhapur', 'Ajmer', 'Akola', 'Gulbarga', 'Jamnagar', 'Ujjain',
  'Loni', 'Siliguri', 'Jhansi', 'Ulhasnagar', 'Jammu', 'Sangli',
  'Mangalore', 'Erode', 'Belgaum', 'Ambattur', 'Tirunelveli', 'Malegaon',
  'Gaya', 'Jalgaon', 'Udaipur', 'Maheshtala', 'Davanagere', 'Kozhikode'
];

// Common state names in India
const COMMON_STATES = [
  'Tamil Nadu', 'Karnataka', 'Maharashtra', 'Delhi', 'West Bengal', 'Gujarat',
  'Rajasthan', 'Kerala', 'Madhya Pradesh', 'Uttar Pradesh', 'Andhra Pradesh',
  'Telangana', 'Bihar', 'Odisha', 'Assam', 'Punjab', 'Haryana', 'Chhattisgarh',
  'Jharkhand', 'Uttarakhand', 'Himachal Pradesh', 'Tripura', 'Meghalaya',
  'Manipur', 'Nagaland', 'Goa', 'Arunachal Pradesh', 'Mizoram', 'Sikkim',
  'Jammu and Kashmir', 'Ladakh', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli', 'Daman and Diu', 'Lakshadweep', 'Puducherry'
];

/**
 * Parse a full address to extract area name (the locality/area before the city)
 * Example: "Railway Station, Race View Colony, Guindy, Chennai, Tamil Nadu 600032"
 * Returns: { area: "Guindy", city: "Chennai", state: "Tamil Nadu", pincode: "600032" }
 */
export const parseAddress = (fullAddress: string): ParsedAddress => {
  if (!fullAddress || typeof fullAddress !== 'string') {
    return { fullAddress: fullAddress || '' };
  }

  console.log('🏠 === PARSING ADDRESS ===');
  console.log('📍 Input address:', fullAddress);

  try {
    // Clean and split the address
    const cleanAddress = fullAddress.trim();
    const parts = cleanAddress.split(',').map(part => part.trim()).filter(part => part.length > 0);
    
    console.log('📝 Address parts:', parts);

    if (parts.length === 0) {
      return { fullAddress: cleanAddress };
    }

    let city: string | undefined;
    let state: string | undefined;
    let pincode: string | undefined;
    let area: string | undefined;

    // Extract pincode (6-digit number, usually at the end)
    const lastPart = parts[parts.length - 1];
    const pincodeMatch = lastPart.match(/\b\d{6}\b/);
    if (pincodeMatch) {
      pincode = pincodeMatch[0];
      // Remove pincode from the last part
      const withoutPincode = lastPart.replace(/\b\d{6}\b/, '').trim();
      if (withoutPincode) {
        parts[parts.length - 1] = withoutPincode;
      } else {
        parts.pop(); // Remove the part if it was only pincode
      }
    }

    // Find state (usually second last or last part after removing pincode)
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      const matchedState = COMMON_STATES.find(stateName => 
        part.toLowerCase() === stateName.toLowerCase() ||
        part.toLowerCase().includes(stateName.toLowerCase()) ||
        stateName.toLowerCase().includes(part.toLowerCase())
      );
      
      if (matchedState) {
        state = matchedState;
        parts.splice(i, 1); // Remove state from parts
        break;
      }
    }

    // Find city (look for known cities in the remaining parts)
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      const matchedCity = COMMON_CITIES.find(cityName => 
        part.toLowerCase() === cityName.toLowerCase() ||
        part.toLowerCase().includes(cityName.toLowerCase()) ||
        cityName.toLowerCase().includes(part.toLowerCase())
      );
      
      if (matchedCity) {
        city = matchedCity;
        
        // The area is typically the part right before the city
        if (i > 0) {
          area = parts[i - 1];
        }
        
        break;
      }
    }

    // If no city found using the list, assume the last remaining part is the city
    // and second last is the area
    if (!city && parts.length > 0) {
      city = parts[parts.length - 1];
      if (parts.length > 1) {
        area = parts[parts.length - 2];
      }
    }

    // If still no area found, try to get the most specific location part
    if (!area && parts.length > 0) {
      // Skip very generic terms and get the most specific location
      const genericTerms = ['toilet', 'restroom', 'facility', 'public', 'station', 'mall', 'center'];
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i].toLowerCase();
        const isGeneric = genericTerms.some(term => part.includes(term));
        if (!isGeneric && parts[i] !== city && parts[i] !== state) {
          area = parts[i];
          break;
        }
      }
    }

    const result: ParsedAddress = {
      area,
      city,
      state,
      pincode,
      fullAddress: cleanAddress
    };

    console.log('✅ Parsed result:', result);
    return result;

  } catch (error) {
    console.error('❌ Error parsing address:', error);
    return { fullAddress };
  }
};

/**
 * Get a short display name for a toilet location
 * Prioritizes: Area > City > First meaningful part of address
 */
export const getLocationDisplayName = (address: string): string => {
  if (!address) return 'Location';

  const parsed = parseAddress(address);
  
  // Return area if available (most specific)
  if (parsed.area && parsed.area.length > 0) {
    return parsed.area;
  }
  
  // Fallback to city
  if (parsed.city && parsed.city.length > 0) {
    return parsed.city;
  }
  
  // Last resort: get first meaningful part
  const parts = address.split(',').map(p => p.trim()).filter(p => p.length > 0);
  if (parts.length > 0) {
    // Skip very generic first parts
    const genericTerms = ['public toilet', 'restroom', 'toilet', 'facility'];
    for (const part of parts) {
      const isGeneric = genericTerms.some(term => 
        part.toLowerCase().includes(term)
      );
      if (!isGeneric) {
        return part;
      }
    }
    // If all parts are generic, return the first one
    return parts[0];
  }
  
  return 'Location';
};

/**
 * Get a formatted location string for display
 * Format: "Area, City" or "City" if no area
 */
export const getFormattedLocation = (address: string): string => {
  if (!address) return 'Location not available';

  const parsed = parseAddress(address);
  
  if (parsed.area && parsed.city) {
    return `${parsed.area}, ${parsed.city}`;
  }
  
  if (parsed.city) {
    return parsed.city;
  }
  
  if (parsed.area) {
    return parsed.area;
  }
  
  // Fallback to short display name
  return getLocationDisplayName(address);
};

/**
 * Test function to verify address parsing
 */
export const testAddressParsing = () => {
  const testAddresses = [
    'Railway Station, Race View Colony, Guindy, Chennai, Tamil Nadu 600032',
    'Phoenix MarketCity Mall Restroom, Whitefield Main Road, Mahadevapura, Bangalore, Karnataka 560048',
    'Cubbon Park Public Toilet, Kasturba Road, Bangalore, Karnataka 560001',
    'UB City Mall Premium Restroom, Vittal Mallya Road, Bangalore, Karnataka 560001',
    'Lalbagh Botanical Garden Facility, Lalbagh Main Gate, Mavalli, Bangalore, Karnataka 560004',
    'Brigade Road Public Restroom, Near Commercial Street, Bangalore, Karnataka 560025'
  ];

  console.log('🧪 === TESTING ADDRESS PARSING ===');
  testAddresses.forEach((address, index) => {
    console.log(`\n📍 Test ${index + 1}:`);
    console.log('Input:', address);
    const parsed = parseAddress(address);
    console.log('Parsed:', parsed);
    console.log('Display Name:', getLocationDisplayName(address));
    console.log('Formatted:', getFormattedLocation(address));
  });
};