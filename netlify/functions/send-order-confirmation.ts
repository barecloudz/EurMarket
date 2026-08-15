import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

interface OrderItem {
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ShippingAddress {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
}

interface OrderConfirmationRequest {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  shippingAddress: ShippingAddress;
}

const formatPrice = (dollars: number) => `$${dollars.toFixed(2)}`;

const generateEmailHtml = (order: OrderConfirmationRequest) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #F3E8DC;">
        <div style="font-weight: 600; color: #1a1a1a;">${item.product_name}</div>
        ${item.variant_name ? `<div style="font-size: 13px; color: #6b7280; margin-top: 2px;">${item.variant_name}</div>` : ''}
        <div style="font-size: 13px; color: #9ca3af; margin-top: 2px;">Qty: ${item.quantity}</div>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #F3E8DC; text-align: right; color: #1a1a1a; font-weight: 600;">
        ${formatPrice(item.total_price)}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF8F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF8F0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid rgba(204,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: #CC0000; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0 0 4px; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">European Market</h1>
              <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase;">Order Confirmation</p>
            </td>
          </tr>

          <!-- Success Banner -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px 24px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">&#10003;</div>
                    <div style="font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 4px;">Thank you for your order!</div>
                    <div style="font-size: 14px; color: #6b7280;">Hi ${order.customerName}, we've received your order and are getting it ready.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Meta -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFF8F0; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding-bottom: 8px;">Order Number</td>
                        <td style="text-align: right; color: #CC0000; font-weight: 700; font-size: 14px; padding-bottom: 8px;">#${order.orderNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Order Date</td>
                        <td style="text-align: right; color: #1a1a1a; font-size: 14px;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Items -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <div style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Order Details</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding: 16px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Subtotal</td>
                  <td style="padding: 6px 0; text-align: right; color: #1a1a1a; font-size: 14px;">${formatPrice(order.subtotal)}</td>
                </tr>
                ${order.discount && order.discount > 0 ? `
                <tr>
                  <td style="padding: 6px 0; color: #16a34a; font-size: 14px;">Discount</td>
                  <td style="padding: 6px 0; text-align: right; color: #16a34a; font-size: 14px;">-${formatPrice(order.discount)}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Shipping</td>
                  <td style="padding: 6px 0; text-align: right; color: #1a1a1a; font-size: 14px;">${formatPrice(order.shipping)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0 0; border-top: 2px solid #F3E8DC; color: #1a1a1a; font-size: 18px; font-weight: 800;">Total</td>
                  <td style="padding: 12px 0 0; border-top: 2px solid #F3E8DC; text-align: right; color: #CC0000; font-size: 18px; font-weight: 800;">${formatPrice(order.total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Address -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <div style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Shipping Address</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFF8F0; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px 20px; color: #374151; font-size: 14px; line-height: 1.7;">
                    ${order.customerName}<br>
                    ${order.shippingAddress.address_line_1}<br>
                    ${order.shippingAddress.address_line_2 ? `${order.shippingAddress.address_line_2}<br>` : ''}
                    ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postal_code}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; border-top: 1px solid #F3E8DC; margin-top: 24px;">
              <p style="margin: 0 0 6px; color: #6b7280; font-size: 14px;">Questions about your order? Reply to this email or contact us.</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} European Market. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const orderData: OrderConfirmationRequest = JSON.parse(event.body || '{}');

    if (!orderData.customerEmail || !orderData.orderId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'European Market <orders@europeanmarketus.com>',
      to: [orderData.customerEmail],
      subject: `Order Confirmed — #${orderData.orderNumber}`,
      html: generateEmailHtml(orderData),
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(error.message);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, emailId: data?.id }),
    };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message || 'Failed to send confirmation email' }),
    };
  }
};

export { handler };
