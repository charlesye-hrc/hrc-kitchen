/**
 * Validates an email address
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates a password meets requirements
 */
export const isValidPassword = (password: string): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validates a time string (HH:MM format)
 */
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Validates that end time is after start time
 */
export const isEndTimeAfterStartTime = (
  startTime: string,
  endTime: string
): boolean => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return endMinutes > startMinutes;
};

/**
 * Validates a phone number (Australian format)
 */
export const isValidPhone = (phone: string): boolean => {
  // Accepts formats: 0412345678, 04 1234 5678, (04) 1234 5678
  const phoneRegex = /^(\+?61|0)?[2-478](?:[ -]?[0-9]){8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validates a price (positive number with up to 2 decimal places)
 */
export const isValidPrice = (price: number | string): boolean => {
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(priceNum) && priceNum >= 0 && /^\d+(\.\d{1,2})?$/.test(String(priceNum));
};

/**
 * Validates that a required field is not empty
 */
export const isRequired = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value.trim().length > 0;
};

/**
 * Validates minimum length
 */
export const hasMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

/**
 * Validates maximum length
 */
export const hasMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

/**
 * Checks if a date is a weekday (Monday-Friday)
 */
export const isWeekday = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 1 && day <= 5; // 1 = Monday, 5 = Friday
};

/**
 * Checks if current time is within ordering window
 */
export const isWithinOrderingWindow = (
  startTime: string,
  endTime: string,
  currentDate: Date = new Date()
): boolean => {
  if (!isWeekday(currentDate)) {
    return false;
  }

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const now = currentDate.getHours() * 60 + currentDate.getMinutes();
  const start = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  return now >= start && now < end;
};

/**
 * Validates email domain matches allowed domain
 */
export const isAllowedEmailDomain = (
  email: string,
  allowedDomain: string
): boolean => {
  if (!isValidEmail(email)) return false;
  return email.toLowerCase().endsWith(allowedDomain.toLowerCase());
};
