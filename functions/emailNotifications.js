const path = require('path');
const dotenv = require('dotenv');
const { Resend } = require('resend');

// This loads the root .env.local only when the Functions source is run locally.
// Production will provide the same variable through Firebase Secret Manager.
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const NOTIFICATION_RECIPIENT = 'swadheenmishra30@gmail.com';
const DEFAULT_FROM_EMAIL = 'Admisun <onboarding@resend.dev>';

function escapeHtml(value) {
  return String(value ?? 'Not provided')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Just submitted';

  const date = typeof timestamp.toDate === 'function'
    ? timestamp.toDate()
    : new Date(timestamp);

  return Number.isNaN(date.getTime()) ? 'Just submitted' : date.toISOString();
}

function getSubmissionRows(submissionId, submissionData) {
  return [
    ['Submission ID', submissionId],
    ['Submitted at', formatTimestamp(submissionData.createdAt)],
    ['Applicant name', submissionData.applicantName],
    ['Applicant email', submissionData.applicantEmail],
    ['Test score', submissionData.testScore],
    ['Graduation score', submissionData.graduationScore ? `${submissionData.graduationScore}%` : null],
    ['Budget', submissionData.budget],
    ['Work experience', submissionData.workExperience],
    ['Preferred cities', submissionData.preferredCities],
    ['Resume attached', submissionData.hasResume ? 'Yes' : 'No'],
  ];
}

function buildSubmissionEmail(submissionId, submissionData) {
  const rows = getSubmissionRows(submissionId, submissionData);
  const htmlRows = rows.map(([label, value]) => (
    `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
  )).join('');
  const text = rows.map(([label, value]) => `${label}: ${value ?? 'Not provided'}`).join('\n');

  return {
    subject: `New Admisun submission: ${submissionId}`,
    text: `A new admission calculator submission was received.\n\n${text}`,
    html: `<h1>New Admisun submission</h1><table>${htmlRows}</table>`,
  };
}

async function sendSubmissionNotification(submissionId, submissionData, apiKey) {
  if (!apiKey) {
    console.error('Submission notification skipped: RESEND_API_KEY is not configured.');
    return { sent: false, reason: 'missing-api-key' };
  }

  try {
    const resend = new Resend(apiKey);
    const email = buildSubmissionEmail(submissionId, submissionData);
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL,
      to: [NOTIFICATION_RECIPIENT],
      ...email,
    });

    if (error) {
      console.error(`Submission notification failed for ${submissionId}:`, error);
      return { sent: false, reason: 'provider-error' };
    }

    console.log(`Submission notification sent for ${submissionId}. Resend ID: ${data?.id || 'unknown'}`);
    return { sent: true, id: data?.id };
  } catch (error) {
    console.error(`Submission notification failed for ${submissionId}:`, error);
    return { sent: false, reason: 'unexpected-error' };
  }
}

module.exports = { sendSubmissionNotification };
