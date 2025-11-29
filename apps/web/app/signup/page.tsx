'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '../components/auth-shell';
import { api } from '../lib/api';
import styles from './signup.module.css';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newsletter, setNewsletter] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(api.auth.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (data.accessToken && data.refetch) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refetch);
      }

      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const heroContent = (
    <div className={styles.heroContent}>
      <span className={styles.heroBadge}>Plan together</span>
      <h2 className={styles.heroTitle}>
        Build future journeys<span> with an adaptive co-pilot</span>
      </h2>
      <p className={styles.heroCopy}>
        From micro getaways to month-long sabbaticals, orchestrate every detail
        with collaborative boards, contextual recommendations, and real-time
        nudges.
      </p>
      <div className={styles.heroStats}>
        <div>
          <strong>12k+</strong>
          <span>Trips launched in 2025</span>
        </div>
        <div>
          <strong>48 hrs</strong>
          <span>Average planning time saved</span>
        </div>
        <div>
          <strong>92%</strong>
          <span>Users invite a co-traveler</span>
        </div>
      </div>
    </div>
  );

  return (
    <AuthShell hero={heroContent}>
      <div className={styles.panelHeader}>
        <p className={styles.kicker}>Create account</p>
        <h1 className={styles.title}>Unlock the AI itinerary</h1>
        <p className={styles.subtitle}>
          Sync preferences, budgets, and inspiration moodboards in one place.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.inputGroup}>
          <label htmlFor="email" className={styles.label}>
            Email Address
          </label>
          <div className={styles.inputField}>
            <input
              id='email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='you@example.com'
              required
              autoComplete='email'
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <div className={styles.inputField}>
            <input
              id='password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='At least 8 characters'
              required
              autoComplete='new-password'
              minLength={8}
            />
          </div>
          <span className={styles.hint}>At least 8 characters with letters & numbers</span>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>
            Confirm Password
          </label>
          <div className={styles.inputField}>
            <input
              id='confirmPassword'
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder='Repeat your password'
              required
              autoComplete='new-password'
              minLength={8}
            />
          </div>
        </div>

        <label className={styles.checkbox}>
          <input
            type='checkbox'
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
          />
          <span>Send me destination intel & seasonal deal drops</span>
        </label>

        <button type='submit' className={styles.primaryButton} disabled={loading}>
          {loading ? 'Creating account...' : 'Start planning with AI'}
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          Already have an account?{' '}
          <Link href='/login' className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

