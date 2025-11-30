import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';

export default function OrderComplete() {
  const orderNumber = 'ORD' + Date.now().toString().slice(-8);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="mb-8">
        <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
        <h1 className="text-3xl mb-2">주문이 완료되었습니다!</h1>
        <p className="text-gray-600">주문해 주셔서 감사합니다.</p>
      </div>

      <div className="bg-white border rounded-lg p-8 mb-8">
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-1">주문번호</p>
          <p className="text-2xl">{orderNumber}</p>
        </div>

        <div className="border-t pt-6">
          <p className="text-gray-600 mb-4">
            주문하신 상품은 곧 준비될 예정입니다.
            <br />
            배달 예상 시간은 약 30-40분입니다.
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link to="/customer/order-history" className="flex-1">
          <Button variant="outline" className="w-full">주문 내역 보기</Button>
        </Link>
        <Link to="/customer/menu" className="flex-1">
          <Button className="w-full bg-red-600 hover:bg-red-700">메뉴 더 보기</Button>
        </Link>
      </div>
    </div>
  );
}
