// Custom errors for the seed-emails flow. The controller maps these to
// HTTP status codes; the service throws them; everything else throws
// plain Errors which become 500s.

export class SeedValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "SeedValidationError";
  }
}

export class SeedNotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = "SeedNotFoundError";
  }
}

export class SeedConflictError extends Error {
  statusCode = 409;
  constructor(
    message: string,
    public readonly context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "SeedConflictError";
  }
}

// DTOs

export interface StartSeedInput {
  userId: string;
  connectionId: string;
}

export interface StartSeedResult {
  seedId: string;
  status: "processing";
  totalMessages: number;
}

export interface ConnectionRow {
  id: string;
  user_id: string;
  gmail_email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  is_active: boolean | undefined;
}

export interface SeedRow {
  id: string;
  user_id: string;
  user_oauth_token_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  message_ids: string[] | null;
  total_emails: number | null;
  last_processed_index: number | null;
  transactions_found: number | null;
  error_message: string | null;
  updated_at: string | null;
}
