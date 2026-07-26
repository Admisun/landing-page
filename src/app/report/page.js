"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import styles from './report.module.css';
import { 
  Loader2, Sparkles, CheckCircle2, AlertTriangle, 
  GraduationCap, TrendingUp, Briefcase, ArrowRight, 
  Target
} from 'lucide-react';

function ReportPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Invalid Report Link.');
      setLoading(false);
      return;
    }

    const docRef = doc(db, "admission_submissions", id);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        setError('Report not found.');
        setLoading(false);
        return;
      }

      const data = docSnap.data();

      // Check ownership
      if (data.uid !== "anonymous" && user && data.uid !== user.uid) {
        setError('You do not have permission to view this report.');
        setLoading(false);
        return;
      }

      setSubmission(data);

      if (data.status === 'completed' && data.report) {
        setReport(data.report);
        setLoading(false);
        setGenerating(false);
      } else if (data.status === 'pending') {
        setLoading(false);
        setGenerating(true);
      } else if (data.status === 'failed') {
        setError(data.resume?.parseError || data.parseError || 'Failed to generate report.');
        setLoading(false);
        setGenerating(false);
      }
    }, (err) => {
      console.error("onSnapshot error:", err);
      setError('Something went wrong loading this report.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, user]);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={40} className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Loading your report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <AlertTriangle size={48} style={{ color: 'var(--accent)' }} />
        <h2>{error}</h2>
        <p>The report you are looking for may not exist or you may not have access.</p>
        <Link href="/" className="btn btn-primary">Go Home</Link>
      </div>
    );
  }

  if (generating) {
    return (
      <div className={styles.loadingState}>
        <Sparkles size={48} style={{ color: 'var(--primary)' }} />
        <p className={styles.loadingText}>AI is analyzing your profile...</p>
        <p className={styles.loadingSub}>This usually takes a few seconds. We're crunching thousands of data points.</p>
        <Loader2 size={24} className={styles.loadingSpinner} />
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className={styles.reportContainer}>
      <div className="container">
        {/* Header */}
        <div className={styles.reportHeader}>
          <div className={styles.reportBadge}>
            <Sparkles size={14} />
            AI-Generated Report
          </div>
          <h1 className={styles.reportTitle}>Your Admission Intelligence Report</h1>
          <p className={styles.reportDate}>
            Generated on {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Score Card */}
        <div className={styles.scoreCard}>
          <p className={styles.scoreLabel}>Overall Admission Score</p>
          <p className={styles.scoreValue}>
            {report.overallScore}<span className={styles.scoreUnit}>/100</span>
          </p>
          <p className={styles.scoreSummary}>{report.summary}</p>
        </div>

        {/* Strengths & Improvements Grid */}
        <div className={styles.reportGrid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.cardIconWrapper} ${styles.cardIconGreen}`}>
                <CheckCircle2 size={18} />
              </div>
              <h3 className={styles.cardTitle}>Your Strengths</h3>
            </div>
            {report.strengths?.map((item, i) => (
              <div key={i} className={styles.listItem}>
                <CheckCircle2 size={16} className={`${styles.listBullet} ${styles.bulletGreen}`} />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.cardIconWrapper} ${styles.cardIconAmber}`}>
                <TrendingUp size={18} />
              </div>
              <h3 className={styles.cardTitle}>Areas to Improve</h3>
            </div>
            {report.improvements?.map((item, i) => (
              <div key={i} className={styles.listItem}>
                <AlertTriangle size={16} className={`${styles.listBullet} ${styles.bulletAmber}`} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Colleges */}
        <div className={`${styles.card} ${styles.collegesCard}`} style={{ marginBottom: '1.5rem' }}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIconWrapper} ${styles.cardIconPurple}`}>
              <GraduationCap size={18} />
            </div>
            <h3 className={styles.cardTitle}>Recommended Colleges</h3>
          </div>
          {report.recommendedColleges?.map((college, i) => (
            <div key={i} className={styles.collegeRow}>
              <span className={styles.collegeName}>{college.name}</span>
              <span className={styles.collegeTier}>{college.tier}</span>
              <div className={styles.chanceBar}>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${college.chance}%` }}></div>
                </div>
                <span className={styles.chancePercent}>{college.chance}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Career Outlook */}
        <div className={`${styles.card} ${styles.careerCard}`} style={{ marginBottom: '1.5rem' }}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIconWrapper} ${styles.cardIconBlue}`}>
              <Briefcase size={18} />
            </div>
            <h3 className={styles.cardTitle}>Career Outlook</h3>
          </div>
          <div className={styles.careerGrid}>
            <div className={styles.careerStat}>
              <div className={styles.careerStatValue}>{report.careerOutlook?.avgSalary}</div>
              <div className={styles.careerStatLabel}>Average Salary</div>
            </div>
            <div className={styles.careerStat}>
              <div className={styles.careerStatValue}>{report.careerOutlook?.placementRate}</div>
              <div className={styles.careerStatLabel}>Placement Rate</div>
            </div>
            <div className={styles.careerStat}>
              <div className={styles.careerStatLabel} style={{ marginBottom: '0.5rem', fontWeight: 600, color: 'var(--foreground)' }}>Top Recruiters</div>
              <div className={styles.recruiterTags}>
                {report.careerOutlook?.topRecruiters?.map((r, i) => (
                  <span key={i} className={styles.recruiterTag}>{r}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className={styles.card} style={{ marginBottom: '2rem' }}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIconWrapper} ${styles.cardIconBlue}`}>
              <Target size={18} />
            </div>
            <h3 className={styles.cardTitle}>Recommended Next Steps</h3>
          </div>
          {report.nextSteps?.map((step, i) => (
            <div key={i} className={styles.listItem}>
              <ArrowRight size={16} className={`${styles.listBullet} ${styles.bulletBlue}`} />
              <span>{step}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={styles.ctaSection}>
          <h3 className={styles.ctaTitle}>Ready to take the next step?</h3>
          <p className={styles.ctaSub}>Create a detailed profile to unlock even more personalized recommendations.</p>
          <div className={styles.ctaButtons}>
            <Link href="/dashboard" className="btn btn-primary">
              Go to Dashboard <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
            </Link>
            <Link href="/" className="btn btn-secondary">
              Generate Another Report
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className={styles.loadingState}>
        <Loader2 size={40} className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Initializing...</p>
      </div>
    }>
      <ReportPageContent />
    </Suspense>
  );
}
