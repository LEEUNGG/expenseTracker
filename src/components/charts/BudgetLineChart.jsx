import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Area } from 'recharts';
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  calculateOverBudgetArea, 
  findFirstOverspendDay, 
  calculateOverspendStats,
  OVER_BUDGET_COLORS
} from '../../lib/overBudgetUtils';

/**
 * SVG pattern definition for over-budget area fill.
 * Creates a 45° diagonal stripe pattern with theme-aware colors.
 * 
 * @param {Object} props
 * @param {boolean} props.isDark - Whether dark theme is active
 * Requirements: 1.3, 1.4, 5.5
 */
const OverBudgetAreaPattern = ({ isDark }) => {
  const colors = isDark ? OVER_BUDGET_COLORS.dark : OVER_BUDGET_COLORS.light;
  
  return (
    <defs>
      <pattern
        id="overBudgetPattern"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
        patternTransform="rotate(45)"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="8"
          stroke={colors.patternStroke}
          strokeWidth="2"
          strokeOpacity={colors.patternOpacity}
        />
      </pattern>
    </defs>
  );
};

/**
 * Custom spending line that renders with different styles based on over-budget state.
 * Solid line for normal segments, dashed line with darker color for over-budget segments.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
const SegmentedSpendingLine = ({ points, data, isDark }) => {
  if (!points || points.length < 2) return null;
  
  const colors = isDark ? OVER_BUDGET_COLORS.dark : OVER_BUDGET_COLORS.light;
  const segments = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const currentPoint = points[i];
    const nextPoint = points[i + 1];
    const currentData = data[i];
    const nextData = data[i + 1];
    
    // Skip if either point has null spending
    if (currentPoint.y === null || nextPoint.y === null || 
        currentData?.spending === null || nextData?.spending === null) {
      continue;
    }
    
    // Determine if this segment is over budget
    // A segment is over-budget if either endpoint is over budget
    const currentOverBudget = currentData?.spending > currentData?.budget;
    const nextOverBudget = nextData?.spending > nextData?.budget;
    const isOverBudgetSegment = currentOverBudget || nextOverBudget;
    
    segments.push({
      x1: currentPoint.x,
      y1: currentPoint.y,
      x2: nextPoint.x,
      y2: nextPoint.y,
      isOverBudget: isOverBudgetSegment
    });
  }
  
  return (
    <g>
      {segments.map((segment, index) => (
        <line
          key={index}
          x1={segment.x1}
          y1={segment.y1}
          x2={segment.x2}
          y2={segment.y2}
          stroke={segment.isOverBudget ? colors.lineOverspend : colors.lineNormal}
          strokeWidth={3}
          strokeDasharray={segment.isOverBudget ? '8 4' : 'none'}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
};

/**
 * Enhanced Tooltip component for over-budget visualization.
 * Shows detailed overspending information when hovering over over-budget data points.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 * 
 * @param {Object} props
 * @param {boolean} props.active - Whether tooltip is active
 * @param {Array} props.payload - Recharts payload data
 * @param {string} props.label - Current day label
 * @param {Array} props.data - Full chart data for calculating stats
 * @param {boolean} props.isDark - Whether dark theme is active
 */
const EnhancedTooltip = ({ active, payload, label, data, isDark }) => {
  if (!active || !payload?.length) return null;
  
  const dayData = data.find(d => d.day === label);
  const stats = calculateOverspendStats(data, label);
  const isOverBudget = stats !== null;
  
  const typeNames = {
    holiday: 'Holiday',
    weekend: 'Weekend',
    weekday: 'Workday',
  };
  
  return (
    <div className="bg-white/95 dark:bg-gray-800/95 p-3 border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-xl backdrop-blur-md min-w-[180px]">
      {/* Header with day and adjustment badge */}
      <p className="font-bold text-gray-900 dark:text-white mb-2 text-sm flex items-center justify-between">
        Day {label}
        {dayData?.hasAdjustment && (
          <span className="px-1.5 py-0.5 bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400 text-[10px] font-bold rounded-lg ml-2">
            Adjusted
          </span>
        )}
      </p>
      
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider font-semibold">
        {typeNames[dayData?.dayType] || 'Unknown'}
      </p>
      
      {/* Over-budget section - Requirements 3.1, 3.2, 3.3, 3.4, 3.5 */}
      {isOverBudget && (
        <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          {/* OVER BUDGET label - Requirement 3.1 */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
              isDark 
                ? 'bg-red-900/50 text-red-400' 
                : 'bg-red-100 text-red-600'
            }`}>
              Over Budget
            </span>
          </div>
          
          {/* Overspend amount with + prefix - Requirement 3.2 */}
          <div className="flex items-baseline gap-1 mb-1">
            <span className={`text-lg font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              +¥{stats.overspendAmount.toLocaleString()}
            </span>
            {/* Overspend percentage - Requirement 3.3 */}
            {stats.overspendPercentage !== null && (
              <span className={`text-xs ${isDark ? 'text-red-400/80' : 'text-red-500'}`}>
                (+{stats.overspendPercentage.toFixed(1)}%)
              </span>
            )}
          </div>
          
          {/* First overspend day - Requirement 3.4 */}
          {stats.firstOverspendDay && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Started on: Day {stats.firstOverspendDay}
            </p>
          )}
          
          {/* Average daily overspend - Requirement 3.5 */}
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            Avg daily overspend: ¥{Math.round(stats.avgDailyOverspend).toLocaleString()}
          </p>
        </div>
      )}
      
      {/* Standard tooltip content - Budget and Spending values - Requirements 3.6, 3.7 */}
      <div className="space-y-2">
        {payload
          .filter(entry => entry.dataKey === 'budget' || entry.dataKey === 'spending')
          // Deduplicate spending entries (there may be multiple due to segmented line rendering)
          .filter((entry, index, arr) => {
            if (entry.dataKey === 'spending') {
              // Only keep the first spending entry
              return arr.findIndex(e => e.dataKey === 'spending') === index;
            }
            return true;
          })
          .map((entry, index) => {
            // Determine the correct color for spending (may be transparent due to segmented rendering)
            const displayColor = entry.dataKey === 'spending' && entry.color === 'transparent'
              ? (isDark ? '#f87171' : '#ef4444')
              : entry.color;
            
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: displayColor }} 
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {entry.name.replace('Cumulative ', '')}
                  </span>
                </div>
                <span 
                  className="text-sm font-bold" 
                  style={{ color: displayColor }}
                >
                  ¥{entry.value?.toLocaleString()}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
};

/**
 * Calculate overspending information at the latest day with spending data.
 * Returns the overspending amount and the latest data point if spending exceeds budget.
 * 
 * @param {Array} data - Filtered chart data with day, budget, spending properties
 * @returns {Object} { overspendingAmount, latestPoint, hasOverspending }
 */
function calculateOverspending(data) {
  // Find the latest data point that has spending data (not null)
  const pointsWithSpending = data.filter(d => d.spending !== null && d.spending !== undefined);
  
  if (pointsWithSpending.length === 0) {
    return { overspendingAmount: 0, latestPoint: null, hasOverspending: false };
  }
  
  const latestPoint = pointsWithSpending[pointsWithSpending.length - 1];
  const overspendingAmount = latestPoint.spending - latestPoint.budget;
  
  return {
    overspendingAmount: Math.max(0, overspendingAmount),
    latestPoint,
    hasOverspending: overspendingAmount > 0
  };
}

// Constants for Y-axis configuration
const Y_AXIS_WIDTH = 50;
const CHART_HEIGHT = 320;
const CHART_MARGIN = { top: 10, bottom: 20, left: 10, right: 10 };
const DEFAULT_TICK_COUNT = 5;

// Calculate Y-axis tick values
function calculateYAxisTicks(domain, tickCount = DEFAULT_TICK_COUNT) {
  const [min, max] = domain;
  if (max === min) return [min];
  const step = (max - min) / (tickCount - 1);
  return Array.from({ length: tickCount }, (_, i) => Math.round(min + step * i));
}

// Calculate tick Y position
function calculateTickPosition(value, domain, height, margin) {
  const [min, max] = domain;
  if (max === min) return margin.top;
  const chartHeight = height - margin.top - margin.bottom;
  const ratio = (max - value) / (max - min);
  return margin.top + ratio * chartHeight;
}

/**
 * Filter spending data to only show up to current day for current month.
 * For past months, returns data unchanged.
 * For current month, sets spending to null for future days.
 * 
 * @param {Array} data - Chart data with day, budget, spending properties
 * @param {Date} currentMonth - The month being viewed
 * @param {Date} [today] - Optional today's date (for testing)
 * @returns {Array} Filtered data with null spending for future days in current month
 */
function filterSpendingData(data, currentMonth, today = new Date()) {
  const currentDay = today.getDate();
  
  // Check if we're viewing the current month
  const viewingMonth = currentMonth ? new Date(currentMonth) : new Date();
  const isCurrentMonth = 
    viewingMonth.getFullYear() === today.getFullYear() && 
    viewingMonth.getMonth() === today.getMonth();
  
  // If not current month, return data as-is (show full spending line)
  if (!isCurrentMonth) {
    return data;
  }
  
  // For current month, set spending to null for future days
  return data.map((point) => ({
    ...point,
    spending: parseInt(point.day) > currentDay ? null : point.spending
  }));
}

/**
 * First Overspend Day Marker component.
 * Renders a red triangle warning marker on the X-axis at the first day where spending exceeds budget.
 * Includes a tooltip that shows "First day exceeding budget" on hover.
 * 
 * Requirements: 4.1, 4.2, 4.3
 * 
 * @param {Object} props
 * @param {number} props.x - X position offset from parent transform
 * @param {number} props.y - Y position offset from parent transform
 * @param {boolean} props.isDark - Whether dark theme is active
 * @param {boolean} props.isHovered - Whether the marker is being hovered
 * @param {Function} props.onMouseEnter - Mouse enter handler
 * @param {Function} props.onMouseLeave - Mouse leave handler
 */
const FirstOverspendMarker = ({ x = 0, y = -8, isDark, isHovered, onMouseEnter, onMouseLeave }) => {
  const colors = isDark ? OVER_BUDGET_COLORS.dark : OVER_BUDGET_COLORS.light;
  
  const tooltipWidth = 170;
  const tooltipHeight = 28;
  
  return (
    <g 
      transform={`translate(${x}, ${y})`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      {/* Red triangle pointing down - warning marker */}
      <polygon
        points="0,-6 5,4 -5,4"
        fill={colors.warningMarker}
        stroke={isDark ? '#1f2937' : '#ffffff'}
        strokeWidth={1}
        style={{
          filter: isHovered ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))' : 'none',
          transform: isHovered ? 'scale(1.2)' : 'scale(1)',
          transformOrigin: 'center',
          transition: 'transform 0.15s ease-out, filter 0.15s ease-out'
        }}
      />
      {/* Tooltip - Requirements 4.2 */}
      {isHovered && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Tooltip background */}
          <rect
            x={-tooltipWidth / 2}
            y={-tooltipHeight - 16}
            width={tooltipWidth}
            height={tooltipHeight}
            rx={6}
            ry={6}
            fill={isDark ? '#374151' : '#1f2937'}
            opacity={0.95}
          />
          {/* Tooltip arrow */}
          <polygon
            points="0,-16 6,-16 0,-8 -6,-16"
            fill={isDark ? '#374151' : '#1f2937'}
            opacity={0.95}
          />
          {/* Tooltip text */}
          <text
            x={0}
            y={-tooltipHeight / 2 - 14}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            fontSize="11"
            fontWeight="500"
          >
            First day exceeding budget
          </text>
        </g>
      )}
    </g>
  );
};

const CustomizedAxisTick = (props) => {
  const { x, y, payload, data, isDark, firstOverspendDay, onMarkerHover, isMarkerHovered } = props;
  const dayData = data.find(d => d.day === payload.value);
  const dayType = dayData?.dayType;
  const hasAdjustment = dayData?.hasAdjustment;

  const today = new Date().getDate();
  const isToday = parseInt(payload.value) === today;
  
  // Check if this tick is the first overspend day
  const isFirstOverspendDay = firstOverspendDay && firstOverspendDay.day === payload.value;

  let circleFill = 'none';
  let circleStroke = 'none';
  let textColor = 'currentColor';
  let showCircle = false;

  if (isToday) {
    showCircle = true;
    circleFill = isDark ? '#818cf8' : '#6366f1';
    circleStroke = isDark ? '#818cf8' : '#6366f1';
    textColor = '#ffffff';
  } else if (dayType === 'holiday') {
    showCircle = true;
    circleFill = 'none';
    circleStroke = isDark ? '#fca5a5' : '#f87171';
    textColor = isDark ? '#fca5a5' : '#f87171';
  } else if (dayType === 'weekend') {
    showCircle = true;
    circleFill = 'none';
    circleStroke = isDark ? '#93c5fd' : '#60a5fa';
    textColor = isDark ? '#93c5fd' : '#60a5fa';
  } else {
    textColor = isDark ? '#94a3b8' : '#64748b';
  }

  return (
    <g transform={`translate(${x},${y})`}>
      {showCircle && (
        <circle
          cx={0}
          cy={16}
          r={14}
          fill={circleFill}
          stroke={circleStroke}
          strokeWidth={isToday ? 0 : 2}
        />
      )}
      {hasAdjustment && (
        <circle
          cx={showCircle ? 10 : 10}
          cy={showCircle ? 6 : 6}
          r={3}
          fill={isDark ? '#c4b5fd' : '#a78bfa'}
        />
      )}
      {/* First Overspend Day Marker - Requirements 4.1, 4.3 */}
      {isFirstOverspendDay && (
        <FirstOverspendMarker
          x={0}
          y={-8}
          isDark={isDark}
          isHovered={isMarkerHovered}
          onMouseEnter={() => onMarkerHover && onMarkerHover(true, x)}
          onMouseLeave={() => onMarkerHover && onMarkerHover(false, null)}
        />
      )}
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        className="text-[10px] font-medium"
      >
        {payload.value}
      </text>
    </g>
  );
};

// Custom Sticky Y-Axis component
const StickyYAxis = ({ domain, height, isDark, margin }) => {
  const ticks = useMemo(() => calculateYAxisTicks(domain, DEFAULT_TICK_COUNT), [domain]);
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <svg width={Y_AXIS_WIDTH} height={height}>
      {ticks.map((tick, index) => {
        const yPos = calculateTickPosition(tick, domain, height, margin);
        return (
          <text
            key={index}
            x={Y_AXIS_WIDTH - 8}
            y={yPos}
            textAnchor="end"
            dominantBaseline="middle"
            fill={textColor}
            className="text-[10px]"
          >
            {tick.toLocaleString()}
          </text>
        );
      })}
    </svg>
  );
};

const BudgetLineChart = memo(function BudgetLineChart({ data, maxSpending, onBudgetClick, currentMonth }) {
  const containerRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // State for first overspend marker tooltip
  const [markerHoverState, setMarkerHoverState] = useState({ isHovered: false, x: null });

  // Y-axis domain
  const yDomain = useMemo(() => [0, maxSpending > 0 ? maxSpending : 1000], [maxSpending]);

  // Filter spending data to only show up to current day for current month
  const filteredData = useMemo(() => {
    return filterSpendingData(data, currentMonth);
  }, [data, currentMonth]);

  // Calculate overspending information at the latest day
  const overspendingInfo = useMemo(() => {
    return calculateOverspending(filteredData);
  }, [filteredData]);

  // Calculate over-budget area data for visualization
  const overBudgetAreaData = useMemo(() => {
    return calculateOverBudgetArea(filteredData);
  }, [filteredData]);

  // Find first overspend day for marker
  const firstOverspendDay = useMemo(() => {
    return findFirstOverspendDay(filteredData);
  }, [filteredData]);

  // Check if there's any over-budget data to display
  const hasOverBudgetArea = useMemo(() => {
    return overBudgetAreaData.some(d => d.overBudget !== null && d.overBudget > 0);
  }, [overBudgetAreaData]);

  // Handler for first overspend marker hover
  const handleMarkerHover = useCallback((isHovered, x) => {
    setMarkerHoverState({ isHovered, x });
  }, []);

  // Prepare chart data with over-budget values merged
  // For the stacked area approach: we use budget as base and overBudget as the additional amount
  const chartDataWithOverBudget = useMemo(() => {
    return filteredData.map((point, index) => {
      const overBudgetValue = overBudgetAreaData[index]?.overBudget ?? null;
      const isOverBudget = point.spending !== null && point.spending > point.budget;
      
      return {
        ...point,
        overBudget: overBudgetValue,
        // For stacked area: budget is the base, overBudgetDiff is the amount above budget
        // This creates a stacked effect where the pattern only fills the difference
        overBudgetDiff: isOverBudget ? overBudgetValue : 0,
        // Budget value for the base area (transparent, just for stacking)
        budgetBase: point.budget
      };
    });
  }, [filteredData, overBudgetAreaData]);

  // Get theme colors
  const overBudgetColors = isDark ? OVER_BUDGET_COLORS.dark : OVER_BUDGET_COLORS.light;

  const handleClick = (e) => {
    if (e && e.activeLabel && onBudgetClick) {
      const currentDayIndex = filteredData.findIndex(d => d.day === e.activeLabel);
      const prevBudget = currentDayIndex > 0 ? filteredData[currentDayIndex - 1].budget : 0;
      const dailyBudget = filteredData[currentDayIndex].budget - prevBudget;

      onBudgetClick(e.activeLabel, dailyBudget);
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      const today = new Date().getDate();
      const containerWidth = containerRef.current.scrollWidth;
      const clientWidth = containerRef.current.clientWidth;
      const itemWidth = containerWidth / filteredData.length;
      const scrollPosition = (today - 1) * itemWidth - clientWidth / 2 + itemWidth / 2;

      containerRef.current.scrollTo({
        left: Math.max(0, Math.min(scrollPosition, containerWidth - clientWidth)),
        behavior: 'smooth',
      });
    }
  }, [filteredData.length]);

  const [scrollbarState, setScrollbarState] = useState({ left: 0, thumbWidth: 0, isVisible: false });
  const trackRef = useRef(null);
  const scrollbarRaf = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  const updateScrollbar = useCallback(() => {
    if (containerRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = containerRef.current;
      const isVisible = scrollWidth > clientWidth + 1; // Use a small buffer
      const thumbWidth = Math.max((clientWidth / scrollWidth) * 100, 10);
      const left = scrollWidth > clientWidth
        ? (scrollLeft / (scrollWidth - clientWidth)) * (100 - thumbWidth)
        : 0;
      if (scrollbarRaf.current) {
        cancelAnimationFrame(scrollbarRaf.current);
      }
      scrollbarRaf.current = requestAnimationFrame(() => {
        setScrollbarState(prev => {
          if (prev.left === left && prev.thumbWidth === thumbWidth && prev.isVisible === isVisible) {
            return prev;
          }
          return { left, thumbWidth, isVisible };
        });
      });
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current || !trackRef.current) return;

    const deltaX = e.clientX - startX.current;
    const { scrollWidth, clientWidth } = containerRef.current;
    if (scrollWidth <= clientWidth) return;

    const trackWidth = trackRef.current.clientWidth;
    const availableTrackWidth = trackWidth * (1 - scrollbarState.thumbWidth / 100);
    const availableScrollWidth = scrollWidth - clientWidth;

    if (availableTrackWidth > 0) {
      const scrollDelta = (deltaX / availableTrackWidth) * availableScrollWidth;
      containerRef.current.scrollLeft = startScrollLeft.current + scrollDelta;
    }
  }, [scrollbarState.thumbWidth]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  // Store handleMouseUp in a ref so we can reference it in cleanup
  const handleMouseUpRef = useRef(handleMouseUp);
  useEffect(() => {
    handleMouseUpRef.current = handleMouseUp;
  }, [handleMouseUp]);

  const handleThumbMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    startX.current = e.clientX;
    startScrollLeft.current = containerRef.current.scrollLeft;
    
    const onMouseUp = () => {
      handleMouseUpRef.current();
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.userSelect = 'none';
  }, [handleMouseMove]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      updateScrollbar();
      container.addEventListener('scroll', updateScrollbar);
      window.addEventListener('resize', updateScrollbar);

      // Observer to detect content size changes
      const observer = new ResizeObserver(updateScrollbar);
      observer.observe(container);
      if (container.firstChild) observer.observe(container.firstChild);

      return () => {
        container.removeEventListener('scroll', updateScrollbar);
        window.removeEventListener('resize', updateScrollbar);
        document.removeEventListener('mousemove', handleMouseMove);
        observer.disconnect();
      };
    }
  }, [updateScrollbar, handleMouseMove]);

  useEffect(() => {
    updateScrollbar();
  }, [updateScrollbar, filteredData.length]);

  useEffect(() => {
    return () => {
      if (scrollbarRaf.current) {
        cancelAnimationFrame(scrollbarRaf.current);
      }
    };
  }, []);

  const handleScrollbarClick = (e) => {
    if (isDragging.current) return;
    if (containerRef.current && trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const clickPos = (e.clientX - rect.left) / rect.width;
      const { scrollWidth, clientWidth } = containerRef.current;

      if (scrollWidth <= clientWidth) return;

      const thumbWidthRatio = clientWidth / scrollWidth;
      const targetScrollRatio = (clickPos - thumbWidthRatio / 2) / (1 - thumbWidthRatio);
      const targetScroll = Math.max(0, Math.min(targetScrollRatio * (scrollWidth - clientWidth), scrollWidth - clientWidth));

      containerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group">
      {/* Outer Flex Container - Task 1.1 */}
      <div className="relative flex">
        {/* Sticky Y-Axis Area - Task 1.1, 1.2 */}
        <div
          className="sticky left-0 z-10 bg-white dark:bg-gray-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]"
          style={{ height: `${CHART_HEIGHT}px` }}
        >
          <StickyYAxis
            domain={yDomain}
            height={CHART_HEIGHT}
            isDark={isDark}
            margin={CHART_MARGIN}
          />
        </div>

        {/* Scrollable Chart Content Area - Task 1.1, 1.3 */}
        <div
          className="overflow-x-auto flex-1 scrollbar-hide"
          ref={containerRef}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style dangerouslySetInnerHTML={{
            __html: `
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}} />
          <div style={{ minWidth: `${filteredData.length * 60}px`, height: `${CHART_HEIGHT}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDataWithOverBudget} margin={CHART_MARGIN} onClick={handleClick} style={{ cursor: 'pointer' }}>
                {/* SVG Pattern for over-budget area fill */}
                <OverBudgetAreaPattern isDark={isDark} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-800" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  tick={<CustomizedAxisTick 
                    data={filteredData} 
                    isDark={isDark} 
                    firstOverspendDay={firstOverspendDay}
                    onMarkerHover={handleMarkerHover}
                    isMarkerHovered={markerHoverState.isHovered}
                  />}
                  height={50}
                />
                {/* Task 1.3: Hide native Y-Axis */}
                <YAxis
                  domain={yDomain}
                  hide={true}
                  width={0}
                />
                {/* Over-budget area fill using stacked areas - Requirements 1.1, 1.2, 1.5
                    The stacked approach:
                    1. budgetBase area (transparent) provides the baseline up to budget
                    2. overBudgetDiff area (with pattern) stacks on top, showing only the difference
                    This ensures only the region where spending > budget is filled with the pattern */}
                {hasOverBudgetArea && (
                  <>
                    {/* Invisible base area up to budget line - provides stacking baseline */}
                    <Area
                      type="monotone"
                      dataKey="budgetBase"
                      stackId="overbudget"
                      stroke="none"
                      fill="transparent"
                      fillOpacity={0}
                      isAnimationActive={false}
                    />
                    {/* Over-budget difference area with diagonal stripe pattern */}
                    <Area
                      type="monotone"
                      dataKey="overBudgetDiff"
                      stackId="overbudget"
                      stroke="none"
                      fill="url(#overBudgetPattern)"
                      fillOpacity={1}
                      isAnimationActive={false}
                    />
                  </>
                )}
                <Tooltip
                  content={({ active, payload, label }) => (
                    <EnhancedTooltip
                      active={active}
                      payload={payload}
                      label={label}
                      data={chartDataWithOverBudget}
                      isDark={isDark}
                    />
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                  name="Cumulative Budget"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="spending"
                  stroke={overBudgetColors.lineNormal}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, stroke: overBudgetColors.lineNormal, strokeWidth: 2, fill: '#fff' }}
                  name="Cumulative Spending"
                  // Use custom line rendering for segmented styles
                  // The actual segmented rendering is handled by the custom shape
                  {...(hasOverBudgetArea && {
                    stroke: 'transparent',
                    // Custom line component for segmented styling
                  })}
                  isAnimationActive={false}
                />
                {/* Custom segmented spending line for over-budget visualization */}
                {hasOverBudgetArea && (
                  <Line
                    type="monotone"
                    dataKey="spending"
                    stroke="transparent"
                    strokeWidth={0}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    // Custom shape to render segmented line
                    // eslint-disable-next-line react/no-unstable-nested-components
                    shape={(props) => (
                      <SegmentedSpendingLine 
                        points={props.points} 
                        data={chartDataWithOverBudget}
                        isDark={isDark}
                      />
                    )}
                  />
                )}
                {/* Overspending indicator - dots on the lines and badge */}
                {overspendingInfo.hasOverspending && overspendingInfo.latestPoint && (
                  <>
                    {/* Red dot on spending line with badge */}
                    <ReferenceDot
                      x={overspendingInfo.latestPoint.day}
                      y={overspendingInfo.latestPoint.spending}
                      r={6}
                      fill={isDark ? '#f87171' : '#ef4444'}
                      stroke="#fff"
                      strokeWidth={2}
                      label={({ viewBox }) => {
                        const amountText = `+¥${overspendingInfo.overspendingAmount.toLocaleString()}`;
                        const badgeWidth = amountText.length * 9 + 20;
                        const badgeHeight = 26;
                        
                        return (
                          <g>
                            {/* Badge background */}
                            <rect
                              x={viewBox.x + 14}
                              y={viewBox.y - badgeHeight / 2}
                              width={badgeWidth}
                              height={badgeHeight}
                              rx={badgeHeight / 2}
                              ry={badgeHeight / 2}
                              fill={isDark ? '#dc2626' : '#ef4444'}
                            />
                            {/* Badge text */}
                            <text
                              x={viewBox.x + 14 + badgeWidth / 2}
                              y={viewBox.y + 1}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#ffffff"
                              fontSize="13"
                              fontWeight="700"
                            >
                              {amountText}
                            </text>
                          </g>
                        );
                      }}
                    />
                    {/* Green dot on budget line */}
                    <ReferenceDot
                      x={overspendingInfo.latestPoint.day}
                      y={overspendingInfo.latestPoint.budget}
                      r={6}
                      fill={isDark ? '#34d399' : '#10b981'}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Custom Premium Scrollbar */}
      {scrollbarState.isVisible && (
        <div className="mt-4 px-4 pb-2">
          <div
            ref={trackRef}
            className="relative h-1.5 w-full bg-gray-100 dark:bg-gray-800/50 rounded-full cursor-pointer group/track"
            onClick={handleScrollbarClick}
          >
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300 ease-out group-hover/track:from-violet-400 group-hover/track:to-purple-400 shadow-[0_0_10px_rgba(139,92,246,0.3)] cursor-grab active:cursor-grabbing"
              style={{
                left: `${scrollbarState.left}%`,
                width: `${scrollbarState.thumbWidth}%`
              }}
              onMouseDown={handleThumbMouseDown}
            />
          </div>
        </div>
      )}
    </div>
  );
});

// Export utility functions for testing
// eslint-disable-next-line react-refresh/only-export-components
export { 
  calculateYAxisTicks, 
  calculateTickPosition, 
  filterSpendingData, 
  calculateOverspending,
  OVER_BUDGET_COLORS,
  OverBudgetAreaPattern,
  SegmentedSpendingLine,
  EnhancedTooltip,
  FirstOverspendMarker,
  BudgetLineChart
};
