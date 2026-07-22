import { NextResponse } from 'next/server';
import { parseDocumentWithOCR } from '@/lib/documentai/parse';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Resume file is required.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload a PDF or image (JPG, PNG, WEBP).' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Resume must be 5 MB or smaller.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { text, pageCount } = await parseDocumentWithOCR(fileBuffer, file.type);

    return NextResponse.json({
      success: true,
      parsedText: text,
      pageCount,
      charCount: text.length,
    });
  } catch (error) {
    console.error('Resume parse error:', error);

    const message = error.message?.includes('not configured')
      ? 'Document AI is not configured. Add Google Cloud credentials to your environment.'
      : 'Failed to parse resume. Please try again.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
