import React, { useState } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { postsApi } from '@/lib/api';

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
  },
};

export default function CreatePostScreen() {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video'; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const colorScheme = useColorScheme() || 'dark';
  const C = COLORS.dark;

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
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || asset.uri.split('/').pop() || (mediaType === 'image' ? 'image.jpg' : 'video.mp4');
      setSelectedMedia({ uri: asset.uri, type: mediaType, name: fileName });
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
    if (selectedMedia) {
      if (selectedMedia.type === 'image' && Platform.OS !== 'web') {
        // Get file size using fetch for local files
        // Not supported on web, so skip
      }
      // File size check (50MB)
      // We can't get file size directly in React Native easily, so warn on upload error
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- SUBMIT ---
  const handleCreatePost = async () => {
    if (!validate()) return;
    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('caption', caption);
      formData.append('post_category', getSelectedCategoryName());
      if (selectedMedia) {
        formData.append('file', {
          uri: selectedMedia.uri,
          name: selectedMedia.name,
          type: selectedMedia.type === 'image' ? 'image/jpeg' : 'video/mp4',
        } as any);
      }
      // Use fetch for upload to show progress (axios RN progress is tricky)
      const response = await postsApi.create(formData);
      if (response.status === 'success') {
        Alert.alert('Success', 'Post created successfully!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') }
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to create post');
      }
    } catch (error) {
      console.error('Create post error:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // --- UI ---
  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]}> 
      {/* Content Authenticity Warning */}
      <View style={[styles.warningBox, { backgroundColor: '#232326', borderColor: '#ffcc80' }]}> 
        <Text style={[styles.warningTitle, { color: '#ffcc80' }]}>⚠️ Content Authenticity Warning</Text>
        <Text style={[styles.warningText, { color: '#fff' }]}>All content must be 100% authentic and showcase natural talent only. The following are strictly prohibited:</Text>
        <Text style={[styles.warningList, { color: '#ffecb3' }]}>• AI-enhanced or AI-generated content{"\n"}• Deepfake videos or manipulated media{"\n"}• Voice changers or audio manipulation{"\n"}• Filters that alter performance quality{"\n"}• Any tools that misrepresent true abilities</Text>
        <Text style={[styles.warningFooter, { color: '#ffcc80' }]}>Violation of these rules will result in immediate content removal and possible account suspension.</Text>
      </View>
      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.label, { color: C.text, marginTop: 10 }]}>Title</Text>
        <TextInput
          style={[styles.input, { color: C.inputText, backgroundColor: '#18181b', borderColor: errors.title ? C.error : '#333' }]}
          placeholder="Give your post a title"
          placeholderTextColor={C.textSecondary}
          value={title}
          onChangeText={setTitle}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        {/* Caption */}
        <Text style={[styles.label, { color: C.text, marginTop: 18 }]}>Caption</Text>
        <TextInput
          style={[styles.textarea, { color: C.inputText, backgroundColor: '#18181b', borderColor: errors.caption ? C.error : '#333' }]}
          placeholder="Describe your post..."
          placeholderTextColor={C.textSecondary}
          value={caption}
          onChangeText={setCaption}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        {errors.caption && <Text style={styles.errorText}>{errors.caption}</Text>}
        {/* Category Group */}
        <Text style={[styles.label, { color: C.text, marginTop: 18 }]}>Category Group</Text>
        <View style={styles.pillRow}>
          {MAIN_CATEGORY_GROUPS.map(group => (
            <TouchableOpacity
              key={group}
              style={[styles.pill, selectedGroup === group && styles.pillSelected]}
              onPress={() => { setSelectedGroup(group); setSelectedCategoryId(''); }}
            >
              <Text style={{ color: selectedGroup === group ? '#18181b' : '#fff', fontWeight: '600' }}>{group}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.group && <Text style={styles.errorText}>{errors.group}</Text>}
        {/* Specific Category */}
        <Text style={[styles.label, { color: C.text, marginTop: 18 }]}>Specific Category</Text>
        <View style={styles.pillRow}>
          {getCategoriesForGroup().map((cat: { id: number; name: string }) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.pill, selectedCategoryId === String(cat.id) && styles.pillSelected]}
              onPress={() => setSelectedCategoryId(String(cat.id))}
            >
              <Text style={{ color: selectedCategoryId === String(cat.id) ? '#18181b' : '#fff', fontWeight: '600' }}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        {/* Media Upload */}
        <Text style={[styles.label, { color: C.text, marginTop: 18 }]}>Media Upload</Text>
        <View style={[styles.mediaCard, { borderColor: errors.media ? C.error : '#444' }]}> 
          <View style={styles.mediaButtonsRow}>
            <TouchableOpacity style={[styles.mediaButton, { backgroundColor: '#232326', borderColor: '#60a5fa' }]} onPress={() => pickMedia('image')}>
              <Text style={[styles.mediaButtonText, { color: '#60a5fa' }]}>📷 Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mediaButton, { backgroundColor: '#232326', borderColor: '#60a5fa' }]} onPress={() => pickMedia('video')}>
              <Text style={[styles.mediaButtonText, { color: '#60a5fa' }]}>🎬 Video</Text>
            </TouchableOpacity>
          </View>
          {selectedMedia && (
            <View style={styles.imagePreview}>
              {selectedMedia.type === 'image' ? (
                <Image source={{ uri: selectedMedia.uri }} style={styles.previewImage} />
              ) : (
                <Text style={{ color: C.text, marginBottom: 8 }}>[Video Selected]</Text>
              )}
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: C.error }]}
                onPress={removeMedia}
              >
                <Text style={[styles.removeButtonText, { color: C.buttonText }]}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {errors.media && <Text style={styles.errorText}>{errors.media}</Text>}
        </View>
        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.createButton, 
            uploading && styles.createButtonDisabled
          ]}
          onPress={handleCreatePost}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={'#fff'} />
          ) : (
            <Text style={styles.createButtonText}>Create Post</Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  captionContainer: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
  },
  captionInput: {
    fontSize: 16,
    minHeight: 100,
  },
  mediaSection: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  mediaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  mediaButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  mediaButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreview: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: 50,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  warningText: {
    fontSize: 14,
    marginBottom: 10,
    color: '#555',
  },
  warningList: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  warningFooter: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  textarea: {
    height: 100,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  picker: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  pickerItemSelected: {
    backgroundColor: '#e0e0e0',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 5,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 8,
    marginBottom: 8,
  },
  pillSelected: {
    backgroundColor: '#60a5fa',
    borderColor: '#60a5fa',
  },
  mediaCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#444',
    backgroundColor: '#232326',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
}); 