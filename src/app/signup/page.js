"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from '@/styles/auth.module.css';
import { Loader2 } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signup(email, password, name);
      router.push('/');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Failed to create an account. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push('/');
    } catch (err) {
      setError('Failed to sign up with Google.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Create an Account</h1>
        <p className={styles.subtitle}>Join Admisun and unlock AI-powered insights.</p>
        
        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSignup} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Full Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              placeholder="John Doe"
            />
          </div>

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
          
          <div className={styles.formGroup}>
            <label>Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          
          <button type="submit" disabled={loading} className={`btn btn-primary ${styles.submitBtn}`}>
            {loading ? <><Loader2 size={18} className="spinner" /> Creating account...</> : 'Sign Up'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <button onClick={handleGoogleSignup} disabled={loading} className={`btn btn-secondary ${styles.googleBtn}`}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" className={styles.googleIcon} />
          Sign up with Google
        </button>

        <p className={styles.footerText}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
