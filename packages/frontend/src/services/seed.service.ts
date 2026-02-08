import { getSupabase } from '../lib/supabase';
import { config } from '../config';

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

    // Get the current session token
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult?.data?.session;
    
    if (sessionResult?.error || !session?.access_token) {
      throw new Error('No active session. Please refresh the page and try again.');
    }

    // Call Supabase Edge Function instead of backend
    const response = await fetch(`${config.backendUrl}/seed-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ connectionId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error || 'Failed to start seed');
    }

    return await response.json();
  },
};
