export const componentDisplayNames: Record<string, string> = {
  STEAK: '스테이크',
  WINE: '와인',
  COFFEE: '커피',
  SALAD: '샐러드',
  SCRAMBLED_EGG: '에그 스크램블',
  BACON: '베이컨',
  BREAD: '빵',
  BAGUETTE: '바게트빵',
  CHAMPAGNE: '샴페인',
  PLASTIC_PLATE: '플라스틱 접시',
  CERAMIC_PLATE: '도자기 접시',
  CUPID_PLATE: '큐피드 접시',
  PLASTIC_CUP: '플라스틱 컵',
  CERAMIC_CUP: '도자기 컵',
  PLASTIC_WINE_GLASS: '플라스틱 와인잔',
  GLASS_WINE_GLASS: '유리 와인잔',
  PAPER_NAPKIN: '종이 냅킨',
  COTTON_NAPKIN: '면 냅킨',
  LINEN_NAPKIN: '린넨 냅킨',
  PLASTIC_TRAY: '플라스틱 쟁반',
  WOODEN_TRAY: '나무 쟁반',
  FLOWER_VASE: '꽃병'
};

export const getComponentDisplayName = (code?: string) => {
  if (!code) {
    return '재고';
  }
  return componentDisplayNames[code] || code;
};
