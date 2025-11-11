import { AxiosError } from 'axios';
/**
 * Extracts error message from API error response
 */
export const getErrorMessage = (error) => {
    if (error instanceof AxiosError) {
        if (error.response?.data?.message) {
            return error.response.data.message;
        }
        if (error.response?.data?.error) {
            return error.response.data.error;
        }
        if (error.message) {
            return error.message;
        }
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
};
/**
 * Checks if error is a specific HTTP status code
 */
export const isHttpError = (error, statusCode) => {
    if (error instanceof AxiosError) {
        return error.response?.status === statusCode;
    }
    return false;
};
/**
 * Checks if error is unauthorized (401)
 */
export const isUnauthorizedError = (error) => {
    return isHttpError(error, 401);
};
/**
 * Checks if error is forbidden (403)
 */
export const isForbiddenError = (error) => {
    return isHttpError(error, 403);
};
/**
 * Checks if error is not found (404)
 */
export const isNotFoundError = (error) => {
    return isHttpError(error, 404);
};
/**
 * Checks if error is a validation error (400)
 */
export const isValidationError = (error) => {
    return isHttpError(error, 400);
};
/**
 * Checks if error is a conflict (409) - e.g., email already exists
 */
export const isConflictError = (error) => {
    return isHttpError(error, 409);
};
/**
 * Gets error code from API response
 */
export const getErrorCode = (error) => {
    if (error instanceof AxiosError) {
        return error.response?.data?.code || null;
    }
    return null;
};
