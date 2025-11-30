import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent, role: 'customer' | 'staff') => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, role);
      if (role === 'customer') {
        navigate('/');
      } else {
        navigate('/staff/orders');
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
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
          <Tabs defaultValue="customer">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="customer">고객 로그인</TabsTrigger>
              <TabsTrigger value="staff">직원 로그인</TabsTrigger>
            </TabsList>

            <TabsContent value="customer">
              <form onSubmit={(e) => handleLogin(e, 'customer')} className="space-y-4">
                <div>
                  <Label htmlFor="customer-email">이메일</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="customer-password">비밀번호</Label>
                  <Input
                    id="customer-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                  {loading ? '로그인 중...' : '로그인'}
                </Button>

                <div className="text-center">
                  <Link to="/signup" className="text-sm text-red-600 hover:underline">
                    회원가입
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="staff">
              <form onSubmit={(e) => handleLogin(e, 'staff')} className="space-y-4">
                <div>
                  <Label htmlFor="staff-email">직원 이메일</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    placeholder="staff@mrdaebak.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="staff-password">비밀번호</Label>
                  <Input
                    id="staff-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                  {loading ? '로그인 중...' : '직원 로그인'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
