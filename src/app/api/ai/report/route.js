import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateUniversityRecommendations } from '@/lib/ai/universityRecommender';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase/config';

export async function POST(request) {
  try {
    const { submissionId, uid } = await request.json();

    if (!submissionId) {
      return Response.json(
        { error: 'submissionId is required' },
        { status: 400 }
      );
    }

    // Try generating directly with Vertex AI on the server
    try {
      const docRef = adminDb.collection('admission_submissions').doc(submissionId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const subData = docSnap.data();
        let parsedResumeData = null;

        if (subData.resumeId) {
          const resumeSnap = await adminDb.collection('parsed_resumes').doc(subData.resumeId).get();
          if (resumeSnap.exists) {
            parsedResumeData = resumeSnap.data();
          }
        }

        const report = await generateUniversityRecommendations(subData, parsedResumeData);

        await docRef.update({
          report,
          status: 'completed',
          reportGeneratedAt: FieldValue.serverTimestamp(),
        });

        return Response.json({
          success: true,
          data: { report },
        });
      }
    } catch (directErr) {
      console.warn('Direct server recommendation generation failed, trying Cloud Function...', directErr);
    }

    // Fallback: Call Firebase Cloud Function
    const functions = getFunctions(app, 'us-central1');
    const generateReportFunction = httpsCallable(functions, 'generateReport');
    const result = await generateReportFunction({ submissionId });

    return Response.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error calling generateReport:', error);
    return Response.json(
      { error: 'Failed to generate report', details: error.message },
      { status: 500 }
    );
  }
}
