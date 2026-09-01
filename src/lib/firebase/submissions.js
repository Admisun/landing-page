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
  const undergraduate = {
    institution: formData.undergraduate?.institution || '',
    degree: formData.undergraduate?.degree || '',
    score: formData.undergraduate?.score ? parseFloat(formData.undergraduate.score) : null,
    year: formData.undergraduate?.year ? parseInt(formData.undergraduate.year, 10) : null,
  };

  const postgraduate = (formData.postgraduate?.institution || formData.postgraduate?.degree)
    ? {
        institution: formData.postgraduate.institution || '',
        degree: formData.postgraduate.degree || '',
        score: formData.postgraduate.score ? parseFloat(formData.postgraduate.score) : null,
        year: formData.postgraduate.year ? parseInt(formData.postgraduate.year, 10) : null,
      }
    : null;

  const submission = {
    testType: formData.testType || '',
    testScore: formData.testScore || '',
    englishTestType: formData.englishTestType || '',
    englishTestScore: formData.englishTestScore || '',
    undergraduate,
    postgraduate,
    budget: formData.budget || '',
    workExperience: formData.workExperience || '',
    preferredCities: formData.preferredCities || '',
    targetDegree: formData.targetDegree || '',
    targetCountry: formData.targetCountry || '',
    preferredUniversities: Array.isArray(formData.preferredUniversities)
      ? formData.preferredUniversities
      : [],

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