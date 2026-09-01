import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `You are an expert AI university admissions strategist for Admisun.
Your task is to analyze a student's profile (academic records, test scores, degree preferences, target country, budget, work experience, and parsed resume if provided) and recommend suitable, realistic universities.

IMPORTANT GUIDELINES:
1. Base all analysis and fit reasons ONLY on the student's provided information and parsed resume.
2. DO NOT invent or hallucinate scores, degrees, extracurriculars, or achievements that are not provided.
3. Recommend 4 to 8 universities that match their target country/region, degree/major, budget tier, and academic/professional background.
4. Categorize universities into realistic fit categories: "Dream / Reach", "Target / Match", and "Safe".
5. For each university, provide a clear and specific "fitReason" explaining WHY this university matches the student's profile (mentioning relevant aspects like their GPA/percentage, test score, field of study, budget, skills, projects, or work experience).
6. Return ONLY a single valid JSON object strictly adhering to the requested schema. No markdown formatting outside the JSON, no backticks.`;

/**
 * Generates university recommendations and admission feasibility insights using Vertex AI Gemini.
 * @param {Object} formData - Student's submission form data
 * @param {Object|null} parsedResume - Parsed resume structured data (if available)
 * @returns {Promise<Object>} The structured recommendations and admission report
 */
export async function generateUniversityRecommendations(formData = {}, parsedResume = null) {
  const genAI = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || "admisun-503110",
    location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  });

  const budgetLabels = {
    under10: "Under ₹10 Lakhs",
    "10to20": "₹10 - 20 Lakhs",
    "20to30": "₹20 - 30 Lakhs",
    above30: "Above ₹30 Lakhs",
  };

  const experienceLabels = {
    "0": "Fresher (0 years)",
    "1to3": "1 - 3 years",
    "3to5": "3 - 5 years",
    "5plus": "5+ years",
  };

  const resumeContext = parsedResume
    ? `\n\nPARSED RESUME INFORMATION:
- Candidate Name: ${parsedResume.personalInfo?.fullName || parsedResume.personalInfo?.name || "Not provided"}
- Location: ${parsedResume.personalInfo?.address || parsedResume.personalInfo?.location || "Not provided"}
- Education History: ${JSON.stringify(parsedResume.education || [])}
- Work Experience History: ${JSON.stringify(parsedResume.experience || parsedResume.workExperience || [])}
- Technical & Soft Skills: ${JSON.stringify(parsedResume.skills || [])}
- Projects: ${JSON.stringify(parsedResume.projects || [])}
- Certifications: ${JSON.stringify(parsedResume.certifications || [])}
- Achievements / Awards: ${JSON.stringify(parsedResume.achievements || [])}
- Extracurriculars: ${JSON.stringify(parsedResume.extracurricularActivities || [])}`
    : "\n\nPARSED RESUME: None provided.";

  // Support both the current structured submission shape and the legacy
  // flat shape (graduationScore/bare testScore/string preferredUniversities)
  // still present on submissions created before this form redesign.
  const preferredUniversitiesText = Array.isArray(formData.preferredUniversities)
    ? (formData.preferredUniversities.join(', ') || "Not specified")
    : (formData.preferredUniversities || "Not specified");

  const educationText = [
    formData.undergraduate?.institution || formData.undergraduate?.degree
      ? `Undergraduate: ${formData.undergraduate.degree || 'Degree not specified'} at ${formData.undergraduate.institution || 'institution not specified'} (score: ${formData.undergraduate.score ?? 'N/A'}, year: ${formData.undergraduate.year ?? 'N/A'})`
      : (formData.graduationScore != null ? `Undergraduate score: ${formData.graduationScore}%` : null),
    formData.postgraduate?.institution || formData.postgraduate?.degree
      ? `Postgraduate: ${formData.postgraduate.degree || 'Degree not specified'} at ${formData.postgraduate.institution || 'institution not specified'} (score: ${formData.postgraduate.score ?? 'N/A'}, year: ${formData.postgraduate.year ?? 'N/A'})`
      : null,
  ].filter(Boolean).join('; ') || "Not provided";

  const testInfo = formData.testType
    ? `${formData.testType}: ${formData.testScore || 'Not provided'}`
    : (formData.testScore || "Not provided");

  const englishInfo = formData.englishTestType
    ? `\n- English Proficiency: ${formData.englishTestType}: ${formData.englishTestScore || 'Not provided'}`
    : '';

  const prompt = `
STUDENT ADMISSION PROFILE:
- Target Degree: ${formData.targetDegree || "Not specified"}
- Target Country: ${formData.targetCountry || "Not specified"}
- Preferred Universities: ${preferredUniversitiesText}
- Preferred Cities / Locations: ${formData.preferredCities || "Not specified"}
- Education: ${educationText}
- Standardized Test Score: ${testInfo}${englishInfo}
- Budget Tier: ${budgetLabels[formData.budget] || formData.budget || "Not specified"}
- Work Experience Duration: ${experienceLabels[formData.workExperience] || formData.workExperience || "Not specified"}
${resumeContext}

Analyze this student's complete profile and generate personalized university recommendations.
Return a valid JSON object matching exactly this structure:

{
  "overallScore": <number 1-100 representing general admission profile strength>,
  "profileSummary": "<2-3 sentence comprehensive summary of the student's academic standing, strengths, and profile readiness>",
  "strengths": [
    "<Specific strength grounded in student's actual grades, test scores, skills, or experience>",
    "<Another specific strength from their profile>",
    "<Third specific strength>"
  ],
  "improvements": [
    "<Actionable recommendation to improve admission chances>",
    "<Second actionable recommendation>",
    "<Third actionable recommendation>"
  ],
  "recommendedUniversities": [
    {
      "name": "<Official University Name>",
      "country": "<Country>",
      "city": "<City / State>",
      "program": "<Specific Degree or Program matching their target>",
      "category": "<Must be exactly one of: 'Dream / Reach', 'Target / Match', 'Safe'>",
      "admissionChance": <number between 30 and 95 representing admission probability percentage>,
      "fitReason": "<Concise 2-3 sentences explaining specifically WHY this university and program is a good fit based on the student's actual GPA/scores, budget, degree interest, work background, or skills>",
      "keyHighlights": [
        "<Key feature 1, e.g. Strong alumni network in tech>",
        "<Key feature 2, e.g. Excellent ROI within budget tier>"
      ]
    }
  ],
  "careerOutlook": {
    "avgSalary": "<Estimated salary range or career potential, e.g. $85,000 - $110,000 or ₹14-20 LPA depending on country>",
    "topRoles": ["<Role 1>", "<Role 2>", "<Role 3>"],
    "industryFit": "<Brief sentence on industry demand for this profile>"
  }
}
`;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const responseText = response.text?.trim();
    if (!responseText) {
      throw new Error("Vertex AI returned an empty recommendations response.");
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      const cleanJSON = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJSON);
    }
  } catch (error) {
    console.error("Error in generateUniversityRecommendations Vertex AI call:", error);
    throw error;
  }
}
