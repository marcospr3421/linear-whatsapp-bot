import dotenv from 'dotenv';

dotenv.config();

export const isAllowedNumber = async (userId: string, client: any): Promise<boolean> => {
  const allowed = process.env.ALLOWED_NUMBERS;
  if (!allowed?.trim()) return true;
  
  const allowedList = allowed.split(',').map((n) => n.trim());
  
  // Direct check
  if (allowedList.includes(userId)) return true;
  
  // Check if it's a LID and resolve phone number
  if (userId.endsWith('@lid')) {
    try {
      const result = await client.getContactLidAndPhone(userId);
      // getContactLidAndPhone can return an object or an array of objects
      if (result) {
        const item = Array.isArray(result) ? result[0] : result;
        if (item && item.pn && allowedList.includes(item.pn)) {
          return true;
        }
      }
    } catch (e) {
      console.error('Error resolving LID to phone number:', e);
    }
  }
  
  return false;
};
