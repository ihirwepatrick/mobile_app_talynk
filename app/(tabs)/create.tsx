import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { postsApi } from '@/lib/api';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { uploadNotificationService } from '@/lib/notification-service';

const { width: screenWidth } = Dimensions.get('window');

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
    background: '#18181b',
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
  },
  light: {
    background: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textSecondary: '#64748b',
    primary: '#3b82f6',
    inputBg: '#ffffff',
    inputBorder: '#e2e8f0',
    inputText: '#1e293b',
    buttonBg: '#3b82f6',
    buttonText: '#ffffff',
    spinner: '#3b82f6',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
  },
};

export default function CreatePostScreen() {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video'; name: string; mimeType?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [accordionOpen, setAccordionOpen] = useState(false);
  const colorScheme = useColorScheme() || 'dark';
  const C = COLORS[colorScheme];

  // Animated values for liquid progress
  const liquidProgress = new Animated.Value(0);
  const liquidOpacity = new Animated.Value(0);

  // --- CATEGORY HELPERS ---
  const getCategoriesForGroup = () => {
    if (!selectedGroup) return [];
    return CATEGORIES_STRUCTURE[selectedGroup as keyof typeof CATEGORIES_STRUCTURE] || [];
  };
  
  const getSelectedCategoryName = () => {
    if (!selectedCategoryId) return '';
    const allCats = Object.values(CATEGORIES_STRUCTURE).flat();
    const found = allCats.find((cat: { id: number; name: string }) => String(cat.id) === selectedCategoryId);
    return found ? found.name : '';
  };

  // --- LIQUID PROGRESS ANIMATION ---
  useEffect(() => {
    if (uploading) {
      Animated.timing(liquidOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(liquidOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [uploading]);

  useEffect(() => {
    if (uploading) {
      Animated.timing(liquidProgress, {
        toValue: Math.min(uploadProgress, 100),
        duration: 500,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(liquidProgress, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [uploadProgress, uploading]);

  // --- MEDIA PICKERS ---
  const pickMedia = async (mediaType: 'image' | 'video') => {
    let permissionResult;
    if (mediaType === 'image') {
      permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    } else {
      permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
    if (permissionResult.status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant media permissions.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
      aspect: mediaType === 'video' ? [9, 16] : [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || asset.uri.split('/').pop() || (mediaType === 'image' ? 'image.jpg' : 'video.mp4');
      
      let mimeType = asset.mimeType;
      if (!mimeType) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (mediaType === 'image') {
          mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        } else if (mediaType === 'video') {
          if (ext === 'mov') mimeType = 'video/quicktime';
          else if (ext === 'webm') mimeType = 'video/webm';
          else mimeType = 'video/mp4';
        }
      }
      
      let fileSize = 0;
      try {
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (fileInfo.exists && typeof fileInfo.size === 'number') {
          fileSize = fileInfo.size;
        }
      } catch (e) {
        fileSize = 0;
      }
      
      if (fileSize > 50 * 1024 * 1024) {
        Alert.alert('File too large', 'Please select a file smaller than 50MB.');
        return;
      }
      setSelectedMedia({ uri: asset.uri, type: mediaType, name: fileName, mimeType });
    }
  };

  const removeMedia = () => setSelectedMedia(null);

  // --- VALIDATION ---
  const validate = () => {
    const newErrors: { [k: string]: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    else if (title.length < 5) newErrors.title = 'Title must be at least 5 characters';
    if (!caption.trim()) newErrors.caption = 'Caption is required';
    else if (caption.length < 10) newErrors.caption = 'Caption must be at least 10 characters';
    if (!selectedGroup) newErrors.group = 'Category group is required';
    if (!selectedCategoryId) newErrors.category = 'Specific category is required';
    if (!selectedMedia) newErrors.media = 'Please select an image or video';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- SUBMIT ---
  const handleCreatePost = async () => {
    if (!validate()) return;
    
    // Request notification permissions
    const hasPermission = await uploadNotificationService.requestPermissions();
    if (!hasPermission) {
      console.log('Notification permissions not granted');
    }
    
    setUploading(true);
    setProgress(0);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('caption', caption);
      formData.append('post_category', getSelectedCategoryName());
      
      if (selectedMedia) {
        formData.append('file', {
          uri: selectedMedia.uri,
          name: selectedMedia.name,
          type: selectedMedia.mimeType || (selectedMedia.type === 'image' ? 'image/jpeg' : 'video/mp4'),
        } as any);
      }
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${process.env.EXPO_PUBLIC_API_URL || 'https://talynkbackend-8fkrb.sevalla.app'}/api/posts`);
      xhr.setRequestHeader('Accept', 'application/json');
      
      const token = await AsyncStorage.getItem('talynk_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      let lastLoggedPercent = -10;
      xhr.upload.onprogress = async (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
          setProgress(percent);
          
          // Update notification with progress
          await uploadNotificationService.showUploadProgress(percent, selectedMedia?.name);
          
          if (percent - lastLoggedPercent >= 10 || percent === 100) {
            console.log(`Upload progress: ${percent}%`);
            lastLoggedPercent = percent;
          }
        }
      };
      
      xhr.onload = async () => {
        setUploading(false);
        setUploadProgress(0);
        setProgress(0);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
      if (response.status === 'success') {
              // Show success notification
              await uploadNotificationService.showUploadComplete(selectedMedia?.name);
              
              Alert.alert(
                'Success', 
                'Post created successfully! It will be reviewed and appear in your profile.', 
                [
                  { 
                    text: 'View Profile', 
                    onPress: () => {
                      // Navigate to profile with pending tab selected
                      router.replace('/(tabs)/profile');
                      // You might want to add a way to automatically select the pending tab
                    }
                  }
                ]
              );
      } else {
              await uploadNotificationService.showUploadError(response.message || 'Failed to create post', selectedMedia?.name);
        Alert.alert('Error', response.message || 'Failed to create post');
      }
          } catch (e) {
            await uploadNotificationService.showUploadError('Failed to parse server response', selectedMedia?.name);
            Alert.alert('Error', 'Failed to parse server response.');
          }
        } else {
          await uploadNotificationService.showUploadError(`Server responded with status ${xhr.status}`, selectedMedia?.name);
          Alert.alert('Error', `Failed to create post. Server responded with status ${xhr.status}`);
        }
      };
      
      xhr.onerror = async () => {
        setUploading(false);
        setUploadProgress(0);
        setProgress(0);
        await uploadNotificationService.showUploadError('Network or server error', selectedMedia?.name);
        Alert.alert('Error', 'Failed to create post. Network or server error.');
      };
      
      xhr.send(formData);
    } catch (error: any) {
      setUploading(false);
      setUploadProgress(0);
      setProgress(0);
      await uploadNotificationService.showUploadError(error.message || 'Failed to create post', selectedMedia?.name);
      Alert.alert('Error', error.message || 'Failed to create post. Please try again.');
    }
  };

  // --- LIQUID PROGRESS COMPONENT ---
  const LiquidProgressBar = () => {
    const progressWidth = liquidProgress.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });

    return (
      <Animated.View style={[styles.liquidProgressContainer, { opacity: liquidOpacity }]}>
        <View style={styles.liquidProgressTrack}>
          <Animated.View 
            style={[
              styles.liquidProgressFill,
              { 
                width: progressWidth,
                backgroundColor: C.primary,
              }
            ]} 
          />
          <View style={styles.liquidBubbles}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Animated.View
                key={i}
                style={[
                  styles.liquidBubble,
                  {
                    backgroundColor: C.primary,
                    left: `${i * 20}%`,
                    opacity: liquidProgress.interpolate({
                      inputRange: [i * 20, (i + 1) * 20],
                      outputRange: [0.3, 0.8],
                      extrapolate: 'clamp',
                    }),
                  }
                ]}
              />
            ))}
          </View>
        </View>
        <Text style={[styles.progressText, { color: C.text }]}>
          Uploading... {Math.round(uploadProgress)}%
        </Text>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Upload Progress Bar */}
      {uploading && <LiquidProgressBar />}
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Content Authenticity Warning Accordion */}
        <View style={[styles.warningBox, { backgroundColor: C.card, borderColor: C.warning }]}>
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
              name={accordionOpen ? "expand-less" : "expand-more"} 
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

        {/* Form Content */}
        <View style={styles.formContainer}>
        {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: C.text }]}>Title</Text>
        <TextInput
              style={[
                styles.input, 
                { 
                  color: C.inputText, 
                  backgroundColor: C.inputBg, 
                  borderColor: errors.title ? C.error : C.inputBorder 
                }
              ]}
              placeholder="Give your post a compelling title"
          placeholderTextColor={C.textSecondary}
          value={title}
          onChangeText={setTitle}
        />
            {errors.title && <Text style={[styles.errorText, { color: C.error }]}>{errors.title}</Text>}
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
                  borderColor: errors.caption ? C.error : C.inputBorder 
                }
              ]}
              placeholder="Describe your post and what makes it special..."
          placeholderTextColor={C.textSecondary}
          value={caption}
          onChangeText={setCaption}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
            {errors.caption && <Text style={[styles.errorText, { color: C.error }]}>{errors.caption}</Text>}
          </View>

        {/* Category Group */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: C.text }]}>Category Group</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
          {MAIN_CATEGORY_GROUPS.map(group => (
            <TouchableOpacity
              key={group}
                  style={[
                    styles.pill, 
                    selectedGroup === group && { backgroundColor: C.primary, borderColor: C.primary }
                  ]}
              onPress={() => { setSelectedGroup(group); setSelectedCategoryId(''); }}
            >
                  <Text style={[
                    styles.pillText, 
                    { color: selectedGroup === group ? C.buttonText : C.text }
                  ]}>
                    {group}
                  </Text>
            </TouchableOpacity>
          ))}
            </ScrollView>
            {errors.group && <Text style={[styles.errorText, { color: C.error }]}>{errors.group}</Text>}
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
          {getCategoriesForGroup().map((cat: { id: number; name: string }) => (
            <TouchableOpacity
              key={cat.id}
                    style={[
                      styles.pill, 
                      selectedCategoryId === String(cat.id) && { backgroundColor: C.primary, borderColor: C.primary }
                    ]}
              onPress={() => setSelectedCategoryId(String(cat.id))}
            >
                    <Text style={[
                      styles.pillText, 
                      { color: selectedCategoryId === String(cat.id) ? C.buttonText : C.text }
                    ]}>
                      {cat.name}
                    </Text>
            </TouchableOpacity>
          ))}
              </ScrollView>
              {errors.category && <Text style={[styles.errorText, { color: C.error }]}>{errors.category}</Text>}
        </View>
          )}

        {/* Media Upload */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: C.text }]}>Media Upload</Text>
            <View style={[
              styles.mediaCard, 
              { 
                backgroundColor: C.card,
                borderColor: errors.media ? C.error : C.border 
              }
            ]}>
              {!selectedMedia ? (
                <View style={styles.mediaUploadArea}>
                  <MaterialIcons name="cloud-upload" size={48} color={C.textSecondary} />
                  <Text style={[styles.mediaUploadText, { color: C.textSecondary }]}>
                    Choose your media
                  </Text>
          <View style={styles.mediaButtonsRow}>
                    <TouchableOpacity 
                      style={[styles.mediaButton, { backgroundColor: C.primary }]} 
                      onPress={() => pickMedia('image')}
                    >
                      <MaterialIcons name="photo-camera" size={20} color={C.buttonText} />
                      <Text style={[styles.mediaButtonText, { color: C.buttonText }]}>Image</Text>
            </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.mediaButton, { backgroundColor: C.primary }]} 
                      onPress={() => pickMedia('video')}
                    >
                      <MaterialIcons name="videocam" size={20} color={C.buttonText} />
                      <Text style={[styles.mediaButtonText, { color: C.buttonText }]}>Video</Text>
            </TouchableOpacity>
          </View>
                </View>
              ) : (
                <View style={styles.mediaPreview}>
                  <View style={styles.previewContainer}>
              {selectedMedia.type === 'image' ? (
                <Image source={{ uri: selectedMedia.uri }} style={styles.previewImage} />
              ) : (
                      <View style={styles.videoPreview}>
                        <Video
                          source={{ uri: selectedMedia.uri }}
                          style={styles.previewVideo}
                          resizeMode={ResizeMode.COVER}
                          useNativeControls={false}
                          shouldPlay={false}
                          isLooping={false}
                        />
                        <View style={styles.playIconOverlay}>
                          <MaterialIcons name="play-circle-outline" size={48} color="#fff" />
                        </View>
                      </View>
              )}
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: C.error }]}
                onPress={removeMedia}
              >
                      <MaterialIcons name="close" size={20} color={C.buttonText} />
              </TouchableOpacity>
                  </View>
                  <Text style={[styles.mediaFileName, { color: C.textSecondary }]}>
                    {selectedMedia.name}
                  </Text>
                </View>
              )}
            </View>
            {errors.media && <Text style={[styles.errorText, { color: C.error }]}>{errors.media}</Text>}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.createButton, 
              { backgroundColor: C.primary },
            uploading && styles.createButtonDisabled
          ]}
          onPress={handleCreatePost}
          disabled={uploading}
        >
          {uploading ? (
              <ActivityIndicator color={C.buttonText} />
          ) : (
              <>
                <MaterialIcons name="send" size={20} color={C.buttonText} />
                <Text style={[styles.createButtonText, { color: C.buttonText }]}>Create Post</Text>
              </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    fontSize: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mediaPreview: {
    width: '100%',
    alignItems: 'center',
  },
  previewContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  previewImage: {
    width: screenWidth - 80,
    height: (screenWidth - 80) * 0.75,
    borderRadius: 12,
  },
  videoPreview: {
    width: screenWidth - 80,
    height: (screenWidth - 80) * 0.75,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
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
    fontSize: 12,
    textAlign: 'center',
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
  liquidProgressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  liquidProgressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  liquidProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  liquidBubbles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  liquidBubble: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 0,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
}); 