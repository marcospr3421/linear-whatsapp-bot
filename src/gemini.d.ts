import { Part } from '@google/generative-ai';
export interface GeminiResponse {
    type: 'issue' | 'project';
    title: string;
    description: string;
}
export declare const analyzeContent: (text: string, mediaParts?: Part[]) => Promise<GeminiResponse | null>;
/**
 * Helper to convert base64 media from WhatsApp into a Gemini Part object
 */
export declare const fileToGenerativePart: (base64Data: string, mimeType: string) => Part;
//# sourceMappingURL=gemini.d.ts.map