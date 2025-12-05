import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { User, MapPin, CreditCard, History, Settings, Crown } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { OrderService, type Order } from '../../services';

export default function MyPage() {
  const { user } = useAuth();
  const [orderCount, setOrderCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // 주문 내역 로드하여 주문 횟수 계산
  useEffect(() => {
    const loadOrderCount = async () => {
      if (!user) {
        setOrderCount(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const orders = await OrderService.getMyOrders();
        // 모든 주문 횟수 (취소/거절된 주문 제외)
        const validOrders = orders.filter(order =>
          !['CANCELLED', 'REJECTED', 'REFUNDED'].includes(order.status)
        );
        setOrderCount(validOrders.length);
        console.log('유효한 주문 횟수:', validOrders.length);
      } catch (error) {
        console.error('주문 내역 로드 실패:', error);
        setOrderCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadOrderCount();
  }, [user]);

  // 회원 등급 계산 함수
  const getUserGrade = (orderCount: number): { grade: string; color: string; bgColor: string } => {
    if (orderCount >= 10) {
      return {
        grade: 'VIP',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50'
      };
    } else {
      return {
        grade: '일반',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50'
      };
    }
  };

  const userGrade = getUserGrade(orderCount);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">마이 페이지</h1>

      {user && (
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl">{user.name}</h2>
                {userGrade.grade === 'VIP' && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${userGrade.bgColor}`}>
                    <Crown className={`w-4 h-4 ${userGrade.color}`} />
                    <span className={`text-sm font-semibold ${userGrade.color}`}>VIP</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600">{user.email || '등록된 이메일이 없습니다'}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">전화번호</p>
                <p>{user.phone || '등록된 전화번호가 없습니다'}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">주소</p>
                <p>{user.address || '등록된 주소가 없습니다'}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Link to="/customer/order-history">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <History className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="mb-1">주문 내역</h3>
                <p className="text-sm text-gray-600">지난 주문을 확인하세요</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/customer/address-management">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="mb-1">배송지 관리</h3>
                <p className="text-sm text-gray-600">배송지를 관리하세요</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/customer/payment-management">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="mb-1">결제 수단</h3>
                <p className="text-sm text-gray-600">결제 수단을 관리하세요</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/customer/edit-profile">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Settings className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="mb-1">정보 수정</h3>
                <p className="text-sm text-gray-600">회원 정보를 수정하세요</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <Card className="p-6">
        <h3 className="mb-4">활동 정보</h3>
        <div className="grid md:grid-cols-2 gap-4 text-center">
          <div className="bg-red-50 rounded-lg p-4">
            {loading ? (
              <p className="text-2xl text-gray-400 mb-1">...</p>
            ) : (
              <p className="text-2xl text-red-600 mb-1">{orderCount}</p>
            )}
            <p className="text-sm text-gray-600">주문 횟수</p>
          </div>
          <div className={`rounded-lg p-4 ${userGrade.bgColor}`}>
            {loading ? (
              <p className="text-2xl text-gray-400 mb-1">...</p>
            ) : (
              <div className="flex items-center justify-center gap-2 mb-1">
                {userGrade.grade === 'VIP' && (
                  <Crown className={`w-6 h-6 ${userGrade.color}`} />
                )}
                <p className={`text-2xl mb-0 ${userGrade.color}`}>{userGrade.grade}</p>
              </div>
            )}
            <p className="text-sm text-gray-600">
              회원 등급 {userGrade.grade === '일반' && orderCount < 10 && `(VIP까지 ${10 - orderCount}회)`}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
