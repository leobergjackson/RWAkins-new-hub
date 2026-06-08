// Built by vsrupeshkumar
import { useQuery } from '@tanstack/react-query';

export function useInsights() {
  return useQuery({
    queryKey: ['neural-insights'],
    queryFn: async () => {
      const res = await fetch('/api/insights');
      if (!res.ok) throw new Error('Failed to fetch insights');
      return res.json();
    },
    refetchInterval: 60000, // Refresh insights every minute
  });
}
