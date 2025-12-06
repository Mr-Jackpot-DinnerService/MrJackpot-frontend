import { apiClient } from './api';
import type { CartItemRequest, CartResponse } from './types';

export class CartService {
  // 장바구니 조회
  static async getCart(): Promise<CartResponse> {
    try {
      const response = await apiClient.get<CartResponse>('/cart');
      return response;
    } catch (error: any) {
      console.error('Failed to fetch cart:', error);

      // 404나 장바구니가 없는 경우 빈 장바구니 반환
      if (error?.response?.status === 404 || error?.response?.status === 400) {
        console.log('Cart not found, returning empty cart');
        return {
          cartId: 0,
          totalPrice: 0,
          items: []
        };
      }

      throw error;
    }
  }

  // 장바구니에 아이템 추가
  static async addToCart(item: CartItemRequest): Promise<void> {
    try {
      await apiClient.post<void>('/cart/items', item);
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      throw error;
    }
  }

  // 장바구니에서 아이템 삭제
  static async removeFromCart(cartMenuId: number): Promise<void> {
    try {
      await apiClient.delete<void>(`/cart/items/${cartMenuId}`);
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      throw error;
    }
  }

  // 장바구니 아이템 수량 업데이트
  static async updateQuantity(cartMenuId: number, quantity: number): Promise<void> {
    try {
      await apiClient.patch<void>(`/cart/items/${cartMenuId}?quantity=${quantity}`);
    } catch (error) {
      console.error('Failed to update item quantity:', error);
      throw error;
    }
  }

  // 장바구니 비우기
  static async clearCart(): Promise<void> {
    try {
      await apiClient.delete<void>('/cart');
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  }

  // 장바구니가 비어있는지 확인
  static async isCartEmpty(): Promise<boolean> {
    try {
      const cart = await this.getCart();
      return cart.items.length === 0;
    } catch (error) {
      console.error('Failed to check if cart is empty:', error);
      return true;
    }
  }

  // 장바구니 총 가격 계산 (프론트엔드에서 임시 계산용)
  static calculateCartTotal(items: CartResponse['items']): number {
    return items.reduce((total, item) => total + (item.pricePerUnit * item.quantity), 0);
  }
}

export default CartService;