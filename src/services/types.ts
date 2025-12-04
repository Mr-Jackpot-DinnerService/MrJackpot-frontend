// 공통 타입 정의

// 인증 관련 타입
export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignUpRequest {
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    name: string;
    email: string;
    phone: string;
    address?: string;
    role: 'CUSTOMER' | 'KITCHEN_STAFF' | 'DELIVERY_STAFF';
  };
}

// 메뉴 관련 타입
export interface ComponentQuantity {
  componentCode: string;
  componentName: string;
  quantity: number;
}

export interface DinnerType {
  code: string;
  description: string;
  price: number;
  imageUrl: string;
  recipe: ComponentQuantity[];
}

export interface ServingStyle {
  code: string;
  description: string;
  extraPrice: number;
  tableware: ComponentQuantity[];
}

export interface ComponentType {
  code: string;
  description: string;
  price: number;
  stock: number;
}

export interface MenuReference {
  dinnerTypes: DinnerType[];
  servingStyles: ServingStyle[];
  componentTypes: ComponentType[];
}

// 장바구니 관련 타입
export interface CartItemRequest {
  dinnerType: string;
  servingStyle: string;
  quantity: number;
  componentModifications?: Record<string, number>;
}

export interface BackendCartItem {
  cartMenuId: number;
  dinnerType: DinnerType;
  servingStyle: ServingStyle;
  quantity: number;
  pricePerUnit: number;
  components: ComponentQuantity[];
}

export interface CartResponse {
  cartId: number;
  totalPrice: number;
  items: BackendCartItem[];
}

// 주문 관련 타입
export interface OrderRequest {
  receiverName: string;
  receiverPhone: string;
  address: string;
  paymentMethod: 'CARD' | 'CASH';
  deliveryType: 'IMMEDIATE' | 'RESERVATION';
}

export interface Order {
  id: number;
  orderNumber: string;
  status: 'PENDING' | 'COOKING' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  orderTime: string;
  totalPrice: number;
  receiverName: string;
  receiverPhone: string;
  address: string;
  paymentMethod: string;
  deliveryType: string;
  items: BackendCartItem[];
}

export interface CancelOrderRequest {
  reason: string;
}

// 직원 관리 관련 타입
export interface UpdateOrderStatusRequest {
  newStatus: 'PENDING' | 'COOKING' | 'DELIVERING' | 'COMPLETED';
}

export interface StockResponse {
  componentCode: string;
  componentName: string;
  quantity: number;
}