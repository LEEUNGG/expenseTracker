import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { MonthlyService } from '../lib/monthlyService';
import { MonthlyTrendChart } from '../components/charts/MonthlyTrendChart';
import { MonthlySummaryChart } from '../components/charts/MonthlySummaryChart';
import { useToast } from '../components/Toast';
import { Skeleton } from '../components/Skeleton';

export function MonthlySpendingPage() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await MonthlyService.getMonthlyStats(currentYear);
      setMonthlyStats(data || []);
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
              <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-100">Daily Budget Performance Summary</h3>
              <MonthlySummaryChart data={monthlyStats} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
