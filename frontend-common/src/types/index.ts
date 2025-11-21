// Location Types
export interface Location {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// User and Auth Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'STAFF' | 'KITCHEN' | 'FINANCE' | 'ADMIN';
  isActive?: boolean;
  department?: string;
  location?: string;
  phone?: string;
  lastSelectedLocationId?: string | null;
}

export interface AuthResponse {
  user: User;
  token: string;
  hasAdminAccess: boolean;
  accessibleLocations?: Location[];
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  department?: string;
  location?: string;
  phone?: string;
}

// Menu and Product Types
export type MenuCategory = 'MAIN' | 'SIDE' | 'DRINK' | 'DESSERT' | 'OTHER';
export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type VariationGroupType = 'SINGLE_SELECT' | 'MULTI_SELECT';

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: MenuCategory;
  imageUrl: string | null;
  weekdays: Weekday[]; // Changed from single weekday to array
  dietaryTags: string[];
  customizations: MenuItemCustomization[];
  variationGroups?: VariationGroup[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItemCustomization {
  id: string;
  menuItemId: string;
  customizationName: string;
  createdAt?: string;
}

export interface VariationGroup {
  id: string;
  menuItemId: string;
  name: string;
  type: VariationGroupType;
  required: boolean;
  displayOrder: number;
  options: VariationOption[];
  createdAt: string;
  updatedAt: string;
}

export interface VariationOption {
  id: string;
  variationGroupId: string;
  name: string;
  priceModifier: number;
  isDefault: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface VariationSelection {
  groupId: string;
  optionIds: string[];
}

export interface SelectedVariation {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceModifier: number;
}

// Order Types
export type OrderStatus = 'PLACED' | 'PARTIALLY_FULFILLED' | 'FULFILLED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Order {
  id: string;
  userId?: string | null;
  locationId?: string | null;
  guestEmail?: string | null;
  guestFirstName?: string | null;
  guestLastName?: string | null;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentId?: string | null;
  fulfillmentStatus: OrderStatus;
  specialRequests?: string | null;
  orderDate: string;
  orderItems: OrderItem[];
  user?: User;
  location?: Location;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  customizations: string[] | null;
  selectedVariations: SelectedVariation[] | null;
  priceAtPurchase: number;
  fulfillmentStatus: OrderStatus;
  menuItem: MenuItem;
  createdAt: string;
}

// Cart Types
export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  customizations: string[];
  selectedVariations: SelectedVariation[];
  specialRequest?: string;
}

export interface CreateOrderData {
  items: Array<{
    menuItemId: string;
    quantity: number;
    customizations?: string;
    selectedVariations?: VariationSelection[];
    specialRequests?: string;
  }>;
  deliveryNotes?: string;
  locationId: string;
}

// System Config Types
export interface SystemConfig {
  ordering_window_start: string;
  ordering_window_end: string;
  restricted_role_domain: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Kitchen Dashboard Types
export interface OrderSummaryItem {
  menuItemId: string;
  menuItemName: string;
  category: MenuCategory;
  totalQuantity: number;
  orders: OrderWithItems[];
}

export interface OrderWithItems extends Order {
  orderItems: OrderItem[];
}

export interface DailyStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  fulfilledOrders: number;
}

// Report Types
export interface RevenueByUserReport {
  userId: string;
  userFullName: string;
  userEmail: string;
  totalOrders: number;
  totalSpent: number;
}

export interface PopularItemReport {
  menuItemId: string;
  menuItemName: string;
  category: MenuCategory;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

export interface SummaryReport {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  uniqueCustomers: number;
  topSellingItem: string;
}
