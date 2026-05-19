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


export const createLinearIssue = async (title: string, description: string) => {
  try {
    const teamId = process.env.LINEAR_TEAM_ID;
    
    if (!teamId) {
      // If teamId isn't provided, fetch the first team available
      const teams = await linearClient.teams();
      if (teams.nodes.length === 0) {
        throw new Error('No teams found in Linear workspace.');
      }
      process.env.LINEAR_TEAM_ID = teams.nodes[0].id;
    }
    
    const issuePayload = await linearClient.createIssue({
      teamId: process.env.LINEAR_TEAM_ID as string,
      title,
      description,
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
      return { success: true, url: project.url, title: project.name };
    } else {
      return { success: false, error: 'Project creation returned null' };
    }
  } catch (error) {
    console.error('Error creating Linear Project:', error);
    return { success: false, error };
  }
};
