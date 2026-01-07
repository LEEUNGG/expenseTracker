/**
 * Utility for holiday detection
 */

/**
 * Get the day type for a given date
 * @param {Date} date 
 * @param {Map} holidayMap Map of date strings to types
 * @returns {'holiday' | 'weekend' | 'weekday'}
 */
export function getDayType(date, holidayMap = new Map()) {
    // Use local time to avoid timezone shifts from toISOString()
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    if (holidayMap.has(dateStr)) {
        return holidayMap.get(dateStr) === 'holiday' ? 'holiday' : 'weekday';
    }

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return 'weekend';
    }

    return 'weekday';
}
