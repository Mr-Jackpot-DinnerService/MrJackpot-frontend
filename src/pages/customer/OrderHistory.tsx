import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { OrderService, CartService, MenuService, type Order, type MenuReference } from '../../services';
import { toast } from 'sonner';
import { useStock } from '../../contexts/StockContext';
import { extractShortageInfoFromError } from '../../utils/stockUtils';
import { getComponentDisplayName } from '../../utils/componentNames';

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

export default function OrderHistory() {
  const navigate = useNavigate();
  const location = useLocation<{ highlightOrderId?: number }>();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuReference, setMenuReference] = useState<MenuReference | null>(null);
  const highlightOrderId = location.state?.highlightOrderId;
  const { registerShortage } = useStock();
  const componentStockMap = useMemo(() => {
    if (!menuReference) {
      return {};
    }
    return menuReference.componentTypes.reduce<Record<string, number>>((acc, component) => {
      acc[component.code] = component.stock;
      return acc;
    }, {});
  }, [menuReference]);

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

        // 특정 주문 하이라이트 요청이 있을 때만 자동 펼치기 (일반적인 자동 펼치기는 제거)
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

  useEffect(() => {
    if (!highlightOrderId || loading || orders.length === 0) {
      return;
    }
    const highlightIdStr = highlightOrderId.toString();
    const targetExists = orders.some(order => order.orderId?.toString() === highlightIdStr);
    if (!targetExists) {
      return;
    }
    setExpandedOrders(new Set([highlightIdStr]));
    const timer = setTimeout(() => {
      const target = document.getElementById(`order-${highlightIdStr}`);
      if (target) {
        const offset = 80;
        const top = Math.max(target.getBoundingClientRect().top + window.scrollY - offset, 0);
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [highlightOrderId, loading, orders]);

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

  // 재주문 함수
  const handleReorder = async (order: Order) => {
    console.log('🔥 재주문 버튼 클릭됨!', order.orderId);

    const shortageMessage = getOrderShortageMessage(order);
    if (shortageMessage) {
      toast.error(shortageMessage);
      return;
    }

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
        const componentModifications = buildReorderComponentModifications(
          item.dinnerType,
          item.components,
          menuReference
        );
        console.log('📦 최종 componentModifications:', componentModifications);

        const diffModifications = buildDiffModifications(
          item.dinnerType,
          componentModifications,
          menuReference
        );

        // 가격 계산 (단가 기준)
        const itemCount = order.items.reduce((sum, orderItem) => sum + orderItem.quantity, 0);
        const averageUnit = itemCount > 0 ? order.totalPrice / itemCount : 0;
        const calculatedPrice = calculateReorderUnitPrice(
          item.dinnerType,
          item.servingStyle,
          item.quantity,
          diffModifications,
          menuReference,
          averageUnit
        );

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
            const shortageMessage = getOrderShortageMessage(order);
            const firstItemName = order.items.length > 0 ? getDinnerTypeName(order.items[0].dinnerType) : '주문 상품 없음';
            const additionalCount = Math.max(order.items.length - 1, 0);
            const isExpanded = expandedOrders.has(orderId.toString());
            const completedStates = ['DELIVERED', 'CANCELLED', 'REJECTED', 'REFUNDED'];
            const isActive = !completedStates.includes(order.status);
            const isLatest = index === 0;
            return (
              <Card
                key={orderId}
                id={`order-${orderId}`}
                className={`p-6 ${isActive ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
              >
                {/* 진행 중인 주문이면 헤더 추가 */}
                {isActive && (
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
                    {additionalCount > 0 ? `${firstItemName} 외 ${additionalCount}건` : firstItemName}
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
                      disabled={loading || !!shortageMessage}
                    >
                      {shortageMessage || (loading ? '처리 중...' : '재주문')}
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
