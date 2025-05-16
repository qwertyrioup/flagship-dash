"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { validateTokenAndGetUser } from '@/api/auth';
import { setCookie, deleteCookie, getCookie } from 'cookies-next';
import jwt from 'jsonwebtoken';

interface Laboratory {
  _id: string;
  name: string;
  description: string;
  company_university: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  discount?: string;
}

interface Company {
  _id: string;
  name: string;
  type: string;
  domainName: string;
  address?: string;
  email?: string;
  discount?: string;
  labDepartments: string[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  phoneNumber: string;
  country: string;
  address: string;
  company_universityName?: Company;
  state: string;
  city: string;
  zipCode: string;
  isPublic: boolean;
  isVerified: boolean;
  isBanned: boolean;
  firstLogin: boolean;
  isEmailVerified: boolean;
  role?: Role;
  createdAt: string;
  updatedAt: string;
  __v: number;
  discount?: string;
  laboratory_department?: Laboratory;
  cloakings?: number[]; // Array of supplier IDs that the user has access to
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

interface LoginCredentials {
  token: string;
  user: User;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  revalidateAuth: () => Promise<boolean>;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Function to check if token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const decoded = (jwt as any).decode(token) as { exp: number };
      if (!decoded || !decoded.exp) return true;
      
      // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  // Define logout before revalidateAuth since it's used by revalidateAuth
  const logout = useCallback(() => {
    // Clear state
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    
    // Clear cookies with the same options used when setting
    deleteCookie('auth_token', {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    // Clear any other auth-related data from localStorage
    localStorage.removeItem('auth_token');
    
    // Redirect to root
    router.push('/');
  }, [router]);

  // Define revalidateAuth before using it in useEffect
  const revalidateAuth = useCallback(async (): Promise<boolean> => {
    const token = getCookie('auth_token');
    if (!token) {
      logout();
      return false;
    }

    // Check token expiration
    if (isTokenExpired(token as string)) {
      console.log('Token expired, logging out...');
      logout();
      return false;
    }
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Call the server action to validate token and get user data
      const response = await validateTokenAndGetUser(token as string);
      
      if (response.success && response.body?.user) {
        // Update state with new user data
        setState({
          user: response.body.user,
          token: token as string,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (error) {
      console.error('Auth validation error:', error);
      logout();
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [logout]);

  // Load auth state from cookie on initial render
  useEffect(() => {
    const loadInitialAuth = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const token = getCookie('auth_token');
        
        if (token) {
          // Check token expiration immediately
          if (isTokenExpired(token as string)) {
            console.log('Token expired on initial load, logging out...');
            logout();
            return;
          }

          // Set initial state
          setState(prev => ({
            ...prev,
            token: token as string,
            isAuthenticated: true,
            isLoading: true
          }));
          
          // Immediately revalidate the auth token
          try {
            await revalidateAuth();
          } catch (error) {
            console.error('Failed to revalidate auth on initial load:', error);
            logout();
          }
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error loading auth from cookie:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
      
      setIsInitialized(true);
    };
    
    loadInitialAuth();
  }, [revalidateAuth, logout]);

  // Set up periodic token validation
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const validateInterval = setInterval(() => {
      const token = getCookie('auth_token');
      if (!token || isTokenExpired(token as string)) {
        console.log('Token expired during periodic check, logging out...');
        logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(validateInterval);
  }, [state.isAuthenticated, logout]);

  // Revalidate authentication on route changes
  useEffect(() => {
    if (state.isAuthenticated && state.token) {
      revalidateAuth().catch(error => {
        console.error('Error during auth revalidation on route change:', error);
      });
    }
  }, [pathname, revalidateAuth, state.isAuthenticated, state.token]);

  const login = async ({ token, user }: LoginCredentials): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Set cookie with token
      setCookie('auth_token', token, {
        maxAge: 365 * 24 * 60 * 60, // 365 days
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      setState({
        user: user,
        token: token,
        isAuthenticated: true,
        isLoading: false,
      });
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      revalidateAuth,
    }}>
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
