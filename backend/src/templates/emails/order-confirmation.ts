import { wrapInBaseTemplate } from './base';
import { OrderConfirmationEmailData } from '../../types/email.types';

export function generateOrderConfirmationEmail(data: OrderConfirmationEmailData): string {
  // Generate order items table
  const itemsHtml = data.items.map(item => {
    let itemDetails = `${item.name}`;
    if (item.variations) {
      itemDetails += `<br><span class="muted" style="font-size: 12px;">${item.variations}</span>`;
    }
    if (item.specialRequests) {
      itemDetails += `<br><span class="muted" style="font-size: 12px;">Note: ${item.specialRequests}</span>`;
    }

    return `
      <tr>
        <td>${itemDetails}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="text-align: right;">$${item.subtotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const content = `
    <h1>Order Confirmation</h1>
    <p>Hi ${data.customerName},</p>
    <p>Thank you for your order! We've received your order and it's being prepared.</p>

    <div class="info-box">
      <p style="margin: 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
      <p style="margin: 8px 0 0 0;"><strong>Order Date:</strong> ${data.orderDate}</p>
    </div>

    <h2>Order Details</h2>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr class="total-row">
          <td colspan="3"><strong>Total</strong></td>
          <td style="text-align: right;"><strong>$${data.totalAmount.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>

    <h2>Pickup Location</h2>
    <div class="info-box">
      <p style="margin: 0;"><strong>${data.locationName}</strong></p>
      ${data.locationAddress ? `<p style="margin: 8px 0 0 0;">${data.locationAddress}</p>` : ''}
    </div>

    ${data.deliveryNotes ? `
      <h2>Special Requests</h2>
      <p>${data.deliveryNotes}</p>
    ` : ''}

    ${data.isGuest && data.orderAccessUrl ? `
      <div class="button-container">
        <a href="${data.orderAccessUrl}" class="button">View Order Status</a>
      </div>
      <p class="muted">Use this link to check your order status. The link is valid for 30 days.</p>
    ` : ''}

    <p class="muted">If you have any questions about your order, please contact the kitchen staff.</p>
  `;

  return wrapInBaseTemplate(content, `Order Confirmation - ${data.orderNumber}`);
}
