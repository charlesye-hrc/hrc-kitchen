/**
 * Extracts error message from API error response
 */
export declare const getErrorMessage: (error: unknown) => string;
/**
 * Checks if error is a specific HTTP status code
 */
export declare const isHttpError: (error: unknown, statusCode: number) => boolean;
/**
 * Checks if error is unauthorized (401)
 */
export declare const isUnauthorizedError: (error: unknown) => boolean;
/**
 * Checks if error is forbidden (403)
 */
export declare const isForbiddenError: (error: unknown) => boolean;
/**
 * Checks if error is not found (404)
 */
export declare const isNotFoundError: (error: unknown) => boolean;
/**
 * Checks if error is a validation error (400)
 */
export declare const isValidationError: (error: unknown) => boolean;
/**
 * Checks if error is a conflict (409) - e.g., email already exists
 */
export declare const isConflictError: (error: unknown) => boolean;
/**
 * Gets error code from API response
 */
export declare const getErrorCode: (error: unknown) => string | null;
//# sourceMappingURL=api-helpers.d.ts.map