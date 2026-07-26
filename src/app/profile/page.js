"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import styles from './profile.module.css';
import { User, Mail, Save, Loader2, FileText } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [dbUser, setDbUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [loadingDb, setLoadingDb] = useState(true);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      
      const fetchDbUser = async () => {
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            setDbUser(docSnap.data());
          }
        } catch (err) {
          console.error("Error fetching db user details:", err);
        } finally {
          setLoadingDb(false);
        }
      };
      
      fetchDbUser();
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg({ type: '', text: '' });

    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: displayName
      });

      // 2. Update Firestore User Document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: displayName
      });

      setStatusMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      console.error("Error saving profile details:", err);
      setStatusMsg({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U';
  };

  return (
    <ProtectedRoute>
      <div className={styles.profileContainer}>
        <div className="container">
          <div className={styles.profileCard}>
            <div className={styles.header}>
              <div className={styles.avatarWrapper}>
                <div className={styles.avatar}>{getInitials()}</div>
              </div>
              <h1 className={styles.title}>Your Profile</h1>
              <p className={styles.subtitle}>Manage your account details and view your parsed documents.</p>
            </div>

            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={user?.email || ''} 
                  disabled 
                  className={styles.input} 
                />
              </div>

              <div className={styles.formGroup}>
                <label>Display Name</label>
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                  placeholder="Enter your name" 
                  className={styles.input} 
                  required
                />
              </div>

              <button type="submit" disabled={isSaving} className={`btn btn-primary ${styles.submitBtn}`}>
                {isSaving ? (
                  <>
                    <Loader2 size={18} className={styles.spinner} />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Profile
                  </>
                )}
              </button>

              {statusMsg.text && (
                <p className={styles.statusMsg} style={{ color: statusMsg.type === 'error' ? 'var(--accent)' : 'var(--primary)' }}>
                  {statusMsg.text}
                </p>
              )}
            </form>

            {/* Parsed Resume Info */}
            <div className={styles.resumeSection}>
              <h2 className={styles.resumeTitle}>Your Extracted Resume Profile</h2>
              {loadingDb ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading resume data...</p>
              ) : dbUser?.parsedResume ? (
                <div className={styles.resumeCard}>
                  <div className={styles.resumeInfo}>
                    <FileText className={styles.fileIcon} size={28} />
                    <div>
                      <div className={styles.fileName}>
                        {dbUser.parsedResume.personalInfo?.fullName || 'Latest Parsed Resume'}
                      </div>
                      <div className={styles.fileMeta}>
                        {dbUser.parsedResume.education?.[0]?.degree || 'Unknown Degree'} from {dbUser.parsedResume.education?.[0]?.universityCollege || 'Unknown University'}
                      </div>
                    </div>
                  </div>
                  <span className={styles.fileMeta}>Status: Parsed</span>
                </div>
              ) : (
                <div className={styles.noResume}>
                  No resume has been parsed for your account yet. Use the Admission Calculator to upload a resume and try it out!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
