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

// enum 문자열을 한글로 변환하는 함수들
const getDinnerTypeName = (dinnerType: string): string => {
  const dinnerTypeNames: Record<string, string> = {
    'VALENTINE_DINNER': '발렌타인 디너',
    'FRENCH_DINNER': '프랑스식 디너',
    'ENGLISH_DINNER': '영국식 디너',
    'CHAMP_FEAST_DINNER': '샴페인 축제 디너'
  };
  return dinnerTypeNames[dinnerType] || dinnerType;
};

const getServingStyleName = (servingStyle: string): string => {
  const servingStyleNames: Record<string, string> = {
    'SIMPLE': '심플',
    'GRAND': '그랜드',
    'DELUXE': '디럭스'
  };
  return servingStyleNames[servingStyle] || servingStyle;
};

const getComponentDisplayName = (componentCode: string): string => {
  const componentNames: Record<string, string> = {
    'STEAK': '스테이크',
    'WINE': '와인',
    'COFFEE': '커피',
    'SALAD': '샐러드',
    'SCRAMBLED_EGG': '에그 스크램블',
    'BACON': '베이컨',
    'BREAD': '빵',
    'BAGUETTE': '바게트빵',
    'CHAMPAGNE': '샴페인',
    'PLASTIC_PLATE': '플라스틱 접시',
    'CERAMIC_PLATE': '도자기 접시',
    'CUPID_PLATE': '큐피드 접시',
    'PLASTIC_CUP': '플라스틱 컵',
    'CERAMIC_CUP': '도자기 컵',
    'PLASTIC_WINE_GLASS': '플라스틱 와인잔',
    'GLASS_WINE_GLASS': '유리 와인잔',
    'PAPER_NAPKIN': '종이 냅킨',
    'COTTON_NAPKIN': '면 냅킨',
    'LINEN_NAPKIN': '린넨 냅킨',
    'PLASTIC_TRAY': '플라스틱 쟁반',
    'WOODEN_TRAY': '나무 쟁반',
    'FLOWER_VASE': '꽃병'
  };
  return componentNames[componentCode] || componentCode;
};

const getDeliveryTypeLabel = (deliveryType: string | undefined) => {
  const deliveryTypeMap: Record<string, string> = {
    INSTANT: '즉시배달',
    IMMEDIATE: '즉시배달',
    RESERVATION: '예약배달',
  };
  return deliveryType ? deliveryTypeMap[deliveryType] || deliveryType : '배달 유형 미지정';
};

const statusText: Record<Order['status'], string> = {
  PAID_PENDING: '주문 접수 대기',
  ACCEPTED: '주문 접수',
  COOKING: '준비 중',
  COOK_DONE: '조리 완료',
  ON_DELIVERY: '배달 중',
  DELIVERED: '배달 완료',
  CANCELLED: '취소됨',
  REJECTED: '거절됨',
  REFUNDED: '환불됨',
};

const statusColor: Record<Order['status'], string> = {
  PAID_PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  COOKING: 'bg-blue-100 text-blue-800',
  COOK_DONE: 'bg-green-100 text-green-800',
  ON_DELIVERY: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
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
          order.orderId === orderId ? { ...order, status: newStatus } : order
        )
      );

      toast.success('주문 상태가 업데이트되었습니다.');
    } catch (error) {
      console.error('주문 상태 업데이트 실패:', error);
      toast.error('주문 상태 업데이트에 실패했습니다.');
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'PAID_PENDING');
  const activeOrders = orders.filter(o => ['ACCEPTED', 'COOKING', 'COOK_DONE', 'ON_DELIVERY'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'DELIVERED');

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
              key={order.orderId}
              className={`p-6 ${
                order.status === 'PAID_PENDING' ? 'border-yellow-400 border-2' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">#{order.orderId}</p>
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-3 w-3" />
                    {new Date(order.orderedAt).toLocaleTimeString('ko-KR', {
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
                  {getDeliveryTypeLabel(order.deliveryType)}
                </Badge>
              </div>

              <div className="border-t pt-4 mb-4">
                <p className="text-sm mb-2">주문 내역</p>
                {order.items.map((item, index) => (
                  <div key={index} className="mb-3">
                    <p className="text-sm text-gray-800 font-medium">
                      • {getDinnerTypeName(item.dinnerType)} ({getServingStyleName(item.servingStyle)}) x {item.quantity}
                    </p>
                    {item.components && item.components.length > 0 && (
                      <div className="ml-4 mt-1">
                        <p className="text-xs text-gray-500 mb-1">구성:</p>
                        {item.components.map((comp, compIndex) => (
                          <p key={compIndex} className="text-xs text-gray-600">
                            - {getComponentDisplayName(comp.componentCode)} x{comp.quantity}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <p className="mt-2 text-red-600">
                  총 {order.totalPrice.toLocaleString()}원
                </p>
              </div>

              <div className="space-y-2">
                <Select
                  value={order.status}
                  onValueChange={(value) =>
                    updateOrderStatus(order.orderId, value as Order['status'])
                  }
                  disabled={['DELIVERED', 'CANCELLED', 'REJECTED', 'REFUNDED'].includes(order.status)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* 현재 상태 항상 표시 */}
                    <SelectItem value={order.status}>
                      {statusText[order.status]}
                    </SelectItem>

                    {/* 상태별 허용되는 다음 상태만 표시 */}
                    {order.status === 'PAID_PENDING' && (
                      <>
                        <SelectItem value="ACCEPTED">주문 접수</SelectItem>
                        <SelectItem value="REJECTED">거절</SelectItem>
                      </>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <SelectItem value="COOKING">준비 중</SelectItem>
                    )}
                    {order.status === 'COOKING' && (
                      <SelectItem value="COOK_DONE">조리 완료</SelectItem>
                    )}
                    {order.status === 'COOK_DONE' && (
                      <SelectItem value="ON_DELIVERY">배달 중</SelectItem>
                    )}
                    {order.status === 'ON_DELIVERY' && (
                      <SelectItem value="DELIVERED">배달 완료</SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {order.status === 'PAID_PENDING' && (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => updateOrderStatus(order.orderId, 'ACCEPTED')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    접수 확인
                  </Button>
                )}

                {order.status === 'ACCEPTED' && (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => updateOrderStatus(order.orderId, 'COOKING')}
                  >
                    요리 시작
                  </Button>
                )}

                {order.status === 'COOKING' && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => updateOrderStatus(order.orderId, 'COOK_DONE')}
                  >
                    요리 완료
                  </Button>
                )}

                {order.status === 'COOK_DONE' && (
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => updateOrderStatus(order.orderId, 'ON_DELIVERY')}
                  >
                    배달 시작
                  </Button>
                )}

                {order.status === 'ON_DELIVERY' && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => updateOrderStatus(order.orderId, 'DELIVERED')}
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
