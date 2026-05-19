import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';
dotenv.config();
const apiKey = process.env.LINEAR_API_KEY;
if (!apiKey) {
    console.warn('LINEAR_API_KEY is not defined in the environment variables.');
}
const linearClient = new LinearClient({ apiKey: apiKey || '' });
export const createLinearIssue = async (title, description) => {
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
            teamId: process.env.LINEAR_TEAM_ID,
            title,
            description,
        });
        const issue = issuePayload.success ? await issuePayload.issue : null;
        if (issue) {
            return { success: true, url: issue.url, title: issue.title };
        }
        else {
            return { success: false, error: 'Issue creation returned null' };
        }
    }
    catch (error) {
        console.error('Error creating Linear Issue:', error);
        return { success: false, error };
    }
};
export const createLinearProject = async (name, description) => {
    try {
        const teamId = process.env.LINEAR_TEAM_ID;
        const teamIds = teamId ? [teamId] : [];
        if (teamIds.length === 0) {
            const teams = await linearClient.teams();
            if (teams.nodes.length > 0) {
                teamIds.push(teams.nodes[0].id);
            }
            else {
                throw new Error('No teams found in Linear workspace to associate with the project.');
            }
        }
        const projectPayload = await linearClient.createProject({
            name,
            description,
            teamIds
        });
        const project = projectPayload.success ? await projectPayload.project : null;
        if (project) {
            return { success: true, url: project.url, title: project.name };
        }
        else {
            return { success: false, error: 'Project creation returned null' };
        }
    }
    catch (error) {
        console.error('Error creating Linear Project:', error);
        return { success: false, error };
    }
};
//# sourceMappingURL=linear.js.map