import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

async function listModels() {
  try {
    const models = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
    for (const modelName of models) {
      try {
        console.log(`Testing ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("test");
        console.log(`✅ Model ${modelName} is available.`);
      } catch (e: any) {
        console.log(`❌ Model ${modelName} failed: ${e.message}`);
      }
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
