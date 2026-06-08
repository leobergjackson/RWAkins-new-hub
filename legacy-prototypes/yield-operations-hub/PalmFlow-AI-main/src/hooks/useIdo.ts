// Built by vsrupeshkumar
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useIdo() {
  const queryClient = useQueryClient();

  const projects = useQuery({
    queryKey: ['ido-projects'],
    queryFn: async () => {
      const res = await fetch('/api/ido');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    }
  });

  const createProject = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/ido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ido-projects'] });
    }
  });

  const invest = useMutation({
    mutationFn: async (data: { projectId: string; amount: number; walletAddress: string }) => {
      const res = await fetch('/api/ido/invest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Investment failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ido-projects'] });
      queryClient.invalidateQueries({ queryKey: ['treasury'] });
    }
  });

  return {
    projects,
    createProject,
    invest
  };
}
