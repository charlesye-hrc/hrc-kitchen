import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MenuItem, VariationSelection, SelectedVariation } from '../services/api';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  customizations: string[];
  specialRequests?: string;
  selectedVariations?: VariationSelection[];
  cartItemId?: string; // Unique ID for cart item (menuItemId + variations hash)
}

interface CartContextType {
  items: CartItem[];
  cartLocationId: string | null;
  addItem: (
    menuItem: MenuItem,
    quantity: number,
    customizations: string[],
    specialRequests?: string,
    selectedVariations?: VariationSelection[]
  ) => Promise<{ success: boolean; message?: string }>;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateCustomizations: (menuItemId: string, customizations: string[]) => void;
  updateSpecialRequests: (menuItemId: string, specialRequests: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  calculateItemPrice: (item: CartItem) => number;
  setCartLocation: (locationId: string | null) => void;
  validateCartForLocation: (locationId: string, availableMenuItemIds: string[]) => string[];
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
  const [cartLocationId, setCartLocationId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper function to generate a unique cart item ID based on menu item and variations
  const generateCartItemId = (menuItemId: string, selectedVariations?: VariationSelection[]): string => {
    if (!selectedVariations || selectedVariations.length === 0) {
      return menuItemId;
    }

    // Sort variations to ensure consistent ordering
    const sortedVariations = [...selectedVariations].sort((a, b) => a.groupId.localeCompare(b.groupId));
    const variationsString = sortedVariations
      .map(v => `${v.groupId}:${[...v.optionIds].sort().join(',')}`)
      .join('|');

    return `${menuItemId}__${variationsString}`;
  };

  // Helper function to check if two cart items are the same (same menu item and variations)
  const isSameCartItem = (item1: CartItem, menuItemId: string, selectedVariations?: VariationSelection[]): boolean => {
    const id1 = item1.cartItemId || generateCartItemId(item1.menuItem.id, item1.selectedVariations);
    const id2 = generateCartItemId(menuItemId, selectedVariations);
    return id1 === id2;
  };

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedLocationId = localStorage.getItem('cartLocationId');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
      }
    }
    if (savedLocationId) {
      setCartLocationId(savedLocationId);
    }
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever it changes (after initialization)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('cart', JSON.stringify(items));
      if (cartLocationId) {
        localStorage.setItem('cartLocationId', cartLocationId);
      } else {
        localStorage.removeItem('cartLocationId');
      }
    }
  }, [items, cartLocationId, isInitialized]);

  // Clear cart location when cart becomes empty
  useEffect(() => {
    if (isInitialized && items.length === 0 && cartLocationId) {
      console.log('[Cart] Cart is empty, clearing cart location');
      setCartLocationId(null);
    }
  }, [items, cartLocationId, isInitialized]);

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

  const addItem = async (
    menuItem: MenuItem,
    quantity: number,
    customizations: string[],
    specialRequests?: string,
    selectedVariations?: VariationSelection[]
  ): Promise<{ success: boolean; message?: string }> => {
    // Check inventory availability if cart has a location
    if (cartLocationId) {
      try {
        // Calculate total quantity including existing cart items
        const existingItem = items.find((item) => isSameCartItem(item, menuItem.id, selectedVariations));
        const totalQuantity = (existingItem?.quantity || 0) + quantity;

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/inventory/check-availability`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [{
              menuItemId: menuItem.id,
              locationId: cartLocationId,
              quantity: totalQuantity,
            }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const availability = data.results[0];

          if (!availability.available) {
            return {
              success: false,
              message: availability.currentStock === -1
                ? 'This item is currently unavailable'
                : `Only ${availability.currentStock} available in stock`,
            };
          }
        }
      } catch (error) {
        console.error('Failed to check inventory:', error);
        // Continue anyway - don't block on inventory check failure
      }
    }

    // Add item to cart
    setItems((prevItems) => {
      // Check if item with same menu item ID and variations already exists in cart
      const existingItemIndex = prevItems.findIndex(
        (item) => isSameCartItem(item, menuItem.id, selectedVariations)
      );

      const cartItemId = generateCartItemId(menuItem.id, selectedVariations);

      if (existingItemIndex > -1) {
        // Update existing item - only increment quantity
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
        };
        return updatedItems;
      } else {
        // Add new item
        return [...prevItems, {
          menuItem,
          quantity,
          customizations,
          specialRequests,
          selectedVariations,
          cartItemId
        }];
      }
    });

    return { success: true };
  };

  const removeItem = (cartItemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => (item.cartItemId || item.menuItem.id) !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        (item.cartItemId || item.menuItem.id) === cartItemId ? { ...item, quantity } : item
      )
    );
  };

  const updateCustomizations = (cartItemId: string, customizations: string[]) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        (item.cartItemId || item.menuItem.id) === cartItemId ? { ...item, customizations } : item
      )
    );
  };

  const updateSpecialRequests = (cartItemId: string, specialRequests: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        (item.cartItemId || item.menuItem.id) === cartItemId ? { ...item, specialRequests } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setCartLocationId(null);
    localStorage.removeItem('cart');
    localStorage.removeItem('cartLocationId');
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

  const setCartLocation = (locationId: string | null) => {
    setCartLocationId(locationId);
  };

  const validateCartForLocation = (locationId: string, availableMenuItemIds: string[]): string[] => {
    // Returns array of menu item IDs that are not available at the new location
    const unavailableItems: string[] = [];

    items.forEach((item) => {
      if (!availableMenuItemIds.includes(item.menuItem.id)) {
        unavailableItems.push(item.menuItem.id);
      }
    });

    return unavailableItems;
  };

  const value: CartContextType = {
    items,
    cartLocationId,
    addItem,
    removeItem,
    updateQuantity,
    updateCustomizations,
    updateSpecialRequests,
    clearCart,
    getCartTotal,
    getCartItemCount,
    calculateItemPrice,
    setCartLocation,
    validateCartForLocation,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
