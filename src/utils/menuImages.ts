import champFeastDinnerImg from '../assets/dinners/champ-feast-dinner.png';
import englishDinnerImg from '../assets/dinners/english-dinner.png';
import frenchDinnerImg from '../assets/dinners/french-dinner.png';
import valentineDinnerImg from '../assets/dinners/valentine-dinner.png';

const DEFAULT_PLACEHOLDER_IMAGE = '/placeholder-menu-image.jpg';

export const DINNER_TYPE_IMAGE_MAP: Record<string, string> = {
  VALENTINE_DINNER: valentineDinnerImg,
  FRENCH_DINNER: frenchDinnerImg,
  ENGLISH_DINNER: englishDinnerImg,
  CHAMP_FEAST_DINNER: champFeastDinnerImg,
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
