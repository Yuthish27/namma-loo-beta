// Navigation utilities for opening external apps

import { Platform, Linking, Alert } from 'react-native';

export interface NavigationOptions {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

// Open Google Maps for navigation
export const openGoogleMaps = async (options: NavigationOptions): Promise<void> => {
  try {
    const { latitude, longitude, name, address } = options;
    
    let url: string;
    
    if (Platform.OS === 'ios') {
      // Try Apple Maps first, fallback to Google Maps
      const appleMapsUrl = `maps://app?daddr=${latitude},${longitude}`;
      const googleMapsUrl = `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`;
      
      const canOpenAppleMaps = await Linking.canOpenURL(appleMapsUrl);
      const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsUrl);
      
      if (canOpenGoogleMaps) {
        url = googleMapsUrl;
      } else if (canOpenAppleMaps) {
        url = appleMapsUrl;
      } else {
        // Fallback to web Google Maps
        url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      }
    } else if (Platform.OS === 'android') {
      // Try Google Maps app first
      const googleMapsUrl = `google.navigation:q=${latitude},${longitude}`;
      const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsUrl);
      
      if (canOpenGoogleMaps) {
        url = googleMapsUrl;
      } else {
        // Fallback to web Google Maps
        url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      }
    } else {
      // Web platform - open Google Maps in browser
      url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      
      if (name) {
        url += `&destination_place_id=${encodeURIComponent(name)}`;
      }
    }
    
    console.log('Opening navigation URL:', url);
    await Linking.openURL(url);
  } catch (error) {
    console.error('Error opening navigation:', error);
    Alert.alert(
      'Navigation Error',
      'Could not open navigation app. Please check if Google Maps is installed.',
      [{ text: 'OK' }]
    );
  }
};

// Open phone dialer
export const openPhoneDialer = async (phoneNumber: string): Promise<void> => {
  try {
    const url = `tel:${phoneNumber}`;
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open phone dialer on this device.');
    }
  } catch (error) {
    console.error('Error opening phone dialer:', error);
    Alert.alert('Error', 'Could not open phone dialer.');
  }
};

// Open email client
export const openEmailClient = async (email: string, subject?: string): Promise<void> => {
  try {
    let url = `mailto:${email}`;
    if (subject) {
      url += `?subject=${encodeURIComponent(subject)}`;
    }
    
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open email client on this device.');
    }
  } catch (error) {
    console.error('Error opening email client:', error);
    Alert.alert('Error', 'Could not open email client.');
  }
};

// Open website in browser
export const openWebsite = async (url: string): Promise<void> => {
  try {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open this URL.');
    }
  } catch (error) {
    console.error('Error opening website:', error);
    Alert.alert('Error', 'Could not open website.');
  }
};