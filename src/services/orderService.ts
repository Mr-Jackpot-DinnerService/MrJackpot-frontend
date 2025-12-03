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
      'PENDING': '주문 접수',
      'COOKING': '조리 중',
      'DELIVERING': '배달 중',
      'COMPLETED': '완료',
      'CANCELLED': '취소'
    };
    return statusMap[status] || status;
  }

  // 주문 상태 색상 클래스 반환
  static getStatusColorClass(status: Order['status']): string {
    const colorMap = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'COOKING': 'bg-blue-100 text-blue-800',
      'DELIVERING': 'bg-purple-100 text-purple-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-gray-100 text-gray-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }
}

export default OrderService;