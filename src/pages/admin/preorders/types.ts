// src/pages/admin/preorders/types.ts
// Real types matching the actual DB schema and existing PreOrders.tsx interfaces.

export interface MenuSize {
  label: string;
  priceNote: string;
}

export interface MenuItem {
  id: string;
  flag?: string;
  emoji: string;
  name: string;
  sizes: MenuSize[];
  flavors: string[];
}

export interface DeliveryDate {
  date: string;
  label: string;
  cities: string[];
  time?: string;
  location_address?: string;
}

export interface PreorderSettings {
  orders_open: boolean;
  order_deadline: string | null;
  delivery_dates: DeliveryDate[];
  menu?: MenuItem[];
  served_cities: string[];
}

export interface ConfirmItem {
  product: string;
  size: string;
  flavor: string;
  qty: number;
  price: number;
  available: boolean;
  substitution: string;
}

export interface PreOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  pickup_city: string;
  delivery_date: string;
  items: { product: string; size: string; flavor: string; qty: number }[];
  notes: string | null;
  suggestions: string | null;
  status: string;
  created_at: string;
  confirmed_items: ConfirmItem[] | null;
  confirmed_total: number | null;
  payment_method: string | null;
  confirmation_sent_at: string | null;
}

export const STATUS_STYLES: Record<string, string> = {
  pending:   'border-amber-300  text-amber-700  bg-amber-50',
  confirmed: 'border-green-400  text-green-700  bg-green-50',
  ready:     'border-blue-400   text-blue-700   bg-blue-50',
  completed: 'border-gray-300   text-gray-500   bg-gray-50',
};

export const STATUS_LABELS: Record<string, string> = {
  pending:   '⏳ Pending',
  confirmed: '✅ Confirmed',
  ready:     '🎉 Ready',
  completed: '✔️ Completed',
};

/** Parses a priceNote string and returns the total price for the given qty. */
export function parsePriceNote(priceNote: string, qty: number): number {
  // "4 for $20" bundle — use bundle price if qty matches exactly
  const bundleMatch = priceNote.match(/(\d+)\s+for\s+\$(\d+(?:\.\d+)?)/i);
  if (bundleMatch) {
    const bundleQty = parseInt(bundleMatch[1]);
    const bundlePrice = parseFloat(bundleMatch[2]);
    if (qty === bundleQty) return bundlePrice;
    const unitMatch = priceNote.match(/\$(\d+(?:\.\d+)?)\s+each/i);
    const unitPrice = unitMatch ? parseFloat(unitMatch[1]) : bundlePrice / bundleQty;
    return unitPrice * qty;
  }
  // "$8–$12" range — use midpoint (container price, not per-unit)
  const rangeMatch = priceNote.match(/\$(\d+(?:\.\d+)?)[\s\u2013\u2014\-]+\$?(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    const mid = (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
    return mid * qty;
  }
  // Simple "$10"
  const match = priceNote.match(/\$(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) * qty : 0;
}

/** Looks up the menu price for a given product + size + qty. */
export function inferPrice(menu: MenuItem[], product: string, size: string, qty: number): number {
  const item = menu.find(m => m.name === product);
  if (!item) return 0;
  const sizeEntry = item.sizes.find(s => s.label === size);
  if (!sizeEntry) return 0;
  return parsePriceNote(sizeEntry.priceNote, qty);
}

/** Aggregates all items across non-completed orders into a sorted totals array. */
export function buildSummary(orders: PreOrder[]): [string, number][] {
  const totals = new Map<string, number>();
  for (const order of orders) {
    if (order.status === 'completed') continue;
    for (const item of order.items) {
      const key = [item.product, item.size, item.flavor].filter(Boolean).join(' · ');
      totals.set(key, (totals.get(key) ?? 0) + item.qty);
    }
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export const DEFAULT_MENU: MenuItem[] = [
  {
    id: 'paczki', flag: '🇵🇱', emoji: '🍩', name: 'Homemade Paczki — Polish Donuts',
    sizes: [{ label: 'Each', priceNote: '$6 each  ·  4 for $20' }],
    flavors: ['Custard', 'Strawberry Custard', 'Blueberry', 'Lingonberry'],
  },
  {
    id: 'pierogies', emoji: '🥟', name: 'Homemade Pierogies',
    sizes: [{ label: '6 pieces', priceNote: '$10' }, { label: '12 pieces', priceNote: '$20' }],
    flavors: ['Potato & Onion', 'Potato & Cheese', 'Potato & Cheddar', 'Sauerkraut', 'Kraut & Mushroom', 'Spinach & Cheese', 'Pork & Beef'],
  },
  {
    id: 'sweet-pierogies', emoji: '🍓', name: 'Sweet Pierogies',
    sizes: [{ label: '6 pieces', priceNote: '$12' }],
    flavors: ['Strawberry', 'Cherry', 'Sweet Cheese'],
  },
  {
    id: 'pirozhki', flag: '🇺🇦', emoji: '🥟', name: 'Ukrainian Pirozhki',
    sizes: [{ label: 'Each', priceNote: '$3 each  ·  4 for $10' }],
    flavors: ['Potato Filling'],
  },
  {
    id: 'cabbage-rolls', emoji: '🥬', name: 'Homemade Cabbage Rolls',
    sizes: [{ label: 'Small', priceNote: '$8–$12' }, { label: 'Large', priceNote: '$17–$22' }],
    flavors: [],
  },
  {
    id: 'borscht', flag: '🇺🇦', emoji: '🍲', name: 'Ukrainian Borscht',
    sizes: [{ label: 'Small', priceNote: '$8–$12' }],
    flavors: [],
  },
  {
    id: 'kapusta', emoji: '🥩', name: 'Kapusta with Pork',
    sizes: [{ label: 'Small', priceNote: '$8–$12' }],
    flavors: [],
  },
  {
    id: 'poppy-seed-rolls', emoji: '🍞', name: 'Poppy Seed Rolls',
    sizes: [{ label: 'Small', priceNote: '$5–$6' }, { label: 'Medium', priceNote: '$7–$8' }, { label: 'Large', priceNote: '$10–$12' }],
    flavors: [],
  },
  {
    id: 'cheese-rolls', emoji: '🧀', name: 'Sweet Cheese Rolls',
    sizes: [{ label: 'Small', priceNote: '$5–$7' }, { label: 'Medium', priceNote: '$8–$9' }, { label: 'Large', priceNote: '$10–$12' }],
    flavors: ['Plain', 'With Plum', 'With Raisins', 'With Apricot', 'With Blueberry'],
  },
];
