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

const getComponentDisplayName = (componentCode: string): string => {
  const componentNames: Record<string, string> = {
    'STEAK': '스테이크',
    'WINE': '와인',
    'COFFEE': '커피',
    'SALAD': '샐러드',
    'SCRAMBLED_EGG': '에그 스크램블',
    'BACON': '베이컨',
    'BREAD': '빵',
    'BAGUETTE': '바게트빵',
    'CHAMPAGNE': '샴페인',
    'PLASTIC_PLATE': '플라스틱 접시',
    'CERAMIC_PLATE': '도자기 접시',
    'CUPID_PLATE': '큐피드 접시',
    'PLASTIC_CUP': '플라스틱 컵',
    'CERAMIC_CUP': '도자기 컵',
    'PLASTIC_WINE_GLASS': '플라스틱 와인잔',
    'GLASS_WINE_GLASS': '유리 와인잔',
    'PAPER_NAPKIN': '종이 냅킨',
    'COTTON_NAPKIN': '면 냅킨',
    'LINEN_NAPKIN': '린넨 냅킨',
    'PLASTIC_TRAY': '플라스틱 쟁반',
    'WOODEN_TRAY': '나무 쟁반',
    'FLOWER_VASE': '꽃병'
  };
  return componentNames[componentCode] || componentCode;
};

// 메뉴별 가격 계산 (할인 전 정가) - MenuService 사용
const calculateItemPrice = (
  dinnerType: string,
  servingStyle: string,
  quantity: number,
  components: Array<{ componentCode: string; quantity: number }> | undefined,
  menuReference: MenuReference | null
): number => {
  if (!menuReference || !components) {
    return 0;
  }

  // 기본 레시피 대비 차이 계산
  const diffModifications = buildDiffModifications(dinnerType, components, menuReference);

  // MenuService의 기존 계산 로직 사용
  return MenuService.calculateTotalPrice(
    dinnerType,
    servingStyle,
    quantity,
    diffModifications,
    menuReference
  );
};

// 기본 레시피와의 차이 계산
const buildDiffModifications = (
  dinnerType: string,
  components: Array<{ componentCode: string; quantity: number }>,
  menuReference: MenuReference | null
): Record<string, number> => {
  if (!menuReference) {
    return {};
  }

  const dinner = menuReference.dinnerTypes.find(d => d.code === dinnerType);
  if (!dinner) {
    return {};
  }

  // 실제 구성을 Record로 변환
  const actualComponents = components.reduce<Record<string, number>>((acc, comp) => {
    acc[comp.componentCode] = comp.quantity;
    return acc;
  }, {});

  // 기본 레시피를 Record로 변환
  const baseComponents = dinner.recipe.reduce<Record<string, number>>((acc, recipeItem) => {
    acc[recipeItem.componentCode] = recipeItem.quantity;
    return acc;
  }, {});

  // 차이 계산
  const diffs: Record<string, number> = {};
  const allCodes = new Set([
    ...Object.keys(baseComponents),
    ...Object.keys(actualComponents)
  ]);

  allCodes.forEach(code => {
    const actual = actualComponents[code] ?? 0;
    const base = baseComponents[code] ?? 0;
    const diff = actual - base;
    if (diff !== 0) {
      diffs[code] = diff;
    }
  });

  return diffs;
};

// 할인 여부 감지
const isDiscountApplied = (originalPrice: number, paidPrice: number): boolean => {
  const discountedPrice = Math.round(originalPrice * 0.9);
  return Math.abs(paidPrice - discountedPrice) < Math.abs(paidPrice - originalPrice);
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
  const location = useLocation();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuReference, setMenuReference] = useState<MenuReference | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [reorderingOrderId, setReorderingOrderId] = useState<number | null>(null);
  const highlightOrderId = (location.state as { highlightOrderId?: number })?.highlightOrderId;
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

  // 주문 취소 함수
  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('정말로 주문을 취소하시겠습니까?')) {
      return;
    }

    const reason = prompt('취소 사유를 입력해주세요:');
    if (!reason) {
      return;
    }

    try {
      setCancellingOrderId(orderId);
      await OrderService.cancelOrder(orderId, { reason });

      // 주문 상태를 로컬에서 업데이트
      setOrders(prev =>
        prev.map(order =>
          order.orderId === orderId ? { ...order, status: 'CANCELLED' } : order
        )
      );

      toast.success('주문이 취소되었습니다.');
    } catch (error: any) {
      console.error('주문 취소 실패:', error);
      let message = '주문 취소에 실패했습니다. 다시 시도해주세요.';
      if (error?.message) {
        message = error.message;
      }
      toast.error(message);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getOrderShortageMessage = (orderData?: Order | null) => {
    if (!orderData || !menuReference) {
      return null;
    }

    const usage: Record<string, number> = {};
    orderData.items?.forEach(item => {
      const multiplier = item.quantity ?? 1;

      // 음식 재료 계산
      item.components?.forEach(comp => {
        const required = (comp.quantity ?? 0) * multiplier;
        usage[comp.componentCode] = (usage[comp.componentCode] || 0) + required;
      });

      // ServingStyle의 tableware 계산
      const servingStyleCode = typeof item.servingStyle === 'string'
        ? item.servingStyle
        : item.servingStyle;

      const servingStyle = menuReference.servingStyles.find(ss => ss.code === servingStyleCode);
      if (servingStyle && servingStyle.tableware) {
        servingStyle.tableware.forEach(tableware => {
          const required = (tableware.quantity ?? 0) * multiplier;
          usage[tableware.componentCode] = (usage[tableware.componentCode] || 0) + required;
        });
      }
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
      setReorderingOrderId(order.orderId);
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
          item.components,  // ✅ 원본 배열 데이터 사용
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
      setReorderingOrderId(null);
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
                    <h3 className="mb-3 font-medium">주문 상세</h3>
                    <div className="space-y-4">
                      {order.items.map((item, index) => {
                        const itemPrice = calculateItemPrice(
                          item.dinnerType,
                          item.servingStyle,
                          item.quantity,
                          item.components,
                          menuReference
                        );
                        return (
                          <div key={index} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-sm font-medium text-gray-800">
                                {getDinnerTypeName(item.dinnerType)} ({getServingStyleName(item.servingStyle)}) x {item.quantity}
                              </div>
                              {itemPrice > 0 && (
                                <div className="text-sm text-right">
                                  <div className="text-gray-600">메뉴 가격</div>
                                  <div className="font-medium text-gray-800">{itemPrice.toLocaleString()}원</div>
                                </div>
                              )}
                            </div>
                            {item.components && item.components.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500 mb-2">구성:</p>
                                <div className="grid grid-cols-2 gap-1">
                                  {item.components.map((comp, compIndex) => (
                                    <p key={compIndex} className="text-xs text-gray-600">
                                      • {getComponentDisplayName(comp.componentCode)} x{comp.quantity}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* 전체 주문 가격 요약 */}
                      {(() => {
                        const totalOriginalPrice = order.items.reduce((sum, item) => {
                          return sum + calculateItemPrice(
                            item.dinnerType,
                            item.servingStyle,
                            item.quantity,
                            item.components,
                            menuReference
                          );
                        }, 0);

                        const hasDiscount = isDiscountApplied(totalOriginalPrice, order.totalPrice);

                        return totalOriginalPrice > 0 ? (
                          <div className="border-t pt-3 mt-4">
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-600">메뉴 총 가격:</span>
                                <span className={hasDiscount ? "line-through text-gray-500" : "font-medium"}>{totalOriginalPrice.toLocaleString()}원</span>
                              </div>
                              {hasDiscount && (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-green-600">10% 할인:</span>
                                    <span className="text-green-600">-{(totalOriginalPrice * 0.1).toLocaleString()}원</span>
                                  </div>
                                  <div className="flex justify-between font-medium text-lg">
                                    <span>결제 금액:</span>
                                    <span className="text-red-600">{order.totalPrice.toLocaleString()}원</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ) : null;
                      })()}
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
                  {order.status === 'PAID_PENDING' && (
                    <Button
                      variant="outline"
                      className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                      onClick={() => handleCancelOrder(order.orderId)}
                      disabled={cancellingOrderId === order.orderId}
                    >
                      {cancellingOrderId === order.orderId ? '취소 중...' : '주문 취소'}
                    </Button>
                  )}
                  {order.status === 'DELIVERED' && (
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={() => handleReorder(order)}
                      disabled={reorderingOrderId === order.orderId || !!shortageMessage}
                    >
                      {shortageMessage || (reorderingOrderId === order.orderId ? '처리 중...' : '재주문')}
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
