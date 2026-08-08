"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import styles from './Header.module.css';

export default function Header() {
  const { user, logout } = useAuth();

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.container}`}>
        <div className={styles.left}>
          <Link href="/" className={styles.logo}>Admisun</Link>
          {user && (
            <nav className={styles.nav}>
              <Link href="/dashboard" className={styles.navLink}>Submission</Link>
              <Link href="/profile" className={styles.navLink}>Profile</Link>
            </nav>
          )}
        </div>
        <div className={styles.auth}>
          {user ? (
            <div className={styles.userSection}>
              <span className={styles.userName}>{user.displayName || user.email}</span>
              <button onClick={handleSignOut} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Sign Out
              </button>
            </div>
          ) : (
            <div className={styles.userSection}>
              <Link href="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Log In
              </Link>
              <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
