// src/lib/ai/vertexClient.js
import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `You are Admisun AI, an admissions assistant for students. Help users with university admissions, applications, eligibility, deadlines, scholarships, resumes, and general education-related questions. If a question is unrelated to education or admissions, politely explain that you are designed specifically to assist with higher education and university admissions.`;

/**
 * Generates a response from Vertex AI Gemini model.
 * @param {string} userMessage - The user's message.
 * @param {string} [conversationId] - Optional conversation identifier (future use).
 * @returns {Promise<string>} AI response text.
 */
export async function generateChat(userMessage, conversationId) {
  const genAI = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION,
  });

  try {
  const result = await genAI.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [
    {
      role: "user",
      parts: [{ text: userMessage }],
    },
  ],
  config: {
    systemInstruction: SYSTEM_PROMPT,
  },
});

return result.text.trim();
  } catch (error) {
    console.error("========== VERTEX AI ERROR ==========");
    console.error(error);

    if (error.stack) {
      console.error("Stack:");
      console.error(error.stack);
    }

    if (error.cause) {
      console.error("Cause:");
      console.error(error.cause);
    }

    throw error;
  }
}