import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
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

    // Call the Firebase Cloud Function to generate/regenerate the report
    const functions = getFunctions(app, 'us');
    const generateReportFunction = httpsCallable(functions, 'generateReport');
    
    const result = await generateReportFunction({ submissionId });
    
    return Response.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error calling generateReport function:', error);
    return Response.json(
      { error: 'Failed to generate report', details: error.message },
      { status: 500 }
    );
  }
}
