import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthResponse, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { auth, db } from '@/lib/supabase';

interface UserMetadata {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  company_size?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, metadata?: UserMetadata) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<{ error: Error | null }>;
  checkAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = async () => {
    if (user?.id) {
      const { isAdmin } = await db.isUserAdmin(user.id);
      setIsAdmin(isAdmin);
    } else {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // Get initial session
    auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check admin status if user exists
      if (session?.user?.id) {
        const { isAdmin } = await db.isUserAdmin(session.user.id);
        setIsAdmin(isAdmin);
      }
      
      setLoading(false);
    });

    // Listen for auth changes - NO ASYNC CALLS HERE to avoid deadlock
    const { data: { subscription } } = auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Don't make async calls here - will cause deadlock!
        // Instead, we'll check admin status in a separate effect
        if (!session?.user?.id) {
          setIsAdmin(false);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Separate effect to check admin status when user changes
  useEffect(() => {
    const checkAdmin = async () => {
      if (user?.id) {
        console.log('🔍 Checking admin status for:', user.email);
        const { isAdmin, error } = await db.isUserAdmin(user.id);
        console.log('🔍 Admin check result:', { isAdmin, error, email: user.email });
        setIsAdmin(isAdmin);
        
        // Special redirect for Miguel
        if (user.email === 'miguelfortesmartins4@gmail.com') {
          console.log('👑 Miguel detected in AuthContext - forcing admin redirect');
          if (window.location.pathname === '/login' || window.location.pathname === '/dashboard') {
            window.location.href = '/admin';
          }
        }
        
        // Redirect admin users to admin dashboard if they're on login or dashboard
        if (isAdmin && (window.location.pathname === '/login' || window.location.pathname === '/dashboard')) {
          console.log('🚀 AuthContext redirecting admin to /admin');
          window.location.href = '/admin';
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [user?.id]);

  const signUp = async (email: string, password: string, metadata?: UserMetadata) => {
    setLoading(true);
    try {
      const result = await auth.signUp(email, password, metadata);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await auth.signIn(email, password);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const result = await auth.signOut();
      return result;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    signUp,
    signIn,
    signOut,
    checkAdminStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 