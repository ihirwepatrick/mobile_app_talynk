import React, { useState, useEffect } from 'react';
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
import { API_BASE_URL, IMGLY_LICENSE_KEY } from '@/lib/config';
import IMGLYCamera, { CameraSettings } from '@imgly/camera-react-native';
import IMGLYEditor, { EditorPreset, EditorSettingsModel, SourceType } from '@imgly/editor-react-native';
import * as FileSystem from 'expo-file-system';
import { generateThumbnail } from '@/lib/utils/thumbnail';

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
  const [editedVideoUri, setEditedVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hasOpenedCameraOnMount, setHasOpenedCameraOnMount] = useState(false);
  const C = COLORS.dark;
  const [mainCategories, setMainCategories] = useState<{ id: number, name: string, children?: { id: number, name: string }[] }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: number, name: string }[]>([]);
  const insets = useSafeAreaInsets();
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState<boolean>(false);

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
  }, []);

  useEffect(() => {
    const loadSubs = async () => {
      if (!selectedGroup) { setSubcategories([]); return; }
      setLoadingSubcategories(true);
      const parent = mainCategories.find(c => c.name === selectedGroup);
      if (!parent) { setSubcategories([]); return; }
      setSubcategories(parent.children || []);
      setLoadingSubcategories(false);
    };
    loadSubs();
  }, [selectedGroup, mainCategories]);

  // --- CAMERA RECORDING ---
  const handleRecordVideo = async () => {
    try {
      setRecording(true);
      const cameraSettings: CameraSettings = {
        // IMGLY SDK expects string | undefined, so map null to undefined
        license: IMGLY_LICENSE_KEY || undefined,
        userId: user?.id?.toString() || 'anonymous',
      };

      const result = await IMGLYCamera.openCamera(cameraSettings);

      if (result === null) {
        // User cancelled
        setRecording(false);
        return;
      }

      // Handle camera result
      if (result.recordings && result.recordings.length > 0) {
        const firstRecording: any = result.recordings[0];

        // Try to enforce a maximum duration of 2:30 (150 seconds) if duration info is available
        const durationMs: number | undefined =
          firstRecording?.duration ??
          firstRecording?.durationMs ??
          firstRecording?.durationInMs ??
          firstRecording?.durationInMilliseconds;

        if (typeof durationMs === 'number' && durationMs > 150000) {
          Alert.alert(
            'Video Too Long',
            'Your recording is longer than 2 minutes and 30 seconds. Please record a shorter video.'
          );
          setRecordedVideoUri(null);
          setThumbnailUri(null);
          return;
        }

        if (firstRecording.videos && firstRecording.videos.length > 0) {
          const videoUri = firstRecording.videos[0].uri;
          setRecordedVideoUri(videoUri);

          // Generate thumbnail
          const thumb = await generateThumbnail(videoUri);
          setThumbnailUri(thumb);

          // Automatically open editor
          handleEditVideo(videoUri);
        }
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', error.message || 'Failed to record video. Please try again.');
    } finally {
      setRecording(false);
    }
  };

  // --- VIDEO EDITING ---
  const handleEditVideo = async (videoUri?: string) => {
    const videoToEdit = videoUri || recordedVideoUri;
    if (!videoToEdit) {
      Alert.alert('Error', 'No video to edit');
      return;
    }

    try {
      setEditing(true);
      const editorSettings = new EditorSettingsModel({
        // IMGLY SDK expects string | undefined, so map null to undefined
        license: IMGLY_LICENSE_KEY || undefined,
        userId: user?.id?.toString() || 'anonymous',
      });

      const result = await IMGLYEditor?.openEditor(
        editorSettings,
        {
          source: videoToEdit,
          type: SourceType.VIDEO,
        },
        EditorPreset.VIDEO
      );

      const editorResult: any = result;

      if (editorResult && editorResult.video) {
        // Video was edited and exported
        setEditedVideoUri(editorResult.video);
        setRecordedVideoUri(editorResult.video);
        
        // Regenerate thumbnail for edited video
        const thumb = await generateThumbnail(editorResult.video);
        setThumbnailUri(thumb);
      }
    } catch (error: any) {
      console.error('Editor error:', error);
      Alert.alert('Error', error.message || 'Failed to edit video. Please try again.');
    } finally {
      setEditing(false);
    }
  };

  // --- VALIDATION ---
  const validate = async () => {
    const newErrors: { [k: string]: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    else if (title.length < 5) newErrors.title = 'Title must be at least 5 characters';
    if (!caption.trim()) newErrors.caption = 'Caption is required';
    else if (caption.length < 10) newErrors.caption = 'Caption must be at least 10 characters';
    if (!selectedGroup) newErrors.group = 'Category group is required';
    if (!selectedCategoryId) newErrors.category = 'Specific category is required';
    if (!recordedVideoUri && !editedVideoUri) {
      newErrors.media = 'Please record a video';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- SUBMIT ---
  const handleCreatePost = async () => {
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
    if (!videoUri) {
      Alert.alert('Error', 'No video to upload');
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
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) {
        throw new Error('Video file not found');
      }

      const fileName = videoUri.split('/').pop() || 'video.mp4';
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('caption', caption);
      
      const categoryId = getSelectedCategoryId();
      const categoryName = getSelectedCategoryName();
      
      formData.append('post_category', categoryName);
      formData.append('category_id', categoryId);
      
      formData.append('file', {
        uri: videoUri,
        name: fileName,
        type: 'video/mp4',
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
              
              Alert.alert(
                'Success', 
                'Post created successfully! It will be reviewed and appear in your profile.', 
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
              setTitle('');
              setCaption('');
              setSelectedGroup('');
              setSelectedCategoryId('');
              setRecordedVideoUri(null);
              setEditedVideoUri(null);
              setThumbnailUri(null);
            } else {
              await uploadNotificationService.showUploadError(response.message || 'Failed to create post', fileName);
              Alert.alert('Error', response.message || 'Failed to create post');
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

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar style="light" backgroundColor="#000000" />

      {/* STAGE 1: FULL STUDIO (CAMERA) – NO FORMS */}
      {!currentVideoUri && (
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

      {/* STAGE 2: DETAILS FORM (AFTER VIDEO CONFIRMED) */}
      {currentVideoUri && (
        <ScrollView
          style={[styles.scrollView, { backgroundColor: C.background }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Content Authenticity Warning Accordion */}
          <View
            style={[
              styles.warningBox,
              { backgroundColor: C.card, borderColor: C.warning, marginTop: insets.top + 8 },
            ]}
          >
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setAccordionOpen(!accordionOpen)}
              activeOpacity={0.7}
            >
              <View style={styles.warningHeader}>
                <MaterialIcons name="warning" size={24} color={C.warning} />
                <Text style={[styles.warningTitle, { color: C.warning }]}>Content Authenticity</Text>
              </View>
              <MaterialIcons
                name={accordionOpen ? 'expand-less' : 'expand-more'}
                size={24}
                color={C.warning}
              />
            </TouchableOpacity>

            {accordionOpen && (
              <View style={styles.accordionContent}>
                <Text style={[styles.warningText, { color: C.text }]}>
                  All content must be 100% authentic and showcase natural talent only.
                </Text>
                <Text style={[styles.warningList, { color: C.textSecondary }]}>
                  • No AI-enhanced or AI-generated content{'\n'}
                  • No deepfake videos or manipulated media{'\n'}
                  • No voice changers or audio manipulation{'\n'}
                  • No filters that alter performance quality
                </Text>
              </View>
            )}
          </View>

          {/* Form Content – ONLY AFTER VIDEO IS CONFIRMED */}
          <View style={styles.formContainer}>
            {/* Video Summary / Controls */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: C.text }]}>Your Video</Text>
              <View
                style={[
                  styles.mediaCard,
                  {
                    backgroundColor: C.card,
                    borderColor: errors.media ? C.error : C.border,
                  },
                ]}
              >
                <View style={styles.mediaPreview}>
                  <View style={styles.previewContainer}>
                    {thumbnailUri ? (
                      <View style={styles.videoThumbnail}>
                        <MaterialIcons name="play-circle-filled" size={64} color="#fff" />
                      </View>
                    ) : (
                      <View style={[styles.videoThumbnail, { backgroundColor: C.inputBg }]}>
                        <ActivityIndicator size="large" color={C.primary} />
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.removeButton, { backgroundColor: C.error }]}
                      onPress={() => {
                        setRecordedVideoUri(null);
                        setEditedVideoUri(null);
                        setThumbnailUri(null);
                        setTitle('');
                        setCaption('');
                        setSelectedGroup('');
                        setSelectedCategoryId('');
                      }}
                    >
                      <MaterialIcons name="close" size={20} color={C.buttonText} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.mediaFileName, { color: C.textSecondary }]}>
                    Video ready – you can still edit or re-record if needed.
                  </Text>
                  <View style={styles.videoActionButtons}>
                    <TouchableOpacity
                      style={[styles.editButton, { backgroundColor: C.primary }]}
                      onPress={() => handleEditVideo()}
                      disabled={editing || uploading}
                    >
                      {editing ? (
                        <ActivityIndicator color={C.buttonText} />
                      ) : (
                        <>
                          <MaterialIcons name="edit" size={20} color={C.buttonText} />
                          <Text style={[styles.editButtonText, { color: C.buttonText }]}>
                            Open Studio Again
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rerecordButton, { borderColor: C.border }]}
                      onPress={handleRecordVideo}
                      disabled={recording || editing || uploading}
                    >
                      <MaterialIcons name="refresh" size={20} color={C.text} />
                      <Text style={[styles.rerecordButtonText, { color: C.text }]}>
                        Re-record
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              {errors.media && <Text style={[styles.errorText, { color: C.error }]}>{errors.media}</Text>}
            </View>

            {/* Caption */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: C.text }]}>Caption</Text>
              <TextInput
                style={[
                  styles.textarea,
                  {
                    color: C.inputText,
                    backgroundColor: C.inputBg,
                    borderColor: errors.caption ? C.error : C.inputBorder,
                  },
                ]}
                placeholder="Describe your post and what makes it special..."
                placeholderTextColor={C.textSecondary}
                value={caption}
                onChangeText={setCaption}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {errors.caption && (
                <Text style={[styles.errorText, { color: C.error }]}>{errors.caption}</Text>
              )}
            </View>

            {/* Category Group */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: C.text }]}>Category Group</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillRow}
              >
                {loadingCategories ? (
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <View
                      key={`cat-skel-${i}`}
                      style={[
                        styles.pillSkeleton,
                        { backgroundColor: C.inputBg, borderColor: C.inputBorder },
                      ]}
                    />
                  ))
                ) : (
                  (mainCategories.length ? mainCategories.map((c) => c.name) : MAIN_CATEGORY_GROUPS).map(
                    (group) => (
                      <TouchableOpacity
                        key={group}
                        style={[
                          styles.pill,
                          selectedGroup === group && {
                            backgroundColor: C.primary,
                            borderColor: C.primary,
                          },
                        ]}
                        onPress={() => {
                          setSelectedGroup(group);
                          setSelectedCategoryId('');
                        }}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            { color: selectedGroup === group ? C.buttonText : C.text },
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
            </View>

            {/* Specific Category */}
            {selectedGroup && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: C.text }]}>Specific Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pillRow}
                >
                  {loadingSubcategories ? (
                    [1, 2, 3, 4].map((i) => (
                      <View
                        key={`subcat-skel-${i}`}
                        style={[
                          styles.pillSkeleton,
                          { backgroundColor: C.inputBg, borderColor: C.inputBorder },
                        ]}
                      />
                    ))
                  ) : (
                    (subcategories.length ? subcategories : getCategoriesForGroup()).map(
                      (cat: { id: number; name: string }) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.pill,
                            selectedCategoryId === String(cat.id) && {
                              backgroundColor: C.primary,
                              borderColor: C.primary,
                            },
                          ]}
                          onPress={() => setSelectedCategoryId(String(cat.id))}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              {
                                color:
                                  selectedCategoryId === String(cat.id) ? C.buttonText : C.text,
                              },
                            ]}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      )
                    )
                  )}
                </ScrollView>
                {errors.category && (
                  <Text style={[styles.errorText, { color: C.error }]}>{errors.category}</Text>
                )}
              </View>
            )}

            {/* Upload Progress Indicator */}
            {uploading && (
              <View
                style={[
                  styles.uploadProgressContainer,
                  { backgroundColor: C.card, borderColor: C.border },
                ]}
              >
                <View style={styles.uploadProgressBarContainer}>
                  <View
                    style={[
                      styles.uploadProgressBar,
                      {
                        width: `${Math.min(Math.max(uploadProgress, 0), 100)}%`,
                        backgroundColor: C.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.uploadProgressText, { color: C.text }]}>
                  Uploading... {Math.min(Math.round(uploadProgress), 100)}%
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: C.primary },
                uploading && styles.createButtonDisabled,
              ]}
              onPress={handleCreatePost}
              disabled={uploading || !currentVideoUri}
            >
              {uploading ? (
                <ActivityIndicator color={C.buttonText} />
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color={C.buttonText} />
                  <Text style={[styles.createButtonText, { color: C.buttonText }]}>
                    Publish Post
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
});
