import dotenv from 'dotenv';

dotenv.config();

export const isAllowedNumber = (userId: string): boolean => {
  const allowed = process.env.ALLOWED_NUMBERS;
  if (!allowed?.trim()) return true;
  return allowed.split(',').map((n) => n.trim()).includes(userId);
};
