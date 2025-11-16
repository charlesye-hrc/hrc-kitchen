import { VariationSelection } from './variation.types';

export interface CreateOrderItemDto {
  menuItemId: string;
  quantity: number;
  customizations?: string;  // Legacy: old free-text customizations
  specialRequests?: string;
  selectedVariations?: VariationSelection[];  // New: structured variations
}

export interface CreateOrderDto {
  items: CreateOrderItemDto[];
  deliveryNotes?: string;
  locationId: string;
}

export interface OrderWithDetails {
  id: string;
  orderNumber: string;
  userId: string;
  totalAmount: number;
  status: string;
  deliveryNotes: string | null;
  scheduledFor: Date;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemWithDetails[];
  payment: PaymentDetails | null;
}

export interface OrderItemWithDetails {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  customizations: string | null;
  specialRequests: string | null;
  menuItem: {
    name: string;
    description: string | null;
    imageUrl: string | null;
  };
}

export interface PaymentDetails {
  id: string;
  amount: number;
  status: string;
  stripePaymentIntentId: string | null;
  paidAt: Date | null;
}
