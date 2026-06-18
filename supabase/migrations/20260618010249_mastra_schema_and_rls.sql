-- ============================================================================
-- Mastra storage: schema + RLS lockdown
-- ============================================================================
-- Owns all 35 `mastra_*` tables that @mastra/pg's PostgresStore creates at
-- runtime, so deploys are order-independent: migrations and Mastra startup
-- can race without leaving the database in an insecure state.
--
-- Re-generate the DDL after upgrading @mastra/pg with:
--   bun --filter mastra-server export-schema
-- and diff the result against the marked block below.
--
-- Strategy:
--   1. CREATE TABLE / INDEX / TRIGGER / FUNCTION from @mastra/pg (idempotent)
--   2. ALTER TABLE ... ENABLE ROW LEVEL SECURITY on every mastra_* table
--   3. Per-user policies on the 5 tables the frontend reads
--   4. GRANT to `authenticated` only on those 5 tables
--   5. Event trigger that auto-enables RLS on any future mastra_* table Mastra
--      may add in a new version, keeping the system locked-down by default
-- ============================================================================

            CREATE TABLE IF NOT EXISTS "public"."mastra_threads" (
              "id" TEXT PRIMARY KEY NOT NULL,
"resourceId" TEXT NOT NULL,
"title" TEXT NOT NULL,
"metadata" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_messages" (
              "id" TEXT PRIMARY KEY NOT NULL,
"thread_id" TEXT NOT NULL,
"content" TEXT NOT NULL,
"role" TEXT NOT NULL,
"type" TEXT NOT NULL,
"createdAt" TIMESTAMP NOT NULL,
"resourceId" TEXT ,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_resources" (
              "id" TEXT PRIMARY KEY NOT NULL,
"workingMemory" TEXT ,
"metadata" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_observational_memory" (
              "id" TEXT PRIMARY KEY NOT NULL,
"lookupKey" TEXT NOT NULL,
"scope" TEXT NOT NULL,
"resourceId" TEXT ,
"threadId" TEXT ,
"activeObservations" TEXT NOT NULL,
"activeObservationsPendingUpdate" TEXT ,
"originType" TEXT NOT NULL,
"config" TEXT NOT NULL,
"generationCount" INTEGER NOT NULL,
"lastObservedAt" TIMESTAMP ,
"lastReflectionAt" TIMESTAMP ,
"pendingMessageTokens" INTEGER NOT NULL,
"totalTokensObserved" INTEGER NOT NULL,
"observationTokenCount" INTEGER NOT NULL,
"isObserving" BOOLEAN NOT NULL,
"isReflecting" BOOLEAN NOT NULL,
"observedMessageIds" JSONB ,
"observedTimezone" TEXT ,
"bufferedObservations" TEXT ,
"bufferedObservationTokens" INTEGER ,
"bufferedMessageIds" JSONB ,
"bufferedReflection" TEXT ,
"bufferedReflectionTokens" INTEGER ,
"bufferedReflectionInputTokens" INTEGER ,
"reflectedObservationLineCount" INTEGER ,
"bufferedObservationChunks" JSONB ,
"isBufferingObservation" BOOLEAN NOT NULL,
"isBufferingReflection" BOOLEAN NOT NULL,
"lastBufferedAtTokens" INTEGER NOT NULL,
"lastBufferedAtTime" TIMESTAMP ,
"metadata" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"lastObservedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"lastReflectionAtZ" TIMESTAMPTZ DEFAULT NOW(),
"lastBufferedAtTimeZ" TIMESTAMPTZ DEFAULT NOW(),
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          
CREATE INDEX IF NOT EXISTS "idx_om_lookup_key" ON "public"."mastra_observational_memory" ("lookupKey");
CREATE INDEX IF NOT EXISTS "mastra_threads_resourceid_createdat_idx" ON "public"."mastra_threads" ("resourceId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "mastra_messages_thread_id_createdat_idx" ON "public"."mastra_messages" ("thread_id", "createdAt" DESC);

            CREATE TABLE IF NOT EXISTS "public"."mastra_notifications" (
              "id" TEXT NOT NULL,
"threadId" TEXT NOT NULL,
"source" TEXT NOT NULL,
"kind" TEXT NOT NULL,
"priority" TEXT NOT NULL,
"status" TEXT NOT NULL,
"summary" TEXT NOT NULL,
"payload" JSONB ,
"resourceId" TEXT ,
"agentId" TEXT ,
"sourceId" TEXT ,
"dedupeKey" TEXT ,
"coalesceKey" TEXT ,
"coalescedCount" INTEGER NOT NULL,
"attributes" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"deliveredAt" TIMESTAMP ,
"seenAt" TIMESTAMP ,
"dismissedAt" TIMESTAMP ,
"archivedAt" TIMESTAMP ,
"discardedAt" TIMESTAMP ,
"deliverAt" TIMESTAMP ,
"summaryAt" TIMESTAMP ,
"deliveryReason" TEXT ,
"deliveryAttempts" INTEGER NOT NULL,
"lastDeliveryAttemptAt" TIMESTAMP ,
"lastDeliveryError" TEXT ,
"deliveredSignalId" TEXT ,
"summarySignalId" TEXT ,
"metadata" JSONB ,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"deliveredAtZ" TIMESTAMPTZ DEFAULT NOW(),
"seenAtZ" TIMESTAMPTZ DEFAULT NOW(),
"dismissedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"archivedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"discardedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"deliverAtZ" TIMESTAMPTZ DEFAULT NOW(),
"summaryAtZ" TIMESTAMPTZ DEFAULT NOW(),
"lastDeliveryAttemptAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          
CREATE INDEX IF NOT EXISTS "idx_notifications_thread_status_updated" ON "public"."mastra_notifications" ("threadId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "idx_notifications_coalescing" ON "public"."mastra_notifications" ("threadId", "source", "kind", "status", "agentId", "resourceId", "dedupeKey", "coalesceKey");
CREATE INDEX IF NOT EXISTS "idx_notifications_due" ON "public"."mastra_notifications" ("status", "deliverAt", "summaryAt");

            CREATE TABLE IF NOT EXISTS "public"."mastra_ai_spans" (
              "traceId" TEXT NOT NULL,
"spanId" TEXT NOT NULL,
"name" TEXT NOT NULL,
"spanType" TEXT NOT NULL,
"isEvent" BOOLEAN NOT NULL,
"startedAt" TIMESTAMP NOT NULL,
"parentSpanId" TEXT ,
"entityType" TEXT ,
"entityId" TEXT ,
"entityName" TEXT ,
"parentEntityType" TEXT ,
"parentEntityId" TEXT ,
"parentEntityName" TEXT ,
"rootEntityType" TEXT ,
"rootEntityId" TEXT ,
"rootEntityName" TEXT ,
"userId" TEXT ,
"organizationId" TEXT ,
"resourceId" TEXT ,
"runId" TEXT ,
"sessionId" TEXT ,
"threadId" TEXT ,
"requestId" TEXT ,
"environment" TEXT ,
"serviceName" TEXT ,
"scope" JSONB ,
"entityVersionId" TEXT ,
"parentEntityVersionId" TEXT ,
"rootEntityVersionId" TEXT ,
"experimentId" TEXT ,
"source" TEXT ,
"metadata" JSONB ,
"tags" JSONB ,
"attributes" JSONB ,
"links" JSONB ,
"input" JSONB ,
"output" JSONB ,
"error" JSONB ,
"endedAt" TIMESTAMP ,
"requestContext" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP ,
"startedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"endedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = lower('public_mastra_ai_spans_traceid_spanid_pk') AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
              ) THEN
                ALTER TABLE "public"."mastra_ai_spans"
                ADD CONSTRAINT public_mastra_ai_spans_traceid_spanid_pk
                PRIMARY KEY ("traceId", "spanId");
              END IF;
            END $$;
            
          
CREATE OR REPLACE FUNCTION "public".trigger_set_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW."createdAt" = NOW();
        NEW."updatedAt" = NOW();
        NEW."createdAtZ" = NOW();
        NEW."updatedAtZ" = NOW();
    ELSIF TG_OP = 'UPDATE' THEN
        NEW."updatedAt" = NOW();
        NEW."updatedAtZ" = NOW();
        NEW."createdAt" = OLD."createdAt";
        NEW."createdAtZ" = OLD."createdAtZ";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "mastra_ai_spans_timestamps" ON "public"."mastra_ai_spans";

CREATE TRIGGER "mastra_ai_spans_timestamps"
    BEFORE INSERT OR UPDATE ON "public"."mastra_ai_spans"
    FOR EACH ROW
    EXECUTE FUNCTION "public".trigger_set_timestamps();
CREATE INDEX IF NOT EXISTS "mastra_ai_spans_traceid_startedat_idx" ON "public"."mastra_ai_spans" ("traceId", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "mastra_ai_spans_parentspanid_startedat_idx" ON "public"."mastra_ai_spans" ("parentSpanId", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "mastra_ai_spans_name_idx" ON "public"."mastra_ai_spans" ("name");
CREATE INDEX IF NOT EXISTS "mastra_ai_spans_spantype_startedat_idx" ON "public"."mastra_ai_spans" ("spanType", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "mastra_ai_spans_root_spans_idx" ON "public"."mastra_ai_spans" ("startedAt" DESC) WHERE "parentSpanId" IS NULL;
CREATE INDEX IF NOT EXISTS "mastra_ai_spans_entitytype_entityid_idx" ON "public"."mastra_ai_spans" ("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "mastra_ai_spans_entitytype_entityname_idx" ON "public"."mastra_ai_spans" ("entityType", "entityName");
CREATE INDEX IF NOT EXISTS "mastra_ai_spans_orgid_userid_idx" ON "public"."mastra_ai_spans" ("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "mastra_ai_spans_metadata_gin_idx" ON "public"."mastra_ai_spans" USING gin ("metadata");
CREATE INDEX IF NOT EXISTS "mastra_ai_spans_tags_gin_idx" ON "public"."mastra_ai_spans" USING gin ("tags");

            CREATE TABLE IF NOT EXISTS "public"."mastra_scorers" (
              "id" TEXT PRIMARY KEY NOT NULL,
"scorerId" TEXT NOT NULL,
"traceId" TEXT ,
"spanId" TEXT ,
"runId" TEXT NOT NULL,
"scorer" JSONB NOT NULL,
"preprocessStepResult" JSONB ,
"extractStepResult" JSONB ,
"analyzeStepResult" JSONB ,
"score" FLOAT NOT NULL,
"reason" TEXT ,
"metadata" JSONB ,
"preprocessPrompt" TEXT ,
"extractPrompt" TEXT ,
"generateScorePrompt" TEXT ,
"generateReasonPrompt" TEXT ,
"analyzePrompt" TEXT ,
"reasonPrompt" TEXT ,
"input" JSONB NOT NULL,
"output" JSONB NOT NULL,
"additionalContext" JSONB ,
"requestContext" JSONB ,
"entityType" TEXT ,
"entity" JSONB ,
"entityId" TEXT ,
"source" TEXT NOT NULL,
"resourceId" TEXT ,
"threadId" TEXT ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          
CREATE INDEX IF NOT EXISTS "mastra_scores_trace_id_span_id_created_at_idx" ON "public"."mastra_scorers" ("traceId", "spanId", "createdAt" DESC);

            CREATE TABLE IF NOT EXISTS "public"."mastra_scorer_definitions" (
              "id" TEXT PRIMARY KEY NOT NULL,
"status" TEXT NOT NULL,
"activeVersionId" TEXT ,
"authorId" TEXT ,
"metadata" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_scorer_definition_versions" (
              "id" TEXT PRIMARY KEY NOT NULL,
"scorerDefinitionId" TEXT NOT NULL,
"versionNumber" INTEGER NOT NULL,
"name" TEXT NOT NULL,
"description" TEXT ,
"type" TEXT NOT NULL,
"model" JSONB ,
"instructions" TEXT ,
"scoreRange" JSONB ,
"presetConfig" JSONB ,
"defaultSampling" JSONB ,
"changedFields" JSONB ,
"changeMessage" TEXT ,
"createdAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          
CREATE UNIQUE INDEX IF NOT EXISTS "idx_scorer_definition_versions_def_version" ON "public"."mastra_scorer_definition_versions" ("scorerDefinitionId", "versionNumber");

            CREATE TABLE IF NOT EXISTS "public"."mastra_prompt_blocks" (
              "id" TEXT PRIMARY KEY NOT NULL,
"status" TEXT NOT NULL,
"activeVersionId" TEXT ,
"authorId" TEXT ,
"metadata" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_prompt_block_versions" (
              "id" TEXT PRIMARY KEY NOT NULL,
"blockId" TEXT NOT NULL,
"versionNumber" INTEGER NOT NULL,
"name" TEXT NOT NULL,
"description" TEXT ,
"content" TEXT NOT NULL,
"rules" JSONB ,
"requestContextSchema" JSONB ,
"changedFields" JSONB ,
"changeMessage" TEXT ,
"createdAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          
CREATE UNIQUE INDEX IF NOT EXISTS "idx_prompt_block_versions_block_version" ON "public"."mastra_prompt_block_versions" ("blockId", "versionNumber");

            CREATE TABLE IF NOT EXISTS "public"."mastra_agents" (
              "id" TEXT PRIMARY KEY NOT NULL,
"status" TEXT NOT NULL,
"activeVersionId" TEXT ,
"authorId" TEXT ,
"visibility" TEXT ,
"metadata" JSONB ,
"favoriteCount" INTEGER ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_agent_versions" (
              "id" TEXT PRIMARY KEY NOT NULL,
"agentId" TEXT NOT NULL,
"versionNumber" INTEGER NOT NULL,
"name" TEXT NOT NULL,
"description" TEXT ,
"instructions" TEXT NOT NULL,
"model" JSONB NOT NULL,
"tools" JSONB ,
"defaultOptions" JSONB ,
"workflows" JSONB ,
"agents" JSONB ,
"integrationTools" JSONB ,
"toolProviders" JSONB ,
"inputProcessors" JSONB ,
"outputProcessors" JSONB ,
"memory" JSONB ,
"scorers" JSONB ,
"mcpClients" JSONB ,
"requestContextSchema" JSONB ,
"workspace" JSONB ,
"skills" JSONB ,
"skillsFormat" TEXT ,
"browser" JSONB ,
"changedFields" JSONB ,
"changeMessage" TEXT ,
"createdAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_mcp_clients" (
              "id" TEXT PRIMARY KEY NOT NULL,
"status" TEXT NOT NULL,
"activeVersionId" TEXT ,
"authorId" TEXT ,
"metadata" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_mcp_client_versions" (
              "id" TEXT PRIMARY KEY NOT NULL,
"mcpClientId" TEXT NOT NULL,
"versionNumber" INTEGER NOT NULL,
"name" TEXT NOT NULL,
"description" TEXT ,
"servers" JSONB NOT NULL,
"changedFields" JSONB ,
"changeMessage" TEXT ,
"createdAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mcp_client_versions_client_version" ON "public"."mastra_mcp_client_versions" ("mcpClientId", "versionNumber");

            CREATE TABLE IF NOT EXISTS "public"."mastra_mcp_servers" (
              "id" TEXT PRIMARY KEY NOT NULL,
"status" TEXT NOT NULL,
"activeVersionId" TEXT ,
"authorId" TEXT ,
"metadata" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_mcp_server_versions" (
              "id" TEXT PRIMARY KEY NOT NULL,
"mcpServerId" TEXT NOT NULL,
"versionNumber" INTEGER NOT NULL,
"name" TEXT NOT NULL,
"version" TEXT NOT NULL,
"description" TEXT ,
"instructions" TEXT ,
"repository" JSONB ,
"releaseDate" TEXT ,
"isLatest" BOOLEAN ,
"packageCanonical" TEXT ,
"tools" JSONB ,
"agents" JSONB ,
"workflows" JSONB ,
"changedFields" JSONB ,
"changeMessage" TEXT ,
"createdAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mcp_server_versions_server_version" ON "public"."mastra_mcp_server_versions" ("mcpServerId", "versionNumber");

            CREATE TABLE IF NOT EXISTS "public"."mastra_workspaces" (
              "id" TEXT PRIMARY KEY NOT NULL,
"status" TEXT NOT NULL,
"activeVersionId" TEXT ,
"authorId" TEXT ,
"metadata" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_workspace_versions" (
              "id" TEXT PRIMARY KEY NOT NULL,
"workspaceId" TEXT NOT NULL,
"versionNumber" INTEGER NOT NULL,
"name" TEXT NOT NULL,
"description" TEXT ,
"filesystem" JSONB ,
"sandbox" JSONB ,
"mounts" JSONB ,
"search" JSONB ,
"skills" JSONB ,
"tools" JSONB ,
"autoSync" BOOLEAN ,
"operationTimeout" INTEGER ,
"changedFields" JSONB ,
"changeMessage" TEXT ,
"createdAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          
CREATE UNIQUE INDEX IF NOT EXISTS "idx_workspace_versions_workspace_version" ON "public"."mastra_workspace_versions" ("workspaceId", "versionNumber");

            CREATE TABLE IF NOT EXISTS "public"."mastra_skills" (
              "id" TEXT PRIMARY KEY NOT NULL,
"status" TEXT NOT NULL,
"activeVersionId" TEXT ,
"authorId" TEXT ,
"visibility" TEXT ,
"favoriteCount" INTEGER ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_skill_versions" (
              "id" TEXT PRIMARY KEY NOT NULL,
"skillId" TEXT NOT NULL,
"versionNumber" INTEGER NOT NULL,
"name" TEXT NOT NULL,
"description" TEXT NOT NULL,
"instructions" TEXT NOT NULL,
"license" TEXT ,
"compatibility" JSONB ,
"source" JSONB ,
"references" JSONB ,
"scripts" JSONB ,
"assets" JSONB ,
"files" JSONB ,
"metadata" JSONB ,
"tree" JSONB ,
"changedFields" JSONB ,
"changeMessage" TEXT ,
"createdAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          
CREATE UNIQUE INDEX IF NOT EXISTS "idx_skill_versions_skill_version" ON "public"."mastra_skill_versions" ("skillId", "versionNumber");

            CREATE TABLE IF NOT EXISTS "public"."mastra_skill_blobs" (
              "hash" TEXT PRIMARY KEY NOT NULL,
"content" TEXT NOT NULL,
"size" INTEGER NOT NULL,
"mimeType" TEXT ,
"createdAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_tool_provider_connections" (
              "authorId" TEXT NOT NULL,
"providerId" TEXT NOT NULL,
"connectionId" TEXT NOT NULL,
"toolkit" TEXT NOT NULL,
"label" TEXT ,
"scope" TEXT NOT NULL,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW(),
PRIMARY KEY ("authorId", "providerId", "connectionId")
            );
            
          
          
CREATE INDEX IF NOT EXISTS "idx_tool_provider_connections_author" ON "public"."mastra_tool_provider_connections" ("authorId", "providerId", "toolkit");

            CREATE TABLE IF NOT EXISTS "public"."mastra_workflow_snapshot" (
              "workflow_name" TEXT NOT NULL,
"run_id" TEXT NOT NULL,
"resourceId" TEXT ,
"snapshot" JSONB NOT NULL,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = lower('public_mastra_workflow_snapshot_workflow_name_run_id_key') AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
              ) AND NOT EXISTS (
                SELECT 1 FROM pg_indexes WHERE indexname = lower('public_mastra_workflow_snapshot_workflow_name_run_id_key') AND schemaname = 'public'
              ) THEN
                ALTER TABLE "public"."mastra_workflow_snapshot"
                ADD CONSTRAINT public_mastra_workflow_snapshot_workflow_name_run_id_key
                UNIQUE (workflow_name, run_id);
              END IF;
              IF EXISTS (
                SELECT 1 FROM pg_index i
                JOIN pg_class c ON i.indexrelid = c.oid
                JOIN pg_namespace n ON c.relnamespace = n.oid
                WHERE c.relname = lower('public_mastra_workflow_snapshot_workflow_name_run_id_key')
                AND n.nspname = 'public'
                AND i.indisreplident = false
              ) THEN
                ALTER TABLE "public"."mastra_workflow_snapshot"
                REPLICA IDENTITY USING INDEX public_mastra_workflow_snapshot_workflow_name_run_id_key;
              END IF;
            END $$;
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_datasets" (
              "id" TEXT PRIMARY KEY NOT NULL,
"name" TEXT NOT NULL,
"description" TEXT ,
"metadata" JSONB ,
"inputSchema" JSONB ,
"groundTruthSchema" JSONB ,
"requestContextSchema" JSONB ,
"tags" JSONB ,
"targetType" TEXT ,
"targetIds" JSONB ,
"scorerIds" JSONB ,
"version" INTEGER NOT NULL,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_dataset_items" (
              "id" TEXT NOT NULL,
"datasetId" TEXT NOT NULL,
"datasetVersion" INTEGER NOT NULL,
"validTo" INTEGER ,
"isDeleted" BOOLEAN NOT NULL,
"input" JSONB NOT NULL,
"groundTruth" JSONB ,
"requestContext" JSONB ,
"metadata" JSONB ,
"source" JSONB ,
"expectedTrajectory" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW(),
PRIMARY KEY ("id", "datasetVersion")
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_dataset_versions" (
              "id" TEXT PRIMARY KEY NOT NULL,
"datasetId" TEXT NOT NULL,
"version" INTEGER NOT NULL,
"createdAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_experiments" (
              "id" TEXT PRIMARY KEY NOT NULL,
"name" TEXT ,
"description" TEXT ,
"metadata" JSONB ,
"datasetId" TEXT ,
"datasetVersion" INTEGER ,
"targetType" TEXT NOT NULL,
"targetId" TEXT NOT NULL,
"status" TEXT NOT NULL,
"totalItems" INTEGER NOT NULL,
"succeededCount" INTEGER NOT NULL,
"failedCount" INTEGER NOT NULL,
"skippedCount" INTEGER NOT NULL,
"startedAt" TIMESTAMP ,
"completedAt" TIMESTAMP ,
"agentVersion" TEXT ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"startedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"completedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_experiment_results" (
              "id" TEXT PRIMARY KEY NOT NULL,
"experimentId" TEXT NOT NULL,
"itemId" TEXT NOT NULL,
"itemDatasetVersion" INTEGER ,
"input" JSONB NOT NULL,
"output" JSONB ,
"groundTruth" JSONB ,
"error" JSONB ,
"startedAt" TIMESTAMP NOT NULL,
"completedAt" TIMESTAMP NOT NULL,
"retryCount" INTEGER NOT NULL,
"traceId" TEXT ,
"status" TEXT ,
"tags" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"startedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"completedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"createdAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_background_tasks" (
              "id" TEXT PRIMARY KEY NOT NULL,
"tool_call_id" TEXT NOT NULL,
"tool_name" TEXT NOT NULL,
"agent_id" TEXT NOT NULL,
"run_id" TEXT NOT NULL,
"thread_id" TEXT ,
"resource_id" TEXT ,
"status" TEXT NOT NULL,
"args" JSONB NOT NULL,
"result" JSONB ,
"error" JSONB ,
"suspend_payload" JSONB ,
"retry_count" INTEGER NOT NULL,
"max_retries" INTEGER NOT NULL,
"timeout_ms" INTEGER NOT NULL,
"createdAt" TIMESTAMP NOT NULL,
"startedAt" TIMESTAMP ,
"suspendedAt" TIMESTAMP ,
"completedAt" TIMESTAMP ,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"startedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"suspendedAtZ" TIMESTAMPTZ DEFAULT NOW(),
"completedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          
CREATE INDEX IF NOT EXISTS "mastra_bg_tasks_status_created_at_idx" ON "public"."mastra_background_tasks" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "mastra_bg_tasks_agent_status_idx" ON "public"."mastra_background_tasks" ("agent_id", "status");
CREATE INDEX IF NOT EXISTS "mastra_bg_tasks_thread_idx" ON "public"."mastra_background_tasks" ("thread_id", "createdAt");
CREATE INDEX IF NOT EXISTS "mastra_bg_tasks_tool_call_idx" ON "public"."mastra_background_tasks" ("tool_call_id");

            CREATE TABLE IF NOT EXISTS "public"."mastra_favorites" (
              "userId" TEXT NOT NULL,
"entityType" TEXT NOT NULL,
"entityId" TEXT NOT NULL,
"createdAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
PRIMARY KEY ("userId", "entityType", "entityId")
            );
            
          
          
CREATE INDEX IF NOT EXISTS idx_favorites_entity ON "public"."mastra_favorites" ("entityType", "entityId");

            CREATE TABLE IF NOT EXISTS "public"."mastra_channel_installations" (
              "id" TEXT PRIMARY KEY NOT NULL,
"platform" TEXT NOT NULL,
"agentId" TEXT NOT NULL,
"status" TEXT NOT NULL,
"webhookId" TEXT ,
"data" JSONB NOT NULL,
"configHash" TEXT ,
"error" TEXT ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_channel_config" (
              "platform" TEXT PRIMARY KEY NOT NULL,
"data" JSONB NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );
            
          
          
CREATE UNIQUE INDEX IF NOT EXISTS "idx_channel_installations_webhook" ON "public"."mastra_channel_installations" ("webhookId");
CREATE INDEX IF NOT EXISTS "idx_channel_installations_platform_agent" ON "public"."mastra_channel_installations" ("platform", "agentId");

            CREATE TABLE IF NOT EXISTS "public"."mastra_schedules" (
              "id" TEXT PRIMARY KEY NOT NULL,
"target" JSONB NOT NULL,
"cron" TEXT NOT NULL,
"timezone" TEXT ,
"status" TEXT NOT NULL,
"next_fire_at" BIGINT NOT NULL,
"last_fire_at" BIGINT ,
"last_run_id" TEXT ,
"created_at" BIGINT NOT NULL,
"updated_at" BIGINT NOT NULL,
"metadata" JSONB ,
"owner_type" TEXT ,
"owner_id" TEXT 
            );
            
          
          

            CREATE TABLE IF NOT EXISTS "public"."mastra_schedule_triggers" (
              "id" TEXT PRIMARY KEY NOT NULL,
"schedule_id" TEXT NOT NULL,
"run_id" TEXT ,
"scheduled_fire_at" BIGINT NOT NULL,
"actual_fire_at" BIGINT NOT NULL,
"outcome" TEXT NOT NULL,
"error" TEXT ,
"trigger_kind" TEXT NOT NULL,
"parent_trigger_id" TEXT ,
"metadata" JSONB 
            );
            
          
          
CREATE INDEX IF NOT EXISTS "idx_mastra_schedules_status_next_fire" ON "public"."mastra_schedules" ("status", "next_fire_at");
CREATE INDEX IF NOT EXISTS "idx_mastra_schedule_triggers_schedule_fire" ON "public"."mastra_schedule_triggers" ("schedule_id", "actual_fire_at" DESC);

-- ----------------------------------------------------------------------------
-- 2. RLS: enable on every mastra_* table (server-only ones are locked down
--    by being left without policies, so only roles with BYPASSRLS can read
--    or write them — that's `postgres` and `service_role` in Supabase).
-- ----------------------------------------------------------------------------

ALTER TABLE public.mastra_threads                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_messages                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_resources                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_observational_memory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_notifications                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_ai_spans                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_scorers                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_scorer_definitions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_scorer_definition_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_prompt_blocks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_prompt_block_versions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_agents                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_agent_versions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_mcp_clients                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_mcp_client_versions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_mcp_servers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_mcp_server_versions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_workspaces                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_workspace_versions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_skills                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_skill_versions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_skill_blobs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_tool_provider_connections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_workflow_snapshot             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_datasets                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_dataset_items                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_dataset_versions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_experiments                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_experiment_results            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_background_tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_favorites                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_channel_installations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_channel_config                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_schedules                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_schedule_triggers             ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. Per-user policies on the 5 tables the frontend reads.
--    The frontend connects as `authenticated`; the server (PostgresStore)
--    connects with BYPASSRLS so it ignores RLS entirely.
-- ----------------------------------------------------------------------------

-- mastra_threads: scoped by resourceId == auth.uid()
DROP POLICY IF EXISTS "Users can read their own threads"            ON public.mastra_threads;
CREATE POLICY "Users can read their own threads"
  ON public.mastra_threads FOR SELECT TO authenticated
  USING (("resourceId") = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can create their own threads"          ON public.mastra_threads;
CREATE POLICY "Users can create their own threads"
  ON public.mastra_threads FOR INSERT TO authenticated
  WITH CHECK (("resourceId") = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can update their own threads"          ON public.mastra_threads;
CREATE POLICY "Users can update their own threads"
  ON public.mastra_threads FOR UPDATE TO authenticated
  USING (("resourceId") = (select auth.uid())::text)
  WITH CHECK (("resourceId") = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can delete their own threads"          ON public.mastra_threads;
CREATE POLICY "Users can delete their own threads"
  ON public.mastra_threads FOR DELETE TO authenticated
  USING (("resourceId") = (select auth.uid())::text);

-- mastra_messages: scoped via the parent thread's resourceId
DROP POLICY IF EXISTS "Users can read messages from their own threads"     ON public.mastra_messages;
CREATE POLICY "Users can read messages from their own threads"
  ON public.mastra_messages FOR SELECT TO authenticated
  USING (thread_id IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text));

DROP POLICY IF EXISTS "Users can insert messages into their own threads"   ON public.mastra_messages;
CREATE POLICY "Users can insert messages into their own threads"
  ON public.mastra_messages FOR INSERT TO authenticated
  WITH CHECK (thread_id IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text));

DROP POLICY IF EXISTS "Users can update messages in their own threads"     ON public.mastra_messages;
CREATE POLICY "Users can update messages in their own threads"
  ON public.mastra_messages FOR UPDATE TO authenticated
  USING (thread_id IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text))
  WITH CHECK (thread_id IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text));

DROP POLICY IF EXISTS "Users can delete messages in their own threads"     ON public.mastra_messages;
CREATE POLICY "Users can delete messages in their own threads"
  ON public.mastra_messages FOR DELETE TO authenticated
  USING (thread_id IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text));

-- mastra_resources: id IS the resource id
DROP POLICY IF EXISTS "Users can read their own working memory"     ON public.mastra_resources;
CREATE POLICY "Users can read their own working memory"
  ON public.mastra_resources FOR SELECT TO authenticated
  USING (id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can write their own working memory"    ON public.mastra_resources;
CREATE POLICY "Users can write their own working memory"
  ON public.mastra_resources FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can update their own working memory"   ON public.mastra_resources;
CREATE POLICY "Users can update their own working memory"
  ON public.mastra_resources FOR UPDATE TO authenticated
  USING (id = (select auth.uid())::text)
  WITH CHECK (id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can delete their own working memory"   ON public.mastra_resources;
CREATE POLICY "Users can delete their own working memory"
  ON public.mastra_resources FOR DELETE TO authenticated
  USING (id = (select auth.uid())::text);

-- mastra_observational_memory: scoped via resourceId or via the parent thread
DROP POLICY IF EXISTS "Users can read their own observational memory"   ON public.mastra_observational_memory;
CREATE POLICY "Users can read their own observational memory"
  ON public.mastra_observational_memory FOR SELECT TO authenticated
  USING (
    ("resourceId") = (select auth.uid())::text
    OR "threadId" IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text)
  );

DROP POLICY IF EXISTS "Users can write their own observational memory"  ON public.mastra_observational_memory;
CREATE POLICY "Users can write their own observational memory"
  ON public.mastra_observational_memory FOR INSERT TO authenticated
  WITH CHECK (
    ("resourceId") = (select auth.uid())::text
    OR "threadId" IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text)
  );

DROP POLICY IF EXISTS "Users can update their own observational memory"  ON public.mastra_observational_memory;
CREATE POLICY "Users can update their own observational memory"
  ON public.mastra_observational_memory FOR UPDATE TO authenticated
  USING (
    ("resourceId") = (select auth.uid())::text
    OR "threadId" IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text)
  )
  WITH CHECK (
    ("resourceId") = (select auth.uid())::text
    OR "threadId" IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text)
  );

DROP POLICY IF EXISTS "Users can delete their own observational memory"  ON public.mastra_observational_memory;
CREATE POLICY "Users can delete their own observational memory"
  ON public.mastra_observational_memory FOR DELETE TO authenticated
  USING (
    ("resourceId") = (select auth.uid())::text
    OR "threadId" IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text)
  );

-- mastra_notifications: scoped via resourceId or via the parent thread
DROP POLICY IF EXISTS "Users can read their own notifications"   ON public.mastra_notifications;
CREATE POLICY "Users can read their own notifications"
  ON public.mastra_notifications FOR SELECT TO authenticated
  USING (
    ("resourceId") = (select auth.uid())::text
    OR "threadId" IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text)
  );

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.mastra_notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.mastra_notifications FOR UPDATE TO authenticated
  USING (
    ("resourceId") = (select auth.uid())::text
    OR "threadId" IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text)
  )
  WITH CHECK (
    ("resourceId") = (select auth.uid())::text
    OR "threadId" IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text)
  );

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.mastra_notifications;
CREATE POLICY "Users can delete their own notifications"
  ON public.mastra_notifications FOR DELETE TO authenticated
  USING (
    ("resourceId") = (select auth.uid())::text
    OR "threadId" IN (SELECT id FROM public.mastra_threads WHERE ("resourceId") = (select auth.uid())::text)
  );

-- ----------------------------------------------------------------------------
-- 4. Grants: only the 5 user-facing tables are reachable by the `authenticated`
--    role (used by the frontend through PostgREST). The 30 server-only tables
--    have no GRANT for `authenticated`; they are reachable only by roles with
--    BYPASSRLS, which in Supabase is `postgres` and `service_role`.
-- ----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastra_threads             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastra_messages            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastra_resources           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastra_observational_memory TO authenticated;
GRANT SELECT, UPDATE, DELETE        ON public.mastra_notifications       TO authenticated;
-- mastra_notifications is INSERTed by the server, not the client. Adjust if the
-- frontend ever needs to create notifications directly.

-- ----------------------------------------------------------------------------
-- 5. Auto-RLS event trigger: any `CREATE TABLE public.mastra_*` issued later
--    (by Mastra at runtime, or by a future @mastra/pg version) is forced to
--    RLS-enabled immediately. This keeps the schema locked-down by default so
--    a new table landing in a deploy cannot accidentally be public.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mastra_auto_enable_rls()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  cmd record;
  qualified_name text;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag = 'CREATE TABLE'
  LOOP
    qualified_name := cmd.object_identity;
    IF qualified_name LIKE 'public.mastra_%' THEN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', qualified_name);
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS mastra_auto_enable_rls;

CREATE EVENT TRIGGER mastra_auto_enable_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION public.mastra_auto_enable_rls();
