// Beautiful login page with FIXED mobile Google OAuth support
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { authManager, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } from '@/lib/auth';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if user is already authenticated
  useEffect(() => {
    const unsubscribe = authManager.subscribe((authState) => {
      if (authState.user && !authState.loading) {
        // User is authenticated, redirect to main app
        router.replace('/(tabs)');
      }
    });

    return unsubscribe;
  }, [router]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleGoogleSignIn = async () => {
    try {
      clearMessages();
      setLoading(true);

      console.log('🔐 Starting Google sign in...');
      const result = await signInWithGoogle();
      
      if (!result.success) {
        console.error('❌ Google sign in failed:', result.error);
        setError(result.error || 'Failed to sign in with Google');
      } else {
        console.log('✅ Google sign in initiated successfully');
        // Success will be handled by the auth state listener
      }
    } catch (error: any) {
      console.error('❌ Google sign in error:', error);
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    try {
      clearMessages();

      // Validation
      if (!validateEmail(email)) {
        setError('Please enter a valid email address');
        return;
      }

      if (authMode === 'forgot') {
        setLoading(true);
        const result = await resetPassword(email);
        
        if (result.success) {
          setSuccess('Password reset email sent! Check your inbox.');
          setAuthMode('signin');
        } else {
          setError(result.error || 'Failed to send reset email');
        }
        setLoading(false);
        return;
      }

      if (!validatePassword(password)) {
        setError('Password must be at least 6 characters long');
        return;
      }

      if (authMode === 'signup') {
        if (!name.trim()) {
          setError('Please enter your name');
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        setLoading(true);
        const result = await signUpWithEmail(email, password, name);
        
        if (result.success) {
          setSuccess('Account created successfully! Please check your email to verify your account.');
          setAuthMode('signin');
        } else {
          setError(result.error || 'Failed to create account');
        }
      } else {
        setLoading(true);
        const result = await signInWithEmail(email, password);
        
        if (!result.success) {
          setError(result.error || 'Failed to sign in');
        }
        // Success will be handled by the auth state listener
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getAuthModeTitle = () => {
    switch (authMode) {
      case 'signin': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'forgot': return 'Reset Password';
    }
  };

  const getAuthModeSubtitle = () => {
    switch (authMode) {
      case 'signin': return 'Sign in to find clean toilets near you';
      case 'signup': return 'Join thousands of users finding clean facilities';
      case 'forgot': return 'Enter your email to reset your password';
    }
  };

  const getAuthModeButtonText = () => {
    switch (authMode) {
      case 'signin': return 'Sign In';
      case 'signup': return 'Create Account';
      case 'forgot': return 'Send Reset Email';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.backgroundGradient}
      />

      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: 'https://images.pexels.com/photos/6585757/pexels-photo-6585757.jpeg?auto=compress&cs=tinysrgb&w=800' }}
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay} />
        
        {/* Logo and App Name */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🚻</Text>
          </View>
          <Text style={styles.appName}>Namma Loo</Text>
          <Text style={styles.appTagline}>Smart Toilet Finder</Text>
        </View>
      </View>

      {/* Auth Form */}
      <SafeAreaView style={styles.formContainer}>
        <ScrollView 
          style={styles.formScroll}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form Header */}
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{getAuthModeTitle()}</Text>
            <Text style={styles.formSubtitle}>{getAuthModeSubtitle()}</Text>
          </View>

          {/* Error/Success Messages */}
          {error && (
            <View style={styles.messageContainer}>
              <AlertCircle size={16} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {success && (
            <View style={[styles.messageContainer, styles.successContainer]}>
              <CheckCircle size={16} color="#34C759" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          {/* Google Sign In Button - ENHANCED for mobile */}
          {authMode !== 'forgot' && (
            <TouchableOpacity
              style={[styles.googleButton, loading && styles.googleButtonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>
                {Platform.OS === 'web' ? 'Continue with Google' : 'Sign in with Google'}
              </Text>
              {loading && <ActivityIndicator size="small" color="#666" />}
            </TouchableOpacity>
          )}

          {/* Platform Info */}
          {Platform.OS !== 'web' && (
            <View style={styles.platformInfo}>
              <Text style={styles.platformInfoText}>
                📱 Mobile Google OAuth is now supported!
              </Text>
            </View>
          )}

          {/* Divider */}
          {authMode !== 'forgot' && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Email address"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Name Input (Sign Up only) */}
          {authMode === 'signup' && (
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <User size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Full name"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>
          )}

          {/* Password Input */}
          {authMode !== 'forgot' && (
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#666" />
                  ) : (
                    <Eye size={20} color="#666" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Confirm Password Input (Sign Up only) */}
          {authMode === 'signup' && (
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Confirm password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#666" />
                  ) : (
                    <Eye size={20} color="#666" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Forgot Password Link */}
          {authMode === 'signin' && (
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => setAuthMode('forgot')}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {/* Main Action Button */}
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.actionButtonDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>
              {getAuthModeButtonText()}
            </Text>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ArrowRight size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          {/* Mode Switch */}
          <View style={styles.modeSwitchContainer}>
            {authMode === 'signin' && (
              <TouchableOpacity
                onPress={() => setAuthMode('signup')}
                disabled={loading}
              >
                <Text style={styles.modeSwitchText}>
                  Don't have an account? <Text style={styles.modeSwitchLink}>Sign up</Text>
                </Text>
              </TouchableOpacity>
            )}

            {authMode === 'signup' && (
              <TouchableOpacity
                onPress={() => setAuthMode('signin')}
                disabled={loading}
              >
                <Text style={styles.modeSwitchText}>
                  Already have an account? <Text style={styles.modeSwitchLink}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            )}

            {authMode === 'forgot' && (
              <TouchableOpacity
                onPress={() => setAuthMode('signin')}
                disabled={loading}
              >
                <Text style={styles.modeSwitchText}>
                  Remember your password? <Text style={styles.modeSwitchLink}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Terms and Privacy */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  heroContainer: {
    height: SCREEN_HEIGHT * 0.45,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(102, 126, 234, 0.8)',
  },
  logoContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoText: {
    fontSize: 32,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 24,
    paddingBottom: 40,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFEBEE',
    gap: 8,
  },
  successContainer: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  successText: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  platformInfo: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  platformInfoText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 16,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modeSwitchContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modeSwitchText: {
    fontSize: 14,
    color: '#666',
  },
  modeSwitchLink: {
    color: '#667eea',
    fontWeight: '600',
  },
  termsContainer: {
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#667eea',
    fontWeight: '500',
  },
});