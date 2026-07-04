// Controller for seed-emails. HTTP boundary only — request parsing,
// auth check, response formatting. All business logic lives in the
// service layer.
import { registerApiRoute } from "@mastra/core/server";
import { startSeed } from "../../services/seed-emails/seed-emails.service";
import {
  SeedConflictError,
  SeedNotFoundError,
  SeedValidationError,
} from "../../services/seed-emails/seed-emails.types";

interface SeedRequestBody {
  connectionId?: string;
}

export const seedEmailsRoute = () =>
  registerApiRoute("/api/seed-emails", {
    method: "POST",
    handler: async c => {
      const userId = c.get("requestContext")?.get?.("userId") as
        | string
        | undefined;
      if (!userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

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
    },
  });
