export const ADA = '🤖 *ADA*';

export const priorityLabel = (p?: number): string => {
  const labels: Record<number, string> = {
    0: '⚪ Nenhuma',
    1: '🚨 Urgente',
    2: '🔴 Alta',
    3: '🟡 Normal',
    4: '🟢 Baixa',
  };
  return labels[p ?? 0] ?? '⚪ Nenhuma';
};

export const projectStateIcon = (state: string): string => {
  const s = state.toLowerCase();
  if (s.includes('started')) return '🟢';
  if (s.includes('planned')) return '📋';
  if (s.includes('paused')) return '⏸️';
  if (s.includes('completed')) return '✅';
  if (s.includes('cancel')) return '🚫';
  return '📌';
};

export const issueStatusIcon = (status: string): string => {
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('conclu')) return '✅';
  if (s.includes('progress') || s.includes('andamento')) return '🔄';
  if (s.includes('todo') || s.includes('backlog')) return '📝';
  if (s.includes('cancel')) return '🚫';
  if (s.includes('review')) return '👀';
  return '📌';
};
