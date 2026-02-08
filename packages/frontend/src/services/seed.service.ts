import { getSupabase } from '../lib/supabase';

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

    const { data, error } = await supabase.functions.invoke('seed-emails', {
      body: { connectionId },
    });

    if (error) {
      throw new Error(error.message || 'Failed to start seed job');
    }

    return data;
  },
};
