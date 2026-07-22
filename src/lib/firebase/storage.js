import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const RESUME_PATH_PREFIX = 'resumes';
const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

/**
 * Validates a resume file before upload.
 * @param {File} file
 */
export function validateResumeFile(file) {
  if (!file) {
    throw new Error('No file selected.');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Please upload a PDF or image file (JPG, PNG, WEBP).');
  }

  if (file.size > MAX_RESUME_SIZE) {
    throw new Error('Resume must be 5 MB or smaller.');
  }
}

/**
 * Uploads a resume to Firebase Storage.
 * @param {File} file
 * @param {string} submissionId
 * @param {import('firebase/auth').User | null} user
 * @returns {Promise<{ storagePath: string, downloadUrl: string, fileName: string, mimeType: string, size: number }>}
 */
export async function uploadResume(file, submissionId, user = null) {
  validateResumeFile(file);

  const ownerSegment = user ? user.uid : 'anonymous';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${RESUME_PATH_PREFIX}/${ownerSegment}/${submissionId}/${safeName}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      submissionId,
      uploadedBy: ownerSegment,
    },
  });

  const downloadUrl = await getDownloadURL(storageRef);

  return {
    storagePath,
    downloadUrl,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
  };
}
