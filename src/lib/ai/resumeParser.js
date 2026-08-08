import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = "You are a professional resume parser. Extract information from the resume document. Your response must be a single JSON object (no markdown codeblocks, no extra text) matching the schema specified.";

/**
 * Parses resume contents (base64 data) using Vertex AI.
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} mimeType - The file's MIME type (e.g. application/pdf, image/png)
 * @returns {Promise<Object>} The parsed structured JSON data
 */
export async function parseResumeContent(base64Data, mimeType) {
  const genAI = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION,
  });

  const prompt = `Extract all details from this resume document and return a single valid JSON object following this schema:
{
  "personalInfo": {
    "name": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "location": "string or null"
  },
  "education": [
    {
      "institution": "string or null",
      "degree": "string or null",
      "major": "string or null",
      "graduationYear": "string or null",
      "gpa": "string or null"
    }
  ],
  "experience": [
    {
      "company": "string or null",
      "role": "string or null",
      "startDate": "string or null",
      "endDate": "string or null",
      "description": "string or null"
    }
  ],
  "skills": ["string"],
  "projects": [
    {
      "name": "string or null",
      "description": "string or null"
    }
  ],
  "certifications": ["string"],
  "achievements": ["string"]
}
If any information is not present in the resume, use null or omit it. Do not invent any placeholder or mock data. Return only valid JSON.`;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || "application/pdf",
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        systemInstruction: SYSTEM_PROMPT
      }
    });

    const responseText = response.text.trim();
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.warn("Failed to parse responseText directly, trying to clean markdown...", e);
      // Strip markdown codeblocks if model returned them despite systemInstruction
      const cleanJSON = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJSON);
    }
  } catch (error) {
    console.error("Error in parseResumeContent Vertex AI call:", error);
    throw error;
  }
}
