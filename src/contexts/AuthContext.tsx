import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AuthService, type AuthResponse } from '../services';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  role: 'CUSTOMER' | 'STAFF';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (data: {
    username: string;
    password: string;
    name: string;
    email: string;
    phone: string;
    address?: string;
  }) => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 페이지 로드 시 토큰 확인하여 로그인 상태 복원
  useEffect(() => {
    const token = AuthService.getCurrentToken();
    if (token) {
      // TODO: 토큰이 유효한지 확인하는 API 호출 필요
      // 현재는 토큰이 있으면 로그인된 것으로 간주
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      const response: AuthResponse = await AuthService.login({ username, password });
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  const signup = async (data: {
    username: string;
    password: string;
    name: string;
    email: string;
    phone: string;
    address?: string;
  }) => {
    try {
      setLoading(true);
      const response: AuthResponse = await AuthService.signup(data);
      setUser(response.user);
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, updateProfile, loading }}>
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
