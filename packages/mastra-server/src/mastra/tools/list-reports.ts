import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { supabaseFromToken } from "../../lib/supabase-from-token";
import { REPORT_LIST_STATUS_VALUES, REPORT_STATUS_VALUES } from "./constants";

export const listReportsTool = createTool({
  id: "list-reports",
  description:
    "List the user's custom reports (id, title, description, date range, status). Call this BEFORE assigning transactions to a report so the agent can resolve report titles to their UUIDs. Reports are read-only definitions managed by the user in the Reports section; the agent cannot create, rename, archive, unarchive, or delete them — it can only filter and assign existing reports to transactions.",
  inputSchema: z.object({
    status: z
      .enum(REPORT_LIST_STATUS_VALUES)
      .default("all")
      .describe(
        "Filter by report status. 'active' (default-visible), 'archived' (hidden but preserved), or 'all' (both)."
      ),
  }),
  outputSchema: z.object({
    reports: z.array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        description: z.string().nullable(),
        dateRangeStart: z.string().nullable(),
        dateRangeEnd: z.string().nullable(),
        status: z.enum(REPORT_STATUS_VALUES),
      })
    ),
    count: z.number().int().nonnegative(),
  }),
  requestContextSchema: z.object({
    userId: z.string(),
    supabaseToken: z.string(),
  }),
  execute: async (input, ctx) => {
    const { supabaseToken } = ctx.requestContext!.all;
    const supabase = supabaseFromToken(supabaseToken);

    let q = supabase
      .from("reports")
      .select(
        "id, title, description, date_range_start, date_range_end, status"
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });

    if (input.status !== "all") {
      q = q.eq("status", input.status);
    }

    const { data, error } = await q;
    if (error) {
      throw new Error(`Failed to list reports: ${error.message}`);
    }

    const reports = (data ?? []).map(r => {
      const status = (r as { status: string }).status;
      return {
        id: (r as { id: string }).id,
        title: (r as { title: string }).title,
        description: ((r as { description: string | null }).description ??
          null) as string | null,
        dateRangeStart: ((r as { date_range_start: string | null })
          .date_range_start ?? null) as string | null,
        dateRangeEnd: ((r as { date_range_end: string | null })
          .date_range_end ?? null) as string | null,
        status:
          status === "archived" ? ("archived" as const) : ("active" as const),
      };
    });

    return { reports, count: reports.length };
  },
});
