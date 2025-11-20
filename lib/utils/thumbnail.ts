import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';

/**
 * Generate thumbnail from video URI
 * Since expo-video-thumbnails is not installed, we'll use a simple approach:
 * - For now, return the video URI (backend can generate thumbnail)
 * - Or use MediaLibrary to get a thumbnail if available
 */
export const generateThumbnail = async (videoUri: string): Promise<string | null> => {
  try {
    // Check if video exists
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      console.warn('Video file does not exist:', videoUri);
      return null;
    }

    // Try to get thumbnail from MediaLibrary if the video is in the gallery
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        // Try to find the asset by URI
        const assets = await MediaLibrary.getAssetsAsync({
          uri: videoUri,
          first: 1,
        });
        
        if (assets.assets.length > 0) {
          const asset = assets.assets[0];
          // MediaLibrary doesn't directly provide thumbnails, but we can use the video URI
          // The backend will handle thumbnail generation
          return videoUri;
        }
      }
    } catch (e) {
      // MediaLibrary access failed, continue with fallback
    }

    // Fallback: return video URI - backend will generate thumbnail
    // This is the simplest approach and follows KISS principle
    return videoUri;
  } catch (error) {
    console.warn('Error generating thumbnail:', error);
    // Return video URI as fallback - backend can handle it
    return videoUri;
  }
};

