import { useState, useEffect, useMemo, useCallback } from 'react';
import { Menu, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { MonthSelector } from './components/MonthSelector';
import { BudgetLineChart } from './components/charts/BudgetLineChart';
import { CategoryPieChart } from './components/charts/CategoryPieChart';
import { EssentialPieChart } from './components/charts/EssentialPieChart';
import { ExpenseTable } from './components/ExpenseTable';
import { AIExpenseModal } from './components/AIExpenseModal';
import { ConfirmModal } from './components/ConfirmModal';
import { Sidebar } from './components/Sidebar';
import { ExpenseService, CategoryService, BudgetService } from './lib/services';
import { getDayType } from './lib/holidayUtils';
import { useToast } from './components/Toast';
import { Skeleton, SkeletonLineChart, SkeletonPieChart, SkeletonTable } from './components/Skeleton';

function App() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgetAdjustments, setBudgetAdjustments] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.transaction_datetime);
      return expenseDate.getFullYear() === currentYear &&
        expenseDate.getMonth() === currentMonthNum - 1;
    });
  }, [expenses, currentYear, currentMonthNum]);

  const chartData = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
    const dailyBudgets = BudgetService.calculateDailyBudget(currentYear, currentMonthNum, budgetAdjustments, holidays);
    const accumulativeBudgets = BudgetService.calculateAccumulativeBudget(dailyBudgets);

    const holidayMap = new Map(holidays.map(h => [h.date, h.type]));
    const adjustmentsMap = new Map(budgetAdjustments.map(a => [a.date, true]));

    const dailySpending = new Array(daysInMonth).fill(0);
    filteredExpenses.forEach(expense => {
      const day = new Date(expense.transaction_datetime).getDate() - 1;
      dailySpending[day] += parseFloat(expense.amount);
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
    const categoryTotals = {};
    filteredExpenses.forEach(expense => {
      const category = categories.find(c => c.id === expense.category_id);
      const categoryName = category ? `${category.emoji} ${category.name}` : 'Unknown';
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + parseFloat(expense.amount);
    });

    return Object.entries(categoryTotals).map(([name, value]) => {
      const category = categories.find(c => `${c.emoji} ${c.name}` === name);
      return {
        name,
        value: Math.round(value * 100) / 100,
        color: category ? category.color : '#3b82f6',
      };
    });
  }, [filteredExpenses, categories]);

  const essentialChartData = useMemo(() => {
    let essentialTotal = 0;
    let nonEssentialTotal = 0;

    filteredExpenses.forEach(expense => {
      if (expense.is_essential) {
        essentialTotal += parseFloat(expense.amount);
      } else {
        nonEssentialTotal += parseFloat(expense.amount);
      }
    });

    return [
      { name: 'Essential', value: Math.round(essentialTotal * 100) / 100 },
      { name: 'Non-essential', value: Math.round(nonEssentialTotal * 100) / 100 },
    ];
  }, [filteredExpenses]);

  const maxSpending = useMemo(() => {
    const allValues = chartData.flatMap(d => [d.budget, d.spending]);
    return Math.max(...allValues, 1000);
  }, [chartData]);

  // 获取分类数据（只在组件挂载时获取一次）
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await CategoryService.getAllCategories();
        setCategories(data || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setError('Failed to fetch category data');
      }
    };
    fetchCategories();
  }, []);

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
        setExpenses(expensesData || []);
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
  }, [currentYear, currentMonthNum]);

  // 刷新当月消费数据
  const refreshExpenses = useCallback(async () => {
    try {
      const data = await ExpenseService.getExpensesByMonth(currentYear, currentMonthNum);
      setExpenses(data || []);
    } catch (err) {
      console.error('Failed to refresh expense data:', err);
    }
  }, [currentYear, currentMonthNum]);

  // Handle manual refresh data button click
  const handleRefreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [expensesData, budgetData, holidaysData] = await Promise.all([
        ExpenseService.getExpensesByMonth(currentYear, currentMonthNum),
        BudgetService.getBudgetAdjustments(currentYear, currentMonthNum),
        BudgetService.getHolidays(currentYear, currentMonthNum),
      ]);
      setExpenses(expensesData || []);
      setBudgetAdjustments(budgetData || []);
      setHolidays(holidaysData || []);
      addToast('Data refreshed successfully');
    } catch (err) {
      console.error('Failed to refresh data:', err);
      addToast('Failed to refresh data, please try again', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    const minMonth = new Date(2026, 0, 1);
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);

    if (newMonth >= minMonth) {
      setCurrentMonth(newMonth);
      setSelectedExpenseIds([]);
    }
  };

  const handleNextMonth = () => {
    const maxMonth = new Date();
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);

    if (newMonth <= maxMonth) {
      setCurrentMonth(newMonth);
      setSelectedExpenseIds([]);
    }
  };

  const handleCreateExpense = async (expense) => {
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
  };

  const handleUpdateExpense = async (id, updates) => {
    try {
      await ExpenseService.updateExpense(id, updates);
      await refreshExpenses();
      addToast('Expense record updated successfully');
    } catch (err) {
      console.error('Failed to update expense:', err);
      addToast('Failed to update expense, please try again', 'error');
    }
  };

  const handleDeleteExpense = async (id) => {
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
  };

  const handleBatchDelete = async () => {
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
  };

  const handleAIConfirm = async (items) => {
    try {
      for (const item of items) {
        await ExpenseService.createExpense({
          ...item,
          amount: parseFloat(item.amount),
          time: item.time || null, // Pass time field for transaction_datetime
        });
      }
      await refreshExpenses();
      addToast(`${items.length} records entered from AI successfully`);
    } catch (err) {
      console.error('AI entry failed:', err);
      addToast('AI entry failed, please try again', 'error');
    }
  };

  const handleBudgetAdjust = async (day, currentBudget) => {
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

        // Refresh budget adjustments
        const budgetData = await BudgetService.getBudgetAdjustments(currentYear, currentMonthNum);
        setBudgetAdjustments(budgetData || []);
        addToast(`Budget for Day ${day} updated and saved to database`);
      } catch (err) {
        console.error('Failed to update budget:', err);
        addToast('Failed to update budget', 'error');
      }
    }
  };

  const handleCategoryUpdate = async (id, updates) => {
    try {
      await CategoryService.updateCategory(id, updates);
      const data = await CategoryService.getAllCategories();
      setCategories(data || []);
      addToast('Category updated successfully');
    } catch (err) {
      console.error('Failed to update category:', err);
      addToast('Failed to update category, please try again', 'error');
    }
  };

  const handleCategoryDelete = async (id) => {
    try {
      await CategoryService.deleteCategory(id);
      const data = await CategoryService.getAllCategories();
      setCategories(data || []);
      addToast('Category deleted successfully');
    } catch (err) {
      console.error('Failed to delete category:', err);
      addToast('Failed to delete category, please try again', 'error');
    }
  };

  const handleCategoryCreate = async (category) => {
    try {
      await CategoryService.createCategory(category);
      const data = await CategoryService.getAllCategories();
      setCategories(data || []);
      addToast('New category created successfully');
    } catch (err) {
      console.error('Failed to create category:', err);
      addToast('Failed to create category, please try again', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        categories={categories.filter(c => !c.is_deleted)}
        onCategoryUpdate={handleCategoryUpdate}
        onCategoryDelete={handleCategoryDelete}
        onCategoryCreate={handleCategoryCreate}
      />

      <div>
        <header className="sticky top-0 z-20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border-b border-white/20 dark:border-gray-700/50 shadow-lg">
          <div className="w-[80%] mx-auto px-2 sm:px-0">
            <div className="flex flex-wrap items-center justify-between gap-2 min-h-[4rem] py-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 backdrop-blur-sm flex-shrink-0"
                >
                  <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </button>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap truncate">Expense Tracker</h1>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleRefreshData}
                  disabled={isLoading}
                  className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-700 dark:text-gray-200 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="w-[80%] mx-auto py-8">
          <div className="space-y-8">
            <div className="flex justify-center">
              <MonthSelector
                currentMonth={currentMonth}
                onPrevious={handlePreviousMonth}
                onNext={handleNextMonth}
              />
            </div>

            {/* 错误提示 */}
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

            {/* 加载状态 */}
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
                    categories={categories.filter(c => !c.is_deleted)}
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
          </div>
        </main>
      </div>

      <AIExpenseModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onConfirm={handleAIConfirm}
        categories={categories.filter(c => !c.is_deleted)}
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

export default App;
