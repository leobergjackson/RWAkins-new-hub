// Built by vsrupeshkumar
import { useQuery } from '@tanstack/react-query';

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const res = await fetch('/api/treasury/portfolio');
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      return res.json();
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });
}
