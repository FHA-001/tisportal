/**
 * Input validation and sanitization utilities
 * Prevents XSS attacks and ensures data integrity
 */

/**
 * Sanitize text input by removing potentially dangerous characters
 * This is a basic sanitization - for production, consider using DOMPurify
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove potentially dangerous HTML/JS patterns
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic validation)
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Allow digits, spaces, +, -, and parentheses
  const phoneRegex = /^[\d\s\+\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.length >= 10;
}

/**
 * Validate username (alphanumeric, underscores, and periods between segments)
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*$/;
  return usernameRegex.test(username) && username.length >= 3;
}

/**
 * Sanitize and validate form data
 */
export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Only sanitize text fields that could contain user input
      if (['full_name', 'username', 'remarks', 'description', 'notes'].includes(key)) {
        sanitized[key] = sanitizeInput(value.trim());
      } else {
        sanitized[key] = value.trim();
      }
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Validate student registration data
 */
export function validateStudentData(data: any, isEdit: boolean = false): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters');
  }
  
  if (!data.username || !isValidUsername(data.username)) {
    errors.push('Username must be at least 3 characters and contain only letters, numbers, underscores, and periods');
  }
  
  // Only validate password in create mode or if provided in edit mode
  if (!isEdit || data.password) {
    if (!data.password || data.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
  }
  
  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (data.phone_number && !isValidPhoneNumber(data.phone_number)) {
    errors.push('Invalid phone number format');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate teacher registration data
 */
export function validateTeacherData(data: any, isEdit: boolean = false): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters');
  }
  
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }
  
  // Only validate password in create mode or if provided in edit mode
  if (!isEdit || data.password) {
    if (!data.password || data.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
  }
  
  if (data.phone_number && !isValidPhoneNumber(data.phone_number)) {
    errors.push('Invalid phone number format');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate grade entry data
 */
export function validateGradeData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const scoreFields = ['test_1', 'test_2', 'project_1', 'assignment_1', 'exam'];
  
  for (const field of scoreFields) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      const score = Number(data[field]);
      if (isNaN(score) || score < 0 || score > 100) {
        errors.push(`${field} must be between 0 and 100`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}
