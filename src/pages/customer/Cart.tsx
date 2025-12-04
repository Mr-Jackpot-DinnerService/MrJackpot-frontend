import { Link, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useCart } from '../../contexts/CartContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useState, useEffect } from 'react';
import { CartService, OrderService, type CartResponse } from '../../services';
import { toast } from 'sonner';

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();
  const [backendCart, setBackendCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // 백엔드에서 장바구니 데이터 로드
  useEffect(() => {
    const loadCartData = async () => {
      try {
        setLoading(true);
        const cartData = await CartService.getCart();
        setBackendCart(cartData);
        console.log('백엔드 장바구니 데이터:', cartData);
      } catch (error) {
        console.error('장바구니 데이터 로드 실패:', error);
        // 로그인하지 않은 경우 등은 에러를 표시하지 않음
      } finally {
        setLoading(false);
      }
    };

    loadCartData();
  }, []);

  if (items.length === 0) {
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">장바구니</h1>

      <div className="space-y-4 mb-8">
        {items.map(item => (
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
              <p className="text-red-600">{item.price.toLocaleString()}원</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  -
                </Button>
                <span className="w-12 text-center">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  +
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFromCart(item.id)}
              >
                <Trash2 className="h-5 w-5 text-red-600" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">상품 금액</span>
          <span>{totalPrice.toLocaleString()}원</span>
        </div>
        <div className="border-t pt-4 flex justify-between items-center text-xl">
          <span>총 결제 금액</span>
          <span className="text-red-600">
            {totalPrice.toLocaleString()}원
          </span>
        </div>
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

              setLoading(true);

              // 실제 주문 생성 API 호출
              const orderId = await OrderService.placeOrder({
                receiverName: '고객', // TODO: 실제 사용자 정보 사용
                receiverPhone: '010-0000-0000',
                address: '배달 주소',
                paymentMethod: 'CARD',
                deliveryType: 'IMMEDIATE'
              });

              console.log('주문 생성 완료, ID:', orderId);

              // 로컬 장바구니도 비우기
              await clearCart();

              toast.success('주문이 완료되었습니다!');
              navigate('/customer/order-history');
            } catch (error) {
              console.error('결제 실패:', error);
              toast.error('결제에 실패했습니다. 다시 시도해주세요.');
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          {loading ? '결제 중...' : '결제하기'}
        </Button>
      </div>
    </div>
  );
}
