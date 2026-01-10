import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

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

const CustomizedAxisTick = (props) => {
  const { x, y, payload, data, isDark } = props;
  const dayData = data.find(d => d.day === payload.value);
  const dayType = dayData?.dayType;
  const hasAdjustment = dayData?.hasAdjustment;

  const today = new Date().getDate();
  const isToday = parseInt(payload.value) === today;

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

export function BudgetLineChart({ data, maxSpending, onBudgetClick, currentMonth }) {
  const containerRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Y-axis domain
  const yDomain = useMemo(() => [0, maxSpending > 0 ? maxSpending : 1000], [maxSpending]);

  // Filter spending data to only show up to current day for current month
  const filteredData = useMemo(() => {
    return filterSpendingData(data, currentMonth);
  }, [data, currentMonth]);

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
      setScrollbarState({ left, thumbWidth, isVisible });
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
  }, [updateScrollbar, filteredData.length, handleMouseMove]);

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
              <LineChart data={filteredData} margin={CHART_MARGIN} onClick={handleClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-800" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  tick={<CustomizedAxisTick data={filteredData} isDark={isDark} />}
                  height={50}
                />
                {/* Task 1.3: Hide native Y-Axis */}
                <YAxis
                  domain={yDomain}
                  hide={true}
                  width={0}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dayData = filteredData.find(d => d.day === label);
                      const typeNames = {
                        holiday: 'Holiday',
                        weekend: 'Weekend',
                        weekday: 'Workday',
                      };
                      return (
                        <div className="bg-white/95 dark:bg-gray-800/95 p-3 border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-xl backdrop-blur-md min-w-[160px]">
                          <p className="font-bold text-gray-900 dark:text-white mb-2 text-sm flex items-center justify-between">
                            Day {label}
                            {dayData?.hasAdjustment && (
                              <span className="px-1.5 py-0.5 bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400 text-[10px] font-bold rounded-lg ml-2">Adjusted</span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider font-semibold">{typeNames[dayData?.dayType] || 'Unknown'}</p>
                          <div className="space-y-2">
                            {payload.map((entry, index) => (
                              <div key={index} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-xs text-gray-600 dark:text-gray-300">{entry.name.replace('Cumulative ', '')}</span>
                                </div>
                                <span className="text-sm font-bold" style={{ color: entry.color }}>¥{entry.value.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                  name="Cumulative Budget"
                />
                <Line
                  type="monotone"
                  dataKey="spending"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                  name="Cumulative Spending"
                />
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
}

// Export utility functions for testing
// eslint-disable-next-line react-refresh/only-export-components
export { calculateYAxisTicks, calculateTickPosition, filterSpendingData };
