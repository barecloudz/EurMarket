import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

const VALID_METHODS = ['cash', 'zelle', 'card'];

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };

  const { orderId, method } = JSON.parse(event.body || '{}');

  if (!orderId || !VALID_METHODS.includes(method)) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await adminClient
    .from('pre_orders')
    .update({ payment_method: method })
    .eq('id', orderId);

  if (error) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
};

export { handler };
