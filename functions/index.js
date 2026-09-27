const functions = require('firebase-functions');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
const { OpenAI } = require('openai');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { sendSubmissionNotification } = require('./emailNotifications');
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors')({ origin: true });
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

admin.initializeApp();
const db = admin.firestore();

// Configurations
const PROCESSOR_ID = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID || '8a1acab22c4a74df';
const LOCATION = process.env.GOOGLE_DOCUMENT_AI_LOCATION || 'us';
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'admisun-503110';

function getDocumentAIClient() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (credentialsJson) {
    try {
      return new DocumentProcessorServiceClient({
        credentials: JSON.parse(credentialsJson),
        apiEndpoint: `${LOCATION}-documentai.googleapis.com`,
      });
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e);
    }
  }
  return new DocumentProcessorServiceClient({
    apiEndpoint: `${LOCATION}-documentai.googleapis.com`,
  });
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === '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') {
    console.warn('OpenAI API key not configured or is placeholder. Using mock parser.');
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Normalizes text extracted from Document AI OCR into the requested structured JSON format.
 */
async function parseResumeTextWithAI(rawText) {
  if (!rawText || !rawText.trim()) {
    throw new Error('No resume text was extracted from the document.');
  }

  const genAI = new GoogleGenAI({
    vertexai: true,
    project: 'admisun-503110',
    location: 'us-central1',
  });

  const prompt = `
You are an expert resume parsing system.

Analyze the following OCR text extracted from a student's resume and convert it into a structured JSON object.

IMPORTANT:
- Extract only information actually present in the resume.
- Do not invent information.
- Use null when a single value is unavailable.
- Use [] when a list has no information.
- Preserve the original meaning of the resume.
- Return ONLY valid JSON.
- Do not use markdown.
- Do not include explanations outside the JSON.

Return exactly this structure:

{
  "personalInfo": {
    "fullName": "string or null",
    "email": "string or null",
    "phoneNumber": "string or null",
    "address": "string or null",
    "dateOfBirth": "string or null",
    "nationality": "string or null",
    "linkedin": "string or null",
    "github": "string or null",
    "portfolioWebsite": "string or null"
  },
  "education": [
    {
      "degree": "string or null",
      "specializationMajor": "string or null",
      "universityCollege": "string or null",
      "graduationYear": "string or null",
      "gpa": "string or null",
      "percentage": "string or null"
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
  "skills": [
    "string"
  ],
  "projects": [
    {
      "name": "string or null",
      "description": "string or null",
      "technologies": ["string"]
    }
  ],
  "certifications": [
    "string"
  ],
  "achievements": [
    "string"
  ]
}

RESUME OCR TEXT:
${rawText}
`.trim();

  try {
    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.text?.trim();

    if (!responseText) {
      throw new Error('Vertex AI returned an empty resume parsing response.');
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Vertex AI resume JSON:', responseText);
      throw new Error('Vertex AI returned invalid JSON for the resume.');
    }
  } catch (error) {
    console.error('Vertex AI resume parsing error:', error);
    throw error;
  }
}

/**
 * Normalizes text extracted from Document AI OCR using OpenAI.
 */
async function parseResumeTextWithOpenAI(rawText) {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error('OpenAI client is not configured.');
  }

  const prompt = `You are an expert AI resume parsing system. Analyze the following raw text extracted from a student's resume and parse it into a structured JSON object.

Intelligently identify and normalize the following sections, using null or empty arrays ([]) when information is unavailable. DO NOT omit any fields from the schema.

JSON SCHEMA:
{
  "personalInfo": {
    "fullName": "string or null",
    "email": "string or null",
    "phoneNumber": "string or null",
    "address": "string or null",
    "dateOfBirth": "string or null",
    "nationality": "string or null",
    "linkedin": "string or null",
    "github": "string or null",
    "portfolioWebsite": "string or null"
  },
  "education": [
    {
      "degree": "string or null",
      "specializationMajor": "string or null",
      "universityCollege": "string or null",
      "board": "string or null",
      "startYear": "number or null",
      "graduationYear": "number or null",
      "cgpaPercentage": "string or null",
      "academicRank": "string or null",
      "honorsDistinction": "string or null"
    }
  ],
  "workExperience": [
    {
      "company": "string or null",
      "jobTitle": "string or null",
      "employmentType": "string or null",
      "startDate": "string or null",
      "endDate": "string or null",
      "totalExperience": "string or null",
      "internshipDetails": "string or null",
      "keyResponsibilities": ["string"],
      "majorAchievements": ["string"]
    }
  ],
  "skills": {
    "technicalSkills": ["string"],
    "programmingLanguages": ["string"],
    "frameworks": ["string"],
    "softwareTools": ["string"],
    "cloudPlatforms": ["string"],
    "databases": ["string"],
    "softSkills": ["string"],
    "languagesKnown": ["string"]
  },
  "projects": [
    {
      "projectName": "string or null",
      "duration": "string or null",
      "role": "string or null",
      "technologiesUsed": ["string"],
      "problemStatement": "string or null",
      "outcomeImpact": "string or null",
      "githubProjectLink": "string or null"
    }
  ],
  "research": [
    {
      "researchPapers": "string or null",
      "publications": "string or null",
      "conferences": "string or null",
      "patents": "string or null",
      "citations": "string or null"
    }
  ],
  "certifications": [
    {
      "certificationName": "string or null",
      "issuingOrganization": "string or null",
      "issueDate": "string or null",
      "expiryDate": "string or null",
      "credentialId": "string or null"
    }
  ],
  "achievements": {
    "awards": ["string"],
    "scholarships": ["string"],
    "competitions": ["string"],
    "olympiads": ["string"],
    "hackathons": ["string"],
    "deansList": ["string"],
    "academicExcellence": ["string"]
  },
  "extracurricularActivities": [
    {
      "clubs": "string or null",
      "leadershipRoles": "string or null",
      "nssNcc": "string or null",
      "sports": "string or null",
      "culturalActivities": "string or null",
      "volunteering": "string or null"
    }
  ],
  "entranceExamDetails": {
    "gate": "string or null",
    "cat": "string or null",
    "gre": "string or null",
    "gmat": "string or null",
    "toeflIelts": "string or null",
    "otherExams": "string or null",
    "rankPercentile": "string or null"
  },
  "statementIndicators": {
    "careerObjective": "string or null",
    "areasOfInterest": ["string"],
    "researchInterests": ["string"],
    "preferredSpecialization": "string or null"
  },
  "references": [
    {
      "refereeName": "string or null",
      "designation": "string or null",
      "organization": "string or null",
      "email": "string or null",
      "phone": "string or null"
    }
  ]
}

Raw Text:
${rawText}

Return ONLY the parsed JSON object. Do not include markdown code block formatting or explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('OpenAI Parsing Error:', error);
    throw error;
  }
}

function generateMockParsedResume(rawText) {
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = rawText.match(/(\+?\d{1,3}[- ]?)?\d{10}/);
  
  return {
    personalInfo: {
      fullName: "Extracted Student Name",
      email: emailMatch ? emailMatch[0] : "student@example.com",
      phoneNumber: phoneMatch ? phoneMatch[0] : "9876543210",
      address: null,
      dateOfBirth: null,
      nationality: null,
      linkedin: null,
      github: null,
      portfolioWebsite: null
    },
    education: [
      {
        degree: "Bachelor of Technology",
        specializationMajor: "Computer Science & Engineering",
        universityCollege: "State Technical University",
        board: null,
        startYear: 2020,
        graduationYear: 2024,
        cgpaPercentage: "8.5/10",
        academicRank: null,
        honorsDistinction: "First Class with Distinction"
      }
    ],
    workExperience: [
      {
        company: "Tech Solutions Pvt. Ltd.",
        jobTitle: "Software Engineering Intern",
        employmentType: "Internship",
        startDate: "June 2023",
        endDate: "August 2023",
        totalExperience: "3 months",
        internshipDetails: "Worked on frontend and API integrations.",
        keyResponsibilities: ["Developed UI components using React", "Integrated third-party REST APIs"],
        majorAchievements: ["Reduced page load time by 15%"]
      }
    ],
    skills: {
      technicalSkills: ["Frontend Development", "Database Management"],
      programmingLanguages: ["JavaScript", "Python", "C++"],
      frameworks: ["React", "Node.js", "Express"],
      softwareTools: ["Git", "VS Code"],
      cloudPlatforms: ["AWS"],
      databases: ["MongoDB", "MySQL"],
      softSkills: ["Communication", "Teamwork", "Problem Solving"],
      languagesKnown: ["English", "Hindi"]
    },
    projects: [
      {
        projectName: "Admisun Landing Page",
        duration: "1 month",
        role: "Lead Developer",
        technologiesUsed: ["Next.js", "Firebase"],
        problemStatement: "Bridging the gap between students and colleges.",
        outcomeImpact: "Created dynamic responsive application portals.",
        githubProjectLink: null
      }
    ],
    research: [],
    certifications: [
      {
        certificationName: "React Developer Certification",
        issuingOrganization: "Udemy",
        issueDate: "2022",
        expiryDate: null,
        credentialId: null
      }
    ],
    achievements: {
      awards: ["Best Hackathon Project"],
      scholarships: [],
      competitions: [],
      olympiads: [],
      hackathons: [],
      deansList: [],
      academicExcellence: []
    },
    extracurricularActivities: [],
    entranceExamDetails: {
      gate: null,
      cat: "95%ile",
      gre: null,
      gmat: null,
      toeflIelts: null,
      otherExams: null,
      rankPercentile: null
    },
    statementIndicators: {
      careerObjective: "Seeking a career in technology and operations.",
      areasOfInterest: ["Web Development", "AI Solutions"],
      researchInterests: [],
      preferredSpecialization: "Software Engineering"
    },
    references: []
  };
}

/**
 * Feasibility Report Generator Helper
 */
async function generateFeasibilityReport(submissionRef, submissionData, parsedResumeData = null) {
  const genAI = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: 'us-central1',
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

  const resumeContext = parsedResumeData
    ? `\n\nPARSED RESUME DETAILS:
- Candidate Name: ${parsedResumeData.personalInfo?.fullName || parsedResumeData.personalInfo?.name || "Not provided"}
- Location: ${parsedResumeData.personalInfo?.address || parsedResumeData.personalInfo?.location || "Not provided"}
- Education: ${JSON.stringify(parsedResumeData.education || [])}
- Work Experience: ${JSON.stringify(parsedResumeData.experience || parsedResumeData.workExperience || [])}
- Skills: ${JSON.stringify(parsedResumeData.skills || [])}
- Projects: ${JSON.stringify(parsedResumeData.projects || [])}
- Certifications: ${JSON.stringify(parsedResumeData.certifications || [])}
- Achievements: ${JSON.stringify(parsedResumeData.achievements || [])}
- Extracurriculars: ${JSON.stringify(parsedResumeData.extracurricularActivities || [])}`
    : "\n\nPARSED RESUME: None uploaded.";

  const SYSTEM_PROMPT = `You are an expert AI university admissions strategist for Admisun.
Your task is to analyze a student's profile (academic records, test scores, degree preferences, target country, budget, work experience, and parsed resume if provided) and recommend suitable, realistic universities.

IMPORTANT RULES:
1. Base all analysis and fit reasons ONLY on the student's provided information and parsed resume.
2. DO NOT invent or hallucinate scores, degrees, extracurriculars, or achievements that are not provided.
3. Recommend 4 to 8 universities that match their target country/region, degree/major, budget tier, and academic/professional background.
4. Categorize universities into realistic fit categories: "Dream / Reach", "Target / Match", and "Safe".
5. For each university, provide a clear and specific "fitReason" explaining WHY this university matches the student's profile (mentioning relevant aspects like their GPA/percentage, test score, field of study, budget, skills, projects, or work experience).
6. Return ONLY a single valid JSON object strictly adhering to the requested schema. No markdown formatting outside the JSON, no backticks.`;

  const prompt = `
STUDENT ADMISSION PROFILE:
- Target Degree: ${submissionData.targetDegree || "Not specified"}
- Target Country: ${submissionData.targetCountry || "Not specified"}
- Preferred Universities: ${submissionData.preferredUniversities || "Not specified"}
- Preferred Cities / Locations: ${submissionData.preferredCities || "Not specified"}
- Undergraduate / Academic Score: ${submissionData.graduationScore ? `${submissionData.graduationScore}%` : "Not provided"}
- Standardized Test Score (CAT/GMAT/GRE/SAT): ${submissionData.testScore || "Not provided"}
- Budget Tier: ${budgetLabels[submissionData.budget] || submissionData.budget || "Not specified"}
- Work Experience Duration: ${experienceLabels[submissionData.workExperience] || submissionData.workExperience || "Not specified"}
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
`.trim();

  let report;
  try {
    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const responseText = result.text?.trim();
    if (!responseText) {
      throw new Error('Vertex AI returned an empty recommendations response.');
    }

    try {
      report = JSON.parse(responseText);
    } catch (parseErr) {
      const cleanJSON = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      report = JSON.parse(cleanJSON);
    }
  } catch (error) {
    console.error('Error generating university recommendations with Vertex AI:', error);
    const score = submissionData.graduationScore || 75;
    report = {
      overallScore: Math.min(95, Math.max(50, Math.round(score))),
      profileSummary: `Admissions profile for ${submissionData.targetDegree || 'Degree'} in ${submissionData.targetCountry || 'target country'}.`,
      strengths: [
        submissionData.graduationScore ? `Academic undergraduate score of ${submissionData.graduationScore}%` : 'Academic foundation recorded',
        submissionData.testScore ? `Submitted standardized test score: ${submissionData.testScore}` : 'Candidate evaluation profile submitted',
      ],
      improvements: [
        'Tailor application statements and recommendation letters to specific department research interests',
      ],
      recommendedUniversities: [
        {
          name: submissionData.preferredUniversities || 'Target University',
          country: submissionData.targetCountry || 'Target Region',
          city: submissionData.preferredCities || 'Preferred City',
          program: submissionData.targetDegree || 'Program of Choice',
          category: 'Target / Match',
          admissionChance: Math.min(90, Math.max(50, Math.round(score))),
          fitReason: `Directly aligns with your intended degree (${submissionData.targetDegree || 'Program'}) and location preferences.`,
          keyHighlights: ['Strong academic curriculum in chosen discipline'],
        },
      ],
      careerOutlook: {
        avgSalary: 'Competitive industry benchmark',
        topRoles: ['Domain Associate', 'Specialist'],
        industryFit: 'Positive industry growth prospects',
      },
    };
  }

  // Also maintain backwards compatibility with recommendedColleges if anything expects it
  if (report.recommendedUniversities && !report.recommendedColleges) {
    report.recommendedColleges = report.recommendedUniversities.map((u) => ({
      name: u.name,
      chance: u.admissionChance,
      tier: u.category,
      fitReason: u.fitReason,
    }));
  }

  // Update Firestore
  await submissionRef.update({
    report,
    status: 'completed',
    reportGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Report and university recommendations successfully written to submission document.');
  return report;
}

/**
 * Storage Trigger: Runs when a file is uploaded to Firebase Storage.
 */
exports.parseResumeOnUpload = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name; // e.g. resumes/uid/submissionId/filename.pdf
  const contentType = object.contentType;

  if (!filePath.startsWith('resumes/')) {
    console.log('File is not in resumes directory. Skipping.');
    return null;
  }

  const pathParts = filePath.split('/');
  if (pathParts.length < 4) {
    console.log('File path does not match standard layout resumes/{uid}/{submissionId}/{fileName}. Skipping.');
    return null;
  }

  const uid = pathParts[1];
  const submissionId = pathParts[2];
  const fileName = pathParts.slice(3).join('/');

  console.log(`Processing resume upload: File: ${fileName}, UID: ${uid}, Submission: ${submissionId}`);

  try {
    const bucket = admin.storage().bucket(object.bucket);
    const tempFilePath = path.join(os.tmpdir(), path.basename(filePath));

    // Download the file locally
    await bucket.file(filePath).download({ destination: tempFilePath });
    console.log('File downloaded to temp path:', tempFilePath);

    const fileBuffer = fs.readFileSync(tempFilePath);
    
    // Cleanup local temp file
    fs.unlinkSync(tempFilePath);

    // Call Document AI OCR
    console.log('Calling Google Document AI OCR...');
    const client = getDocumentAIClient();
    const processorName = `projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}`;

    const [result] = await client.processDocument({
      name: processorName,
      rawDocument: {
        content: fileBuffer.toString('base64'),
        mimeType: contentType,
      },
    });

    const document = result.document;
    const extractedText = document?.text?.trim() || '';
    const pageCount = document?.pages?.length || 0;

    console.log(`OCR complete. Extracted ${extractedText.length} characters, ${pageCount} pages.`);

    // Use AI to convert OCR text into structured schema
    console.log('Sending extracted text to AI Parser...');
    const parsedData = await parseResumeTextWithAI(extractedText);
    console.log('Structured resume parsing complete.');

    // Save parsed data to Student Firestore Document (if they are logged in)
    if (uid !== 'anonymous') {
      const userRef = db.collection('users').doc(uid);
      await userRef.set({
        parsedResume: parsedData,
        resumeUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`Saved parsed resume data to users/${uid}`);
    }

    // Save parsed resume data to the Admission Submission
  // Save parsed resume to parsed_resumes
const parsedResumeRef = db.collection('parsed_resumes').doc(submissionId);

await parsedResumeRef.set({
  ...parsedData,
  submissionId,
  uid,
  fileName,
  mimeType: contentType,
  storagePath: filePath,
  parsedText: extractedText,
  pageCount,
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
}, { merge: true });

console.log(`Saved parsed resume to parsed_resumes/${submissionId}`);

// Save parsed resume data to the admission submission
const submissionRef = db.collection('admission_submissions').doc(submissionId);

await submissionRef.set({
  resumeId: submissionId,
  resume: {
    fileName,
    mimeType: contentType,
    size: Number(object.size),
    storagePath: filePath,
    parseStatus: 'completed',
    parsedData,
    parsedText: extractedText,
    pageCount,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }
}, { merge: true });
    // Fetch the updated submission data and automatically generate the admission report!
    const submissionDoc = await submissionRef.get();
    const submissionData = submissionDoc.data();
    console.log('Automatically generating Feasibility Report...');
    await generateFeasibilityReport(submissionRef, submissionData, parsedData);

    return { success: true };
  } catch (error) {
    console.error('Error processing resume upload:', error);
    
    // Mark as failed in submission document
    try {
      const submissionRef = db.collection('admission_submissions').doc(submissionId);
      await submissionRef.set({
        resumeId: submissionId,
        resume: {
          fileName: path.basename(filePath),
          mimeType: contentType,
          parseStatus: 'failed',
          parseError: error.message || 'Unknown error',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      }, { merge: true });

      // Generate the report anyway, but without the resume details
      const submissionDoc = await submissionRef.get();
      const submissionData = submissionDoc.data();
      console.log('Generating Feasibility Report without resume data due to parser error...');
      await generateFeasibilityReport(submissionRef, submissionData, null);
    } catch (dbError) {
      console.error('Failed to update submission status or generate report after error:', dbError);
    }
    
    throw error;
  }
});

/**
 * Firestore Trigger: Runs when a new submission is created in admission_submissions.
 * If the submission does NOT have a resume upload (hasResume is false), it generates the report immediately.
 */
exports.generateReportOnSubmission = functions.firestore
  .document('admission_submissions/{submissionId}')
  .onCreate(async (snap, context) => {
    const submissionId = context.params.submissionId;
    const submissionData = snap.data();

    // If a resume is being uploaded, we let the parseResumeOnUpload storage trigger handle it
    if (submissionData.hasResume === true) {
      console.log(`Submission ${submissionId} has resume. Skipping Firestore trigger to allow storage trigger to handle it.`);
      return null;
    }

    console.log(`Submission ${submissionId} has no resume. Generating report immediately.`);
    try {
      const docRef = db.collection('admission_submissions').doc(submissionId);
      await generateFeasibilityReport(docRef, submissionData, null);
      return { success: true };
    } catch (e) {
      console.error(`Error generating report in onCreate trigger for ${submissionId}:`, e);
      throw e;
    }
  });

/**
 * Firestore Trigger: Sends a best-effort internal notification for every new
 * admission submission. Notification failures never affect the saved document.
 */
exports.notifyOnSubmission = onDocumentCreated(
  {
    document: 'admission_submissions/{submissionId}',
    secrets: [RESEND_API_KEY],
  },
  async (event) => {
    const submissionId = event.params.submissionId;
    const apiKey = RESEND_API_KEY.value() || process.env.RESEND_API_KEY;

    await sendSubmissionNotification(submissionId, event.data.data(), apiKey);
    return null;
  }
);

/**
 * HTTPS Callable Function: Generates/regenerates the AI Admission Report on demand.
 */
exports.generateReport = functions.https.onCall(async (data, context) => {
  const { submissionId } = data;
  const uid = context.auth ? context.auth.uid : 'anonymous';

  if (!submissionId) {
    throw new functions.https.HttpsError('invalid-argument', 'submissionId is required.');
  }

  try {
    const docRef = db.collection('admission_submissions').doc(submissionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Submission not found.');
    }

    const submissionData = docSnap.data();

    // Verify ownership
    if (submissionData.uid !== 'anonymous' && submissionData.uid !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'You do not have permission to access this submission.');
    }

    const resumeData = submissionData.resume ? submissionData.resume.parsedData : null;
    const report = await generateFeasibilityReport(docRef, submissionData, resumeData);

    return {
      success: true,
      report
    };
  } catch (error) {
    console.error('On-call generateReport error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to generate report.');
  } 
});

/**
 * HTTPS Request Function: Generates/regenerates the AI Admission Report via direct HTTP POST.
 * Allows client-side GitHub Pages dashboard to trigger recommendations with CORS.
 */
exports.generateReportHttp = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
      });
    }

    try {
      const { submissionId } = req.body || {};

      if (!submissionId) {
        return res.status(400).json({
          error: 'submissionId is required',
        });
      }

      const docRef = db.collection('admission_submissions').doc(submissionId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({
          error: 'Submission not found.',
        });
      }

      const submissionData = docSnap.data();
      let resumeData = submissionData.resume ? submissionData.resume.parsedData : null;

      if (!resumeData && submissionData.resumeId) {
        const parsedSnap = await db.collection('parsed_resumes').doc(submissionData.resumeId).get();
        if (parsedSnap.exists) {
          resumeData = parsedSnap.data();
        }
      }

      const report = await generateFeasibilityReport(docRef, submissionData, resumeData);

      return res.status(200).json({
        success: true,
        report,
      });
    } catch (error) {
      console.error('generateReportHttp error:', error);
      return res.status(500).json({
        error: error.message || 'Failed to generate university recommendations.',
      });
    }
  });
});

exports.admisunChat = functions.https.onRequest(
  async (req, res) => {
    return cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: 'Method not allowed',
        });
      }

      try {
        const { message } = req.body || {};

        if (!message || typeof message !== 'string') {
          return res.status(400).json({
            error: 'message is required',
          });
        }

        const genAI = new GoogleGenAI({
          vertexai: true,
          project: 'admisun-503110',
          location: 'us-central1',
        });

        const SYSTEM_PROMPT = `
You are Admisun AI, an admissions assistant for students.

Help users with:
- university admissions
- applications
- eligibility
- deadlines
- scholarships
- resumes
- courses
- universities
- education-related questions

If a question is unrelated to education or university admissions,
politely explain that you are designed specifically to assist with
higher education and admissions.

IMPORTANT RESPONSE GUIDELINES:
- Be direct and concise. Answer the specific question asked.
- Avoid vague or overly broad responses.
- NEVER use markdown formatting. No asterisks (*), no bold text, no bullet points with asterisks.
- Use plain text only. Separate ideas with commas or periods, not markdown.
- Provide specific, actionable information when possible.
- If you don't know something specific, say so rather than giving generic advice.
- Keep responses under 150 words when possible.
- Focus on the most relevant information for the user's question.
- Do not invent university policies, deadlines or admission requirements.
- If information may vary by university or year, say so.
- Example: Instead of "* University admissions * Applications", write "I can help with university admissions and applications."
        `.trim();

        const result = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [{ text: message }],
            },
          ],
          config: {
            systemInstruction: SYSTEM_PROMPT,
          },
        });

        const responseText = result.text?.trim();

        if (!responseText) {
          return res.status(500).json({
            error: 'Vertex AI returned an empty response.',
          });
        }

        return res.status(200).json({
          response: responseText,
        });
      } catch (error) {
        console.error('========== ADM ISUN CHAT ERROR ==========');
        console.error(error);

        return res.status(500).json({
          error: 'Unable to generate an AI response.',
        });
      }
    });
  }
);
/**
 * HTTPS Function: Waits for the existing Storage resume parser
 * to finish processing a submission.
 *
 * The actual parsing is still handled by parseResumeOnUpload.
 */
exports.parseResume = functions
  .runWith({ timeoutSeconds: 180 })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: 'Method not allowed',
        });
      }

      try {
        const { submissionId } = req.body || {};

        if (!submissionId) {
          return res.status(400).json({
            error: 'submissionId is required',
          });
        }

        const submissionRef = db
          .collection('admission_submissions')
          .doc(submissionId);

        const maxWaitTime = 150000; // 2.5 minutes
        const pollInterval = 3000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
          const snapshot = await submissionRef.get();

          if (!snapshot.exists) {
            return res.status(404).json({
              error: 'Submission not found.',
            });
          }

          const data = snapshot.data();
          const resume = data.resume;

          if (resume?.parseStatus === 'completed') {
            return res.status(200).json({
              success: true,
              parsedData: resume.parsedData || null,
            });
          }

          if (resume?.parseStatus === 'failed') {
            return res.status(500).json({
              error: resume.parseError || 'Resume parsing failed.',
            });
          }

          await new Promise((resolve) =>
            setTimeout(resolve, pollInterval)
          );
        }

        return res.status(202).json({
          success: false,
          pending: true,
          message: 'Resume parsing is still in progress.',
        });
      } catch (error) {
        console.error('========== RESUME PARSE WAIT ERROR ==========');
        console.error(error);

        return res.status(500).json({
          error: 'Unable to check resume parsing status.',
        });
      }
    });
  });