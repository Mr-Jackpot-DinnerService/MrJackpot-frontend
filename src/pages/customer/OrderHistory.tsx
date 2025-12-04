import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { OrderService, type Order } from '../../services';
import { toast } from 'sonner';

export default function OrderHistory() {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // 주문 내역 로드
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const orderData = await OrderService.getMyOrders();
        setOrders(orderData);
        console.log('내 주문 내역:', orderData);
      } catch (error) {
        console.error('주문 내역 로드 실패:', error);
        toast.error('주문 내역을 불러오는데 실패했습니다.');
        // 에러 발생시 빈 배열로 설정
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const toggleOrder = (orderId: number) => {
    const orderIdStr = orderId.toString();
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderIdStr)) {
      newExpanded.delete(orderIdStr);
    } else {
      newExpanded.add(orderIdStr);
    }
    setExpandedOrders(newExpanded);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl mb-8">주문 내역</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">주문 내역을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">주문 내역</h1>

      {orders.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">주문 내역이 없습니다.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const isExpanded = expandedOrders.has(order.id.toString());

            return (
              <Card key={order.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">주문번호: {order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.orderTime}</p>
                  </div>
                  <Badge className={OrderService.getStatusColorClass(order.status)}>
                    {OrderService.getStatusText(order.status)}
                  </Badge>
                </div>

                <div className="mb-4">
                  <p className="mb-2">
                    {order.items.length > 0 ?
                      `${order.items[0].dinnerType.description} 외 ${order.items.length - 1}건` :
                      '주문 상품 없음'
                    }
                  </p>
                  <p className="text-xl text-red-600">{order.finalPrice.toLocaleString()}원</p>
                </div>

                {isExpanded && (
                  <div className="border-t pt-4 mb-4">
                    <h3 className="mb-2">주문 상세</h3>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>
                            {item.dinnerType.description} ({item.servingStyle.description}) x {item.quantity}
                          </span>
                          <span>{item.totalPrice.toLocaleString()}원</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between text-sm">
                          <span>상품 총액:</span>
                          <span>{order.totalPrice.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>배달비:</span>
                          <span>{order.deliveryFee.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>총 결제 금액:</span>
                          <span className="text-red-600">{order.finalPrice.toLocaleString()}원</span>
                        </div>
                      </div>
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
                  {order.status === 'COMPLETED' && (
                    <Button className="flex-1 bg-red-600 hover:bg-red-700">재주문</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}