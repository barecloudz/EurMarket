import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };
  }

  const authHeader = event.headers['authorization'] || '';
  const callerToken = authHeader.replace('Bearer ', '');

  if (!callerToken) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify caller is an admin
  const { data: { user: callerUser }, error: callerError } = await adminClient.auth.getUser(callerToken);
  if (callerError || !callerUser) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', callerUser.id)
    .single();

  if (callerProfile?.role !== 'admin') {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Admin access required' }) };
  }

  const { email, first_name, last_name } = JSON.parse(event.body || '{}');

  if (!email) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Email is required' }) };
  }

  try {
    // Generate a Supabase invite link (we send the email ourselves via Resend)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `https://shop.genovaspizzamyrtlebeach.com/supplier/products`,
        data: { first_name, last_name },
      },
    });

    if (linkError) throw linkError;

    // Set role to supplier
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        role: 'supplier',
        first_name: first_name || null,
        last_name: last_name || null,
      })
      .eq('id', linkData.user.id);

    if (profileError) throw profileError;

    // Send branded invite email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const firstName = first_name || 'there';
    const inviteUrl = linkData.properties.action_link;

    await resend.emails.send({
      from: "Genova's Merch <noreply@catering.genovaspizzamyrtlebeach.com>",
      to: email,
      subject: "You've been added as a supplier for Genova's Merch",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F8F9FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#2E7D32;padding:32px 40px;text-align:center;">
              <img src="https://shop.genovaspizzamyrtlebeach.com/images/logo.png" alt="Genova's Merch" height="72" style="display:block;margin:0 auto;" />
              <p style="margin:16px 0 0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Official Merchandise</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">Hi ${firstName},</h1>
              <p style="margin:0 0 24px;font-size:16px;color:#6B7280;line-height:1.6;">
                You've been added as a supplier for <strong style="color:#111827;">Genova's Merch</strong>. Click the button below to set up your account and start managing your products.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#2E7D32;border-radius:12px;">
                    <a href="${inviteUrl}" style="display:block;padding:16px 32px;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.3px;">
                      Set Up My Account →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What you can do -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:1px;">What you can do</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#6B7280;">📦 &nbsp;Add and manage your products</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#6B7280;">🚚 &nbsp;View orders containing your items</p>
                    <p style="margin:0;font-size:14px;color:#6B7280;">🔍 &nbsp;Track fulfillment and enter tracking numbers</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
                This invite link expires in 24 hours. If you have any questions, reply to this email or contact the store admin directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #F3F4F6;text-align:center;">
              <p style="margin:0;font-size:12px;color:#D1D5DB;">
                Genova's Merch · Official merchandise for Genova's Pizza &amp; Pasta of Myrtle Beach
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true }),
    };
  } catch (err: any) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Failed to invite supplier' }),
    };
  }
};

export { handler };
