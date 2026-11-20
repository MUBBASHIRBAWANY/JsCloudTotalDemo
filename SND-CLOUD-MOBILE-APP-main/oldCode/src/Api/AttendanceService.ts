
/**
 * Mark attendance with image URL and location
 * @param userId - ID of the user
 * @param imageUrl - URL of uploaded image from Cloudinary
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 * @param markingType - Type of attendance marking ('check-in' or 'check-out')
 * @returns Promise with backend response
 */

import { createDataFunction } from "./CurdFunctions";

const now = new Date();

// Format date → YYYY-MM-DD
const date = now.toISOString().split('T')[0];

// Format time → HH-MM
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
const time = `${hours}-${minutes}`;

export const markAttendance = async (
  UserId: string,
  imageUrl: string,
  latitude: number,
  longitude: number,
  markingType: string,
  date: string,
  time: string,
): Promise<any> => {
  try {
    const payload = {
      UserId,
      imageUrl,
      latitude,
      longitude,
      date,
      time,
      markingType, // or 'check-out' based on your logic

    };
    console.log('SENDING PAYLOAD:', JSON.stringify(payload, null, 2));
    const response = await createDataFunction('/Attandance', payload);
    return response;

  } catch (error: any) {
    console.error('Attendance API error:', error);
    throw new Error(`${error.response?.data}`);
  }
};
