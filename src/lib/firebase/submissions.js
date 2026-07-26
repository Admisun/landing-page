import { db } from '@/lib/firebase/config';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const SUBMISSIONS_COLLECTION = 'admission_submissions';

/**
 * Persists an admission calculator / inquiry form submission to Firestore.
 * @param {Object} formData - Raw form fields from react-hook-form
 * @param {import('firebase/auth').User | null} user - Current authenticated user, if any
 * @returns {Promise<string>} The new document ID
 */
export async function saveAdmissionSubmission(formData, user = null, hasResume = false) {
  const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), {
    testScore: formData.testScore || '',
    graduationScore: formData.graduationScore ? parseFloat(formData.graduationScore) : null,
    budget: formData.budget || '',
    workExperience: formData.workExperience || '',
    preferredCities: formData.preferredCities || '',
    uid: user ? user.uid : 'anonymous',
    status: 'pending',
    hasResume: hasResume,
    resume: null,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Saves resume metadata and OCR results on an existing submission.
 * @param {string} submissionId
 * @param {Object} resumeData
 */
export async function updateSubmissionResume(submissionId, resumeData) {
  const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);

  await updateDoc(submissionRef, {
    resume: {
      ...resumeData,
      updatedAt: serverTimestamp(),
    },
  });
}

export { SUBMISSIONS_COLLECTION };
