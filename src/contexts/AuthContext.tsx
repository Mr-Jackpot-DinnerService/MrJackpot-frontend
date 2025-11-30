import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  role: 'customer' | 'staff';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: 'customer' | 'staff') => Promise<void>;
  logout: () => void;
  signup: (data: Omit<User, 'id' | 'role'> & { password: string }) => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string, role: 'customer' | 'staff' = 'customer') => {
    // Mock login
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser({
      id: '1',
      name: '홍길동',
      email,
      phone: '010-1234-5678',
      address: '서울시 강남구 테헤란로 123',
      role,
    });
  };

  const logout = () => {
    setUser(null);
  };

  const signup = async (data: Omit<User, 'id' | 'role'> & { password: string }) => {
    // Mock signup
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser({
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      role: 'customer',
    });
  };

  const updateProfile = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, updateProfile }}>
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
