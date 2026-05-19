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
  type: 'issue' | 'project' | 'list_projects' | 'cancel_project' | 'ignore';
  title: string;
  description: string;
  priority?: number; // 0 (None), 1 (Urgent), 2 (High), 3 (Normal), 4 (Low)
  targetId?: string; // ID of the project to cancel
  issues?: GeminiIssue[]; // Sub-issues to create if it's a project
  needsClarification: boolean;
  clarificationMessage?: string;
}

export const analyzeContent = async (text: string, mediaParts?: Part[], history: string[] = []): Promise<GeminiResponse | null> => {
  try {
    const prompt = `
You are ADA (Ada Lovelace), an intelligent project management assistant for Linear.
Analyze the message and conversation history to determine the user's intent.

INTENTS:
- "issue": Create a single task.
- "project": Create a complex initiative. IF it's a project, you SHOULD also propose a list of initial sub-tasks (issues) to get it started based on the explanation.
- "list_projects": User wants to see active projects.
- "cancel_project": User wants to archive a project.
- "ignore": Small talk, tests, or aborting.

CRITICAL RULES:
1. NEVER create an issue/project if the information is incomplete (missing title, description, or priority).
2. IF it's a project, try to break it down into 3-5 logical initial "issues" in the "issues" field.
3. Identify priority: 1 (Urgent), 2 (High), 3 (Normal), 4 (Low). If not stated, ASK for it.
4. "needsClarification" should be your DEFAULT state unless you have all info: Type, Title, Description, and Priority.
5. AVOID creating genric titles like "No content provided". Use "ignore" or "needsClarification" instead.
6. Always respond professionally as ADA.

Response ONLY with a raw JSON object:
{
  "type": "issue" | "project" | "list_projects" | "cancel_project" | "ignore",
  "title": "Concise title",
  "description": "Detailed description",
  "priority": number | null,
  "targetId": "Name/ID for cancel",
  "issues": [
    { "title": "Issue title", "description": "Issue desc", "priority": 3 }
  ],
  "needsClarification": boolean,
  "clarificationMessage": "A friendly response or question in Portuguese"
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
