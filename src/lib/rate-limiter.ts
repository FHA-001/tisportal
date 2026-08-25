// Rate limiting utility for login attempts
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

interface RateLimitData {
  attempts: number;
  lastAttempt: number;
  lockUntil: number | null;
}

export const getRateLimitData = (identifier: string): RateLimitData => {
  const data = localStorage.getItem(`rate_limit_${identifier}`);
  if (!data) {
    return { attempts: 0, lastAttempt: 0, lockUntil: null };
  }
  return JSON.parse(data);
};

export const setRateLimitData = (identifier: string, data: RateLimitData): void => {
  localStorage.setItem(`rate_limit_${identifier}`, JSON.stringify(data));
};

export const clearRateLimitData = (identifier: string): void => {
  localStorage.removeItem(`rate_limit_${identifier}`);
};

export const isRateLimited = (identifier: string): boolean => {
  const data = getRateLimitData(identifier);
  
  if (data.lockUntil && Date.now() < data.lockUntil) {
    return true;
  }
  
  // Reset if lockout period has expired
  if (data.lockUntil && Date.now() >= data.lockUntil) {
    clearRateLimitData(identifier);
  }
  
  return false;
};

export const recordFailedAttempt = (identifier: string): number => {
  const data = getRateLimitData(identifier);
  const now = Date.now();
  
  data.attempts += 1;
  data.lastAttempt = now;
  
  if (data.attempts >= MAX_ATTEMPTS) {
    data.lockUntil = now + LOCKOUT_DURATION;
  }
  
  setRateLimitData(identifier, data);
  return data.attempts;
};

export const recordSuccessfulAttempt = (identifier: string): void => {
  clearRateLimitData(identifier);
};

export const getRemainingAttempts = (identifier: string): number => {
  const data = getRateLimitData(identifier);
  return MAX_ATTEMPTS - data.attempts;
};

export const getLockoutRemainingTime = (identifier: string): number => {
  const data = getRateLimitData(identifier);
  if (!data.lockUntil) return 0;
  const remaining = data.lockUntil - Date.now();
  return remaining > 0 ? remaining : 0;
};

export const formatLockoutTime = (milliseconds: number): string => {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
