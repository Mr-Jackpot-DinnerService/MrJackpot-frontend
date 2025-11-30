import { Link, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useCart } from '../../contexts/CartContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();

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
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">배달비</span>
          <span>3,000원</span>
        </div>
        <div className="border-t pt-4 flex justify-between items-center text-xl">
          <span>총 결제 금액</span>
          <span className="text-red-600">{(totalPrice + 3000).toLocaleString()}원</span>
        </div>
      </div>

      <div className="flex gap-4">
        <Link to="/customer/menu" className="flex-1">
          <Button variant="outline" className="w-full">계속 쇼핑하기</Button>
        </Link>
        <Button 
          className="flex-1 bg-red-600 hover:bg-red-700"
          onClick={() => {
            clearCart();
            navigate('/customer/order-history');
          }}
        >
          결제하기
        </Button>
      </div>
    </div>
  );
}
