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

  // Verify caller is an admin by checking their JWT
  const authHeader = event.headers['authorization'] || '';
  const callerToken = authHeader.replace('Bearer ', '');

  if (!callerToken) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Admin client (service role) — never exposed to frontend
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the caller is actually an admin
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

  // Parse request body
  const { email, password, first_name, last_name } = JSON.parse(event.body || '{}');

  if (!email || !password) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Email and password are required' }) };
  }

  try {
    // Create the auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    if (createError) throw createError;

    // Set role to supplier in profiles
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        role: 'supplier',
        first_name: first_name || null,
        last_name: last_name || null,
      })
      .eq('id', newUser.user.id);

    if (profileError) throw profileError;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, userId: newUser.user.id }),
    };
  } catch (err: any) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Failed to create supplier' }),
    };
  }
};

export { handler };
