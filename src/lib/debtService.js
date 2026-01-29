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
