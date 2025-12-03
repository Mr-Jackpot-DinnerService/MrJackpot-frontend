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
    id: 'test-staff-order-001',
    orderNumber: 'TEST-STAFF-ORDER-999-001',
    customerName: '[테스트] 가상고객 A',
    phone: '000-0000-0000',
    address: '[테스트] 가상주소 A',
    items: [
      { name: '[테스트] 가상 메뉴 A', quantity: 1, options: ['테스트 옵션'] },
    ],
    totalPrice: 99999,
    status: 'pending',
    orderTime: '99:99',
    deliveryType: 'delivery',
  },
  {
    id: 'test-staff-order-002',
    orderNumber: 'TEST-STAFF-ORDER-999-002',
    customerName: '[테스트] 가상고객 B',
    phone: '000-0000-0000',
    address: '[테스트] 가상주소 B',
    items: [
      { name: '[테스트] 가상 메뉴 B', quantity: 1, options: ['테스트 옵션'] },
    ],
    totalPrice: 88888,
    status: 'preparing',
    orderTime: '99:99',
    deliveryType: 'delivery',
  }
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
