import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { getComponentDisplayName } from '../utils/componentNames';
import { type StockShortageInfo } from '../utils/stockUtils';

interface StockShortageState {
  displayName: string;
  available?: number;
  required?: number;
  label?: string;
}

interface StockContextValue {
  unavailableComponents: Record<string, StockShortageState>;
  registerShortage: (info: StockShortageInfo) => void;
  clearShortage: (code?: string) => void;
}

const StockContext = createContext<StockContextValue | undefined>(undefined);

type StockMapEntry = StockShortageState | string;

export function StockProvider({ children }: { children: ReactNode }) {
  const [rawComponents, setRawComponents] = useState<Record<string, StockMapEntry>>({});

  const registerShortage = (info: StockShortageInfo) => {
    if (!info?.code) {
      return;
    }
    setRawComponents(prev => {
      const existingEntry = prev[info.code];
      const existing = typeof existingEntry === 'string'
        ? { displayName: existingEntry }
        : existingEntry;
      const next: StockShortageState = {
        displayName: info.displayName || existing?.displayName || getComponentDisplayName(info.code),
        available: typeof info.available === 'number' ? info.available : existing?.available,
        required: typeof info.required === 'number' ? info.required : existing?.required,
        label: info.label || existing?.label
      };
      if (
        existing &&
        existing.displayName === next.displayName &&
        existing.available === next.available &&
        existing.required === next.required &&
        existing.label === next.label
      ) {
        return prev;
      }
      return {
        ...prev,
        [info.code]: next
      };
    });
  };

  const clearShortage = (code?: string) => {
    if (!code) {
      setRawComponents({});
      return;
    }

    setRawComponents(prev => {
      if (!prev[code]) {
        return prev;
      }
      const updated = { ...prev };
      delete updated[code];
      return updated;
    });
  };

  const normalizedComponents = useMemo(() => {
    const normalized: Record<string, StockShortageState> = {};
    Object.entries(rawComponents).forEach(([code, entry]) => {
      if (typeof entry === 'string') {
        normalized[code] = { displayName: entry };
      } else if (entry) {
        normalized[code] = entry;
      }
    });
    return normalized;
  }, [rawComponents]);

  return (
    <StockContext.Provider value={{ unavailableComponents: normalizedComponents, registerShortage, clearShortage }}>
      {children}
    </StockContext.Provider>
  );
}

export function useStock() {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStock must be used within a StockProvider');
  }
  return context;
}
