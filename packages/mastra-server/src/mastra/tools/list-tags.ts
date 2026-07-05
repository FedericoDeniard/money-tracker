import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { supabaseFromToken } from "../../lib/supabase-from-token";

const TAG_COLORS = [
  "slate",
  "emerald",
  "indigo",
  "coral",
  "amber",
  "cerulean",
  "lavender",
  "rose",
] as const;

export const listTagsTool = createTool({
  id: "list-tags",
  description:
    "List the user's custom transaction tags (id, name, color). Call this BEFORE assigning tags to a transaction so the agent can resolve tag names to their UUIDs. Tags are created and managed by the user in Settings; the agent cannot create, rename, recolor, or delete them — it can only assign existing ones to transactions.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    tags: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        color: z.enum(TAG_COLORS),
      })
    ),
    count: z.number().int().nonnegative(),
  }),
  requestContextSchema: z.object({
    userId: z.string(),
    supabaseToken: z.string(),
  }),
  execute: async (_input, ctx) => {
    const { supabaseToken } = ctx.requestContext!.all;
    const supabase = supabaseFromToken(supabaseToken);

    const { data, error } = await supabase
      .from("tags")
      .select("id, name, color")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to list tags: ${error.message}`);
    }

    const tags = (data ?? []).map(r => ({
      id: r.id as string,
      name: r.name as string,
      color: r.color as (typeof TAG_COLORS)[number],
    }));

    return { tags, count: tags.length };
  },
});
