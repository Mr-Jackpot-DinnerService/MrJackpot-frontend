import { apiClient } from './api';
import type { OrderRequest, Order, CancelOrderRequest } from './types';

export class OrderService {
  // 주문 생성 (결제)
  static async placeOrder(request: OrderRequest): Promise<number> {
    try {
      const orderId = await apiClient.post<number>('/orders', request);
      return orderId;
    } catch (error) {
      console.error('Failed to place order:', error);
      throw error;
    }
  }

  // 내 주문 내역 조회
  static async getMyOrders(): Promise<Order[]> {
    try {
      const orders = await apiClient.get<Order[]>('/orders/my');
      return orders;
    } catch (error) {
      console.error('Failed to fetch my orders:', error);
      throw error;
    }
  }

  // 주문 취소
  static async cancelOrder(orderId: number, request: CancelOrderRequest): Promise<void> {
    try {
      await apiClient.post<void>(`/orders/${orderId}/cancel`, request);
    } catch (error) {
      console.error('Failed to cancel order:', error);
      throw error;
    }
  }

  // 주문 상태별 필터링
  static filterOrdersByStatus(orders: Order[], status: Order['status']): Order[] {
    return orders.filter(order => order.status === status);
  }

  // 진행 중인 주문 확인
  static getActiveOrders(orders: Order[]): Order[] {
    return orders.filter(order =>
      ['PENDING', 'COOKING', 'DELIVERING'].includes(order.status)
    );
  }

  // 완료된 주문 확인
  static getCompletedOrders(orders: Order[]): Order[] {
    return orders.filter(order =>
      ['COMPLETED', 'CANCELLED'].includes(order.status)
    );
  }

  // 주문 상태 텍스트 반환
  static getStatusText(status: Order['status']): string {
    const statusMap = {
      'PAID_PENDING': '주문 접수 대기',
      'ACCEPTED': '주문 접수',
      'COOKING': '조리 중',
      'COOK_DONE': '조리 완료',
      'ON_DELIVERY': '배달 중',
      'DELIVERED': '배달 완료',
      'CANCELLED': '취소',
      'REJECTED': '거절됨',
      'REFUNDED': '환불됨'
    };
    return statusMap[status] || status;
  }

  // 주문 상태 색상 클래스 반환
  static getStatusColorClass(status: Order['status']): string {
    const colorMap = {
      'PAID_PENDING': 'bg-yellow-100 text-yellow-800',
      'ACCEPTED': 'bg-blue-100 text-blue-800',
      'COOKING': 'bg-orange-100 text-orange-800',
      'COOK_DONE': 'bg-indigo-100 text-indigo-800',
      'ON_DELIVERY': 'bg-purple-100 text-purple-800',
      'DELIVERED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-gray-100 text-gray-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'REFUNDED': 'bg-pink-100 text-pink-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }
}

export default OrderService;