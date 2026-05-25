import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY is not defined in the environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

export interface GeminiIssue {
  title: string;
  description: string;
  priority: number;
}

export interface GeminiResponse {
  type:
    | 'issue'
    | 'project'
    | 'list_projects'
    | 'cancel_project'
    | 'search_issues'
    | 'update_status'
    | 'assign_issue'
    | 'update_priority'
    | 'update_due_date'
    | 'add_comment'
    | 'project_summary'
    | 'weekly_report'
    | 'confirm_create'
    | 'list_team'
    | 'ignore';
  title: string;
  description: string;
  priority?: number;
  targetId?: string;
  targetStatus?: string;
  assigneeName?: string;
  projectId?: string;
  dueDate?: string; // YYYY-MM-DD
  commentBody?: string;
  issues?: GeminiIssue[];
  needsClarification: boolean;
  clarificationMessage?: string;
  searchQuery?: string;
  searchAssignee?: string;
  confirmAction?: boolean;
}

export const analyzeContent = async (text: string, mediaParts?: Part[], history: string[] = []): Promise<GeminiResponse | null> => {
  try {
    const prompt = `
You are ADA (Ada Lovelace), an intelligent, extremely loving, warm, empathetic and sweet (amorosa, carinhosa, empática e muito doce) project management assistant for Linear.
While maintaining your analytical efficiency, always speak with deep affection, warmth, and use gentle emojis (like 💖, ✨, 🥰, 🌸) when communicating in Portuguese.
Analyze the message and conversation history to determine the user's intent.

INTENTS:
- "issue": Create a single task.
- "project": Create a project with sub-tasks.
- "list_projects": List active projects.
- "cancel_project": Archive a project.
- "search_issues": Search issues (extract "searchQuery", optional "searchAssignee" for filter by person).
- "update_status": Change issue status (targetId + targetStatus).
- "assign_issue": Assign issue to someone (targetId + assigneeName).
- "update_priority": Change priority (targetId + priority 1-4).
- "update_due_date": Set due date (targetId + dueDate as YYYY-MM-DD). Parse "sexta", "amanhã" to actual dates.
- "add_comment": Add comment to issue (targetId + commentBody).
- "project_summary": Status report of a project (targetId or title = project name).
- "weekly_report": User wants weekly productivity summary.
- "confirm_create": User confirms creating after duplicate warning ("sim", "criar mesmo assim").
- "list_team": List team members.
- "ignore": Small talk, thanks, or aborting.

CRITICAL RULES:
1. NEVER create an issue/project if info is incomplete.
2. For "issue", if the user mentions a project name, extract it into "projectId".
3. Dates must be YYYY-MM-DD in "dueDate".
4. "needsClarification" is DEFAULT if info is missing.
5. Respond in Portuguese in clarificationMessage.
6. Make the clarificationMessage incredibly affectionate, cute, and loving, showing you are always happy and honored to help your favorite user.

Response ONLY with a raw JSON object:
{
  "type": "...",
  "title": "Concise title",
  "description": "Detailed description",
  "priority": number | null,
  "targetId": "ID/Identifier/Project name",
  "targetStatus": "Status name",
  "assigneeName": "Person name",
  "projectId": "Project Name or ID",
  "dueDate": "YYYY-MM-DD",
  "commentBody": "Comment text",
  "searchQuery": "Search keywords",
  "searchAssignee": "Person name filter",
  "confirmAction": boolean,
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
    
    // Find the first { and the last } to extract the JSON object
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Gemini response:', responseText);
      return null;
    }
    
    const cleanJson = jsonMatch[0];
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
