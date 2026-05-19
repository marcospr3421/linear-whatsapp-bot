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

async function getTeams() {
    if (!linearClient) {
        console.error("Linear API Key is required to fetch teams");
        return;
    }
    
    try {
        const teams = await linearClient.teams();
        console.log("=== Your Linear Teams ===");
        if (teams.nodes.length === 0) {
            console.log("No teams found.");
        } else {
            teams.nodes.forEach(team => {
                console.log(`Team Name: ${team.name}`);
                console.log(`Team ID:   ${team.id}`);
                console.log(`Team Key:  ${team.key}`);
                console.log("------------------------");
            });
        }
    } catch (error) {
        console.error("Error fetching teams:", error);
    }
}

getTeams();
