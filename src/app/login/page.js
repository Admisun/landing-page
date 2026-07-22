"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from '@/styles/auth.module.css';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError('Failed to log in. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push('/');
    } catch (err) {
      setError('Failed to log in with Google.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Log in to access your AI admission strategist.</p>
        
        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
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
            />
          </div>
          
          <div className={styles.forgotPassword}>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>

          <button type="submit" disabled={loading} className={`btn btn-primary ${styles.submitBtn}`}>
            {loading ? <><Loader2 size={18} className="spinner" /> Logging in...</> : 'Log In'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <button onClick={handleGoogleLogin} disabled={loading} className={`btn btn-secondary ${styles.googleBtn}`}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" className={styles.googleIcon} />
          Continue with Google
        </button>

        <p className={styles.footerText}>
          Don't have an account? <Link href="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
