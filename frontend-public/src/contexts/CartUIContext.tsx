import React, { createContext, useContext, useMemo, useState } from 'react';

interface CartUIContextValue {
  hideActionBar: boolean;
  setHideActionBar: (hidden: boolean) => void;
}

const CartUIContext = createContext<CartUIContextValue | undefined>(undefined);

export const CartUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hideActionBar, setHideActionBar] = useState(false);
  const value = useMemo(() => ({ hideActionBar, setHideActionBar }), [hideActionBar]);

  return <CartUIContext.Provider value={value}>{children}</CartUIContext.Provider>;
};

export const useCartUI = () => {
  const context = useContext(CartUIContext);
  if (!context) {
    throw new Error('useCartUI must be used within a CartUIProvider');
  }
  return context;
};
