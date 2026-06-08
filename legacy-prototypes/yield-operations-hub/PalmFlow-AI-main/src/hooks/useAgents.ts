// Built by vsrupeshkumar
import { useQuery } from '@tanstack/react-query';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      return res.json();
    },
  });
}
