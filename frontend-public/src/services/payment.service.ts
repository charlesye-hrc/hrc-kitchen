import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  paymentIntent: {
    id: string;
    status: string;
    amount: number;
  };
}

export const paymentService = {
  async createPaymentIntent(amount: number, orderId?: string): Promise<CreatePaymentIntentResponse> {
    const response = await axios.post(`${API_URL}/payment/create-intent`, {
      amount,
      orderId,
    });
    return response.data;
  },

  async confirmPayment(paymentIntentId: string): Promise<ConfirmPaymentResponse> {
    const response = await axios.post(`${API_URL}/payment/confirm`, {
      paymentIntentId,
    });
    return response.data;
  },
};
