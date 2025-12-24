import * as FileSystem from 'expo-file-system/legacy';

/**
 * Generate thumbnail from video URI
 * For Expo Go compatibility, we return the video URI and let the backend generate the thumbnail.
 * This is the simplest approach and avoids MediaLibrary permission issues in Expo Go.
 */
export const generateThumbnail = async (videoUri: string): Promise<string | null> => {
  try {
    // Check if video exists
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      console.warn('Video file does not exist:', videoUri);
      return null;
    }

    // Return video URI - backend will generate the actual thumbnail
    // This approach is Expo Go compatible and follows KISS principle
    return videoUri;
  } catch (error) {
    console.warn('Error checking video file:', error);
    // Return video URI as fallback - backend can handle thumbnail generation
    return videoUri;
  }
};
