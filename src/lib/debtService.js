import { supabase } from './supabase';

export const DebtService = {
  async getAllDebts() {
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .order('month_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async getRepaymentStatuses(monthDate) {
    const { data, error } = await supabase
      .from('debt_repayment_statuses')
      .select('*')
      .eq('month_date', monthDate);

    if (error) throw error;
    return data;
  },

  async upsertRepaymentStatus(status) {
    const { data, error } = await supabase
      .from('debt_repayment_statuses')
      .upsert({
        ...status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'month_date,debt_key' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateDebt(id, updates) {
    const { data, error } = await supabase
      .from('debts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};
