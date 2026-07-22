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
        <Link href="/" className={styles.logo}>Admisun</Link>
        <div className={styles.auth}>
          {user ? (
            <div className={styles.userSection}>
              <span className={styles.userName}>{user.email}</span>
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
