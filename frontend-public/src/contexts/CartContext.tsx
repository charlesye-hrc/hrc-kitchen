import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MenuItem, VariationSelection, SelectedVariation } from '../services/api';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  customizations: string[];
  specialRequests?: string;
  selectedVariations?: VariationSelection[];
}

interface CartContextType {
  items: CartItem[];
  addItem: (
    menuItem: MenuItem,
    quantity: number,
    customizations: string[],
    specialRequests?: string,
    selectedVariations?: VariationSelection[]
  ) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateCustomizations: (menuItemId: string, customizations: string[]) => void;
  updateSpecialRequests: (menuItemId: string, specialRequests: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  calculateItemPrice: (item: CartItem) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever it changes (after initialization)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const calculateItemPrice = (item: CartItem): number => {
    let basePrice = Number(item.menuItem.price);

    // Calculate variation modifiers
    if (item.selectedVariations && item.menuItem.variationGroups) {
      for (const selection of item.selectedVariations) {
        const group = item.menuItem.variationGroups.find(g => g.id === selection.groupId);
        if (group) {
          for (const optionId of selection.optionIds) {
            const option = group.options.find(o => o.id === optionId);
            if (option) {
              basePrice += Number(option.priceModifier);
            }
          }
        }
      }
    }

    return basePrice;
  };

  const addItem = (
    menuItem: MenuItem,
    quantity: number,
    customizations: string[],
    specialRequests?: string,
    selectedVariations?: VariationSelection[]
  ) => {
    setItems((prevItems) => {
      // Check if item already exists in cart
      const existingItemIndex = prevItems.findIndex(
        (item) => item.menuItem.id === menuItem.id
      );

      if (existingItemIndex > -1) {
        // Update existing item
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
          customizations,
          specialRequests,
          selectedVariations,
        };
        return updatedItems;
      } else {
        // Add new item
        return [...prevItems, { menuItem, quantity, customizations, specialRequests, selectedVariations }];
      }
    });
  };

  const removeItem = (menuItemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.menuItem.id !== menuItemId));
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      )
    );
  };

  const updateCustomizations = (menuItemId: string, customizations: string[]) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, customizations } : item
      )
    );
  };

  const updateSpecialRequests = (menuItemId: string, specialRequests: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, specialRequests } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('cart');
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => {
      const itemPrice = calculateItemPrice(item);
      return total + itemPrice * item.quantity;
    }, 0);
  };

  const getCartItemCount = () => {
    return items.reduce((count, item) => count + (Number(item.quantity) || 0), 0);
  };

  const value: CartContextType = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateCustomizations,
    updateSpecialRequests,
    clearCart,
    getCartTotal,
    getCartItemCount,
    calculateItemPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
