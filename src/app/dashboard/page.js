"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import styles from './dashboard.module.css';
import { 
  FileText, Calendar, Clock, BarChart3, 
  ArrowRight, FileSpreadsheet, PlusCircle, User,
  Briefcase, GraduationCap, MapPin, DollarSign, CheckCircle2, AlertTriangle, Loader2,
  Sparkles, RefreshCw, Lightbulb, TrendingUp, Building2, Award
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

  // Recommendation Generation state
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Fetch submissions
  useEffect(() => {
    let isMounted = true;

    const fetchSubmissions = async () => {
      setLoading(true);

      if (user) {
        try {
          const q = query(
            collection(db, "admission_submissions"),
            where("uid", "==", user.uid),
            orderBy("createdAt", "desc")
          );
          
          const querySnapshot = await getDocs(q);
          const docs = [];

          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            docs.push({
              id: docSnap.id,
              ...data
            });
          });

          if (!isMounted) return;

          setSubmissions(docs);

          // Set initial selected submission
          if (docs.length > 0) {
            const initial = selectedId 
              ? docs.find(d => d.id === selectedId) || docs[0]
              : docs[0];
            setSelectedSubmission(initial);
          } else {
            setSelectedSubmission(null);
          }
        } catch (err) {
          console.error("Error fetching submissions:", err);
        } finally {
          if (isMounted) setLoading(false);
        }
      } else {
        // Non-signed in / guest user flow
        if (selectedId) {
          try {
            const docRef = doc(db, "admission_submissions", selectedId);
            const docSnap = await getDoc(docRef);

            if (!isMounted) return;

            if (docSnap.exists()) {
              const subData = { id: docSnap.id, ...docSnap.data() };
              setSubmissions([subData]);
              setSelectedSubmission(subData);
            } else {
              setSubmissions([]);
              setSelectedSubmission(null);
            }
          } catch (err) {
            console.error("Error fetching guest submission:", err);
            if (isMounted) {
              setSubmissions([]);
              setSelectedSubmission(null);
            }
          } finally {
            if (isMounted) setLoading(false);
          }
        } else {
          setSubmissions([]);
          setSelectedSubmission(null);
          setLoading(false);
        }
      }
    };

    fetchSubmissions();

    return () => {
      isMounted = false;
    };
  }, [user, selectedId]);

  // Handle selecting a submission
  const handleSelectSubmission = (sub) => {
    setSelectedSubmission(sub);
    setGenerateError('');
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

  // Generate / Regenerate Recommendations
  const handleGenerateRecommendations = useCallback(async (targetSubmission) => {
    const target = targetSubmission || selectedSubmission;
    if (!target || !target.id) return;

    setGeneratingReport(true);
    setGenerateError('');

    try {
      let reportData = null;

      // 1. Try local API route
      try {
        const localRes = await fetch('/api/ai/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId: target.id })
        });
        if (localRes.ok) {
          const resJson = await localRes.json();
          reportData = resJson.data?.report || resJson.report;
        }
      } catch (localErr) {
        console.warn('Local /api/ai/report endpoint call skipped or failed, trying Cloud Function...', localErr);
      }

      // 2. Try Firebase Cloud Function HTTP endpoint
      if (!reportData) {
        const cloudRes = await fetch('https://us-central1-admisun.cloudfunctions.net/generateReportHttp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId: target.id })
        });

        if (cloudRes.ok) {
          const resJson = await cloudRes.json();
          reportData = resJson.report;
        } else {
          const errJson = await cloudRes.json().catch(() => ({}));
          throw new Error(errJson.error || 'Failed to generate university recommendations.');
        }
      }

      if (reportData) {
        setSelectedSubmission(prev => prev && prev.id === target.id ? {
          ...prev,
          report: reportData,
          status: 'completed'
        } : prev);
        setSubmissions(prev => prev.map(s => s.id === target.id ? { ...s, report: reportData, status: 'completed' } : s));
      }
    } catch (err) {
      console.error('Error generating university recommendations:', err);
      setGenerateError(err.message || 'Unable to generate university recommendations. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  }, [selectedSubmission]);

  // Automatically trigger recommendation generation if not yet generated
  useEffect(() => {
    if (selectedSubmission && !selectedSubmission.report && !generatingReport && !generateError) {
      handleGenerateRecommendations(selectedSubmission);
    }
  }, [selectedSubmission?.id, selectedSubmission?.report, generatingReport, generateError, handleGenerateRecommendations]);

  const currentReport = selectedSubmission?.report;
  const universitiesList = currentReport?.recommendedUniversities || currentReport?.recommendedColleges || [];

  return (
    <div className={styles.dashboardContainer}>
      <div className="container">
        {/* Header */}
        <div className={styles.dashboardHeader}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className={styles.greeting}>Welcome, {user?.displayName || user?.email || 'Applicant'}</h1>
              <p className={styles.greetingSub}>Track and review your submitted admission evaluations, recommendations, and parsed document data.</p>
            </div>
            <Link href="/#admission-calculator" className="btn btn-primary" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
              <PlusCircle size={18} />
              Submit Another Application
            </Link>
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
                          <span className={`${styles.statusBadge} ${sub.report || sub.status === 'completed' ? styles.statusBadgeCompleted : sub.status === 'failed' ? styles.statusBadgeFailed : styles.statusBadgePending}`}>
                            {sub.report ? 'ready' : (sub.status || 'pending')}
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
                          {selectedSubmission.targetDegree ? `${selectedSubmission.targetDegree} Evaluation Details` : 'Evaluation Details'}
                        </h2>
                        <p className={styles.detailSubtitle}>
                          Submitted on {selectedSubmission.createdAt ? new Date(selectedSubmission.createdAt.seconds * 1000).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          }) : 'Just now'}
                        </p>
                      </div>
                      <span className={`${styles.statusBadgeLarge} ${selectedSubmission.report || selectedSubmission.status === 'completed' ? styles.statusBadgeCompleted : selectedSubmission.status === 'failed' ? styles.statusBadgeFailed : styles.statusBadgePending}`}>
                        Status: {selectedSubmission.report ? 'completed' : (selectedSubmission.status || 'pending')}
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

                    {/* University Recommendations & Feasibility Section */}
                    <div className={styles.recommendationsSection}>
                      <div className={styles.sectionHeaderRow}>
                        <div>
                          <div className={styles.aiBadge}>
                            <Sparkles size={14} /> Recommended Universities
                          </div>
                          <h3 className={styles.sectionHeaderTitle} style={{ marginTop: '0.4rem' }}>
                            University Recommendations & Fit Analysis
                          </h3>
                        </div>

                        {currentReport && (
                          <button 
                            type="button" 
                            disabled={generatingReport}
                            onClick={() => handleGenerateRecommendations(selectedSubmission)}
                            className="btn btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                          >
                            {generatingReport ? (
                              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <RefreshCw size={14} />
                            )}
                            {generatingReport ? 'Analyzing...' : 'Refresh Recommendations'}
                          </button>
                        )}
                      </div>

                      {generateError && (
                        <div className={styles.infoAlertFailed}>
                          <AlertTriangle size={16} />
                          <span style={{ flex: 1 }}>{generateError}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setGenerateError('');
                              handleGenerateRecommendations(selectedSubmission);
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {!currentReport ? (
                        <div className={styles.generatePromptCard}>
                          <Loader2 size={36} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary)' }} />
                          <h4 className={styles.generatePromptTitle}>
                            {generatingReport ? 'Generating Recommendations...' : 'Loading Recommendations...'}
                          </h4>
                          <p className={styles.generatePromptSub}>
                            Our recommendation system is evaluating your target degree, scores, budget tier, location preferences, and parsed resume to recommend matching universities with personalized fit explanations.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                          {/* Overview & Score Card */}
                          <div className={styles.overviewCard}>
                            <div className={styles.overviewTop}>
                              <div className={styles.scoreWrapper}>
                                <div className={styles.scoreNumber}>{currentReport.overallScore || 85}%</div>
                                <div className={styles.scoreLabel}>
                                  <span className={styles.scoreTitle}>Admission Readiness Score</span>
                                  <span className={styles.scoreSubtitle}>Based on your academic profile and credentials</span>
                                </div>
                              </div>
                            </div>
                            {currentReport.profileSummary && (
                              <p className={styles.profileSummaryText}>
                                {currentReport.profileSummary}
                              </p>
                            )}
                          </div>

                          {/* Strengths & Improvements */}
                          {((currentReport.strengths && currentReport.strengths.length > 0) || (currentReport.improvements && currentReport.improvements.length > 0)) && (
                            <div className={styles.strengthsImprovementsGrid}>
                              {currentReport.strengths && currentReport.strengths.length > 0 && (
                                <div className={styles.insightCard}>
                                  <div className={`${styles.insightCardHeader} ${styles.strengthsHeader}`}>
                                    <CheckCircle2 size={18} /> Key Profile Strengths
                                  </div>
                                  <ul className={styles.insightList}>
                                    {currentReport.strengths.map((str, idx) => (
                                      <li key={idx} className={styles.insightItem}>
                                        <CheckCircle2 size={14} className={styles.checkIcon} />
                                        <span>{str}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {currentReport.improvements && currentReport.improvements.length > 0 && (
                                <div className={styles.insightCard}>
                                  <div className={`${styles.insightCardHeader} ${styles.improvementsHeader}`}>
                                    <Lightbulb size={18} /> Actionable Profile Recommendations
                                  </div>
                                  <ul className={styles.insightList}>
                                    {currentReport.improvements.map((imp, idx) => (
                                      <li key={idx} className={styles.insightItem}>
                                        <Lightbulb size={14} className={styles.bulbIcon} />
                                        <span>{imp}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Recommended Universities Grid */}
                          <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--foreground)' }}>
                              Recommended Universities for {selectedSubmission.targetDegree || 'Your Profile'} ({universitiesList.length})
                            </h4>

                            <div className={styles.universitiesGrid}>
                              {universitiesList.map((uni, idx) => {
                                const categoryClass = 
                                  uni.category?.toLowerCase().includes('reach') || uni.tier?.toLowerCase().includes('tier 1') ? styles.categoryReach :
                                  uni.category?.toLowerCase().includes('safe') || uni.tier?.toLowerCase().includes('tier 3') ? styles.categorySafe :
                                  styles.categoryMatch;

                                const chance = uni.admissionChance || uni.chance || 75;

                                return (
                                  <div key={idx} className={styles.universityCard}>
                                    <div className={styles.universityCardHeader}>
                                      <div>
                                        <h5 className={styles.universityName}>{uni.name}</h5>
                                        <div className={styles.universityLocation}>
                                          <MapPin size={13} />
                                          <span>{uni.city ? `${uni.city}, ` : ''}{uni.country || selectedSubmission.targetCountry || 'Global'}</span>
                                        </div>
                                      </div>
                                      <span className={`${styles.categoryBadge} ${categoryClass}`}>
                                        {uni.category || uni.tier || 'Target / Match'}
                                      </span>
                                    </div>

                                    <div className={styles.programMeta}>
                                      <span className={styles.programName}>
                                        {uni.program || `${selectedSubmission.targetDegree || 'Degree'} Program`}
                                      </span>
                                      <span className={styles.chanceBadge}>
                                        {chance}% Chance
                                      </span>
                                    </div>

                                    {/* Why it is a good fit section */}
                                    <div className={styles.fitReasonBox}>
                                      <div className={styles.fitReasonLabel}>
                                        <Sparkles size={12} /> Why It&apos;s A Good Fit
                                      </div>
                                      <p className={styles.fitReasonText}>
                                        {uni.fitReason || `Matches your ${selectedSubmission.targetDegree || 'degree'} focus and location preference with favorable admission feasibility.`}
                                      </p>
                                    </div>

                                    {/* Key Highlights */}
                                    {uni.keyHighlights && uni.keyHighlights.length > 0 && (
                                      <div className={styles.highlightsRow}>
                                        {uni.keyHighlights.map((hl, hIdx) => (
                                          <span key={hIdx} className={styles.highlightTag}>
                                            {hl}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Career Outlook */}
                          {currentReport.careerOutlook && (
                            <div className={styles.careerOutlookCard}>
                              <div className={styles.careerOutlookHeader}>
                                <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                                <span>Career Outlook &amp; Potential Outcomes</span>
                              </div>
                              <div className={styles.careerOutlookGrid}>
                                {currentReport.careerOutlook.avgSalary && (
                                  <div>
                                    <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Estimated Salary:</span>{' '}
                                    <strong>{currentReport.careerOutlook.avgSalary}</strong>
                                  </div>
                                )}
                                {currentReport.careerOutlook.industryFit && (
                                  <div>
                                    <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Industry Demand:</span>{' '}
                                    <span>{currentReport.careerOutlook.industryFit}</span>
                                  </div>
                                )}
                                {currentReport.careerOutlook.topRoles && currentReport.careerOutlook.topRoles.length > 0 && (
                                  <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Relevant Roles:</span>{' '}
                                    <span>{currentReport.careerOutlook.topRoles.join(', ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
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
                              <h4 className={styles.blockTitle}>
                                <User size={14} /> Personal Information
                              </h4>

                              <div className={styles.blockGrid}>
                                {(parsedResume.personalInfo.fullName || parsedResume.personalInfo.name) && (
                                  <div>
                                    <span className={styles.blockLabel}>Name:</span>{" "}
                                    {parsedResume.personalInfo.fullName || parsedResume.personalInfo.name}
                                  </div>
                                )}

                                {parsedResume.personalInfo.email && (
                                  <div>
                                    <span className={styles.blockLabel}>Email:</span>{" "}
                                    {parsedResume.personalInfo.email}
                                  </div>
                                )}

                                {(parsedResume.personalInfo.phoneNumber || parsedResume.personalInfo.phone) && (
                                  <div>
                                    <span className={styles.blockLabel}>Phone:</span>{" "}
                                    {parsedResume.personalInfo.phoneNumber || parsedResume.personalInfo.phone}
                                  </div>
                                )}

                                {(parsedResume.personalInfo.address || parsedResume.personalInfo.location) && (
                                  <div>
                                    <span className={styles.blockLabel}>Location:</span>{" "}
                                    {parsedResume.personalInfo.address || parsedResume.personalInfo.location}
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
                                      <strong>{edu.degree || 'Degree'}</strong> {edu.specializationMajor || edu.major ? `in ${edu.specializationMajor || edu.major}` : ''}
                                    </div>
                                    <div className={styles.blockItemSub}>
                                      {edu.universityCollege || edu.institution || 'Institution'} {edu.graduationYear ? `(${edu.graduationYear})` : ''}
                                    </div>
                                    {(edu.gpa || edu.percentage || edu.cgpaPercentage) && (
                                      <div className={styles.blockItemMeta}>GPA / Score: {edu.gpa || edu.percentage || edu.cgpaPercentage}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Experience */}
                          {((parsedResume.experience && parsedResume.experience.length > 0) || (parsedResume.workExperience && parsedResume.workExperience.length > 0)) && (
                            <div className={styles.resumeBlock}>
                              <h4 className={styles.blockTitle}><Briefcase size={14} /> Work Experience</h4>
                              <div className={styles.blockList}>
                                {(parsedResume.experience || parsedResume.workExperience).map((exp, idx) => (
                                  <div key={idx} className={styles.blockItem}>
                                    <div className={styles.blockItemHeader}>
                                      <strong>{exp.role || exp.jobTitle || 'Role'}</strong> {exp.company ? `at ${exp.company}` : ''}
                                    </div>
                                    {exp.startDate && (
                                      <div className={styles.blockItemSub}>
                                        {exp.startDate} - {exp.endDate || 'Present'} {exp.totalExperience ? `(${exp.totalExperience})` : ''}
                                      </div>
                                    )}
                                    {exp.description && <p className={styles.blockItemDescription}>{exp.description}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Skills */}
                          {parsedResume.skills && (Array.isArray(parsedResume.skills) ? parsedResume.skills.length > 0 : Object.keys(parsedResume.skills).length > 0) && (
                            <div className={styles.resumeBlock}>
                              <h4 className={styles.blockTitle}>Skills</h4>
                              <div className={styles.tagsContainer}>
                                {Array.isArray(parsedResume.skills)
                                  ? parsedResume.skills.map((skill, idx) => (
                                      <span key={idx} className={styles.skillTag}>{skill}</span>
                                    ))
                                  : Object.values(parsedResume.skills).flat().map((skill, idx) => (
                                      <span key={idx} className={styles.skillTag}>{skill}</span>
                                    ))
                                }
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
                                    <strong>{proj.name || proj.projectName}</strong>
                                    {(proj.description || proj.outcomeImpact) && (
                                      <p className={styles.blockItemDescription}>{proj.description || proj.outcomeImpact}</p>
                                    )}
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
                                  <li key={idx}>
                                    {typeof cert === 'string' ? cert : `${cert.certificationName || 'Certification'}${cert.issuingOrganization ? ` - ${cert.issuingOrganization}` : ''}`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Achievements */}
                          {parsedResume.achievements && (Array.isArray(parsedResume.achievements) ? parsedResume.achievements.length > 0 : Object.keys(parsedResume.achievements).length > 0) && (
                            <div className={styles.resumeBlock}>
                              <h4 className={styles.blockTitle}>Achievements</h4>
                              <ul className={styles.bulletList}>
                                {Array.isArray(parsedResume.achievements)
                                  ? parsedResume.achievements.map((ach, idx) => (
                                      <li key={idx}>{ach}</li>
                                    ))
                                  : Object.values(parsedResume.achievements).flat().map((ach, idx) => (
                                      <li key={idx}>{ach}</li>
                                    ))
                                }
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