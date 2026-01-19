import { useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { toast } from '../utils/toast';
import { useTranslation } from 'react-i18next';

interface Seed {
  id: string;
  user_id: string;
  user_oauth_token_id: string;
  status: 'pending' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export function useSeedNotifications(userId: string | undefined) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!userId) return;

    let channel: ReturnType<Awaited<ReturnType<typeof getSupabase>>['channel']>;

    const setupRealtimeSubscription = async () => {
      const supabase = await getSupabase();

      channel = supabase
        .channel('seed-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'seeds',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newSeed = payload.new as Seed;
            const oldSeed = payload.old as Seed;

            // Only notify if status changed
            if (newSeed.status !== oldSeed.status) {
              if (newSeed.status === 'completed') {
                toast.success(
                  t('settings.seedCompletedSuccess') || '¡Importación completada! Se encontraron nuevas transacciones.',
                  t('settings.seedCompletedDescription') || 'Revisa tus transacciones para ver los nuevos movimientos.'
                );
              } else if (newSeed.status === 'failed') {
                toast.error(
                  t('settings.seedFailedError') || 'La importación falló.',
                  newSeed.error_message || t('settings.seedFailedDescription') || 'Hubo un error al procesar los correos. Intenta de nuevo.'
                );
              }
            }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [userId, t]);
}
