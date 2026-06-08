// Built by vsrupeshkumar
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useSentinel() {
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: ['sentinel-status'],
    queryFn: async () => {
      const res = await fetch('/api/sentinel/status');
      if (!res.ok) throw new Error('Failed to fetch sentinel status');
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const audit = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/sentinel/audit', { method: 'POST' });
      if (!res.ok) throw new Error('Audit failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentinel-status'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    }
  });

  return { status, audit };
}
