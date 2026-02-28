/**
 * Formatting Utilities
 * Format values for display
 */

/**
 * Format date
 */
export const formatDate = (date, format = 'MM/DD/YYYY') => {
  if (!date) return 'N/A';

  const dateObj = new Date(date);
  if (isNaN(dateObj)) return 'Invalid date';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  const formats = {
    'MM/DD/YYYY': `${month}/${day}/${year}`,
    'DD/MM/YYYY': `${day}/${month}/${year}`,
    'YYYY-MM-DD': `${year}-${month}-${day}`,
    'MMM DD, YYYY': `${dateObj.toLocaleString('default', { month: 'short' })} ${day}, ${year}`,
  };

  return formats[format] || formats['MM/DD/YYYY'];
};

/**
 * Format time
 */
export const formatTime = (time, format = 'HH:MM') => {
  if (!time) return 'N/A';

  const dateObj = new Date(time);
  if (isNaN(dateObj)) return 'Invalid time';

  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');

  const formats = {
    'HH:MM': `${hours}:${minutes}`,
    'HH:MM:SS': `${hours}:${minutes}:${seconds}`,
  };

  return formats[format] || formats['HH:MM'];
};

/**
 * Format datetime
 */
export const formatDateTime = (datetime, dateFormat = 'MM/DD/YYYY', timeFormat = 'HH:MM') => {
  if (!datetime) return 'N/A';
  return `${formatDate(datetime, dateFormat)} ${formatTime(datetime, timeFormat)}`;
};

/**
 * Format currency
 */
export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }

  const symbols = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
  };

  const symbol = symbols[currency] || currency;
  const formattedAmount = parseFloat(amount).toFixed(2);
  return `${symbol} ${formattedAmount}`;
};

/**
 * Format percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  return `${parseFloat(value).toFixed(decimals)}%`;
};

/**
 * Format bytes
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format status
 */
export const formatStatus = (status) => {
  const statusMap = {
    'pending': 'Pending',
    'processing': 'Processing',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'failed': 'Failed',
    'active': 'Active',
    'inactive': 'Inactive',
    'verified': 'Verified',
    'unverified': 'Unverified',
  };

  return statusMap[status?.toLowerCase()] || status;
};

/**
 * Format order status
 */
export const formatOrderStatus = (status) => {
  const statusMap = {
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'dispensing': 'Dispensing',
    'ready': 'Ready for Pickup',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  };

  return statusMap[status?.toLowerCase()] || status;
};

/**
 * Get status color
 */
export const getStatusColor = (status) => {
  const colorMap = {
    'pending': 'yellow',
    'processing': 'blue',
    'completed': 'green',
    'cancelled': 'red',
    'failed': 'red',
    'active': 'green',
    'inactive': 'gray',
  };

  return colorMap[status?.toLowerCase()] || 'gray';
};

/**
 * Format phone display
 */
export const formatPhoneDisplay = (phone) => {
  if (!phone) return 'N/A';
  const cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

/**
 * Truncate text
 */
export const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + suffix;
};

/**
 * Capitalize string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Title case
 */
export const titleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Plural form
 */
export const pluralize = (count, singular, plural = null) => {
  const pluralForm = plural || singular + 's';
  return count === 1 ? singular : pluralForm;
};
