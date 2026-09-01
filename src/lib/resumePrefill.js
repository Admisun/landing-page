const WORK_EXPERIENCE_BUCKETS = [
  { max: 0, value: '0' },
  { max: 3, value: '1to3' },
  { max: 5, value: '3to5' },
  { max: Infinity, value: '5plus' },
];

function parseNumericPrefix(value) {
  if (value == null) return null;
  const match = String(value).match(/[\d.]+/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return isNaN(n) ? null : n;
}

function parseYear(value) {
  const match = String(value ?? '').match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

function pickLatestEducation(entries) {
  if (!entries.length) return null;
  return entries.reduce((latest, entry) => {
    const latestYear = parseYear(latest.graduationYear) ?? -Infinity;
    const entryYear = parseYear(entry.graduationYear) ?? -Infinity;
    return entryYear > latestYear ? entry : latest;
  }, entries[0]);
}

function mapEducationEntry(entry) {
  if (!entry) return null;
  return {
    institution: entry.institution || '',
    degree: entry.degree || entry.major || '',
    score: parseNumericPrefix(entry.gpa),
    year: parseYear(entry.graduationYear),
  };
}

function estimateWorkExperience(experience) {
  if (!Array.isArray(experience) || experience.length === 0) return null;

  const currentYear = new Date().getFullYear();
  let minStart = Infinity;
  let maxEnd = -Infinity;

  for (const job of experience) {
    const startYear = parseYear(job.startDate);
    if (startYear != null) minStart = Math.min(minStart, startYear);

    const isPresent = !job.endDate || /present|current/i.test(String(job.endDate));
    const endYear = isPresent ? currentYear : parseYear(job.endDate);
    if (endYear != null) maxEnd = Math.max(maxEnd, endYear);
  }

  if (!isFinite(minStart) || !isFinite(maxEnd)) return null;

  const span = Math.max(0, maxEnd - minStart);
  return WORK_EXPERIENCE_BUCKETS.find(b => span <= b.max).value;
}

/**
 * Builds a conservative form pre-fill from AI-parsed resume data.
 * Only fills Undergraduate/Post-Graduate education blocks and a rough
 * work-experience bucket — fields resumes reliably state. Never guesses
 * testScore, targetDegree, targetCountry, budget, or university preferences.
 */
export function buildPrefillFromParsedResume(parsedData) {
  const education = Array.isArray(parsedData?.education) ? parsedData.education : [];

  const undergraduateEntries = education.filter(e => e.level === 'Bachelors');
  const postgraduateEntries = education.filter(e => e.level === 'Masters' || e.level === 'PhD');

  return {
    undergraduate: mapEducationEntry(pickLatestEducation(undergraduateEntries)),
    postgraduate: mapEducationEntry(pickLatestEducation(postgraduateEntries)),
    workExperience: estimateWorkExperience(parsedData?.experience),
  };
}
