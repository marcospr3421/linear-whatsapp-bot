import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.LINEAR_API_KEY;
if (!apiKey) {
  console.warn('LINEAR_API_KEY is not defined in the environment variables.');
}

let linearClient: LinearClient;
if (apiKey) {
  linearClient = new LinearClient({ apiKey });
} else {
  console.warn('LinearClient not initialized. Set LINEAR_API_KEY.');
}

export const createLinearIssue = async (title: string, description: string, priority?: number, projectIdOrName?: string) => {
  try {
    let projectId = projectIdOrName;
    
    // If projectIdOrName is provided but not a UUID, try to find the project by name
    if (projectIdOrName && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectIdOrName)) {
      const projects = await linearClient.projects({
        filter: { name: { contains: projectIdOrName } }
      });
      if (projects.nodes.length > 0) {
        projectId = projects.nodes[0].id;
      } else {
        console.warn(`Project "${projectIdOrName}" not found. Creating issue without project.`);
        projectId = undefined;
      }
    }

    const teamId = (process.env.LINEAR_TEAM_ID as string) || (await linearClient.teams()).nodes[0].id;
    
    const issuePayload = await linearClient.createIssue({
      teamId,
      title,
      description,
      priority: priority || 0,
      projectId: projectId || undefined,
    });
    
    const issue = await issuePayload?.issue;
    if (issue) {
      return { success: true, url: issue.url, title: issue.title };
    } else {
      return { success: false, error: 'Issue creation returned null' };
    }
  } catch (error) {
    console.error('Error creating Linear Issue:', error);
    return { success: false, error };
  }
};

export const createLinearProject = async (name: string, description: string) => {
  try {
    const teamId = process.env.LINEAR_TEAM_ID;
    const teamIds = teamId ? [teamId] : [];

    if (teamIds.length === 0) {
      const teams = await linearClient.teams();
      if (teams.nodes.length > 0) {
        teamIds.push(teams.nodes[0].id);
      } else {
        throw new Error('No teams found in Linear workspace to associate with the project.');
      }
    }

    const projectPayload = await linearClient.createProject({
      name,
      description,
      teamIds
    });

    const project = await projectPayload?.project;
    if (project) {
      return { success: true, id: project.id, url: project.url, title: project.name };
    } else {
      return { success: false, error: 'Project creation returned null' };
    }
  } catch (error) {
    console.error('Error creating Linear Project:', error);
    return { success: false, error };
  }
};

export const listLinearProjects = async () => {
  try {
    const projects = await linearClient.projects({
      filter: { state: { in: ['started', 'planned'] } }
    });
    return projects.nodes.map(p => ({
      id: p.id,
      name: p.name,
      state: p.state,
      url: `https://linear.app/project/${p.id}`
    }));
  } catch (error) {
    console.error('Error listing Linear Projects:', error);
    return [];
  }
};

export const archiveLinearProject = async (projectIdOrName: string) => {
  try {
    let projectId = projectIdOrName;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectIdOrName)) {
      const projects = await linearClient.projects({
        filter: { name: { contains: projectIdOrName } }
      });
      if (projects.nodes.length > 0) {
        projectId = projects.nodes[0].id;
      } else {
        return { success: false, error: 'Project not found' };
      }
    }

    await linearClient.updateProject(projectId, {
      state: 'archived'
    });
    return { success: true };
  } catch (error) {
    console.error('Error archiving Linear Project:', error);
    return { success: false, error };
  }
};

export const searchLinearIssues = async (query: string) => {
  try {
    const issues = await linearClient.issues({
      filter: { 
        or: [
          { title: { contains: query } },
          { description: { contains: query } }
        ]
      },
      first: 5
    });
    return issues.nodes.map(i => ({
      identifier: i.identifier,
      title: i.title,
      status: i.state.name,
      priority: i.priorityLabel,
      url: i.url
    }));
  } catch (error) {
    console.error('Error searching Linear Issues:', error);
    return [];
  }
};

export const updateIssueStatus = async (identifier: string, statusName: string) => {
  try {
    // We first need to find the state ID for the given status name
    const workflowStates = await linearClient.workflowStates();
    const targetState = workflowStates.nodes.find(s => 
      s.name.toLowerCase().includes(statusName.toLowerCase())
    );

    if (!targetState) return { success: false, error: 'Status not found' };

    const issues = await linearClient.issues({ filter: { identifier: { eq: identifier.toUpperCase() } } });
    if (issues.nodes.length === 0) return { success: false, error: 'Issue not found' };

    await linearClient.updateIssue(issues.nodes[0].id, {
      stateId: targetState.id
    });
    return { success: true, status: targetState.name };
  } catch (error) {
    console.error('Error updating status:', error);
    return { success: false, error };
  }
};

export const assignIssue = async (identifier: string, assigneeName: string) => {
  try {
    const users = await linearClient.users();
    const targetUser = users.nodes.find(u => 
      u.name.toLowerCase().includes(assigneeName.toLowerCase()) || 
      u.displayName.toLowerCase().includes(assigneeName.toLowerCase())
    );

    if (!targetUser) return { success: false, error: 'Usuário não encontrado' };

    const issues = await linearClient.issues({ filter: { identifier: { eq: identifier.toUpperCase() } } });
    if (issues.nodes.length === 0) return { success: false, error: 'Tarefa não encontrada' };

    await linearClient.updateIssue(issues.nodes[0].id, {
      assigneeId: targetUser.id
    });
    return { success: true, assignee: targetUser.name };
  } catch (error) {
    console.error('Error assigning issue:', error);
    return { success: false, error };
  }
};

export const updateIssuePriority = async (identifier: string, priority: number) => {
  try {
    const issues = await linearClient.issues({ filter: { identifier: { eq: identifier.toUpperCase() } } });
    if (issues.nodes.length === 0) return { success: false, error: 'Tarefa não encontrada' };

    await linearClient.updateIssue(issues.nodes[0].id, {
      priority: priority
    });
    return { success: true, priority: priority };
  } catch (error) {
    console.error('Error updating priority:', error);
    return { success: false, error };
  }
};

export const listTeamMembers = async () => {
  try {
    const users = await linearClient.users();
    return users.nodes.map(u => ({
      name: u.name,
      displayName: u.displayName,
      email: u.email
    }));
  } catch (error) {
    console.error('Error listing team members:', error);
    return [];
  }
};

const findIssueByIdentifier = async (identifier: string) => {
  const issues = await linearClient.issues({ filter: { identifier: { eq: identifier.toUpperCase() } } });
  return issues.nodes[0] || null;
};

export const findSimilarIssues = async (title: string) => {
  try {
    const keywords = title.split(' ').filter((w) => w.length > 3).slice(0, 3);
    if (keywords.length === 0) return [];

    const issues = await linearClient.issues({
      filter: {
        or: keywords.map((kw) => ({ title: { contains: kw } })),
      },
      first: 5,
    });

    return issues.nodes.map((i) => ({
      identifier: i.identifier,
      title: i.title,
      status: i.state.name,
      url: i.url,
    }));
  } catch (error) {
    console.error('Error finding similar issues:', error);
    return [];
  }
};

export const addIssueComment = async (identifier: string, body: string) => {
  try {
    const issue = await findIssueByIdentifier(identifier);
    if (!issue) return { success: false, error: 'Tarefa não encontrada' };

    await linearClient.createComment({ issueId: issue.id, body });
    return { success: true, identifier: issue.identifier };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error };
  }
};

export const updateIssueDueDate = async (identifier: string, dueDate: string) => {
  try {
    const issue = await findIssueByIdentifier(identifier);
    if (!issue) return { success: false, error: 'Tarefa não encontrada' };

    await linearClient.updateIssue(issue.id, { dueDate });
    return { success: true, dueDate };
  } catch (error) {
    console.error('Error updating due date:', error);
    return { success: false, error };
  }
};

export const getProjectSummary = async (projectName: string) => {
  try {
    const projects = await linearClient.projects({
      filter: { name: { contains: projectName } },
      first: 1,
    });
    if (projects.nodes.length === 0) return { success: false, error: 'Projeto não encontrado' };

    const project = projects.nodes[0];
    const issues = await linearClient.issues({
      filter: { project: { id: { eq: project.id } } },
      first: 50,
    });

    const total = issues.nodes.length;
    const byStatus: Record<string, number> = {};
    const byAssignee: Record<string, number> = {};

    for (const issue of issues.nodes) {
      const status = issue.state.name;
      byStatus[status] = (byStatus[status] || 0) + 1;
      const assignee = (await issue.assignee)?.name || 'Sem responsável';
      byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;
    }

    const done = Object.entries(byStatus)
      .filter(([s]) => s.toLowerCase().includes('done') || s.toLowerCase().includes('conclu'))
      .reduce((sum, [, n]) => sum + n, 0);
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      success: true,
      name: project.name,
      state: project.state,
      total,
      percent,
      byStatus,
      byAssignee,
      url: project.url,
    };
  } catch (error) {
    console.error('Error getting project summary:', error);
    return { success: false, error };
  }
};

export const searchLinearIssuesAdvanced = async (query: string, assigneeName?: string) => {
  try {
    const filter: Record<string, unknown> = {
      or: [{ title: { contains: query } }, { description: { contains: query } }],
    };

    if (assigneeName) {
      const users = await linearClient.users();
      const user = users.nodes.find(
        (u) =>
          u.name.toLowerCase().includes(assigneeName.toLowerCase()) ||
          u.displayName.toLowerCase().includes(assigneeName.toLowerCase())
      );
      if (user) {
        filter.assignee = { id: { eq: user.id } };
      }
    }

    const issues = await linearClient.issues({ filter: filter as never, first: 10 });
    const results = [];
    for (const i of issues.nodes) {
      results.push({
        identifier: i.identifier,
        title: i.title,
        status: i.state.name,
        priority: i.priorityLabel,
        assignee: (await i.assignee)?.name || '—',
        dueDate: i.dueDate || '—',
        url: i.url,
      });
    }
    return results;
  } catch (error) {
    console.error('Error in advanced search:', error);
    return [];
  }
};

export const generateWeeklyReport = async (): Promise<string> => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const issues = await linearClient.issues({
      filter: { updatedAt: { gte: weekAgo.toISOString() } },
      first: 100,
    });

    const created = issues.nodes.filter((i) => new Date(i.createdAt) >= weekAgo).length;
    const completed = issues.nodes.filter((i) => {
      const s = i.state.name.toLowerCase();
      return s.includes('done') || s.includes('conclu');
    }).length;
    const inProgress = issues.nodes.filter((i) => {
      const s = i.state.name.toLowerCase();
      return s.includes('progress') || s.includes('andamento');
    }).length;

    let msg = `📅 Período: últimos 7 dias\n\n`;
    msg += `🆕 Criadas: *${created}*\n`;
    msg += `✅ Concluídas: *${completed}*\n`;
    msg += `🔄 Em andamento: *${inProgress}*\n`;
    msg += `📋 Total atualizadas: *${issues.nodes.length}*\n\n`;

    const urgent = issues.nodes.filter((i) => i.priority === 1).slice(0, 5);
    if (urgent.length > 0) {
      msg += `🚨 *Urgentes:*\n`;
      urgent.forEach((i) => {
        msg += `• ${i.identifier}: ${i.title}\n`;
      });
    }

    return msg;
  } catch (error) {
    console.error('Error generating weekly report:', error);
    return '❌ Não foi possível gerar o relatório.';
  }
};
