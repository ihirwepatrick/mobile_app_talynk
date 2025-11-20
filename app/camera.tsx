import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera';
import { router } from 'expo-router';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { generateThumbnail } from '@/lib/utils/thumbnail';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CameraScreen() {
  const [deviceId, setDeviceId] = useState<'back' | 'front'>('back');
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasGalleryPermission, setHasGalleryPermission] = useState(false);
  const [galleryItems, setGalleryItems] = useState<MediaLibrary.Asset[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();

  // Get camera device
  const device = useCameraDevice(deviceId);

  // Request all permissions on mount
  useEffect(() => {
    requestAllPermissions();
  }, []);

  const requestAllPermissions = async () => {
    // Request camera permission
    if (!hasCameraPermission) {
      const cameraStatus = await requestCameraPermission();
      if (!cameraStatus) {
        // If camera permission denied, allow gallery access
        Alert.alert(
          'Camera Permission',
          'Camera permission is required for recording. You can still select videos from your gallery.',
          [
            { text: 'Use Gallery', onPress: () => pickFromGallery() },
            { text: 'Cancel', onPress: () => router.back(), style: 'cancel' }
          ]
        );
        return;
      }
    }

    // Request microphone permission
    if (!hasMicPermission) {
      await requestMicPermission();
    }

    // Request gallery permission and pre-load gallery items
    const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (galleryStatus.granted) {
      setHasGalleryPermission(true);
      loadGalleryItems();
    }
  };

  const loadGalleryItems = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        const assets = await MediaLibrary.getAssetsAsync({
          sortBy: ['creationTime'],
          mediaType: ['video'],
          first: 10,
        });
        setGalleryItems(assets.assets);
      }
    } catch (error) {
      console.warn('Error loading gallery:', error);
    }
  };

  const toggleCameraFacing = () => {
    setDeviceId(current => current === 'back' ? 'front' : 'back');
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording || !device) return;

    try {
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer for recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop at 60 seconds
          if (newTime >= 60) {
            stopRecording();
            return 60;
          }
          return newTime;
        });
      }, 1000);

      // Start recording with optimized settings
      await cameraRef.current.startRecording({
        flash: 'off',
        onRecordingFinished: (video) => {
          handleRecordingFinished(video.path);
        },
        onRecordingError: (error) => {
          console.error('Recording error:', error);
          setIsRecording(false);
          setRecordingTime(0);
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
          Alert.alert('Error', 'Failed to record video. Please try again.');
        },
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Stop recording - the onRecordingFinished callback will handle the result
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      setRecordingTime(0);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const handleRecordingFinished = async (videoPath: string) => {
    try {
      setIsProcessing(true);
      setIsRecording(false);
      setRecordingTime(0);

      // Generate thumbnail
      const thumbnailUri = await generateThumbnail(videoPath);
      
      // Navigate to create post screen with video and thumbnail
      router.push({
        pathname: '/(tabs)/create',
        params: {
          videoUri: videoPath,
          thumbnailUri: thumbnailUri || videoPath,
          fromCamera: 'true',
        },
      });
    } catch (error) {
      console.error('Error processing recording:', error);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
      setIsProcessing(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setIsProcessing(true);
        const videoUri = result.assets[0].uri;
        
        // Generate thumbnail
        const thumbnailUri = await generateThumbnail(videoUri);
        
        // Navigate to create post screen
        router.push({
          pathname: '/(tabs)/create',
          params: {
            videoUri: videoUri,
            thumbnailUri: thumbnailUri || videoUri,
            fromGallery: 'true',
          },
        });
        
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error picking from gallery:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to pick video from gallery.');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show permission request screen
  if (!hasCameraPermission) {
    return (
      <View style={styles.container}>
        <MaterialIcons name="camera-alt" size={64} color="#60a5fa" />
        <Text style={styles.permissionText}>Camera permission is required</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permissionButton, styles.galleryButton]}
          onPress={pickFromGallery}
        >
          <Text style={styles.permissionButtonText}>Use Gallery Instead</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permissionButton, styles.backButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading if device not ready
  if (!device) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.loadingText}>Initializing camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Camera View */}
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={!isProcessing}
        video={true}
        audio={hasMicPermission}
      />

      {/* Processing Overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Processing video...</Text>
        </View>
      )}

      {/* Top Controls */}
      <View style={[styles.topControls, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.flipButton}
          onPress={toggleCameraFacing}
        >
          <MaterialIcons name="flip-camera-ios" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Recording Timer */}
      {isRecording && (
        <View style={styles.timerContainer}>
          <View style={styles.recordingDot} />
          <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
        </View>
      )}

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
        {/* Gallery Button */}
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={pickFromGallery}
          disabled={isRecording || isProcessing}
        >
          {galleryItems.length > 0 ? (
            <View style={styles.galleryThumbnail}>
              <Text style={styles.galleryIcon}>📷</Text>
            </View>
          ) : (
            <MaterialIcons name="photo-library" size={32} color="#fff" />
          )}
        </TouchableOpacity>

        {/* Record Button */}
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={isProcessing}
        >
          {isRecording ? (
            <View style={styles.recordButtonInner} />
          ) : (
            <View style={styles.recordButtonOuter} />
          )}
        </TouchableOpacity>

        {/* Placeholder for symmetry */}
        <View style={styles.placeholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionButton: {
    backgroundColor: '#60a5fa',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 12,
  },
  galleryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#60a5fa',
    marginTop: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff2d55',
    marginRight: 8,
  },
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  galleryButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  galleryIcon: {
    fontSize: 24,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  recordButtonActive: {
    backgroundColor: '#ff2d55',
    borderColor: '#ff2d55',
  },
  recordButtonOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff2d55',
  },
  recordButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  placeholder: {
    width: 60,
    height: 60,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
});
