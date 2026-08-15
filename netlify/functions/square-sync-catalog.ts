import type { Handler } from '@netlify/functions';
import { SquareClient, SquareEnvironment } from 'square';
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

  const auth = await requireAdmin(event.headers as Record<string, string | undefined>);
  if ('error' in auth) {
    return { statusCode: auth.error.statusCode, headers: corsHeaders, body: auth.error.body };
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const locationId = process.env.SQUARE_LOCATION_ID;

  if (!accessToken || !supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Service not configured' }),
    };
  }

  const square = new SquareClient({
    token: accessToken,
    environment: process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
  });

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // ── Fetch all ITEM catalog objects ──
    const allItems: any[] = [];
    const catalogPage = await square.catalog.list({ types: ['ITEM'] });
    for await (const item of catalogPage) {
      allItems.push(item);
    }

    console.log(`[square-sync-catalog] Fetched ${allItems.length} items from Square`);

    // ── Fetch all CATEGORY objects ──
    const categoryMap: Record<string, string> = {}; // id → name
    const catPage = await square.catalog.list({ types: ['CATEGORY'] });
    for await (const cat of catPage) {
      if (cat.id && cat.categoryData?.name) {
        categoryMap[cat.id] = cat.categoryData.name;
      }
    }

    // ── Collect all variation IDs for inventory lookup ──
    const allVariationIds: string[] = [];
    for (const item of allItems) {
      for (const variation of item.itemData?.variations || []) {
        if (variation.id) allVariationIds.push(variation.id);
      }
    }

    // ── Fetch inventory counts ──
    const inventoryMap: Record<string, number> = {};
    if (allVariationIds.length > 0 && locationId) {
      const invPage = await square.inventory.batchGetCounts({
        catalogObjectIds: allVariationIds,
        locationIds: [locationId],
      });
      for await (const count of invPage) {
        if (count.catalogObjectId && count.state === 'IN_STOCK' && count.quantity) {
          inventoryMap[count.catalogObjectId] = parseInt(count.quantity, 10);
        }
      }
    }

    let synced = 0;
    let variantsSynced = 0;
    let skipped = 0;

    for (const item of allItems) {
      if (item.type !== 'ITEM' || !item.itemData) {
        skipped++;
        continue;
      }

      const itemData = item.itemData;
      const variations = itemData.variations || [];

      // Need at least one priced variation
      const pricedVariation = variations.find((v: any) => v.itemVariationData?.priceMoney?.amount);
      if (!pricedVariation) {
        console.warn(`[square-sync-catalog] Skipping "${itemData.name}" — no priced variation`);
        skipped++;
        continue;
      }

      // Base price = cheapest variation
      const basePrice = Math.min(
        ...variations
          .filter((v: any) => v.itemVariationData?.priceMoney?.amount)
          .map((v: any) => Number(v.itemVariationData.priceMoney.amount) / 100)
      );

      const slug = `${itemData.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim()}-${item.id.slice(-6).toLowerCase()}`;

      // Resolve category name
      const categoryId = itemData.categories?.[0]?.id;
      const categoryName = categoryId ? categoryMap[categoryId] : null;

      // Total stock = sum across all variations
      const totalStock = variations.reduce((sum: number, v: any) => {
        return sum + (v.id ? (inventoryMap[v.id] ?? 0) : 0);
      }, 0);

      const productData = {
        name: itemData.name,
        slug,
        description: itemData.description || null,
        price: basePrice,
        sku: pricedVariation.itemVariationData?.sku || null,
        stock_quantity: totalStock,
        track_inventory: true,
        is_active: !item.isDeleted,
        square_catalog_id: item.id,
        updated_at: new Date().toISOString(),
      };

      const { data: upsertedProduct, error: productError } = await supabase
        .from('products')
        .upsert(productData, { onConflict: 'square_catalog_id' })
        .select('id')
        .single();

      if (productError) {
        console.error(`[square-sync-catalog] Failed to upsert "${itemData.name}":`, productError.message);
        skipped++;
        continue;
      }

      synced++;
      const productId = upsertedProduct.id;

      // ── Sync variations (skip if only one "Regular" variation with same price as base) ──
      const meaningfulVariations = variations.filter((v: any) => {
        const vd = v.itemVariationData;
        if (!vd?.priceMoney?.amount) return false;
        if (variations.length === 1) return false; // single variation = no variant needed
        return true;
      });

      for (const variation of meaningfulVariations) {
        const vd = variation.itemVariationData;
        const variantPrice = Number(vd.priceMoney.amount) / 100;
        const priceAdjustment = parseFloat((variantPrice - basePrice).toFixed(2));
        const variantStock = variation.id ? (inventoryMap[variation.id] ?? 0) : 0;

        const variantData = {
          product_id: productId,
          name: vd.name || 'Default',
          sku: vd.sku || null,
          price_adjustment: priceAdjustment,
          stock_quantity: variantStock,
          square_variation_id: variation.id,
        };

        const { error: varError } = await supabase
          .from('product_variants')
          .upsert(variantData, { onConflict: 'square_variation_id' })
          .select('id');

        if (varError) {
          // square_variation_id column may not exist yet — skip silently
          if (!varError.message.includes('square_variation_id')) {
            console.error(`[square-sync-catalog] Variant upsert failed:`, varError.message);
          }
        } else {
          variantsSynced++;
        }
      }
    }

    console.log(`[square-sync-catalog] Done — products: ${synced}, variants: ${variantsSynced}, skipped: ${skipped}`);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        synced,
        variantsSynced,
        skipped,
        total: allItems.length,
      }),
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
