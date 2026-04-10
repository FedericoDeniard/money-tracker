import { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../types/database.types";

// DB row type from generated types
type TransactionRow = Tables<"transactions">;

// Joined query result (select * with user_oauth_tokens relation)
interface JoinedTransactionRow extends TransactionRow {
  user_oauth_tokens: { gmail_email: string } | null;
}

// Application-level transaction type with resolved recipient_email
export interface Transaction extends TransactionRow {
  recipient_email?: string;
}

export type TransactionCreateInput = Pick<
  TransactionRow,
  | "transaction_type"
  | "merchant"
  | "amount"
  | "currency"
  | "category"
  | "transaction_date"
  | "transaction_description"
  | "date"
  | "source_email"
  | "source_message_id"
> & {
  user_oauth_token_id?: string | null;
};

// Maps a joined query row to the application Transaction type
function mapJoinedTransaction(item: JoinedTransactionRow): Transaction {
  const { user_oauth_tokens, ...transaction } = item;
  return {
    ...transaction,
    recipient_email: user_oauth_tokens?.gmail_email || undefined,
  };
}

function mapSubscriptionCandidate(
  item: Record<string, unknown>
): SubscriptionCandidate {
  const rawConfidence = Number(item.confidence_score || 0);
  const confidence = Math.min(100, Math.max(0, rawConfidence));

  return {
    merchant_display: String(item.merchant_display || ""),
    merchant_normalized: String(item.merchant_normalized || ""),
    currency: String(item.currency || "USD"),
    avg_amount: Number(item.avg_amount || 0),
    min_amount: Number(item.min_amount || 0),
    max_amount: Number(item.max_amount || 0),
    occurrences: Number(item.occurrences || 0),
    interval_days_avg: Number(item.interval_days_avg || 0),
    interval_stddev: Number(item.interval_stddev || 0),
    frequency: String(item.frequency || "unknown"),
    last_date: String(item.last_date || ""),
    next_estimated_date: item.next_estimated_date
      ? String(item.next_estimated_date)
      : null,
    category: String(item.category || "other"),
    source_email_consistent: Boolean(item.source_email_consistent),
    confidence_score: confidence,
  };
}

export interface TransactionFilters {
  serviceName?: string;
  category?: string;
  categoryOperator?: "is" | "is not";
  type?: "income" | "expense" | "ingreso" | "egreso" | "all";
  typeOperator?: "is" | "is not";
  currency?: string;
  currencyOperator?: "is" | "is not";
  email?: string;
  emailOperator?: "is" | "is not";
  startDate?: string;
  endDate?: string;
  sortBy?: "created_at" | "transaction_date";
  sortOrder?: "asc" | "desc";
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

export interface SubscriptionCandidate {
  merchant_display: string;
  merchant_normalized: string;
  currency: string;
  avg_amount: number;
  min_amount: number;
  max_amount: number;
  occurrences: number;
  interval_days_avg: number;
  interval_stddev: number;
  frequency: string;
  last_date: string;
  next_estimated_date: string | null;
  category: string;
  source_email_consistent: boolean;
  confidence_score: number;
}

export class TransactionsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getTransactionsPaginated(
    filters?: TransactionFilters,
    pagination?: PaginationParams
  ): Promise<TransactionPage> {
    // Handle email filter separately (need to get token_id first)
    let tokenId: string | null = null;
    if (filters?.email && filters.email !== "all") {
      const { data: tokenData, error: tokenError } = await this.supabase
        .from("user_oauth_tokens")
        .select("id")
        .eq("gmail_email", filters.email)
        .eq("is_active", true)
        .single();

      if (tokenError || !tokenData) {
        // No token found for this email, return empty result
        return { transactions: [], hasMore: false, total: 0 };
      }

      tokenId = tokenData.id;
    }

    let query = this.supabase.from("transactions").select(
      `
        *,
        user_oauth_tokens!user_oauth_token_id (
          gmail_email
        )
      `,
      { count: "exact" }
    );
    query = query.eq("discarded", false);

    // Apply filters
    if (filters?.currency && filters.currency !== "all") {
      if (filters.currencyOperator === "is not") {
        query = query.neq("currency", filters.currency);
      } else {
        query = query.eq("currency", filters.currency);
      }
    }
    if (filters?.serviceName?.trim()) {
      const term = filters.serviceName.trim();
      query = query.or(
        `merchant.ilike.%${term}%,transaction_description.ilike.%${term}%`
      );
    }
    if (tokenId) {
      if (filters?.emailOperator === "is not") {
        query = query.neq("user_oauth_token_id", tokenId);
      } else {
        query = query.eq("user_oauth_token_id", tokenId);
      }
    }
    if (filters?.category && filters.category !== "all") {
      if (filters.categoryOperator === "is not") {
        query = query.neq("category", filters.category);
      } else {
        query = query.eq("category", filters.category);
      }
    }
    if (filters?.type && filters.type !== "all") {
      const isNot = filters.typeOperator === "is not";
      if (filters.type === "income" || filters.type === "ingreso") {
        query = isNot
          ? query.not("transaction_type", "in", '("income","ingreso")')
          : query.in("transaction_type", ["income", "ingreso"]);
      } else if (filters.type === "expense" || filters.type === "egreso") {
        query = isNot
          ? query.not("transaction_type", "in", '("expense","egreso")')
          : query.in("transaction_type", ["expense", "egreso"]);
      }
    }
    if (filters?.startDate) {
      query = query.gte("transaction_date", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("transaction_date", filters.endDate);
    }

    // Apply pagination
    if (pagination) {
      query = query.range(pagination.from, pagination.to);
    }

    const sortColumn = filters?.sortBy || "created_at";
    const { data, error, count } = await query.order(sortColumn, {
      ascending: filters?.sortOrder === "asc",
    });

    if (error) throw error;

    // Map the joined data to include recipient_email
    const transactions = ((data as JoinedTransactionRow[]) || []).map(
      mapJoinedTransaction
    );

    return {
      transactions,
      hasMore: pagination ? (count || 0) > pagination.to + 1 : false,
      total: count || 0,
    };
  }

  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    let query = this.supabase.from("transactions").select(`
        *,
        user_oauth_tokens!user_oauth_token_id (
          gmail_email
        )
      `);
    query = query.eq("discarded", false);

    // Apply filters
    if (filters?.currency && filters.currency !== "all") {
      if (filters.currencyOperator === "is not") {
        query = query.neq("currency", filters.currency);
      } else {
        query = query.eq("currency", filters.currency);
      }
    }
    if (filters?.serviceName?.trim()) {
      const term = filters.serviceName.trim();
      query = query.or(
        `merchant.ilike.%${term}%,transaction_description.ilike.%${term}%`
      );
    }

    if (filters?.email && filters.email !== "all") {
      // First get the user_oauth_token_id for this email
      const { data: tokenData, error: tokenError } = await this.supabase
        .from("user_oauth_tokens")
        .select("id")
        .eq("gmail_email", filters.email)
        .eq("is_active", true)
        .single();

      if (tokenError) {
        return [];
      }

      if (tokenData) {
        if (filters.emailOperator === "is not") {
          query = query.neq("user_oauth_token_id", tokenData.id);
        } else {
          query = query.eq("user_oauth_token_id", tokenData.id);
        }
      } else {
        // If no token found for this email, return empty result
        return [];
      }
    }

    if (filters?.category && filters.category !== "all") {
      if (filters.categoryOperator === "is not") {
        query = query.neq("category", filters.category);
      } else {
        query = query.eq("category", filters.category);
      }
    }
    if (filters?.type && filters.type !== "all") {
      const isNot = filters.typeOperator === "is not";
      if (filters.type === "income" || filters.type === "ingreso") {
        query = isNot
          ? query.not("transaction_type", "in", '("income","ingreso")')
          : query.in("transaction_type", ["income", "ingreso"]);
      } else if (filters.type === "expense" || filters.type === "egreso") {
        query = isNot
          ? query.not("transaction_type", "in", '("expense","egreso")')
          : query.in("transaction_type", ["expense", "egreso"]);
      }
    }

    if (filters?.startDate) {
      query = query.gte("transaction_date", filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte("transaction_date", filters.endDate);
    }

    const { data, error } = await query.order("transaction_date", {
      ascending: false,
    });

    if (error) throw error;

    // Map the joined data to include recipient_email
    return ((data as JoinedTransactionRow[]) || []).map(mapJoinedTransaction);
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const { data, error } = await this.supabase
      .from("transactions")
      .select(`
        *,
        user_oauth_tokens!user_oauth_token_id (
          gmail_email
        )
      `)
      .eq("id", id)
      .eq("discarded", false)
      .single();

    if (error) throw error;

    if (!data) return null;
    return mapJoinedTransaction(data as JoinedTransactionRow);
  }

  async getAvailableCurrencies(): Promise<string[]> {
    // Use RPC to get distinct currencies more efficiently
    const { data, error } = await this.supabase.rpc("get_distinct_currencies");

    if (error) {
      // Fallback to the old method if RPC not available
      const { data: fallbackData, error: fallbackError } = await this.supabase
        .from("transactions")
        .select("currency")
        .eq("discarded", false);

      if (fallbackError) throw fallbackError;

      const currencies = [
        ...new Set((fallbackData || []).map(item => item.currency)),
      ];
      return currencies.sort();
    }

    return (data || []).map(item => item.currency).sort();
  }

  async getAvailableEmails(): Promise<string[]> {
    // Use RPC to get distinct emails more efficiently
    const { data, error } = await this.supabase.rpc("get_active_gmail_emails");

    if (error) {
      // Fallback to the old method if RPC not available
      const { data: fallbackData, error: fallbackError } = await this.supabase
        .from("user_oauth_tokens")
        .select("gmail_email")
        .eq("is_active", true);

      if (fallbackError) throw fallbackError;

      const emails = [
        ...new Set(
          (fallbackData || [])
            .map(item => item.gmail_email)
            .filter((e): e is string => e !== null)
        ),
      ];
      return emails.sort();
    }

    const emails = (data || []).map(item => item.gmail_email);
    return emails.sort();
  }

  async getSubscriptionCandidates(options?: {
    minConfidence?: number;
    minOccurrences?: number;
  }): Promise<SubscriptionCandidate[]> {
    const { data, error } = await this.supabase.rpc(
      "get_subscription_candidates",
      {
        p_min_confidence: options?.minConfidence ?? 50,
        p_min_occurrences: options?.minOccurrences ?? 2,
      }
    );

    if (error) throw error;
    return (data || []).map(item =>
      mapSubscriptionCandidate(item as Record<string, unknown>)
    );
  }

  async getSubscriptionTransactions(
    merchantNormalized: string,
    currency: string
  ): Promise<Transaction[]> {
    const { data, error } = await this.supabase.rpc(
      "get_subscription_transactions",
      {
        p_merchant_normalized: merchantNormalized,
        p_currency: currency,
      }
    ).select(`
        *,
        user_oauth_tokens!user_oauth_token_id (
          gmail_email
        )
      `);

    if (error) throw error;
    return ((data as unknown as JoinedTransactionRow[]) || []).map(
      mapJoinedTransaction
    );
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    // 1. Obtener datos de la transacción antes de marcarla como descartada
    const { data: transaction, error: fetchError } = await this.supabase
      .from("transactions")
      .select("source_message_id, user_oauth_token_id")
      .eq("id", transactionId)
      .single();

    if (fetchError) throw fetchError;
    if (!transaction) throw new Error("Transaction not found");

    // 2. Soft delete en transactions para preservar trazabilidad
    const { error: deleteError } = await this.supabase
      .from("transactions")
      .update({
        discarded: true,
        discarded_at: new Date().toISOString(),
        discarded_reason: "User discarded transaction",
      })
      .eq("id", transactionId);

    if (deleteError) throw deleteError;

    // 3. Guardar en discarded_emails solo para transacciones importadas de Gmail
    const isGmailTransaction =
      transaction.user_oauth_token_id &&
      transaction.source_message_id &&
      !transaction.source_message_id.startsWith("manual-");

    if (isGmailTransaction) {
      const { error: discardError } = await this.supabase
        .from("discarded_emails")
        .insert({
          user_oauth_token_id: transaction.user_oauth_token_id,
          message_id: transaction.source_message_id,
          transaction_id: transactionId,
          reason: "User discarded transaction",
        });

      // Ignorar error de duplicado (ya estaba descartado)
      if (discardError && discardError.code !== "23505") {
        throw discardError;
      }
    }
  }

  async updateTransaction(
    transactionId: string,
    updates: Partial<TransactionRow>
  ): Promise<void> {
    const { error } = await this.supabase
      .from("transactions")
      .update(updates)
      .eq("id", transactionId);

    if (error) throw error;
  }

  async createTransaction(
    transaction: TransactionCreateInput
  ): Promise<Transaction> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await this.supabase
      .from("transactions")
      .insert({
        ...transaction,
        user_id: user.id,
      })
      .select("*, user_oauth_tokens!user_oauth_token_id (gmail_email)")
      .single();

    if (error) throw error;
    return mapJoinedTransaction(data as JoinedTransactionRow);
  }
}

// Factory function to create service instance
export function createTransactionsService(supabase: SupabaseClient<Database>) {
  return new TransactionsService(supabase);
}
