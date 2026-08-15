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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
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

  const siteUrl = process.env.SITE_URL || 'https://europeanmarketus.com';

  try {
    // Generate a Supabase invite link (we send the email ourselves via Resend)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/supplier/set-password`,
        data: { first_name, last_name },
      },
    });

    if (linkError) throw linkError;

    // Set role to supplier (upsert in case profile row doesn't exist yet)
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: linkData.user.id,
        email,
        role: 'supplier',
        first_name: first_name || null,
        last_name: last_name || null,
      }, { onConflict: 'id' });

    if (profileError) throw profileError;

    // Send branded invite email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const firstName = first_name || 'there';
    const inviteUrl = linkData.properties.action_link;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'European Market <noreply@europeanmarketus.com>',
      to: email,
      subject: "You've been invited as a supplier for European Market",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#FFF8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid rgba(204,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:#CC0000;padding:32px 40px;text-align:center;">
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px;">European Market</h1>
              <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:1.5px;text-transform:uppercase;">Supplier Invitation</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Hi ${firstName},</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#6B7280;line-height:1.6;">
                You've been added as a supplier for <strong style="color:#111827;">European Market</strong>. Click the button below to set up your account and start managing your products.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#CC0000;border-radius:12px;">
                    <a href="${inviteUrl}" style="display:block;padding:16px 32px;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.3px;">
                      Set Up My Account →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What you can do -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;border-radius:12px;margin-bottom:32px;">
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
            <td style="padding:20px 40px;border-top:1px solid #F3E8DC;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} European Market. All rights reserved.
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
