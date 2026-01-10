/**
 * Utility functions for expense handling
 */

/**
 * Determines if a description has been meaningfully modified
 * Compares trimmed values to detect meaningful changes (not just whitespace)
 * @param {string} original - Original AI description
 * @param {string} current - Current user input
 * @returns {boolean} - True if meaningfully different
 */
export function isDescriptionModified(original, current) {
  const normalizedOriginal = (original || '').trim();
  const normalizedCurrent = (current || '').trim();
  return normalizedOriginal !== normalizedCurrent;
}

/**
 * Formats date and time for display
 * Shows full date (YYYY-MM-DD) and time (HH:MM) when available
 * Requirements: 3.1, 3.2, 3.3
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} timeStr - Time in HH:MM format (optional)
 * @returns {string} - Formatted datetime string
 */
export function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return '';
  // Format: "2024-01-15 14:30" or "2024-01-15" if no time
  return timeStr ? `${dateStr} ${timeStr}` : dateStr;
}
