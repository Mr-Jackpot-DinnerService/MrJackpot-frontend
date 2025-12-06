import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CartService, type CartItemRequest } from '../services';
import { ApiError } from '../services/api';
import { useAuth } from './AuthContext';

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
  addToCart: (item: Omit<CartItem, 'id'>) => Promise<void>;
  removeFromCart: (id: string) => void;
  removeFromCartBackend: (cartMenuId: number) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => Promise<void>;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { user } = useAuth();

  // 로그인된 사용자의 장바구니 데이터 로드
  useEffect(() => {
    const loadCart = async () => {
      console.log('[CartContext] loadCart 호출됨, user:', user?.username, 'role:', user?.role);

      if (!user || user.role !== 'CUSTOMER') {
        console.log('[CartContext] 사용자가 없거나 고객이 아님, 장바구니 비움');
        setItems([]);
        return;
      }

      try {
        console.log('[CartContext] 장바구니 로드 시도 중...', user.username);
        const cartResponse = await CartService.getCart();
        console.log('[CartContext] 장바구니 로드 성공:', cartResponse);

        // 백엔드 CartResponse를 프론트엔드 CartItem 형태로 변환
        const convertedItems: CartItem[] = cartResponse.items.map(item => ({
          id: item.cartMenuId?.toString() || Date.now().toString(),
          menuId: item.dinnerType.code,
          name: item.dinnerType.description,
          price: Math.round(item.pricePerUnit / 100) * 100, // 단위 가격 반올림
          quantity: item.quantity,
          options: [item.servingStyle.description],
          image: item.dinnerType.imageUrl || '/placeholder-menu-image.jpg',
          request: undefined, // 백엔드에서 지원하지 않음
          dinnerType: item.dinnerType.code,
          servingStyle: item.servingStyle.code,
          componentModifications: item.components?.reduce((acc, comp) => {
            acc[comp.componentCode] = comp.quantity;
            return acc;
          }, {} as Record<string, number>) || {}
        }));

        console.log('[CartContext] 변환된 장바구니 아이템:', convertedItems.length + '개');
        setItems(convertedItems);
      } catch (error) {
        console.error('[CartContext] Failed to load cart:', error);
        console.log('[CartContext] 장바구니가 비어있거나 에러 발생, 빈 장바구니로 설정');
        // 에러 발생시(빈 장바구니 포함) 빈 배열로 설정
        setItems([]);
      }
    };

    loadCart();
  }, [user]);

  const addToCart = async (item: Omit<CartItem, 'id'>) => {
    try {
      // 백엔드 API에 장바구니 아이템 추가 (백엔드에서 병합 처리)
      if (item.dinnerType && item.servingStyle) {
        const cartRequest: CartItemRequest = {
          dinnerType: item.dinnerType,
          servingStyle: item.servingStyle,
          quantity: item.quantity, // 요청한 수량만 전송 (백엔드에서 병합 처리)
          componentModifications: item.componentModifications,
          calculatedPrice: item.price // 프론트엔드에서 계산된 가격 전달
        };

        console.log('장바구니 추가 요청:', cartRequest);
        console.log('컴포넌트 수정사항:', cartRequest.componentModifications);
        await CartService.addToCart(cartRequest);
        console.log('장바구니 추가 성공 (백엔드에서 병합 처리됨)');

        // 성공 후 장바구니 다시 로드
        console.log('장바구니 다시 로드 중...');
        const cartResponse = await CartService.getCart();
        console.log('장바구니 재로드 성공:', cartResponse);
        const convertedItems: CartItem[] = cartResponse.items.map(backendItem => ({
          id: backendItem.cartMenuId?.toString() || Date.now().toString(),
          menuId: backendItem.dinnerType.code,
          name: backendItem.dinnerType.description,
          price: Math.round(backendItem.pricePerUnit / 100) * 100,
          quantity: backendItem.quantity,
          options: [backendItem.servingStyle.description],
          image: backendItem.dinnerType.imageUrl || '/placeholder-menu-image.jpg',
          request: undefined, // 백엔드에서 지원하지 않음
          dinnerType: backendItem.dinnerType.code,
          servingStyle: backendItem.servingStyle.code,
          componentModifications: backendItem.components?.reduce((acc, comp) => {
            acc[comp.componentCode] = comp.quantity;
            return acc;
          }, {} as Record<string, number>) || {}
        }));
        setItems(convertedItems);
      } else {
        throw new Error('필수 정보가 누락되었습니다.');
      }
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      // 에러 발생시 토스트 메시지로 사용자에게 알림
      console.error('장바구니 추가 실패 - 네트워크 연결을 확인해주세요');

      if (error instanceof ApiError) {
        throw error;
      }

      // 오프라인 모드에서는 간단한 로컬 추가만 수행
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

  const removeFromCartBackend = async (cartMenuId: number) => {
    try {
      console.log('[CartContext] removeFromCartBackend 호출됨, cartMenuId:', cartMenuId);
      console.log('[CartContext] 삭제 전 로컬 아이템 개수:', items.length);

      // 백엔드에서 아이템 삭제
      await CartService.removeFromCart(cartMenuId);
      console.log('[CartContext] 백엔드 삭제 완료');

      // 성공 후 장바구니 다시 로드하여 로컬 상태 업데이트
      const cartResponse = await CartService.getCart();
      console.log('[CartContext] 삭제 후 백엔드 응답:', cartResponse);

      // 백엔드 CartResponse를 프론트엔드 CartItem 형태로 변환
      const convertedItems: CartItem[] = cartResponse.items.map(item => ({
        id: item.cartMenuId?.toString() || Date.now().toString(),
        menuId: item.dinnerType.code,
        name: item.dinnerType.description,
        price: Math.round(item.pricePerUnit / 100) * 100,
        quantity: item.quantity,
        options: [item.servingStyle.description],
        image: item.dinnerType.imageUrl || '/placeholder-menu-image.jpg',
        request: undefined,
        dinnerType: item.dinnerType.code,
        servingStyle: item.servingStyle.code,
        componentModifications: item.components?.reduce((acc, comp) => {
          acc[comp.componentCode] = comp.quantity;
          return acc;
        }, {} as Record<string, number>) || {}
      }));

      console.log('[CartContext] 변환 후 아이템 개수:', convertedItems.length);
      setItems(convertedItems);
      console.log('[CartContext] 백엔드 아이템 삭제 후 로컬 상태 업데이트됨:', convertedItems.length + '개');
    } catch (error) {
      console.error('[CartContext] Failed to remove item from backend cart:', error);
      throw error; // 에러를 다시 던져서 UI에서 처리할 수 있도록
    }
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
      value={{ items, addToCart, removeFromCart, removeFromCartBackend, updateQuantity, clearCart, totalPrice }}
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
