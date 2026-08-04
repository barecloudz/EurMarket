import type { Handler } from '@netlify/functions';
import { Client, Environment } from 'square';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';
import { requireAdmin } from './require-admin';

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Admin only
  const auth = await requireAdmin(event.headers as Record<string, string | undefined>);
  if ('error' in auth) {
    return { statusCode: auth.error.statusCode, headers: corsHeaders, body: auth.error.body };
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessToken || !supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Service not configured' }),
    };
  }

  const square = new Client({
    accessToken,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'production'
        ? Environment.Production
        : Environment.Sandbox,
  });

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Fetch all ITEM catalog objects from Square
    let cursor: string | undefined;
    const allItems: any[] = [];

    do {
      const { result } = await square.catalogApi.listCatalog(cursor, 'ITEM');
      allItems.push(...(result.objects || []));
      cursor = result.cursor as string | undefined;
    } while (cursor);

    console.log(`[square-sync-catalog] Fetched ${allItems.length} items from Square`);

    // Collect variation IDs for inventory lookup
    const variationIds: string[] = [];
    for (const item of allItems) {
      for (const variation of item.itemData?.variations || []) {
        if (variation.id) variationIds.push(variation.id);
      }
    }

    // Fetch inventory counts for all variations
    const inventoryMap: Record<string, number> = {};
    if (variationIds.length > 0) {
      const { result: invResult } = await square.inventoryApi.batchRetrieveInventoryCounts({
        catalogObjectIds: variationIds,
      });
      for (const count of invResult.counts || []) {
        if (count.catalogObjectId && count.state === 'IN_STOCK') {
          inventoryMap[count.catalogObjectId] = parseInt(count.quantity || '0', 10);
        }
      }
    }

    let synced = 0;
    let skipped = 0;

    for (const item of allItems) {
      if (item.type !== 'ITEM' || !item.itemData) {
        skipped++;
        continue;
      }

      const itemData = item.itemData;
      const variations = itemData.variations || [];
      const firstVariation = variations[0]?.itemVariationData;
      const priceAmount = firstVariation?.priceMoney?.amount;

      // Skip items with no price
      if (!priceAmount) {
        console.warn(`[square-sync-catalog] Skipping "${itemData.name}" — no price set`);
        skipped++;
        continue;
      }

      const price = Number(priceAmount) / 100;
      const slug = `${itemData.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim()}-${item.id.slice(-6).toLowerCase()}`;

      const stockQuantity = variations[0]?.id
        ? (inventoryMap[variations[0].id] ?? 0)
        : 0;

      const productData = {
        name: itemData.name,
        slug,
        description: itemData.description || null,
        price,
        sku: firstVariation?.sku || null,
        stock_quantity: stockQuantity,
        track_inventory: true,
        is_active: !item.isDeleted,
        square_catalog_id: item.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('products')
        .upsert(productData, { onConflict: 'square_catalog_id' });

      if (error) {
        console.error(`[square-sync-catalog] Failed to upsert "${itemData.name}":`, error.message);
        skipped++;
      } else {
        synced++;
      }
    }

    console.log(`[square-sync-catalog] Done — synced: ${synced}, skipped: ${skipped}`);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, synced, skipped, total: allItems.length }),
    };
  } catch (error: any) {
    console.error('[square-sync-catalog] Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message || 'Catalog sync failed' }),
    };
  }
};

export { handler };
