import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Save, Edit2, X, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { MonthlyService } from '../lib/monthlyService';
import { MonthlyTrendChart } from '../components/charts/MonthlyTrendChart';
import { MonthlySummaryChart } from '../components/charts/MonthlySummaryChart';
import { useToast } from '../components/Toast';
import { Skeleton } from '../components/Skeleton';

// Helper to get month name
const getMonthName = (monthNum) => {
  const date = new Date();
  date.setMonth(monthNum - 1);
  return date.toLocaleString('default', { month: 'long' });
};

export function MonthlySpendingPage() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [reviews, setReviews] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingReview, setIsSavingReview] = useState(null); // month number or null
  const [selectedMonth, setSelectedMonth] = useState(null); // Currently selected month for review
  const { addToast } = useToast();

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const [statsData, reviewsData] = await Promise.all([
        MonthlyService.getMonthlyStats(currentYear),
        MonthlyService.getMonthlyReviews(currentYear)
      ]);
      setMonthlyStats(statsData || []);

      const reviewsMap = {};
      if (reviewsData) {
        reviewsData.forEach(r => {
          // Parse YYYY-MM-DD to get month safely
          if (r.month_date) {
            const parts = r.month_date.split('-');
            if (parts.length >= 2) {
              const month = parseInt(parts[1], 10);
              reviewsMap[month] = r.review || '';
            }
          }
        });
      }
      setReviews(reviewsMap);
      
      // Default select current month or the latest available month
      const currentMonth = new Date().getMonth() + 1;
      if (statsData && statsData.length > 0) {
          // Try to find current month in stats, otherwise pick the last one
          const hasCurrentMonth = statsData.find(s => s.month === currentMonth);
          if (hasCurrentMonth) {
              setSelectedMonth(currentMonth);
          } else {
              setSelectedMonth(statsData[statsData.length - 1].month);
          }
      }
    } catch (err) {
      console.error('Failed to fetch monthly stats:', err);
      addToast('Failed to fetch monthly statistics', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [currentYear]);

  const handleReviewChange = (month, value) => {
    setReviews(prev => ({
      ...prev,
      [month]: value
    }));
  };

  const handleSaveReview = async (month) => {
    setIsSavingReview(month);
    try {
      await MonthlyService.updateMonthlyReview(currentYear, month, reviews[month]);
      addToast('Review saved successfully');
    } catch (err) {
      console.error('Failed to save review:', err);
      addToast('Failed to save review', 'error');
    } finally {
      setIsSavingReview(null);
    }
  };

  const handlePreviousYear = () => {
    if (currentYear > 2026) {
      setCurrentYear(prev => prev - 1);
    }
  };

  const handleNextYear = () => {
    const maxYear = new Date().getFullYear();
    if (currentYear < maxYear) {
      setCurrentYear(prev => prev + 1);
    }
  };

  const totalYearlySpending = useMemo(() => {
    return monthlyStats.reduce((sum, item) => sum + (item.total_spending || 0), 0);
  }, [monthlyStats]);
  
  // Find data for selected month
  const selectedMonthData = useMemo(() => {
      return monthlyStats.find(s => s.month === selectedMonth);
  }, [monthlyStats, selectedMonth]);

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/50">
          <button
            onClick={handlePreviousYear}
            disabled={currentYear <= 2026}
            className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <span className="text-lg font-bold w-20 text-center tabular-nums bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            {currentYear}
          </span>
          <button
            onClick={handleNextYear}
            disabled={currentYear >= new Date().getFullYear()}
            className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="p-2 bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-xl transition-all duration-300 backdrop-blur-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh data"
        >
          <RefreshCw className={`w-5 h-5 text-gray-700 dark:text-gray-200 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-[400px] rounded-3xl" />
          <Skeleton className="h-[400px] rounded-3xl" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Spending ({currentYear})</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ¥{totalYearlySpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="space-y-6">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-100">Monthly Spending Trend</h3>
              <MonthlyTrendChart data={monthlyStats} />
            </div>

            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-2">
                Daily Budget Performance Summary
              </h3>
              <MonthlySummaryChart data={monthlyStats} />
            </div>

            {/* Monthly Reviews Section - Master-Detail Layout */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl overflow-hidden shadow-lg border border-white/20 dark:border-gray-700/50 flex flex-col md:flex-row min-h-[500px]">
              
              {/* Sidebar Navigation */}
              <div className="w-full md:w-64 bg-white/50 dark:bg-gray-800/50 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    Monthly Reviews
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {[...monthlyStats].reverse().map(stat => (
                    <button
                      key={stat.month}
                      onClick={() => setSelectedMonth(stat.month)}
                      className={`
                        w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group
                        ${selectedMonth === stat.month 
                          ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 shadow-sm' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                        }
                      `}
                    >
                      <span className="font-medium">{getMonthName(stat.month)}</span>
                      <div className="flex items-center gap-2">
                        {stat.days_over_budget > 0 ? (
                          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" title="Over Budget" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" title="On Track" />
                        )}
                      </div>
                    </button>
                  ))}
                  {monthlyStats.length === 0 && (
                      <div className="p-4 text-sm text-gray-400 text-center italic">No data available</div>
                  )}
                </div>
              </div>

              {/* Detail View */}
              <div className="flex-1 p-6 md:p-8 flex flex-col">
                {selectedMonth && selectedMonthData ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-gray-100 dark:border-gray-700">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                          {getMonthName(selectedMonth)} Review
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Analyze your spending behavior and plan for next month.
                        </p>
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Spending</div>
                          <div className="font-bold text-gray-900 dark:text-white text-lg">
                            ¥{selectedMonthData.total_spending?.toLocaleString()}
                          </div>
                        </div>
                        <div className="w-px bg-gray-200 dark:bg-gray-700 h-10 self-center"></div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Budget</div>
                          <div className="font-bold text-gray-900 dark:text-white text-lg">
                            ¥{selectedMonthData.total_budget?.toLocaleString()}
                          </div>
                        </div>
                        <div className="w-px bg-gray-200 dark:bg-gray-700 h-10 self-center"></div>
                         <div className="text-right">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</div>
                          <div className={`font-bold text-lg flex items-center gap-1 ${
                            selectedMonthData.days_over_budget > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {selectedMonthData.days_over_budget > 0 ? (
                                <>
                                    <TrendingUp className="w-4 h-4" />
                                    Over
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="w-4 h-4" />
                                    Good
                                </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Your Notes & Reflections
                      </label>
                      <textarea
                        value={reviews[selectedMonth] || ''}
                        onChange={(e) => handleReviewChange(selectedMonth, e.target.value)}
                        placeholder="What went well this month? Where did you overspend? Any specific events?"
                        className="flex-1 w-full p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-0 ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-violet-500/50 transition-all resize-none outline-none leading-relaxed text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
                      />
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={() => handleSaveReview(selectedMonth)}
                          disabled={isSavingReview === selectedMonth}
                          className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-95"
                        >
                          {isSavingReview === selectedMonth ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Save className="w-5 h-5" />
                          )}
                          Save Notes
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                        <Edit2 className="w-8 h-8 opacity-50" />
                    </div>
                    <p>Select a month to view or edit review</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
