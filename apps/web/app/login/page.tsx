'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '../components/auth-shell';
import { api } from '../lib/api';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(api.auth.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.accessToken && data.refetch) {
        localStorage.setItem('accessToken', data.accessToken);
        if (rememberMe) {
          localStorage.setItem('refreshToken', data.refetch);
        }
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const heroContent = (
    <div className={styles.heroContent}>
      <span className={styles.heroBadge}>AI Travel Planner</span>
      <h2 className={styles.heroTitle}>
        Curate journeys with<span> generative itineraries</span>
      </h2>
      <p className={styles.heroCopy}>
        Blend human wanderlust with AI precision. Track budgets, map immersive
        experiences, and let our copilot adapt plans in real-time.
      </p>
      <ul className={styles.heroList}>
        <li>
          <strong>Smart briefs</strong>
          <span>Hyper-personalized day-by-day plans built in minutes.</span>
        </li>
        <li>
          <strong>Live insights</strong>
          <span>Weather, events, and safety updates while you explore.</span>
        </li>
        <li>
          <strong>Collaborative boards</strong>
          <span>Invite friends, vote on activities, and sync packing lists.</span>
        </li>
      </ul>
    </div>
  );

  return (
    <AuthShell hero={heroContent}>
      <div className={styles.panelHeader}>
        <p className={styles.kicker}>Welcome back</p>
        <h1 className={styles.title}>Sign in & continue exploring</h1>
        <p className={styles.subtitle}>
          Your saved routes, drafts, and collaborative boards await.
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
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <div className={styles.inputField}>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              minLength={8}
            />
          </div>
        </div>

        <div className={styles.actionsRow}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Stay signed in</span>
          </label>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => router.push('/forgot-password')}
          >
            Forgot password?
          </button>
        </div>

        <button type="submit" className={styles.primaryButton} disabled={loading}>
          {loading ? 'Signing in...' : 'Access my trips'}
        </button>

        <div className={styles.divider}>
          <span>or continue with</span>
        </div>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => alert('Social login coming soon 🚀')}
        >
          Continue with Google
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          New to AI Travel Planner?{' '}
          <Link href="/signup" className={styles.link}>
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

