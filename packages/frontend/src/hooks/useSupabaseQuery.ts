import { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

interface UseSupabaseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSupabaseQuery<T>(
  queryFn: (supabase: SupabaseClient) => Promise<T>,
    dependencies: unknown[] = []
): UseSupabaseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const executeQuery = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = await getSupabase();
      const result = await queryFn(supabase);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Supabase query error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeQuery();
  }, dependencies);

  return { data, loading, error, refetch: executeQuery };
}
