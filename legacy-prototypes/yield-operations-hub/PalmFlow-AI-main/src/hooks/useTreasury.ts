// Built by vsrupeshkumar
import { useQuery } from '@tanstack/react-query';

export function useTreasury() {
  return useQuery({
    queryKey: ['treasury-stats'],
    queryFn: async () => {
      const res = await fetch('/api/treasury/stats');
      if (!res.ok) throw new Error('Failed to fetch treasury stats');
      return res.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds for "live" feel
  });
}
