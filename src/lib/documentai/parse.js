import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

const PROCESSOR_ID = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID || '3a137b126cd2f719';
const LOCATION = process.env.GOOGLE_DOCUMENT_AI_LOCATION || 'asia-south1';
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

function getClient() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (credentialsJson) {
    return new DocumentProcessorServiceClient({
      credentials: JSON.parse(credentialsJson),
      apiEndpoint: `${LOCATION}-documentai.googleapis.com`,
    });
  }

  return new DocumentProcessorServiceClient({
    apiEndpoint: `${LOCATION}-documentai.googleapis.com`,
  });
}

/**
 * Extracts plain text from a document using Google Document AI OCR.
 * @param {Buffer} fileBuffer
 * @param {string} mimeType
 * @returns {Promise<{ text: string, pageCount: number }>}
 */
export async function parseDocumentWithOCR(fileBuffer, mimeType) {
  if (!PROJECT_ID) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured.');
  }

  const client = getClient();
  const processorName = `projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}`;

  const [result] = await client.processDocument({
    name: processorName,
    rawDocument: {
      content: fileBuffer.toString('base64'),
      mimeType,
    },
  });

  const document = result.document;
  const text = document?.text?.trim() || '';
  const pageCount = document?.pages?.length || 0;

  return { text, pageCount };
}
