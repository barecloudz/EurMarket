import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

interface ShippingAddress {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
}

interface ShippingConfirmationRequest {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  trackingNumber: string;
  shippingAddress: ShippingAddress;
}

const generateEmailHtml = (data: ShippingConfirmationRequest) => {
  const trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${data.trackingNumber}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Order Has Shipped!</title>
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
              <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase;">Your Order Has Shipped!</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px 40px 0;">

              <!-- Shipped Banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 8px;">&#128230;</div>
                    <div style="font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 4px;">Your order is on its way!</div>
                    <div style="font-size: 14px; color: #6b7280;">Hi ${data.customerName}, great news — your order has shipped!</div>
                  </td>
                </tr>
              </table>

              <!-- Order & Tracking Meta -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFF8F0; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Order Number</td>
                        <td style="padding: 5px 0; text-align: right; color: #CC0000; font-weight: 700; font-size: 14px;">#${data.orderNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Tracking Number</td>
                        <td style="padding: 5px 0; text-align: right; color: #1a1a1a; font-family: monospace; font-size: 14px;">${data.trackingNumber}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Track Button -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
                <tr>
                  <td style="background: #CC0000; border-radius: 10px;">
                    <a href="${trackingUrl}" style="display: block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; text-align: center;">
                      Track Your Package →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0 0 24px;">
                You can also track at <a href="https://www.usps.com/track" style="color: #CC0000; text-decoration: none;">usps.com/track</a>
              </p>

              <!-- Shipping Address -->
              <div style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Shipping To</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #FFF8F0; border-radius: 10px; margin-bottom: 8px;">
                <tr>
                  <td style="padding: 16px 20px; color: #374151; font-size: 14px; line-height: 1.7;">
                    ${data.customerName}<br>
                    ${data.shippingAddress.address_line_1}<br>
                    ${data.shippingAddress.address_line_2 ? `${data.shippingAddress.address_line_2}<br>` : ''}
                    ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postal_code}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #F3E8DC; text-align: center;">
              <p style="margin: 0 0 6px; color: #6b7280; font-size: 14px;">Questions about your shipment? Reply to this email or contact us.</p>
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
    const data: ShippingConfirmationRequest = JSON.parse(event.body || '{}');

    if (!data.customerEmail || !data.trackingNumber || !data.orderNumber) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'European Market <orders@europeanmarketus.com>',
      to: [data.customerEmail],
      subject: `Your Order #${data.orderNumber} Has Shipped!`,
      html: generateEmailHtml(data),
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(error.message);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, emailId: emailData?.id }),
    };
  } catch (error: any) {
    console.error('Error sending shipping confirmation:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message || 'Failed to send shipping confirmation email' }),
    };
  }
};

export { handler };
