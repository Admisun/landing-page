import { NextResponse } from 'next/server';

// Helper: generate a mock AI report when OpenAI key is not configured
function generateMockReport(data) {
  const score = data.graduationScore || 75;
  const probability = Math.min(95, Math.max(40, score + Math.floor(Math.random() * 15)));

  const budgetLabels = {
    under10: "Under ₹10 Lakhs",
    "10to20": "₹10-20 Lakhs",
    "20to30": "₹20-30 Lakhs",
    above30: "Above ₹30 Lakhs"
  };

  const experienceLabels = {
    "0": "Fresher",
    "1to3": "1-3 years",
    "3to5": "3-5 years",
    "5plus": "5+ years"
  };

  const colleges = [
    { name: "IIM Bangalore", chance: Math.min(95, probability + 5), tier: "Tier 1" },
    { name: "IIM Ahmedabad", chance: Math.min(90, probability + 2), tier: "Tier 1" },
    { name: "XLRI Jamshedpur", chance: Math.min(92, probability + 8), tier: "Tier 1" },
    { name: "FMS Delhi", chance: Math.min(88, probability + 10), tier: "Tier 1" },
    { name: "MDI Gurgaon", chance: Math.min(94, probability + 12), tier: "Tier 2" },
    { name: "SIBM Pune", chance: Math.min(96, probability + 15), tier: "Tier 2" },
  ];

  return {
    overallScore: probability,
    summary: `Based on your graduation score of ${score}%, ${data.testScore ? `test score of ${data.testScore},` : ''} ${experienceLabels[data.workExperience] || 'N/A'} work experience, and a budget of ${budgetLabels[data.budget] || 'N/A'}, our AI has analyzed your admission profile across top institutions.`,
    strengths: [
      score >= 80 ? "Strong academic foundation with above-average graduation score" : "Solid academic record with room for growth",
      data.workExperience && data.workExperience !== "0" ? "Professional experience adds maturity and practical perspective to your profile" : "Fresh perspective and recent academic knowledge are valuable",
      data.testScore ? "Competitive entrance exam score positions you well" : "Consider preparing for standardized tests to strengthen your application"
    ],
    improvements: [
      "Consider strengthening extracurricular profile with leadership roles",
      "Building a portfolio of relevant certifications could boost your application",
      "Networking with alumni from target institutions can provide an edge"
    ],
    recommendedColleges: colleges.sort((a, b) => b.chance - a.chance).slice(0, 5),
    nextSteps: [
      "Complete your profile on Admisun for more personalized recommendations",
      "Explore scholarship opportunities matching your budget range",
      "Schedule a session with our AI Admission Strategist for a detailed roadmap",
      "Start preparing application essays for your top 3 target institutions"
    ],
    careerOutlook: {
      avgSalary: data.budget === "above30" || data.budget === "20to30" ? "₹18-25 LPA" : "₹12-18 LPA",
      topRecruiters: ["McKinsey", "BCG", "Amazon", "Google", "Goldman Sachs"],
      placementRate: `${Math.min(98, probability + 10)}%`
    }
  };
}

export async function POST(req) {
  try {
    const { submissionData } = await req.json();

    if (!submissionData) {
      return NextResponse.json({ error: 'Submission data is required' }, { status: 400 });
    }

    let report;
    const apiKey = process.env.OPENAI_API_KEY;
    const resumeText = submissionData.resume?.parsedText?.trim();
    const resumeSection = resumeText
      ? `\n- Resume (OCR extracted):\n${resumeText.slice(0, 4000)}`
      : '';

    if (apiKey && apiKey !== 'sk-placeholder-key') {
      // Real OpenAI integration
      const { default: openai } = await import('@/lib/ai/openai');
      
      const prompt = `You are an expert education admission counselor for Indian students. Analyze the following student profile and provide a detailed admission report in JSON format.

Student Profile:
- Test Score: ${submissionData.testScore || 'Not provided'}
- Graduation Score: ${submissionData.graduationScore || 'Not provided'}%
- Budget: ${submissionData.budget || 'Not provided'}
- Work Experience: ${submissionData.workExperience || 'Not provided'}
- Preferred Cities: ${submissionData.preferredCities || 'Not provided'}${resumeSection}

Return a JSON object with these fields:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence overview>",
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "improvements": ["<area1>", "<area2>", "<area3>"],
  "recommendedColleges": [{"name": "<college>", "chance": <0-100>, "tier": "<Tier 1/2/3>"}],
  "nextSteps": ["<step1>", "<step2>", "<step3>", "<step4>"],
  "careerOutlook": {"avgSalary": "<range>", "topRecruiters": ["<company1>", "<company2>"], "placementRate": "<percentage>"}
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      report = JSON.parse(completion.choices[0].message.content);
    } else {
      // Mock report for development
      report = generateMockReport(submissionData);
    }

    return NextResponse.json({ success: true, report });

  } catch (error) {
    console.error('AI Report Error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
