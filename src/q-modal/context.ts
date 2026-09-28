import { createContext, useContext } from 'react';

import type { ModalRequest } from './modal-state';

export interface ModalContextValue {
  upsert: (request: ModalRequest) => void;
  remove: (id: string) => void;
  waitUntilHidden: () => Promise<void>;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

export const useQModalHost = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useQModalHost must be used inside QModalProvider');
  }
  return { waitUntilHidden: context.waitUntilHidden };
};
