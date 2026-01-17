import { SupabaseClient } from '@supabase/supabase-js';

export interface Transaction {
  id: string;
  user_id: string;
  source_email: string;
  source_message_id: string;
  amount: number;
  currency: string;
  transaction_type: 'income' | 'expense';
  transaction_description: string;
  transaction_date: string;
  merchant?: string;
  extraction_confidence: number;
  created_at: string;
}

export class TransactionsService {
  constructor(private supabase: SupabaseClient) {}

  async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (error) throw error;
  }
}

// Factory function to create service instance
export function createTransactionsService(supabase: SupabaseClient) {
  return new TransactionsService(supabase);
}
