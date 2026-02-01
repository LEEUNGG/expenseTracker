import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ReferenceLine
} from 'recharts';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { DebtService } from '../lib/debtService';
import { 
  format, isSameMonth, addMonths, subMonths, startOfMonth, 
  isAfter, isBefore, getDaysInMonth 
} from 'date-fns';
import { Skeleton, SkeletonLineChart } from './Skeleton';
import { MonthlyRepaymentChecklist } from './MonthlyRepaymentChecklist';
import { MORANDI_THEME } from '../lib/chartTheme';

// Skeleton component for a chart card
function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full">
      <Skeleton className="h-6 w-48 mb-6" />
      <div className="h-[300px] flex items-end space-x-2">
         <SkeletonLineChart />
      </div>
    </div>
  );
}

export function DebtDashboard() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timelineDate, setTimelineDate] = useState(new Date());

  useEffect(() => {
    loadDebts();
  }, []);

  async function loadDebts() {
    try {
      setLoading(true);
      const data = await DebtService.getAllDebts();
      setDebts(data || []);
      
      // Initialize timelineDate to current month, but respect bounds if needed
      // Current requirement: First month 2026-01.
      // We'll stick to current date initially, navigation logic will handle bounds.
    } catch (err) {
      console.error('Failed to load debts:', err);
      setError('Failed to load debt data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  // Process data for charts
  const chartData = useMemo(() => {
    if (!debts.length) return [];

    const sorted = [...debts].sort((a, b) => new Date(a.month_date) - new Date(b.month_date));
    
    return sorted.map((item, index) => {
      const currentDebt = Number(item.monthly_total_debt) || 0;
      const remainingDebt = sorted.slice(index + 1).reduce((sum, d) => sum + (Number(d.monthly_total_debt) || 0), 0);
      const monthLabel = item.month_date ? format(new Date(item.month_date), 'MMM yyyy') : 'Unknown';

      return {
        ...item,
        monthLabel,
        currentDebt,
        remainingDebt,
        totalDisplayed: currentDebt + remainingDebt,
        netCashFlow: Number(item.net_cash_flow) || 0
      };
    });
  }, [debts]);

  const repaymentSchedule = useMemo(() => ([
    { name: 'CMB', day: 13, key: 'cmb' },
    { name: 'TIKTOK', day: 13, key: 'tiktok' },
    { name: 'ALI_HUA', day: 20, key: 'ali_hua' },
    { name: 'JD_WHITE', day: 23, key: 'jd_white' },
    { name: 'ALI_JIE', day: 26, key: 'ali_jie' },
    { name: 'JD_GOLD', day: 26, key: 'jd_gold' },
  ]), []);

  // Custom Tooltip for Monthly Repayment Chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 min-w-[200px]">
          <p className="font-bold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700 mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
              <span className="text-sm font-bold" style={{ color: MORANDI_THEME.charts.debt.current }}>¥{data.currentDebt.toLocaleString()}</span>
            </div>
            {repaymentSchedule.map((item) => {
              const amount = Number(data[item.key]) || 0;
              if (amount === 0) return null;
              return (
                <div key={item.key} className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-300">{item.name}</span>
                  <span className="font-medium text-gray-900 dark:text-white">¥{amount.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Min/Max Dates
  const minDate = useMemo(() => new Date(2026, 0, 1), []);
  const maxDate = useMemo(() => {
    if (!debts.length) return new Date();
    const dates = debts.map(d => new Date(d.month_date));
    return dates.length ? new Date(Math.max(...dates)) : new Date();
  }, [debts]);

  const canGoPrev = isAfter(startOfMonth(timelineDate), startOfMonth(minDate));
  const canGoNext = isBefore(startOfMonth(timelineDate), startOfMonth(maxDate));

  useEffect(() => {
    if (!debts.length) return;
    const currentMonth = startOfMonth(new Date());
    const minMonth = startOfMonth(minDate);
    const maxMonth = startOfMonth(maxDate);
    let nextDate = currentMonth;
    if (isBefore(currentMonth, minMonth)) nextDate = minMonth;
    if (isAfter(currentMonth, maxMonth)) nextDate = maxMonth;
    setTimelineDate(nextDate);
  }, [debts, maxDate, minDate]);

  const handlePrevMonth = () => {
    if (canGoPrev) setTimelineDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    if (canGoNext) setTimelineDate(prev => addMonths(prev, 1));
  };

  // Group by day to handle overlaps - Dynamic based on selected month
  const timelineData = useMemo(() => {
    if (!debts.length) return [];
    
    // Find data for current selected month
    const currentMonthData = debts.find(d => isSameMonth(new Date(d.month_date), timelineDate));
    if (!currentMonthData) return [];

    const groups = {};
    
    repaymentSchedule.forEach(item => {
      const amount = Number(currentMonthData[item.key]) || 0;
      if (!groups[item.day]) {
        groups[item.day] = [];
      }
      groups[item.day].push({ name: item.name, amount });
    });

    return Object.entries(groups).map(([day, items]) => ({
      day: parseInt(day),
      items,
      count: items.length
    })).sort((a, b) => a.day - b.day);
  }, [debts, timelineDate, repaymentSchedule]);

  // Beijing Time Today
  const todayBJ = useMemo(() => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const bjOffset = 8 * 60 * 60000;
    return new Date(utc + bjOffset);
  }, []);

  const isTodayInView = isSameMonth(todayBJ, timelineDate);
  const todayDay = todayBJ.getDate();
  const daysInMonth = getDaysInMonth(timelineDate);

  // Merge repayment data with Today for unified rendering
  const timelineItems = useMemo(() => {
    let items = [...timelineData];
    
    if (isTodayInView) {
      const existingItemIndex = items.findIndex(item => item.day === todayDay);
      if (existingItemIndex !== -1) {
        // Today is also a repayment day - mark it
        items[existingItemIndex] = { ...items[existingItemIndex], isToday: true };
      } else {
        // Today is not a repayment day - add it
        items.push({
          day: todayDay,
          items: [],
          count: 0,
          isToday: true
        });
      }
    }
    
    return items.sort((a, b) => a.day - b.day);
  }, [timelineData, isTodayInView, todayDay]);

  if (loading) {
    return (
      <div className="p-6 space-y-8 max-w-7xl mx-auto pb-24">
         <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-[300px]">
                <Skeleton className="h-6 w-64 mb-12" />
                <div className="relative h-[100px] flex items-center justify-center">
                    <Skeleton className="w-full h-1 rounded-full" />
                </div>
            </div>
         </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-red-500 gap-2">
        <AlertCircle className="w-8 h-8" />
        <p>{error}</p>
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
        <p className="text-lg">No debt data found.</p>
        <p className="text-sm">Please ensure the debt table is populated in Supabase.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Debt Overview</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BI 1: Monthly Total Debt */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Monthly Repayment Plan</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="monthLabel" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `¥${value}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="currentDebt" name="Monthly Repayment" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BI 2: Accumulative Debt (Remaining) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Remaining Debt Structure</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="monthLabel" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `¥${value}`} />
                <Tooltip 
                  formatter={(value) => `¥${value.toLocaleString()}`}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                {/* Stacked Bars: Current (Bottom) + Future (Top) */}
                <Bar 
                  dataKey="currentDebt" 
                  name="Current Month to Pay" 
                  stackId="a" 
                  fill="#3b82f6" 
                  radius={[0, 0, 0, 0]} 
                  barSize={32}
                />
                <Bar 
                  dataKey="remainingDebt" 
                  name="Future Debt" 
                  stackId="a" 
                  fill="#93c5fd" 
                  radius={[6, 6, 0, 0]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BI 3: Net Cash Flow */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Net Cash Flow</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="monthLabel" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `¥${value}`} />
                <Tooltip 
                  formatter={(value) => `¥${value.toLocaleString()}`}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <ReferenceLine y={0} stroke="#000" strokeOpacity={0.1} />
                <Line 
                  type="monotone" 
                  dataKey="netCashFlow" 
                  name="Net Cash Flow" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BI 4: Repayment Timeline (Refactored) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Monthly Repayment Schedule</h2>
            
            {/* Month Navigation */}
            <div className="flex items-center space-x-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-1">
              <button 
                onClick={handlePrevMonth}
                disabled={!canGoPrev}
                className={`p-1 rounded-md transition-colors ${
                  canGoPrev 
                    ? 'hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 shadow-sm' 
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium w-24 text-center text-gray-900 dark:text-white">
                {format(timelineDate, 'MMM yyyy')}
              </span>
              <button 
                onClick={handleNextMonth}
                disabled={!canGoNext}
                className={`p-1 rounded-md transition-colors ${
                  canGoNext 
                    ? 'hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 shadow-sm' 
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative h-[150px] flex items-center px-4 mt-8 select-none">
            {/* Timeline Line */}
            <div className="absolute left-4 right-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            
            {/* Start/End Labels - Moved to bottom */}
            <div className="absolute left-4 top-10 text-xs font-medium text-gray-400">1st</div>
            <div className="absolute right-4 top-10 text-xs font-medium text-gray-400">
              {format(new Date(timelineDate.getFullYear(), timelineDate.getMonth(), daysInMonth), 'do')}
            </div>

            {/* Combined Timeline Points */}
            {timelineItems.map((group) => {
              const percent = ((group.day - 1) / daysInMonth) * 100;
              const isToday = group.isToday;
              const hasDebt = group.count > 0;
              
              // Circle Color: Red if Today, otherwise Blue
              const bgColor = isToday ? MORANDI_THEME.semantic.danger : MORANDI_THEME.semantic.primary;
              
              return (
                <div 
                  key={group.day}
                  className="absolute flex flex-col items-center group z-20"
                  style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
                >
                  {/* Unified Circle Component */}
                  <div 
                    className={`
                      w-8 h-8 rounded-full border-4 shadow-md flex items-center justify-center transition-transform hover:scale-110 cursor-pointer
                      border-white dark:border-gray-800
                    `}
                    style={{ backgroundColor: bgColor }}
                  >
                    {hasDebt ? (
                      <span className="text-xs font-bold text-white">{group.count}</span>
                    ) : (
                      // If it's just "Today" with no debt, show a small dot or nothing inside
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  
                  {/* Axis Date Label / Today Label */}
                  <div className={`absolute top-10 text-xs font-medium ${isToday ? 'text-red-500 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                    {group.day}
                  </div>

                  {/* Hover Details (Only if has debt) */}
                  {hasDebt && (
                    <div className="absolute bottom-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 w-max min-w-[120px]">
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 pb-1 border-b border-gray-100 dark:border-gray-700">
                          {format(new Date(timelineDate.getFullYear(), timelineDate.getMonth(), group.day), 'MMM do')}
                        </div>
                        <div className="space-y-2">
                          {group.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center gap-4">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">¥{item.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="w-3 h-3 bg-white dark:bg-gray-800 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b border-gray-100 dark:border-gray-700"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-16 text-center text-xs text-gray-400 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Repayment Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Today</span>
            </div>
          </div>

        </div>

        <MonthlyRepaymentChecklist
          debts={debts}
          repaymentSchedule={repaymentSchedule}
          minDate={minDate}
          maxDate={maxDate}
        />

      </div>
    </div>
  );
}
