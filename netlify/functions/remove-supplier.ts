import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
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

  // Verify caller is admin
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

  const { supplierId } = JSON.parse(event.body || '{}');

  if (!supplierId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'supplierId is required' }) };
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ role: 'customer' })
    .eq('id', supplierId);

  if (error) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
};

export { handler };
