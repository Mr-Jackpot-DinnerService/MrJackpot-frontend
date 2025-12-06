import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AuthService, UserService, type AuthResponse } from '../services';

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
  updateProfile: (data: Partial<User>) => Promise<void>;
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

            // 토큰 유효성 간단 테스트: 인증이 필요한 API 호출로 확인
            try {
              // 인증이 필요한 API 호출로 토큰 유효성 확인
              const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/cart`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.status === 401) {
                console.warn('[AuthContext] 토큰이 만료됨 - 자동 로그아웃');
                AuthService.logout();
                localStorage.removeItem('user');
                // 로그인 페이지로 리다이렉트
                if (!window.location.pathname.includes('/login')) {
                  window.location.href = '/login';
                }
                return;
              }

              setUser(parsedUser);
            } catch (apiError) {
              console.warn('[AuthContext] API 호출 실패 - 자동 로그아웃');
              AuthService.logout();
              localStorage.removeItem('user');
              if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
              }
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

    // 5분마다 토큰 유효성 확인
    const tokenValidationInterval = setInterval(async () => {
      const token = AuthService.getCurrentToken();
      const currentUser = localStorage.getItem('user');

      if (token && currentUser) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/cart`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.status === 401) {
            console.warn('[AuthContext] 정기 검사에서 토큰 만료 감지 - 자동 로그아웃');
            setUser(null);
            AuthService.logout();
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
        } catch (error) {
          console.error('[AuthContext] 정기 토큰 검사 실패:', error);
        }
      }
    }, 5 * 60 * 1000); // 5분마다 실행

    return () => clearInterval(tokenValidationInterval);
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

  const updateProfile = async (data: Partial<User>) => {
    if (!user) {
      return;
    }

    try {
      let updatedUser = { ...user, ...data };

      if (data.name !== undefined || data.phone !== undefined) {
        const response = await UserService.updateProfile({
          name: data.name ?? user.name,
          phone: data.phone ?? user.phone,
        });

        updatedUser = {
          ...updatedUser,
          name: response.name,
          phone: response.phone,
          email: response.email,
          address: response.address,
        };
      }

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
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
