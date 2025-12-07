const DEFAULT_PLACEHOLDER_IMAGE = '/placeholder-menu-image.jpg';

// public 폴더의 이미지 사용 (Vite가 정적 자산으로 서빙)
export const DINNER_TYPE_IMAGE_MAP: Record<string, string> = {
  VALENTINE_DINNER: '/images/dinners/valentine-dinner.png',
  FRENCH_DINNER: '/images/dinners/french-dinner.png',
  ENGLISH_DINNER: '/images/dinners/english-dinner.png',
  CHAMP_FEAST_DINNER: '/images/dinners/champ-feast-dinner.png',
};

/**
 * Returns the representative image URL for a dinner type.
 * Falls back to the provided default or the global placeholder.
 */
export function getDinnerImageSrc(dinnerType?: string, fallback?: string): string {
  if (dinnerType && DINNER_TYPE_IMAGE_MAP[dinnerType]) {
    return DINNER_TYPE_IMAGE_MAP[dinnerType];
  }
  return fallback || DEFAULT_PLACEHOLDER_IMAGE;
}

export { DEFAULT_PLACEHOLDER_IMAGE };
