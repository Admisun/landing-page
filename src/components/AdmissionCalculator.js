"use client";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import styles from './AdmissionCalculator.module.css';
import { Calculator, ChevronRight, Loader2, Upload } from 'lucide-react';
import { saveAdmissionSubmission, updateSubmissionResume } from '@/lib/firebase/submissions';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
    

import { uploadResume, validateResumeFile } from '@/lib/firebase/storage';
import { useAuth } from '@/context/AuthContext';

export default function AdmissionCalculator({ hidePrevious }) {
  const { register, handleSubmit, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeError, setResumeError] = useState('');
  const { user } = useAuth();
  const router = useRouter();
  const [previousSubmissions, setPreviousSubmissions] = useState([]);

  useEffect(() => {
    if (!user) return;
    const fetchSubmissions = async () => {
      try {
        const q = query(collection(db, 'admission_submissions'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPreviousSubmissions(subs);
      } catch (err) {
        console.error('Error fetching submissions:', err);
      }
    };
    fetchSubmissions();
  }, [user]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setStatusMsg('');
    setResumeError('');

    if (resumeFile) {
      try {
        validateResumeFile(resumeFile);
      } catch (err) {
        setResumeError(err.message);
        setIsSubmitting(false);
        return;
      }
    }
    
    try {
      // First, save the admission submission (without resume data)
      const submissionId = await saveAdmissionSubmission(data, user, !!resumeFile);

      let parsedResume = null;
      if (resumeFile) {
        setStatusMsg('Uploading resume...');
        // Upload resume to Firebase Storage and get download URL
       const uploadResult = await uploadResume(resumeFile, submissionId, user);
        const downloadUrl = uploadResult.downloadUrl;

      // setStatusMsg('Parsing resume with Vertex AI...');

const parseResponse = await fetch(
  'https://us-central1-admisun.cloudfunctions.net/parseResume',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ submissionId })
  }
);

const result = await parseResponse.json();

if (!parseResponse.ok) {
  console.error('Resume parsing error:', result);
  setStatusMsg('Resume uploaded but parsing failed.');
} else if (result.pending) {
  console.warn('Resume parsing is still in progress.');
  setStatusMsg('Resume uploaded. Parsing is still in progress.');
} else {
  parsedResume = result.parsedData;
  console.log('Parsed resume data:', parsedResume);
}
      }

      // Google Analytics Event Tracking
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'generate_admission_report', {
          event_category: 'engagement',
          budget_tier: data.budget,
          experience_tier: data.workExperience
        });
      }

      reset();
      setResumeFile(null);

      if (user) {
        router.push(`/dashboard?id=${submissionId}`);
      } else {
        setStatusMsg('Report submitted! Sign in to view your personalized AI analysis.');
      }
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
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Test Score (CAT/GMAT/GRE)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 99%ile or 720"
                  {...register('testScore')} 
                  className={styles.input}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Graduation %</label>
                <input 
                  type="number" 
                  placeholder="e.g. 85"
                  {...register('graduationScore')} 
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Budget (Total)</label>
                <select {...register('budget')} className={styles.input}>
                  <option value="">Select Budget</option>
                  <option value="under10">Under 10 Lakhs</option>
                  <option value="10to20">10 - 20 Lakhs</option>
                  <option value="20to30">20 - 30 Lakhs</option>
                  <option value="above30">Above 30 Lakhs</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Work Experience (Years)</label>
                <select {...register('workExperience')} className={styles.input}>
                  <option value="">Select Experience</option>
                  <option value="0">Fresher (0 years)</option>
                  <option value="1to3">1 - 3 years</option>
                  <option value="3to5">3 - 5 years</option>
                  <option value="5plus">5+ years</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label>Target Degree</label>
                <select {...register('targetDegree')} className={styles.input}>
                  <option value="">Select Degree</option>
                  <option value="MBA">MBA (Master of Business Administration)</option>
                  <option value="MS">MS (Master of Science)</option>
                  <option value="MTech">M.Tech (Master of Technology)</option>
                  <option value="BBA">BBA (Bachelor of Business Administration)</option>
                  <option value="BTech">B.Tech (Bachelor of Technology)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Target Country</label>
                <select {...register('targetCountry')} className={styles.input}>
                  <option value="">Select Country</option>
                  <option value="India">India</option>
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                  <option value="Canada">Canada</option>
                  <option value="Germany">Germany</option>
                  <option value="Australia">Australia</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label>Preferred Universities</label>
                <input 
                  type="text" 
                  placeholder="e.g. Stanford University, Harvard, IIM Ahmedabad, IIT Bombay"
                  {...register('preferredUniversities')} 
                  className={styles.input}
                />
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

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label>Resume (Optional)</label>
                <div className={styles.fileInputWrapper}>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      setResumeFile(e.target.files?.[0] || null);
                      setResumeError('');
                    }}
                    className={styles.fileInput}
                    id="resume-upload"
                  />
                  <label htmlFor="resume-upload" className={styles.fileLabel}>
                    <Upload size={18} />
                    {resumeFile ? resumeFile.name : 'Choose PDF or image (max 5 MB)'}
                  </label>
                </div>
                {resumeError && (
                  <p className={styles.fileError}>{resumeError}</p>
                )}
                <p className={styles.fileHint}>We&apos;ll extract text from your resume to enrich your admission report.</p>
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