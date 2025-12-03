import { apiClient } from './api';
import type { Order, UpdateOrderStatusRequest, StockResponse } from './types';

export class StaffService {
  // === 주문 관리 (직원용) ===

  // 실시간 주문 목록 조회
  static async getLiveOrders(): Promise<Order[]> {
    try {
      const orders = await apiClient.get<Order[]>('/staff/orders/live');
      return orders;
    } catch (error) {
      console.error('Failed to fetch live orders:', error);
      throw error;
    }
  }

  // 주문 상태 변경
  static async updateOrderStatus(orderId: number, request: UpdateOrderStatusRequest): Promise<void> {
    try {
      await apiClient.put<void>(`/staff/orders/${orderId}/status`, request);
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  }

  // === 재고 관리 (직원용) ===

  // 모든 재고 조회
  static async getAllStocks(): Promise<StockResponse[]> {
    try {
      const stocks = await apiClient.get<StockResponse[]>('/staff/stocks');
      return stocks;
    } catch (error) {
      console.error('Failed to fetch stocks:', error);
      throw error;
    }
  }

  // 재고 조정
  static async updateStock(componentType: string, quantity: number): Promise<void> {
    try {
      const params = new URLSearchParams({
        componentType,
        quantity: quantity.toString()
      });

      await apiClient.put<void>(`/staff/stocks?${params}`);
    } catch (error) {
      console.error('Failed to update stock:', error);
      throw error;
    }
  }

  // === 유틸리티 함수들 ===

  // 주문을 상태별로 그룹핑
  static groupOrdersByStatus(orders: Order[]): Record<string, Order[]> {
    return orders.reduce((groups, order) => {
      const status = order.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(order);
      return groups;
    }, {} as Record<string, Order[]>);
  }

  // 재고 부족 아이템 필터링
  static getLowStockItems(stocks: StockResponse[], minThreshold: number = 10): StockResponse[] {
    return stocks.filter(stock => stock.quantity < minThreshold);
  }

  // 재고 상태 확인
  static getStockStatus(quantity: number, minThreshold: number = 10): 'low' | 'medium' | 'high' {
    if (quantity < minThreshold) return 'low';
    if (quantity < minThreshold * 2) return 'medium';
    return 'high';
  }

  // 재고 상태별 색상 클래스 반환
  static getStockColorClass(quantity: number, minThreshold: number = 10): string {
    const status = this.getStockStatus(quantity, minThreshold);
    const colorMap = {
      'low': 'bg-red-100 text-red-800 border-red-300',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'high': 'bg-green-100 text-green-800 border-green-300'
    };
    return colorMap[status];
  }

  // 다음 가능한 주문 상태 반환
  static getNextOrderStatus(currentStatus: Order['status']): Order['status'] | null {
    const statusFlow = {
      'PENDING': 'COOKING',
      'COOKING': 'DELIVERING',
      'DELIVERING': 'COMPLETED',
      'COMPLETED': null,
      'CANCELLED': null
    };
    return statusFlow[currentStatus] || null;
  }

  // 주문 상태 변경 가능 여부 확인
  static canUpdateOrderStatus(currentStatus: Order['status']): boolean {
    return ['PENDING', 'COOKING', 'DELIVERING'].includes(currentStatus);
  }
}

export default StaffService;