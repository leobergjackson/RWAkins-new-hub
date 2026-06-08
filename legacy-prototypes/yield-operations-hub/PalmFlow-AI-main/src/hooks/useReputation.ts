// Built by vsrupeshkumar
import { useQuery } from '@tanstack/react-query';

function getCreditRating(efficiency: number): { grade: string; color: string } {
  if (efficiency >= 95) return { grade: 'AAA', color: '#10b981' };
  if (efficiency >= 85) return { grade: 'AA', color: '#00e5cc' };
  if (efficiency >= 70) return { grade: 'A', color: '#6366f1' };
  if (efficiency >= 50) return { grade: 'B', color: '#f59e0b' };
  return { grade: 'C', color: '#ef4444' };
}

export function useReputation() {
  const query = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      return res.json();
    },
  });

  const agents = (query.data ?? []).map((agent: any) => ({
    ...agent,
    creditRating: getCreditRating(agent.efficiency ?? 0),
    trustScore: agent.efficiency ?? 0,
    budgetUsed: agent.budget > 0 ? ((agent.spent ?? 0) / agent.budget) * 100 : 0,
    badges: [
      agent.spent < agent.budget * 0.9 && 'Budget Disciplined',
      (agent.tasksCount ?? 0) > 10 && 'High Volume',
      (agent.pnl ?? 0) > 0 && 'Yield Generator',
    ].filter(Boolean) as string[],
  }));

  const avgScore = agents.length
    ? Math.round(agents.reduce((a: number, b: any) => a + b.trustScore, 0) / agents.length)
    : 0;
  const aaaCount = agents.filter((a: any) => a.efficiency >= 95).length;
  const totalTasks = agents.reduce((a: number, b: any) => a + (b.tasksCount ?? 0), 0);

  return {
    agents,
    avgScore,
    aaaCount,
    totalTasks,
    isLoading: query.isLoading,
    getCreditRating,
  };
}
