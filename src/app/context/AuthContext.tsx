import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from './VerificationContext';

export interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const fetchCurrentUser = async (token: string): Promise<User | null> => {
    const endpoint = API_BASE_URL ? `${API_BASE_URL}/api/auth/me` : '/api/auth/me';
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return (await response.json()) as User;
      } else {
        // Token is invalid/expired
        localStorage.removeItem('access_token');
        return null;
      }
    } catch {
      localStorage.removeItem('access_token');
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        const currentUser = await fetchCurrentUser(token);
        if (currentUser) {
          setUser(currentUser);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setError(null);
    setLoading(true);
    const endpoint = API_BASE_URL ? `${API_BASE_URL}/api/auth/login` : '/api/auth/login';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errData = await response.text();
        let errMsg = 'Login failed. Please check your credentials.';
        try {
          const parsed = JSON.parse(errData);
          if (parsed.detail) errMsg = parsed.detail;
        } catch {
          if (errData) errMsg = errData;
        }
        throw new Error(errMsg);
      }

      const data = await response.json() as { access_token: string };
      localStorage.setItem('access_token', data.access_token);
      
      const currentUser = await fetchCurrentUser(data.access_token);
      if (currentUser) {
        setUser(currentUser);
      } else {
        throw new Error('Could not fetch user info after login.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string, role: string = 'candidate') => {
    setError(null);
    setLoading(true);
    const endpoint = API_BASE_URL ? `${API_BASE_URL}/api/auth/register` : '/api/auth/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, role }),
      });

      if (!response.ok) {
        const errData = await response.text();
        let errMsg = 'Registration failed.';
        try {
          const parsed = JSON.parse(errData);
          if (parsed.detail) errMsg = parsed.detail;
        } catch {
          if (errData) errMsg = errData;
        }
        throw new Error(errMsg);
      }

      // Auto-login after registration or let user login manually
      // Usually logging in right away is standard:
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    // Also remove legacy keys to be clean
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('pathai_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        error,
        clearError,
      }}
    >
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
