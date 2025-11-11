/**
 * Formats a number as Australian currency (AUD)
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
    }).format(amount);
};
/**
 * Formats a date string to human-readable format
 */
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};
/**
 * Formats a date string to short date format
 */
export const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};
/**
 * Formats a datetime string to include time
 */
export const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};
/**
 * Formats a time string (HH:MM)
 */
export const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};
/**
 * Formats an order status for display
 */
export const formatOrderStatus = (status) => {
    const statusMap = {
        PLACED: 'Placed',
        PARTIALLY_FULFILLED: 'In Progress',
        FULFILLED: 'Ready',
        PENDING: 'Pending',
        COMPLETED: 'Completed',
        FAILED: 'Failed',
        REFUNDED: 'Refunded',
    };
    return statusMap[status] || status;
};
/**
 * Formats a user role for display
 */
export const formatUserRole = (role) => {
    const roleMap = {
        STAFF: 'Staff',
        KITCHEN: 'Kitchen Staff',
        FINANCE: 'Finance',
        ADMIN: 'Administrator',
    };
    return roleMap[role] || role;
};
/**
 * Formats a weekday for display
 */
export const formatWeekday = (weekday) => {
    return weekday.charAt(0) + weekday.slice(1).toLowerCase();
};
/**
 * Capitalizes first letter of a string
 */
export const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
/**
 * Truncates text to specified length with ellipsis
 */
export const truncate = (text, maxLength) => {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength) + '...';
};
/**
 * Formats a list of items with commas and "and"
 */
export const formatList = (items) => {
    if (items.length === 0)
        return '';
    if (items.length === 1)
        return items[0];
    if (items.length === 2)
        return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};
