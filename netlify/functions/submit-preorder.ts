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
    const { name, phone, email, city, delivery_date, items, notes, suggestions } = JSON.parse(event.body || '{}');

    if (!name || !phone || !city || !delivery_date || !Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase config');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gate: reject if orders are closed
    const { data: preorderSettings } = await supabase
      .from('preorder_settings')
      .select('orders_open, order_deadline')
      .eq('id', 1)
      .single();

    const deadlinePassed = preorderSettings?.order_deadline
      ? new Date() > new Date(preorderSettings.order_deadline)
      : false;

    if (!preorderSettings?.orders_open || deadlinePassed) {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Orders are currently closed' }),
      };
    }

    const { error: dbError } = await supabase.from('pre_orders').insert({
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      pickup_city: city,
      delivery_date,
      items,
      notes: notes || null,
      suggestions: suggestions || null,
      status: 'pending',
    });

    if (dbError) throw dbError;

    // Send emails if Resend is configured
    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.STORE_NOTIFY_EMAIL;
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        const itemLines = items
          .map((line: { product: string; size: string; flavor: string; qty: number }) =>
            `• ${line.product}${line.size ? ` (${line.size})` : ''}${line.flavor ? ` — ${line.flavor}` : ''}: ×${line.qty}`
          )
          .join('\n');

        const sends: Promise<unknown>[] = [];

        // Store notification
        if (notifyEmail) {
          sends.push(resend.emails.send({
            from: 'European Market <orders@europeanmarketus.com>',
            to: notifyEmail,
            subject: `New Pre-Order from ${name} — ${city} — ${delivery_date}`,
            text: `New pre-order received!\n\nCustomer: ${name}\nPhone: ${phone}${email ? `\nEmail: ${email}` : ''}\nPickup City: ${city}\nDelivery Date: ${delivery_date}\n\nItems:\n${itemLines}${notes ? `\n\nNotes: ${notes}` : ''}${suggestions ? `\n\nSuggestions: ${suggestions}` : ''}`,
          }));
        }

        // Customer confirmation
        if (email) {
          interface DeliveryDate { date: string; label: string; time?: string; location_address?: string; }
          const pickedDate = (preorderSettings?.delivery_dates as DeliveryDate[] | undefined)
            ?.find(d => d.date === delivery_date);
          const dateLabel = pickedDate?.label ?? delivery_date;
          const timeLine = pickedDate?.time ? `\nTime: ${pickedDate.time}` : '';
          const locationLine = pickedDate?.location_address ? `\nPickup Location: ${pickedDate.location_address}` : '';

          sends.push(resend.emails.send({
            from: 'European Market <orders@europeanmarketus.com>',
            to: email,
            subject: `Your Pre-Order is Confirmed — European Market`,
            text: `Hi ${name},\n\nThank you for your pre-order! We've received it and will text you at ${phone} to confirm pickup details.\n\nYour Order:\n${itemLines}\n\nPickup City: ${city}\nDate: ${dateLabel}${timeLine}${locationLine}${notes ? `\n\nNotes: ${notes}` : ''}\n\nQuestions? Text us at (864) 590-6760.\n\n❤️ European Market\nhttps://europeanmarketus.com`,
          }));
        }

        await Promise.allSettled(sends);
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
