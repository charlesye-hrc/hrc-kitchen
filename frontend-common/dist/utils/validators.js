/**
 * Validates an email address
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
/**
 * Validates a password meets requirements
 */
export const isValidPassword = (password) => {
    const errors = [];
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
export const isValidTime = (time) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
};
/**
 * Validates that end time is after start time
 */
export const isEndTimeAfterStartTime = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes > startMinutes;
};
/**
 * Validates a phone number (Australian format)
 */
export const isValidPhone = (phone) => {
    // Accepts formats: 0412345678, 04 1234 5678, (04) 1234 5678
    const phoneRegex = /^(\+?61|0)?[2-478](?:[ -]?[0-9]){8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};
/**
 * Validates a price (positive number with up to 2 decimal places)
 */
export const isValidPrice = (price) => {
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    return !isNaN(priceNum) && priceNum >= 0 && /^\d+(\.\d{1,2})?$/.test(String(priceNum));
};
/**
 * Validates that a required field is not empty
 */
export const isRequired = (value) => {
    return value !== null && value !== undefined && value.trim().length > 0;
};
/**
 * Validates minimum length
 */
export const hasMinLength = (value, minLength) => {
    return value.length >= minLength;
};
/**
 * Validates maximum length
 */
export const hasMaxLength = (value, maxLength) => {
    return value.length <= maxLength;
};
/**
 * Checks if a date is a weekday (Monday-Friday)
 * Note: With weekend menu support, this is kept for backward compatibility
 * but ordering is now menu-driven (based on item availability)
 */
export const isWeekday = (date) => {
    const day = date.getDay();
    return day >= 1 && day <= 5; // 1 = Monday, 5 = Friday
};
/**
 * Checks if current time is within ordering window
 * Note: No longer checks for weekends - ordering is menu-driven based on item availability
 */
export const isWithinOrderingWindow = (startTime, endTime, currentDate = new Date()) => {
    // Removed weekend check - ordering is now menu-driven
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
export const isAllowedEmailDomain = (email, allowedDomain) => {
    if (!isValidEmail(email))
        return false;
    return email.toLowerCase().endsWith(allowedDomain.toLowerCase());
};
