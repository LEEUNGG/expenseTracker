/**
 * Over-Budget Visualization Utility Functions
 * 
 * These functions support the enhanced over-budget visualization in BudgetLineChart.
 * They calculate over-budget areas, find first overspend days, and compute statistics.
 */

/**
 * Theme color constants for over-budget visualization.
 * Defines colors for light and dark modes for:
 * - Over-budget area fill and stroke
 * - Spending line (normal and overspend states)
 * - Diagonal stripe pattern
 * - Warning marker
 * 
 * Requirements: 5.5
 */
export const OVER_BUDGET_COLORS = {
  light: {
    areaStroke: '#ef4444',      // Red-500 for area border
    areaFill: '#ef4444',        // Red-500 for area fill
    areaOpacity: 0.12,          // 10-15% opacity as per requirement 1.3
    lineNormal: '#ef4444',      // Red-500 for normal spending line
    lineOverspend: '#dc2626',   // Red-600 (darker) for overspend segments
    patternStroke: '#ef4444',   // Red-500 for diagonal stripes
    patternOpacity: 0.15,       // Subtle pattern opacity
    warningMarker: '#ef4444'    // Red-500 for first overspend marker
  },
  dark: {
    areaStroke: '#f87171',      // Red-400 for area border (lighter for dark mode)
    areaFill: '#f87171',        // Red-400 for area fill
    areaOpacity: 0.12,          // Same opacity for consistency
    lineNormal: '#ef4444',      // Red-500 for normal spending line
    lineOverspend: '#f87171',   // Red-400 (lighter) for overspend segments
    patternStroke: '#fca5a5',   // Red-300 for diagonal stripes (more visible)
    patternOpacity: 0.15,       // Same pattern opacity
    warningMarker: '#f87171'    // Red-400 for first overspend marker
  }
};

/**
 * Get theme colors for over-budget visualization based on current theme.
 * 
 * @param {boolean} isDark - Whether dark theme is active
 * @returns {Object} Theme-appropriate color values
 * 
 * Requirements: 5.5
 */
export function getOverBudgetColors(isDark) {
  return isDark ? OVER_BUDGET_COLORS.dark : OVER_BUDGET_COLORS.light;
}

/**
 * Calculate over-budget area data for each data point.
 * Used for rendering the filled area between spending and budget lines.
 * 
 * @param {Array<{day: string, budget: number, spending: number|null}>} data - Chart data points
 * @returns {Array<{day: string, overBudget: number|null, budget: number}>} - Data with over-budget values
 * 
 * Requirements: 1.1, 1.2
 */
export function calculateOverBudgetArea(data) {
  if (!Array.isArray(data)) {
    return [];
  }
  
  return data.map(point => ({
    day: point.day,
    overBudget: point.spending !== null && point.spending !== undefined
      ? Math.max(0, point.spending - point.budget)
      : null,
    budget: point.budget
  }));
}

/**
 * Find the first day where spending exceeds budget.
 * Used for placing the warning marker on the X-axis.
 * 
 * @param {Array<{day: string, budget: number, spending: number|null}>} data - Chart data points
 * @returns {{day: string, index: number} | null} - First overspend day info or null if none
 * 
 * Requirements: 4.1, 4.4
 */
export function findFirstOverspendDay(data) {
  if (!Array.isArray(data)) {
    return null;
  }
  
  const index = data.findIndex(
    point => point.spending !== null && 
             point.spending !== undefined && 
             point.spending > point.budget
  );
  
  return index >= 0 ? { day: data[index].day, index } : null;
}

/**
 * Calculate overspend statistics for a specific day.
 * Used for displaying detailed information in the enhanced tooltip.
 * 
 * @param {Array<{day: string, budget: number, spending: number|null}>} data - Chart data points
 * @param {string} currentDay - The day being hovered
 * @returns {OverspendStats | null} - Statistics object or null if not over budget
 * 
 * @typedef {Object} OverspendStats
 * @property {number} overspendAmount - spending - budget
 * @property {number|null} overspendPercentage - ((spending - budget) / budget) * 100, null if budget is 0
 * @property {string|null} firstOverspendDay - Day number when first exceeded
 * @property {number} avgDailyOverspend - Total overspend / days overspent
 * @property {number} budget - Current budget value
 * @property {number} spending - Current spending value
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export function calculateOverspendStats(data, currentDay) {
  if (!Array.isArray(data) || !currentDay) {
    return null;
  }
  
  const currentPoint = data.find(d => d.day === currentDay);
  
  // Return null if point not found or not in over-budget state
  if (!currentPoint || 
      currentPoint.spending === null || 
      currentPoint.spending === undefined ||
      currentPoint.spending <= currentPoint.budget) {
    return null;
  }
  
  const firstOverspendDay = findFirstOverspendDay(data);
  const overspendAmount = currentPoint.spending - currentPoint.budget;
  
  // Handle budget = 0 edge case to avoid division by zero
  const overspendPercentage = currentPoint.budget > 0
    ? (overspendAmount / currentPoint.budget) * 100
    : null;
  
  // Calculate days in overspend state up to current day
  const currentDayNum = parseInt(currentDay, 10);
  const daysOverspent = data.filter(
    d => d.spending !== null && 
         d.spending !== undefined &&
         d.spending > d.budget && 
         parseInt(d.day, 10) <= currentDayNum
  ).length;
  
  // Calculate average daily overspend (avoid division by zero)
  const avgDailyOverspend = daysOverspent > 0 
    ? overspendAmount / daysOverspent 
    : 0;
  
  return {
    overspendAmount,
    overspendPercentage,
    firstOverspendDay: firstOverspendDay?.day ?? null,
    avgDailyOverspend,
    budget: currentPoint.budget,
    spending: currentPoint.spending
  };
}
