import { SupabaseClient } from '@supabase/supabase-js';

export interface Email {
  id: string;
  user_id: string;
  gmail_email: string;
  gmail_message_id: string;
  subject: string;
  body_text: string;
  date: string;
  processed: boolean;
  created_at: string;
}

export class EmailsService {
  constructor(private supabase: SupabaseClient) {}

  async getEmails(): Promise<Email[]> {
    const { data, error } = await this.supabase
      .from('emails')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getEmailById(id: string): Promise<Email | null> {
    const { data, error } = await this.supabase
      .from('emails')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async markAsProcessed(emailId: string): Promise<void> {
    const { error } = await this.supabase
      .from('emails')
      .update({ processed: true })
      .eq('id', emailId);

    if (error) throw error;
  }

  async deleteEmail(emailId: string): Promise<void> {
    const { error } = await this.supabase
      .from('emails')
      .delete()
      .eq('id', emailId);

    if (error) throw error;
  }
}

// Factory function to create service instance
export function createEmailsService(supabase: SupabaseClient) {
  return new EmailsService(supabase);
}
