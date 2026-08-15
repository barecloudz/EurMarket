import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { requireAdmin } from './require-admin';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

interface ConfirmedItem {
  product: string;
  size: string;
  flavor: string;
  qty: number;
  price: number;
  available: boolean;
  substitution: string;
}

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };

  const auth = await requireAdmin(event.headers as Record<string, string>);
  if ('error' in auth) return { statusCode: auth.error.statusCode, headers: corsHeaders, body: auth.error.body };

  const { orderId, confirmedItems } = JSON.parse(event.body || '{}') as {
    orderId: string;
    confirmedItems: ConfirmedItem[];
  };

  if (!orderId || !Array.isArray(confirmedItems)) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: order, error: orderError } = await adminClient
    .from('pre_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Order not found' }) };
  }

  const confirmedTotal = confirmedItems
    .filter(i => i.available)
    .reduce((sum, i) => sum + i.price, 0);

  const cardTotal = confirmedTotal * 1.035;

  const { error: updateError } = await adminClient
    .from('pre_orders')
    .update({
      confirmed_items: confirmedItems,
      confirmed_total: confirmedTotal,
      status: 'confirmed',
      confirmation_sent_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: updateError.message }) };
  }

  if (!order.customer_email) {
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, emailSent: false }) };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const siteUrl = process.env.SITE_URL || 'https://europeanmarketus.com';

    const itemsHtml = confirmedItems.map(item => {
      const label = [item.product, item.size && `(${item.size})`, item.flavor && `— ${item.flavor}`].filter(Boolean).join(' ');
      if (!item.available) {
        return `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #F3E8DC;">
              <p style="margin:0;font-size:15px;color:#9CA3AF;text-decoration:line-through;">❌ ${label}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">
                ${item.substitution ? `↳ Substituted with: ${item.substitution}` : 'Not available this time — sorry!'}
              </p>
            </td>
            <td style="padding:12px 0 12px 16px;border-bottom:1px solid #F3E8DC;text-align:right;color:#9CA3AF;font-size:15px;white-space:nowrap;vertical-align:top;">—</td>
          </tr>`;
      }
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #F3E8DC;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#111827;">✅ ${label}</p>
          </td>
          <td style="padding:12px 0 12px 16px;border-bottom:1px solid #F3E8DC;text-align:right;font-weight:700;color:#CC0000;font-size:15px;white-space:nowrap;vertical-align:top;">$${item.price.toFixed(2)}</td>
        </tr>`;
    }).join('');

    const cashUrl = `${siteUrl}/preorder-payment?id=${orderId}&method=cash`;
    const zelleUrl = `${siteUrl}/preorder-payment?id=${orderId}&method=zelle`;
    const cardUrl = `${siteUrl}/preorder-payment?id=${orderId}&method=card`;

    // Get pickup info from delivery date
    const { data: settings } = await adminClient
      .from('preorder_settings')
      .select('delivery_dates')
      .eq('id', 1)
      .single();

    const pickedDate = (settings?.delivery_dates ?? []).find((d: { date: string }) => d.date === order.delivery_date);
    const pickupHtml = pickedDate ? `
      <div style="background:#FFF8F0;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:1px;">Pickup Details</p>
        <p style="margin:0 0 4px;font-size:15px;color:#111827;">📅 ${pickedDate.label ?? order.delivery_date}</p>
        ${pickedDate.time ? `<p style="margin:0 0 4px;font-size:15px;color:#111827;">🕐 ${pickedDate.time}</p>` : ''}
        ${pickedDate.location_address ? `<p style="margin:0;font-size:15px;color:#111827;">📍 ${pickedDate.location_address}</p>` : ''}
      </div>` : '';

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'European Market <orders@europeanmarketus.com>',
      to: order.customer_email,
      subject: `Your European Market Order is Confirmed — $${confirmedTotal.toFixed(2)}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FFF8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid rgba(204,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:#CC0000;padding:32px 40px;text-align:center;">
            <h1 style="margin:0 0 4px;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px;">European Market</h1>
            <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:1.5px;text-transform:uppercase;">Order Confirmed</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">Hi ${order.customer_name}!</h2>
            <p style="margin:0 0 24px;font-size:15px;color:#6B7280;line-height:1.6;">
              Your pre-order has been confirmed. Here's exactly what's coming and how much it will cost:
            </p>

            <!-- Items -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              ${itemsHtml}
            </table>

            <!-- Total -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="padding:14px 0 4px;border-top:2px solid #111827;">
                  <p style="margin:0;font-size:18px;font-weight:900;color:#111827;">Order Total</p>
                </td>
                <td style="padding:14px 0 4px;border-top:2px solid #111827;text-align:right;">
                  <p style="margin:0;font-size:18px;font-weight:900;color:#CC0000;">$${confirmedTotal.toFixed(2)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:2px 0;">
                  <p style="margin:0;font-size:13px;color:#9CA3AF;">If paying by card (+3.5% fee)</p>
                </td>
                <td style="padding:2px 0;text-align:right;">
                  <p style="margin:0;font-size:13px;color:#9CA3AF;">$${cardTotal.toFixed(2)}</p>
                </td>
              </tr>
            </table>

            <!-- Payment choice -->
            <div style="background:#FFF8F0;border-radius:12px;padding:20px 24px;margin-bottom:24px;border:1px solid rgba(204,0,0,0.15);">
              <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827;">How would you like to pay at pickup?</p>
              <p style="margin:0 0 16px;font-size:13px;color:#6B7280;">Tap your choice below — we'll have it on file so we're ready for you.</p>

              <!-- Cash button -->
              <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:10px;">
                <tr>
                  <td style="background:#16a34a;border-radius:10px;">
                    <a href="${cashUrl}" style="display:block;padding:14px 20px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;text-align:center;">
                      💵 Pay with Cash — $${confirmedTotal.toFixed(2)}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Zelle button -->
              <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:10px;">
                <tr>
                  <td style="background:#6d28d9;border-radius:10px;">
                    <a href="${zelleUrl}" style="display:block;padding:14px 20px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;text-align:center;">
                      💜 Pay with Zelle — $${confirmedTotal.toFixed(2)}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Card button -->
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="background:#1d4ed8;border-radius:10px;">
                    <a href="${cardUrl}" style="display:block;padding:14px 20px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;text-align:center;">
                      💳 Pay with Card — $${cardTotal.toFixed(2)} <span style="font-weight:400;font-size:13px;opacity:0.85;">(includes 3.5% fee)</span>
                    </a>
                  </td>
                </tr>
              </table>
            </div>

            ${pickupHtml}

            <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
              Questions? Text us at <strong style="color:#CC0000;">(864) 590-6760</strong><br>
              ❤️ Thank you for supporting our small family business!
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #F3E8DC;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              &copy; ${new Date().getFullYear()} European Market. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (emailErr) {
    console.error('[confirm-preorder] Email failed:', emailErr);
    // Order is already confirmed — email failure is non-fatal
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, emailSent: false, emailError: true }) };
  }

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, emailSent: true }) };
};

export { handler };
