import { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../types/database.types';

// DB row type from generated types
type TransactionRow = Tables<'transactions'>;

// Joined query result (select * with user_oauth_tokens relation)
interface JoinedTransactionRow extends TransactionRow {
  user_oauth_tokens: { gmail_email: string } | null;
}

// Application-level transaction type with resolved recipient_email
export interface Transaction extends TransactionRow {
  recipient_email?: string;
}

// Maps a joined query row to the application Transaction type
function mapJoinedTransaction(item: JoinedTransactionRow): Transaction {
  const { user_oauth_tokens, ...transaction } = item;
  return {
    ...transaction,
    recipient_email: user_oauth_tokens?.gmail_email || undefined,
  };
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

export interface TransactionPage {
  transactions: Transaction[];
  hasMore: boolean;
  total?: number;
}

export class TransactionsService {
  constructor(private supabase: SupabaseClient<Database>) { }

  async getTransactionsPaginated(
    filters?: TransactionFilters,
    pagination?: PaginationParams
  ): Promise<TransactionPage> {
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
    if (filters?.currency && filters.currency !== 'all') {
      query = query.eq('currency', filters.currency);
    }
    if (tokenId) {
      query = query.eq('user_oauth_token_id', tokenId);
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

    // Apply pagination
    if (pagination) {
      query = query.range(pagination.from, pagination.to);
    }

    const sortColumn = filters?.sortBy || 'created_at';
    const { data, error, count } = await query.order(sortColumn, { ascending: false });

    if (error) throw error;

    // Map the joined data to include recipient_email
    const transactions = (data as JoinedTransactionRow[] || []).map(mapJoinedTransaction);

    return {
      transactions,
      hasMore: pagination ? (count || 0) > pagination.to + 1 : false,
      total: count || 0,
    };
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
    return (data as JoinedTransactionRow[] || []).map(mapJoinedTransaction);
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

    if (!data) return null;
    return mapJoinedTransaction(data as JoinedTransactionRow);
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

    return (data || []).map((item) => item.currency).sort();
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

      const emails = [...new Set((fallbackData || []).map(item => item.gmail_email).filter((e): e is string => e !== null))];
      return emails.sort();
    }

    const emails = (data || []).map((item) => item.gmail_email);
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
        user_oauth_token_id: transaction.user_oauth_token_id!,
        message_id: transaction.source_message_id,
        reason: 'User discarded transaction'
      });

    // Ignorar error de duplicado (ya estaba descartado)
    if (discardError && discardError.code !== '23505') {
      throw discardError;
    }
  }

  async updateTransaction(transactionId: string, updates: Partial<TransactionRow>): Promise<void> {
    const { error } = await this.supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId);

    if (error) throw error;
  }

  async createTransaction(transaction: Omit<TransactionRow, 'id' | 'created_at'>): Promise<Transaction> {
    const { data, error } = await this.supabase
      .from('transactions')
      .insert({
        ...transaction,
        user_id: (await this.supabase.auth.getUser()).data.user?.id
      })
      .select('*, user_oauth_tokens!user_oauth_token_id (gmail_email)')
      .single();

    if (error) throw error;
    return mapJoinedTransaction(data as JoinedTransactionRow);
  }
}

// Factory function to create service instance
export function createTransactionsService(supabase: SupabaseClient<Database>) {
  return new TransactionsService(supabase);
}
