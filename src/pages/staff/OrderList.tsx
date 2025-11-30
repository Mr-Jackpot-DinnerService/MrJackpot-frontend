import { useState } from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  items: Array<{
    name: string;
    quantity: number;
    options: string[];
  }>;
  totalPrice: number;
  status: 'pending' | 'preparing' | 'delivering' | 'completed';
  orderTime: string;
  deliveryType: 'delivery' | 'pickup';
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD20241121001',
    customerName: '김철수',
    phone: '010-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    items: [
      { name: '발렌타인 디너', quantity: 1, options: ['그랜드 스타일'] },
    ],
    totalPrice: 80000,
    status: 'pending',
    orderTime: '14:30',
    deliveryType: 'delivery',
  },
  {
    id: '2',
    orderNumber: 'ORD20241121002',
    customerName: '이영희',
    phone: '010-2345-6789',
    address: '서울시 서초구 강남대로 456',
    items: [
      { name: '프렌치 디너', quantity: 1, options: ['심플 스타일'] },
    ],
    totalPrice: 70000,
    status: 'preparing',
    orderTime: '14:25',
    deliveryType: 'delivery',
  },
  {
    id: '3',
    orderNumber: 'ORD20241121003',
    customerName: '박민수',
    phone: '010-3456-7890',
    address: '매장 픽업',
    items: [
      { name: '잉글리시 디너', quantity: 1, options: ['디럭스 스타일'] },
    ],
    totalPrice: 60000,
    status: 'delivering',
    orderTime: '14:20',
    deliveryType: 'pickup',
  },
];

const statusText = {
  pending: '주문 접수',
  preparing: '준비 중',
  delivering: '배달 중',
  completed: '완료',
};

const statusColor = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  delivering: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
};

export default function OrderList() {
  const [orders, setOrders] = useState(mockOrders);

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => ['preparing', 'delivering'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'completed');

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl">실시간 주문 관리</h1>
        <div className="flex gap-4">
          <div className="bg-yellow-100 px-4 py-2 rounded-lg">
            <span className="text-yellow-800">대기: {pendingOrders.length}</span>
          </div>
          <div className="bg-blue-100 px-4 py-2 rounded-lg">
            <span className="text-blue-800">진행 중: {activeOrders.length}</span>
          </div>
          <div className="bg-green-100 px-4 py-2 rounded-lg">
            <span className="text-green-800">완료: {completedOrders.length}</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map(order => (
          <Card
            key={order.id}
            className={`p-6 ${
              order.status === 'pending' ? 'border-yellow-400 border-2' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">#{order.orderNumber}</p>
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-3 w-3" />
                  {order.orderTime}
                </p>
              </div>
              <Badge className={statusColor[order.status]}>
                {statusText[order.status]}
              </Badge>
            </div>

            <div className="mb-4">
              <p className="mb-1">{order.customerName}</p>
              <p className="text-sm text-gray-600">{order.phone}</p>
              <p className="text-sm text-gray-600">{order.address}</p>
              <Badge variant="outline" className="mt-2">
                {order.deliveryType === 'delivery' ? '배달' : '포장'}
              </Badge>
            </div>

            <div className="border-t pt-4 mb-4">
              <p className="text-sm mb-2">주문 내역</p>
              {order.items.map((item, index) => (
                <p key={index} className="text-sm text-gray-600">
                  • {item.name} x {item.quantity}
                  {item.options.length > 0 && ` (${item.options.join(', ')})`}
                </p>
              ))}
              <p className="mt-2 text-red-600">
                총 {order.totalPrice.toLocaleString()}원
              </p>
            </div>

            <div className="space-y-2">
              <Select
                value={order.status}
                onValueChange={(value) =>
                  updateOrderStatus(order.id, value as Order['status'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">주문 접수</SelectItem>
                  <SelectItem value="preparing">준비 중</SelectItem>
                  <SelectItem value="delivering">배달 중</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                </SelectContent>
              </Select>

              {order.status === 'pending' && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  접수 확인
                </Button>
              )}

              {order.status === 'preparing' && (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => updateOrderStatus(order.id, 'delivering')}
                >
                  배달 시작
                </Button>
              )}

              {order.status === 'delivering' && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => updateOrderStatus(order.id, 'completed')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  배달 완료
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
