import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  Image,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { postsApi } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { uploadNotificationService } from '@/lib/notification-service';
import { categoriesApi } from '@/lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { API_BASE_URL } from '@/lib/config';
import * as FileSystem from 'expo-file-system/legacy';
import { generateThumbnail } from '@/lib/utils/thumbnail';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- CATEGORY STRUCTURE (from web) ---
const CATEGORIES_STRUCTURE = {
  "General": [
    { id: 1, name: "Technology" },
    { id: 2, name: "Entertainment" },
    { id: 3, name: "Sports" },
    { id: 4, name: "Education" },
    { id: 5, name: "Lifestyle" },
    { id: 6, name: "Business" },
    { id: 7, name: "Health" },
    { id: 8, name: "Travel" },
    { id: 9, name: "Science" },
  ],
  "Music": [
    { id: 12, name: "Rock" },
    { id: 13, name: "Pop" },
    { id: 14, name: "Hip Hop" },
    { id: 15, name: "Jazz" },
    { id: 16, name: "Classical" },
    { id: 17, name: "Electronic" },
    { id: 18, name: "Afrobeat" },
    { id: 19, name: "Gospel" },
  ],
  "Sports": [
    { id: 21, name: "Football" },
    { id: 22, name: "Basketball" },
    { id: 23, name: "Volleyball" },
    { id: 24, name: "Handball" },
    { id: 25, name: "Tennis" },
    { id: 26, name: "Rugby" },
    { id: 27, name: "Acrobatics" },
    { id: 28, name: "Others" },
  ],
  "Arts & Performance": [
    { id: 29, name: "Theatre" },
    { id: 30, name: "Comedy" },
    { id: 31, name: "Drama" },
    { id: 32, name: "Musical" },
    { id: 33, name: "Drawing" },
    { id: 34, name: "Painting" },
    { id: 35, name: "Sculpture" },
    { id: 36, name: "Photography" },
  ],
  "Communication & Movement": [
    { id: 37, name: "Public Speaking" },
    { id: 38, name: "Debate" },
    { id: 39, name: "Presentation" },
    { id: 40, name: "Communication" },
    { id: 41, name: "Dance" },
    { id: 42, name: "Ballet" },
    { id: 43, name: "Contemporary" },
    { id: 44, name: "Hip-Hop" },
    { id: 45, name: "Traditional" },
  ],
};
const MAIN_CATEGORY_GROUPS = Object.keys(CATEGORIES_STRUCTURE);

const COLORS = {
  dark: {
    background: '#000000',
    card: '#232326',
    border: '#27272a',
    text: '#f3f4f6',
    textSecondary: '#a1a1aa',
    primary: '#60a5fa',
    inputBg: '#232326',
    inputBorder: '#27272a',
    inputText: '#f3f4f6',
    buttonBg: '#60a5fa',
    buttonText: '#fff',
    spinner: '#60a5fa',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    errorBg: '#7f1d1d',
    errorBorder: '#b91c1c',
    successBg: '#14532d',
    successBorder: '#22c55e',
    warningBg: '#78350f',
    warningBorder: '#f59e42',
    placeholder: '#71717a',
    buttonDisabled: '#444',
  },
};

export default function CreatePostScreen() {
  const { isAuthenticated, loading: authLoading, user, token } = useAuth();
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [editedVideoUri, setEditedVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hasOpenedCameraOnMount, setHasOpenedCameraOnMount] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'video' | 'picture'>('video');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showPostActionModal, setShowPostActionModal] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const C = COLORS.dark;
  const [mainCategories, setMainCategories] = useState<{ id: number, name: string, children?: { id: number, name: string }[] }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: number, name: string }[]>([]);
  const insets = useSafeAreaInsets();
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState<boolean>(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<Video>(null);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');

  // --- AUTHENTICATION CHECK ---
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'You need to be logged in to create posts. Would you like to sign in?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => router.replace('/')
          },
          {
            text: 'Sign In',
            onPress: () => router.push('/auth/login')
          }
        ]
      );
    }
  }, [isAuthenticated, authLoading]);

  // --- AUTO OPEN CAMERA ON FIRST MOUNT WHEN AUTHENTICATED ---
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (hasOpenedCameraOnMount) return;

    setHasOpenedCameraOnMount(true);

    // Small delay so the screen can finish rendering before opening the native camera.
    // This makes auto-open more reliable on some devices / platforms.
    const timeoutId = setTimeout(() => {
      handleRecordVideo();
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [authLoading, isAuthenticated, hasOpenedCameraOnMount]);

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[{ fontSize: 16, marginTop: 12, fontWeight: '500' }, { color: C.text }]}>Loading...</Text>
      </View>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <MaterialIcons name="lock" size={64} color={C.primary} />
        <Text style={[{ fontSize: 24, fontWeight: '700', marginTop: 20, marginBottom: 12, textAlign: 'center' }, { color: C.text }]}>Authentication Required</Text>
        <Text style={[{ fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: 32 }, { color: C.textSecondary }]}>
          You need to be logged in to create posts and share your content with the community.
        </Text>
        <TouchableOpacity
          style={[{ paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, marginBottom: 12, minWidth: 200, alignItems: 'center' }, { backgroundColor: C.primary }]}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={[{ fontSize: 16, fontWeight: '600' }, { color: C.buttonText }]}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, minWidth: 120, alignItems: 'center' }, { borderColor: C.border }]}
          onPress={() => router.replace('/')}
        >
          <Text style={[{ fontSize: 14, fontWeight: '500' }, { color: C.text }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- CATEGORY HELPERS ---
  const getCategoriesForGroup = () => {
    if (!selectedGroup) return [];
    return CATEGORIES_STRUCTURE[selectedGroup as keyof typeof CATEGORIES_STRUCTURE] || [];
  };
  
  const getSelectedCategoryName = () => {
    if (!selectedCategoryId) return '';
    const foundSub = subcategories.find(cat => String(cat.id) === selectedCategoryId);
    if (foundSub) return foundSub.name;
    const allCats = Object.values(CATEGORIES_STRUCTURE).flat();
    const found = allCats.find((cat: { id: number; name: string }) => String(cat.id) === selectedCategoryId);
    return found ? found.name : '';
  };

  const getSelectedCategoryId = () => {
    return selectedCategoryId || '';
  };

  // --- FETCH CATEGORIES ---
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    const loadCategories = async () => {
      setLoadingCategories(true);
      const res = await categoriesApi.getAll();
      if (res.status === 'success' && (res.data as any)?.categories) {
        const cats = (res.data as any).categories as { id: number, name: string, children?: any[] }[];
        const mains = cats.map(c => ({ id: c.id, name: c.name, children: (c.children || []).map(sc => ({ id: sc.id, name: sc.name })) }));
        setMainCategories(mains);
      }
      setLoadingCategories(false);
    };
    loadCategories();
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    const loadSubs = async () => {
      if (!selectedGroup) { setSubcategories([]); return; }
      setLoadingSubcategories(true);
      const parent = mainCategories.find(c => c.name === selectedGroup);
      if (!parent) { setSubcategories([]); return; }
      setSubcategories(parent.children || []);
      setLoadingSubcategories(false);
    };
    loadSubs();
  }, [authLoading, isAuthenticated, selectedGroup, mainCategories]);

  // --- CAMERA RECORDING ---
  const handleRecordVideo = async () => {
    try {
      // Request camera permission
      if (!cameraPermission?.granted) {
        const cameraResult = await requestCameraPermission();
        if (!cameraResult.granted) {
          Alert.alert('Permission Required', 'Camera permission is required to record videos.');
          return;
        }
      }

      // Request microphone permission for audio recording
      if (!microphonePermission?.granted) {
        const micResult = await requestMicrophonePermission();
        if (!micResult.granted) {
          Alert.alert('Permission Required', 'Microphone permission is required to record audio with your video.');
          return;
        }
      }

      setShowCamera(true);
      setRecordingDuration(0);
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', error.message || 'Failed to open camera. Please try again.');
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          // Auto-stop at 2:30 (150 seconds)
          if (newDuration >= 150) {
            stopRecording();
            return 150;
          }
          return newDuration;
        });
      }, 1000);

      // Start recording (this is async and will resolve when stopRecording is called)
      // Audio settings for better volume - ensure mute is false
      const recordingOptions: any = {
        maxDuration: 150, // 2:30 minutes in seconds
        mute: false, // CRITICAL: Ensure audio is not muted - this records audio at normal volume
      };
      
      // Platform-specific options
      if (Platform.OS === 'ios') {
        recordingOptions.codec = 'h264';
      } else {
        recordingOptions.maxFileSize = 100 * 1024 * 1024; // 100MB max for Android
      }
      
      const recordingPromise = cameraRef.current.recordAsync(recordingOptions);
      
      recordingPromise.then((video) => {
        // This will be called when recording stops
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        
        if (video && video.uri) {
          if (recordingDuration > 150) {
            Alert.alert(
              'Video Too Long',
              'Your recording is longer than 2 minutes and 30 seconds. Please record a shorter video.'
            );
            setShowCamera(false);
            setRecordingDuration(0);
            return;
          }

          setRecordedVideoUri(video.uri);
          setEditedVideoUri(null);
          setCapturedImageUri(null); // Clear image when video is recorded
          
          // Generate thumbnail
          generateThumbnail(video.uri).then((thumb) => {
            setThumbnailUri(thumb);
          }).catch((thumbError) => {
            console.error('Thumbnail generation error:', thumbError);
          });
          
          setShowCamera(false);
          setRecordingDuration(0);
          // Don't show modal - buttons will be in the form
        } else {
          Alert.alert('Error', 'Failed to save video. Please try again.');
          setShowCamera(false);
          setRecordingDuration(0);
        }
      }).catch((error: any) => {
        console.error('Recording promise error:', error);
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        // Don't show error if user cancelled
        if (error?.message && !error.message.includes('cancel')) {
          Alert.alert('Error', 'Failed to record video. Please try again.');
        }
        setShowCamera(false);
        setRecordingDuration(0);
      });
    } catch (error: any) {
      console.error('Recording error:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (!cameraRef.current || !isRecording) return;

    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // stopRecording() returns void, the video comes from the promise in startRecording
    cameraRef.current.stopRecording();
  };

  const cancelCamera = () => {
    if (isRecording) {
      stopRecording();
    }
    setShowCamera(false);
    setRecordingDuration(0);
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // --- IMAGE CAPTURE ---
  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo && photo.uri) {
        setCapturedImageUri(photo.uri);
        setRecordedVideoUri(null); // Clear video when image is captured
        setEditedVideoUri(null);
        setShowCamera(false);
        // Don't show modal - buttons will be in the form
      } else {
        Alert.alert('Error', 'Failed to capture image. Please try again.');
      }
    } catch (error: any) {
      console.error('Image capture error:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  // --- VIDEO EDITING --- (Re-record instead of edit)
  const handleEditVideo = async () => {
    // For now, just re-record
    handleRecordVideo();
  };

  // --- VALIDATION ---
  const validate = async () => {
    const newErrors: { [k: string]: string } = {};
    if (!caption.trim()) {
      newErrors.caption = 'Caption is required';
    }
    if (!selectedGroup) {
      newErrors.group = 'Please select a category group';
    }
    if (!selectedCategoryId) {
      newErrors.category = 'Please select a specific category';
    }
    if (!recordedVideoUri && !editedVideoUri && !capturedImageUri) {
      newErrors.media = 'Please record a video or take a picture';
    }
    
    setErrors(newErrors);
    
    // Show error alert if validation fails
    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors).join('\n');
      Alert.alert('Missing Required Information', errorMessages);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  // Toggle camera facing
  const handleFlipCamera = () => {
    setCameraFacing(current => current === 'back' ? 'front' : 'back');
  };

  // --- SUBMIT ---
  const handleCreatePost = async (status: 'pending' | 'draft' = 'pending') => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Authentication Required',
        'You need to be logged in to create posts.',
        [
          {
            text: 'Sign In',
            onPress: () => router.push('/auth/login')
          }
        ]
      );
      return;
    }

    const isValid = await validate();
    if (!isValid) return;
    
    const videoUri = editedVideoUri || recordedVideoUri;
    const imageUri = capturedImageUri;
    
    if (!videoUri && !imageUri) {
      Alert.alert('Error', 'No media to upload');
      return;
    }

    // Request notification permissions
    const hasPermission = await uploadNotificationService.requestPermissions();
    if (!hasPermission) {
      console.log('Notification permissions not granted');
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const mediaUri = videoUri || imageUri;
      if (!mediaUri) {
        throw new Error('No media file to upload');
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(mediaUri);
      if (!fileInfo.exists) {
        throw new Error('Media file not found');
      }

      const fileName = mediaUri.split('/').pop() || (videoUri ? 'video.mp4' : 'image.jpg');
      const fileType = videoUri ? 'video/mp4' : 'image/jpeg';
      
      const formData = new FormData();
      // Use first 50 chars of caption as title, or generate one
      const autoTitle = caption.trim().substring(0, 50) || 'My Post';
      formData.append('title', autoTitle);
      formData.append('caption', caption);
      
      const categoryId = getSelectedCategoryId();
      const categoryName = getSelectedCategoryName();
      
      formData.append('post_category', categoryName);
      formData.append('category_id', categoryId);
      formData.append('status', status); // Add status (pending or draft)
      
      formData.append('file', {
        uri: mediaUri,
        name: fileName,
        type: fileType,
      } as any);
      
      const xhr = new XMLHttpRequest();
      const apiUrl = `${API_BASE_URL}/api/posts`;
      
      xhr.open('POST', apiUrl);
      xhr.setRequestHeader('Accept', 'application/json');
      
      const authToken = await AsyncStorage.getItem('talynk_token');
      
      if (!authToken) {
        setUploading(false);
        setUploadProgress(0);
        Alert.alert('Authentication Error', 'Please login again to create posts.');
        router.push('/auth/login');
        return;
      }
      
      const cleanToken = authToken.trim();
      xhr.setRequestHeader('Authorization', `Bearer ${cleanToken}`);
      
      let lastLoggedPercent = -10;
      xhr.upload.onprogress = async (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(Math.round((event.loaded / event.total) * 100), 100);
          setUploadProgress(percent);
          await uploadNotificationService.showUploadProgress(percent, fileName);
          
          if (percent - lastLoggedPercent >= 10 || percent === 100) {
            console.log(`Upload progress: ${percent}%`);
            lastLoggedPercent = percent;
          }
        }
      };
      
      xhr.onload = async () => {
        setUploading(false);
        setUploadProgress(0);
        
        if (xhr.status === 401) {
          await uploadNotificationService.showUploadError('Authentication failed. Please login again.', fileName);
          Alert.alert(
            'Authentication Error',
            'Authentication failed. Please login again to create posts.',
            [
              {
                text: 'Login',
                onPress: () => router.push('/auth/login')
              }
            ]
          );
          return;
        }
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.status === 'success') {
              await uploadNotificationService.showUploadComplete(fileName);
              
              const successMessage = status === 'draft' 
                ? 'Draft saved successfully! You can publish it later from your profile.'
                : 'Post created successfully! It will be reviewed and appear in your profile.';
              
              Alert.alert(
                'Success', 
                successMessage, 
                [
                  { 
                    text: 'View Profile', 
                    onPress: () => {
                      router.replace('/(tabs)/profile');
                    }
                  }
                ]
              );
              
              // Reset form
              setCaption('');
              setSelectedGroup('');
              setSelectedCategoryId('');
              setRecordedVideoUri(null);
              setCapturedImageUri(null);
              setEditedVideoUri(null);
              setThumbnailUri(null);
              setIsVideoPlaying(false);
            } else {
              // Handle draft limit error
              if (response.message?.includes('Maximum draft limit reached') || response.message?.includes('draft limit')) {
                Alert.alert(
                  'Draft Limit Reached',
                  `You can only have a maximum of 3 draft posts. Please publish or delete existing drafts before creating a new one.`,
                  [
                    {
                      text: 'View Drafts',
                      onPress: () => router.replace('/(tabs)/profile')
                    },
                    { text: 'OK' }
                  ]
                );
              } else {
                await uploadNotificationService.showUploadError(response.message || 'Failed to create post', fileName);
                Alert.alert('Error', response.message || 'Failed to create post');
              }
            }
          } catch (e) {
            await uploadNotificationService.showUploadError('Failed to parse server response', fileName);
            Alert.alert('Error', 'Failed to parse server response.');
          }
        } else {
          await uploadNotificationService.showUploadError(`Server responded with status ${xhr.status}`, fileName);
          Alert.alert('Error', `Failed to create post. Server responded with status ${xhr.status}`);
        }
      };
      
      xhr.onerror = async () => {
        setUploading(false);
        setUploadProgress(0);
        await uploadNotificationService.showUploadError('Network or server error', fileName);
        Alert.alert('Error', 'Failed to create post. Network or server error.');
      };
      
      xhr.send(formData);
    } catch (error: any) {
      setUploading(false);
      setUploadProgress(0);
      await uploadNotificationService.showUploadError(error.message || 'Failed to create post', 'video.mp4');
      Alert.alert('Error', error.message || 'Failed to create post. Please try again.');
    }
  };

  const currentVideoUri = editedVideoUri || recordedVideoUri;
  const currentMediaUri = currentVideoUri || capturedImageUri;

  // Handle video playback
  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar style="light" backgroundColor="#000000" />

      {/* Camera Modal */}
      {showCamera && (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraFacing}
            mode={cameraMode}
          />
          {/* Overlay with absolute positioning */}
          <View style={styles.cameraOverlay}>
              {/* Top bar with cancel, timer, and flip */}
              <View style={styles.cameraTopBar}>
                <TouchableOpacity
                  style={styles.cameraCancelButton}
                  onPress={cancelCamera}
                  accessibilityLabel="Cancel recording"
                  accessibilityRole="button"
                >
                  <MaterialIcons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                
                {isRecording ? (
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingTimer}>
                      {formatDuration(recordingDuration)} / 2:30
                    </Text>
                  </View>
                ) : (
                  <View style={styles.cameraHint}>
                    <Text style={styles.cameraHintText}>
                      {cameraMode === 'video' ? 'Max 2:30' : 'Picture Mode'}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {/* Mode Toggle */}
                  <TouchableOpacity
                    style={styles.cameraModeButton}
                    onPress={() => setCameraMode(cameraMode === 'video' ? 'picture' : 'video')}
                    disabled={isRecording}
                    accessibilityLabel={`Switch to ${cameraMode === 'video' ? 'picture' : 'video'} mode`}
                    accessibilityRole="button"
                  >
                    <MaterialIcons 
                      name={cameraMode === 'video' ? 'photo-camera' : 'videocam'} 
                      size={24} 
                      color={isRecording ? 'rgba(255,255,255,0.3)' : '#fff'} 
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cameraFlipButton}
                    onPress={handleFlipCamera}
                    disabled={isRecording}
                    accessibilityLabel="Flip camera"
                    accessibilityRole="button"
                  >
                    <MaterialIcons 
                      name="flip-camera-ios" 
                      size={28} 
                      color={isRecording ? 'rgba(255,255,255,0.3)' : '#fff'} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom controls */}
              <View style={styles.cameraBottomBar}>
                <View style={styles.cameraControlsRow}>
                  {/* Placeholder for symmetry */}
                  <View style={styles.cameraControlPlaceholder} />
                  
                  {/* Record/Stop/Capture Button */}
                  {cameraMode === 'video' ? (
                    !isRecording ? (
                      <TouchableOpacity
                        style={styles.recordButtonLarge}
                        onPress={startRecording}
                        accessibilityLabel="Start recording"
                        accessibilityRole="button"
                      >
                        <View style={styles.recordButtonInner} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.stopButtonLarge}
                        onPress={stopRecording}
                        accessibilityLabel="Stop recording"
                        accessibilityRole="button"
                      >
                        <View style={styles.stopButtonInner} />
                      </TouchableOpacity>
                    )
                  ) : (
                    <TouchableOpacity
                      style={styles.captureButtonLarge}
                      onPress={takePicture}
                      accessibilityLabel="Take picture"
                      accessibilityRole="button"
                    >
                      <View style={styles.captureButtonInner} />
                    </TouchableOpacity>
                  )}
                  
                  {/* Placeholder for symmetry */}
                  <View style={styles.cameraControlPlaceholder} />
                </View>
                
                <Text style={styles.cameraInstructionText}>
                  {cameraMode === 'video' 
                    ? (isRecording ? 'Tap to stop recording' : 'Tap to start recording')
                    : 'Tap to capture photo'}
                </Text>
              </View>
            </View>
        </View>
      )}


      {/* STAGE 1: FULL STUDIO (CAMERA) – NO FORMS */}
      {!currentVideoUri && !capturedImageUri && (
        <View style={[styles.studioContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.studioHeader}>
            <Text style={[styles.studioTitle, { color: C.text }]}>Create Post Studio</Text>
            <Text style={[styles.studioSubtitle, { color: C.textSecondary }]}>
              We use an in-app camera studio. Record a video up to 2 min 30 sec. You&apos;ll add caption and categories after you confirm.
            </Text>
          </View>

          <View style={styles.studioBody}>
            <MaterialIcons name="videocam" size={72} color={C.primary} />
            <Text style={[styles.studioHint, { color: C.textSecondary }]}>
              The camera studio should open automatically. If it does not, tap the button below.
            </Text>

            <TouchableOpacity
              style={[
                styles.recordButton,
                { backgroundColor: C.primary, marginTop: 24 },
                (recording || editing) && styles.createButtonDisabled,
              ]}
              onPress={handleRecordVideo}
              disabled={recording || editing}
            >
              {recording ? (
                <ActivityIndicator color={C.buttonText} />
              ) : (
                <>
                  <MaterialIcons name="videocam" size={24} color={C.buttonText} />
                  <Text style={[styles.recordButtonText, { color: C.buttonText }]}>
                    Open Camera Studio
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.studioWarning, { color: C.warning }]}>
              Make sure your content is 100% authentic. No AI, deepfakes, or manipulated media.
            </Text>
          </View>
        </View>
      )}

      {/* STAGE 2: DETAILS FORM (AFTER MEDIA CONFIRMED) */}
      {currentMediaUri && (
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            style={[styles.scrollView, { backgroundColor: C.background }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Media Preview Section */}
            <View style={[styles.videoPreviewSection, { paddingTop: insets.top + 8 }]}>
              <View style={styles.videoPreviewContainer}>
                {currentVideoUri ? (
                  <>
                    <Video
                      ref={videoRef}
                      source={{ uri: currentVideoUri }}
                      style={styles.videoPlayer}
                      resizeMode={ResizeMode.COVER}
                      isLooping
                      shouldPlay={false}
                      onPlaybackStatusUpdate={(status) => {
                        if (status.isLoaded) {
                          setIsVideoPlaying(status.isPlaying);
                        }
                      }}
                    />
                    
                    {/* Play/Pause Overlay */}
                    <TouchableOpacity 
                      style={styles.videoPlayOverlay}
                      onPress={handlePlayPause}
                      activeOpacity={0.8}
                      accessibilityLabel={isVideoPlaying ? 'Pause video' : 'Play video'}
                      accessibilityRole="button"
                    >
                      {!isVideoPlaying && (
                        <View style={styles.playButtonCircle}>
                          <MaterialIcons name="play-arrow" size={48} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <Image
                    source={{ uri: capturedImageUri || '' }}
                    style={styles.videoPlayer}
                    resizeMode="cover"
                  />
                )}

                {/* Media Controls */}
                <View style={styles.videoControlsBar}>
                  <TouchableOpacity
                    style={styles.videoControlButton}
                    onPress={() => {
                      if (currentVideoUri) {
                        handleRecordVideo();
                      } else {
                        setShowCamera(true);
                        setCameraMode('picture');
                      }
                    }}
                    disabled={uploading}
                    accessibilityLabel={currentVideoUri ? "Re-record video" : "Retake photo"}
                    accessibilityRole="button"
                  >
                    <MaterialIcons name={currentVideoUri ? "videocam" : "photo-camera"} size={20} color="#fff" />
                    <Text style={styles.videoControlText}>{currentVideoUri ? "Re-record" : "Retake"}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.videoControlButton, styles.discardButton]}
                    onPress={() => {
                      setRecordedVideoUri(null);
                      setCapturedImageUri(null);
                      setEditedVideoUri(null);
                      setThumbnailUri(null);
                      setCaption('');
                      setSelectedGroup('');
                      setSelectedCategoryId('');
                      setIsVideoPlaying(false);
                    }}
                    disabled={uploading}
                    accessibilityLabel="Discard media"
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                    <Text style={[styles.videoControlText, { color: '#ef4444' }]}>Discard</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {errors.media && <Text style={[styles.errorText, { color: C.error, textAlign: 'center', marginTop: 8 }]}>{errors.media}</Text>}
            </View>


            {/* Form Content */}
            <View style={styles.formContainer}>
              {/* Caption Input */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: C.text }]}>Caption ✨</Text>
                  <Text style={[styles.labelHint, { color: C.textSecondary }]}>
                    Add emojis and hashtags!
                  </Text>
                </View>
                <View style={[
                  styles.captionInputContainer,
                  { 
                    backgroundColor: C.inputBg, 
                    borderColor: errors.caption ? C.error : C.inputBorder 
                  }
                ]}>
                  <TextInput
                    style={[styles.captionInput, { color: C.inputText }]}
                    placeholder="Share your story... 🎬 What makes this special? Add #hashtags"
                    placeholderTextColor={C.placeholder}
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                    scrollEnabled
                    textAlignVertical="top"
                    autoCapitalize="sentences"
                    autoCorrect
                    returnKeyType="default"
                    blurOnSubmit={false}
                  />
                  {caption.length > 0 && (
                    <View style={styles.captionFooter}>
                      <Text style={[styles.charCount, { color: C.textSecondary }]}>
                        {caption.length} characters
                      </Text>
                    </View>
                  )}
                </View>
                {errors.caption && (
                  <Text style={[styles.errorText, { color: C.error }]}>{errors.caption}</Text>
                )}
              </View>

              {/* Category Selection */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: C.text }]}>Category 🏷️</Text>
                  {selectedGroup && selectedCategoryId && (
                    <View style={[styles.selectedBadge, { backgroundColor: C.primary + '20' }]}>
                      <Text style={[styles.selectedBadgeText, { color: C.primary }]}>
                        {getSelectedCategoryName()}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Category Groups */}
                <Text style={[styles.subLabel, { color: C.textSecondary }]}>Select a group</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pillRow}
                >
                  {loadingCategories ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <View
                        key={`cat-skel-${i}`}
                        style={[styles.pillSkeleton, { backgroundColor: C.inputBg, borderColor: C.inputBorder }]}
                      />
                    ))
                  ) : (
                    (mainCategories.length ? mainCategories.map((c) => c.name) : MAIN_CATEGORY_GROUPS).map(
                      (group) => (
                        <TouchableOpacity
                          key={group}
                          style={[
                            styles.categoryPill,
                            { borderColor: C.border },
                            selectedGroup === group && {
                              backgroundColor: C.primary,
                              borderColor: C.primary,
                            },
                          ]}
                          onPress={() => {
                            setSelectedGroup(group);
                            setSelectedCategoryId('');
                          }}
                          accessibilityLabel={`Select ${group} category`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: selectedGroup === group }}
                        >
                          <Text
                            style={[
                              styles.categoryPillText,
                              { color: selectedGroup === group ? '#fff' : C.text },
                            ]}
                          >
                            {group}
                          </Text>
                        </TouchableOpacity>
                      )
                    )
                  )}
                </ScrollView>
                {errors.group && (
                  <Text style={[styles.errorText, { color: C.error }]}>{errors.group}</Text>
                )}

                {/* Subcategories */}
                {selectedGroup && (
                  <View style={styles.subcategorySection}>
                    <Text style={[styles.subLabel, { color: C.textSecondary }]}>
                      Select a specific category
                    </Text>
                    <View style={styles.subcategoryGrid}>
                      {loadingSubcategories ? (
                        [1, 2, 3, 4, 5, 6].map((i) => (
                          <View
                            key={`subcat-skel-${i}`}
                            style={[styles.subcategoryPillSkeleton, { backgroundColor: C.inputBg }]}
                          />
                        ))
                      ) : (
                        (subcategories.length ? subcategories : getCategoriesForGroup()).map(
                          (cat: { id: number; name: string }) => (
                            <TouchableOpacity
                              key={cat.id}
                              style={[
                                styles.subcategoryPill,
                                { backgroundColor: C.card, borderColor: C.border },
                                selectedCategoryId === String(cat.id) && {
                                  backgroundColor: C.primary + '20',
                                  borderColor: C.primary,
                                },
                              ]}
                              onPress={() => setSelectedCategoryId(String(cat.id))}
                              accessibilityLabel={`Select ${cat.name}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected: selectedCategoryId === String(cat.id) }}
                            >
                              {selectedCategoryId === String(cat.id) && (
                                <MaterialIcons name="check-circle" size={16} color={C.primary} style={{ marginRight: 4 }} />
                              )}
                              <Text
                                style={[
                                  styles.subcategoryPillText,
                                  { color: selectedCategoryId === String(cat.id) ? C.primary : C.text },
                                ]}
                              >
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          )
                        )
                      )}
                    </View>
                    {errors.category && (
                      <Text style={[styles.errorText, { color: C.error }]}>{errors.category}</Text>
                    )}
                  </View>
                )}
              </View>

              {/* Content Warning */}
              <TouchableOpacity
                style={[styles.warningBanner, { backgroundColor: C.warningBg, borderColor: C.warningBorder }]}
                onPress={() => setAccordionOpen(!accordionOpen)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Content authenticity guidelines"
              >
                <View style={styles.warningBannerHeader}>
                  <MaterialIcons name="verified" size={20} color={C.warning} />
                  <Text style={[styles.warningBannerTitle, { color: C.warning }]}>
                    Authenticity Required
                  </Text>
                  <MaterialIcons 
                    name={accordionOpen ? 'expand-less' : 'expand-more'} 
                    size={20} 
                    color={C.warning} 
                  />
                </View>
                {accordionOpen && (
                  <Text style={[styles.warningBannerText, { color: C.text }]}>
                    ✓ 100% authentic content only{'\n'}
                    ✗ No AI, deepfakes, or manipulated media{'\n'}
                    ✗ No voice changers or filters that alter quality
                  </Text>
                )}
              </TouchableOpacity>

              {/* Upload Progress */}
              {uploading && (
                <View style={[styles.uploadProgressCard, { backgroundColor: C.card, borderColor: C.primary }]}>
                  <View style={styles.uploadProgressHeader}>
                    <ActivityIndicator size="small" color={C.primary} />
                    <Text style={[styles.uploadProgressTitle, { color: C.text }]}>
                      Uploading your talent...
                    </Text>
                  </View>
                  <View style={styles.uploadProgressBarContainer}>
                    <View
                      style={[
                        styles.uploadProgressBar,
                        { width: `${Math.min(Math.max(uploadProgress, 0), 100)}%`, backgroundColor: C.primary },
                      ]}
                    />
                  </View>
                  <Text style={[styles.uploadProgressPercent, { color: C.primary }]}>
                    {Math.min(Math.round(uploadProgress), 100)}%
                  </Text>
                </View>
              )}

              {/* Action Buttons - Horizontal */}
              <View style={styles.quickActionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.quickActionButton, styles.quickPublishButton, (uploading || !caption.trim() || !selectedCategoryId) && styles.quickActionButtonDisabled]}
                  onPress={() => {
                    if (caption.trim() && selectedCategoryId) {
                      handleCreatePost('pending');
                    } else {
                      Alert.alert(
                        'Complete Details',
                        'Please add a caption and select a category to publish.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                  disabled={uploading || !currentMediaUri || !caption.trim() || !selectedCategoryId}
                  accessibilityLabel="Publish post"
                  accessibilityRole="button"
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="rocket-launch" size={20} color="#fff" />
                      <Text style={styles.quickActionButtonText}>Publish</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionButton, styles.quickDraftButton, (uploading || !caption.trim() || !selectedCategoryId) && styles.quickActionButtonDisabled]}
                  onPress={async () => {
                    if (caption.trim() && selectedCategoryId) {
                      await handleCreatePost('draft');
                    } else {
                      Alert.alert(
                        'Complete Details',
                        'Please add a caption and select a category to save as draft.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                  disabled={uploading || !currentMediaUri || !caption.trim() || !selectedCategoryId}
                  accessibilityLabel="Save as draft"
                  accessibilityRole="button"
                >
                  <MaterialIcons name="save" size={20} color="#fff" />
                  <Text style={styles.quickActionButtonText}>Save Draft</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionButton, styles.quickDiscardButton]}
                  onPress={() => {
                    Alert.alert(
                      'Discard Post?',
                      'Are you sure you want to discard this post? This action cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Discard',
                          style: 'destructive',
                          onPress: () => {
                            setRecordedVideoUri(null);
                            setCapturedImageUri(null);
                            setEditedVideoUri(null);
                            setThumbnailUri(null);
                            setCaption('');
                            setSelectedGroup('');
                            setSelectedCategoryId('');
                            setIsVideoPlaying(false);
                          }
                        }
                      ]
                    );
                  }}
                  disabled={uploading}
                  accessibilityLabel="Discard post"
                  accessibilityRole="button"
                >
                  <MaterialIcons name="delete-outline" size={20} color="#fff" />
                  <Text style={styles.quickActionButtonText}>Discard</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom spacing */}
              <View style={{ height: insets.bottom + 20 }} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  studioContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  studioHeader: {
    marginBottom: 24,
  },
  studioTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  studioSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  studioBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studioHint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  studioWarning: {
    fontSize: 12,
    marginTop: 24,
    textAlign: 'center',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  warningBox: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  warningList: {
    fontSize: 13,
    lineHeight: 18,
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  textarea: {
    height: 120,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    fontSize: 16,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  pillRow: {
    paddingHorizontal: 4,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  pillSkeleton: {
    height: 38,
    width: 110,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mediaCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  mediaUploadArea: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  mediaUploadText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  mediaUploadSubtext: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 12,
    minWidth: 200,
    justifyContent: 'center',
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  mediaPreview: {
    width: '100%',
    alignItems: 'center',
  },
  previewContainer: {
    position: 'relative',
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaFileName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  videoActionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rerecordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  rerecordButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  uploadProgressContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  uploadProgressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  uploadProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  uploadProgressText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  cameraContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cameraCancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingTimer: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraBottomBar: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cameraControls: {
    alignItems: 'center',
  },
  recordButtonLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
  },
  stopButtonLarge: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  // Camera improvements
  cameraFlipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraHint: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cameraHintText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  cameraControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  cameraControlPlaceholder: {
    width: 50,
    height: 50,
  },
  cameraInstructionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  // Video Preview
  videoPreviewSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  videoPreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: '#000',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoControlsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  videoControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  discardButton: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  videoControlText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  // Caption Input
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelHint: {
    fontSize: 12,
  },
  captionInputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  captionInput: {
    minHeight: 120,
    maxHeight: 200,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  captionFooter: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'flex-end',
  },
  charCount: {
    fontSize: 12,
  },
  // Category Selection
  subLabel: {
    fontSize: 13,
    marginBottom: 10,
    marginTop: 4,
  },
  selectedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryPill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    marginRight: 10,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subcategorySection: {
    marginTop: 16,
  },
  subcategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  subcategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  subcategoryPillSkeleton: {
    width: 100,
    height: 40,
    borderRadius: 12,
  },
  subcategoryPillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Warning Banner
  warningBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  warningBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningBannerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  warningBannerText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  // Upload Progress
  uploadProgressCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 20,
  },
  uploadProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  uploadProgressTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  uploadProgressPercent: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  // Publish Button
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
  },
  publishButtonDisabled: {
    opacity: 0.5,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  // Post Action Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  postActionModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  postActionModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  postActionModalSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
    textAlign: 'center',
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  postActionPublishButton: {
    backgroundColor: '#60a5fa',
  },
  postActionDraftButton: {
    backgroundColor: '#8b5cf6',
  },
  postActionDiscardButton: {
    backgroundColor: '#ef4444',
  },
  postActionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  postActionButtonSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  postActionCancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  postActionCancelText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
  // Capture Button
  captureButtonLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  // Camera Mode Button
  cameraModeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Draft Save Button
  draftSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  draftSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Quick Action Buttons (Horizontal)
  quickActionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  quickPublishButton: {
    backgroundColor: '#60a5fa',
  },
  quickDraftButton: {
    backgroundColor: '#8b5cf6',
  },
  quickDiscardButton: {
    backgroundColor: '#ef4444',
  },
  quickActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionButtonDisabled: {
    opacity: 0.5,
  },
});
