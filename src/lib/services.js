import { supabase } from './supabase.js';
import { BUDGET_RULES } from './constants.js';

const pad2 = (value) => String(value).padStart(2, '0');
const buildBeijingDateTime = (dateStr, timeStr) =>
  timeStr ? `${dateStr}T${timeStr}:00+08:00` : `${dateStr}T00:00:00+08:00`;
const getBeijingNow = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now);
  const map = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}+08:00`;
};
const buildBeijingMonthRange = (year, month) => {
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = pad2(month);
  return {
    start: `${year}-${monthStr}-01T00:00:00+08:00`,
    end: `${year}-${monthStr}-${pad2(lastDay)}T23:59:59+08:00`,
  };
};

export class ExpenseService {
  static async getExpensesByMonth(year, month) {
    const { start, end } = buildBeijingMonthRange(year, month);

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
      .gte('transaction_datetime', start)
      .lte('transaction_datetime', end)
      .order('transaction_datetime', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async createExpense(expense) {
    const { date, time, ...rest } = expense;
    const datetime = buildBeijingDateTime(date, time);
    const nowBeijing = getBeijingNow();
    
    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        ...rest,
        transaction_datetime: datetime,
        created_at: nowBeijing,
        updated_at: nowBeijing,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateExpense(id, updates) {
    const { date, time, ...rest } = updates;
    const updateData = { ...rest };
    updateData.updated_at = getBeijingNow();
    
    if (date) {
      updateData.transaction_datetime = buildBeijingDateTime(date, time);
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
    const { start, end } = buildBeijingMonthRange(year, month);
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
      .gte('transaction_datetime', start)
      .lte('transaction_datetime', end)
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
