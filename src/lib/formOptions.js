export const COUNTRIES = ['India', 'USA', 'UK', 'Canada', 'Australia', 'Germany', 'Ireland', 'Other'];

export const DEGREE_OPTIONS = [
  { value: 'MBA', label: 'MBA (Master of Business Administration)' },
  { value: 'MS', label: 'MS (Master of Science)' },
  { value: 'MTech', label: 'M.Tech (Master of Technology)' },
  { value: 'BBA', label: 'BBA (Bachelor of Business Administration)' },
  { value: 'BTech', label: 'B.Tech (Bachelor of Technology)' },
  { value: 'Other', label: 'Other' },
];

// Which entrance/standardized tests apply to each target degree.
export const DEGREE_TEST_TYPES = {
  MBA: ['CAT', 'XAT', 'GMAT', 'GRE', 'CMAT', 'NMAT'],
  MS: ['GRE', 'GMAT'],
  MTech: ['GATE', 'JEE'],
  BBA: ['CUET', 'IPMAT'],
  BTech: ['JEE', 'BITSAT', 'VITEEE', 'SAT'],
  Other: ['CAT', 'GATE', 'JEE', 'GMAT', 'GRE', 'SAT', 'Other'],
};

// Shown only when the target country isn't India.
export const ENGLISH_PROFICIENCY_TESTS = ['IELTS', 'TOEFL', 'PTE', 'Duolingo'];
