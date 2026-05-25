"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@linear/sdk");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const apiKey = process.env.LINEAR_API_KEY;
if (!apiKey) {
    console.warn('LINEAR_API_KEY is not defined in the environment variables.');
}
let linearClient;
if (apiKey) {
    linearClient = new sdk_1.LinearClient({ apiKey });
}
else {
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
        }
        else {
            teams.nodes.forEach(team => {
                console.log(`Team Name: ${team.name}`);
                console.log(`Team ID:   ${team.id}`);
                console.log(`Team Key:  ${team.key}`);
                console.log("------------------------");
            });
        }
    }
    catch (error) {
        console.error("Error fetching teams:", error);
    }
}
getTeams();
