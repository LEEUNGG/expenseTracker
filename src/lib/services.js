import { supabase } from './supabase.js';
import { BUDGET_RULES } from './constants.js';

export class ExpenseService {
  static async getExpensesByMonth(year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        categories (
          id,
          name,
          emoji
        )
      `)
      .gte('transaction_datetime', startDate.toISOString())
      .lte('transaction_datetime', endDate.toISOString())
      .order('transaction_datetime', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async createExpense(expense) {
    // Combine date and time into transaction_datetime
    const { date, time, ...rest } = expense;
    const datetime = time 
      ? `${date}T${time}:00`
      : `${date}T00:00:00`;
    
    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        ...rest,
        transaction_datetime: datetime
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateExpense(id, updates) {
    // Convert date and time to transaction_datetime if present
    const { date, time, ...rest } = updates;
    const updateData = { ...rest };
    
    if (date) {
      const datetime = time 
        ? `${date}T${time}:00`
        : `${date}T00:00:00`;
      updateData.transaction_datetime = datetime;
    }
    
    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteExpense(id) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async deleteExpenses(ids) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .in('id', ids);

    if (error) throw error;
  }

  static async getExpensesPaginated(year, month, page = 1, pageSize = 10) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const offset = (page - 1) * pageSize;

    const { data, error, count } = await supabase
      .from('expenses')
      .select(`
        *,
        categories (
          id,
          name,
          emoji
        )
      `, { count: 'exact' })
      .gte('transaction_datetime', startDate.toISOString())
      .lte('transaction_datetime', endDate.toISOString())
      .order('transaction_datetime', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    return { data, count, totalPages: Math.ceil(count / pageSize) };
  }
}

export class CategoryService {
  static async getAllCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async createCategory(category) {
    const { data, error } = await supabase
      .from('categories')
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCategory(id, updates) {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteCategory(id) {
    const { error } = await supabase
      .from('categories')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) throw error;
  }
}

export class BudgetService {
  static async getBudgetAdjustments(year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { data, error } = await supabase
      .from('budget_adjustments')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async getHolidays(year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (error) throw error;
    return data;
  }

  static async upsertBudgetAdjustment(adjustment) {
    const { data, error } = await supabase
      .from('budget_adjustments')
      .upsert(adjustment, { onConflict: 'date' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createBudgetAdjustment(adjustment) {
    const { data, error } = await supabase
      .from('budget_adjustments')
      .insert([adjustment])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static calculateDailyBudget(year, month, adjustments = [], holidays = []) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const adjustmentsMap = new Map(
      adjustments.map(a => [a.date, parseFloat(a.budget_amount)])
    );

    const holidayMap = new Map(
      holidays.map(h => [h.date, h.type])
    );

    const dailyBudgets = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const yearLocal = date.getFullYear();
      const monthLocal = String(date.getMonth() + 1).padStart(2, '0');
      const dayLocal = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yearLocal}-${monthLocal}-${dayLocal}`;

      if (adjustmentsMap.has(dateStr)) {
        dailyBudgets.push(adjustmentsMap.get(dateStr));
      } else if (holidayMap.has(dateStr)) {
        const type = holidayMap.get(dateStr); // 'holiday' or 'workday'
        dailyBudgets.push(type === 'holiday' ? BUDGET_RULES.holiday : BUDGET_RULES.weekday);
      } else {
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        dailyBudgets.push(isWeekend ? BUDGET_RULES.weekend : BUDGET_RULES.weekday);
      }
    }

    return dailyBudgets;
  }

  static calculateAccumulativeBudget(dailyBudgets) {
    let total = 0;
    return dailyBudgets.map(budget => {
      total += budget;
      return total;
    });
  }
}
