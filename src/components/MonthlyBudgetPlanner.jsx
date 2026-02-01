import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay } from 'date-fns';
import { Save, RefreshCw, AlertCircle, Calendar } from 'lucide-react';
import { BudgetService, MonthlyPlanService } from '../lib/services';
import { BUDGET_RULES } from '../lib/constants';
import { useToast } from './Toast';

export function MonthlyBudgetPlanner({ currentDate, onPlanConfirmed }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [days, setDays] = useState([]);
  const [batchConfig, setBatchConfig] = useState({
    weekday: BUDGET_RULES.weekday,
    weekend: BUDGET_RULES.weekend,
    holiday: BUDGET_RULES.holiday,
  });
  const { addToast } = useToast();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const totalBudget = days.reduce((sum, day) => sum + (parseFloat(day.amount) || 0), 0);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get holidays
      const holidays = await BudgetService.getHolidays(year, month);
      const holidayMap = new Map(holidays.map(h => [h.date, h]));

      // 2. Get existing adjustments (if any, to pre-fill draft)
      const adjustments = await BudgetService.getBudgetAdjustments(year, month);
      const adjustmentsMap = new Map(adjustments.map(a => [a.date, a]));

      // 3. Generate days
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const interval = eachDayOfInterval({ start, end });

      const dayData = interval.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOfWeek = date.getDay();
        const isWknd = isWeekend(date);
        
        let type = 'weekday';
        let defaultBudget = BUDGET_RULES.weekday;
        let note = '';

        // Check holiday
        if (holidayMap.has(dateStr)) {
          const h = holidayMap.get(dateStr);
          if (h.type === 'holiday') {
            type = 'holiday';
            defaultBudget = BUDGET_RULES.holiday;
            note = h.name;
          } else if (h.type === 'workday') {
            type = 'workday'; // Adjusted workday
            defaultBudget = BUDGET_RULES.weekday; // Usually 100 for adjusted workdays
            note = `${h.name} (Adjusted)`;
          }
        } else if (isWknd) {
          type = 'weekend';
          defaultBudget = BUDGET_RULES.weekend;
        }

        // Check existing adjustment (override)
        const adjustment = adjustmentsMap.get(dateStr);
        const amount = adjustment ? parseFloat(adjustment.budget_amount) : defaultBudget;

        return {
          date: dateStr,
          displayDate: format(date, 'd'),
          dayName: format(date, 'EEE'),
          type,
          amount,
          note: adjustment?.reason || note,
          isDefault: !adjustment,
          originalDefault: defaultBudget
        };
      });

      setDays(dayData);
    } catch (err) {
      console.error(err);
      addToast('Failed to load budget data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (index, value) => {
    const newDays = [...days];
    newDays[index].amount = parseFloat(value) || 0;
    setDays(newDays);
  };

  const handleNoteChange = (index, value) => {
    const newDays = [...days];
    newDays[index].note = value;
    setDays(newDays);
  };

  const handleBatchApply = () => {
    const newDays = days.map(day => {
      let newAmount = day.amount;
      // Map day types to batch config keys
      if (day.type === 'holiday') {
        newAmount = batchConfig.holiday;
      } else if (day.type === 'weekend') {
        newAmount = batchConfig.weekend;
      } else if (day.type === 'weekday' || day.type === 'workday') {
        newAmount = batchConfig.weekday;
      }
      return { ...day, amount: parseFloat(newAmount) };
    });
    setDays(newDays);
    addToast('Batch settings applied to all days', 'success');
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const dailyBudgets = days.map(d => ({
        date: d.date,
        amount: d.amount,
        note: d.note // Include note in data
      }));

      await MonthlyPlanService.confirmPlan(year, month, dailyBudgets);
      addToast('Monthly budget plan confirmed!', 'success');
      if (onPlanConfirmed) onPlanConfirmed();
    } catch (err) {
      console.error(err);
      addToast('Failed to save plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-violet-100 dark:bg-violet-900/30 rounded-full mb-4">
          <Calendar className="w-8 h-8 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Plan Your {format(currentDate, 'MMMM')} Budget
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
          Please review and confirm your daily spending limits. Once confirmed, you commit to sticking to these numbers for the month.
        </p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> You cannot access the daily spending dashboard until this plan is confirmed.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
           <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
             <RefreshCw className="w-4 h-4" /> Batch Settings
           </h3>
           <div className="flex flex-wrap gap-4 items-end">
             <div>
               <label className="block text-xs text-gray-500 mb-1 dark:text-gray-400">Weekdays</label>
               <input 
                 type="number" 
                 value={batchConfig.weekday}
                 onChange={(e) => setBatchConfig(p => ({...p, weekday: e.target.value}))}
                 className="w-24 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-violet-500 focus:border-violet-500"
               />
             </div>
             <div>
               <label className="block text-xs text-gray-500 mb-1 dark:text-gray-400">Weekends</label>
               <input 
                 type="number" 
                 value={batchConfig.weekend}
                 onChange={(e) => setBatchConfig(p => ({...p, weekend: e.target.value}))}
                 className="w-24 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-violet-500 focus:border-violet-500"
               />
             </div>
             <div>
               <label className="block text-xs text-gray-500 mb-1 dark:text-gray-400">Holidays</label>
               <input 
                 type="number" 
                 value={batchConfig.holiday}
                 onChange={(e) => setBatchConfig(p => ({...p, holiday: e.target.value}))}
                 className="w-24 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:ring-violet-500 focus:border-violet-500"
               />
             </div>
             <button
               onClick={handleBatchApply}
               className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium transition-colors"
             >
               Apply to All
             </button>
           </div>
        </div>
        
        <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-xl border border-violet-200 dark:border-violet-800 flex flex-col justify-center items-center shadow-sm">
          <span className="text-sm text-violet-600 dark:text-violet-300 font-medium mb-1">Total Monthly Budget</span>
          <span className="text-3xl font-bold text-violet-700 dark:text-violet-200">¥{totalBudget.toLocaleString()}</span>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-300">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Budget</th>
                <th className="px-6 py-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {days.map((day, index) => (
                <tr 
                  key={day.date} 
                  className={`bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                    ${day.type === 'weekend' ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}
                    ${day.type === 'holiday' ? 'bg-red-50/30 dark:bg-red-900/10' : ''}
                  `}
                >
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-base">{day.displayDate}</span>
                      <span className="text-xs text-gray-500">{day.dayName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${day.type === 'weekend' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' : ''}
                      ${day.type === 'holiday' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' : ''}
                      ${day.type === 'weekday' || day.type === 'workday' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : ''}
                    `}>
                      {day.type === 'workday' ? 'Workday' : 
                       day.type === 'holiday' ? 'Holiday' : 
                       day.type === 'weekend' ? 'Weekend' : 'Weekday'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative rounded-md shadow-sm max-w-[120px]">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-500 sm:text-sm">¥</span>
                      </div>
                      <input
                        type="number"
                        value={day.amount}
                        onChange={(e) => handleAmountChange(index, e.target.value)}
                        className="block w-full rounded-md border-0 py-1.5 pl-7 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-violet-600 sm:text-sm sm:leading-6 dark:bg-gray-900 dark:text-white dark:ring-gray-700"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    {day.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-4 sticky bottom-6">
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 shadow-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Reset to Defaults
        </button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {submitting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          Confirm Plan
        </button>
      </div>
    </div>
  );
}
