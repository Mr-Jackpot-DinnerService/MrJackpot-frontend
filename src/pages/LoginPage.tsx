import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  // 이미 로그인된 사용자는 대시보드로 리다이렉트
  React.useEffect(() => {
    if (user && !loading) {
      if (user.role === 'CUSTOMER') {
        navigate('/');
      } else if (user.role === 'KITCHEN_STAFF' || user.role === 'DELIVERY_STAFF') {
        navigate('/staff/orders');
      }
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      const msg = '아이디와 비밀번호를 모두 입력해주세요.';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setLocalLoading(true);
    try {
      await login(trimmedUsername, trimmedPassword);
      toast.success('로그인이 완료되었습니다.');
      setErrorMessage(null);
      // 네비게이션은 useEffect에서 처리
    } catch (error: any) {
      console.error('Login failed:', error);
      let message = error.message || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';
      if (typeof error.response === 'string' && error.response) {
        try {
          const parsed = JSON.parse(error.response);
          if (parsed?.message) {
            message = parsed.message;
          } else {
            message = error.response;
          }
        } catch {
          message = error.response;
        }
      }
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/">
            <h1 className="text-3xl text-red-600 mb-2 font-serif font-bold">Mr. DaeBak</h1>
          </Link>
          <p className="text-gray-600">프리미엄 디너 배달 서비스</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-center">로그인</h2>
              <p className="text-sm text-gray-600 text-center mt-2">고객 및 직원 모두 사용 가능</p>
            </div>
            <div>
              <Label htmlFor="username">사용자 아이디</Label>
              <Input
                id="username"
                type="text"
                placeholder="아이디를 입력해주세요"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || localLoading}
              />
            </div>

            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || localLoading}
              />
            </div>

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading || localLoading}>
              {loading || localLoading ? '로그인 중...' : '로그인'}
            </Button>

            {errorMessage && (
              <p className="text-sm text-red-600 text-center">{errorMessage}</p>
            )}

            <div className="text-center">
              <Link to="/signup" className="text-sm text-red-600 hover:underline">
                회원가입
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
