import { useState, useEffect } from 'react';
import { Clock, CheckCircle } from 'lucide-react';
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
import { StaffService, type Order } from '../../services';
import { toast } from 'sonner';

const statusText: Record<Order['status'], string> = {
  PENDING: '주문 접수',
  COOKING: '준비 중',
  DELIVERING: '배달 중',
  COMPLETED: '완료',
  CANCELLED: '취소됨',
};

const statusColor: Record<Order['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COOKING: 'bg-blue-100 text-blue-800',
  DELIVERING: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // 주문 목록 로드
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const orderData = await StaffService.getLiveOrders();
        setOrders(orderData);
        console.log('Staff 주문 목록:', orderData);
      } catch (error) {
        console.error('주문 목록 로드 실패:', error);
        toast.error('주문 목록을 불러오는데 실패했습니다.');
        // 에러 발생시 빈 배열로 설정
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const updateOrderStatus = async (orderId: number, newStatus: Order['status']) => {
    try {
      await StaffService.updateOrderStatus(orderId, { newStatus });

      // 로컬 상태 업데이트
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      toast.success('주문 상태가 업데이트되었습니다.');
    } catch (error) {
      console.error('주문 상태 업데이트 실패:', error);
      toast.error('주문 상태 업데이트에 실패했습니다.');
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const activeOrders = orders.filter(o => ['COOKING', 'DELIVERING'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'COMPLETED');

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl mb-8">실시간 주문 관리</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">주문 목록을 불러오는 중...</div>
        </div>
      </div>
    );
  }

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

      {orders.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">현재 주문이 없습니다.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => (
            <Card
              key={order.id}
              className={`p-6 ${
                order.status === 'PENDING' ? 'border-yellow-400 border-2' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">#{order.orderNumber}</p>
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-3 w-3" />
                    {new Date(order.orderTime).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <Badge className={statusColor[order.status]}>
                  {statusText[order.status]}
                </Badge>
              </div>

              <div className="mb-4">
                <p className="mb-1">{order.receiverName}</p>
                <p className="text-sm text-gray-600">{order.receiverPhone}</p>
                <p className="text-sm text-gray-600">{order.address}</p>
                <Badge variant="outline" className="mt-2">
                  {order.deliveryType === 'IMMEDIATE' ? '즉시배달' : '예약배달'}
                </Badge>
              </div>

              <div className="border-t pt-4 mb-4">
                <p className="text-sm mb-2">주문 내역</p>
                {order.items.map((item, index) => (
                  <p key={index} className="text-sm text-gray-600">
                    • {item.dinnerType.description} ({item.servingStyle.description}) x {item.quantity}
                  </p>
                ))}
                <p className="mt-2 text-red-600">
                  총 {order.finalPrice.toLocaleString()}원
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
                    <SelectItem value="PENDING">주문 접수</SelectItem>
                    <SelectItem value="COOKING">준비 중</SelectItem>
                    <SelectItem value="DELIVERING">배달 중</SelectItem>
                    <SelectItem value="COMPLETED">완료</SelectItem>
                  </SelectContent>
                </Select>

                {order.status === 'PENDING' && (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => updateOrderStatus(order.id, 'COOKING')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    접수 확인
                  </Button>
                )}

                {order.status === 'COOKING' && (
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => updateOrderStatus(order.id, 'DELIVERING')}
                  >
                    배달 시작
                  </Button>
                )}

                {order.status === 'DELIVERING' && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    배달 완료
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
