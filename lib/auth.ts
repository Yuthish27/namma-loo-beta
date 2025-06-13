// Authentication utilities with Google OAuth via Supabase - MOBILE FIXED
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configure WebBrowser for mobile OAuth
WebBrowser.maybeCompleteAuthSession();

export interface User {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  provider?: string;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Storage keys
const AUTH_STORAGE_KEY = 'auth_user';
const SESSION_STORAGE_KEY = 'auth_session';

class AuthManager {
  private listeners: Set<(authState: AuthState) => void> = new Set();
  private currentState: AuthState = {
    user: null,
    loading: true,
    error: null
  };

  constructor() {
    this.initializeAuth();
  }

  // Subscribe to auth state changes
  subscribe(callback: (authState: AuthState) => void) {
    this.listeners.add(callback);
    // Immediately call with current state
    callback(this.currentState);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners of auth state changes
  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentState));
  }

  // Update auth state
  private updateState(updates: Partial<AuthState>) {
    this.currentState = { ...this.currentState, ...updates };
    this.notifyListeners();
  }

  // Initialize authentication
  private async initializeAuth() {
    try {
      console.log('🔐 === INITIALIZING AUTHENTICATION ===');
      
      // Check for existing session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error getting session:', error);
        this.updateState({ 
          user: null, 
          loading: false, 
          error: error.message 
        });
        return;
      }

      if (session?.user) {
        console.log('✅ Found existing session');
        const user = this.mapSupabaseUser(session.user);
        await this.saveUserToStorage(user);
        this.updateState({ 
          user, 
          loading: false, 
          error: null 
        });
      } else {
        console.log('ℹ️ No existing session found');
        this.updateState({ 
          user: null, 
          loading: false, 
          error: null 
        });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          const user = this.mapSupabaseUser(session.user);
          await this.saveUserToStorage(user);
          this.updateState({ 
            user, 
            loading: false, 
            error: null 
          });
        } else if (event === 'SIGNED_OUT') {
          await this.clearUserFromStorage();
          this.updateState({ 
            user: null, 
            loading: false, 
            error: null 
          });
        }
      });

    } catch (error: any) {
      console.error('❌ Error initializing auth:', error);
      this.updateState({ 
        user: null, 
        loading: false, 
        error: error.message 
      });
    }
  }

  // Map Supabase user to our User interface
  private mapSupabaseUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.full_name || 
            supabaseUser.user_metadata?.name || 
            supabaseUser.email?.split('@')[0],
      avatar_url: supabaseUser.user_metadata?.avatar_url || 
                  supabaseUser.user_metadata?.picture,
      provider: supabaseUser.app_metadata?.provider,
      created_at: supabaseUser.created_at
    };
  }

  // Save user to local storage
  private async saveUserToStorage(user: User) {
    try {
      const userData = JSON.stringify(user);
      if (Platform.OS === 'web') {
        localStorage.setItem(AUTH_STORAGE_KEY, userData);
      } else {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, userData);
      }
    } catch (error) {
      console.error('❌ Error saving user to storage:', error);
    }
  }

  // Clear user from local storage
  private async clearUserFromStorage() {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (error) {
      console.error('❌ Error clearing user from storage:', error);
    }
  }

  // FIXED: Sign in with Google - Mobile Support
  async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 === SIGNING IN WITH GOOGLE ===');
      console.log('📱 Platform:', Platform.OS);
      
      this.updateState({ loading: true, error: null });

      if (Platform.OS === 'web') {
        // Web OAuth flow
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          }
        });

        if (error) {
          console.error('❌ Google OAuth error:', error);
          this.updateState({ 
            loading: false, 
            error: error.message 
          });
          return { success: false, error: error.message };
        }

        // For web, the redirect will handle the rest
        return { success: true };

      } else {
        // FIXED: Mobile OAuth flow using WebBrowser
        console.log('📱 Starting mobile OAuth flow...');
        
        // Get the OAuth URL from Supabase
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: Linking.createURL('/'),
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          }
        });

        if (error) {
          console.error('❌ Error getting OAuth URL:', error);
          this.updateState({ 
            loading: false, 
            error: error.message 
          });
          return { success: false, error: error.message };
        }

        if (!data.url) {
          const errorMessage = 'No OAuth URL received from Supabase';
          console.error('❌', errorMessage);
          this.updateState({ 
            loading: false, 
            error: errorMessage 
          });
          return { success: false, error: errorMessage };
        }

        console.log('🌐 Opening OAuth URL:', data.url);

        // Open the OAuth URL in a web browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          Linking.createURL('/')
        );

        console.log('📱 OAuth result:', result);

        if (result.type === 'success') {
          // Extract the URL from the result
          const url = result.url;
          
          // Parse the URL to get the session
          const urlObj = new URL(url);
          const accessToken = urlObj.searchParams.get('access_token');
          const refreshToken = urlObj.searchParams.get('refresh_token');

          if (accessToken) {
            // Set the session in Supabase
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });

            if (sessionError) {
              console.error('❌ Error setting session:', sessionError);
              this.updateState({ 
                loading: false, 
                error: sessionError.message 
              });
              return { success: false, error: sessionError.message };
            }

            console.log('✅ Mobile OAuth successful');
            return { success: true };
          } else {
            const errorMessage = 'No access token received from OAuth';
            console.error('❌', errorMessage);
            this.updateState({ 
              loading: false, 
              error: errorMessage 
            });
            return { success: false, error: errorMessage };
          }
        } else if (result.type === 'cancel') {
          console.log('ℹ️ User cancelled OAuth');
          this.updateState({ 
            loading: false, 
            error: null 
          });
          return { success: false, error: 'Sign in was cancelled' };
        } else {
          const errorMessage = 'OAuth failed or was dismissed';
          console.error('❌', errorMessage);
          this.updateState({ 
            loading: false, 
            error: errorMessage 
          });
          return { success: false, error: errorMessage };
        }
      }

    } catch (error: any) {
      console.error('❌ Error signing in with Google:', error);
      const errorMessage = error.message || 'Failed to sign in with Google';
      this.updateState({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  }

  // Sign in with email (fallback)
  async signInWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 === SIGNING IN WITH EMAIL ===');
      
      this.updateState({ loading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Email sign in error:', error);
        this.updateState({ 
          loading: false, 
          error: error.message 
        });
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('✅ Email sign in successful');
        return { success: true };
      }

      return { success: false, error: 'Sign in failed' };

    } catch (error: any) {
      console.error('❌ Error signing in with email:', error);
      const errorMessage = error.message || 'Failed to sign in';
      this.updateState({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  }

  // Sign up with email
  async signUpWithEmail(email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 === SIGNING UP WITH EMAIL ===');
      
      this.updateState({ loading: true, error: null });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            name: name
          }
        }
      });

      if (error) {
        console.error('❌ Email sign up error:', error);
        this.updateState({ 
          loading: false, 
          error: error.message 
        });
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('✅ Email sign up successful');
        return { success: true };
      }

      return { success: false, error: 'Sign up failed' };

    } catch (error: any) {
      console.error('❌ Error signing up with email:', error);
      const errorMessage = error.message || 'Failed to sign up';
      this.updateState({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  }

  // Sign out
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 === SIGNING OUT ===');
      
      this.updateState({ loading: true, error: null });

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Sign out error:', error);
        this.updateState({ 
          loading: false, 
          error: error.message 
        });
        return { success: false, error: error.message };
      }

      console.log('✅ Sign out successful');
      return { success: true };

    } catch (error: any) {
      console.error('❌ Error signing out:', error);
      const errorMessage = error.message || 'Failed to sign out';
      this.updateState({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentState.user;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentState.user !== null;
  }

  // Get current auth state
  getAuthState(): AuthState {
    return this.currentState;
  }

  // Reset password
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 === RESETTING PASSWORD ===');
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Platform.OS === 'web' ? window.location.origin + '/reset-password' : undefined
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Password reset email sent');
      return { success: true };

    } catch (error: any) {
      console.error('❌ Error resetting password:', error);
      return { success: false, error: error.message || 'Failed to reset password' };
    }
  }
}

// Export singleton instance
export const authManager = new AuthManager();

// Convenience functions
export const signInWithGoogle = () => authManager.signInWithGoogle();
export const signInWithEmail = (email: string, password: string) => authManager.signInWithEmail(email, password);
export const signUpWithEmail = (email: string, password: string, name?: string) => authManager.signUpWithEmail(email, password, name);
export const signOut = () => authManager.signOut();
export const getCurrentUser = () => authManager.getCurrentUser();
export const isAuthenticated = () => authManager.isAuthenticated();
export const resetPassword = (email: string) => authManager.resetPassword(email);