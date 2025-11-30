import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, User } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left Navigation */}
          <div className="hidden md:flex items-center gap-6 w-20">
            {/* Spacer to help center logo if needed, or just empty */}
          </div>

          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-red-600 text-2xl font-serif font-bold">Mr. DaeBak</span>
          </Link>

          {/* Right Navigation */}
          <div className="flex items-center gap-4">
            
            {user ? (
              <>
                <Button variant="outline" onClick={handleLogout}>
                  로그아웃
                </Button>
                <Link to="/customer/mypage">
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/signup" className="text-sm font-medium hover:text-red-600 underline underline-offset-4">
                  회원가입
                </Link>
                <Link to="/login">
                  <Button variant="outline">로그인</Button>
                </Link>
              </>
            )}

            <Link to="/customer/cart" className="relative">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </Button>
            </Link>

            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
