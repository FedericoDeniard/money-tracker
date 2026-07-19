// Controller for seed-emails. Hono handler — HTTP boundary only.
// Auth, body parsing, and response formatting. Business logic lives
// in the service layer.
import type { Context } from "hono";
import { startSeed } from "../../services/seed-emails/seed-emails.service";
import {
  SeedConflictError,
  SeedNotFoundError,
  SeedValidationError,
} from "../../services/seed-emails/seed-emails.types";

interface SeedRequestBody {
  connectionId?: string;
}

export const seedEmailsHandler = async (c: Context) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userRole = c.get("userRole") ?? "user";

  let body: SeedRequestBody;
  try {
    body = (await c.req.json()) as SeedRequestBody;
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const result = await startSeed({
      userId,
      connectionId: body.connectionId ?? "",
      userRole,
    });
    return c.json(
      {
        seedId: result.seedId,
        status: result.status,
        totalMessages: result.totalMessages,
      },
      202
    );
  } catch (err) {
    if (err instanceof SeedValidationError) {
      return c.json({ error: err.message }, 400);
    }
    if (err instanceof SeedNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    if (err instanceof SeedConflictError) {
      return c.json({ error: err.message, ...err.context }, 409);
    }
    throw err;
  }
};
