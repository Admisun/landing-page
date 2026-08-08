"use client";

import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.container}`}>
        <div className={styles.top}>
          <div className={styles.logoArea}>
            <Link href="/" className={styles.logo}>Admisun</Link>
            <p className={styles.description}>
              AI-powered admission feasibility and career intelligence. We help students discover institutions, courses, and pathways to maximize career potential.
            </p>
          </div>

          <div className={styles.linksArea}>
            <div className={styles.linkCol}>
              <h4 className={styles.colTitle}>Platform</h4>
              <Link href="/#admission-calculator" className={styles.link}>Calculator</Link>
              <Link href="/dashboard" className={styles.link}>Submission</Link>
              <Link href="/profile" className={styles.link}>Profile</Link>
            </div>

            <div className={styles.linkCol}>
              <h4 className={styles.colTitle}>Legal</h4>
              <Link href="/terms" className={styles.link}>Terms of Use</Link>
              <Link href="/privacy" className={styles.link}>Privacy Policy</Link>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>&copy; {currentYear} Admisun. All rights reserved.</p>
          <p>Powered by Advanced AI & Document Intelligence</p>
        </div>
      </div>
    </footer>
  );
}
