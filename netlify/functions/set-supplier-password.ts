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

  // Verify the caller's token and get their user id
  const { data: { user }, error: userError } = await adminClient.auth.getUser(callerToken);
  if (userError || !user) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  const { password } = JSON.parse(event.body || '{}');

  if (!password || password.length < 8) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
  }

  const { error } = await adminClient.auth.admin.updateUserById(user.id, { password });

  if (error) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
};

export { handler };
