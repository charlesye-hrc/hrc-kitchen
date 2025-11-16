/**
 * Validates an email address
 */
export declare const isValidEmail: (email: string) => boolean;
/**
 * Validates a password meets requirements
 */
export declare const isValidPassword: (password: string) => {
    valid: boolean;
    errors: string[];
};
/**
 * Validates a time string (HH:MM format)
 */
export declare const isValidTime: (time: string) => boolean;
/**
 * Validates that end time is after start time
 */
export declare const isEndTimeAfterStartTime: (startTime: string, endTime: string) => boolean;
/**
 * Validates a phone number (Australian format)
 */
export declare const isValidPhone: (phone: string) => boolean;
/**
 * Validates a price (positive number with up to 2 decimal places)
 */
export declare const isValidPrice: (price: number | string) => boolean;
/**
 * Validates that a required field is not empty
 */
export declare const isRequired: (value: string | null | undefined) => boolean;
/**
 * Validates minimum length
 */
export declare const hasMinLength: (value: string, minLength: number) => boolean;
/**
 * Validates maximum length
 */
export declare const hasMaxLength: (value: string, maxLength: number) => boolean;
/**
 * Checks if a date is a weekday (Monday-Friday)
 * Note: With weekend menu support, this is kept for backward compatibility
 * but ordering is now menu-driven (based on item availability)
 */
export declare const isWeekday: (date: Date) => boolean;
/**
 * Checks if current time is within ordering window
 * Note: No longer checks for weekends - ordering is menu-driven based on item availability
 */
export declare const isWithinOrderingWindow: (startTime: string, endTime: string, currentDate?: Date) => boolean;
/**
 * Validates email domain matches allowed domain
 */
export declare const isAllowedEmailDomain: (email: string, allowedDomain: string) => boolean;
//# sourceMappingURL=validators.d.ts.map