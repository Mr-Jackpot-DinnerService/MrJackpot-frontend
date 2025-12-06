import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { UserService } from '../../services';

export default function EditProfile() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        name: formData.name,
        phone: formData.phone,
      });
      toast.success('정보가 수정되었습니다.');
      navigate('/customer/mypage');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('정보 수정에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value,
    }));
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const showError = (message: string) => {
      setPasswordSuccess(null);
      setPasswordError(message);
      toast.error(message);
    };

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showError('모든 비밀번호 입력란을 채워주세요.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showError('새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordForm.newPassword === passwordForm.currentPassword) {
      showError('새 비밀번호는 기존 비밀번호와 달라야 합니다.');
      return;
    }

    try {
      setPasswordSubmitting(true);
      await UserService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('비밀번호가 변경되었습니다.');
      setPasswordError(null);
      setPasswordSuccess('비밀번호가 정상적으로 변경되었습니다.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Failed to change password:', error);
      let serverMessage = error.message ?? '비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해 주세요.';
      if (typeof error.response === 'string' && error.response) {
        try {
          const parsed = JSON.parse(error.response);
          if (parsed?.message) {
            serverMessage = parsed.message;
          } else {
            serverMessage = error.response;
          }
        } catch {
          serverMessage = error.response;
        }
      }
      setPasswordSuccess(null);
      setPasswordError(serverMessage);
      toast.error(serverMessage);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">정보 수정</h1>

      <div className="bg-white border rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>



          <div>
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/customer/mypage')}
            >
              취소
            </Button>
            <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">
              저장
            </Button>
          </div>
        </form>

        <div className="border-t mt-6 pt-6">
          <h3 className="mb-4">비밀번호 변경</h3>
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div>
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordInputChange}
              />
            </div>
            <div>
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordInputChange}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordInputChange}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={passwordSubmitting}
            >
              {passwordSubmitting ? '변경 중...' : '비밀번호 변경'}
            </Button>
            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-green-600">{passwordSuccess}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
