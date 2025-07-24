import { Linking, Alert } from 'react-native';
import { WHATSAPP_BUSINESS_NUMBER } from './config';

export class WhatsAppService {
  static async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Format phone number (remove any non-digits except +)
      const formattedNumber = phoneNumber.replace(/[^\d+]/g, '');
      
      // Encode the message for URL
      const encodedMessage = encodeURIComponent(message);
      
      // Create WhatsApp URL
      const whatsappUrl = `whatsapp://send?phone=${formattedNumber}&text=${encodedMessage}`;
      
      // Check if WhatsApp is installed
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        return true;
      } else {
        // Fallback to web WhatsApp
        const webWhatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
        await Linking.openURL(webWhatsappUrl);
        return true;
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'Error',
        'Could not open WhatsApp. Please make sure WhatsApp is installed on your device.'
      );
      return false;
    }
  }

  static async contactSeller(product: any, customMessage?: string): Promise<void> {
    const defaultMessage = customMessage || 
      `Hello! I'm interested in the ${product.name} (${product.price.toLocaleString()} ${product.currency}). Is it still available?`;
    
    const sellerPhone = product.seller?.whatsapp || product.seller?.phone || WHATSAPP_BUSINESS_NUMBER;
    
    await this.sendMessage(sellerPhone, defaultMessage);
  }

  static async contactBusiness(message: string): Promise<void> {
    await this.sendMessage(WHATSAPP_BUSINESS_NUMBER, message);
  }

  static generateProductInquiryMessage(product: any): string {
    return `Hello! I'm interested in the following product:

📦 *${product.name}*
💰 Price: ${product.price.toLocaleString()} ${product.currency}
📋 Category: ${product.category}
${product.brand ? `🏷️ Brand: ${product.brand}` : ''}

Could you please provide more information about availability and delivery options?

Thank you!`;
  }
}