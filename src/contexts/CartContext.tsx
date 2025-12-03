import { createContext, useContext, useState, ReactNode } from 'react';
import { CartService, type CartItemRequest } from '../services';

export interface CartItem {
  id: string;
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  options: string[];
  image: string;
  request?: string;
  // API 연결을 위한 추가 필드
  dinnerType?: string;
  servingStyle?: string;
  componentModifications?: Record<string, number>;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = async (item: Omit<CartItem, 'id'>) => {
    try {
      // 백엔드 API에 장바구니 아이템 추가
      if (item.dinnerType && item.servingStyle) {
        const cartRequest: CartItemRequest = {
          dinnerType: item.dinnerType,
          servingStyle: item.servingStyle,
          quantity: item.quantity,
          componentModifications: item.componentModifications,
        };

        await CartService.addToCart(cartRequest);
      }

      // 로컬 상태도 업데이트
      const newItem: CartItem = {
        ...item,
        id: Date.now().toString(),
      };
      setItems(prev => [...prev, newItem]);
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      // 에러가 발생해도 로컬에는 추가 (오프라인 모드 지원)
      const newItem: CartItem = {
        ...item,
        id: Date.now().toString(),
      };
      setItems(prev => [...prev, newItem]);
    }
  };

  const removeFromCart = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = async () => {
    try {
      // 백엔드 API에서 장바구니 비우기
      await CartService.clearCart();
    } catch (error) {
      console.error('Failed to clear cart on backend:', error);
      // 에러가 발생해도 로컬은 비우기
    } finally {
      setItems([]);
    }
  };

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
