import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY is not defined in the environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export interface GeminiIssue {
  title: string;
  description: string;
  priority: number;
}

export interface GeminiResponse {
  type: 'issue' | 'project' | 'list_projects' | 'cancel_project' | 'search_issues' | 'update_status' | 'ignore';
  title: string;
  description: string;
  priority?: number;
  targetId?: string; // ID of project to cancel or Issue Identifier (e.g. MPR-123)
  targetStatus?: string; // New status name (e.g. "Done", "In Progress")
  issues?: GeminiIssue[];
  needsClarification: boolean;
  clarificationMessage?: string;
  searchQuery?: string;
}

export const analyzeContent = async (text: string, mediaParts?: Part[], history: string[] = []): Promise<GeminiResponse | null> => {
  try {
    const prompt = `
You are ADA (Ada Lovelace), an intelligent project management assistant for Linear.
Analyze the message and conversation history to determine the user's intent.

INTENTS:
- "issue": Create a single task.
- "project": Create a project with sub-tasks.
- "list_projects": List active projects.
- "cancel_project": Archive a project.
- "search_issues": User is asking for status or searching for issues (e.g., "qual o status de...", "onde está a tarefa...", "busque por...").
- "update_status": User wants to change an issue status (e.g., "marque MPR-123 como concluída", "mude o status de...").
- "ignore": Small talk, thanks, or aborting.

CRITICAL RULES:
1. NEVER create an issue/project if info is incomplete.
2. For "search_issues", extract keywords into "searchQuery".
3. For "update_status", extract the issue identifier (e.g., "MPR-123") into "targetId" and the new status into "targetStatus".
4. Identify priority (1-4).
5. "needsClarification" is DEFAULT if info is missing.

Response ONLY with a raw JSON object:
{
  "type": "issue" | "project" | "list_projects" | "cancel_project" | "search_issues" | "update_status" | "ignore",
  "title": "Concise title",
  "description": "Detailed description",
  "priority": number | null,
  "targetId": "ID/Identifier",
  "targetStatus": "Status name",
  "searchQuery": "Search keywords",
  "issues": [ { "title": "...", "description": "...", "priority": 3 } ],
  "needsClarification": boolean,
  "clarificationMessage": "Response in Portuguese"
}

History:
${history.join('\n')}

Latest Message:
"${text}"
`;

    const contents: Array<string | Part> = [prompt];
    if (mediaParts && mediaParts.length > 0) {
      contents.push(...mediaParts);
    }

    const result = await model.generateContent(contents);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson) as GeminiResponse;
  } catch (error) {
    console.error('Error analyzing content with Gemini:', error);
    return null;
  }
};

export const fileToGenerativePart = (base64Data: string, mimeType: string): Part => {
  return {
    inlineData: {
      data: base64Data,
      mimeType
    },
  };
};
