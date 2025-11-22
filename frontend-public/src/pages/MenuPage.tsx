import React, { useState, useEffect } from 'react';
import { menuApi, MenuItem, VariationSelection } from '../services/api';
import { useCart } from '../contexts/CartContext';
import CartDrawer from '../components/CartDrawer';
import VariationSelector from '../components/VariationSelector';
import { useLocationContext, LocationSelector } from '@hrc-kitchen/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Plus, AlertCircle, Clock, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MenuPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekday, setWeekday] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomizations, setSelectedCustomizations] = useState<string[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<VariationSelection[]>([]);
  const [specialRequests, setSpecialRequests] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [orderingWindow, setOrderingWindow] = useState<any>(null);

  const { items: cartItems, addItem, getCartItemCount, cartLocationId, setCartLocation, validateCartForLocation, removeItem } = useCart();
  const { locations, selectedLocation, selectLocation, isLoading: locationsLoading } = useLocationContext();

  useEffect(() => {
    if (selectedLocation) {
      fetchTodaysMenu();
    }
  }, [selectedLocation]);

  const validateCartForCurrentLocation = (newMenuItems: MenuItem[]) => {
    if (!selectedLocation) return;

    // Check if this is a location change (cart location differs from selected location)
    if (cartLocationId && selectedLocation.id !== cartLocationId && cartItems.length > 0) {
      // Location has changed, validate cart against NEW location's menu
      const availableMenuItemIds = newMenuItems.map(item => item.id);
      const unavailableItems = validateCartForLocation(selectedLocation.id, availableMenuItemIds);

      const cartLocation = locations.find(loc => loc.id === cartLocationId);
      const cartLocationName = cartLocation?.name || 'previous location';

      if (unavailableItems.length > 0) {
        // Show warning about unavailable items
        const unavailableNames = unavailableItems
          .map(id => cartItems.find(item => item.menuItem.id === id)?.menuItem.name)
          .filter(Boolean);

        const confirmRemove = window.confirm(
          `The following items in your cart are not available at ${selectedLocation.name}:\n\n` +
          unavailableNames.join('\n') +
          '\n\nThese items will be removed from your cart. Continue?'
        );

        if (confirmRemove) {
          // Remove all cart items with unavailable menu items (including all variations)
          unavailableItems.forEach(menuItemId => {
            cartItems.filter(item => item.menuItem.id === menuItemId).forEach(item => {
              removeItem(item.cartItemId || item.menuItem.id);
            });
          });
          setCartLocation(selectedLocation.id);
          toast.success('Cart updated for new location');
        } else {
          // User cancelled, revert to cart location
          if (cartLocation) {
            selectLocation(cartLocationId);
          }
        }
      } else {
        // All items ARE available at new location, but ask user to confirm location change
        const confirmLocationChange = window.confirm(
          `You have ${cartItems.length} item(s) in your cart from ${cartLocationName}.\n\n` +
          `Do you want to switch your cart location to ${selectedLocation.name}?`
        );

        if (confirmLocationChange) {
          setCartLocation(selectedLocation.id);
          toast.success(`Cart location updated to ${selectedLocation.name}`);
        } else {
          // User wants to keep cart at original location, revert
          if (cartLocation) {
            selectLocation(cartLocationId);
          }
        }
      }
    } else if (!cartLocationId) {
      // First time setting location
      setCartLocation(selectedLocation.id);
    }
  };

  const fetchTodaysMenu = async () => {
    if (!selectedLocation) return;

    try {
      setLoading(true);
      const response = await menuApi.getTodaysMenu(selectedLocation.id);

      if (response.success) {
        const newMenuItems = response.data.items;
        setMenuItems(newMenuItems);
        setWeekday(response.data.weekday);
        setOrderingWindow(response.data.orderingWindow);
        // Clear any previous errors when successfully loading menu
        setError(null);

        // Validate cart AFTER menu is loaded with the NEW menu items
        validateCartForCurrentLocation(newMenuItems);
      } else {
        setError(response.message || 'Failed to load menu');
      }
    } catch (err: any) {
      console.error('Error fetching menu:', err);
      setError(err.response?.data?.message || 'Failed to load menu. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setSelectedCustomizations([]);
    setSelectedVariations([]);
    setSpecialRequests('');

    // Set default variations if any exist
    if (item.variationGroups) {
      const defaultSelections: VariationSelection[] = [];
      item.variationGroups.forEach((group) => {
        const defaultOption = group.options.find((opt) => opt.isDefault);
        if (defaultOption && group.type === 'SINGLE_SELECT') {
          defaultSelections.push({ groupId: group.id, optionIds: [defaultOption.id] });
        }
      });
      setSelectedVariations(defaultSelections);
    }
  };

  const handleConfirmAddToCart = async () => {
    if (selectedItem) {
      // Validate required variation groups
      if (selectedItem.variationGroups) {
        const requiredGroups = selectedItem.variationGroups.filter((g) => g.required);
        const missingRequired = requiredGroups.some(
          (group) => !selectedVariations.find((s) => s.groupId === group.id)
        );

        if (missingRequired) {
          toast.error('Please select all required options');
          return;
        }
      }

      // If cart is empty and no location set, set it to current selected location
      if (!cartLocationId && selectedLocation) {
        setCartLocation(selectedLocation.id);
      }

      const result = await addItem(selectedItem, quantity, selectedCustomizations, specialRequests, selectedVariations);

      if (!result.success) {
        toast.error(result.message || 'Unable to add item to cart');
        return;
      }

      toast.success(`${selectedItem.name} added to cart!`);
      setSelectedItem(null);
      setQuantity(1);
      setSelectedCustomizations([]);
      setSelectedVariations([]);
      setSpecialRequests('');
    }
  };

  const calculateDialogPrice = (): number => {
    if (!selectedItem) return 0;

    let basePrice = Number(selectedItem.price);

    // Calculate variation modifiers
    if (selectedItem.variationGroups && selectedVariations.length > 0) {
      selectedVariations.forEach((selection) => {
        const group = selectedItem.variationGroups!.find((g) => g.id === selection.groupId);
        if (group) {
          selection.optionIds.forEach((optionId) => {
            const option = group.options.find((o) => o.id === optionId);
            if (option) {
              basePrice += Number(option.priceModifier);
            }
          });
        }
      });
    }

    return basePrice * quantity;
  };

  const handleCustomizationChange = (customization: string) => {
    setSelectedCustomizations((prev) =>
      prev.includes(customization)
        ? prev.filter((c) => c !== customization)
        : [...prev, customization]
    );
  };

  // Group items by category
  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as { [key: string]: MenuItem[] });

  const categories = ['MAIN', 'SIDE', 'DRINK', 'DESSERT', 'OTHER'].filter(
    (cat) => groupedItems[cat]?.length > 0
  );

  const getCategoryEmoji = (category: string) => {
    const emojis: { [key: string]: string } = {
      MAIN: '🍽️',
      SIDE: '🥗',
      DRINK: '🥤',
      DESSERT: '🍰',
      OTHER: '✨',
    };
    return emojis[category] || '📦';
  };

  // Show loading skeleton
  if (locationsLoading || (loading && selectedLocation)) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex-1">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-10 w-full sm:w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Handle case where no location is available
  if (!locationsLoading && !selectedLocation) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No locations available. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-700 to-green-600 bg-clip-text text-transparent">
            Today's Menu
          </h1>
          {weekday && (
            <p className="text-lg text-muted-foreground font-medium">
              {weekday}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial sm:min-w-[250px]">
            <LocationSelector
              locations={locations}
              selectedLocationId={selectedLocation?.id || null}
              onLocationChange={selectLocation}
              isLoading={locationsLoading}
              size="small"
              fullWidth={true}
            />
          </div>

          {/* Cart Button */}
          <Button
            size="lg"
            onClick={() => setCartOpen(true)}
            className="relative gap-2 shadow-lg hover:shadow-xl transition-shadow"
          >
            <ShoppingCart className="h-5 w-5" />
            {getCartItemCount() > 0 && (
              <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center animate-in zoom-in">
                {getCartItemCount()}
              </span>
            )}
            <span className="hidden sm:inline">Cart</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Ordering Window Alert */}
      {orderingWindow && !orderingWindow.active && (
        <Alert variant="destructive" className="mb-6">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-1">
              {orderingWindow.message || 'Ordering is currently closed'}
            </p>
            {orderingWindow.window.start && orderingWindow.window.end && (
              <p className="text-sm">
                Ordering window: {orderingWindow.window.start} - {orderingWindow.window.end}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Empty Menu */}
      {menuItems.length === 0 ? (
        <Alert variant="info" className="text-center py-12">
          <AlertDescription className="text-lg">
            No menu items available for today.
          </AlertDescription>
        </Alert>
      ) : (
        /* Menu Categories */
        <div className="space-y-12">
          {categories.map((category) => (
            <div key={category} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{getCategoryEmoji(category)}</span>
                <h2 className="text-2xl font-bold text-foreground">
                  {category}
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-green-200 to-transparent" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedItems[category].map((item) => (
                  <Card
                    key={item.id}
                    className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Image */}
                    {item.imageUrl && (
                      <div className="relative h-48 overflow-hidden bg-muted">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    )}

                    <CardHeader className="pb-3">
                      <CardTitle className="line-clamp-1">{item.name}</CardTitle>
                      <CardDescription className="line-clamp-2 min-h-[40px]">
                        {item.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-3">
                      {/* Dietary Tags */}
                      {item.dietaryTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {item.dietaryTags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Price */}
                      <p className="text-2xl font-bold text-primary">
                        ${Number(item.price).toFixed(2)}
                      </p>
                    </CardContent>

                    <CardFooter>
                      <Button
                        className="w-full gap-2"
                        onClick={() => handleAddToCart(item)}
                      >
                        <Plus className="h-4 w-4" />
                        Add to Cart
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add to Cart Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedItem?.name}</DialogTitle>
            <DialogDescription>{selectedItem?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Quantity */}
            <div className="space-y-2 pb-2">
              <Label htmlFor="quantity" className="text-sm font-semibold text-gray-900">Quantity</Label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="h-10 w-10 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 max-w-[80px] bg-white rounded-md border border-gray-300 px-3 py-2 text-center font-medium text-base text-gray-900">
                  {quantity}
                </div>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-10 w-10 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Variation Groups */}
            {selectedItem && selectedItem.variationGroups && selectedItem.variationGroups.length > 0 && (
              <VariationSelector
                variationGroups={selectedItem.variationGroups}
                selectedVariations={selectedVariations}
                onChange={setSelectedVariations}
              />
            )}

            {/* Legacy Customizations */}
            {selectedItem && selectedItem.customizations.length > 0 && (
              <div className="space-y-2">
                <Label>Customizations (Legacy)</Label>
                <div className="space-y-2">
                  {selectedItem.customizations.map((custom) => (
                    <label
                      key={custom.id}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCustomizations.includes(custom.customizationName)}
                        onChange={() => handleCustomizationChange(custom.customizationName)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{custom.customizationName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Special Requests */}
            <div className="space-y-2">
              <Label htmlFor="special-requests" className="text-sm font-semibold text-gray-900">Special Requests</Label>
              <Textarea
                id="special-requests"
                placeholder="Any special requests for this item?"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>

          {/* Price Display */}
          <div className="flex justify-between items-center py-4 border-t border-gray-200">
            <span className="text-base font-semibold text-gray-700">Total</span>
            <span className="text-2xl font-bold text-gray-900">
              ${calculateDialogPrice().toFixed(2)}
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-0">
            <Button
              variant="outline"
              onClick={() => setSelectedItem(null)}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAddToCart}
              className="flex-1 gap-2"
            >
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        orderingWindow={orderingWindow}
      />
    </div>
  );
};

export default MenuPage;
