import { db } from '@/lib/firebase/config';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

const SUBMISSIONS_COLLECTION = 'admission_submissions';

/**
 * Persists an admission calculator submission to Firestore.
 *
 * @param {Object} formData - Raw form fields from react-hook-form.
 * @param {import('firebase/auth').User | null} user - Current authenticated user.
 * @param {boolean} hasResume - Whether a resume was uploaded.
 * @returns {Promise<string>} Firestore document ID.
 */
export async function saveAdmissionSubmission(
  formData,
  user = null,
  hasResume = false
) {
  const submission = {
    testScore: formData.testScore || '',
    graduationScore: formData.graduationScore
      ? parseFloat(formData.graduationScore)
      : null,
    budget: formData.budget || '',
    workExperience: formData.workExperience || '',
    preferredCities: formData.preferredCities || '',
    targetDegree: formData.targetDegree || '',
    targetCountry: formData.targetCountry || '',
    preferredUniversities: formData.preferredUniversities || '',

    uid: user ? user.uid : 'anonymous',
    applicantName: user?.displayName || '',
    applicantEmail: user?.email || '',

    // Always create as pending.
    // Your backend (or API) should update this to "completed"
    // after the report has been generated.
    status: 'pending',

    hasResume,
    resumeId: null,

    createdAt: serverTimestamp(),
  };

  console.log('Creating submission:', submission);

  const docRef = await addDoc(
    collection(db, SUBMISSIONS_COLLECTION),
    submission
  );

  console.log('Submission created:', docRef.id);

  return docRef.id;
}

/**
 * Updates an existing submission with resume information.
 *
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