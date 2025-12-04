import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Package, LogOut } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';

export default function StaffDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <h1 className="text-2xl text-red-600 font-serif font-bold">Mr. DaeBak 직원</h1>
              <p className="text-sm text-gray-600">
                {user?.role === 'KITCHEN_STAFF' ? '주방 직원' :
                 user?.role === 'DELIVERY_STAFF' ? '배달 직원' : '직원'}
                ({user?.name})
              </p>
            </div>
            <nav className="flex gap-4">
              <Link to="/staff/orders">
                <Button
                  variant={location.pathname.includes('/orders') ? 'default' : 'ghost'}
                  className={location.pathname.includes('/orders') ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  주문 관리
                </Button>
              </Link>
              {/* KITCHEN_STAFF만 재고 관리 접근 가능 */}
              {user?.role === 'KITCHEN_STAFF' && (
                <Link to="/staff/inventory">
                  <Button
                    variant={location.pathname.includes('/inventory') ? 'default' : 'ghost'}
                    className={location.pathname.includes('/inventory') ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    재고 관리
                  </Button>
                </Link>
              )}
            </nav>
          </div>

          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
