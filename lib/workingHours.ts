// lib/workingHours.ts - Enhanced working hours utilities with proper open/closed detection

export interface WorkingHours {
  [key: string]: string;
}

export interface ParsedHours {
  isOpen24Hours: boolean;
  isClosed: boolean;
  hours: WorkingHours;
  currentStatus: 'open' | 'closed' | 'unknown';
  nextChange?: {
    time: string;
    status: 'opens' | 'closes';
  };
}

// ENHANCED: Parse working hours from JSON string or object with better logic
export const parseWorkingHours = (workingHours: string | null): ParsedHours => {
  const defaultResult: ParsedHours = {
    isOpen24Hours: false,
    isClosed: true,
    hours: {},
    currentStatus: 'unknown'
  };

  if (!workingHours) {
    return defaultResult;
  }

  try {
    let hours: WorkingHours;
    
    if (typeof workingHours === 'string') {
      // Try to parse as JSON
      try {
        hours = JSON.parse(workingHours);
      } catch {
        // If not JSON, treat as simple string
        const hoursLower = workingHours.toLowerCase().trim();
        
        // Check for 24-hour indicators
        if (hoursLower.includes('24 hours') || 
            hoursLower.includes('24/7') || 
            hoursLower.includes('open 24 hours') ||
            hoursLower.includes('always open')) {
          return {
            isOpen24Hours: true,
            isClosed: false,
            hours: { 'Daily': workingHours },
            currentStatus: 'open'
          };
        }
        
        // Check for closed indicators
        if (hoursLower.includes('closed') && 
            !hoursLower.includes('never closed') &&
            !hoursLower.includes('not closed')) {
          return {
            isOpen24Hours: false,
            isClosed: true,
            hours: { 'Daily': workingHours },
            currentStatus: 'closed'
          };
        }
        
        return {
          ...defaultResult,
          hours: { 'Daily': workingHours },
          currentStatus: 'open' // Assume open if we have hours but can't parse them
        };
      }
    } else {
      hours = workingHours;
    }

    // Check if open 24 hours
    const is24Hours = Object.values(hours).some(time => {
      const timeLower = time.toLowerCase();
      return timeLower.includes('24 hours') || 
             timeLower.includes('open 24 hours') ||
             timeLower.includes('24/7') ||
             timeLower.includes('always open');
    });

    // Check if closed
    const isClosed = Object.values(hours).every(time => {
      const timeLower = time.toLowerCase();
      return timeLower.includes('closed') && 
             !timeLower.includes('never closed') &&
             !timeLower.includes('not closed');
    });

    // Get current status
    const currentStatus = getCurrentStatus(hours);

    return {
      isOpen24Hours: is24Hours,
      isClosed,
      hours,
      currentStatus,
      nextChange: getNextChange(hours)
    };
  } catch (error) {
    console.error('Error parsing working hours:', error);
    return defaultResult;
  }
};

// ENHANCED: Get current open/closed status with better logic
const getCurrentStatus = (hours: WorkingHours): 'open' | 'closed' | 'unknown' => {
  const now = new Date();
  const currentDay = getDayName(now.getDay());
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

  // Check today's hours first
  const todayHours = hours[currentDay] || hours['Daily'] || hours['All'] || hours['Every day'];
  
  if (todayHours) {
    return getStatusFromHoursString(todayHours, currentTime);
  }

  // If no specific day found, check for any general hours
  const generalHours = Object.values(hours)[0];
  if (generalHours) {
    return getStatusFromHoursString(generalHours, currentTime);
  }

  return 'unknown';
};

// Helper function to determine status from hours string
const getStatusFromHoursString = (hoursStr: string, currentTime: number): 'open' | 'closed' | 'unknown' => {
  const hoursLower = hoursStr.toLowerCase().trim();
  
  // Check for 24-hour operations
  if (hoursLower.includes('24 hours') || 
      hoursLower.includes('24/7') || 
      hoursLower.includes('open 24 hours') ||
      hoursLower.includes('always open')) {
    return 'open';
  }
  
  // Check if explicitly closed
  if (hoursLower.includes('closed') && 
      !hoursLower.includes('never closed') &&
      !hoursLower.includes('not closed')) {
    return 'closed';
  }
  
  // Parse time ranges like "9am-6pm" or "4:30am-12am"
  const timeRange = parseTimeRange(hoursStr);
  if (!timeRange) {
    // If we can't parse but have hours, assume open during daytime
    return (currentTime >= 6 * 60 && currentTime <= 22 * 60) ? 'open' : 'closed';
  }

  const { start, end } = timeRange;
  
  // Handle overnight hours (e.g., 10pm-6am)
  if (start > end) {
    return (currentTime >= start || currentTime <= end) ? 'open' : 'closed';
  } else {
    return (currentTime >= start && currentTime <= end) ? 'open' : 'closed';
  }
};

// Parse time range string like "9am-6pm" or "4:30am-12am"
const parseTimeRange = (timeStr: string): { start: number; end: number } | null => {
  try {
    const parts = timeStr.split('-');
    if (parts.length !== 2) return null;

    const startTime = parseTime(parts[0].trim());
    const endTime = parseTime(parts[1].trim());

    if (startTime === null || endTime === null) return null;

    return { start: startTime, end: endTime };
  } catch {
    return null;
  }
};

// Parse time string like "9am", "4:30pm", "12am"
const parseTime = (timeStr: string): number | null => {
  try {
    const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (!match) return null;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2] || '0');
    const period = match[3].toLowerCase();

    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  } catch {
    return null;
  }
};

// Get next opening/closing time
const getNextChange = (hours: WorkingHours): { time: string; status: 'opens' | 'closes' } | undefined => {
  // This is a simplified version - in a real app you'd want more sophisticated logic
  const now = new Date();
  const currentDay = getDayName(now.getDay());
  const todayHours = hours[currentDay];

  if (!todayHours || todayHours.toLowerCase().includes('closed')) {
    return { time: 'Tomorrow', status: 'opens' };
  }

  if (todayHours.toLowerCase().includes('24 hours')) {
    return undefined; // Always open
  }

  // For simplicity, just return a generic message
  return { time: '6:00 PM', status: 'closes' };
};

// Get day name from day number (0 = Sunday)
const getDayName = (dayNum: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum];
};

// Format working hours for display - FIXED VERSION
export const formatWorkingHours = (workingHours: string | null): string => {
  if (!workingHours) {
    return 'Hours not available';
  }

  try {
    // If it's already a simple string, return it
    if (typeof workingHours === 'string' && !workingHours.startsWith('{')) {
      return workingHours;
    }

    const parsed = parseWorkingHours(workingHours);
    
    if (parsed.isOpen24Hours) {
      return 'Open 24 Hours';
    }
    
    if (parsed.isClosed) {
      return 'Closed';
    }
    
    // Get today's hours
    const today = getDayName(new Date().getDay());
    const todayHours = parsed.hours[today];
    
    if (todayHours) {
      if (todayHours.toLowerCase().includes('closed')) {
        return 'Closed today';
      }
      if (todayHours.toLowerCase().includes('24 hours') || todayHours.toLowerCase().includes('open 24 hours')) {
        return 'Open 24 Hours';
      }
      return `Today: ${todayHours}`;
    }
    
    // Fallback to first available hours
    const firstHours = Object.values(parsed.hours)[0];
    if (firstHours) {
      if (firstHours.toLowerCase().includes('closed')) {
        return 'Currently closed';
      }
      if (firstHours.toLowerCase().includes('24 hours') || firstHours.toLowerCase().includes('open 24 hours')) {
        return 'Open 24 Hours';
      }
      return firstHours;
    }
    
    return 'Hours not available';
  } catch (error) {
    console.error('Error formatting working hours:', error);
    return 'Hours not available';
  }
};

// Get status color for UI
export const getStatusColor = (workingHours: string | null): string => {
  if (!workingHours) {
    return '#FF9500'; // Orange for unknown
  }

  try {
    const parsed = parseWorkingHours(workingHours);
    
    switch (parsed.currentStatus) {
      case 'open':
        return '#34C759'; // Green
      case 'closed':
        return '#FF3B30'; // Red
      default:
        return '#FF9500'; // Orange
    }
  } catch (error) {
    return '#FF9500'; // Orange for error
  }
};

// Get status text for UI - IMPROVED VERSION
export const getStatusText = (workingHours: string | null): string => {
  if (!workingHours) {
    return 'Hours Unknown';
  }

  try {
    const parsed = parseWorkingHours(workingHours);
    
    switch (parsed.currentStatus) {
      case 'open':
        return parsed.isOpen24Hours ? 'Open 24/7' : 'Open Now';
      case 'closed':
        return 'Closed';
      default:
        return 'Hours Unknown';
    }
  } catch (error) {
    return 'Hours Unknown';
  }
};

// ENHANCED: Check if toilet is currently open with better logic
export const isCurrentlyOpen = (workingHours: string | null): boolean => {
  if (!workingHours) {
    console.log('🕐 No working hours data - assuming potentially open');
    return true; // If no hours data, assume it might be open
  }

  try {
    const hoursLower = workingHours.toLowerCase().trim();
    
    // Check for 24-hour operations first
    if (hoursLower.includes('24 hours') || 
        hoursLower.includes('24/7') || 
        hoursLower.includes('open 24 hours') ||
        hoursLower.includes('always open')) {
      console.log('🕐 24-hour operation detected - OPEN');
      return true;
    }
    
    // Check if explicitly closed
    if (hoursLower.includes('closed') && 
        !hoursLower.includes('never closed') &&
        !hoursLower.includes('not closed')) {
      console.log('🕐 Explicitly closed');
      return false;
    }
    
    const parsed = parseWorkingHours(workingHours);
    const isOpen = parsed.currentStatus === 'open';
    
    console.log('🕐 Parsed status:', parsed.currentStatus, '- Result:', isOpen);
    return isOpen;
  } catch (error) {
    console.error('🕐 Error checking if open:', error);
    return true; // Default to open if we can't determine
  }
};

// Get detailed hours breakdown for display
export const getDetailedHours = (workingHours: string | null): string[] => {
  if (!workingHours) {
    return ['Hours not available'];
  }

  try {
    const parsed = parseWorkingHours(workingHours);
    
    if (parsed.isOpen24Hours) {
      return ['Open 24 Hours Daily'];
    }

    const hoursArray: string[] = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    days.forEach(day => {
      const dayHours = parsed.hours[day];
      if (dayHours) {
        hoursArray.push(`${day}: ${dayHours}`);
      }
    });

    return hoursArray.length > 0 ? hoursArray : ['Hours not available'];
  } catch (error) {
    return ['Hours not available'];
  }
};