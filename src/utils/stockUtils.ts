import { getComponentDisplayName } from './componentNames';

export interface StockShortageInfo {
  code: string;
  displayName: string;
  label: string;
  available?: number;
  required?: number;
}

const shouldUseProvidedLabel = (label?: string | null) => {
  if (!label) {
    return false;
  }
  const trimmed = label.trim();
  if (!trimmed.includes('재고')) {
    return false;
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return false;
  }
  if (trimmed.includes('"timestamp"') || trimmed.includes('"status"')) {
    return false;
  }
  return true;
};

export const normalizeShortageInfo = (
  code?: string | null,
  label?: string | null,
  available?: number,
  required?: number
): StockShortageInfo | null => {
  if (!code) {
    return null;
  }
  const displayName = getComponentDisplayName(code);
  const normalizedLabel = shouldUseProvidedLabel(label)
    ? label!.trim()
    : `${displayName}의 재고가 부족합니다.`;

  return {
    code,
    displayName,
    label: normalizedLabel,
    available,
    required
  };
};

export const extractStockShortageInfo = (message?: string): StockShortageInfo | null => {
  if (!message || !message.includes('재고가 부족')) {
    return null;
  }

  const componentMatch = message.match(/Component:\s*([A-Za-z_]+)/i);
  const availableMatch = message.match(/Available:\s*(-?\d+)/i);
  const requiredMatch = message.match(/Required:\s*(-?\d+)/i);

  const available = availableMatch ? Number(availableMatch[1]) : undefined;
  const required = requiredMatch ? Number(requiredMatch[1]) : undefined;

  return normalizeShortageInfo(componentMatch?.[1] ?? null, message, available, required);
};

export const extractShortageInfoFromError = (error: any): StockShortageInfo | null => {
  const rawResponse = typeof error?.response === 'string' ? error.response : undefined;
  let parsed: any;

  if (rawResponse) {
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      // ignore parse errors - we'll still use raw text
    }
  }

  return (
    extractStockShortageInfo(rawResponse) ||
    extractStockShortageInfo(parsed?.trace) ||
    extractStockShortageInfo(parsed?.message) ||
    normalizeShortageInfo(
      parsed?.componentCode ?? parsed?.component ?? parsed?.componentType,
      parsed?.message,
      typeof parsed?.available === 'number' ? parsed.available : undefined,
      typeof parsed?.required === 'number' ? parsed.required : undefined
    ) ||
    extractStockShortageInfo(error?.message)
  );
};
