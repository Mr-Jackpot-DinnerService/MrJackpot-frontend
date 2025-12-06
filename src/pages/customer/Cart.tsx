import { Link, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useCart, type CartItem } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useStock } from '../../contexts/StockContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useState, useEffect } from 'react';
import { CartService, OrderService, UserService, type CartResponse, type UserProfile } from '../../services';
import { toast } from 'sonner';
import { extractShortageInfoFromError } from '../../utils/stockUtils';

type DisplayCartItem = CartResponse['items'][number] | CartItem;

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

  const refreshBackendCart = async () => {
    const cartResponse = await CartService.getCart();
    setBackendCart(cartResponse);
    return cartResponse;
  };

  const handleBackendQuantityChange = async (cartMenuId: number, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        await removeFromCartBackend(cartMenuId);
      } else {
        await CartService.updateQuantity(cartMenuId, newQuantity);
        await refreshBackendCart();
      }
      setStockError(null);
      toast.success('수량이 변경되었습니다.');
    } catch (error) {
      console.error('백엔드 수량 변경 실패:', error);
      toast.error('수량 변경에 실패했습니다.');
    }
  };

  const handleLocalQuantityChange = async (itemId: string, newQuantity: number) => {
    try {
      const cartMenuId = Number(itemId);
      if (!Number.isNaN(cartMenuId)) {
        await handleBackendQuantityChange(cartMenuId, newQuantity);
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

  // 백엔드에서 장바구니 데이터 로드
  useEffect(() => {
    const loadCartData = async () => {
      try {
        setLoading(true);
        const cartData = await CartService.getCart();
        setBackendCart(cartData);
        console.log('백엔드 장바구니 데이터:', JSON.stringify(cartData, null, 2));
        console.log('백엔드 아이템 개수:', cartData?.items?.length || 0);
        if (cartData?.items?.[0]) {
          console.log('첫 번째 아이템 상세:', JSON.stringify(cartData.items[0], null, 2));
        }
      } catch (error) {
        console.error('장바구니 데이터 로드 실패:', error);
        // 로그인하지 않은 경우 등은 에러를 표시하지 않음
      } finally {
        setLoading(false);
      }
    };

    loadCartData();
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

            const dinnerName = dinnerTypeNames[String(item.dinnerType)] || String(item.dinnerType);
            const styleName = servingStyleNames[String(item.servingStyle)] || String(item.servingStyle);

            return (
              <div key={item.cartMenuId} className="bg-white border rounded-lg p-4 flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-500 text-xs">이미지</span>
                </div>

                <div className="flex-1">
                  <h3 className="mb-1 font-semibold">{dinnerName}</h3>
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
                        onClick={() => handleBackendQuantityChange(item.cartMenuId, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleBackendQuantityChange(item.cartMenuId, item.quantity + 1)}
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
                        toast.success('아이템이 삭제되었습니다.');
                        setStockError(null);
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
                        onClick={() => handleLocalQuantityChange(item.id, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleLocalQuantityChange(item.id, item.quantity + 1)}
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
          className="flex-1 bg-red-600 hover:bg-red-700"
          onClick={async () => {
            try {
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

              setLoading(true);

              const orderId = await OrderService.placeOrder({
                receiverName,
                receiverPhone,
                address,
                paymentMethod: 'CARD',
                deliveryType: 'INSTANT'
              });

              console.log('주문 생성 완료, ID:', orderId);

              await clearCart();
              setStockError(null);

              toast.success('주문이 완료되었습니다!');
              navigate('/customer/order-history');
            } catch (error: any) {
              console.error('결제 실패:', error);
              let message = '결제에 실패했습니다. 다시 시도해주세요.';
              if (typeof error.response === 'string' && error.response) {
                try {
                  const parsed = JSON.parse(error.response);
                  if (parsed?.message) {
                    message = parsed.message;
                  } else {
                    message = error.response;
                  }
                } catch {
                  message = error.response;
                }
              } else if (error.message) {
                message = error.message;
              }
              const shortageInfo = extractShortageInfoFromError(error) || extractShortageInfoFromError({ response: message });
              if (shortageInfo) {
                setStockError(shortageInfo.label);
                registerShortage(shortageInfo);
                message = shortageInfo.label;
              } else {
                setStockError(null);
              }
              toast.error(message);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading || !!stockError}
        >
          {stockError ? stockError : loading ? '결제 중...' : '결제하기'}
        </Button>
      </div>
    </div>
  );
}
