import { ApiError } from '../middleware/errorHandler';

/**
 * Validate and parse date range parameters
 */
export function validateDateRange(
  startDate?: string,
  endDate?: string,
  options: {
    maxDaysBack?: number;
    required?: boolean;
  } = {}
): { start?: Date; end?: Date } {
  const { maxDaysBack = 365 * 5, required = false } = options;

  if (required && (!startDate || !endDate)) {
    throw new ApiError(400, 'Start date and end date are required');
  }

  if (!startDate && !endDate) {
    return {};
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (startDate && !dateRegex.test(startDate)) {
    throw new ApiError(400, 'Start date must be in YYYY-MM-DD format');
  }

  if (endDate && !dateRegex.test(endDate)) {
    throw new ApiError(400, 'End date must be in YYYY-MM-DD format');
  }

  let start: Date | undefined;
  let end: Date | undefined;

  if (startDate) {
    start = new Date(startDate + 'T00:00:00');
    if (isNaN(start.getTime())) {
      throw new ApiError(400, 'Invalid start date value');
    }
  }

  if (endDate) {
    end = new Date(endDate + 'T23:59:59');
    if (isNaN(end.getTime())) {
      throw new ApiError(400, 'Invalid end date value');
    }
  }

  if (start && end && start > end) {
    throw new ApiError(400, 'Start date must be before end date');
  }

  // Prevent queries too far in the past
  if (start) {
    const daysDifference = Math.floor(
      (new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDifference > maxDaysBack) {
      throw new ApiError(400, `Cannot query more than ${maxDaysBack} days in the past`);
    }
  }

  return { start, end };
}

/**
 * Validate and constrain pagination parameters
 */
export function validatePagination(
  page?: string | number,
  limit?: string | number,
  options: {
    defaultPage?: number;
    defaultLimit?: number;
    maxLimit?: number;
    maxPage?: number;
  } = {}
): { page: number; limit: number; skip: number } {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 100,
    maxPage = 10000,
  } = options;

  let parsedPage = defaultPage;
  let parsedLimit = defaultLimit;

  if (page !== undefined) {
    parsedPage = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(parsedPage) || parsedPage < 1) {
      parsedPage = defaultPage;
    }
    parsedPage = Math.min(parsedPage, maxPage);
  }

  if (limit !== undefined) {
    parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      parsedLimit = defaultLimit;
    }
    parsedLimit = Math.min(parsedLimit, maxLimit);
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
}

/**
 * Validate single date parameter
 */
export function validateDate(dateStr?: string): Date | undefined {
  if (!dateStr) {
    return undefined;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    throw new ApiError(400, 'Date must be in YYYY-MM-DD format');
  }

  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) {
    throw new ApiError(400, 'Invalid date value');
  }

  return date;
}

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null) {
    return '';
  }

  const htmlEscapes: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}
