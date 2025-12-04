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
  static calculateServingStylePrice(servingStyle: string, menuReference: MenuReference, dinnerType?: string): number {
    const style = menuReference.servingStyles.find(s => s.code === servingStyle);
    const basePrice = style?.extraPrice || 0;

    // 샴페인 축제 디너는 그랜드가 기본이므로 그랜드 선택 시 추가 요금 없음
    if (dinnerType === '샴페인 축제 디너' && style?.description === '그랜드') {
      return 0;
    }

    return basePrice;
  }

  // 재료 변경에 따른 추가 요금/할인 계산 (구성 비율 기반)
  static calculateComponentModificationPrice(
    modifications: Record<string, number>,
    menuReference: MenuReference,
    baseDinnerPrice: number = 0
  ): number {
    let totalPrice = 0;

    Object.entries(modifications).forEach(([componentCode, quantityChange]) => {
      const component = menuReference.componentTypes.find(c => c.code === componentCode);
      if (component) {
        if (quantityChange > 0) {
          // 추가하는 경우: 전액 과금
          totalPrice += component.price * quantityChange;
        } else if (quantityChange < 0) {
          // 빼는 경우: 구성 비율 기반 할인 적용
          const discountAmount = this.calculateComponentDiscountAmount(
            componentCode,
            Math.abs(quantityChange),
            menuReference,
            baseDinnerPrice
          );
          totalPrice -= discountAmount;
        }
      }
    });

    return totalPrice;
  }

  // 구성 비율 기반 할인 금액 계산
  static calculateComponentDiscountAmount(
    componentCode: string,
    removedQuantity: number,
    menuReference: MenuReference,
    baseDinnerPrice: number
  ): number {
    // 해당 메뉴의 DinnerType 찾기
    const dinnerType = menuReference.dinnerTypes.find(d => d.price === baseDinnerPrice);
    if (!dinnerType) {
      // DinnerType을 찾을 수 없으면 기본 할인율 30% 적용
      const component = menuReference.componentTypes.find(c => c.code === componentCode);
      return component ? component.price * removedQuantity * 0.3 : 0;
    }

    // 모든 메뉴 동일하게 기본 가격으로 계산
    const calculationPrice = baseDinnerPrice;

    // 전체 구성 요소의 총 가격 계산
    let totalComponentsPrice = 0;
    dinnerType.recipe.forEach(recipeItem => {
      const componentType = menuReference.componentTypes.find(ct => ct.code === recipeItem.componentCode);
      if (componentType) {
        totalComponentsPrice += componentType.price * recipeItem.quantity;
      }
    });

    // 해당 구성 요소의 단위 비율 계산
    const targetComponent = menuReference.componentTypes.find(c => c.code === componentCode);
    if (!targetComponent || totalComponentsPrice === 0) {
      return 0;
    }

    const componentRatio = targetComponent.price / totalComponentsPrice;
    const discountPerUnit = calculationPrice * componentRatio;

    return discountPerUnit * removedQuantity;
  }

  // 전체 주문 가격 계산
  static calculateTotalPrice(
    dinnerType: string,
    servingStyle: string,
    quantity: number,
    modifications: Record<string, number> = {},
    menuReference: MenuReference
  ): number {
    const dinner = menuReference.dinnerTypes.find(d => d.code === dinnerType);
    const dinnerName = dinner?.description || '';

    const dinnerPrice = this.calculateDinnerPrice(dinnerType, menuReference);
    const servingPrice = this.calculateServingStylePrice(servingStyle, menuReference, dinnerName);
    const modificationPrice = this.calculateComponentModificationPrice(modifications, menuReference, dinnerPrice);

    const unitPrice = dinnerPrice + servingPrice + modificationPrice;
    const finalPrice = Math.max(0, unitPrice * quantity); // 음수 방지

    // 100원 단위로 반올림
    return Math.round(finalPrice / 100) * 100;
  }
}

export default MenuService;