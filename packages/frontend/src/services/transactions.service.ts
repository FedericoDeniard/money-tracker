import { SupabaseClient } from '@supabase/supabase-js';

export interface Transaction {
  id: string;
  user_oauth_token_id: string | null; // Reference to which Gmail account received this
  source_email: string;
  source_message_id: string;
  date: string; // Fecha y hora cuando se recibió el email
  amount: number;
  currency: string;
  transaction_type: 'ingreso' | 'egreso' | 'income' | 'expense';
  transaction_description: string;
  transaction_date: string; // Fecha de la transacción extraída por IA
  merchant: string;
  category: 'salary' | 'entertainment' | 'investment' | 'food' | 'transport' | 'services' | 'health' | 'education' | 'housing' | 'clothing' | 'other';
  created_at: string;
  // Joined from user_oauth_tokens
  recipient_email?: string; // Gmail email that received this transaction
}

export interface TransactionFilters {
  currency?: string;
  email?: string;
  category?: string;
  type?: 'income' | 'expense' | 'ingreso' | 'egreso' | 'all';
}

export class TransactionsService {
  constructor(private supabase: SupabaseClient) {}

  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    let query = this.supabase
      .from('transactions')
      .select(`
        *,
        user_oauth_tokens!user_oauth_token_id (
          gmail_email
        )
      `);

    // Apply filters
    if (filters?.currency && filters.currency !== 'all') {
      query = query.eq('currency', filters.currency);
    }

    if (filters?.email && filters.email !== 'all') {
      // First get the user_oauth_token_id for this email
      const { data: tokenData, error: tokenError } = await this.supabase
        .from('user_oauth_tokens')
        .select('id')
        .eq('gmail_email', filters.email)
        .eq('is_active', true)
        .single();

      if (tokenError) {
        return [];
      }

      if (tokenData) {
        query = query.eq('user_oauth_token_id', tokenData.id);
      } else {
        // If no token found for this email, return empty result
        return [];
      }
    }

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters?.type && filters.type !== 'all') {
      if (filters.type === 'income' || filters.type === 'ingreso') {
        query = query.in('transaction_type', ['income', 'ingreso']);
      } else if (filters.type === 'expense' || filters.type === 'egreso') {
        query = query.in('transaction_type', ['expense', 'egreso']);
      }
    }

    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) throw error;

    // Map the joined data to include recipient_email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((item: any) => ({
      ...item,
      recipient_email: item.user_oauth_tokens?.gmail_email || null,
      user_oauth_tokens: undefined, // Remove the nested object
    })) as Transaction[];
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select(`
        *,
        user_oauth_tokens!user_oauth_token_id (
          gmail_email
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Map the joined data to include recipient_email
    return data ? {
      ...data,
      recipient_email: data.user_oauth_tokens?.gmail_email || null,
      user_oauth_tokens: undefined,
    } : null;
  }

  async getAvailableCurrencies(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('currency');

    if (error) throw error;

    // Get unique currencies
    const currencies = [...new Set((data || []).map(item => item.currency))];
    return currencies.sort();
  }

  async getAvailableEmails(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('user_oauth_tokens')
      .select('gmail_email')
      .eq('is_active', true);

    if (error) throw error;

    // Get unique emails
    const emails = [...new Set((data || []).map(item => item.gmail_email))];

    return emails.sort();
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
