import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { MonthSelector } from '../components/MonthSelector';
import { BudgetLineChart } from '../components/charts/BudgetLineChart';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { EssentialPieChart } from '../components/charts/EssentialPieChart';
import { ExpenseTable } from '../components/ExpenseTable';
import { AIExpenseModal } from '../components/AIExpenseModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { ExpenseService, BudgetService } from '../lib/services';
import { extractDateTimeFromTimestamp } from '../lib/deduplicationService';
import { getDayType } from '../lib/holidayUtils';
import { useToast } from '../components/Toast';
import { Skeleton, SkeletonLineChart, SkeletonPieChart, SkeletonTable } from '../components/Skeleton';

export function ExpenseDashboardPage({ categories }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expenses, setExpenses] = useState([]);
  const [budgetAdjustments, setBudgetAdjustments] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });
  const { addToast } = useToast();

  const normalizeExpenses = useCallback((data) => {
    if (!Array.isArray(data)) return [];
    return data.map(expense => {
      let dateStr = null;
      if (expense?.transaction_datetime && typeof expense.transaction_datetime === 'string') {
        const extracted = extractDateTimeFromTimestamp(expense.transaction_datetime);
        if (extracted?.date) {
          dateStr = extracted.date;
        }
      }
      if (!dateStr && expense?.date) {
        dateStr = expense.date;
      }
      let dateObj = null;
      let year = null;
      let month = null;
      let day = null;
      if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [yearNum, monthNum, dayNum] = dateStr.split('-').map(Number);
        if (Number.isFinite(yearNum) && Number.isFinite(monthNum) && Number.isFinite(dayNum)) {
          year = yearNum;
          month = monthNum - 1;
          day = dayNum;
          dateObj = new Date(yearNum, monthNum - 1, dayNum);
        }
      } else {
        const fallbackSource = expense?.transaction_datetime || expense?.date;
        if (fallbackSource) {
          const fallbackDate = new Date(fallbackSource);
          if (!Number.isNaN(fallbackDate.getTime())) {
            year = fallbackDate.getFullYear();
            month = fallbackDate.getMonth();
            day = fallbackDate.getDate();
            dateObj = fallbackDate;
            const monthStr = String(month + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            dateStr = `${year}-${monthStr}-${dayStr}`;
          }
        }
      }
      const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount);

      return {
        ...expense,
        _dateObj: dateObj,
        _year: year,
        _month: month,
        _day: day,
        _dateISO: dateStr,
        _amount: Number.isFinite(amount) ? amount : 0,
      };
    });
  }, []);

  const activeCategories = useMemo(() => categories.filter(c => !c.is_deleted), [categories]);
  const categoryById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Helper function to show confirmation modal
  const showConfirmModal = useCallback(({ title, message, onConfirm }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  }, []);

  // Helper function to close confirmation modal
  const closeConfirmModal = useCallback(() => {
    setConfirmModal(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const currentYear = currentMonth.getFullYear();
  const currentMonthNum = currentMonth.getMonth() + 1;

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => (
      expense._year === currentYear && expense._month === currentMonthNum - 1
    ));
  }, [expenses, currentYear, currentMonthNum]);

  const chartData = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
    const dailyBudgets = BudgetService.calculateDailyBudget(currentYear, currentMonthNum, budgetAdjustments, holidays);
    const accumulativeBudgets = BudgetService.calculateAccumulativeBudget(dailyBudgets);

    const holidayMap = new Map(holidays.map(h => [h.date, h.type]));
    const adjustmentsMap = new Map(budgetAdjustments.map(a => [a.date, true]));

    const dailySpending = new Array(daysInMonth).fill(0);
    filteredExpenses.forEach(expense => {
      const day = (expense._day ?? new Date(expense.transaction_datetime).getDate()) - 1;
      dailySpending[day] += expense._amount;
    });

    let accumulativeSpending = 0;
    const accumulativeSpendingData = dailySpending.map(spending => {
      accumulativeSpending += spending;
      return accumulativeSpending;
    });

    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(currentYear, currentMonthNum - 1, i + 1);
      const yearLocal = date.getFullYear();
      const monthLocal = String(date.getMonth() + 1).padStart(2, '0');
      const dayLocal = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yearLocal}-${monthLocal}-${dayLocal}`;

      return {
        day: i + 1,
        budget: accumulativeBudgets[i],
        spending: accumulativeSpendingData[i],
        dayType: getDayType(date, holidayMap),
        hasAdjustment: adjustmentsMap.has(dateStr),
      };
    }).map(item => ({
      ...item,
      budget: Math.round(item.budget * 100) / 100,
      spending: Math.round(item.spending * 100) / 100,
    }));
  }, [currentYear, currentMonthNum, filteredExpenses, budgetAdjustments, holidays]);

  const categoryChartData = useMemo(() => {
    const categoryTotals = new Map();

    filteredExpenses.forEach(expense => {
      const category = categoryById.get(expense.category_id);
      const key = category ? category.id : 'unknown';
      const current = categoryTotals.get(key) || {
        name: category ? `${category.emoji} ${category.name}` : 'Unknown',
        value: 0,
        color: category ? category.color : '#3b82f6',
      };

      current.value += expense._amount;
      categoryTotals.set(key, current);
    });

    return Array.from(categoryTotals.values()).map(item => ({
      ...item,
      value: Math.round(item.value * 100) / 100,
    }));
  }, [filteredExpenses, categoryById]);

  const essentialChartData = useMemo(() => {
    let essentialTotal = 0;
    let nonEssentialTotal = 0;

    filteredExpenses.forEach(expense => {
      if (expense.is_essential) {
        essentialTotal += expense._amount;
      } else {
        nonEssentialTotal += expense._amount;
      }
    });

    return [
      { name: 'Essential', value: Math.round(essentialTotal * 100) / 100 },
      { name: 'Non-essential', value: Math.round(nonEssentialTotal * 100) / 100 },
    ];
  }, [filteredExpenses]);

  const maxSpending = useMemo(() => {
    const allValues = chartData.flatMap(d => [d.budget, d.spending]).filter(v => Number.isFinite(v));
    const maxValue = allValues.length ? Math.max(...allValues, 1000) : 1000;
    return Math.ceil(maxValue / 1000) * 1000;
  }, [chartData]);

  // 获取消费记录和预算调整（当月份变化时重新获取）
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [expensesData, budgetData, holidaysData] = await Promise.all([
          ExpenseService.getExpensesByMonth(currentYear, currentMonthNum),
          BudgetService.getBudgetAdjustments(currentYear, currentMonthNum),
          BudgetService.getHolidays(currentYear, currentMonthNum),
        ]);
        setExpenses(normalizeExpenses(expensesData || []));
        setBudgetAdjustments(budgetData || []);
        setHolidays(holidaysData || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to fetch data, please check your network connection');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentYear, currentMonthNum, normalizeExpenses]);

  // 刷新当月消费数据
  const refreshExpenses = useCallback(async () => {
    try {
      const data = await ExpenseService.getExpensesByMonth(currentYear, currentMonthNum);
      setExpenses(normalizeExpenses(data || []));
    } catch (err) {
      console.error('Failed to refresh expense data:', err);
    }
  }, [currentYear, currentMonthNum, normalizeExpenses]);

  // Handle manual refresh data button click
  const handleRefreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [expensesData, budgetData, holidaysData] = await Promise.all([
        ExpenseService.getExpensesByMonth(currentYear, currentMonthNum),
        BudgetService.getBudgetAdjustments(currentYear, currentMonthNum),
        BudgetService.getHolidays(currentYear, currentMonthNum),
      ]);
      setExpenses(normalizeExpenses(expensesData || []));
      setBudgetAdjustments(budgetData || []);
      setHolidays(holidaysData || []);
      addToast('Data refreshed successfully');
    } catch (err) {
      console.error('Failed to refresh data:', err);
      addToast('Failed to refresh data, please try again', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast, currentMonthNum, currentYear, normalizeExpenses]);

  const handlePreviousMonth = useCallback(() => {
    const minMonth = new Date(2026, 0, 1);
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);

    if (newMonth >= minMonth) {
      setCurrentMonth(newMonth);
      setSelectedExpenseIds([]);
    }
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    const maxMonth = new Date();
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);

    if (newMonth <= maxMonth) {
      setCurrentMonth(newMonth);
      setSelectedExpenseIds([]);
    }
  }, [currentMonth]);

  const handleCreateExpense = useCallback(async (expense) => {
    try {
      await ExpenseService.createExpense(expense);
      await refreshExpenses();
      addToast('New expense record created successfully');
    } catch (err) {
      console.error('CRITICAL: Failed to create expense record!', {
        error: err,
        expense: expense,
        message: err.message,
        details: err.details,
        hint: err.hint
      });
      addToast('Failed to create expense, please try again', 'error');
    }
  }, [addToast, refreshExpenses]);

  const handleUpdateExpense = useCallback(async (id, updates) => {
    try {
      await ExpenseService.updateExpense(id, updates);
      await refreshExpenses();
      addToast('Expense record updated successfully');
    } catch (err) {
      console.error('Failed to update expense:', err);
      addToast('Failed to update expense, please try again', 'error');
    }
  }, [addToast, refreshExpenses]);

  const handleDeleteExpense = useCallback(async (id) => {
    showConfirmModal({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense record?',
      onConfirm: async () => {
        try {
          await ExpenseService.deleteExpense(id);
          setSelectedExpenseIds(prev => prev.filter(sid => sid !== id));
          await refreshExpenses();
          addToast('Expense record deleted successfully');
        } catch (err) {
          console.error('Failed to delete expense:', err);
          addToast('Failed to delete expense, please try again', 'error');
        }
      },
    });
  }, [addToast, refreshExpenses, showConfirmModal]);

  const handleBatchDelete = useCallback(async () => {
    const count = selectedExpenseIds.length;
    showConfirmModal({
      title: 'Delete Multiple Expenses',
      message: `Are you sure you want to delete ${count} selected records?`,
      onConfirm: async () => {
        try {
          await ExpenseService.deleteExpenses(selectedExpenseIds);
          setSelectedExpenseIds([]);
          await refreshExpenses();
          addToast(`${count} records deleted successfully`);
        } catch (err) {
          console.error('Batch delete failed:', err);
          addToast('Batch delete failed, please try again', 'error');
        }
      },
    });
  }, [addToast, refreshExpenses, selectedExpenseIds, showConfirmModal]);

  const handleAIConfirm = useCallback(async (items) => {
    try {
      for (const item of items) {
        await ExpenseService.createExpense({
          ...item,
          amount: parseFloat(item.amount),
          time: item.time || null, 
        });
      }
      await refreshExpenses();
      addToast(`${items.length} records entered from AI successfully`);
    } catch (err) {
      console.error('AI entry failed:', err);
      addToast('AI entry failed, please try again', 'error');
    }
  }, [addToast, refreshExpenses]);

  const handleBudgetAdjust = useCallback(async (day, currentBudget) => {
    const newBudget = window.prompt(`Adjust daily budget for Day ${day}?`, currentBudget);
    if (newBudget !== null && !isNaN(parseFloat(newBudget))) {
      const date = new Date(currentYear, currentMonthNum - 1, day);
      const yearLocal = date.getFullYear();
      const monthLocal = String(date.getMonth() + 1).padStart(2, '0');
      const dayLocal = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yearLocal}-${monthLocal}-${dayLocal}`;

      try {
        await BudgetService.upsertBudgetAdjustment({
          date: dateStr,
          budget_amount: parseFloat(newBudget),
          reason: 'Manual adjustment from chart',
        });

        const budgetData = await BudgetService.getBudgetAdjustments(currentYear, currentMonthNum);
        setBudgetAdjustments(budgetData || []);
        addToast(`Budget for Day ${day} updated and saved to database`);
      } catch (err) {
        console.error('Failed to update budget:', err);
        addToast('Failed to update budget', 'error');
      }
    }
  }, [addToast, currentMonthNum, currentYear]);

  return (
    <div className="space-y-8 relative">
        {/* Floating Refresh Button - visible on top right of the content area */}
        <div className="absolute top-0 right-0 z-10">
           <button
             onClick={handleRefreshData}
             disabled={isLoading}
             className="p-2 bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-xl transition-all duration-300 backdrop-blur-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             title="Refresh data"
           >
             <RefreshCw className={`w-5 h-5 text-gray-700 dark:text-gray-200 ${isLoading ? 'animate-spin' : ''}`} />
           </button>
        </div>

      <div className="flex justify-center">
        <MonthSelector
          currentMonth={currentMonth}
          onPrevious={handlePreviousMonth}
          onNext={handleNextMonth}
        />
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="underline mt-1 hover:text-red-800 dark:hover:text-red-200"
          >
            Click to refresh page
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="lg:col-span-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
              <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-7 w-64" />
              </div>
              <SkeletonLineChart />
            </div>

            <div className="h-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
              <Skeleton className="h-7 w-48 mb-6" />
              <SkeletonPieChart />
            </div>

            <div className="h-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
              <Skeleton className="h-7 w-48 mb-6" />
              <SkeletonPieChart />
            </div>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
            <SkeletonTable />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="lg:col-span-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100 italic">Budget vs Spending Trend (Click day to adjust budget)</h3>
              <BudgetLineChart
                data={chartData}
                maxSpending={maxSpending}
                onBudgetClick={handleBudgetAdjust}
                currentMonth={currentMonth}
              />
            </div>

            <div className="h-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">Category Distribution</h3>
              <CategoryPieChart data={categoryChartData} />
            </div>

            <div className="h-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">Essential vs Non-essential</h3>
              <EssentialPieChart data={essentialChartData} />
            </div>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
            <ExpenseTable
              expenses={filteredExpenses}
              allExpenses={filteredExpenses}
              categories={activeCategories}
              currentMonth={currentMonth}
              onCreate={handleCreateExpense}
              onUpdate={handleUpdateExpense}
              onDelete={handleDeleteExpense}
              selectedIds={selectedExpenseIds}
              onSelectionChange={setSelectedExpenseIds}
              onBatchDelete={handleBatchDelete}
              onAIEntry={() => setIsAIModalOpen(true)}
            />
          </div>
        </>
      )}

      <AIExpenseModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onConfirm={handleAIConfirm}
        categories={activeCategories}
        currentMonth={currentMonth}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
}
