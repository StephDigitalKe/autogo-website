'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Apple, Loader2 } from 'lucide-react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { restoreGuestSession, clearGuestSession } from '@/components/auth/AutoSaveIntent';

function SignInForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignIn = async () => {
    if (!email || !password || isSigningIn) return;
    setSignInError('');
    setIsSigningIn(true);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Sign in failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.token) throw new Error('No token received');
      await login(data.token);

      // Check for saved guest session and redirect
      const { hasSession, session } = restoreGuestSession();
      if (hasSession && session?.lastPath && session.lastPath !== '/auth/sign-in') {
        clearGuestSession();
        router.push(session.lastPath);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : 'Sign in failed');
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignInSuccess = async (tokenResponse: { access_token?: string }) => {
    if (!tokenResponse.access_token) {
      setSignInError('Google authentication failed: no access token received');
      setGoogleLoading(false);
      return;
    }

    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      if (!profileRes.ok) {
        throw new Error('Failed to fetch Google profile');
      }

      const profile = await profileRes.json();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email,
          name: profile.name || profile.email?.split('@')[0] || 'Google User',
          avatar: profile.picture || '',
          googleId: profile.sub,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Google sign-in failed' }));
        throw new Error(err.error || 'Google sign-in failed');
      }

      const data = await res.json();
      if (!data.token) throw new Error('No token received');

      await login(data.token);
      router.push('/dashboard');
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSignInSuccess,
    onError: () => {
      setSignInError('Google sign-in failed');
      setGoogleLoading(false);
    },
    flow: 'implicit',
    scope: 'openid email profile',
    prompt: 'select_account',
  });

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    setSignInError('');
    googleLogin();
  };

  const signInStyles = `
    @keyframes driveInPark {
      0% {
        opacity: 0;
        transform: translateX(180px) scale(0.92);
        filter: blur(4px);
      }
      60% {
        opacity: 1;
        transform: translateX(-8px) scale(1.01);
        filter: blur(0);
      }
      80% {
        transform: translateX(4px);
      }
      100% {
        opacity: 1;
        transform: translateX(0) scale(1);
        filter: blur(0);
      }
    }
    @keyframes gentleFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    @keyframes lightSweep {
      0% { transform: translateX(0); }
      50% { transform: translateX(300%); }
      100% { transform: translateX(300%); }
    }
    @keyframes fadeInUp {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `;

  return (
      <div className="min-h-screen flex">
      {/* Left - Prado Showcase Panel */}
      <div className={`hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-slate-950 via-gray-950 to-slate-900 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

        {/* Ambient radial glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Prado hero image container */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={mounted ? { animation: 'driveInPark 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both' } : undefined}
        >
          <div className="relative w-full h-full flex items-center justify-center px-8">
            <img
              src="/images/prado-showcase.png?v=3"
              alt="Toyota Land Cruiser Prado"
              className="w-full max-w-2xl object-contain drop-shadow-2xl"
              style={mounted ? { animation: 'gentleFloat 6s ease-in-out 1.5s infinite' } : undefined}
            />
          </div>
        </div>

        {/* Ground reflection glow */}
        <div
          className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-[60%] max-w-lg h-10 rounded-full"
          style={{
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Premium light sweep */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={mounted ? { animation: 'lightSweep 5s ease-in-out 2.5s infinite' } : undefined}
        >
          <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -skew-x-12" />
        </div>

        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80" />

        {/* Content overlay */}
        <div className="relative flex flex-col justify-end p-12 w-full z-10">
          <div className="max-w-lg">
            <div
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 mb-6"
              style={mounted ? { animation: 'fadeInUp 0.8s ease-out 0.3s both' } : undefined}
            >
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white text-xs font-medium tracking-wide uppercase">
                Kenya&apos;s #1 Vehicle Rental Platform
              </span>
            </div>

            <h2
              className="text-4xl font-extrabold text-white mb-4 leading-tight"
              style={mounted ? { animation: 'fadeInUp 0.8s ease-out 0.4s both' } : undefined}
            >
              Drive Your Freedom
            </h2>
            <p
              className="text-white/80 text-lg mb-8 leading-relaxed"
              style={mounted ? { animation: 'fadeInUp 0.8s ease-out 0.5s both' } : undefined}
            >
              Sign in to access premium vehicles, manage your bookings, and enjoy
              exclusive member benefits across Kenya.
            </p>

            <div
              className="flex gap-6"
              style={mounted ? { animation: 'fadeInUp 0.8s ease-out 0.6s both' } : undefined}
            >
              {[
                { value: '5K+', label: 'Happy Clients' },
                { value: '200+', label: 'Vehicles' },
                { value: '4.9', label: 'Star Rating' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-extrabold text-white">{stat.value}</div>
                  <div className="text-white/60 text-xs font-medium mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className={`flex-1 flex items-center justify-center px-6 py-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back
          </h1>
          <p className="text-muted-foreground mb-8">
            Sign in to your account to continue
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSignIn(); }}
            className="space-y-5"
          >
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <div className="flex justify-end mt-1">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {signInError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {signInError}
              </div>
            )}

            <Button
              size="lg"
              fullWidth
              disabled={isSigningIn}
              className="hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150"
            >
              {isSigningIn ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-sm text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Google
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150"
            >
              <Apple className="w-5 h-5" />
              Apple
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/onboarding"
              className="text-primary font-semibold hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: signInStyles }} />
    </div>
  );
}

export default function SignInPage() {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <SignInForm />
    </GoogleOAuthProvider>
  );
}
