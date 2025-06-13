import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  X, 
  Share2, 
  MessageCircle, 
  Copy, 
  Mail, 
  MessageSquare,
  Send
} from 'lucide-react-native';
import { shareToilet } from '@/lib/sharing';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  toilet: any;
}

export default function ShareModal({ visible, onClose, toilet }: ShareModalProps) {
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  
  const handleShare = async (platform?: string) => {
    try {
      setSharing(true);
      await shareToilet({ 
        toilet, 
        userMessage: message.trim() || undefined 
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Could not share toilet information.');
    } finally {
      setSharing(false);
    }
  };
  
  const shareOptions = [
    {
      id: 'general',
      label: 'Share',
      icon: Share2,
      color: '#007AFF',
      onPress: () => handleShare()
    },
    {
      id: 'message',
      label: 'Message',
      icon: MessageCircle,
      color: '#34C759',
      onPress: () => handleShare('message')
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      color: '#FF9500',
      onPress: () => handleShare('email')
    },
    {
      id: 'copy',
      label: 'Copy Link',
      icon: Copy,
      color: '#8E44AD',
      onPress: () => handleShare('copy')
    }
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
          <Text style={styles.title}>Share Toilet</Text>
          <View style={styles.placeholder} />
        </View>
        
        <ScrollView style={styles.content}>
          {/* Toilet Info */}
          <View style={styles.toiletInfo}>
            <Text style={styles.toiletName}>{toilet.name || 'Public Toilet'}</Text>
            <Text style={styles.toiletAddress}>{toilet.address || 'Address not available'}</Text>
            {toilet.rating && (
              <Text style={styles.toiletRating}>⭐ {toilet.rating.toFixed(1)}/5</Text>
            )}
          </View>
          
          {/* Message Input */}
          <View style={styles.messageSection}>
            <Text style={styles.sectionTitle}>Add a message (optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Share your thoughts about this toilet..."
              multiline
              numberOfLines={3}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
          </View>
          
          {/* Share Options */}
          <View style={styles.shareSection}>
            <Text style={styles.sectionTitle}>Share via</Text>
            <View style={styles.shareOptions}>
              {shareOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.shareOption}
                  onPress={option.onPress}
                  disabled={sharing}
                >
                  <View style={[styles.shareIconContainer, { backgroundColor: option.color }]}>
                    <option.icon size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.shareOptionLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Quick Share Button */}
          <TouchableOpacity
            style={[styles.quickShareButton, sharing && styles.disabledButton]}
            onPress={() => handleShare()}
            disabled={sharing}
          >
            <Send size={20} color="#FFFFFF" />
            <Text style={styles.quickShareText}>
              {sharing ? 'Sharing...' : 'Share Now'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  toiletInfo: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  toiletName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  toiletAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  toiletRating: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
  },
  messageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    backgroundColor: '#F8F9FA',
  },
  shareSection: {
    marginBottom: 32,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  shareOption: {
    alignItems: 'center',
    flex: 1,
  },
  shareIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shareOptionLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  quickShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  quickShareText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});