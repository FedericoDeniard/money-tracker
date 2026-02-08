import { SupabaseClient } from '@supabase/supabase-js';

export interface Transaction {
  id: string;
  user_id: string; // User who owns this transaction
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

// Type for database query result with joined user_oauth_tokens
interface TransactionWithTokens extends Omit<Transaction, 'recipient_email'> {
  user_oauth_tokens?: {
    gmail_email: string;
  } | null;
}

export interface TransactionFilters {
  currency?: string;
  email?: string;
  category?: string;
  type?: 'income' | 'expense' | 'ingreso' | 'egreso' | 'all';
  startDate?: string;
  endDate?: string;
  sortBy?: 'created_at' | 'transaction_date';
}

export interface PaginationParams {
  from: number;
  to: number;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  hasMore: boolean;
  total?: number;
}

export class TransactionsService {
  constructor(private supabase: SupabaseClient) { }

  async getTransactionsPaginated(
    filters?: TransactionFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedTransactions> {
    // Handle email filter separately (need to get token_id first)
    let tokenId: string | null = null;
    if (filters?.email && filters.email !== 'all') {
      const { data: tokenData, error: tokenError } = await this.supabase
        .from('user_oauth_tokens')
        .select('id')
        .eq('gmail_email', filters.email)
        .eq('is_active', true)
        .single();

      if (tokenError || !tokenData) {
        // No token found for this email, return empty result
        return { transactions: [], hasMore: false, total: 0 };
      }

      tokenId = tokenData.id;
    }

    let query = this.supabase
      .from('transactions')
      .select(`
        *,
        user_oauth_tokens!user_oauth_token_id (
          gmail_email
        )
      `, { count: 'exact' });

    // Apply filters
    query = this.applyFilters(query, filters, tokenId);

    // Apply pagination
    if (pagination) {
      query = query.range(pagination.from, pagination.to);
    }

    const sortColumn = filters?.sortBy || 'created_at';
    const { data, error, count } = await query.order(sortColumn, { ascending: false });

    if (error) throw error;

    // Map the joined data to include recipient_email
    const transactions = (data || []).map((item: TransactionWithTokens): Transaction => {
      const { user_oauth_tokens, ...transaction } = item;
      return {
        ...transaction,
        recipient_email: user_oauth_tokens?.gmail_email || undefined,
      };
    });

    return {
      transactions,
      hasMore: pagination ? (count || 0) > pagination.to + 1 : false,
      total: count || 0,
    };
  }

  private applyFilters(query: ReturnType<SupabaseClient['from']>, filters?: TransactionFilters, tokenId?: string | null) {
    if (!filters) return query;

    // Apply currency filter
    if (filters.currency && filters.currency !== 'all') {
      query = query.eq('currency', filters.currency);
    }

    // Apply email filter (via tokenId)
    if (tokenId) {
      query = query.eq('user_oauth_token_id', tokenId);
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    // Apply type filter
    if (filters.type && filters.type !== 'all') {
      if (filters.type === 'income' || filters.type === 'ingreso') {
        query = query.in('transaction_type', ['income', 'ingreso']);
      } else if (filters.type === 'expense' || filters.type === 'egreso') {
        query = query.in('transaction_type', ['expense', 'egreso']);
      }
    }

    // Apply date filters
    if (filters.startDate) {
      query = query.gte('transaction_date', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('transaction_date', filters.endDate);
    }

    return query;
  }

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

    if (filters?.startDate) {
      query = query.gte('transaction_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('transaction_date', filters.endDate);
    }

    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) throw error;

    // Map the joined data to include recipient_email
    return (data || []).map((item: TransactionWithTokens): Transaction => {
      const { user_oauth_tokens, ...transaction } = item;
      return {
        ...transaction,
        recipient_email: user_oauth_tokens?.gmail_email || undefined,
      };
    });
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
    // Use RPC to get distinct currencies more efficiently
    const { data, error } = await this.supabase.rpc('get_distinct_currencies');

    if (error) {
      // Fallback to the old method if RPC not available
      const { data: fallbackData, error: fallbackError } = await this.supabase
        .from('transactions')
        .select('currency');

      if (fallbackError) throw fallbackError;

      const currencies = [...new Set((fallbackData || []).map(item => item.currency))];
      return currencies.sort();
    }

    return (data || []).map((item: any) => typeof item === 'string' ? item : item.currency).sort();
  }

  async getAvailableEmails(): Promise<string[]> {
    // Use RPC to get distinct emails more efficiently
    const { data, error } = await this.supabase.rpc('get_active_gmail_emails');

    if (error) {
      // Fallback to the old method if RPC not available
      const { data: fallbackData, error: fallbackError } = await this.supabase
        .from('user_oauth_tokens')
        .select('gmail_email')
        .eq('is_active', true);

      if (fallbackError) throw fallbackError;

      const emails = [...new Set((fallbackData || []).map(item => item.gmail_email))];
      return emails.sort();
    }

    const emails = (data || []).map((item: any) => typeof item === 'string' ? item : item.gmail_email);
    return emails.sort();
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    // 1. Obtener datos de la transacción antes de borrarla
    const { data: transaction, error: fetchError } = await this.supabase
      .from('transactions')
      .select('source_message_id, user_oauth_token_id')
      .eq('id', transactionId)
      .single();

    if (fetchError) throw fetchError;
    if (!transaction) throw new Error('Transaction not found');

    // 2. Eliminar de transactions
    const { error: deleteError } = await this.supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (deleteError) throw deleteError;

    // 3. Guardar en discarded_emails para evitar que reaparezca en seeds
    const { error: discardError } = await this.supabase
      .from('discarded_emails')
      .insert({
        user_oauth_token_id: transaction.user_oauth_token_id,
        message_id: transaction.source_message_id,
        reason: 'User discarded transaction'
      });

    // Ignorar error de duplicado (ya estaba descartado)
    if (discardError && discardError.code !== '23505') {
      throw discardError;
    }
  }

  async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<void> {
    const { error } = await this.supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId);

    if (error) throw error;
  }
}

// Factory function to create service instance
export function createTransactionsService(supabase: SupabaseClient) {
  return new TransactionsService(supabase);
}
