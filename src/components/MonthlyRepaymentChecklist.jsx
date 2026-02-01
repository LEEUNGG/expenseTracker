import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, format, isAfter, isBefore, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { DebtService } from '../lib/debtService';

export function MonthlyRepaymentChecklist({ debts, repaymentSchedule, minDate, maxDate }) {
  const [monthDate, setMonthDate] = useState(new Date());
  const [paidMap, setPaidMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!debts.length) return;
    const currentMonth = startOfMonth(new Date());
    const minMonth = startOfMonth(minDate);
    const maxMonth = startOfMonth(maxDate);
    let nextDate = currentMonth;
    if (isBefore(currentMonth, minMonth)) nextDate = minMonth;
    if (isAfter(currentMonth, maxMonth)) nextDate = maxMonth;
    setMonthDate(nextDate);
  }, [debts, maxDate, minDate]);

  const canGoPrev = isAfter(startOfMonth(monthDate), startOfMonth(minDate));
  const canGoNext = isBefore(startOfMonth(monthDate), startOfMonth(maxDate));

  const handlePrevMonth = () => {
    if (canGoPrev) setMonthDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    if (canGoNext) setMonthDate(prev => addMonths(prev, 1));
  };

  const monthKey = useMemo(() => format(startOfMonth(monthDate), 'yyyy-MM-01'), [monthDate]);

  useEffect(() => {
    let active = true;
    const loadStatuses = async () => {
      setIsLoading(true);
      try {
        const data = await DebtService.getRepaymentStatuses(monthKey);
        if (!active) return;
        const nextMap = {};
        (data || []).forEach(row => {
          nextMap[row.debt_key] = !!row.is_paid;
        });
        setPaidMap(nextMap);
      } catch {
        if (active) setPaidMap({});
      } finally {
        if (active) setIsLoading(false);
      }
    };
    if (monthKey) loadStatuses();
    return () => {
      active = false;
    };
  }, [monthKey]);

  const currentMonthItems = useMemo(() => {
    if (!debts.length) return [];
    const currentMonthData = debts.find(d => isSameMonth(new Date(d.month_date), monthDate));
    if (!currentMonthData) return [];
    return repaymentSchedule
      .map(item => ({
        ...item,
        amount: Number(currentMonthData[item.key]) || 0
      }))
      .filter(item => item.amount > 0)
      .sort((a, b) => a.day - b.day);
  }, [debts, monthDate, repaymentSchedule]);

  const monthlyTotal = useMemo(() => currentMonthItems.reduce((sum, item) => sum + item.amount, 0), [currentMonthItems]);

  const togglePaid = async (debtKey) => {
    const nextValue = !paidMap[debtKey];
    setPaidMap(prev => ({ ...prev, [debtKey]: nextValue }));
    try {
      await DebtService.upsertRepaymentStatus({
        month_date: monthKey,
        debt_key: debtKey,
        is_paid: nextValue
      });
    } catch {
      setPaidMap(prev => ({ ...prev, [debtKey]: !nextValue }));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Monthly Repayment Checklist</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">Track paid items by month</div>
        </div>
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
            {format(monthDate, 'MMM yyyy')}
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

      <div className="bg-gradient-to-br from-blue-50/60 to-white dark:from-gray-900/40 dark:to-gray-800/20 rounded-2xl border border-blue-100/70 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">This Month</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{format(monthDate, 'MMMM yyyy')}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs px-2.5 py-1 rounded-full bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-gray-700 text-blue-600 dark:text-blue-300 font-medium">
              {currentMonthItems.length} items
            </div>
            <div className="text-xs px-2.5 py-1 rounded-full bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium">
              Total ¥{monthlyTotal.toLocaleString()}
            </div>
          </div>
        </div>

        {currentMonthItems.length === 0 ? (
          <div className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">No repayments scheduled this month</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentMonthItems.map((item) => {
              const isPaid = !!paidMap[item.key];
              return (
                <label
                  key={item.key}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    isPaid
                      ? 'bg-emerald-50/70 dark:bg-emerald-900/20 border-emerald-200/70 dark:border-emerald-900/50'
                      : 'bg-white/80 dark:bg-gray-800/80 border-gray-200/70 dark:border-gray-700 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={() => togglePaid(item.key)}
                      disabled={isLoading}
                      className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                    />
                    <div>
                      <div className={`text-sm font-semibold ${isPaid ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-200'}`}>
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Due on {item.day}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${isPaid ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-600 dark:text-blue-400'}`}>
                    ¥{item.amount.toLocaleString()}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
