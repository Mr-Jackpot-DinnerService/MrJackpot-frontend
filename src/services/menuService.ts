import { apiClient } from './api';
import type { MenuReference } from './types';

export class MenuService {
  // 메뉴 참조 데이터 조회 (저녁식사 타입, 서빙 스타일, 재료 정보)
  static async getMenuReferences(): Promise<MenuReference> {
    try {
      const response = await apiClient.get<MenuReference>('/menus/references');
      return response;
    } catch (error) {
      console.error('Failed to fetch menu references:', error);
      throw error;
    }
  }

  // 특정 저녁식사 타입의 기본 가격 계산
  static calculateDinnerPrice(dinnerType: string, menuReference: MenuReference): number {
    const dinner = menuReference.dinnerTypes.find(d => d.code === dinnerType);
    return dinner?.price || 0;
  }

  // 서빙 스타일의 추가 요금 계산
  static calculateServingStylePrice(servingStyle: string, menuReference: MenuReference): number {
    const style = menuReference.servingStyles.find(s => s.code === servingStyle);
    return style?.extraPrice || 0;
  }

  // 재료 변경에 따른 추가 요금 계산
  static calculateComponentModificationPrice(
    modifications: Record<string, number>,
    menuReference: MenuReference
  ): number {
    let totalPrice = 0;

    Object.entries(modifications).forEach(([componentCode, quantityChange]) => {
      const component = menuReference.componentTypes.find(c => c.code === componentCode);
      if (component && quantityChange > 0) {
        // 추가된 재료에 대해서만 요금 부과 (빼는 경우 환불 없음)
        totalPrice += component.price * quantityChange;
      }
    });

    return totalPrice;
  }

  // 전체 주문 가격 계산
  static calculateTotalPrice(
    dinnerType: string,
    servingStyle: string,
    quantity: number,
    modifications: Record<string, number> = {},
    menuReference: MenuReference
  ): number {
    const dinnerPrice = this.calculateDinnerPrice(dinnerType, menuReference);
    const servingPrice = this.calculateServingStylePrice(servingStyle, menuReference);
    const modificationPrice = this.calculateComponentModificationPrice(modifications, menuReference);

    const unitPrice = dinnerPrice + servingPrice + modificationPrice;
    return unitPrice * quantity;
  }
}

export default MenuService;