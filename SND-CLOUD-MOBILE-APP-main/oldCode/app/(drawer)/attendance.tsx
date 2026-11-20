import { RootState } from '@/Redux/Store/types';
import { markAttendance } from '@/src/Api/AttendanceService';
import { uploadToCloudinary } from '@/src/Api/CloudinaryService';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { theme } from '../../src/theme';

type AttendanceType = 'check-in' | 'check-out';

interface AttendanceState {
  image: string | null;
  location: {
    latitude: number | null;
    longitude: number | null;
  } | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  success: boolean;
}

interface TabCheckInState {
  lastCheckIn: string | null;
  isWithin24Hours: boolean;
}

const AttendanceScreen = () => {
  const [state, setState] = useState<AttendanceState>({
    image: null,
    location: null,
    loading: false,
    uploading: false,
    error: null,
    success: false,
  });
  console.log(state)
  const [refreshing, setRefreshing] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);

  // Tab state management
  const [activeTab, setActiveTab] = useState<AttendanceType>('check-in');
  const [tabState, setTabState] = useState<TabCheckInState>({
    lastCheckIn: null,
    isWithin24Hours: false,
  });

  // Get user ID from Redux store (adjust selector based on your store structure)
 const loginVendor = useSelector((state: RootState) => state.users1.state)
 console.log(loginVendor)
  /**
   * Check if user can mark check-out (only if checked in within 24 hours)
   */
  const checkCanMarkCheckOut = (): boolean => {
    return tabState.isWithin24Hours && !hasCheckedOut;
  };

  /**
   * Calculate time difference between check-in and now
   */
  const getTimeDifference = (checkInTime: string): string => {
    const checkIn = new Date(checkInTime);
    const now = new Date();
    const diffMs = now.getTime() - checkIn.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m ago`;
    }
    return `${diffMinutes}m ago`;
  };

  /**
   * Request and retrieve user location
   */
  const getLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to mark attendance.');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error: any) {
      console.error('Location error:', error);
      Alert.alert('Location Error', 'Failed to retrieve location. Please try again.');
      return null;
    }
  };

  /**
   * Open camera and capture image
   */
  const capturePhoto = async (): Promise<string | null> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to capture your photo.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Camera Error', 'Failed to open camera. Please try again.');
      return null;
    }
  };

  /**
   * Main handler for marking attendance
   */
  const handleMarkAttendance = async () => {
    console.log(activeTab)
    setState(prev => ({ ...prev, error: null, success: false }));

    // Validate check-out time constraint
    

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Step 1: Capture photo
      const photoUri = await capturePhoto();
      if (!photoUri) {
        setState(prev => ({ ...prev, loading: false, uploading: false }));
        return;
      }

      setState(prev => ({ ...prev, image: photoUri }));

      // Step 2: Get location
      const location = await getLocation();
      if (!location) {
        setState(prev => ({ ...prev, error: 'Failed to get location', loading: false, uploading: false }));
        return;
      }

      setState(prev => ({ ...prev, location }));

      // Step 3: Upload to Cloudinary
      setState(prev => ({ ...prev, uploading: true }));
      const imageUrl = await uploadToCloudinary(photoUri);
      setState(prev => ({ ...prev, uploading: false }));

      console.log({
  UserId: loginVendor?._id,
  distributorId: loginVendor?.Distributor,
  imageUrl,
  latitude: location.latitude,
  longitude: location.longitude,
  markingType: activeTab,
});
const now = new Date();
const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
const time = now.toTimeString().split(' ')[0]; // HH:MM:SS

      // Step 4: Send to backend with marking type
      await markAttendance(loginVendor?._id, loginVendor?.Distributor, imageUrl, location.latitude, location.longitude, activeTab,date, time);

      // Success!
      setState(prev => ({
        ...prev,
        success: true,
        error: null,
        loading: false,
      }));

      // Update tab state if check-in 
      if (activeTab === 'check-in') {
        setTabState({
          lastCheckIn: new Date().toISOString(),
          isWithin24Hours: true,
        });
        setHasCheckedOut(false);
      } else if (activeTab === 'check-out') {
        setHasCheckedOut(true);
      }

      Alert.alert('Success', `${activeTab === 'check-in' ? 'Check-in' : 'Check-out'} marked successfully!`, [
        {
          text: 'OK',
          onPress: () => {
            setState({
              image: null,
              location: null,
              loading: false,
              uploading: false,
              error: null,
              success: false,
            });
          },
        },
      ]);
    } catch (error: any) {

      console.error('Attendance error:', error , "Error message:", error );
      setState(prev => ({
        ...prev,
        error: error.message || 'An unexpected error occurred',
        loading: false,
        uploading: false,
      }));
      Alert.alert('Error', error.message || 'Failed to mark attendance');
    }
  };

  const isProcessing = state.loading || state.uploading;
  const canCheckIn = !tabState.lastCheckIn;

  const refreshAttendance = () => {
    setRefreshing(true);
    setState(prev => ({ ...prev, error: null, success: false }));

    if (tabState.lastCheckIn) {
      const lastCheckInDate = new Date(tabState.lastCheckIn);
      const diffMs = new Date().getTime() - lastCheckInDate.getTime();
      const isWithin24Hours = diffMs < 24 * 60 * 60 * 1000;
      setTabState(prev => ({ ...prev, isWithin24Hours }));
    }

    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshAttendance}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'check-in' && styles.tabActive]}
          onPress={() => setActiveTab('check-in')}
        >
          <Text style={[styles.tabText, activeTab === 'check-in' && styles.tabTextActive]}>
            Mark In
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'check-out' && styles.tabActive]}
          onPress={() => setActiveTab('check-out')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'check-out' && styles.tabTextActive,
           
            ]}
          >
            Mark Out
          </Text>
        </TouchableOpacity>
      </View>

      {/* Last Check-in Info (Show only in Mark Out tab) */}
      {activeTab === 'check-out' && tabState.lastCheckIn && (
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Last Check-in</Text>
          <Text style={styles.infoCardText}>{getTimeDifference(tabState.lastCheckIn)}</Text>
          <Text style={styles.infoCardSubtext}>Valid for 24 hours from check-in</Text>
        </View>
      )}

      {/* Warning if trying check-out without check-in */}

      <View style={styles.card}>
        <Text style={styles.title}>
          {activeTab === 'check-in' ? 'Mark Check-In' : 'Mark Check-Out'}
        </Text>

        {/* Image Preview */}
        {state.image && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Photo Preview</Text>
            <Image source={{ uri: state.image }} style={styles.previewImage} />
          </View>
        )}

        {/* Location Display */}
        {state.location && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationLabel}>Location Captured</Text>
            <Text style={styles.locationText}>
              Latitude: {state.location.latitude.toFixed(4)}
            </Text>
            <Text style={styles.locationText}>
              Longitude: {state.location.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Error Message */}
        {state.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{state.error}</Text>
          </View>
        )}

        {/* Success Message */}
        {state.success && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              ✓ {activeTab === 'check-in' ? 'Check-in' : 'Check-out'} marked successfully!
            </Text>
          </View>
        )}

        {/* Loading Indicator */}
        {isProcessing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {state.uploading ? 'Uploading image...' : 'Processing...'}
            </Text>
          </View>
        )}

        {/* Main Button */}
        <TouchableOpacity
          style={[
            styles.button,
            (isProcessing || !checkCanMarkCheckOut() || (activeTab === 'check-in' && !canCheckIn)) && styles.buttonDisabled,
          ]}
          onPress={handleMarkAttendance}
          
        >
          <Text style={styles.buttonText}>
            {isProcessing
              ? 'Processing...'
              : activeTab === 'check-in'
              ? 'Mark Check-In'
              : 'Mark Check-Out'}
          </Text>
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.infoText}>
          • Camera permission required to capture photo{'\n'}
          • Location permission required to get GPS coordinates{'\n'}
          • Image will be uploaded to cloud storage{'\n'}
          • {activeTab === 'check-out' ? 'Check-out valid for 24 hours from check-in' : 'Check-in starts your 24-hour tracking'}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: 16,
    flexGrow: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.muted,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabTextDisabled: {
    color: theme.colors.line,
  },
  infoCard: {
    backgroundColor: theme.colors.infoSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.info,
    marginBottom: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  infoCardText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: 2,
  },
  infoCardSubtext: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  warningCard: {
    backgroundColor: theme.colors.warningSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.warning,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.ink,
    marginBottom: 18,
    textAlign: 'center',
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.muted,
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
  },
  locationContainer: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 2,
  },
  errorContainer: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.danger,
    fontWeight: '600',
  },
  successContainer: {
    backgroundColor: theme.colors.successSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  buttonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.muted,
    lineHeight: 18,
  },
});

export default AttendanceScreen;
