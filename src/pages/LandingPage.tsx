import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { MapPin, Utensils, Mic } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStock } from '../contexts/StockContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Button } from '../components/ui/button';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { OrderService, CartService, MenuService, AddressService, type Order, type MenuReference } from '../services';
import { extractShortageInfoFromError } from '../utils/stockUtils';
import { getComponentDisplayName } from '../utils/componentNames';
import { toast } from 'sonner';
import { getDinnerImageSrc } from '../utils/menuImages';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../components/ui/carousel";
import { Card, CardContent } from "../components/ui/card";

// enum 문자열을 한글로 변환하는 함수들
const getDinnerTypeName = (dinnerType: string): string => {
  const dinnerTypeNames: Record<string, string> = {
    'VALENTINE_DINNER': '발렌타인 디너',
    'FRENCH_DINNER': '프랑스식 디너',
    'ENGLISH_DINNER': '영국식 디너',
    'CHAMP_FEAST_DINNER': '샴페인 축제 디너'
  };
  return dinnerTypeNames[dinnerType] || dinnerType;
};

// 주문 데이터를 표시용으로 변환하는 함수
const convertOrderToDisplay = (order: Order) => {
  const itemNames = order.items.map(item => getDinnerTypeName(item.dinnerType));

  const primaryDinnerCode = order.items[0]?.dinnerType;

  return {
    id: order.orderId,
    originalOrder: order, // 재주문을 위한 원본 주문 데이터
    items: itemNames,
    date: new Date(order.orderedAt).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\./g, '.'),
    price: `${order.totalPrice.toLocaleString()}원`,
    image: getDinnerImageSrc(primaryDinnerCode)
  };
};

const buildAbsoluteComponentMap = (components: Array<{ componentCode: string; quantity: number }>) => {
  return components.reduce<Record<string, number>>((acc, comp) => {
    acc[comp.componentCode] = comp.quantity;
    return acc;
  }, {});
};

const buildReorderComponentModifications = (
  dinnerType: string,
  components: Array<{ componentCode: string; quantity: number }> | undefined,
  menuReference: MenuReference | null
) => {
  const absoluteMap = buildAbsoluteComponentMap(components || []);
  if (!menuReference) {
    return absoluteMap;
  }
  const dinner = menuReference.dinnerTypes.find(d => d.code === dinnerType);
  if (!dinner) {
    return absoluteMap;
  }
  const modifications = { ...absoluteMap };
  dinner.recipe.forEach(recipeItem => {
    if (!(recipeItem.componentCode in modifications)) {
      modifications[recipeItem.componentCode] = 0;
    }
  });
  return modifications;
};

const buildDiffModifications = (
  dinnerType: string,
  absoluteMap: Record<string, number>,
  menuReference: MenuReference | null
) => {
  if (!menuReference) {
    return {};
  }

  const dinner = menuReference.dinnerTypes.find(d => d.code === dinnerType);
  if (!dinner) {
    return {};
  }

  const diffs: Record<string, number> = {};
  const baseMap = dinner.recipe.reduce<Record<string, number>>((acc, recipeItem) => {
    acc[recipeItem.componentCode] = recipeItem.quantity;
    return acc;
  }, {});

  const codes = new Set([
    ...Object.keys(baseMap),
    ...Object.keys(absoluteMap)
  ]);

  codes.forEach(code => {
    const actual = absoluteMap[code] ?? 0;
    const base = baseMap[code] ?? 0;
    const diff = actual - base;
    if (diff !== 0) {
      diffs[code] = diff;
    }
  });

  return diffs;
};

const calculateReorderUnitPrice = (
  dinnerType: string,
  servingStyle: string,
  quantity: number,
  diffModifications: Record<string, number>,
  menuReference: MenuReference | null,
  fallbackAverageUnit: number
) => {
  if (!menuReference) {
    return Math.round(fallbackAverageUnit / 100) * 100;
  }
  const totalPrice = MenuService.calculateTotalPrice(
    dinnerType,
    servingStyle,
    quantity,
    diffModifications,
    menuReference
  );
  const unitPrice = quantity > 0 ? totalPrice / quantity : totalPrice;
  return Math.round(unitPrice / 100) * 100;
};

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { registerShortage } = useStock();
  const navigate = useNavigate();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [menuReference, setMenuReference] = useState<MenuReference | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  const componentStockMap = useMemo(() => {
    if (!menuReference) {
      return {};
    }
    return menuReference.componentTypes.reduce<Record<string, number>>((acc, component) => {
      acc[component.code] = component.stock;
      return acc;
    }, {});
  }, [menuReference]);

  // 직원이 루트 페이지에 접근했을 때 직원 대시보드로 리다이렉트
  useEffect(() => {
    if (!loading && user && (user.role === 'KITCHEN_STAFF' || user.role === 'DELIVERY_STAFF')) {
      console.log('Redirecting staff to dashboard:', user.role);
      navigate('/staff/orders', { replace: true });
    }
  }, [user, loading, navigate]);

  // 기본 주소 로드
  useEffect(() => {
    let isMounted = true;

    const loadDefaultAddress = async () => {
      if (!user || user.role !== 'CUSTOMER') {
        if (isMounted) {
          setDefaultAddress(null);
        }
        return;
      }
      try {
        setAddressLoading(true);
        const addresses = await AddressService.getAddresses();
        if (!isMounted) {
          return;
        }
        const defaultAddr = addresses.find(addr => addr.isDefault);
        const fallbackAddr = defaultAddr?.address || addresses[0]?.address || null;
        setDefaultAddress(fallbackAddr);
      } catch (error) {
        console.error('기본 주소 로드 실패:', error);
        if (isMounted) {
          setDefaultAddress(user.address || null);
        }
      } finally {
        if (isMounted) {
          setAddressLoading(false);
        }
      }
    };

    loadDefaultAddress();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // 최근 주문 내역 로드
  useEffect(() => {
    const loadRecentOrders = async () => {
      if (!user) {
        setRecentOrders([]);
        return;
      }

      try {
        setLoadingOrders(true);

        // 병렬로 주문 내역과 메뉴 참조 데이터 로드
        const [orders, menuRef] = await Promise.all([
          OrderService.getMyOrders(),
          MenuService.getMenuReferences().catch(() => null) // 실패해도 계속 진행
        ]);

        setMenuReference(menuRef);

        // 배달 완료된 주문만 필터링하고 최근 10개만 가져오기
        const deliveredOrders = orders
          .filter(order => order.status === 'DELIVERED')
          .slice(0, 10)
          .map(convertOrderToDisplay);

        setRecentOrders(deliveredOrders);
        console.log('최근 배달 완료 주문:', deliveredOrders);
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

  // 재주문 함수
  const getOrderShortageMessage = (orderData?: Order | null) => {
    if (!orderData || !menuReference) {
      return null;
    }

    const usage: Record<string, number> = {};
    orderData.items?.forEach(item => {
      const multiplier = item.quantity ?? 1;
      item.components?.forEach(comp => {
        const required = (comp.quantity ?? 0) * multiplier;
        usage[comp.componentCode] = (usage[comp.componentCode] || 0) + required;
      });
    });

    for (const [code, required] of Object.entries(usage)) {
      const stock = componentStockMap[code];
      if (typeof stock === 'number' && required > stock) {
        const displayName = getComponentDisplayName(code);
        return `${displayName} 재고 부족 (필요 ${required}개, 보유 ${stock}개)`;
      }
    }

    return null;
  };

  const handleReorder = async (order: any) => {
    const shortageMessage = getOrderShortageMessage(order?.originalOrder);
    if (shortageMessage) {
      toast.error(shortageMessage);
      return;
    }

    if (!menuReference) {
      toast.error('메뉴 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      setLoadingOrders(true);
      console.log('재주문 시작:', order.originalOrder);

      // 주문의 각 아이템을 장바구니에 추가
      for (const item of order.originalOrder.items) {
        const componentModifications = buildReorderComponentModifications(
          item.dinnerType,
          item.components,
          menuReference
        );
        const diffModifications = buildDiffModifications(
          item.dinnerType,
          componentModifications,
          menuReference
        );

        // 가격 계산 (단가 기준)
        const itemCount = order.originalOrder.items.reduce((sum, orderItem) => sum + orderItem.quantity, 0);
        const averageUnit = itemCount > 0 ? order.originalOrder.totalPrice / itemCount : 0;
        const calculatedPrice = calculateReorderUnitPrice(
          item.dinnerType,
          item.servingStyle,
          item.quantity,
          diffModifications,
          menuReference,
          averageUnit
        );

        console.log(`아이템 ${item.dinnerType} - 계산된 가격: ${calculatedPrice}, 수량: ${item.quantity}`);

        // 장바구니에 추가
        await CartService.addToCart({
          dinnerType: item.dinnerType,
          servingStyle: item.servingStyle,
          quantity: item.quantity,
          componentModifications: componentModifications,
          calculatedPrice: calculatedPrice
        });
      }

      toast.success('주문 내역이 장바구니에 추가되었습니다!');
      // 장바구니 페이지로 이동
      navigate('/customer/cart');
    } catch (error: any) {
      console.error('재주문 실패:', error);
      let message = '재주문에 실패했습니다. 다시 시도해주세요.';
      if (typeof error?.response === 'string' && error.response) {
        try {
          const parsed = JSON.parse(error.response);
          message = parsed?.message || error.response;
        } catch {
          message = error.response;
        }
      } else if (error?.message) {
        message = error.message;
      }
      const shortageInfo = extractShortageInfoFromError(error) || extractShortageInfoFromError({ response: message });
      if (shortageInfo) {
        message = shortageInfo.label;
        registerShortage(shortageInfo);
      }
      toast.error(message);
    } finally {
      setLoadingOrders(false);
    }
  };

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
          <button
            type="button"
            onClick={() => navigate('/customer/address-management')}
            className="bg-white border rounded-lg p-4 w-full text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-center gap-2 text-center text-gray-700">
              <MapPin className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span>
                {!user
                  ? '로그인을 해 주세요.'
                  : addressLoading
                    ? '기본 주소를 불러오는 중...'
                    : (defaultAddress || '기본 주소를 등록해 주세요.')}
              </span>
            </div>
          </button>
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
                      {recentOrders.map(order => {
                        const shortageMessage = getOrderShortageMessage(order.originalOrder);
                        return (
                          <CarouselItem key={order.id} className="md:basis-1/2 lg:basis-1/4">
                            <Card
                              className="border hover:shadow-md transition-shadow cursor-pointer h-full"
                              onClick={() => navigate('/customer/order-history', { state: { highlightOrderId: order.id } })}
                            >
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
                                <Button
                                  variant="outline"
                                  className="w-full mt-3 text-xs h-8"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleReorder(order);
                                  }}
                                  disabled={loadingOrders || !!shortageMessage}
                                >
                                  {shortageMessage || (loadingOrders ? '처리 중...' : '재주문')}
                                </Button>
                              </CardContent>
                            </Card>
                          </CarouselItem>
                        );
                      })}
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
                      VIP 고객 10% 할인
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
