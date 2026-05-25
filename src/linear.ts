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
      filter: { state: { nin: ['completed', 'canceled'] } }
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

    await linearClient.archiveProject(projectId);
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
    
    const results = await Promise.all(
      issues.nodes.map(async (i) => {
        const state = i.state ? await i.state : undefined;
        return {
          identifier: i.identifier,
          title: i.title,
          status: state?.name || '—',
          priority: i.priorityLabel,
          url: i.url
        };
      })
    );
    return results;
  } catch (error) {
    console.error('Error searching Linear Issues:', error);
    return [];
  }
};

async function findIssueByIdentifier(identifier: string) {
  try {
    const issue = await linearClient.issue(identifier.toUpperCase());
    return issue || null;
  } catch (error) {
    console.error(`Error finding issue by identifier ${identifier}:`, error);
    return null;
  }
}

export const updateIssueStatus = async (identifierOrTitle: string, statusName: string) => {
  try {
    // We first need to find the state ID for the given status name
    const workflowStates = await linearClient.workflowStates();
    const targetState = workflowStates.nodes.find(s => 
      s.name.toLowerCase().includes(statusName.toLowerCase())
    );

    if (!targetState) return { success: false, error: 'Status not found' };

    let issue: any = null;
    
    // Check if it's an ID
    if (/^[a-z]{1,10}-\d+$/i.test(identifierOrTitle.trim())) {
      issue = await findIssueByIdentifier(identifierOrTitle);
    } else {
      // Find issue by title contains
      const issues = await linearClient.issues({
        filter: { title: { containsIgnoreCase: identifierOrTitle } },
        first: 1
      });
      if (issues.nodes.length > 0) {
        issue = issues.nodes[0];
      }
    }

    if (!issue) return { success: false, error: 'Tarefa não encontrada' };

    await linearClient.updateIssue(issue.id, {
      stateId: targetState.id
    });
    return { success: true, status: targetState.name, identifier: issue.identifier, title: issue.title };
  } catch (error) {
    console.error('Error updating status:', error);
    return { success: false, error };
  }
};

export const updateProjectStatus = async (projectNameOrId: string, statusName: string) => {
  try {
    let projectId = projectNameOrId;
    
    // Find the project if a name was provided
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectNameOrId)) {
      const projects = await linearClient.projects({
        filter: { name: { contains: projectNameOrId } }
      });
      if (projects.nodes.length > 0) {
        projectId = projects.nodes[0].id;
      } else {
        return { success: false, error: 'Projeto não encontrado' };
      }
    }
    
    // Map status name to Linear project state:
    const sName = statusName.toLowerCase();
    let state: 'planning' | 'started' | 'paused' | 'completed' | 'canceled' = 'started';
    if (sName.includes('compl') || sName.includes('concl') || sName.includes('done') || sName.includes('finish') || sName.includes('completo')) {
      state = 'completed';
    } else if (sName.includes('progress') || sName.includes('andamento') || sName.includes('start') || sName.includes('inic') || sName.includes('ativo')) {
      state = 'started';
    } else if (sName.includes('plan') || sName.includes('prep') || sName.includes('planejado')) {
      state = 'planning';
    } else if (sName.includes('paus') || sName.includes('stop')) {
      state = 'paused';
    } else if (sName.includes('canc') || sName.includes('arquiv')) {
      state = 'canceled';
    }
    
    const projectStatuses = await linearClient.projectStatuses();
    const targetProjectStatus = projectStatuses.nodes.find((s: any) => 
      s.name.toLowerCase() === state.toLowerCase() ||
      s.key?.toLowerCase() === state.toLowerCase()
    );
    
    if (targetProjectStatus) {
      await linearClient.updateProject(projectId, { statusId: targetProjectStatus.id });
    } else {
      if (state === 'completed') {
        await linearClient.updateProject(projectId, { completedAt: new Date() });
      } else if (state === 'canceled') {
        await linearClient.updateProject(projectId, { canceledAt: new Date() });
      } else {
        return { success: false, error: `Estado de projeto "${state}" não encontrado.` };
      }
    }
    const p = await linearClient.project(projectId);
    return { success: true, projectName: p?.name || projectNameOrId, state: targetProjectStatus?.name || state };
  } catch (error: any) {
    console.error('Error updating project status:', error);
    return { success: false, error: error?.message || error };
  }
};

export const closeAllProjectIssues = async (projectNameOrId: string) => {
  try {
    let projectId = projectNameOrId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectNameOrId)) {
      const projects = await linearClient.projects({
        filter: { name: { contains: projectNameOrId } }
      });
      if (projects.nodes.length > 0) {
        projectId = projects.nodes[0].id;
      } else {
        return { success: false, error: 'Projeto não encontrado' };
      }
    }
    
    // Find the state ID for "Done"
    const workflowStates = await linearClient.workflowStates();
    const doneState = workflowStates.nodes.find(s => 
      s.name.toLowerCase() === 'done' || 
      s.name.toLowerCase() === 'concluído' ||
      s.name.toLowerCase() === 'concluido'
    );
    if (!doneState) return { success: false, error: 'Estado de conclusão não encontrado' };

    // Get all issues for this project that are not already done/canceled
    const issues = await linearClient.issues({
      filter: { 
        project: { id: { eq: projectId } },
        state: { type: { nin: ['completed', 'canceled'] } }
      }
    });

    for (const issue of issues.nodes) {
      await linearClient.updateIssue(issue.id, { stateId: doneState.id });
    }

    return { success: true, count: issues.nodes.length };
  } catch (error: any) {
    console.error('Error closing all project issues:', error);
    return { success: false, error: error?.message || error };
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

    const issue = await findIssueByIdentifier(identifier);
    if (!issue) return { success: false, error: 'Tarefa não encontrada' };

    await linearClient.updateIssue(issue.id, {
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
    const issue = await findIssueByIdentifier(identifier);
    if (!issue) return { success: false, error: 'Tarefa não encontrada' };

    await linearClient.updateIssue(issue.id, {
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

    const results = await Promise.all(
      issues.nodes.map(async (i) => {
        const state = i.state ? await i.state : undefined;
        return {
          identifier: i.identifier,
          title: i.title,
          status: state?.name || '—',
          url: i.url,
        };
      })
    );
    return results;
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

    const issuesWithState = await Promise.all(
      issues.nodes.map(async (issue) => {
        const state = issue.state ? await issue.state : undefined;
        const assignee = (await issue.assignee)?.name || 'Sem responsável';
        return {
          status: state?.name || 'Sem status',
          assignee,
        };
      })
    );

    for (const item of issuesWithState) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      byAssignee[item.assignee] = (byAssignee[item.assignee] || 0) + 1;
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
    const results = await Promise.all(
      issues.nodes.map(async (i) => {
        const state = i.state ? await i.state : undefined;
        const assignee = i.assignee ? await i.assignee : undefined;
        return {
          identifier: i.identifier,
          title: i.title,
          status: state?.name || '—',
          priority: i.priorityLabel,
          assignee: assignee?.name || '—',
          dueDate: i.dueDate || '—',
          url: i.url,
        };
      })
    );
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

    const issuesWithStateName = await Promise.all(
      issues.nodes.map(async (i) => {
        const state = i.state ? await i.state : undefined;
        return {
          node: i,
          stateName: state?.name || '',
        };
      })
    );

    const created = issues.nodes.filter((i) => new Date(i.createdAt) >= weekAgo).length;
    const completed = issuesWithStateName.filter(({ stateName }) => {
      const s = stateName.toLowerCase();
      return s.includes('done') || s.includes('conclu');
    }).length;
    const inProgress = issuesWithStateName.filter(({ stateName }) => {
      const s = stateName.toLowerCase();
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

export const getMyDailyFocus = async () => {
  try {
    const viewer = await linearClient.viewer;
    const todayStr = new Date().toISOString().split('T')[0];
    
    const issues = await linearClient.issues({
      filter: {
        assignee: { id: { eq: viewer.id } },
        state: { type: { nin: ['completed', 'canceled'] } }
      }
    });

    const today: any[] = [];
    const overdue: any[] = [];
    const backlog: any[] = [];

    for (const i of issues.nodes) {
      const state = i.state ? await i.state : undefined;
      const issueData = {
        identifier: i.identifier,
        title: i.title,
        status: state?.name || '—',
        dueDate: i.dueDate || null,
        url: i.url
      };

      if (!i.dueDate) {
        backlog.push(issueData);
      } else if (i.dueDate === todayStr) {
        today.push(issueData);
      } else if (i.dueDate < todayStr) {
        overdue.push(issueData);
      } else {
        backlog.push(issueData);
      }
    }

    return { success: true, name: viewer.name, today, overdue, backlogCount: backlog.length };
  } catch (error: any) {
    console.error('Error getting daily focus:', error);
    return { success: false, error: error?.message || error };
  }
};

export const getTeamWeeklyActivity = async () => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const issues = await linearClient.issues({
      filter: { updatedAt: { gte: weekAgo.toISOString() } },
      first: 100
    });

    const activityList = await Promise.all(
      issues.nodes.map(async (i) => {
        const state = i.state ? await i.state : undefined;
        const assignee = i.assignee ? await i.assignee : undefined;
        return {
          identifier: i.identifier,
          title: i.title,
          status: state?.name || '—',
          assignee: assignee?.name || 'Sem responsável',
          updatedAt: i.updatedAt
        };
      })
    );

    return { success: true, activities: activityList };
  } catch (error: any) {
    console.error('Error fetching weekly activity:', error);
    return { success: false, error: error?.message || error };
  }
};
