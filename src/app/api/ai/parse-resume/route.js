import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { parseResumeContent } from '@/lib/ai/resumeParser';
import { generateUniversityRecommendations } from '@/lib/ai/universityRecommender';
import { fetchRemoteFileAsBase64 } from '@/lib/utils/fetchRemoteFile';

export async function POST(req) {
  let submissionId = null;

  try {
    const body = await req.json();

    submissionId = body.submissionId;
    const downloadUrl = body.downloadUrl;

    if (!downloadUrl) {
      return NextResponse.json(
        { error: 'downloadUrl is required' },
        { status: 400 }
      );
    }

    if (!submissionId) {
      return NextResponse.json(
        { error: 'submissionId is required' },
        { status: 400 }
      );
    }

    // Download the resume
    const { base64, contentType } = await fetchRemoteFileAsBase64(downloadUrl);

    // Parse using Vertex AI
    const parsedData = await parseResumeContent(base64, contentType);

    // Save parsed resume
    const resumeRef = await adminDb.collection('parsed_resumes').add({
      submissionId,

      personalInfo: parsedData.personalInfo || null,
      education: parsedData.education || [],
      experience: parsedData.experience || [],
      skills: parsedData.skills || [],
      projects: parsedData.projects || [],
      certifications: parsedData.certifications || [],
      achievements: parsedData.achievements || [],

      parsedMetadata: {
        contentType,
        parsedAt: new Date().toISOString(),
      },

      createdAt: FieldValue.serverTimestamp(),
    });

    // Fetch submission data to generate university recommendations with Vertex AI
    let report = null;
    try {
      const submissionSnap = await adminDb
        .collection('admission_submissions')
        .doc(submissionId)
        .get();

      if (submissionSnap.exists) {
        const subData = submissionSnap.data();
        report = await generateUniversityRecommendations(subData, parsedData);
      }
    } catch (reportErr) {
      console.error('Failed to generate university recommendations in parse route:', reportErr);
    }

    // Update submission
    const updatePayload = {
      resumeId: resumeRef.id,
      status: 'completed',
      hasResume: true,
    };

    if (report) {
      updatePayload.report = report;
      updatePayload.reportGeneratedAt = FieldValue.serverTimestamp();
    }

    await adminDb
      .collection('admission_submissions')
      .doc(submissionId)
      .update(updatePayload);

    return NextResponse.json({
      success: true,
      resumeId: resumeRef.id,
      parsedData,
      report,
    });
  } catch (error) {
    console.error('Error during server-side resume parsing:', error);

    if (submissionId) {
      try {
        await adminDb
          .collection('admission_submissions')
          .doc(submissionId)
          .update({
            status: 'failed',
            parseError: error.message || 'Unknown error',
          });
      } catch (updateError) {
        console.error(
          'Failed to update submission status:',
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        error: error.message || 'Internal Server Error',
      },
      {
        status: 500,
      }
    );
  }
}