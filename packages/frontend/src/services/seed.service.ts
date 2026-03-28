import { getSupabase } from "../lib/supabase";
import { getConfig } from "../config";

export interface StartSeedResponse {
  seedId: string;
  status: string;
  message: string;
}

export const seedService = {
  /**
   * Start a seed to import historical emails
   */
  async startSeed(connectionId: string): Promise<StartSeedResponse> {
    const supabase = await getSupabase();
    const config = await getConfig();
    const edgeFunctionsUrl = `${config.supabase.url.replace(/\/+$/, "")}/functions/v1`;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("No active session");
    }

    const response = await fetch(`${edgeFunctionsUrl}/seed-emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: config.supabase.anonKey,
      },
      body: JSON.stringify({ connectionId }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        payload?.error || "Failed to start seed job"
      ) as Error & {
        code?: string;
      };
      error.code = payload?.code;
      throw error;
    }

    return payload;
  },
};
