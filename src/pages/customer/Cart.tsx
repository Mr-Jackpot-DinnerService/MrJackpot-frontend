import { Link, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useCart, type CartItem } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useStock } from '../../contexts/StockContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useState, useEffect, useCallback } from 'react';
import { CartService, OrderService, UserService, MenuService, type CartResponse, type UserProfile, type MenuReference } from '../../services';
import { toast } from 'sonner';
import { extractShortageInfoFromError } from '../../utils/stockUtils';
import { getComponentDisplayName } from '../../utils/componentNames';
import { getDinnerImageSrc } from '../../utils/menuImages';

type DisplayCartItem = CartResponse['items'][number] | CartItem;

const dinnerTypeNames: Record<string, string> = {
  VALENTINE_DINNER: '발렌타인 디너',
  FRENCH_DINNER: '프랑스식 디너',
  ENGLISH_DINNER: '영국식 디너',
  CHAMP_FEAST_DINNER: '샴페인 축제 디너'
};

const servingStyleNames: Record<string, string> = {
  SIMPLE: '심플',
  GRAND: '그랜드',
  DELUXE: '디럭스'
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getDinnerTypeInfo = (dinnerType: unknown) => {
  if (typeof dinnerType === 'string') {
    return {
      code: dinnerType,
      name: dinnerTypeNames[dinnerType] || dinnerType
    };
  }

  if (isRecord(dinnerType)) {
    const code = typeof dinnerType.code === 'string' ? dinnerType.code : '';
    const description = typeof dinnerType.description === 'string' ? dinnerType.description : '';

    return {
      code,
      name: description || (code ? dinnerTypeNames[code] || code : '메뉴')
    };
  }

  return {
    code: '',
    name: '메뉴'
  };
};

const getServingStyleName = (servingStyle: unknown) => {
  if (typeof servingStyle === 'string') {
    return servingStyleNames[servingStyle] || servingStyle;
  }

  if (isRecord(servingStyle)) {
    if (typeof servingStyle.description === 'string') {
      return servingStyle.description;
    }
    if (typeof servingStyle.code === 'string') {
      return servingStyleNames[servingStyle.code] || servingStyle.code;
    }
  }

  return '서빙 스타일';
};

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, removeFromCart, removeFromCartBackend, updateQuantity, totalPrice, clearCart } = useCart();
  const { registerShortage } = useStock();
  const [backendCart, setBackendCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<UserProfile | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [menuReference, setMenuReference] = useState<MenuReference | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ show: boolean; cartMenuId: number | null }>({ show: false, cartMenuId: null });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CARD' | 'CASH' | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const refreshBackendCart = async () => {
    const cartResponse = await CartService.getCart();
    setBackendCart(cartResponse);
    return cartResponse;
  };

  const handleProceedPayment = async () => {
    if (!selectedPaymentMethod) {
      toast.error('결제 수단을 선택해주세요.');
      return;
    }

    try {
      setLoading(true);

      const profile = await ensureCustomerProfile();
      if (!profile) {
        toast.error('사용자 정보를 불러오지 못했습니다.');
        return;
      }

      const receiverName = profile.name?.trim();
      const receiverPhone = profile.phone?.trim();
      const address = profile.address?.trim();

      if (!receiverName || !receiverPhone || !address) {
        toast.error('마이페이지에서 이름/전화번호/기본 배송지를 먼저 등록해주세요.');
        return;
      }

      // 백엔드 장바구니로 주문 생성
      await OrderService.placeOrder({
        receiverName,
        receiverPhone,
        address,
        paymentMethod: selectedPaymentMethod,
        deliveryType: 'INSTANT',
      });

      // 결제 완료 상태로 전환
      setPaymentCompleted(true);

      // 3초 후 주문 내역 페이지로 이동
      setTimeout(() => {
        clearCart();
        setBackendCart(null);
        navigate('/customer/order-history');
      }, 3000);
    } catch (error) {
      setPaymentCompleted(false);
      console.error('결제 실패:', error);

      const shortageInfo = extractShortageInfoFromError(error);
      if (shortageInfo) {
        registerShortage(shortageInfo);
        toast.error(shortageInfo.label);
      } else {
        toast.error('결제에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 재고 검증 함수
  const validateStock = useCallback((cart: CartResponse, menuRef: MenuReference): string | null => {
    // 각 구성품별로 필요한 총 수량 계산
    const requiredComponents: Record<string, number> = {};

    cart.items.forEach(item => {
      // 음식 재료 계산
      item.components.forEach(comp => {
        const totalNeeded = comp.quantity * item.quantity;
        requiredComponents[comp.componentCode] =
          (requiredComponents[comp.componentCode] || 0) + totalNeeded;
      });

      // ServingStyle의 tableware 계산
      const servingStyleCode = typeof item.servingStyle === 'string'
        ? item.servingStyle
        : (item.servingStyle as any).code;

      const servingStyle = menuRef.servingStyles.find(ss => ss.code === servingStyleCode);
      if (servingStyle && servingStyle.tableware) {
        servingStyle.tableware.forEach(tableware => {
          const totalNeeded = tableware.quantity * item.quantity;
          requiredComponents[tableware.componentCode] =
            (requiredComponents[tableware.componentCode] || 0) + totalNeeded;
        });
      }
    });

    // 재고와 비교
    for (const [componentCode, requiredQty] of Object.entries(requiredComponents)) {
      const componentType = menuRef.componentTypes.find(ct => ct.code === componentCode);
      if (componentType && componentType.stock < requiredQty) {
        const displayName = getComponentDisplayName(componentCode);
        return `${displayName}의 재고가 부족합니다. (필요: ${requiredQty}, 재고: ${componentType.stock})`;
      }
    }

    return null;
  }, []);

  const handleBackendQuantityChange = async (cartMenuId: number, newQuantity: number, currentQuantity: number) => {
    try {
      // 수량이 1에서 0으로 줄어드는 경우 확인 모달 표시
      if (currentQuantity === 1 && newQuantity === 0) {
        setDeleteConfirmModal({ show: true, cartMenuId });
        return;
      }

      if (newQuantity <= 0) {
        await removeFromCartBackend(cartMenuId);
      } else {
        await CartService.updateQuantity(cartMenuId, newQuantity);
      }

      // 장바구니 새로고침 및 재고 검증
      const updatedCart = await refreshBackendCart();
      if (menuReference && updatedCart.items.length > 0) {
        const error = validateStock(updatedCart, menuReference);
        setStockError(error);
        if (error) {
          toast.error(error);
          return;
        }
      } else {
        setStockError(null);
      }

      toast.success('수량이 변경되었습니다.');
    } catch (error) {
      console.error('백엔드 수량 변경 실패:', error);
      toast.error('수량 변경에 실패했습니다.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal.cartMenuId) return;

    try {
      await removeFromCartBackend(deleteConfirmModal.cartMenuId);

      // 장바구니 새로고침 및 재고 검증
      const updatedCart = await refreshBackendCart();
      if (menuReference && updatedCart.items.length > 0) {
        const error = validateStock(updatedCart, menuReference);
        setStockError(error);
      } else {
        setStockError(null);
      }

      toast.success('아이템이 삭제되었습니다.');
    } catch (error) {
      console.error('백엔드 아이템 삭제 실패:', error);
      toast.error('삭제에 실패했습니다.');
    } finally {
      setDeleteConfirmModal({ show: false, cartMenuId: null });
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmModal({ show: false, cartMenuId: null });
  };

  const handleLocalQuantityChange = async (itemId: string, newQuantity: number, currentQuantity: number) => {
    try {
      const cartMenuId = Number(itemId);
      if (!Number.isNaN(cartMenuId)) {
        await handleBackendQuantityChange(cartMenuId, newQuantity, currentQuantity);
        return;
      }
    } catch (error) {
      console.error('로컬 아이템 백엔드 연동 실패:', error);
    }

    if (newQuantity <= 0) {
      removeFromCart(itemId);
      setStockError(null);
      return;
    }

    updateQuantity(itemId, newQuantity);
    setStockError(null);
    toast.success('수량이 변경되었습니다.');
  };

  // 백엔드에서 장바구니 데이터 및 메뉴 참조 데이터 로드
  useEffect(() => {
    const loadCartData = async () => {
      try {
        setLoading(true);

        // 장바구니와 메뉴 참조 데이터 병렬로 로드
        const [cartData, menuRef] = await Promise.all([
          CartService.getCart(),
          MenuService.getMenuReferences()
        ]);

        setBackendCart(cartData);
        setMenuReference(menuRef);

        console.log('백엔드 장바구니 데이터:', JSON.stringify(cartData, null, 2));
        console.log('백엔드 아이템 개수:', cartData?.items?.length || 0);
        if (cartData?.items?.[0]) {
          console.log('첫 번째 아이템 상세:', JSON.stringify(cartData.items[0], null, 2));
        }

        // 재고 검증
        if (cartData.items.length > 0) {
          const error = validateStock(cartData, menuRef);
          setStockError(error);
          if (error) {
            toast.warning(error);
          }
        }
      } catch (error) {
        console.error('장바구니 데이터 로드 실패:', error);
        // 로그인하지 않은 경우 등은 에러를 표시하지 않음
      } finally {
        setLoading(false);
      }
    };

    loadCartData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      setCustomerProfile(prev => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      }));
    } else {
      setCustomerProfile(null);
    }
  }, [user]);

  useEffect(() => {
    const checkVipStatus = async () => {
      if (!user || user.role !== 'CUSTOMER') {
        setIsVip(false);
        return;
      }
      try {
        const orders = await OrderService.getMyOrders();
        const completedOrders = orders.filter(order => order.status === 'DELIVERED');
        setIsVip(completedOrders.length >= 10);
      } catch (error) {
        console.error('VIP 상태 확인 실패:', error);
        setIsVip(false);
      }
    };

    checkVipStatus();
  }, [user]);

  const ensureCustomerProfile = async () => {
    if (!user) {
      return null;
    }

    let profile = customerProfile;

    if (!profile || !profile.phone || !profile.address || !profile.name) {
      try {
        profile = await UserService.getProfile();
        setCustomerProfile(profile);
      } catch (error) {
        console.error('사용자 정보 조회 실패:', error);
        return null;
      }
    }

    return profile;
  };

  if ((!backendCart || backendCart.items.length === 0) && items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl mb-4">장바구니</h1>
        <p className="text-gray-600 mb-8">장바구니가 비어있습니다.</p>
        <Link to="/customer/menu">
          <Button className="bg-red-600 hover:bg-red-700">메뉴 보러가기</Button>
        </Link>
      </div>
    );
  }

  // 백엔드 장바구니 데이터를 우선 사용하고, 없으면 로컬 상태를 표시
  const cartItems: DisplayCartItem[] = backendCart && backendCart.items.length > 0 ? backendCart.items : items;

  const resolvedCartTotal = (() => {
    if (backendCart) {
      if (backendCart.items.length > 0) {
        return backendCart.totalPrice;
      }
      return 0;
    }
    return totalPrice;
  })();

  const vipDiscountRate = 0.1;
  const vipDiscountAmount = isVip ? Math.round(resolvedCartTotal * vipDiscountRate) : 0;
  const finalCartTotal = Math.max(resolvedCartTotal - vipDiscountAmount, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">장바구니</h1>

      <div className="space-y-4 mb-8">
        {cartItems.map(item => {
          // 백엔드 데이터 형식 확인
          const isBackendItem = 'cartMenuId' in item;

          if (isBackendItem) {
            // 백엔드 장바구니 아이템 렌더링
            // dinnerType과 servingStyle은 enum 문자열이므로 적절한 표시명 매핑
            const dinnerTypeNames: Record<string, string> = {
              'VALENTINE_DINNER': '발렌타인 디너',
              'FRENCH_DINNER': '프랑스식 디너',
              'ENGLISH_DINNER': '영국식 디너',
              'CHAMP_FEAST_DINNER': '샴페인 축제 디너'
            };

            const servingStyleNames: Record<string, string> = {
              'SIMPLE': '심플',
              'GRAND': '그랜드',
              'DELUXE': '디럭스'
            };

            const dinnerTypeInfo = getDinnerTypeInfo(item.dinnerType);
            const styleName = getServingStyleName(item.servingStyle);
            const dinnerImage = getDinnerImageSrc(dinnerTypeInfo.code);

            return (
              <div key={item.cartMenuId} className="bg-white border rounded-lg p-4 flex gap-4">
                <img
                  src={dinnerImage}
                  alt={dinnerTypeInfo.name}
                  className="w-24 h-24 object-cover rounded"
                />

                <div className="flex-1">
                  <h3 className="mb-1 font-semibold">{dinnerTypeInfo.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">서빙 스타일: {styleName}</p>

                  {/* 구성 재료 표시 */}
                  {item.components && item.components.length > 0 && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span>구성: </span>
                      {item.components.map((comp, index) => (
                        <span key={comp.componentCode}>
                          {comp.componentName} x{comp.quantity}
                          {index < item.components.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-gray-500">단가: {item.pricePerUnit.toLocaleString()}원</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleBackendQuantityChange(item.cartMenuId, item.quantity - 1, item.quantity)}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleBackendQuantityChange(item.cartMenuId, item.quantity + 1, item.quantity)}
                      >
                        +
                      </Button>
                    </div>
                    <div className="text-center mt-2">
                      <p className="text-red-600 font-semibold">{(item.pricePerUnit * item.quantity).toLocaleString()}원</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      try {
                        // CartContext의 removeFromCartBackend 함수 사용
                        await removeFromCartBackend(item.cartMenuId);

                        // 백엔드 장바구니도 다시 로드
                        const cartResponse = await CartService.getCart();
                        setBackendCart(cartResponse);
                        console.log('아이템 삭제 후 백엔드 장바구니 상태:', cartResponse);

                        // 재고 재검증
                        if (menuReference && cartResponse.items.length > 0) {
                          const error = validateStock(cartResponse, menuReference);
                          setStockError(error);
                        } else {
                          setStockError(null);
                        }

                        toast.success('아이템이 삭제되었습니다.');
                      } catch (error) {
                        console.error('장바구니 아이템 삭제 실패:', error);
                        toast.error('삭제에 실패했습니다.');
                      }
                    }}
                  >
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </Button>
                </div>
              </div>
            );
          } else {
            // 로컬 장바구니 아이템 렌더링 (기존 방식)
            return (
              <div key={item.id} className="bg-white border rounded-lg p-4 flex gap-4">
                <ImageWithFallback
                  src={item.image}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded"
                />

                <div className="flex-1">
                  <h3 className="mb-1">{item.name}</h3>
                  {item.options.length > 0 && (
                    <p className="text-sm text-gray-600 mb-2">서빙 스타일: {item.options.join(', ')}</p>
                  )}
                  {item.request && (
                    <p className="text-sm text-blue-600 mb-2">요청사항: {item.request}</p>
                  )}
                  <p className="text-sm text-gray-500">단가: {item.price.toLocaleString()}원</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleLocalQuantityChange(item.id, item.quantity - 1, item.quantity)}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleLocalQuantityChange(item.id, item.quantity + 1, item.quantity)}
                      >
                        +
                      </Button>
                    </div>
                    <div className="text-center mt-2">
                      <p className="text-red-600">{(item.price * item.quantity).toLocaleString()}원</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      removeFromCart(item.id);
                      setStockError(null);
                    }}
                  >
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </Button>
                </div>
              </div>
            );
          }
        })}
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        {isVip ? (
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>상품 합계</span>
              <span>{resolvedCartTotal.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-green-600 font-semibold">
              <span>VIP 할인 (10%)</span>
              <span>- {vipDiscountAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between items-center text-xl pt-2 border-t border-gray-200">
              <span>총 결제 금액</span>
              <span className="text-red-600">{finalCartTotal.toLocaleString()}원</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center text-xl">
            <span>총 결제 금액</span>
            <span className="text-red-600">{finalCartTotal.toLocaleString()}원</span>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Link to="/customer/menu" className="flex-1">
          <Button variant="outline" className="w-full">계속 쇼핑하기</Button>
        </Link>
        <Button
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={async () => {
            // 결제 전 검증
            if (items.length === 0 && (!backendCart || backendCart.items.length === 0)) {
              toast.error('장바구니가 비어있습니다.');
              return;
            }

            if (!user) {
              toast.error('로그인이 필요합니다.');
              navigate('/login');
              return;
            }

            const profile = await ensureCustomerProfile();
            if (!profile) {
              toast.error('사용자 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
              return;
            }

            const receiverName = profile.name?.trim();
            const receiverPhone = profile.phone?.trim();
            const address = profile.address?.trim();

            if (!receiverName || !receiverPhone || !address) {
              toast.error('마이페이지에서 이름/전화번호/기본 배송지를 먼저 등록해주세요.');
              return;
            }

            // 검증 통과 시 결제 수단 선택 모달 열기
            setShowPaymentModal(true);
          }}
          disabled={loading || !!stockError}
        >
          {stockError ? stockError : loading ? '결제 중...' : '결제하기'}
        </Button>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">메뉴 삭제</h3>
            <p className="text-gray-600 mb-6">해당 메뉴를 장바구니에서 삭제하시겠어요?</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancelDelete}
              >
                아니요
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleConfirmDelete}
              >
                네
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 결제 수단 선택 모달 */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            {paymentCompleted ? (
              // 결제 완료 화면
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">결제완료</h3>
                <p className="text-gray-600">주문 내역으로 이동합니다...</p>
              </div>
            ) : (
              // 결제 수단 선택 화면
              <>
                <h3 className="text-xl font-semibold mb-6">결제 수단 선택</h3>

                <div className="space-y-3 mb-6">
                  {/* 카드 결제 옵션 */}
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedPaymentMethod === 'CARD'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPaymentMethod('CARD')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPaymentMethod === 'CARD'
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedPaymentMethod === 'CARD' && (
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">카드 결제</h4>
                        <p className="text-sm text-gray-600">현대카드 ZERO (**** 1234)</p>
                      </div>
                    </div>
                  </div>

                  {/* 현금 결제 옵션 */}
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedPaymentMethod === 'CASH'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPaymentMethod('CASH')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPaymentMethod === 'CASH'
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedPaymentMethod === 'CASH' && (
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">현금 결제</h4>
                        <p className="text-sm text-gray-600">만나서 지불하기</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedPaymentMethod(null);
                    }}
                    disabled={loading}
                  >
                    취소
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={handleProceedPayment}
                    disabled={!selectedPaymentMethod || loading}
                  >
                    {loading ? '결제 중...' : '결제하기'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
