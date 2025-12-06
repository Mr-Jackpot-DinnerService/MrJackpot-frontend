import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { signup, user } = useAuth();
  const navigate = useNavigate();

  // 이미 로그인된 사용자는 홈으로 리다이렉트
  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const trimmedUsername = formData.username.trim();
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedConfirm = formData.confirmPassword.trim();

    if (!trimmedUsername) {
      newErrors.username = '아이디를 입력해주세요.';
    } else if (!/^[a-zA-Z0-9_-]{4,20}$/.test(trimmedUsername)) {
      newErrors.username = '아이디는 4~20자의 영문/숫자/-/_만 사용할 수 있습니다.';
    }
    if (!trimmedName) newErrors.name = '이름을 입력해주세요.';
    if (!trimmedEmail) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(trimmedEmail)) {
      newErrors.email = '올바른 이메일 주소를 입력해주세요.';
    }
    if (!trimmedPhone) newErrors.phone = '전화번호를 입력해주세요.';
    if (!trimmedPassword) newErrors.password = '비밀번호를 입력해주세요.';
    if (!trimmedConfirm) newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';

    if (!newErrors.password && trimmedPassword.length < 6) {
      newErrors.password = '비밀번호는 6자 이상이어야 합니다.';
    }
    if (!newErrors.password && !newErrors.confirmPassword && trimmedPassword !== trimmedConfirm) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error('필수 항목을 확인해주세요.');
      return;
    }

    setSubmitError(null);
    setLoading(true);
    try {
      const signupData = {
        username: trimmedUsername,
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        phone: trimmedPhone,
        address: formData.address || undefined,
      };

      await signup(signupData);
      toast.success('회원가입이 완료되었습니다!');
      navigate('/');
    } catch (error: any) {
      console.error('Signup failed:', error);
      let message = error.message || '회원가입에 실패했습니다. 다시 시도해주세요.';
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
      setSubmitError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setErrors(prev => ({
      ...prev,
      [name]: '',
    }));
    setSubmitError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/">
            <h1 className="text-3xl text-red-600 mb-2 font-serif font-bold">Mr. DaeBak</h1>
          </Link>
          <p className="text-gray-600">회원가입</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="username">사용자 아이디</Label>
              <Input
                id="username"
                name="username"
                placeholder="영문, 숫자 조합"
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
                />
              {errors.username && <p className="text-sm text-red-600 mt-1">{errors.username}</p>}
            </div>

            <div>
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                name="name"
                placeholder="홍길동"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
            </div>

            <div>
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
            </div>

            <div>
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="010-1234-5678"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <Label htmlFor="address">주소 (선택)</Label>
              <Input
                id="address"
                name="address"
                placeholder="서울시 강남구 테헤란로 123"
                value={formData.address}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
              {loading ? '가입 중...' : '회원가입'}
            </Button>

            {submitError && (
              <p className="text-sm text-red-600 text-center">{submitError}</p>
            )}

            <div className="text-center">
              <Link to="/login" className="text-sm text-gray-600 hover:text-red-600">
                이미 계정이 있으신가요? 로그인
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
