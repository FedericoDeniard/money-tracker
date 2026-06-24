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
      chat_attachments: {
        Row: {
          created_at: string
          filename: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: []
      }
      discarded_emails: {
        Row: {
          discarded_at: string | null
          id: string
          message_id: string
          reason: string | null
          transaction_id: string | null
          user_oauth_token_id: string
        }
        Insert: {
          discarded_at?: string | null
          id?: string
          message_id: string
          reason?: string | null
          transaction_id?: string | null
          user_oauth_token_id: string
        }
        Update: {
          discarded_at?: string | null
          id?: string
          message_id?: string
          reason?: string | null
          transaction_id?: string | null
          user_oauth_token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discarded_emails_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
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
      mastra_agent_versions: {
        Row: {
          agentId: string
          agents: Json | null
          browser: Json | null
          changedFields: Json | null
          changeMessage: string | null
          createdAt: string
          createdAtZ: string | null
          defaultOptions: Json | null
          description: string | null
          id: string
          inputProcessors: Json | null
          instructions: string
          integrationTools: Json | null
          mcpClients: Json | null
          memory: Json | null
          model: Json
          name: string
          outputProcessors: Json | null
          requestContextSchema: Json | null
          scorers: Json | null
          skills: Json | null
          skillsFormat: string | null
          toolProviders: Json | null
          tools: Json | null
          versionNumber: number
          workflows: Json | null
          workspace: Json | null
        }
        Insert: {
          agentId: string
          agents?: Json | null
          browser?: Json | null
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt: string
          createdAtZ?: string | null
          defaultOptions?: Json | null
          description?: string | null
          id: string
          inputProcessors?: Json | null
          instructions: string
          integrationTools?: Json | null
          mcpClients?: Json | null
          memory?: Json | null
          model: Json
          name: string
          outputProcessors?: Json | null
          requestContextSchema?: Json | null
          scorers?: Json | null
          skills?: Json | null
          skillsFormat?: string | null
          toolProviders?: Json | null
          tools?: Json | null
          versionNumber: number
          workflows?: Json | null
          workspace?: Json | null
        }
        Update: {
          agentId?: string
          agents?: Json | null
          browser?: Json | null
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt?: string
          createdAtZ?: string | null
          defaultOptions?: Json | null
          description?: string | null
          id?: string
          inputProcessors?: Json | null
          instructions?: string
          integrationTools?: Json | null
          mcpClients?: Json | null
          memory?: Json | null
          model?: Json
          name?: string
          outputProcessors?: Json | null
          requestContextSchema?: Json | null
          scorers?: Json | null
          skills?: Json | null
          skillsFormat?: string | null
          toolProviders?: Json | null
          tools?: Json | null
          versionNumber?: number
          workflows?: Json | null
          workspace?: Json | null
        }
        Relationships: []
      }
      mastra_agents: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          favoriteCount: number | null
          id: string
          metadata: Json | null
          status: string
          updatedAt: string
          updatedAtZ: string | null
          visibility: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          favoriteCount?: number | null
          id: string
          metadata?: Json | null
          status: string
          updatedAt: string
          updatedAtZ?: string | null
          visibility?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          favoriteCount?: number | null
          id?: string
          metadata?: Json | null
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      mastra_ai_spans: {
        Row: {
          attributes: Json | null
          createdAt: string
          createdAtZ: string | null
          endedAt: string | null
          endedAtZ: string | null
          entityId: string | null
          entityName: string | null
          entityType: string | null
          entityVersionId: string | null
          environment: string | null
          error: Json | null
          experimentId: string | null
          input: Json | null
          isEvent: boolean
          links: Json | null
          metadata: Json | null
          name: string
          organizationId: string | null
          output: Json | null
          parentEntityId: string | null
          parentEntityName: string | null
          parentEntityType: string | null
          parentEntityVersionId: string | null
          parentSpanId: string | null
          requestContext: Json | null
          requestId: string | null
          resourceId: string | null
          rootEntityId: string | null
          rootEntityName: string | null
          rootEntityType: string | null
          rootEntityVersionId: string | null
          runId: string | null
          scope: Json | null
          serviceName: string | null
          sessionId: string | null
          source: string | null
          spanId: string
          spanType: string
          startedAt: string
          startedAtZ: string | null
          tags: Json | null
          threadId: string | null
          traceId: string
          updatedAt: string | null
          updatedAtZ: string | null
          userId: string | null
        }
        Insert: {
          attributes?: Json | null
          createdAt: string
          createdAtZ?: string | null
          endedAt?: string | null
          endedAtZ?: string | null
          entityId?: string | null
          entityName?: string | null
          entityType?: string | null
          entityVersionId?: string | null
          environment?: string | null
          error?: Json | null
          experimentId?: string | null
          input?: Json | null
          isEvent: boolean
          links?: Json | null
          metadata?: Json | null
          name: string
          organizationId?: string | null
          output?: Json | null
          parentEntityId?: string | null
          parentEntityName?: string | null
          parentEntityType?: string | null
          parentEntityVersionId?: string | null
          parentSpanId?: string | null
          requestContext?: Json | null
          requestId?: string | null
          resourceId?: string | null
          rootEntityId?: string | null
          rootEntityName?: string | null
          rootEntityType?: string | null
          rootEntityVersionId?: string | null
          runId?: string | null
          scope?: Json | null
          serviceName?: string | null
          sessionId?: string | null
          source?: string | null
          spanId: string
          spanType: string
          startedAt: string
          startedAtZ?: string | null
          tags?: Json | null
          threadId?: string | null
          traceId: string
          updatedAt?: string | null
          updatedAtZ?: string | null
          userId?: string | null
        }
        Update: {
          attributes?: Json | null
          createdAt?: string
          createdAtZ?: string | null
          endedAt?: string | null
          endedAtZ?: string | null
          entityId?: string | null
          entityName?: string | null
          entityType?: string | null
          entityVersionId?: string | null
          environment?: string | null
          error?: Json | null
          experimentId?: string | null
          input?: Json | null
          isEvent?: boolean
          links?: Json | null
          metadata?: Json | null
          name?: string
          organizationId?: string | null
          output?: Json | null
          parentEntityId?: string | null
          parentEntityName?: string | null
          parentEntityType?: string | null
          parentEntityVersionId?: string | null
          parentSpanId?: string | null
          requestContext?: Json | null
          requestId?: string | null
          resourceId?: string | null
          rootEntityId?: string | null
          rootEntityName?: string | null
          rootEntityType?: string | null
          rootEntityVersionId?: string | null
          runId?: string | null
          scope?: Json | null
          serviceName?: string | null
          sessionId?: string | null
          source?: string | null
          spanId?: string
          spanType?: string
          startedAt?: string
          startedAtZ?: string | null
          tags?: Json | null
          threadId?: string | null
          traceId?: string
          updatedAt?: string | null
          updatedAtZ?: string | null
          userId?: string | null
        }
        Relationships: []
      }
      mastra_background_tasks: {
        Row: {
          agent_id: string
          args: Json
          completedAt: string | null
          completedAtZ: string | null
          createdAt: string
          createdAtZ: string | null
          error: Json | null
          id: string
          max_retries: number
          resource_id: string | null
          result: Json | null
          retry_count: number
          run_id: string
          startedAt: string | null
          startedAtZ: string | null
          status: string
          suspend_payload: Json | null
          suspendedAt: string | null
          suspendedAtZ: string | null
          thread_id: string | null
          timeout_ms: number
          tool_call_id: string
          tool_name: string
        }
        Insert: {
          agent_id: string
          args: Json
          completedAt?: string | null
          completedAtZ?: string | null
          createdAt: string
          createdAtZ?: string | null
          error?: Json | null
          id: string
          max_retries: number
          resource_id?: string | null
          result?: Json | null
          retry_count: number
          run_id: string
          startedAt?: string | null
          startedAtZ?: string | null
          status: string
          suspend_payload?: Json | null
          suspendedAt?: string | null
          suspendedAtZ?: string | null
          thread_id?: string | null
          timeout_ms: number
          tool_call_id: string
          tool_name: string
        }
        Update: {
          agent_id?: string
          args?: Json
          completedAt?: string | null
          completedAtZ?: string | null
          createdAt?: string
          createdAtZ?: string | null
          error?: Json | null
          id?: string
          max_retries?: number
          resource_id?: string | null
          result?: Json | null
          retry_count?: number
          run_id?: string
          startedAt?: string | null
          startedAtZ?: string | null
          status?: string
          suspend_payload?: Json | null
          suspendedAt?: string | null
          suspendedAtZ?: string | null
          thread_id?: string | null
          timeout_ms?: number
          tool_call_id?: string
          tool_name?: string
        }
        Relationships: []
      }
      mastra_channel_config: {
        Row: {
          data: Json
          platform: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          data: Json
          platform: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          data?: Json
          platform?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_channel_installations: {
        Row: {
          agentId: string
          configHash: string | null
          createdAt: string
          createdAtZ: string | null
          data: Json
          error: string | null
          id: string
          platform: string
          status: string
          updatedAt: string
          updatedAtZ: string | null
          webhookId: string | null
        }
        Insert: {
          agentId: string
          configHash?: string | null
          createdAt: string
          createdAtZ?: string | null
          data: Json
          error?: string | null
          id: string
          platform: string
          status: string
          updatedAt: string
          updatedAtZ?: string | null
          webhookId?: string | null
        }
        Update: {
          agentId?: string
          configHash?: string | null
          createdAt?: string
          createdAtZ?: string | null
          data?: Json
          error?: string | null
          id?: string
          platform?: string
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
          webhookId?: string | null
        }
        Relationships: []
      }
      mastra_dataset_items: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          datasetId: string
          datasetVersion: number
          expectedTrajectory: Json | null
          groundTruth: Json | null
          id: string
          input: Json
          isDeleted: boolean
          metadata: Json | null
          requestContext: Json | null
          source: Json | null
          updatedAt: string
          updatedAtZ: string | null
          validTo: number | null
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          datasetId: string
          datasetVersion: number
          expectedTrajectory?: Json | null
          groundTruth?: Json | null
          id: string
          input: Json
          isDeleted: boolean
          metadata?: Json | null
          requestContext?: Json | null
          source?: Json | null
          updatedAt: string
          updatedAtZ?: string | null
          validTo?: number | null
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          datasetId?: string
          datasetVersion?: number
          expectedTrajectory?: Json | null
          groundTruth?: Json | null
          id?: string
          input?: Json
          isDeleted?: boolean
          metadata?: Json | null
          requestContext?: Json | null
          source?: Json | null
          updatedAt?: string
          updatedAtZ?: string | null
          validTo?: number | null
        }
        Relationships: []
      }
      mastra_dataset_versions: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          datasetId: string
          id: string
          version: number
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          datasetId: string
          id: string
          version: number
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          datasetId?: string
          id?: string
          version?: number
        }
        Relationships: []
      }
      mastra_datasets: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          description: string | null
          groundTruthSchema: Json | null
          id: string
          inputSchema: Json | null
          metadata: Json | null
          name: string
          requestContextSchema: Json | null
          scorerIds: Json | null
          tags: Json | null
          targetIds: Json | null
          targetType: string | null
          updatedAt: string
          updatedAtZ: string | null
          version: number
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          description?: string | null
          groundTruthSchema?: Json | null
          id: string
          inputSchema?: Json | null
          metadata?: Json | null
          name: string
          requestContextSchema?: Json | null
          scorerIds?: Json | null
          tags?: Json | null
          targetIds?: Json | null
          targetType?: string | null
          updatedAt: string
          updatedAtZ?: string | null
          version: number
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          description?: string | null
          groundTruthSchema?: Json | null
          id?: string
          inputSchema?: Json | null
          metadata?: Json | null
          name?: string
          requestContextSchema?: Json | null
          scorerIds?: Json | null
          tags?: Json | null
          targetIds?: Json | null
          targetType?: string | null
          updatedAt?: string
          updatedAtZ?: string | null
          version?: number
        }
        Relationships: []
      }
      mastra_experiment_results: {
        Row: {
          completedAt: string
          completedAtZ: string | null
          createdAt: string
          createdAtZ: string | null
          error: Json | null
          experimentId: string
          groundTruth: Json | null
          id: string
          input: Json
          itemDatasetVersion: number | null
          itemId: string
          output: Json | null
          retryCount: number
          startedAt: string
          startedAtZ: string | null
          status: string | null
          tags: Json | null
          traceId: string | null
        }
        Insert: {
          completedAt: string
          completedAtZ?: string | null
          createdAt: string
          createdAtZ?: string | null
          error?: Json | null
          experimentId: string
          groundTruth?: Json | null
          id: string
          input: Json
          itemDatasetVersion?: number | null
          itemId: string
          output?: Json | null
          retryCount: number
          startedAt: string
          startedAtZ?: string | null
          status?: string | null
          tags?: Json | null
          traceId?: string | null
        }
        Update: {
          completedAt?: string
          completedAtZ?: string | null
          createdAt?: string
          createdAtZ?: string | null
          error?: Json | null
          experimentId?: string
          groundTruth?: Json | null
          id?: string
          input?: Json
          itemDatasetVersion?: number | null
          itemId?: string
          output?: Json | null
          retryCount?: number
          startedAt?: string
          startedAtZ?: string | null
          status?: string | null
          tags?: Json | null
          traceId?: string | null
        }
        Relationships: []
      }
      mastra_experiments: {
        Row: {
          agentVersion: string | null
          completedAt: string | null
          completedAtZ: string | null
          createdAt: string
          createdAtZ: string | null
          datasetId: string | null
          datasetVersion: number | null
          description: string | null
          failedCount: number
          id: string
          metadata: Json | null
          name: string | null
          skippedCount: number
          startedAt: string | null
          startedAtZ: string | null
          status: string
          succeededCount: number
          targetId: string
          targetType: string
          totalItems: number
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          agentVersion?: string | null
          completedAt?: string | null
          completedAtZ?: string | null
          createdAt: string
          createdAtZ?: string | null
          datasetId?: string | null
          datasetVersion?: number | null
          description?: string | null
          failedCount: number
          id: string
          metadata?: Json | null
          name?: string | null
          skippedCount: number
          startedAt?: string | null
          startedAtZ?: string | null
          status: string
          succeededCount: number
          targetId: string
          targetType: string
          totalItems: number
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          agentVersion?: string | null
          completedAt?: string | null
          completedAtZ?: string | null
          createdAt?: string
          createdAtZ?: string | null
          datasetId?: string | null
          datasetVersion?: number | null
          description?: string | null
          failedCount?: number
          id?: string
          metadata?: Json | null
          name?: string | null
          skippedCount?: number
          startedAt?: string | null
          startedAtZ?: string | null
          status?: string
          succeededCount?: number
          targetId?: string
          targetType?: string
          totalItems?: number
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_favorites: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          entityId: string
          entityType: string
          userId: string
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          entityId: string
          entityType: string
          userId: string
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          entityId?: string
          entityType?: string
          userId?: string
        }
        Relationships: []
      }
      mastra_mcp_client_versions: {
        Row: {
          changedFields: Json | null
          changeMessage: string | null
          createdAt: string
          createdAtZ: string | null
          description: string | null
          id: string
          mcpClientId: string
          name: string
          servers: Json
          versionNumber: number
        }
        Insert: {
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt: string
          createdAtZ?: string | null
          description?: string | null
          id: string
          mcpClientId: string
          name: string
          servers: Json
          versionNumber: number
        }
        Update: {
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt?: string
          createdAtZ?: string | null
          description?: string | null
          id?: string
          mcpClientId?: string
          name?: string
          servers?: Json
          versionNumber?: number
        }
        Relationships: []
      }
      mastra_mcp_clients: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          status: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          status: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_mcp_server_versions: {
        Row: {
          agents: Json | null
          changedFields: Json | null
          changeMessage: string | null
          createdAt: string
          createdAtZ: string | null
          description: string | null
          id: string
          instructions: string | null
          isLatest: boolean | null
          mcpServerId: string
          name: string
          packageCanonical: string | null
          releaseDate: string | null
          repository: Json | null
          tools: Json | null
          version: string
          versionNumber: number
          workflows: Json | null
        }
        Insert: {
          agents?: Json | null
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt: string
          createdAtZ?: string | null
          description?: string | null
          id: string
          instructions?: string | null
          isLatest?: boolean | null
          mcpServerId: string
          name: string
          packageCanonical?: string | null
          releaseDate?: string | null
          repository?: Json | null
          tools?: Json | null
          version: string
          versionNumber: number
          workflows?: Json | null
        }
        Update: {
          agents?: Json | null
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt?: string
          createdAtZ?: string | null
          description?: string | null
          id?: string
          instructions?: string | null
          isLatest?: boolean | null
          mcpServerId?: string
          name?: string
          packageCanonical?: string | null
          releaseDate?: string | null
          repository?: Json | null
          tools?: Json | null
          version?: string
          versionNumber?: number
          workflows?: Json | null
        }
        Relationships: []
      }
      mastra_mcp_servers: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          status: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          status: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_messages: {
        Row: {
          content: string
          createdAt: string
          createdAtZ: string | null
          id: string
          resourceId: string | null
          role: string
          thread_id: string
          type: string
        }
        Insert: {
          content: string
          createdAt: string
          createdAtZ?: string | null
          id: string
          resourceId?: string | null
          role: string
          thread_id: string
          type: string
        }
        Update: {
          content?: string
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          resourceId?: string | null
          role?: string
          thread_id?: string
          type?: string
        }
        Relationships: []
      }
      mastra_notifications: {
        Row: {
          agentId: string | null
          archivedAt: string | null
          archivedAtZ: string | null
          attributes: Json | null
          coalescedCount: number
          coalesceKey: string | null
          createdAt: string
          createdAtZ: string | null
          dedupeKey: string | null
          deliverAt: string | null
          deliverAtZ: string | null
          deliveredAt: string | null
          deliveredAtZ: string | null
          deliveredSignalId: string | null
          deliveryAttempts: number
          deliveryReason: string | null
          discardedAt: string | null
          discardedAtZ: string | null
          dismissedAt: string | null
          dismissedAtZ: string | null
          id: string
          kind: string
          lastDeliveryAttemptAt: string | null
          lastDeliveryAttemptAtZ: string | null
          lastDeliveryError: string | null
          metadata: Json | null
          payload: Json | null
          priority: string
          resourceId: string | null
          seenAt: string | null
          seenAtZ: string | null
          source: string
          sourceId: string | null
          status: string
          summary: string
          summaryAt: string | null
          summaryAtZ: string | null
          summarySignalId: string | null
          threadId: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          agentId?: string | null
          archivedAt?: string | null
          archivedAtZ?: string | null
          attributes?: Json | null
          coalescedCount: number
          coalesceKey?: string | null
          createdAt: string
          createdAtZ?: string | null
          dedupeKey?: string | null
          deliverAt?: string | null
          deliverAtZ?: string | null
          deliveredAt?: string | null
          deliveredAtZ?: string | null
          deliveredSignalId?: string | null
          deliveryAttempts: number
          deliveryReason?: string | null
          discardedAt?: string | null
          discardedAtZ?: string | null
          dismissedAt?: string | null
          dismissedAtZ?: string | null
          id: string
          kind: string
          lastDeliveryAttemptAt?: string | null
          lastDeliveryAttemptAtZ?: string | null
          lastDeliveryError?: string | null
          metadata?: Json | null
          payload?: Json | null
          priority: string
          resourceId?: string | null
          seenAt?: string | null
          seenAtZ?: string | null
          source: string
          sourceId?: string | null
          status: string
          summary: string
          summaryAt?: string | null
          summaryAtZ?: string | null
          summarySignalId?: string | null
          threadId: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          agentId?: string | null
          archivedAt?: string | null
          archivedAtZ?: string | null
          attributes?: Json | null
          coalescedCount?: number
          coalesceKey?: string | null
          createdAt?: string
          createdAtZ?: string | null
          dedupeKey?: string | null
          deliverAt?: string | null
          deliverAtZ?: string | null
          deliveredAt?: string | null
          deliveredAtZ?: string | null
          deliveredSignalId?: string | null
          deliveryAttempts?: number
          deliveryReason?: string | null
          discardedAt?: string | null
          discardedAtZ?: string | null
          dismissedAt?: string | null
          dismissedAtZ?: string | null
          id?: string
          kind?: string
          lastDeliveryAttemptAt?: string | null
          lastDeliveryAttemptAtZ?: string | null
          lastDeliveryError?: string | null
          metadata?: Json | null
          payload?: Json | null
          priority?: string
          resourceId?: string | null
          seenAt?: string | null
          seenAtZ?: string | null
          source?: string
          sourceId?: string | null
          status?: string
          summary?: string
          summaryAt?: string | null
          summaryAtZ?: string | null
          summarySignalId?: string | null
          threadId?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_observational_memory: {
        Row: {
          activeObservations: string
          activeObservationsPendingUpdate: string | null
          bufferedMessageIds: Json | null
          bufferedObservationChunks: Json | null
          bufferedObservations: string | null
          bufferedObservationTokens: number | null
          bufferedReflection: string | null
          bufferedReflectionInputTokens: number | null
          bufferedReflectionTokens: number | null
          config: string
          createdAt: string
          createdAtZ: string | null
          generationCount: number
          id: string
          isBufferingObservation: boolean
          isBufferingReflection: boolean
          isObserving: boolean
          isReflecting: boolean
          lastBufferedAtTime: string | null
          lastBufferedAtTimeZ: string | null
          lastBufferedAtTokens: number
          lastObservedAt: string | null
          lastObservedAtZ: string | null
          lastReflectionAt: string | null
          lastReflectionAtZ: string | null
          lookupKey: string
          metadata: Json | null
          observationTokenCount: number
          observedMessageIds: Json | null
          observedTimezone: string | null
          originType: string
          pendingMessageTokens: number
          reflectedObservationLineCount: number | null
          resourceId: string | null
          scope: string
          threadId: string | null
          totalTokensObserved: number
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          activeObservations: string
          activeObservationsPendingUpdate?: string | null
          bufferedMessageIds?: Json | null
          bufferedObservationChunks?: Json | null
          bufferedObservations?: string | null
          bufferedObservationTokens?: number | null
          bufferedReflection?: string | null
          bufferedReflectionInputTokens?: number | null
          bufferedReflectionTokens?: number | null
          config: string
          createdAt: string
          createdAtZ?: string | null
          generationCount: number
          id: string
          isBufferingObservation: boolean
          isBufferingReflection: boolean
          isObserving: boolean
          isReflecting: boolean
          lastBufferedAtTime?: string | null
          lastBufferedAtTimeZ?: string | null
          lastBufferedAtTokens: number
          lastObservedAt?: string | null
          lastObservedAtZ?: string | null
          lastReflectionAt?: string | null
          lastReflectionAtZ?: string | null
          lookupKey: string
          metadata?: Json | null
          observationTokenCount: number
          observedMessageIds?: Json | null
          observedTimezone?: string | null
          originType: string
          pendingMessageTokens: number
          reflectedObservationLineCount?: number | null
          resourceId?: string | null
          scope: string
          threadId?: string | null
          totalTokensObserved: number
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          activeObservations?: string
          activeObservationsPendingUpdate?: string | null
          bufferedMessageIds?: Json | null
          bufferedObservationChunks?: Json | null
          bufferedObservations?: string | null
          bufferedObservationTokens?: number | null
          bufferedReflection?: string | null
          bufferedReflectionInputTokens?: number | null
          bufferedReflectionTokens?: number | null
          config?: string
          createdAt?: string
          createdAtZ?: string | null
          generationCount?: number
          id?: string
          isBufferingObservation?: boolean
          isBufferingReflection?: boolean
          isObserving?: boolean
          isReflecting?: boolean
          lastBufferedAtTime?: string | null
          lastBufferedAtTimeZ?: string | null
          lastBufferedAtTokens?: number
          lastObservedAt?: string | null
          lastObservedAtZ?: string | null
          lastReflectionAt?: string | null
          lastReflectionAtZ?: string | null
          lookupKey?: string
          metadata?: Json | null
          observationTokenCount?: number
          observedMessageIds?: Json | null
          observedTimezone?: string | null
          originType?: string
          pendingMessageTokens?: number
          reflectedObservationLineCount?: number | null
          resourceId?: string | null
          scope?: string
          threadId?: string | null
          totalTokensObserved?: number
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_prompt_block_versions: {
        Row: {
          blockId: string
          changedFields: Json | null
          changeMessage: string | null
          content: string
          createdAt: string
          createdAtZ: string | null
          description: string | null
          id: string
          name: string
          requestContextSchema: Json | null
          rules: Json | null
          versionNumber: number
        }
        Insert: {
          blockId: string
          changedFields?: Json | null
          changeMessage?: string | null
          content: string
          createdAt: string
          createdAtZ?: string | null
          description?: string | null
          id: string
          name: string
          requestContextSchema?: Json | null
          rules?: Json | null
          versionNumber: number
        }
        Update: {
          blockId?: string
          changedFields?: Json | null
          changeMessage?: string | null
          content?: string
          createdAt?: string
          createdAtZ?: string | null
          description?: string | null
          id?: string
          name?: string
          requestContextSchema?: Json | null
          rules?: Json | null
          versionNumber?: number
        }
        Relationships: []
      }
      mastra_prompt_blocks: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          status: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          status: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_resources: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          updatedAt: string
          updatedAtZ: string | null
          workingMemory: string | null
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          updatedAt: string
          updatedAtZ?: string | null
          workingMemory?: string | null
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          updatedAt?: string
          updatedAtZ?: string | null
          workingMemory?: string | null
        }
        Relationships: []
      }
      mastra_schedule_triggers: {
        Row: {
          actual_fire_at: number
          error: string | null
          id: string
          metadata: Json | null
          outcome: string
          parent_trigger_id: string | null
          run_id: string | null
          schedule_id: string
          scheduled_fire_at: number
          trigger_kind: string
        }
        Insert: {
          actual_fire_at: number
          error?: string | null
          id: string
          metadata?: Json | null
          outcome: string
          parent_trigger_id?: string | null
          run_id?: string | null
          schedule_id: string
          scheduled_fire_at: number
          trigger_kind: string
        }
        Update: {
          actual_fire_at?: number
          error?: string | null
          id?: string
          metadata?: Json | null
          outcome?: string
          parent_trigger_id?: string | null
          run_id?: string | null
          schedule_id?: string
          scheduled_fire_at?: number
          trigger_kind?: string
        }
        Relationships: []
      }
      mastra_schedules: {
        Row: {
          created_at: number
          cron: string
          id: string
          last_fire_at: number | null
          last_run_id: string | null
          metadata: Json | null
          next_fire_at: number
          owner_id: string | null
          owner_type: string | null
          status: string
          target: Json
          timezone: string | null
          updated_at: number
        }
        Insert: {
          created_at: number
          cron: string
          id: string
          last_fire_at?: number | null
          last_run_id?: string | null
          metadata?: Json | null
          next_fire_at: number
          owner_id?: string | null
          owner_type?: string | null
          status: string
          target: Json
          timezone?: string | null
          updated_at: number
        }
        Update: {
          created_at?: number
          cron?: string
          id?: string
          last_fire_at?: number | null
          last_run_id?: string | null
          metadata?: Json | null
          next_fire_at?: number
          owner_id?: string | null
          owner_type?: string | null
          status?: string
          target?: Json
          timezone?: string | null
          updated_at?: number
        }
        Relationships: []
      }
      mastra_scorer_definition_versions: {
        Row: {
          changedFields: Json | null
          changeMessage: string | null
          createdAt: string
          createdAtZ: string | null
          defaultSampling: Json | null
          description: string | null
          id: string
          instructions: string | null
          model: Json | null
          name: string
          presetConfig: Json | null
          scoreRange: Json | null
          scorerDefinitionId: string
          type: string
          versionNumber: number
        }
        Insert: {
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt: string
          createdAtZ?: string | null
          defaultSampling?: Json | null
          description?: string | null
          id: string
          instructions?: string | null
          model?: Json | null
          name: string
          presetConfig?: Json | null
          scoreRange?: Json | null
          scorerDefinitionId: string
          type: string
          versionNumber: number
        }
        Update: {
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt?: string
          createdAtZ?: string | null
          defaultSampling?: Json | null
          description?: string | null
          id?: string
          instructions?: string | null
          model?: Json | null
          name?: string
          presetConfig?: Json | null
          scoreRange?: Json | null
          scorerDefinitionId?: string
          type?: string
          versionNumber?: number
        }
        Relationships: []
      }
      mastra_scorer_definitions: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          status: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          status: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_scorers: {
        Row: {
          additionalContext: Json | null
          analyzePrompt: string | null
          analyzeStepResult: Json | null
          createdAt: string
          createdAtZ: string | null
          entity: Json | null
          entityId: string | null
          entityType: string | null
          extractPrompt: string | null
          extractStepResult: Json | null
          generateReasonPrompt: string | null
          generateScorePrompt: string | null
          id: string
          input: Json
          metadata: Json | null
          output: Json
          preprocessPrompt: string | null
          preprocessStepResult: Json | null
          reason: string | null
          reasonPrompt: string | null
          requestContext: Json | null
          resourceId: string | null
          runId: string
          score: number
          scorer: Json
          scorerId: string
          source: string
          spanId: string | null
          threadId: string | null
          traceId: string | null
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          additionalContext?: Json | null
          analyzePrompt?: string | null
          analyzeStepResult?: Json | null
          createdAt: string
          createdAtZ?: string | null
          entity?: Json | null
          entityId?: string | null
          entityType?: string | null
          extractPrompt?: string | null
          extractStepResult?: Json | null
          generateReasonPrompt?: string | null
          generateScorePrompt?: string | null
          id: string
          input: Json
          metadata?: Json | null
          output: Json
          preprocessPrompt?: string | null
          preprocessStepResult?: Json | null
          reason?: string | null
          reasonPrompt?: string | null
          requestContext?: Json | null
          resourceId?: string | null
          runId: string
          score: number
          scorer: Json
          scorerId: string
          source: string
          spanId?: string | null
          threadId?: string | null
          traceId?: string | null
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          additionalContext?: Json | null
          analyzePrompt?: string | null
          analyzeStepResult?: Json | null
          createdAt?: string
          createdAtZ?: string | null
          entity?: Json | null
          entityId?: string | null
          entityType?: string | null
          extractPrompt?: string | null
          extractStepResult?: Json | null
          generateReasonPrompt?: string | null
          generateScorePrompt?: string | null
          id?: string
          input?: Json
          metadata?: Json | null
          output?: Json
          preprocessPrompt?: string | null
          preprocessStepResult?: Json | null
          reason?: string | null
          reasonPrompt?: string | null
          requestContext?: Json | null
          resourceId?: string | null
          runId?: string
          score?: number
          scorer?: Json
          scorerId?: string
          source?: string
          spanId?: string | null
          threadId?: string | null
          traceId?: string | null
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_skill_blobs: {
        Row: {
          content: string
          createdAt: string
          createdAtZ: string | null
          hash: string
          mimeType: string | null
          size: number
        }
        Insert: {
          content: string
          createdAt: string
          createdAtZ?: string | null
          hash: string
          mimeType?: string | null
          size: number
        }
        Update: {
          content?: string
          createdAt?: string
          createdAtZ?: string | null
          hash?: string
          mimeType?: string | null
          size?: number
        }
        Relationships: []
      }
      mastra_skill_versions: {
        Row: {
          assets: Json | null
          changedFields: Json | null
          changeMessage: string | null
          compatibility: Json | null
          createdAt: string
          createdAtZ: string | null
          description: string
          files: Json | null
          id: string
          instructions: string
          license: string | null
          metadata: Json | null
          name: string
          references: Json | null
          scripts: Json | null
          skillId: string
          source: Json | null
          tree: Json | null
          versionNumber: number
        }
        Insert: {
          assets?: Json | null
          changedFields?: Json | null
          changeMessage?: string | null
          compatibility?: Json | null
          createdAt: string
          createdAtZ?: string | null
          description: string
          files?: Json | null
          id: string
          instructions: string
          license?: string | null
          metadata?: Json | null
          name: string
          references?: Json | null
          scripts?: Json | null
          skillId: string
          source?: Json | null
          tree?: Json | null
          versionNumber: number
        }
        Update: {
          assets?: Json | null
          changedFields?: Json | null
          changeMessage?: string | null
          compatibility?: Json | null
          createdAt?: string
          createdAtZ?: string | null
          description?: string
          files?: Json | null
          id?: string
          instructions?: string
          license?: string | null
          metadata?: Json | null
          name?: string
          references?: Json | null
          scripts?: Json | null
          skillId?: string
          source?: Json | null
          tree?: Json | null
          versionNumber?: number
        }
        Relationships: []
      }
      mastra_skills: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          favoriteCount: number | null
          id: string
          status: string
          updatedAt: string
          updatedAtZ: string | null
          visibility: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          favoriteCount?: number | null
          id: string
          status: string
          updatedAt: string
          updatedAtZ?: string | null
          visibility?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          favoriteCount?: number | null
          id?: string
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      mastra_threads: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          resourceId: string
          title: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          resourceId: string
          title: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          resourceId?: string
          title?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_tool_provider_connections: {
        Row: {
          authorId: string
          connectionId: string
          createdAt: string
          createdAtZ: string | null
          label: string | null
          providerId: string
          scope: string
          toolkit: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          authorId: string
          connectionId: string
          createdAt: string
          createdAtZ?: string | null
          label?: string | null
          providerId: string
          scope: string
          toolkit: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          authorId?: string
          connectionId?: string
          createdAt?: string
          createdAtZ?: string | null
          label?: string | null
          providerId?: string
          scope?: string
          toolkit?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_workflow_snapshot: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          resourceId: string | null
          run_id: string
          snapshot: Json
          updatedAt: string
          updatedAtZ: string | null
          workflow_name: string
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          resourceId?: string | null
          run_id: string
          snapshot: Json
          updatedAt: string
          updatedAtZ?: string | null
          workflow_name: string
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          resourceId?: string | null
          run_id?: string
          snapshot?: Json
          updatedAt?: string
          updatedAtZ?: string | null
          workflow_name?: string
        }
        Relationships: []
      }
      mastra_workspace_versions: {
        Row: {
          autoSync: boolean | null
          changedFields: Json | null
          changeMessage: string | null
          createdAt: string
          createdAtZ: string | null
          description: string | null
          filesystem: Json | null
          id: string
          mounts: Json | null
          name: string
          operationTimeout: number | null
          sandbox: Json | null
          search: Json | null
          skills: Json | null
          tools: Json | null
          versionNumber: number
          workspaceId: string
        }
        Insert: {
          autoSync?: boolean | null
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt: string
          createdAtZ?: string | null
          description?: string | null
          filesystem?: Json | null
          id: string
          mounts?: Json | null
          name: string
          operationTimeout?: number | null
          sandbox?: Json | null
          search?: Json | null
          skills?: Json | null
          tools?: Json | null
          versionNumber: number
          workspaceId: string
        }
        Update: {
          autoSync?: boolean | null
          changedFields?: Json | null
          changeMessage?: string | null
          createdAt?: string
          createdAtZ?: string | null
          description?: string | null
          filesystem?: Json | null
          id?: string
          mounts?: Json | null
          name?: string
          operationTimeout?: number | null
          sandbox?: Json | null
          search?: Json | null
          skills?: Json | null
          tools?: Json | null
          versionNumber?: number
          workspaceId?: string
        }
        Relationships: []
      }
      mastra_workspaces: {
        Row: {
          activeVersionId: string | null
          authorId: string | null
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          status: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          status: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          activeVersionId?: string | null
          authorId?: string | null
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      notification_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          label_i18n_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label_i18n_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label_i18n_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_types: {
        Row: {
          body_i18n_key: string
          category_id: string
          created_at: string
          default_importance: Database["public"]["Enums"]["notification_importance"]
          description_i18n_key: string
          id: string
          is_active: boolean
          key: string
          label_i18n_key: string
          title_i18n_key: string
          updated_at: string
        }
        Insert: {
          body_i18n_key: string
          category_id: string
          created_at?: string
          default_importance?: Database["public"]["Enums"]["notification_importance"]
          description_i18n_key: string
          id?: string
          is_active?: boolean
          key: string
          label_i18n_key: string
          title_i18n_key: string
          updated_at?: string
        }
        Update: {
          body_i18n_key?: string
          category_id?: string
          created_at?: string
          default_importance?: Database["public"]["Enums"]["notification_importance"]
          description_i18n_key?: string
          id?: string
          is_active?: boolean
          key?: string
          label_i18n_key?: string
          title_i18n_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "notification_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_path: string | null
          avatar_url: string | null
          body_i18n_key: string
          created_at: string
          dedupe_key: string | null
          i18n_params: Json
          icon_key: string | null
          id: string
          importance: Database["public"]["Enums"]["notification_importance"]
          is_archived: boolean
          is_muted: boolean
          metadata: Json
          notification_type_id: string
          read_at: string | null
          title_i18n_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_path?: string | null
          avatar_url?: string | null
          body_i18n_key: string
          created_at?: string
          dedupe_key?: string | null
          i18n_params?: Json
          icon_key?: string | null
          id?: string
          importance?: Database["public"]["Enums"]["notification_importance"]
          is_archived?: boolean
          is_muted?: boolean
          metadata?: Json
          notification_type_id: string
          read_at?: string | null
          title_i18n_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_path?: string | null
          avatar_url?: string | null
          body_i18n_key?: string
          created_at?: string
          dedupe_key?: string | null
          i18n_params?: Json
          icon_key?: string | null
          id?: string
          importance?: Database["public"]["Enums"]["notification_importance"]
          is_archived?: boolean
          is_muted?: boolean
          metadata?: Json
          notification_type_id?: string
          read_at?: string | null
          title_i18n_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_notification_type_id_fkey"
            columns: ["notification_type_id"]
            isOneToOne: false
            referencedRelation: "notification_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
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
      token_deactivation_log: {
        Row: {
          created_at: string
          gmail_email: string | null
          id: string
          reason: string
          stage: string
          token_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gmail_email?: string | null
          id?: string
          reason: string
          stage: string
          token_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          gmail_email?: string | null
          id?: string
          reason?: string
          stage?: string
          token_id?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_attachments: {
        Row: {
          created_at: string
          filename: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
          discarded: boolean
          discarded_at: string | null
          discarded_reason: string | null
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
          discarded?: boolean
          discarded_at?: string | null
          discarded_reason?: string | null
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
          discarded?: boolean
          discarded_at?: string | null
          discarded_reason?: string | null
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
      user_notification_preferences: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          is_muted: boolean
          muted_until: string | null
          notification_type_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_muted?: boolean
          muted_until?: string | null
          notification_type_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_muted?: boolean
          muted_until?: string | null
          notification_type_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_notification_type_id_fkey"
            columns: ["notification_type_id"]
            isOneToOne: false
            referencedRelation: "notification_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          last_refresh_at: string | null
          last_refresh_error: string | null
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
          last_refresh_at?: string | null
          last_refresh_error?: string | null
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
          last_refresh_at?: string | null
          last_refresh_error?: string | null
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
      get_subscription_candidates: {
        Args: { p_min_confidence?: number; p_min_occurrences?: number }
        Returns: {
          avg_amount: number
          category: string
          confidence_score: number
          currency: string
          frequency: string
          interval_days_avg: number
          interval_stddev: number
          last_date: string
          max_amount: number
          merchant_display: string
          merchant_normalized: string
          min_amount: number
          next_estimated_date: string
          occurrences: number
          source_email_consistent: boolean
        }[]
      }
      get_subscription_transactions: {
        Args: { p_currency: string; p_merchant_normalized: string }
        Returns: {
          amount: number
          category: string
          created_at: string | null
          currency: string
          date: string
          discarded: boolean
          discarded_at: string | null
          discarded_reason: string | null
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
        }[]
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      health_check: {
        Args: never
        Returns: {
          check_timestamp: string
          status: string
          version: string
        }[]
      }
      http_post: {
        Args: { p_body: string; p_headers?: Json; p_url: string }
        Returns: Json
      }
      renew_gmail_watches: { Args: never; Returns: undefined }
      renew_watches_for_user: { Args: never; Returns: undefined }
      stop_all_watches_for_user: { Args: never; Returns: undefined }
    }
    Enums: {
      notification_importance: "low" | "normal" | "high" | "critical"
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
      notification_importance: ["low", "normal", "high", "critical"],
      seed_status: ["pending", "completed", "failed", "processing"],
    },
  },
} as const

