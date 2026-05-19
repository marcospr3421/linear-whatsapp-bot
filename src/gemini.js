import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined in the environment variables.');
}
const genAI = new GoogleGenerativeAI(apiKey || '');
// We will use gemini-1.5-flash since it's great for multimodal (text, image, audio) and fast, 
// or gemini-1.5-pro for more complex reasoning. Let's use gemini-1.5-flash for responsiveness.
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
export const analyzeContent = async (text, mediaParts) => {
    try {
        const prompt = `
You are an intelligent project management assistant. 
Your goal is to analyze the provided message (which may include text, audio transcripts, or images) and decide if it should be converted into a Linear Issue or a Linear Project.

Please extract the necessary details and respond ONLY with a valid JSON object adhering to the following structure:
{
  "type": "issue" | "project",
  "title": "A short and concise title for the issue or project",
  "description": "A detailed description or summary of the task/project extracted from the context. If it's an issue, describe the bug or feature request. Include relevant context."
}

Use the following guidelines:
- If the content implies a single task, bug fix, or specific feature, classify it as an "issue".
- If the content implies a larger initiative, a new feature involving multiple steps, or mentions "project", classify it as a "project".
- Do NOT include markdown blocks like \`\`\`json in your response, just return the raw JSON object.

Content:
"${text}"
`;
        const contents = [prompt];
        if (mediaParts && mediaParts.length > 0) {
            contents.push(...mediaParts);
        }
        const result = await model.generateContent(contents);
        const responseText = result.response.text();
        // Clean up potential markdown formatting if the model still outputs it
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanJson);
        return parsedData;
    }
    catch (error) {
        console.error('Error analyzing content with Gemini:', error);
        return null;
    }
};
/**
 * Helper to convert base64 media from WhatsApp into a Gemini Part object
 */
export const fileToGenerativePart = (base64Data, mimeType) => {
    return {
        inlineData: {
            data: base64Data,
            mimeType
        },
    };
};
//# sourceMappingURL=gemini.js.map