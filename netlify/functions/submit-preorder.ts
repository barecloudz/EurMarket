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
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { name, phone, city, items, notes } = JSON.parse(event.body || '{}');

    if (!name || !phone || !city || !Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase config');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase.from('pre_orders').insert({
      customer_name: name,
      customer_phone: phone,
      pickup_city: city,
      items,
      notes: notes || null,
      status: 'pending',
    });

    if (dbError) throw dbError;

    // Send email notification to store if Resend is configured
    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.STORE_NOTIFY_EMAIL;
    if (resendKey && notifyEmail) {
      try {
        const resend = new Resend(resendKey);
        const itemLines = items
          .map((line: { product: string; size: string; flavor: string; qty: number }) =>
            `• ${line.product}${line.size ? ` (${line.size})` : ''}${line.flavor ? ` — ${line.flavor}` : ''}: ×${line.qty}`
          )
          .join('\n');

        await resend.emails.send({
          from: 'European Market <orders@europeanmarketus.com>',
          to: notifyEmail,
          subject: `New Pre-Order from ${name} — ${city}`,
          text: `New pre-order received!\n\nCustomer: ${name}\nPhone: ${phone}\nPickup City: ${city}\n\nItems:\n${itemLines}${notes ? `\n\nNotes: ${notes}` : ''}`,
        });
      } catch {
        // Email failure is non-fatal — order is already saved
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Pre-order error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to save order' }),
    };
  }
};

export { handler };
