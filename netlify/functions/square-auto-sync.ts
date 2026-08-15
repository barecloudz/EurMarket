import { schedule } from '@netlify/functions';
import { SquareClient, SquareEnvironment } from 'square';
import { createClient } from '@supabase/supabase-js';

// Runs every hour — checks stored frequency before actually syncing
const handler = schedule('0 * * * *', async () => {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const locationId = process.env.SQUARE_LOCATION_ID;

  if (!accessToken || !supabaseUrl || !supabaseServiceKey) {
    console.error('[square-auto-sync] Missing required env vars');
    return { statusCode: 500 };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check frequency setting and last sync time
  const { data: settings } = await supabase
    .from('store_settings')
    .select('square_sync_frequency, square_last_synced_at')
    .eq('id', 1)
    .single();

  const frequency = settings?.square_sync_frequency || 'off';
  if (frequency === 'off') {
    console.log('[square-auto-sync] Auto-sync is off, skipping');
    return { statusCode: 200 };
  }

  const lastSynced = settings?.square_last_synced_at
    ? new Date(settings.square_last_synced_at)
    : null;
  const now = new Date();

  const frequencyHours: Record<string, number> = {
    hourly: 1,
    every_6h: 6,
    every_12h: 12,
    daily: 24,
    weekly: 168,
  };

  const requiredHours = frequencyHours[frequency];
  if (lastSynced && requiredHours) {
    const hoursSinceSync = (now.getTime() - lastSynced.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSync < requiredHours) {
      console.log(`[square-auto-sync] Not yet time to sync (${hoursSinceSync.toFixed(1)}h / ${requiredHours}h)`);
      return { statusCode: 200 };
    }
  }

  console.log(`[square-auto-sync] Running sync (frequency: ${frequency})`);

  const square = new SquareClient({
    token: accessToken,
    environment: process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
  });

  try {
    // Fetch all catalog items
    const allItems: any[] = [];
    for await (const item of await square.catalog.list({ types: ['ITEM'] })) {
      allItems.push(item);
    }

    // Collect all variation IDs for inventory lookup
    const variationIds: string[] = [];
    for (const item of allItems) {
      for (const variation of item.itemData?.variations || []) {
        if (variation.id) variationIds.push(variation.id);
      }
    }

    // Fetch inventory counts
    const inventoryMap: Record<string, number> = {};
    if (variationIds.length > 0 && locationId) {
      for await (const count of await square.inventory.batchGetCounts({
        catalogObjectIds: variationIds,
        locationIds: [locationId],
      })) {
        if (count.catalogObjectId && count.state === 'IN_STOCK' && count.quantity) {
          inventoryMap[count.catalogObjectId] = parseInt(count.quantity, 10);
        }
      }
    }

    let synced = 0;
    let variantsSynced = 0;
    let skipped = 0;

    for (const item of allItems) {
      if (item.type !== 'ITEM' || !item.itemData) { skipped++; continue; }

      const itemData = item.itemData;
      const variations = itemData.variations || [];
      const pricedVar = variations.find((v: any) => v.itemVariationData?.priceMoney?.amount);
      if (!pricedVar) { skipped++; continue; }

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

      const totalStock = variations.reduce((sum: number, v: any) => {
        return sum + (v.id ? (inventoryMap[v.id] ?? 0) : 0);
      }, 0);

      const { data: upsertedProduct, error } = await supabase
        .from('products')
        .upsert({
          name: itemData.name,
          slug,
          description: itemData.description || null,
          price: basePrice,
          sku: pricedVar.itemVariationData?.sku || null,
          stock_quantity: totalStock,
          track_inventory: true,
          is_active: !item.isDeleted,
          square_catalog_id: item.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'square_catalog_id' })
        .select('id')
        .single();

      if (error) {
        console.error(`[square-auto-sync] Failed to upsert "${itemData.name}":`, error.message);
        skipped++;
        continue;
      }

      synced++;

      // Sync variants
      const meaningfulVars = variations.length > 1
        ? variations.filter((v: any) => v.itemVariationData?.priceMoney?.amount)
        : [];

      for (const v of meaningfulVars) {
        const vd = v.itemVariationData;
        const varPrice = Number(vd.priceMoney.amount) / 100;
        const { error: varErr } = await supabase
          .from('product_variants')
          .upsert({
            product_id: upsertedProduct.id,
            name: vd.name || 'Default',
            sku: vd.sku || null,
            price_adjustment: parseFloat((varPrice - basePrice).toFixed(2)),
            stock_quantity: inventoryMap[v.id] ?? 0,
            square_variation_id: v.id,
          }, { onConflict: 'square_variation_id' });

        if (!varErr) variantsSynced++;
      }
    }

    // Update last synced timestamp
    await supabase
      .from('store_settings')
      .update({ square_last_synced_at: now.toISOString() })
      .eq('id', 1);

    console.log(`[square-auto-sync] Done — products: ${synced}, variants: ${variantsSynced}, skipped: ${skipped}`);
    return { statusCode: 200 };
  } catch (error: any) {
    console.error('[square-auto-sync] Error:', error.message);
    return { statusCode: 500 };
  }
});

export { handler };
