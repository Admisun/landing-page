"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import styles from './AdmissionCalculator.module.css';
import { Calculator, ChevronRight, Loader2, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { saveAdmissionSubmission } from '@/lib/firebase/submissions';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

import { uploadResume, validateResumeFile } from '@/lib/firebase/storage';
import { useAuth } from '@/context/AuthContext';
import { COUNTRIES, DEGREE_OPTIONS, DEGREE_TEST_TYPES, ENGLISH_PROFICIENCY_TESTS } from '@/lib/formOptions';
import { buildPrefillFromParsedResume } from '@/lib/resumePrefill';
import UniversityCombobox from './UniversityCombobox';

const DEFAULT_VALUES = {
  undergraduate: { institution: '', degree: '', score: '', year: '' },
  postgraduate: { institution: '', degree: '', score: '', year: '' },
  testType: '',
  testScore: '',
  englishTestType: '',
  englishTestScore: '',
  targetDegree: '',
  targetCountry: '',
  preferredUniversities: [],
  preferredCities: '',
  budget: '',
  workExperience: '',
};

export default function AdmissionCalculator({ hidePrevious }) {
  const { register, handleSubmit, reset, watch, setValue, getValues, control, formState: { errors } } = useForm({
    defaultValues: DEFAULT_VALUES,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeError, setResumeError] = useState('');
  const [resumeMeta, setResumeMeta] = useState(null); // {downloadUrl, storagePath, fileName, ...}
  const [resumeParseStatus, setResumeParseStatus] = useState('idle'); // idle | parsing | success | error
  const [showPostgraduate, setShowPostgraduate] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const draftIdRef = useRef(null);

  const watchedDegree = watch('targetDegree');
  const watchedCountry = watch('targetCountry');
  const testTypeOptions = DEGREE_TEST_TYPES[watchedDegree] || [];

  // Pre-populate the form with the user's most recent submission, if any,
  // so re-attempting doesn't mean starting from scratch.
  useEffect(() => {
    if (!user) return;
    const fetchLatestSubmission = async () => {
      try {
        const q = query(
          collection(db, 'admission_submissions'),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const latest = snapshot.docs[0].data();
        reset({
          ...DEFAULT_VALUES,
          ...latest,
          undergraduate: latest.undergraduate || DEFAULT_VALUES.undergraduate,
          postgraduate: latest.postgraduate || DEFAULT_VALUES.postgraduate,
          preferredUniversities: Array.isArray(latest.preferredUniversities) ? latest.preferredUniversities : [],
        });

        if (latest.postgraduate?.institution || latest.postgraduate?.degree) {
          setShowPostgraduate(true);
        }
      } catch (err) {
        console.error('Error fetching latest submission for pre-fill:', err);
      }
    };
    fetchLatestSubmission();
  }, [user, reset]);

  // Clear a stale test type when it no longer applies to the selected degree.
  useEffect(() => {
    const currentTestType = getValues('testType');
    if (currentTestType && !testTypeOptions.includes(currentTestType)) {
      setValue('testType', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedDegree]);

  // Clear English proficiency fields when the target country reverts to India/empty.
  useEffect(() => {
    if (!watchedCountry || watchedCountry === 'India') {
      setValue('englishTestType', '');
      setValue('englishTestScore', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCountry]);

  const applyPrefillGuarded = useCallback((path, prefillValue) => {
    if (prefillValue === undefined || prefillValue === null || prefillValue === '') return;
    const current = getValues(path);
    if (!current) setValue(path, prefillValue);
  }, [getValues, setValue]);

  const handleResumeFileChange = useCallback(async (file) => {
    setResumeFile(file);
    setResumeError('');
    setResumeParseStatus('idle');
    if (!file) return;

    try {
      validateResumeFile(file);
    } catch (err) {
      setResumeError(err.message);
      return;
    }

    if (!draftIdRef.current) {
      draftIdRef.current = crypto.randomUUID();
    }

    setResumeParseStatus('parsing');
    try {
      const uploadResult = await uploadResume(file, draftIdRef.current, user);
      setResumeMeta(uploadResult);

      const res = await fetch('/api/ai/parse-resume-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadUrl: uploadResult.downloadUrl }),
      });
      if (!res.ok) throw new Error('Failed to parse resume');
      const { parsedData } = await res.json();

      const prefill = buildPrefillFromParsedResume(parsedData);

      if (prefill.undergraduate) {
        applyPrefillGuarded('undergraduate.institution', prefill.undergraduate.institution);
        applyPrefillGuarded('undergraduate.degree', prefill.undergraduate.degree);
        applyPrefillGuarded('undergraduate.score', prefill.undergraduate.score);
        applyPrefillGuarded('undergraduate.year', prefill.undergraduate.year);
      }
      if (prefill.postgraduate) {
        setShowPostgraduate(true);
        applyPrefillGuarded('postgraduate.institution', prefill.postgraduate.institution);
        applyPrefillGuarded('postgraduate.degree', prefill.postgraduate.degree);
        applyPrefillGuarded('postgraduate.score', prefill.postgraduate.score);
        applyPrefillGuarded('postgraduate.year', prefill.postgraduate.year);
      }
      applyPrefillGuarded('workExperience', prefill.workExperience);

      setResumeParseStatus('success');
    } catch (err) {
      console.error('Resume pre-fill parsing failed:', err);
      setResumeParseStatus('error');
    }
  }, [user, applyPrefillGuarded]);

      
const onSubmit = async (data) => {
  setIsSubmitting(true);
  setStatusMsg('');

  if (!resumeFile) {
    setResumeError('Please upload your resume before generating the report.');
    setIsSubmitting(false);
    return;
  }  
    try {

      const submissionData = {
        ...data,
        postgraduate: showPostgraduate ? data.postgraduate : null,
      };

      const submissionId = await saveAdmissionSubmission(submissionData, user, !!resumeFile);

      if (resumeFile && resumeMeta) {
        setStatusMsg('Analyzing your resume...');
        try {
          await fetch('/api/ai/parse-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissionId, downloadUrl: resumeMeta.downloadUrl }),
          });
        } catch (parseErr) {
          console.error('Post-submit resume parse/report generation failed:', parseErr);
        }
      }

      // Google Analytics Event Tracking
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'generate_admission_report', {
          event_category: 'engagement',
          budget_tier: data.budget,
          experience_tier: data.workExperience,
        });
      }

      reset(DEFAULT_VALUES);
      setResumeFile(null);
      setResumeMeta(null);
      setResumeParseStatus('idle');
      setShowPostgraduate(false);
      draftIdRef.current = null;

      router.push(`/dashboard?id=${submissionId}`);
    } catch (error) {
      console.error("Error adding document: ", error);
      setStatusMsg('There was an error submitting your request. Please try again.');
    }

    setIsSubmitting(false);
  };

  return (
    <section id="admission-calculator" className={`section ${styles.calculatorSection}`}>
      <div className="container">

        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <Calculator className={styles.icon} size={24} />
          </div>
          <h2 className={styles.title}>Interactive Admission Calculator</h2>
          <p className={styles.subtitle}>
            Enter your details below to generate a data-driven admission report and discover your chances.
          </p>
        </div>
        <div className={styles.calculatorCard}>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>

            {/* Resume upload — first, so it can pre-fill the rest of the form */}
            <div className={styles.subsection}>
              <div className={styles.formGroup}>
                <label>Resume *</label>
                <div className={styles.fileInputWrapper}>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    required
                   onChange={(e) => handleResumeFileChange(e.target.files?.[0] || null)}
                    className={styles.fileInput}
                    id="resume-upload"
                  />
                  <label htmlFor="resume-upload" className={styles.fileLabel}>
                    <Upload size={18} />
                    {resumeFile ? resumeFile.name : 'Choose PDF or image (max 5 MB)'}
                  </label>
                </div>
                {resumeError && <p className={styles.fileError}>{resumeError}</p>}
                {resumeParseStatus === 'parsing' && (
                  <p className={styles.parseStatus}><Loader2 size={14} className={styles.spinner} /> Reading your resume to pre-fill the form...</p>
                )}
                {resumeParseStatus === 'success' && (
                  <p className={`${styles.parseStatus} ${styles.parseStatusSuccess}`}><CheckCircle2 size={14} /> We pre-filled what we could find below — please review it.</p>
                )}
                {resumeParseStatus === 'error' && (
                  <p className={`${styles.parseStatus} ${styles.parseStatusError}`}><AlertCircle size={14} /> Couldn&apos;t auto-read this resume. No problem — just fill the fields below manually.</p>
                )}
                {resumeParseStatus === 'idle' && !resumeError && (
                  <p className={styles.fileHint}>We&apos;ll extract your education and experience to pre-fill this form.</p>
                )}
              </div>
            </div>

            {/* Undergraduate */}
            <div className={styles.subsection}>
              <div className={styles.subsectionHeader}>
                <span className={styles.subsectionTitle}>Graduation (Undergraduate)</span>
              </div>
              <div className={styles.subGrid}>
                <div className={styles.formGroup}>
                  <label>Institution *</label>
                  <input type="text" placeholder="e.g. Delhi University" {...register('undergraduate.institution', { required: 'Institution is required' })} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Degree / Program *</label>
                  <input type="text" placeholder="e.g. B.Tech Computer Science" {...register('undergraduate.degree', { required: 'Degree / Program is required' })} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Percentage or CGPA</label>
                  <input type="number" step="0.01" placeholder="e.g. 85 or 8.5" {...register('undergraduate.score', { required: 'Percentage or CGPA is required' })} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Year of Completion *</label>
                  <input type="number" placeholder="e.g. 2023" {...register('undergraduate.year', { required: 'Year of completion is required' })} className={styles.input} />
                </div>
              </div>
            </div>

            {/* Post-Graduate */}
            <div className={styles.subsection}>
              <div className={styles.subsectionHeader}>
                <span className={styles.subsectionTitle}>Post-Graduation</span>
                <button
                  type="button"
                  className={styles.subsectionToggle}
                  onClick={() => setShowPostgraduate(s => !s)}
                >
                  {showPostgraduate ? '− Remove' : '+ Add Post-Graduation details'}
                </button>
              </div>
              {showPostgraduate && (
                <div className={styles.subGrid}>
                  <div className={styles.formGroup}>
                    <label>Institution *</label>
                    <input type="text" placeholder="e.g. IIM Bangalore" {...register('postgraduate.institution')} className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Degree / Program *</label>
                    <input type="text" placeholder="e.g. MBA Finance" {...register('postgraduate.degree')} className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Percentage or CGPA</label>
                    <input type="number" step="0.01" placeholder="e.g. 75 or 3.7" {...register('postgraduate.score')} className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Year of Completion *</label>
                    <input type="number" placeholder="e.g. 2025" {...register('postgraduate.year')} className={styles.input} />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Target Degree *</label>
                <select {...register('targetDegree', { required: 'Target degree is required' })} className={styles.input}>
                  <option value="">Select Degree</option>
                  {DEGREE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.targetDegree && <p className={styles.fileError}>{errors.targetDegree.message}</p>}
              </div>

              <div className={styles.formGroup}>
                <label>Target Country *</label>
                <select {...register('targetCountry', { required: 'Target country is required' })} className={styles.input}>
                  <option value="">Select Country</option>
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.targetCountry && <p className={styles.fileError}>{errors.targetCountry.message}</p>}
              </div>

              <div className={styles.formGroup}>
                <label>Test Type</label>
                <select {...register('testType')} className={styles.input} disabled={!watchedDegree}>
                  <option value="">{watchedDegree ? 'Select Test' : 'Select target degree first'}</option>
                  {testTypeOptions.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Score / Percentile</label>
                <input type="text" placeholder="e.g. 99%ile or 720" {...register('testScore')} className={styles.input} />
              </div>

              {watchedCountry && watchedCountry !== 'India' && (
                <>
                  <div className={styles.formGroup}>
                    <label>English Proficiency Test</label>
                    <select {...register('englishTestType')} className={styles.input}>
                      <option value="">Select Test</option>
                      {ENGLISH_PROFICIENCY_TESTS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>English Test Score</label>
                    <input type="text" placeholder="e.g. 7.5" {...register('englishTestScore')} className={styles.input} />
                  </div>
                </>
              )}

              <div className={styles.formGroup}>
                <label>Budget (Total) *</label>
                <select {...register('budget', { required: 'Budget is required' })} className={styles.input}>
                  <option value="">Select Budget</option>
                  <option value="under10">Under 10 Lakhs</option>
                  <option value="10to20">10 - 20 Lakhs</option>
                  <option value="20to30">20 - 30 Lakhs</option>
                  <option value="above30">Above 30 Lakhs</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Work Experience (Years) *</label>
                <select {...register('workExperience', { required: 'Work experience is required' })} className={styles.input}>
                  <option value="">Select Experience</option>
                  <option value="0">Fresher (0 years)</option>
                  <option value="1to3">1 - 3 years</option>
                  <option value="3to5">3 - 5 years</option>
                  <option value="5plus">5+ years</option>
                </select>
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label>Preferred Universities</label>
                <Controller
                  name="preferredUniversities"
                  control={control}
                  render={({ field }) => (
                    <UniversityCombobox
                      value={field.value}
                      onChange={field.onChange}
                      country={watchedCountry}
                      degreeType={watchedDegree}
                    />
                  )}
                />
                <p className={styles.hint}>Search our curated list, or type a school and add it as a custom entry.</p>
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label>Preferred Cities</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai, Delhi, Bangalore"
                  {...register('preferredCities')}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.submitContainer}>
              <button type="submit" disabled={isSubmitting} className={`btn btn-primary ${styles.submitBtn}`}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className={styles.spinner} />
                    Processing...
                  </>
                ) : (
                  <>
                    Generate My Admission Report
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
              {statusMsg && (
                <p className={styles.statusMsg} style={{ color: statusMsg.includes('error') ? 'var(--accent)' : 'var(--primary)', fontWeight: '500', marginTop: '0.5rem' }}>
                  {statusMsg}
                </p>
              )}
              <p className={styles.secureText}>🔒 Your data is secure and will only be used for analysis.</p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}