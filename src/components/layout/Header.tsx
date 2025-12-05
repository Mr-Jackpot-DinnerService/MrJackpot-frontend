import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, User } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();

  // items 변경 감지를 위한 로그
  React.useEffect(() => {
    const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
    console.log('[Header] 장바구니 상태 변경됨 - 고유 아이템 개수:', items.length, '총 수량:', totalQuantity);
    console.log('[Header] 현재 아이템들:', items.map(item => ({ id: item.id, name: item.name, quantity: item.quantity })));
  }, [items]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 items-center">
          {/* Left Navigation - 빈 공간 */}
          <div className="flex items-center justify-start">
            {/* 왼쪽 공간 - 필요시 네비게이션 추가 가능 */}
          </div>

          {/* Logo - 가운데 정렬 */}
          <div className="flex justify-center">
            <Link to="/" className="flex items-center">
              <span className="text-red-600 text-2xl font-serif font-bold">Mr. DaeBak</span>
            </Link>
          </div>

          {/* Right Navigation */}
          <div className="flex items-center justify-end gap-4">

            {user ? (
              <>
                {/* 직원인 경우 직원 대시보드 링크 표시 */}
                {(user.role === 'KITCHEN_STAFF' || user.role === 'DELIVERY_STAFF') && (
                  <Link to="/staff/orders">
                    <Button variant="ghost">
                      직원 대시보드
                    </Button>
                  </Link>
                )}

                <Button variant="outline" onClick={handleLogout}>
                  로그아웃
                </Button>

                {/* 고객인 경우에만 마이페이지 링크 표시 */}
                {user.role === 'CUSTOMER' && (
                  <Link to="/customer/mypage">
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
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

            {/* 고객인 경우에만 장바구니 표시 */}
            {user?.role === 'CUSTOMER' && (
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
            )}

            {/* 모바일 햄버거 메뉴 */}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
