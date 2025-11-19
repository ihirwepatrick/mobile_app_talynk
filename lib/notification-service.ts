import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class UploadNotificationService {
  private static instance: UploadNotificationService;
  private notificationId: string | null = null;

  static getInstance(): UploadNotificationService {
    if (!UploadNotificationService.instance) {
      UploadNotificationService.instance = new UploadNotificationService();
    }
    return UploadNotificationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async showUploadProgress(progress: number, filename?: string): Promise<void> {
    // Cap progress at 100%
    const cappedProgress = Math.min(Math.max(progress, 0), 100);
    
    const title = 'Uploading Video';
    const body = filename 
      ? `Uploading ${filename}... ${cappedProgress}%`
      : `Uploading... ${cappedProgress}%`;

    if (this.notificationId) {
      // Update existing notification
      await Notifications.scheduleNotificationAsync({
        identifier: this.notificationId,
        content: {
          title,
          body,
          data: { progress: cappedProgress, type: 'upload-progress' },
        },
        trigger: null, // Immediate
      });
    } else {
      // Create new notification
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { progress: cappedProgress, type: 'upload-progress' },
        },
        trigger: null, // Immediate
      });
      this.notificationId = id;
    }
  }

  async showUploadComplete(filename?: string): Promise<void> {
    if (this.notificationId) {
      await Notifications.scheduleNotificationAsync({
        identifier: this.notificationId,
        content: {
          title: 'Upload Complete! 🎉',
          body: filename 
            ? `${filename} has been uploaded successfully`
            : 'Your video has been uploaded successfully',
          data: { type: 'upload-complete' },
        },
        trigger: null,
      });

      // Clear the notification after 3 seconds
      setTimeout(async () => {
        await this.clearNotification();
      }, 3000);
    }
  }

  async showUploadError(error: string, filename?: string): Promise<void> {
    if (this.notificationId) {
      await Notifications.scheduleNotificationAsync({
        identifier: this.notificationId,
        content: {
          title: 'Upload Failed ❌',
          body: filename 
            ? `Failed to upload ${filename}: ${error}`
            : `Upload failed: ${error}`,
          data: { type: 'upload-error' },
        },
        trigger: null,
      });

      // Clear the notification after 5 seconds
      setTimeout(async () => {
        await this.clearNotification();
      }, 5000);
    }
  }

  async clearNotification(): Promise<void> {
    if (this.notificationId) {
      await Notifications.dismissNotificationAsync(this.notificationId);
      this.notificationId = null;
    }
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    this.notificationId = null;
  }
}

export const uploadNotificationService = UploadNotificationService.getInstance(); 