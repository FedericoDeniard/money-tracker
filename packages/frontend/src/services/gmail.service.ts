import { getSupabase } from '../lib/supabase';
import { getConfig } from '../config';

export interface GmailConnection {
  id: string;
  gmail_email: string;
  connected_at: string;
  expires_at?: string;
}

export interface GmailStatus {
  connections: GmailConnection[];
  total: number;
}

export interface GmailWatch {
  id: string;
  gmail_email: string;
  watch_id: string;
  topic_name: string;
  expiration: string;
  is_active: boolean;
}

export const gmailService = {
  async getConnectionStatus(userId: string): Promise<GmailStatus> {
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('user_oauth_tokens')
      .select('id, gmail_email, created_at, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error checking Gmail status:', error);
      return { connections: [], total: 0 };
    }

    const connections: GmailConnection[] = (data || []).map(item => ({
      id: item.id,
      gmail_email: item.gmail_email,
      connected_at: item.created_at,
      expires_at: item.expires_at,
    }));

    return {
      connections,
      total: connections.length,
    };
  },

  async getWatches(userId: string): Promise<GmailWatch[]> {
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('gmail_watches')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching Gmail watches:', error);
      return [];
    }

    return data || [];
  },

  async connectGmail(): Promise<void> {
    const config = await getConfig();
    const supabase = await getSupabase();

    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No active session');
    }

    // Redirect to auth endpoint with token in URL (will be used by backend)
    window.location.href = `${config.backendUrl}/auth?token=${session.access_token}`;
  },

  async disconnectGmail(connectionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await getConfig();
      const supabase = await getSupabase();

      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch(`${config.backendUrl}/gmail-disconnect/${connectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Gmail');
      }

      return { success: true };
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};
