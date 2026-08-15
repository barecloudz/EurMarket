import type { Handler } from '@netlify/functions';

interface OrderItem {
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface AdminNotificationRequest {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  shippingAddress: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
  };
}

const formatPrice = (dollars: number) => `$${dollars.toFixed(2)}`;

const generateAdminEmailHtml = (order: AdminNotificationRequest) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #F3E8DC; color: #111827; font-size: 14px;">
        ${item.product_name}${item.variant_name ? ` — ${item.variant_name}` : ''}
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #F3E8DC; text-align: center; color: #111827; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #F3E8DC; text-align: right; color: #111827; font-size: 14px; font-weight: 600;">${formatPrice(item.total_price)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Received</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF8F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF8F0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid rgba(204,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: #CC0000; padding: 24px 40px; text-align: center;">
              <h1 style="margin: 0 0 4px; color: #ffffff; font-size: 22px; font-weight: 900;">New Order Received!</h1>
              <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 15px;">Order #${order.orderNumber}</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 40px 0;">

              <!-- Total Banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFF8F0; border: 1px solid rgba(204,0,0,0.15); border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <div style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Order Total</div>
                    <div style="font-size: 36px; font-weight: 900; color: #CC0000;">${formatPrice(order.total)}</div>
                  </td>
                </tr>
              </table>

              <!-- Customer Info -->
              <div style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #F3E8DC;">Customer Info</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 5px 0; color: #6b7280; font-size: 14px; width: 80px;">Name</td>
                  <td style="padding: 5px 0; color: #111827; font-weight: 600; font-size: 14px;">${order.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Email</td>
                  <td style="padding: 5px 0; color: #111827; font-size: 14px;">${order.customerEmail}</td>
                </tr>
                ${order.customerPhone ? `
                <tr>
                  <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Phone</td>
                  <td style="padding: 5px 0; color: #111827; font-size: 14px;">${order.customerPhone}</td>
                </tr>
                ` : ''}
              </table>

              <!-- Items -->
              <div style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #F3E8DC;">Items Ordered</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <thead>
                  <tr style="background: #FFF8F0;">
                    <th style="padding: 8px 12px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
                    <th style="padding: 8px 12px; text-align: center; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                    <th style="padding: 8px 12px; text-align: right; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFF8F0; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Subtotal</td>
                        <td style="padding: 4px 0; text-align: right; color: #111827; font-size: 14px;">${formatPrice(order.subtotal)}</td>
                      </tr>
                      ${order.discount && order.discount > 0 ? `
                      <tr>
                        <td style="padding: 4px 0; color: #16a34a; font-size: 14px;">Discount</td>
                        <td style="padding: 4px 0; text-align: right; color: #16a34a; font-size: 14px;">-${formatPrice(order.discount)}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Shipping</td>
                        <td style="padding: 4px 0; text-align: right; color: #111827; font-size: 14px;">${formatPrice(order.shipping)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0 0; border-top: 1px solid #F3E8DC; color: #111827; font-size: 16px; font-weight: 800;">Total</td>
                        <td style="padding: 10px 0 0; border-top: 1px solid #F3E8DC; text-align: right; color: #CC0000; font-size: 16px; font-weight: 800;">${formatPrice(order.total)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Ship To -->
              <div style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #F3E8DC;">Ship To</div>
              <p style="color: #374151; font-size: 14px; line-height: 1.7; margin: 0 0 24px;">
                ${order.customerName}<br>
                ${order.shippingAddress.address_line_1}<br>
                ${order.shippingAddress.address_line_2 ? `${order.shippingAddress.address_line_2}<br>` : ''}
                ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postal_code}
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #F3E8DC; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Automated notification from European Market.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'europeanmarketus@gmail.com';
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'European Market <orders@europeanmarketus.com>';

  if (!resendApiKey) {
    console.error('[admin-notify] RESEND_API_KEY not configured');
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  try {
    const order: AdminNotificationRequest = JSON.parse(event.body || '{}');

    if (!order.orderNumber || !order.customerEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [adminEmail],
        subject: `New Order #${order.orderNumber} — ${order.customerName} (${order.items.reduce((sum, i) => sum + i.quantity, 0)} items, $${order.total.toFixed(2)})`,
        html: generateAdminEmailHtml(order),
      }),
    });

    if (response.ok) {
      console.log('[admin-notify] Admin notification email sent');
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } else {
      const errText = await response.text();
      console.error('[admin-notify] Email send failed:', errText);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send notification' }) };
    }
  } catch (error: any) {
    console.error('[admin-notify] Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Failed to send admin notification' }) };
  }
};

export { handler };
