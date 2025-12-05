import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { OrderService, CartService, MenuService, type Order, type MenuReference } from '../../services';
import { toast } from 'sonner';

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

const getServingStyleName = (servingStyle: string): string => {
  const servingStyleNames: Record<string, string> = {
    'SIMPLE': '심플',
    'GRAND': '그랜드',
    'DELUXE': '디럭스'
  };
  return servingStyleNames[servingStyle] || servingStyle;
};

export default function OrderHistory() {
  const navigate = useNavigate();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuReference, setMenuReference] = useState<MenuReference | null>(null);

  // 주문 내역 및 메뉴 참조 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 주문 내역 로드
        const orderData = await OrderService.getMyOrders();

        // 메뉴 참조 데이터 로드 (별도로 처리)
        let menuRef = null;
        try {
          console.log('메뉴 참조 데이터 로드 시도...');
          menuRef = await MenuService.getMenuReferences();
          console.log('메뉴 참조 데이터 로드 성공:', menuRef);
        } catch (menuError) {
          console.error('메뉴 참조 데이터 로드 실패:', menuError);
          // 메뉴 참조 데이터 로드 실패해도 주문 내역은 보여줌
        }

        // 주문을 시간순으로 정렬 (최신순)
        const sortedOrders = orderData.sort((a, b) =>
          new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
        );
        setOrders(sortedOrders);
        setMenuReference(menuRef);
        console.log('내 주문 내역:', sortedOrders);

        // 가장 최근 주문이 진행 중이면 자동으로 펼쳐서 보여주기
        if (sortedOrders.length > 0) {
          const latestOrder = sortedOrders[0];
          const activeStates = ['PAID_PENDING', 'ACCEPTED', 'COOKING', 'COOK_DONE', 'ON_DELIVERY'];
          if (activeStates.includes(latestOrder.status)) {
            setExpandedOrders(new Set([latestOrder.orderId.toString()]));
          }
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        toast.error('데이터를 불러오는데 실패했습니다.');
        // 에러 발생시 빈 배열로 설정
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const toggleOrder = (orderId: number | string) => {
    const orderIdStr = orderId.toString();
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderIdStr)) {
      newExpanded.delete(orderIdStr);
    } else {
      newExpanded.add(orderIdStr);
    }
    setExpandedOrders(newExpanded);
  };

  // 재주문 함수
  const handleReorder = async (order: Order) => {
    console.log('🔥 재주문 버튼 클릭됨!', order.orderId);

    if (!menuReference) {
      console.error('메뉴 참조 데이터가 없습니다:', menuReference);
      toast.error('메뉴 정보가 없어 정확한 가격 계산이 어렵습니다. 그래도 진행하시겠습니까?');
      // 일단 메뉴 참조 없이도 진행하도록 함 (테스트용)
    }

    try {
      setLoading(true);
      console.log('재주문 시작:', order);
      console.log('메뉴 참조 데이터:', menuReference);

      // 주문의 각 아이템을 장바구니에 추가
      for (const item of order.items) {
        console.log('🔍 처리 중인 주문 아이템:', {
          dinnerType: item.dinnerType,
          servingStyle: item.servingStyle,
          quantity: item.quantity,
          components: item.components
        });

        // ComponentType enum 값들을 Record로 변환
        const componentModifications: Record<string, number> = {};
        item.components.forEach(comp => {
          console.log('🔧 컴포넌트 매핑:', comp.componentCode, '->', comp.quantity);
          componentModifications[comp.componentCode] = comp.quantity;
        });

        console.log('📦 최종 componentModifications:', componentModifications);

        // 가격 계산
        let calculatedPrice;
        if (menuReference) {
          // MenuService를 사용해서 가격 계산
          calculatedPrice = MenuService.calculateTotalPrice(
            item.dinnerType,
            item.servingStyle,
            item.quantity,
            componentModifications,
            menuReference
          );
        } else {
          // 메뉴 참조 데이터가 없으면 임시로 총액을 아이템 개수로 나눈 값 사용
          const itemCount = order.items.reduce((sum, orderItem) => sum + orderItem.quantity, 0);
          calculatedPrice = Math.round((order.totalPrice / itemCount) * item.quantity);
        }

        console.log(`아이템 ${item.dinnerType} - 계산된 가격: ${calculatedPrice}, 수량: ${item.quantity}`);

        const cartRequest = {
          dinnerType: item.dinnerType,
          servingStyle: item.servingStyle,
          quantity: item.quantity,
          componentModifications: componentModifications,
          calculatedPrice: calculatedPrice
        };

        console.log('🛒 장바구니에 전송할 데이터:', cartRequest);

        // 장바구니에 추가
        await CartService.addToCart(cartRequest);
      }

      toast.success('주문 내역이 장바구니에 추가되었습니다!');
      // 장바구니 페이지로 이동
      navigate('/customer/cart');
    } catch (error) {
      console.error('재주문 실패:', error);
      toast.error('재주문에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl mb-8">주문 내역</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">주문 내역을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">주문 내역</h1>

      {orders.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">주문 내역이 없습니다.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, index) => {
            // order.orderId가 undefined인 경우 안전하게 처리
            const orderId = order.orderId ?? index;
            const isExpanded = expandedOrders.has(orderId.toString());
            const isActive = ['PAID_PENDING', 'ACCEPTED', 'COOKING', 'COOK_DONE', 'ON_DELIVERY'].includes(order.status);
            const isLatest = index === 0;

            return (
              <Card
                key={orderId}
                className={`p-6 ${isActive && isLatest ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
              >
                {/* 최신 진행 중 주문이면 헤더 추가 */}
                {isActive && isLatest && (
                  <div className="mb-4 p-3 bg-red-100 rounded-lg border border-red-200">
                    <h3 className="text-red-800 font-semibold text-sm">🔥 현재 진행 중인 주문</h3>
                    <p className="text-red-600 text-xs mt-1">실시간 주문 상황을 확인하세요</p>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">주문번호: {order.orderId}</p>
                    <p className="text-sm text-gray-600">{order.orderedAt}</p>
                  </div>
                  <Badge className={OrderService.getStatusColorClass(order.status)}>
                    {OrderService.getStatusText(order.status)}
                  </Badge>
                </div>

                <div className="mb-4">
                  <p className="mb-2">
                    {order.items.length > 0 ?
                      `${getDinnerTypeName(order.items[0].dinnerType)} 외 ${order.items.length - 1}건` :
                      '주문 상품 없음'
                    }
                  </p>
                  <p className="text-xl text-red-600">{order.totalPrice.toLocaleString()}원</p>
                </div>

                {isExpanded && (
                  <div className="border-t pt-4 mb-4">
                    <h3 className="mb-2">주문 상세</h3>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="text-sm">
                          <span>
                            {getDinnerTypeName(item.dinnerType)} ({getServingStyleName(item.servingStyle)}) x {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => toggleOrder(orderId)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        접기
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        상세보기
                      </>
                    )}
                  </Button>
                  {order.status === 'DELIVERED' && (
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={() => handleReorder(order)}
                      disabled={loading}
                    >
                      {loading ? '처리 중...' : '재주문'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}