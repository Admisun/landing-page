import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { parseResumeContent } from '@/lib/ai/resumeParser';

/**
 * Downloads a file from Firebase Storage and converts it to base64.
 */
async function fetchResumeFile(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download resume file: ${response.status} ${response.statusText}`
    );
  }

  const contentType =
    response.headers.get('content-type') || 'application/pdf';

  const buffer = await response.arrayBuffer();

  return {
    base64: Buffer.from(buffer).toString('base64'),
    contentType,
  };
}

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
    const { base64, contentType } = await fetchResumeFile(downloadUrl);

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

    // Update submission
    await adminDb
      .collection('admission_submissions')
      .doc(submissionId)
      .update({
        resumeId: resumeRef.id,
        status: 'completed',
        hasResume: true,
      });

    return NextResponse.json({
      success: true,
      resumeId: resumeRef.id,
      parsedData,
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