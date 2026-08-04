import { schedule } from '@netlify/functions';
import { Client, Environment } from 'square';
import { createClient } from '@supabase/supabase-js';

// Runs every hour — checks stored frequency before actually syncing
const handler = schedule('0 * * * *', async () => {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  // Check if enough time has passed since last sync
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

  const square = new Client({
    accessToken,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'production'
        ? Environment.Production
        : Environment.Sandbox,
  });

  try {
    // Fetch all catalog items
    let cursor: string | undefined;
    const allItems: any[] = [];

    do {
      const { result } = await square.catalogApi.listCatalog(cursor, 'ITEM');
      allItems.push(...(result.objects || []));
      cursor = result.cursor as string | undefined;
    } while (cursor);

    // Fetch inventory counts
    const variationIds: string[] = [];
    for (const item of allItems) {
      for (const variation of item.itemData?.variations || []) {
        if (variation.id) variationIds.push(variation.id);
      }
    }

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
      if (item.type !== 'ITEM' || !item.itemData) { skipped++; continue; }

      const itemData = item.itemData;
      const variations = itemData.variations || [];
      const firstVariation = variations[0]?.itemVariationData;
      const priceAmount = firstVariation?.priceMoney?.amount;

      if (!priceAmount) { skipped++; continue; }

      const price = Number(priceAmount) / 100;
      const slug = `${itemData.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim()}-${item.id.slice(-6).toLowerCase()}`;

      const stockQuantity = variations[0]?.id ? (inventoryMap[variations[0].id] ?? 0) : 0;

      const { error } = await supabase
        .from('products')
        .upsert({
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
        }, { onConflict: 'square_catalog_id' });

      if (error) {
        console.error(`[square-auto-sync] Failed to upsert "${itemData.name}":`, error.message);
        skipped++;
      } else {
        synced++;
      }
    }

    // Update last synced timestamp
    await supabase
      .from('store_settings')
      .update({ square_last_synced_at: now.toISOString() })
      .eq('id', 1);

    console.log(`[square-auto-sync] Done — synced: ${synced}, skipped: ${skipped}`);
    return { statusCode: 200 };
  } catch (error: any) {
    console.error('[square-auto-sync] Error:', error.message);
    return { statusCode: 500 };
  }
});

export { handler };
