// Built by vsrupeshkumar
import { useQuery } from '@tanstack/react-query';

export function useYield() {
  const statsQuery = useQuery({
    queryKey: ['treasury-stats'],
    queryFn: async () => {
      const res = await fetch('/api/treasury/stats');
      if (!res.ok) throw new Error('Failed to fetch treasury stats');
      return res.json();
    },
  });

  const historyQuery = useQuery({
    queryKey: ['treasury-history'],
    queryFn: async () => {
      const res = await fetch('/api/treasury/history');
      if (!res.ok) throw new Error('Failed to fetch treasury history');
      return res.json();
    },
  });

  return {
    stats: statsQuery.data,
    history: historyQuery.data,
    isLoading: statsQuery.isLoading || historyQuery.isLoading,
  };
}
