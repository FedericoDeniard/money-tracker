export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      discarded_emails: {
        Row: {
          discarded_at: string | null
          id: string
          message_id: string
          reason: string | null
          user_oauth_token_id: string
        }
        Insert: {
          discarded_at?: string | null
          id?: string
          message_id: string
          reason?: string | null
          user_oauth_token_id: string
        }
        Update: {
          discarded_at?: string | null
          id?: string
          message_id?: string
          reason?: string | null
          user_oauth_token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discarded_emails_user_oauth_token_id_fkey"
            columns: ["user_oauth_token_id"]
            isOneToOne: false
            referencedRelation: "user_oauth_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_watches: {
        Row: {
          created_at: string | null
          expiration: string | null
          gmail_email: string
          history_id: string | null
          id: string
          is_active: boolean | null
          label_ids: string[] | null
          topic_name: string
          updated_at: string | null
          user_id: string
          watch_id: string | null
        }
        Insert: {
          created_at?: string | null
          expiration?: string | null
          gmail_email: string
          history_id?: string | null
          id?: string
          is_active?: boolean | null
          label_ids?: string[] | null
          topic_name: string
          updated_at?: string | null
          user_id: string
          watch_id?: string | null
        }
        Update: {
          created_at?: string | null
          expiration?: string | null
          gmail_email?: string
          history_id?: string | null
          id?: string
          is_active?: boolean | null
          label_ids?: string[] | null
          topic_name?: string
          updated_at?: string | null
          user_id?: string
          watch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmail_watches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pubsub_subscriptions: {
        Row: {
          ack_deadline_seconds: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          push_endpoint: string
          subscription_name: string
          topic_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ack_deadline_seconds?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          push_endpoint: string
          subscription_name: string
          topic_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ack_deadline_seconds?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          push_endpoint?: string
          subscription_name?: string
          topic_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pubsub_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seeds: {
        Row: {
          created_at: string | null
          emails_processed_by_ai: number | null
          error_message: string | null
          id: string
          last_processed_index: number | null
          message_ids: string[] | null
          status: Database["public"]["Enums"]["seed_status"]
          total_emails: number | null
          total_skipped: number | null
          transactions_found: number | null
          updated_at: string | null
          user_id: string
          user_oauth_token_id: string
        }
        Insert: {
          created_at?: string | null
          emails_processed_by_ai?: number | null
          error_message?: string | null
          id?: string
          last_processed_index?: number | null
          message_ids?: string[] | null
          status?: Database["public"]["Enums"]["seed_status"]
          total_emails?: number | null
          total_skipped?: number | null
          transactions_found?: number | null
          updated_at?: string | null
          user_id: string
          user_oauth_token_id: string
        }
        Update: {
          created_at?: string | null
          emails_processed_by_ai?: number | null
          error_message?: string | null
          id?: string
          last_processed_index?: number | null
          message_ids?: string[] | null
          status?: Database["public"]["Enums"]["seed_status"]
          total_emails?: number | null
          total_skipped?: number | null
          transactions_found?: number | null
          updated_at?: string | null
          user_id?: string
          user_oauth_token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seeds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeds_user_oauth_token_id_fkey"
            columns: ["user_oauth_token_id"]
            isOneToOne: false
            referencedRelation: "user_oauth_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          currency: string
          date: string
          id: string
          merchant: string
          source_email: string
          source_message_id: string
          transaction_date: string
          transaction_description: string
          transaction_type: string
          updated_at: string | null
          user_id: string
          user_oauth_token_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          currency?: string
          date: string
          id?: string
          merchant: string
          source_email: string
          source_message_id: string
          transaction_date: string
          transaction_description: string
          transaction_type: string
          updated_at?: string | null
          user_id: string
          user_oauth_token_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          currency?: string
          date?: string
          id?: string
          merchant?: string
          source_email?: string
          source_message_id?: string
          transaction_date?: string
          transaction_description?: string
          transaction_type?: string
          updated_at?: string | null
          user_id?: string
          user_oauth_token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_oauth_token_id_fkey"
            columns: ["user_oauth_token_id"]
            isOneToOne: false
            referencedRelation: "user_oauth_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_oauth_tokens: {
        Row: {
          access_token: string | null
          access_token_encrypted: string | null
          created_at: string | null
          expires_at: string | null
          gmail_email: string | null
          id: string
          is_active: boolean
          refresh_token: string | null
          refresh_token_encrypted: string | null
          scope: string | null
          token_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          access_token_encrypted?: string | null
          created_at?: string | null
          expires_at?: string | null
          gmail_email?: string | null
          id?: string
          is_active?: boolean
          refresh_token?: string | null
          refresh_token_encrypted?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          access_token_encrypted?: string | null
          created_at?: string | null
          expires_at?: string | null
          gmail_email?: string | null
          id?: string
          is_active?: boolean
          refresh_token?: string | null
          refresh_token_encrypted?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_oauth_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrypt_text: {
        Args: { encrypted_data: string; encryption_key: string }
        Returns: string
      }
      delete_gmail_connection: {
        Args: { token_id: string }
        Returns: undefined
      }
      encrypt_text: {
        Args: { encryption_key: string; text_to_encrypt: string }
        Returns: string
      }
      get_active_gmail_emails: {
        Args: never
        Returns: {
          gmail_email: string
        }[]
      }
      get_distinct_currencies: {
        Args: never
        Returns: {
          currency: string
        }[]
      }
      health_check: {
        Args: never
        Returns: {
          check_timestamp: string
          status: string
          version: string
        }[]
      }
      renew_gmail_watches: { Args: never; Returns: undefined }
      renew_watches_for_user: { Args: never; Returns: undefined }
      stop_all_watches_for_user: { Args: never; Returns: undefined }
    }
    Enums: {
      seed_status: "pending" | "completed" | "failed" | "processing"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      seed_status: ["pending", "completed", "failed", "processing"],
    },
  },
} as const

