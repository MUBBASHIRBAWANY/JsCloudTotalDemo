import axios from 'axios';
import { Platform } from 'react-native';

// Cloudinary configuration
// IMPORTANT: Use environment variables for sensitive data in production
const CLOUDINARY_CLOUD_NAME = 'dqoqk50g7'; // Replace with your cloud name
const CLOUDINARY_UPLOAD_PRESET = 'attendance'; // Replace with your upload preset

/**
 * Upload image to Cloudinary
 * @param imageUri - Local URI of the image to upload
 * @returns Promise with secure_url of uploaded image
 */
export const uploadToCloudinary = async (imageUri: string): Promise<string> => {
  try {
    const formData = new FormData();

    // Add file to form data
    const uriParts = imageUri.split('.');
    const fileType = uriParts[uriParts.length - 1];

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      formData.append('file', blob, `attendance_${Date.now()}.jpg`);
    } else {
      formData.append('file', {
        uri: imageUri,
        type: `image/${fileType}`,
        name: `attendance_${Date.now()}.${fileType}`,
      } as any);
    }
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.data && response.data.secure_url) {
      return response.data.secure_url;
    } else {
      throw new Error('No secure_url returned from Cloudinary');
    }
  } catch (error: any) {
    console.error('Cloudinary upload error:', error.message);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};
