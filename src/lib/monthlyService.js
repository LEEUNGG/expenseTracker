import { supabase } from './supabase';
import { ExpenseService, BudgetService } from './services';

export class MonthlyService {
  static async getMonthlyStats(year) {
    try {
      // 1. Try to use the SQL function (RPC)
      const { data, error } = await supabase.rpc('get_monthly_stats', { year_input: year });
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('RPC get_monthly_stats failed, falling back to client-side calculation:', err);
      return this.calculateMonthlyStatsClientSide(year);
    }
  }

  static async calculateMonthlyStatsClientSide(year) {
    // Fetch all necessary data for the year in parallel
    const [expenses, adjustments, holidays] = await Promise.all([
      ExpenseService.getExpensesByYear(year),
      BudgetService.getBudgetAdjustmentsByYear(year),
      BudgetService.getHolidaysByYear(year)
    ]);

    // Group expenses by date
    // expenses: [{ amount, transaction_datetime }]
    const dailySpendingMap = new Map(); // dateStr -> totalAmount
    
    if (expenses) {
      expenses.forEach(e => {
        // Parse date to YYYY-MM-DD
        // Assuming transaction_datetime is ISO with timezone or we handle it
        const dt = new Date(e.transaction_datetime);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        
        const current = dailySpendingMap.get(dateStr) || 0;
        dailySpendingMap.set(dateStr, current + Number(e.amount));
      });
    }

    const results = [];

    // Iterate through months 1-12
    for (let month = 1; month <= 12; month++) {
      // Calculate daily budgets for this month
      // We need to filter adjustments and holidays for this month to pass to BudgetService.calculateDailyBudget
      
      const monthStr = String(month).padStart(2, '0');
      const monthPrefix = `${year}-${monthStr}`;
      
      const monthAdjustments = (adjustments || []).filter(a => a.date.startsWith(monthPrefix));
      const monthHolidays = (holidays || []).filter(h => h.date.startsWith(monthPrefix));
      
      const dailyBudgets = BudgetService.calculateDailyBudget(year, month, monthAdjustments, monthHolidays);
      
      let totalSpending = 0;
      let totalBudget = 0;
      let daysOver = 0;
      let daysUnder = 0;

      const daysInMonth = new Date(year, month, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${monthStr}-${dayStr}`;
        
        const budget = dailyBudgets[day - 1]; // dailyBudgets is 0-indexed array of amounts
        const spending = dailySpendingMap.get(dateStr) || 0;
        
        totalSpending += spending;
        totalBudget += budget;
        
        if (spending > budget) {
          daysOver++;
        } else {
          daysUnder++;
        }
      }

      results.push({
        month,
        total_spending: totalSpending,
        total_budget: totalBudget,
        days_over_budget: daysOver,
        days_under_budget: daysUnder
      });
    }

    return results;
  }

  static async getMonthlyReviews(year) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    
    const { data, error } = await supabase
      .from('monthly_plans')
      .select('month_date, review')
      .gte('month_date', start)
      .lte('month_date', end);

    if (error) {
      console.error('Error fetching monthly reviews:', error);
      return [];
    }
    return data;
  }

  static async updateMonthlyReview(year, month, review) {
    const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
    
    // Use upsert to handle both insert and update
    const { error } = await supabase
      .from('monthly_plans')
      .upsert({ 
        month_date: monthDate, 
        review,
        updated_at: new Date()
      }, { onConflict: 'month_date' });
      
    if (error) throw error;
  }
}
