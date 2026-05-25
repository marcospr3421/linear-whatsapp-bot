import { Part } from '@google/generative-ai';
import { GeminiResponse } from './gemini';

export interface Session {
  history: string[];
  lastAnalysis?: GeminiResponse;
  mediaParts?: Part[];
  pendingCreate?: GeminiResponse;
  pendingReplyIssueId?: string; // Stored issue ID for interactive comments
  pendingReplyIssueTitle?: string; // Stored issue title
}

export const sessions: Record<string, Session> = {};
