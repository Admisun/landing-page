"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import styles from './dashboard.module.css';
import { 
  FileText, Calendar, Clock, BarChart3, 
  ArrowRight, FileSpreadsheet, PlusCircle, User
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    highestScore: 0,
    withResume: 0
  });

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!user) return;
      
      try {
        const q = query(
          collection(db, "admission_submissions"),
          where("uid", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        const docs = [];
        let maxScore = 0;
        let resumeCount = 0;

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          docs.push({
            id: docSnap.id,
            ...data
          });

          if (data.report && data.report.overallScore > maxScore) {
            maxScore = data.report.overallScore;
          }
          if (data.hasResume || data.resume) {
            resumeCount++;
          }
        });

        setSubmissions(docs);
        setStats({
          total: docs.length,
          highestScore: maxScore,
          withResume: resumeCount
        });
      } catch (err) {
        console.error("Error fetching submissions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [user]);

  return (
    <ProtectedRoute>
      <div className={styles.dashboardContainer}>
        <div className="container">
          {/* Header */}
          <div className={styles.dashboardHeader}>
            <h1 className={styles.greeting}>Welcome back, {user?.displayName || user?.email}</h1>
            <p className={styles.greetingSub}>Track your university admission feasibility reports and application documents.</p>
          </div>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={`${styles.statIconWrapper} ${styles.statIconBlue}`}>
                <FileText size={24} />
              </div>
              <div>
                <div className={styles.statValue}>{stats.total}</div>
                <div className={styles.statLabel}>Total Reports</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIconWrapper} ${styles.statIconGreen}`}>
                <BarChart3 size={24} />
              </div>
              <div>
                <div className={styles.statValue}>{stats.highestScore > 0 ? `${stats.highestScore}/100` : 'N/A'}</div>
                <div className={styles.statLabel}>Highest Score</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIconWrapper} ${styles.statIconPurple}`}>
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <div className={styles.statValue}>{stats.withResume}</div>
                <div className={styles.statLabel}>Resumes Uploaded</div>
              </div>
            </div>
          </div>

          {/* Submissions Section */}
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your Admission Reports</h2>
            <Link href="/#admission-calculator" className="btn btn-secondary" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
              <PlusCircle size={16} />
              New Calculation
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p>Loading reports...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText size={48} className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>No reports generated yet</h3>
              <p className={styles.emptySub}>Fill out the Admission Calculator on the home page to get your first AI-powered report.</p>
              <Link href="/#admission-calculator" className="btn btn-primary">
                Get Started
              </Link>
            </div>
          ) : (
            <div className={styles.submissionsList}>
              {submissions.map((sub) => {
                const date = sub.createdAt ? new Date(sub.createdAt.seconds * 1000).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                }) : 'Just now';

                return (
                  <Link href={`/report/${sub.id}`} key={sub.id} className={styles.submissionCard}>
                    <div className={styles.submissionInfo}>
                      <div className={styles.submissionTitle}>
                        {sub.preferredCities ? `Profile Evaluation for ${sub.preferredCities}` : 'Admission Evaluation'}
                      </div>
                      <div className={styles.submissionMeta}>
                        <span className={styles.submissionDate}>
                          <Calendar size={12} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                          {date}
                        </span>
                        {sub.testScore && (
                          <span className={styles.metaTag}>Score: {sub.testScore}</span>
                        )}
                        {sub.graduationScore && (
                          <span className={styles.metaTag}>UG: {sub.graduationScore}%</span>
                        )}
                        {sub.hasResume && (
                          <span className={`${styles.metaTag} ${sub.resume?.parseStatus === 'completed' ? styles.statusCompleted : styles.statusPending}`}>
                            Resume: {sub.resume?.parseStatus || 'processing'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {sub.report && (
                      <div className={styles.submissionScore}>
                        <div className={styles.scoreCircle}>{sub.report.overallScore}</div>
                        <div className={styles.scoreLabel}>Chances</div>
                      </div>
                    )}
                    
                    <ArrowRight size={20} className={styles.submissionArrow} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
