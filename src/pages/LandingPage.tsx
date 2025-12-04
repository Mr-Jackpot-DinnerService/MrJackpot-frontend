import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Bike, Store, MapPin, Utensils, Mic } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Button } from '../components/ui/button';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { OrderService, type Order } from '../services';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../components/ui/carousel";
import { Card, CardContent } from "../components/ui/card";

// 주문 데이터를 표시용으로 변환하는 함수
const convertOrderToDisplay = (order: Order) => {
  const firstItem = order.items[0];
  const itemNames = order.items.map(item => item.dinnerType.description);

  return {
    id: order.id,
    items: itemNames,
    date: new Date(order.orderTime).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\./g, '.'),
    price: `${order.finalPrice.toLocaleString()}원`,
    image: firstItem?.dinnerType.imageUrl || '/placeholder-menu-image.jpg'
  };
};

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // 직원이 루트 페이지에 접근했을 때 직원 대시보드로 리다이렉트
  useEffect(() => {
    if (!loading && user && (user.role === 'KITCHEN_STAFF' || user.role === 'DELIVERY_STAFF')) {
      console.log('Redirecting staff to dashboard:', user.role);
      navigate('/staff/orders', { replace: true });
    }
  }, [user, loading, navigate]);

  // 최근 주문 내역 로드
  useEffect(() => {
    const loadRecentOrders = async () => {
      if (!user) {
        setRecentOrders([]);
        return;
      }

      try {
        setLoadingOrders(true);
        const orders = await OrderService.getMyOrders();

        // 최근 5개 주문만 가져오기
        const recentOrdersData = orders
          .slice(0, 5)
          .map(convertOrderToDisplay);

        setRecentOrders(recentOrdersData);
      } catch (error) {
        console.error('최근 주문 내역 로드 실패:', error);
        // 에러 발생시 빈 배열로 설정
        setRecentOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };

    loadRecentOrders();
  }, [user]);

  // 로딩 중이거나 직원인 경우 로딩 화면 표시
  if (loading || (user && (user.role === 'KITCHEN_STAFF' || user.role === 'DELIVERY_STAFF'))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? '로딩 중...' : '직원 대시보드로 이동 중...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Address Alert */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 text-center">
              <MapPin className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="text-gray-700">
                {!user ? "로그인을 해 주세요." : (user.address || "기본 주소를 등록해 주세요.")}
              </span>
            </div>
          </div>
        </div>

        {/* Order Type Buttons */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Link to="/customer/menu?type=delivery">
              <Button className="w-full h-24 bg-red-600 hover:bg-red-700 text-white text-xl rounded-lg flex items-center justify-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <Utensils className="h-8 w-8 text-red-600" />
                </div>
                <span>메뉴에서 고르기</span>
                <div className="ml-auto">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">→</span>
                  </div>
                </div>
              </Button>
            </Link>

            <Link to="/customer/voice-order">
              <Button className="w-full h-24 bg-red-600 hover:bg-red-700 text-white text-xl rounded-lg flex items-center justify-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <Mic className="h-8 w-8 text-red-600" />
                </div>
                <span>음성으로 주문하기</span>
                <div className="ml-auto">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">→</span>
                  </div>
                </div>
              </Button>
            </Link>
          </div>

          {/* Recent Orders Carousel */}
          {user && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xl font-bold">최근 주문 내역</h2>
                <Link to="/customer/order-history" className="text-sm text-gray-500 hover:text-red-600">
                  전체보기
                </Link>
              </div>

              {loadingOrders ? (
                <div className="flex justify-center items-center h-32">
                  <div className="text-gray-600">주문 내역을 불러오는 중...</div>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="flex justify-center items-center h-32">
                  <div className="text-gray-600">최근 주문 내역이 없습니다.</div>
                </div>
              ) : (
                <div className="px-12">
                  <Carousel
                    opts={{
                      align: "start",
                      loop: false,
                    }}
                    className="w-full"
                  >
                    <CarouselContent>
                      {recentOrders.map((order) => (
                        <CarouselItem key={order.id} className="md:basis-1/2 lg:basis-1/4">
                          <Card className="border hover:shadow-md transition-shadow cursor-pointer h-full">
                            <CardContent className="p-4">
                              <div className="aspect-video relative mb-3 rounded-md overflow-hidden">
                                <ImageWithFallback
                                  src={order.image}
                                  alt={order.items[0]}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="space-y-2">
                                <div className="h-12 overflow-hidden">
                                  <h3 className="font-medium text-sm line-clamp-2">
                                    {order.items.join(", ")}
                                  </h3>
                                </div>
                                <div className="flex justify-between items-center text-sm text-gray-500">
                                  <span>{order.date}</span>
                                  <span className="font-semibold text-red-600">{order.price}</span>
                                </div>
                              </div>
                              <Button variant="outline" className="w-full mt-3 text-xs h-8">
                                재주문
                              </Button>
                            </CardContent>
                          </Card>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                </div>
              )}
            </div>
          )}

          {/* Promotional Banner */}
          <div className="bg-gradient-to-r from-red-900 to-red-700 rounded-lg overflow-hidden">
            <div className="p-8 md:p-12 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl md:text-4xl mb-4 font-serif">Mr. DaeBak</h2>
                  <p className="text-xl mb-6 italic">
                    "특별한 날에 집에서 편안히 보내면서<br/>
                    당신의 소중한 사람을 감동시켜라"
                  </p>
                  <p className="text-lg">
                    <span className="bg-yellow-400 text-red-900 px-4 py-2 rounded font-bold">
                      회원 가입 시 첫 주문 10% 할인
                    </span>
                  </p>
                </div>
                <div className="hidden md:block">
                  <ImageWithFallback 
                    src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop"
                    alt="Premium Dinner"
                    className="w-64 h-48 object-cover rounded-lg shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
