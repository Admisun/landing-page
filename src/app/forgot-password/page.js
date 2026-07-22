"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import styles from '@/styles/auth.module.css';
import { Loader2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      await resetPassword(email);
      setMessage('Check your inbox for further instructions.');
    } catch (err) {
      setError('Failed to reset password. Verify your email address.');
    }
    setLoading(false);
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>Enter your email and we'll send you a link to reset your password.</p>
        
        {error && <div className={styles.errorAlert}>{error}</div>}
        {message && <div className={styles.successAlert}>{message}</div>}

        <form onSubmit={handleReset} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="you@example.com"
            />
          </div>
          
          <button type="submit" disabled={loading} className={`btn btn-primary ${styles.submitBtn}`}>
            {loading ? <><Loader2 size={18} className="spinner" /> Sending link...</> : 'Reset Password'}
          </button>
        </form>

        <p className={styles.footerText}>
          Remember your password? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
