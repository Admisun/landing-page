"use client";

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import styles from './dashboard.module.css';
import { 
  FileText, Calendar, Clock, BarChart3, 
  ArrowRight, FileSpreadsheet, PlusCircle, User,
  Briefcase, GraduationCap, MapPin, DollarSign, CheckCircle2, AlertTriangle, Loader2
} from 'lucide-react';

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  
  // Resume state
  const [parsedResume, setParsedResume] = useState(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [resumeError, setResumeError] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    withResume: 0
  });

  // Fetch submissions
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
        let completedCount = 0;
        let resumeCount = 0;

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          docs.push({
            id: docSnap.id,
            ...data
          });

          if (data.status === 'completed') {
            completedCount++;
          }
          if (data.hasResume || data.resumeId) {
            resumeCount++;
          }
        });

        setSubmissions(docs);
        setStats({
          total: docs.length,
          completed: completedCount,
          withResume: resumeCount
        });

        // Set initial selected submission
        if (docs.length > 0) {
          const initial = selectedId 
            ? docs.find(d => d.id === selectedId) || docs[0]
            : docs[0];
          setSelectedSubmission(initial);
        }
      } catch (err) {
        console.error("Error fetching submissions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [user, selectedId]);

  // Handle selecting a submission
  const handleSelectSubmission = (sub) => {
    setSelectedSubmission(sub);
    router.push(`/dashboard?id=${sub.id}`);
  };

  // Fetch resume details if submission has resumeId
  useEffect(() => {
    const fetchResume = async () => {
      if (!selectedSubmission || !selectedSubmission.resumeId) {
        setParsedResume(null);
        setResumeError('');
        return;
      }

      setLoadingResume(true);
      setResumeError('');
      try {
        const resumeRef = doc(db, 'parsed_resumes', selectedSubmission.resumeId);
        const resumeSnap = await getDoc(resumeRef);
        if (resumeSnap.exists()) {
          setParsedResume(resumeSnap.data());
        } else {
          setResumeError('Parsed resume details could not be found.');
          setParsedResume(null);
        }
      } catch (err) {
        console.error('Error fetching resume details:', err);
        setResumeError('Error loading resume details.');
        setParsedResume(null);
      } finally {
        setLoadingResume(false);
      }
    };

    fetchResume();
  }, [selectedSubmission]);

  return (
    <ProtectedRoute>
      <div className={styles.dashboardContainer}>
        <div className="container">
          {/* Header */}
          <div className={styles.dashboardHeader}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 className={styles.greeting}>Welcome, {user?.displayName || user?.email}</h1>
                <p className={styles.greetingSub}>Track and review your submitted admission evaluations and parsed document data.</p>
              </div>
              <Link href="/#admission-calculator" className="btn btn-primary" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                <PlusCircle size={18} />
                Submit Another Application
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={`${styles.statIconWrapper} ${styles.statIconBlue}`}>
                <FileText size={24} />
              </div>
              <div>
                <div className={styles.statValue}>{stats.total}</div>
                <div className={styles.statLabel}>Total Evaluations</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIconWrapper} ${styles.statIconGreen}`}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className={styles.statValue}>{stats.completed}</div>
                <div className={styles.statLabel}>Processed</div>
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

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 1rem', color: 'var(--primary)' }} />
              <p>Loading reports...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText size={48} className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>No evaluations submitted yet</h3>
              <p className={styles.emptySub}>Fill out the Admission Calculator on the home page to get started.</p>
              <Link href="/#admission-calculator" className="btn btn-primary">
                Get Started
              </Link>
            </div>
          ) : (
            <div className={styles.dashboardLayout}>
              {/* Left Column: Submissions List */}
              <div className={styles.sidebar}>
                <h3 className={styles.columnTitle}>Your Submissions</h3>
                <div className={styles.sidebarList}>
                  {submissions.map((sub) => {
                    const date = sub.createdAt ? new Date(sub.createdAt.seconds * 1000).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }) : 'Just now';

                    const isSelected = selectedSubmission?.id === sub.id;

                    return (
                      <div 
                        key={sub.id} 
                        className={`${styles.sidebarItem} ${isSelected ? styles.sidebarItemActive : ''}`}
                        onClick={() => handleSelectSubmission(sub)}
                      >
                        <div className={styles.sidebarItemHeader}>
                          <span className={styles.sidebarItemTitle}>
                            {sub.targetDegree ? `${sub.targetDegree} Evaluation` : 'Profile Evaluation'}
                          </span>
                          <span className={styles.sidebarItemDate}>{date}</span>
                        </div>
                        <div className={styles.sidebarItemMeta}>
                          {sub.targetCountry && (
                            <span className={styles.sidebarMetaTag}>{sub.targetCountry}</span>
                          )}
                          <span className={`${styles.statusBadge} ${sub.status === 'completed' ? styles.statusBadgeCompleted : sub.status === 'failed' ? styles.statusBadgeFailed : styles.statusBadgePending}`}>
                            {sub.status || 'pending'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Detailed View */}
              <div className={styles.mainContent}>
                {selectedSubmission && (
                  <div className={styles.detailCard}>
                    <div className={styles.detailCardHeader}>
                      <div>
                        <h2 className={styles.detailTitle}>
                          {selectedSubmission.targetDegree ? `${selectedSubmission.targetDegree} Submission Details` : 'Evaluation Details'}
                        </h2>
                        <p className={styles.detailSubtitle}>
                          Submitted on {selectedSubmission.createdAt ? new Date(selectedSubmission.createdAt.seconds * 1000).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          }) : 'Just now'}
                        </p>
                      </div>
                      <span className={`${styles.statusBadgeLarge} ${selectedSubmission.status === 'completed' ? styles.statusBadgeCompleted : selectedSubmission.status === 'failed' ? styles.statusBadgeFailed : styles.statusBadgePending}`}>
                        Status: {selectedSubmission.status || 'pending'}
                      </span>
                    </div>

                    {/* Basic Submission Fields Grid */}
                    <div className={styles.detailGrid}>
                      {selectedSubmission.targetDegree && (
                        <div className={styles.gridField}>
                          <div className={styles.fieldLabel}>Target Degree</div>
                          <div className={styles.fieldValue}>{selectedSubmission.targetDegree}</div>
                        </div>
                      )}

                      {selectedSubmission.targetCountry && (
                        <div className={styles.gridField}>
                          <div className={styles.fieldLabel}>Target Country</div>
                          <div className={styles.fieldValue}>{selectedSubmission.targetCountry}</div>
                        </div>
                      )}

                      {selectedSubmission.preferredUniversities && (
                        <div className={styles.gridField} style={{ gridColumn: '1 / -1' }}>
                          <div className={styles.fieldLabel}>Preferred Universities</div>
                          <div className={styles.fieldValue}>{selectedSubmission.preferredUniversities}</div>
                        </div>
                      )}

                      {selectedSubmission.preferredCities && (
                        <div className={styles.gridField} style={{ gridColumn: '1 / -1' }}>
                          <div className={styles.fieldLabel}>Preferred Cities</div>
                          <div className={styles.fieldValue}>{selectedSubmission.preferredCities}</div>
                        </div>
                      )}

                      {selectedSubmission.graduationScore !== undefined && selectedSubmission.graduationScore !== null && (
                        <div className={styles.gridField}>
                          <div className={styles.fieldLabel}>Academic Percentage (UG)</div>
                          <div className={styles.fieldValue}>{selectedSubmission.graduationScore}%</div>
                        </div>
                      )}

                      {selectedSubmission.testScore && (
                        <div className={styles.gridField}>
                          <div className={styles.fieldLabel}>Test Score (CAT/GMAT/GRE)</div>
                          <div className={styles.fieldValue}>{selectedSubmission.testScore}</div>
                        </div>
                      )}

                      {selectedSubmission.budget && (
                        <div className={styles.gridField}>
                          <div className={styles.fieldLabel}>Budget Tier</div>
                          <div className={styles.fieldValue}>
                            {selectedSubmission.budget === 'under10' ? 'Under 10 Lakhs' :
                             selectedSubmission.budget === '10to20' ? '10 - 20 Lakhs' :
                             selectedSubmission.budget === '20to30' ? '20 - 30 Lakhs' :
                             selectedSubmission.budget === 'above30' ? 'Above 30 Lakhs' :
                             selectedSubmission.budget}
                          </div>
                        </div>
                      )}

                      {selectedSubmission.workExperience && (
                        <div className={styles.gridField}>
                          <div className={styles.fieldLabel}>Work Experience</div>
                          <div className={styles.fieldValue}>
                            {selectedSubmission.workExperience === '0' ? 'Fresher (0 years)' :
                             selectedSubmission.workExperience === '1to3' ? '1 - 3 years' :
                             selectedSubmission.workExperience === '3to5' ? '3 - 5 years' :
                             selectedSubmission.workExperience === '5plus' ? '5+ years' :
                             selectedSubmission.workExperience}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resume Information Section */}
                    <div className={styles.resumeInfoWrapper}>
                      <h3 className={styles.sectionHeaderTitle}>Parsed Resume Details</h3>

                      {selectedSubmission.status === 'pending' && (
                        <div className={styles.infoAlertPending}>
                          <Clock size={16} />
                          <span>Resume parsing is currently in progress. Please check back in a few moments.</span>
                        </div>
                      )}

                      {selectedSubmission.status === 'failed' && (
                        <div className={styles.infoAlertFailed}>
                          <AlertTriangle size={16} />
                          <span>Resume parsing failed: {selectedSubmission.parseError || 'An error occurred during parsing.'}</span>
                        </div>
                      )}

                      {!selectedSubmission.hasResume && !selectedSubmission.resumeId && (
                        <p className={styles.noResumeText}>No resume document was submitted with this application evaluation.</p>
                      )}

                      {loadingResume && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem' }}>
                          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                          <span>Loading parsed resume data...</span>
                        </div>
                      )}

                      {resumeError && (
                        <p style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>{resumeError}</p>
                      )}

                      {!loadingResume && parsedResume && (
                        <div className={styles.resumeDetails}>
                          {/* Personal Info */}
                          {parsedResume.personalInfo && (
                            <div className={styles.resumeBlock}>
                              <h4 className={styles.blockTitle}><User size={14} /> Personal Information</h4>
                              <div className={styles.blockGrid}>
                                {parsedResume.personalInfo.name && (
                                  <div>
                                    <span className={styles.blockLabel}>Name:</span> {parsedResume.personalInfo.name}
                                  </div>
                                )}
                                {parsedResume.personalInfo.email && (
                                  <div>
                                    <span className={styles.blockLabel}>Email:</span> {parsedResume.personalInfo.email}
                                  </div>
                                )}
                                {parsedResume.personalInfo.phone && (
                                  <div>
                                    <span className={styles.blockLabel}>Phone:</span> {parsedResume.personalInfo.phone}
                                  </div>
                                )}
                                {parsedResume.personalInfo.location && (
                                  <div>
                                    <span className={styles.blockLabel}>Location:</span> {parsedResume.personalInfo.location}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Education */}
                          {parsedResume.education && parsedResume.education.length > 0 && (
                            <div className={styles.resumeBlock}>
                              <h4 className={styles.blockTitle}><GraduationCap size={14} /> Education</h4>
                              <div className={styles.blockList}>
                                {parsedResume.education.map((edu, idx) => (
                                  <div key={idx} className={styles.blockItem}>
                                    <div className={styles.blockItemHeader}>
                                      <strong>{edu.degree || 'Degree'}</strong> {edu.major ? `in ${edu.major}` : ''}
                                    </div>
                                    <div className={styles.blockItemSub}>
                                      {edu.institution || 'Institution'} {edu.graduationYear ? `(${edu.graduationYear})` : ''}
                                    </div>
                                    {edu.gpa && <div className={styles.blockItemMeta}>GPA / Score: {edu.gpa}</div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Experience */}
                          {parsedResume.experience && parsedResume.experience.length > 0 && (
                            <div className={styles.resumeBlock}>
                              <h4 className={styles.blockTitle}><Briefcase size={14} /> Work Experience</h4>
                              <div className={styles.blockList}>
                                {parsedResume.experience.map((exp, idx) => (
                                  <div key={idx} className={styles.blockItem}>
                                    <div className={styles.blockItemHeader}>
                                      <strong>{exp.role || 'Role'}</strong> {exp.company ? `at ${exp.company}` : ''}
                                    </div>
                                    {exp.startDate && (
                                      <div className={styles.blockItemSub}>
                                        {exp.startDate} - {exp.endDate || 'Present'}
                                      </div>
                                    )}
                                    {exp.description && <p className={styles.blockItemDescription}>{exp.description}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Skills */}
                          {parsedResume.skills && parsedResume.skills.length > 0 && (
                            <div className={styles.resumeBlock}>
                              <h4 className={styles.blockTitle}>Skills</h4>
                              <div className={styles.tagsContainer}>
                                {parsedResume.skills.map((skill, idx) => (
                                  <span key={idx} className={styles.skillTag}>{skill}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Projects */}
                          {parsedResume.projects && parsedResume.projects.length > 0 && (
                            <div className={styles.resumeBlock}>
                              <h4 className={styles.blockTitle}>Projects</h4>
                              <div className={styles.blockList}>
                                {parsedResume.projects.map((proj, idx) => (
                                  <div key={idx} className={styles.blockItem}>
                                    <strong>{proj.name}</strong>
                                    {proj.description && <p className={styles.blockItemDescription}>{proj.description}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Certifications */}
                          {parsedResume.certifications && parsedResume.certifications.length > 0 && (
                            <div className={styles.resumeBlock}>
                              <h4 className={styles.blockTitle}>Certifications</h4>
                              <ul className={styles.bulletList}>
                                {parsedResume.certifications.map((cert, idx) => (
                                  <li key={idx}>{cert}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Achievements */}
                          {parsedResume.achievements && parsedResume.achievements.length > 0 && (
                            <div className={styles.resumeBlock}>
                              <h4 className={styles.blockTitle}>Achievements</h4>
                              <ul className={styles.bulletList}>
                                {parsedResume.achievements.map((ach, idx) => (
                                  <li key={idx}>{ach}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary)' }} />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}