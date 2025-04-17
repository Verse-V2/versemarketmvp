'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthError } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Validate email and password
  const isValidEmail = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  const isValidPassword = useMemo(() => {
    return password.length >= 6;
  }, [password]);

  const isValid = isValidEmail && isValidPassword;

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Please fill in all fields correctly');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      // On success, redirect to home page
      router.push('/');
    } catch (e: unknown) {
      // Handle common Firebase auth errors with user-friendly messages
      const error = e as AuthError;
      const errorMessage = error.code ? getErrorMessage(error.code) : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      default:
        return 'An error occurred during authentication';
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image
            src="/Logo_F_White3x.png"
            alt="Verse Logo"
            width={256}
            height={64}
            className="max-w-full w-64"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            className={`w-full ${isValid ? 'bg-[#0BC700] hover:bg-[#0BC700]/90' : 'bg-gray-300 hover:bg-gray-300/90'}`}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
          </Button>

          <Button
            variant="link"
            className="w-full"
            onClick={() => setIsRegister(!isRegister)}
            disabled={isLoading}
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : <>Don&apos;t have an account? <span className="text-[#0BC700]">Sign up</span></>}
          </Button>
        </div>
      </div>
    </main>
  );
} 