import { NextResponse } from 'next/server';
import { parseResumeContent } from '@/lib/ai/resumeParser';
import { fetchRemoteFileAsBase64 } from '@/lib/utils/fetchRemoteFile';

/**
 * Stateless resume parse used to pre-fill the admission form before submit.
 * Unlike /api/ai/parse-resume, this makes no Firestore writes — no
 * submission document exists yet at this point in the flow.
 */
export async function POST(req) {
  try {
    const { downloadUrl } = await req.json();

    if (!downloadUrl) {
      return NextResponse.json(
        { error: 'downloadUrl is required' },
        { status: 400 }
      );
    }

    const { base64, contentType } = await fetchRemoteFileAsBase64(downloadUrl);
    const parsedData = await parseResumeContent(base64, contentType);

    return NextResponse.json({ success: true, parsedData });
  } catch (error) {
    console.error('Error during resume preview parsing:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
