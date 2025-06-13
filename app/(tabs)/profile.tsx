import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, RefreshControl } from 'react-native';
import { User, CreditCard as Edit3, BookmarkCheck, MessageSquare, LogOut, Settings, Star, MapPin, Trash2 } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { getSavedToilets, unsaveToilet, SavedToilet } from '@/lib/storage';
import { formatDistance } from '@/lib/location';
import { authManager, signOut } from '@/lib/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const [savedToilets, setSavedToilets] = useState<SavedToilet[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(authManager.getCurrentUser());

  useEffect(() => {
    loadSavedToilets();
    
    // Subscribe to auth changes
    const unsubscribe = authManager.subscribe((authState) => {
      setUser(authState.user);
    });

    return unsubscribe;
  }, []);

  const loadSavedToilets = async () => {
    try {
      const saved = await getSavedToilets();
      setSavedToilets(saved);
    } catch (error) {
      console.error('Error loading saved toilets:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSavedToilets();
    setRefreshing(false);
  }, []);

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Edit profile functionality coming soon');
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            const result = await signOut();
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to sign out');
            }
            // Navigation will be handled by the auth state change
          }
        }
      ]
    );
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Settings functionality coming soon');
  };

  const handleUnsaveToilet = async (toiletId: string) => {
    try {
      await unsaveToilet(toiletId);
      await loadSavedToilets();
      Alert.alert('Removed', 'Toilet removed from saved list.');
    } catch (error) {
      console.error('Error removing toilet:', error);
      Alert.alert('Error', 'Could not remove toilet.');
    }
  };

  const navigateToToiletDetail = (toiletId: string) => {
    router.push({
      pathname: '/toilet-detail',
      params: { toiletId }
    });
  };

  const getUserDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getUserAvatar = () => {
    if (user?.avatar_url) return user.avatar_url;
    // Generate a placeholder avatar based on user name/email
    const name = getUserDisplayName();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=200`;
  };

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={handleSettings}>
          <Settings size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          <Image 
            source={{ uri: getUserAvatar() }}
            style={styles.profileImage}
          />
          <View style={styles.onlineIndicator} />
        </View>
        
        <Text style={styles.userName}>{getUserDisplayName()}</Text>
        <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
        
        {/* Provider Badge */}
        {user?.provider && (
          <View style={styles.providerBadge}>
            <Text style={styles.providerText}>
              Signed in with {user.provider === 'google' ? 'Google' : user.provider}
            </Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Edit3 size={16} color="#007AFF" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <MessageSquare size={24} color="#34C759" />
          </View>
          <Text style={styles.statNumber}>24</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <BookmarkCheck size={24} color="#FF9500" />
          </View>
          <Text style={styles.statNumber}>{savedToilets.length}</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Star size={24} color="#FFD700" />
          </View>
          <Text style={styles.statNumber}>4.8</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
      </View>

      {/* Saved Toilets Section */}
      <View style={styles.savedSection}>
        <Text style={styles.sectionTitle}>Saved Toilets ({savedToilets.length})</Text>
        
        {loading ? (
          <Text style={styles.loadingText}>Loading saved toilets...</Text>
        ) : savedToilets.length === 0 ? (
          <View style={styles.emptyState}>
            <BookmarkCheck size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No saved toilets yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start exploring and save your favorite toilets for quick access
            </Text>
          </View>
        ) : (
          savedToilets.map((toilet) => (
            <TouchableOpacity 
              key={toilet.toiletId} 
              style={styles.savedToiletItem}
              onPress={() => navigateToToiletDetail(toilet.toiletId)}
            >
              <View style={styles.savedToiletInfo}>
                <Text style={styles.savedToiletName}>{toilet.name}</Text>
                <Text style={styles.savedToiletAddress} numberOfLines={1}>
                  {toilet.address}
                </Text>
                <View style={styles.savedToiletMeta}>
                  {toilet.rating && (
                    <View style={styles.ratingContainer}>
                      <Star size={12} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.ratingText}>{toilet.rating.toFixed(1)}</Text>
                    </View>
                  )}
                  <Text style={styles.savedDate}>
                    Saved {new Date(toilet.savedAt).toLocaleDateString()}
                  </Text>
                </View>
                {toilet.notes && (
                  <Text style={styles.savedNotes} numberOfLines={2}>
                    "{toilet.notes}"
                  </Text>
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.unsaveButton}
                onPress={() => handleUnsaveToilet(toilet.toiletId)}
              >
                <Trash2 size={20} color="#FF3B30" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Menu Options */}
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
              <MessageSquare size={20} color="#2196F3" />
            </View>
            <Text style={styles.menuItemText}>My Reviews</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
              <BookmarkCheck size={20} color="#FF9500" />
            </View>
            <Text style={styles.menuItemText}>Saved Toilets</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
              <Settings size={20} color="#9C27B0" />
            </View>
            <Text style={styles.menuItemText}>Settings</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        
        <View style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <Star size={16} color="#FFD700" fill="#FFD700" />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>Reviewed "Phoenix Mall Restroom"</Text>
            <Text style={styles.activityTime}>2 hours ago</Text>
          </View>
        </View>

        <View style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <BookmarkCheck size={16} color="#34C759" />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>Bookmarked "Central Railway Station"</Text>
            <Text style={styles.activityTime}>1 day ago</Text>
          </View>
        </View>

        <View style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <MessageSquare size={16} color="#007AFF" />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>Added review for "Lalbagh Garden"</Text>
            <Text style={styles.activityTime}>3 days ago</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  settingsButton: {
    padding: 8,
  },
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#34C759',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  providerBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  providerText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  editButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 20,
    marginBottom: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  savedSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  savedToiletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  savedToiletInfo: {
    flex: 1,
    marginRight: 12,
  },
  savedToiletName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  savedToiletAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  savedToiletMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginLeft: 2,
  },
  savedDate: {
    fontSize: 12,
    color: '#999',
  },
  savedNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  unsaveButton: {
    padding: 8,
  },
  menuSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  menuItemArrow: {
    fontSize: 20,
    color: '#ccc',
    fontWeight: '300',
  },
  activitySection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});