# Authentication System Documentation

## Overview
The application uses Firebase Authentication for user management, providing a secure and scalable authentication solution. The implementation includes email/password authentication with session persistence.

## Prerequisites
1. Firebase Project Setup:
   - Create a new project in Firebase Console
   - Enable Email/Password authentication in Authentication > Sign-in methods
   - Get your Firebase configuration from Project Settings > General > Your apps > Web app

2. Environment Variables:
   Create a `.env.local` file in your project root with:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

## Core Components

### 1. Firebase Configuration (`lib/firebase.ts`)
```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to local
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
      console.error("Error setting auth persistence:", error);
    });
}

// Initialize Analytics (optional)
export const analytics = typeof window !== 'undefined' 
  ? isSupported().then(yes => yes ? getAnalytics(app) : null) 
  : null;
```

### 2. Authentication Context (`lib/auth-context.tsx`)
```typescript
import { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext).user;
}
```

### 3. Authentication Page (`app/auth/page.tsx`)
```typescript
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthError } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Email validation
  const isValidEmail = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  // Password validation
  const isValidPassword = useMemo(() => {
    return password.length >= 6;
  }, [password]);

  const handleSubmit = async () => {
    if (!isValidEmail || !isValidPassword) {
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

      router.push('/');
    } catch (e: unknown) {
      const error = e as AuthError;
      const errorMessage = error.code ? getErrorMessage(error.code) : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case 'auth/invalid-email': return 'Invalid email address';
      case 'auth/user-disabled': return 'This account has been disabled';
      case 'auth/user-not-found': return 'No account found with this email';
      case 'auth/wrong-password': return 'Incorrect password';
      case 'auth/email-already-in-use': return 'An account already exists with this email';
      case 'auth/weak-password': return 'Password should be at least 6 characters';
      default: return 'An error occurred during authentication';
    }
  };

  // ... UI rendering code
}
```

## Authentication Flow

### Sign In Process
1. User enters credentials:
   - Email is validated using regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
   - Password must be at least 6 characters
   - Form shows real-time validation feedback

2. Firebase Authentication:
   ```typescript
   await signInWithEmailAndPassword(auth, email, password);
   ```
   - Returns a Promise that resolves with UserCredential
   - Throws AuthError on failure

3. Success Handling:
   - User state is automatically updated via AuthContext
   - Router redirects to home page
   - Session is persisted in browser storage

4. Error Handling:
   - Catches AuthError
   - Maps error codes to user-friendly messages
   - Displays error in UI
   - Allows retry or registration switch

### Registration Process
1. User enters new credentials:
   - Same validation as sign in
   - Additional check for existing accounts

2. Firebase Account Creation:
   ```typescript
   await createUserWithEmailAndPassword(auth, email, password);
   ```
   - Creates new user in Firebase
   - Automatically signs in the user
   - Returns UserCredential

3. Success Handling:
   - Same as sign in
   - Consider adding additional user data to Firestore

4. Error Handling:
   - Specific handling for email-already-in-use
   - Password strength requirements
   - Other Firebase auth errors

### Sign Out Implementation
```typescript
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const handleSignOut = async () => {
  try {
    await signOut(auth);
    // AuthContext automatically updates
    router.push('/auth');
  } catch (error) {
    console.error("Error signing out:", error);
  }
};
```

## Protected Routes Implementation

### 1. Route Protection Pattern
```typescript
export default function ProtectedPage() {
  const user = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
    }
  }, [user, router]);

  if (!user) {
    return null; // or loading spinner
  }

  return (
    // Protected content
  );
}
```

### 2. Layout Protection
```typescript
// app/layout.tsx
import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## Security Best Practices

1. Environment Variables:
   - Never commit `.env.local`
   - Use `NEXT_PUBLIC_` prefix for client-side variables
   - Keep sensitive server-side variables private

2. Session Management:
   - Use `browserLocalPersistence` for session persistence
   - Implement proper sign-out on sensitive actions
   - Clear sensitive data on sign-out

3. Form Security:
   - Client-side validation for UX
   - Server-side validation for security
   - Rate limiting for auth attempts
   - CSRF protection (built into Firebase)

4. Error Handling:
   - Never expose internal errors
   - Use user-friendly messages
   - Log errors server-side
   - Implement proper error boundaries

## Integration Examples

### 1. User Balance Integration
```typescript
// lib/user-balance-context.tsx
export function UserBalanceProvider({ children }: { children: React.ReactNode }) {
  const user = useAuth();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (doc) => {
        if (doc.exists()) {
          setBalance(doc.data().balance || 0);
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  return (
    <UserBalanceContext.Provider value={{ balance, setBalance }}>
      {children}
    </UserBalanceContext.Provider>
  );
}
```

### 2. Purchase System Integration
```typescript
// components/ui/purchase-sheet.tsx
export function PurchaseSheet() {
  const user = useAuth();
  
  const handlePurchase = async () => {
    if (!user) return;
    
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        // Process purchase
      });
    } catch (error) {
      console.error('Error processing purchase:', error);
    }
  };
}
```

## Testing Authentication

1. Unit Tests:
```typescript
import { render, fireEvent, waitFor } from '@testing-library/react';
import { AuthPage } from './auth/page';

describe('AuthPage', () => {
  it('handles sign in correctly', async () => {
    const { getByPlaceholderText, getByText } = render(<AuthPage />);
    
    fireEvent.change(getByPlaceholderText('Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(getByPlaceholderText('Password'), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(getByText('Sign in'));
    
    await waitFor(() => {
      // Assert successful sign in
    });
  });
});
```

2. Integration Tests:
```typescript
describe('Protected Routes', () => {
  it('redirects to auth page when not authenticated', async () => {
    const { getByText } = render(<ProtectedPage />);
    
    await waitFor(() => {
      expect(window.location.pathname).toBe('/auth');
    });
  });
});
```

## Deployment Considerations

1. Firebase Configuration:
   - Set up proper Firebase security rules
   - Configure authorized domains
   - Set up proper CORS settings

2. Environment Setup:
   - Configure production environment variables
   - Set up proper Firebase project settings
   - Configure analytics (if used)

3. Monitoring:
   - Set up Firebase Authentication monitoring
   - Configure error tracking
   - Monitor authentication attempts

4. Security:
   - Regular security audits
   - Keep dependencies updated
   - Monitor for suspicious activity 