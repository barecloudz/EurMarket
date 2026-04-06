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

  // Verify caller is authenticated
  const { data: { user }, error: authError } = await adminClient.auth.getUser(callerToken);
  if (authError || !user) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  // Only suppliers and admins can create categories
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'supplier'].includes(profile.role)) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, slug, description, image_url, is_active, display_order } = body;

    if (!name || !slug) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Name and slug are required' }) };
    }

    const { data, error } = await adminClient
      .from('categories')
      .insert({ name, slug, description: description || null, image_url: image_url || null, is_active: is_active ?? true, display_order: display_order ?? 0 })
      .select('id, name, slug')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { statusCode: 409, headers: corsHeaders, body: JSON.stringify({ error: 'A category with this slug already exists' }) };
      }
      throw error;
    }

    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (err: any) {
    console.error('create-category error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message || 'Internal server error' }) };
  }
};

export { handler };
