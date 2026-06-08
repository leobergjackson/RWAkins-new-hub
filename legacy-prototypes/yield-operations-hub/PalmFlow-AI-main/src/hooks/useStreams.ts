// Built by vsrupeshkumar
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useStreams() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['streams'],
    queryFn: async () => {
      const res = await fetch('/api/streams');
      if (!res.ok) throw new Error('Failed to fetch streams');
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/streams/${id}/toggle`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to toggle stream');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create stream');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });

  return {
    ...query,
    toggleStream: toggleMutation.mutate,
    createStream: createMutation.mutateAsync,
    isProcessing: toggleMutation.isPending || createMutation.isPending,
  };
}
