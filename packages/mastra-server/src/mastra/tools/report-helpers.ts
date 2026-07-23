import type { SupabaseClient } from "@supabase/supabase-js";
import { REPORT_STATUS_VALUES } from "./constants";

export type ReportStatus = (typeof REPORT_STATUS_VALUES)[number];

interface OwnedActiveReport {
  id: string;
  title: string;
  status: ReportStatus;
}

export async function loadOwnedActiveReports(
  supabase: SupabaseClient,
  userId: string,
  reportIds: readonly string[],
  context: string
): Promise<Map<string, OwnedActiveReport>> {
  const uniqueIds = Array.from(new Set(reportIds));
  const map = new Map<string, OwnedActiveReport>();

  if (uniqueIds.length === 0) return map;

  const { data, error } = await supabase
    .from("reports")
    .select("id, title, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("id", uniqueIds);

  if (error) {
    throw new Error(`Could not validate reports for ${context}.`);
  }

  for (const row of data ?? []) {
    const status = (row as { status: string }).status;
    if (status !== "active" && status !== "archived") continue;
    map.set((row as { id: string }).id, {
      id: (row as { id: string }).id,
      title: (row as { title: string }).title,
      status,
    });
  }

  const hasUnavailableReport = uniqueIds.some(
    id => !map.has(id) || map.get(id)?.status !== "active"
  );
  if (hasUnavailableReport) {
    throw new Error(`One or more reports are unavailable for ${context}.`);
  }

  return map;
}
