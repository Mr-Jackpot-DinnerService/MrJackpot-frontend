import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

export default function OrderInfo() {
  const { user } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    paymentMethod: 'card',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock order submission
    clearCart();
    navigate('/customer/order-complete');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (items.length === 0) {
    navigate('/customer/cart');
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">주문/배송 정보 입력</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Order Summary */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl mb-4">주문 상품</h2>
          <div className="space-y-2 mb-4">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name} x {item.quantity}
                  {item.options.length > 0 && ` (${item.options.join(', ')})`}
                </span>
                <span>{(item.price * item.quantity).toLocaleString()}원</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 flex justify-between">
            <span>총 결제 금액</span>
            <span className="text-red-600 text-xl">
              {(totalPrice + 3000).toLocaleString()}원
            </span>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl mb-4">배송 정보</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">받는 분</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="address">배송 주소</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="message">배송 메시지</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="배송 시 요청사항을 입력해주세요"
                value={formData.message}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl mb-4">결제 방법</h2>
          <RadioGroup
            value={formData.paymentMethod}
            onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="card" id="card" />
              <Label htmlFor="card">신용카드</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="transfer" id="transfer" />
              <Label htmlFor="transfer">계좌이체</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="phone" id="phone" />
              <Label htmlFor="phone">휴대폰 결제</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cash" id="cash" />
              <Label htmlFor="cash">만나서 결제</Label>
            </div>
          </RadioGroup>
        </div>

        <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 h-14 text-lg">
          {(totalPrice + 3000).toLocaleString()}원 결제하기
        </Button>
      </form>
    </div>
  );
}
