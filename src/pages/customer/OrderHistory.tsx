import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: 'pending' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    options: string[];
  }>;
  totalPrice: number;
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD20241121001',
    date: '2024-11-21 14:30',
    status: 'delivering',
    items: [
      { name: '발렌타인 디너', quantity: 1, price: 80000, options: ['그랜드 스타일'] },
    ],
    totalPrice: 80000,
  },
  {
    id: '2',
    orderNumber: 'ORD20241120002',
    date: '2024-11-20 18:45',
    status: 'completed',
    items: [
      { name: '프렌치 디너', quantity: 1, price: 70000, options: ['심플 스타일'] },
    ],
    totalPrice: 70000,
  },
  {
    id: '3',
    orderNumber: 'ORD20241119003',
    date: '2024-11-19 12:20',
    status: 'completed',
    items: [
      { name: '잉글리시 디너', quantity: 1, price: 60000, options: ['디럭스 스타일'] },
    ],
    totalPrice: 60000,
  },
];

const statusText = {
  pending: '주문 접수',
  preparing: '준비 중',
  delivering: '배달 중',
  completed: '완료',
  cancelled: '취소',
};

const statusColor = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  delivering: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function OrderHistory() {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrder = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">주문 내역</h1>

      <div className="space-y-4">
        {mockOrders.map(order => {
          const isExpanded = expandedOrders.has(order.id);

          return (
            <Card key={order.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">주문번호: {order.orderNumber}</p>
                  <p className="text-sm text-gray-600">{order.date}</p>
                </div>
                <Badge className={statusColor[order.status]}>
                  {statusText[order.status]}
                </Badge>
              </div>

              <div className="mb-4">
                <p className="mb-2">
                  {order.items[0].name} 외 {order.items.length - 1}건
                </p>
                <p className="text-xl text-red-600">{order.totalPrice.toLocaleString()}원</p>
              </div>

              {isExpanded && (
                <div className="border-t pt-4 mb-4">
                  <h3 className="mb-2">주문 상세</h3>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.name} x {item.quantity}
                          {item.options.length > 0 && ` (${item.options.join(', ')})`}
                        </span>
                        <span>{(item.price * item.quantity).toLocaleString()}원</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => toggleOrder(order.id)}
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
                {order.status === 'completed' && (
                  <Button className="flex-1 bg-red-600 hover:bg-red-700">재주문</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
