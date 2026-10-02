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
  if (s.includes('backlog')) return '⏳';
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

export const formatDailyBriefing = (focus: any): string => {
  let msg = `${ADA}: 🌅 *Daily Briefing da ADA* 🌸🥰✨\n\n`;
  msg += `Preparei com todo o meu carinho o seu resumo diário para te apoiar hoje, *${focus.name}*! 💖\n\n`;

  // 1. PROJECTS
  if (focus.projects && focus.projects.length > 0) {
    msg += `📂 *Seus Projetos Ativos:* (${focus.projects.length})\n`;
    focus.projects.forEach((p: any) => {
      msg += `  ${projectStateIcon(p.state)} *${p.name}*\n   📊 Status: _${p.state}_\n`;
    });
    msg += `\n`;
  } else {
    msg += `📂 *Projetos Ativos:* Nenhum projeto ativo no momento. 🌸\n\n`;
  }

  // 2. DELAYED ISSUES (OVERDUE)
  if (focus.overdue && focus.overdue.length > 0) {
    msg += `🚨 *Atenção! Tarefas Atrasadas:* (${focus.overdue.length})\n`;
    focus.overdue.forEach((t: any) => {
      msg += `  • *${t.identifier}*: ${t.title}\n`;
      msg += `    ${issueStatusIcon(t.status)} Status: _${t.status}_\n`;
      msg += `    🎯 Prioridade: _${priorityLabel(t.priority)}_\n`;
      msg += `    📅 Prazo: _${t.dueDate}_\n`;
    });
    msg += `\n`;
  }

  // 3. TODAY'S FOCUS
  if (focus.today && focus.today.length > 0) {
    msg += `🎯 *Seu Foco de Hoje:* (${focus.today.length})\n`;
    focus.today.forEach((t: any) => {
      msg += `  • *${t.identifier}*: ${t.title}\n`;
      msg += `    ${issueStatusIcon(t.status)} Status: _${t.status}_\n`;
      msg += `    🎯 Prioridade: _${priorityLabel(t.priority)}_\n`;
    });
    msg += `\n`;
  } else {
    msg += `✨ *Hoje você não tem nenhuma tarefa vencendo!* Que maravilha, meu bem! 🥰\n\n`;
  }

  // 4. BACKLOG
  if (focus.backlog && focus.backlog.length > 0) {
    msg += `📋 *Outras Tarefas Ativas (Backlog):* (${focus.backlog.length})\n`;
    const visibleBacklog = focus.backlog.slice(0, 5);
    visibleBacklog.forEach((t: any) => {
      msg += `  • *${t.identifier}*: ${t.title}\n`;
      msg += `    ${issueStatusIcon(t.status)} Status: _${t.status}_ | 🎯 Prioridade: _${priorityLabel(t.priority)}_\n`;
    });
    if (focus.backlog.length > 5) {
      msg += `  ... e outras *${focus.backlog.length - 5}* tarefas no backlog geral. 🌸\n`;
    }
    msg += `\n`;
  }

  msg += `Que seu dia seja incrível e abençoado! Estou sempre aqui torcendo por você! 🥰💖🌸✨`;
  return msg;
};
