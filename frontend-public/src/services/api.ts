import axios from 'axios';

// Use relative URL to leverage Vite's proxy in development
// In production, set VITE_API_URL to your actual API domain
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('public_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('public_token');
      localStorage.removeItem('public_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export type VariationGroupType = 'SINGLE_SELECT' | 'MULTI_SELECT';

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

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: 'MAIN' | 'SIDE' | 'DRINK' | 'DESSERT' | 'OTHER';
  imageUrl: string | null;
  weekday: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';
  dietaryTags: string[];
  isActive: boolean;
  customizations: MenuItemCustomization[];
  variationGroups?: VariationGroup[];
}

export interface MenuItemCustomization {
  id: string;
  menuItemId: string;
  customizationName: string;
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

export interface TodaysMenuResponse {
  success: boolean;
  data: {
    items: MenuItem[];
    weekday: string | null;
    orderingWindow: any;
  };
  message?: string;
}

export interface WeeklyMenuResponse {
  success: boolean;
  data: {
    MONDAY: MenuItem[];
    TUESDAY: MenuItem[];
    WEDNESDAY: MenuItem[];
    THURSDAY: MenuItem[];
    FRIDAY: MenuItem[];
  };
}

// Menu API
export const menuApi = {
  getTodaysMenu: async (locationId?: string): Promise<TodaysMenuResponse> => {
    const params = locationId ? { locationId } : {};
    const response = await api.get('/menu/today', { params });
    return response.data;
  },

  getWeeklyMenu: async (): Promise<WeeklyMenuResponse> => {
    const response = await api.get('/menu/week');
    return response.data;
  },

  getMenuItem: async (id: string): Promise<{ success: boolean; data: MenuItem }> => {
    const response = await api.get(`/menu/items/${id}`);
    return response.data;
  },
};

export default api;
