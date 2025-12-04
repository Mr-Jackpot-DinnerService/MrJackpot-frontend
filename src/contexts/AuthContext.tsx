import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AuthService, type AuthResponse } from '../services';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  role: 'CUSTOMER' | 'KITCHEN_STAFF' | 'DELIVERY_STAFF';
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
  redirectToDashboard: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 페이지 로드 시 토큰 확인하여 로그인 상태 복원
  useEffect(() => {
    const initializeAuth = async () => {
      const token = AuthService.getCurrentToken();
      if (token) {
        // 로컬 스토리지에서 사용자 정보 복원
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);

            // 토큰 유효성 간단 테스트: 메뉴 API 호출로 확인
            try {
              // 가벼운 API 호출로 토큰 유효성 확인
              await fetch(`${import.meta.env.VITE_API_URL}/menus/references`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              setUser(parsedUser);
            } catch (apiError) {
              console.warn('토큰이 유효하지 않음 - 자동 로그아웃');
              AuthService.logout();
              localStorage.removeItem('user');
            }
          } catch (error) {
            console.error('Failed to parse saved user:', error);
            // 파싱 실패 시 토큰도 제거
            AuthService.logout();
          }
        } else {
          // 토큰은 있지만 사용자 정보가 없으면 로그아웃
          AuthService.logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      const response: AuthResponse = await AuthService.login({ username, password });

      // 백엔드 AuthResponse에서 모든 필요한 사용자 정보 제공
      const userWithCompleteData = {
        ...response.user,
        email: response.user.email || '',
        phone: response.user.phone || '',
        address: response.user.address || ''
      };

      setUser(userWithCompleteData);

      // 사용자 정보를 로컬 스토리지에 저장
      localStorage.setItem('user', JSON.stringify(userWithCompleteData));
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
    // 로컬 스토리지에서 사용자 정보 제거
    localStorage.removeItem('user');
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
      // 사용자 정보를 로컬 스토리지에 저장
      localStorage.setItem('user', JSON.stringify(response.user));
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

  const redirectToDashboard = () => {
    // 이 함수는 LoginPage에서 사용할 함수
    // 실제 리다이렉트는 LoginPage에서 처리
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, updateProfile, loading, redirectToDashboard }}>
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
