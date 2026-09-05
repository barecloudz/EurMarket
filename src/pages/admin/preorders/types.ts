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
  category?: string;
  sizes: MenuSize[];
  flavors: string[];
  active?: boolean; // undefined/true = visible to customers, false = hidden
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
  // ── Homemade ──────────────────────────────────────────────────────────────
  {
    id: 'paczki', flag: '🇵🇱', emoji: '🍩', category: 'Preorder Homemade',
    name: 'Homemade Paczki — Polish Donuts',
    sizes: [{ label: 'Medium', priceNote: '$5 each  ·  4 for $16' }, { label: 'Large', priceNote: '$6 each  ·  4 for $20' }],
    flavors: ['Custard', 'Lemon', 'Cranberry', 'Strawberry', 'Blueberry', 'Lingonberry', 'Plum', 'Nutella', 'Dulce De Leche'],
  },
  {
    id: 'pierogies', emoji: '🥟', category: 'Preorder Homemade',
    name: 'Homemade Pierogies',
    sizes: [{ label: '6 pieces', priceNote: '$10' }, { label: '12 pieces', priceNote: '$20' }],
    flavors: ['Potato & Onion', 'Potato & Cheese', 'Potato & Cheddar Cheese', 'Sauerkraut', 'Sauerkraut & Mushroom', 'Spinach', 'Pork & Beef'],
  },
  {
    id: 'sweet-pierogies', emoji: '🍓', category: 'Preorder Homemade',
    name: 'Sweet Pierogies with Sour Cream Topping',
    sizes: [{ label: '6 pieces', priceNote: '$12' }],
    flavors: ['Strawberry', 'Cherry'],
  },
  {
    id: 'pirozhki', emoji: '🥟', category: 'Preorder Homemade',
    name: 'Ukrainian Pirozhki',
    sizes: [{ label: 'Each', priceNote: '$3 each  ·  4 for $10' }],
    flavors: ['Potato Filling', 'Cabbage'],
  },
  {
    id: 'cabbage-rolls', emoji: '🥬', category: 'Preorder Homemade',
    name: 'Homemade Cabbage Rolls',
    sizes: [{ label: 'Small Container', priceNote: '$8–$10' }, { label: 'Medium Container', priceNote: '$13–$17' }, { label: 'Large Container', priceNote: '$24–$30' }],
    flavors: [],
  },
  {
    id: 'poppy-seed-rolls', emoji: '🍞', category: 'Preorder Homemade',
    name: 'Homemade Poppy Seed Rolls',
    sizes: [{ label: 'Small', priceNote: '$5–$6' }, { label: 'Medium', priceNote: '$7–$8' }, { label: 'Large', priceNote: '$10–$12' }],
    flavors: [],
  },
  {
    id: 'cheese-rolls', emoji: '🧀', category: 'Preorder Homemade',
    name: 'Homemade Sweet Cheese Rolls',
    sizes: [{ label: 'Small', priceNote: '$6–$7' }, { label: 'Medium', priceNote: '$8–$9' }, { label: 'Large', priceNote: '$10–$12' }],
    flavors: ['With Raisins', 'Without Raisins'],
  },
  // ── British Meats ──────────────────────────────────────────────────────────
  { id: 'brit-chipolata', flag: '🇬🇧', emoji: '🌭', category: 'Preorder British Meats', name: 'Classic English Chipolata Sausages', sizes: [{ label: 'Per Pack', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-classic-sausages', flag: '🇬🇧', emoji: '🌭', category: 'Preorder British Meats', name: "Classic Sausages - Parker's Finest", sizes: [{ label: 'Per Pack', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-white-pudding', flag: '🇬🇧', emoji: '🍖', category: 'Preorder British Meats', name: 'White Pudding', sizes: [{ label: '9-10 oz', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-bacon-smoked', flag: '🇬🇧', emoji: '🥓', category: 'Preorder British Meats', name: 'English Bacon - Smoked', sizes: [{ label: '16 oz', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-black-pudding', flag: '🇬🇧', emoji: '🍖', category: 'Preorder British Meats', name: 'Black Pudding', sizes: [{ label: '9-10 oz', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-cocktail-sausages', flag: '🇬🇧', emoji: '🌭', category: 'Preorder British Meats', name: 'British Cocktail Sausages', sizes: [{ label: 'Per Pack', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-welsh-dragon', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', emoji: '🌭', category: 'Preorder British Meats', name: 'Welsh Dragon Sausages', sizes: [{ label: 'Per Pack', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-jumbo-roll', flag: '🇬🇧', emoji: '🥐', category: 'Preorder British Meats', name: "Jumbo Sausage Roll - Parker's Finest", sizes: [{ label: 'Each', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-bacon-wet', flag: '🇬🇧', emoji: '🥓', category: 'Preorder British Meats', name: 'English Bacon - Wet Cured', sizes: [{ label: '16 oz', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-pork-pie', flag: '🇬🇧', emoji: '🥧', category: 'Preorder British Meats', name: "Classic Pork Pie - Parker's Finest", sizes: [{ label: '7 oz', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-lincolnshire', flag: '🇬🇧', emoji: '🌭', category: 'Preorder British Meats', name: 'Lincolnshire Chipolata Sausages', sizes: [{ label: 'Per Pack', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-cornish-pasty', flag: '🇬🇧', emoji: '🥧', category: 'Preorder British Meats', name: "Cornish Pasty - Parker's Finest", sizes: [{ label: 'Each', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-shepherds-pie', flag: '🇬🇧', emoji: '🥘', category: 'Preorder British Meats', name: "Shepherd's Pie", sizes: [{ label: 'Each', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-bread-rolls', flag: '🇬🇧', emoji: '🍞', category: 'Preorder British Meats', name: 'Large White Bread Rolls', sizes: [{ label: 'Per Pack', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-sticky-toffee', flag: '🇬🇧', emoji: '🍮', category: 'Preorder British Meats', name: 'Sticky Toffee Sponge Pudding', sizes: [{ label: 'Each', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-syrup-sponge', flag: '🇬🇧', emoji: '🍮', category: 'Preorder British Meats', name: 'Syrup Sponge Pudding', sizes: [{ label: 'Each', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-beef-onion-pie', flag: '🇬🇧', emoji: '🥧', category: 'Preorder British Meats', name: 'Beef & Onion Pie', sizes: [{ label: 'Each', priceNote: 'Price TBD' }], flavors: [] },
  // ── German Meats ───────────────────────────────────────────────────────────
  { id: 'germ-bavarian-liver', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Bavarian Liver Sausage', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-berliner-liver', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Berliner Liver Sausage', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-blood-sausage', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Blood Sausage', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-blood-tongue', flag: '🇩🇪', emoji: '🍖', category: 'Preorder German Meats', name: 'Blood Tongue', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-beer-sausage', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Beer Sausage', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-delicatess-spread', flag: '🇩🇪', emoji: '🫙', category: 'Preorder German Meats', name: 'Delicatess Spread', sizes: [{ label: '1 lb', priceNote: '$8' }], flavors: [] },
  { id: 'germ-jaeger-sausage', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Jaeger Sausage', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-bologna', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'German Bologna', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-gelbwurst', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Gelbwurst', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-gelbwurst-parsley', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Gelbwurst w/Parsley', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-gourmet-spread', flag: '🇩🇪', emoji: '🫙', category: 'Preorder German Meats', name: 'Gourmet Spread', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-headcheese', flag: '🇩🇪', emoji: '🍖', category: 'Preorder German Meats', name: 'Headcheese', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-liver-goose', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Liver Sausage w/Goose', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-mortadella', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Mortadella', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-ring-bologna', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Ring Bologna', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-schinkenwurst', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Schinkenwurst', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-tiroler', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Tiroler Jagdwurst', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-cooked-bratwurst', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Cooked Bratwurst', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-bavarian-bratwurst', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Bavarian Bratwurst', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-debreziner', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Debreziner', sizes: [{ label: '1 lb', priceNote: '$12' }], flavors: [] },
  { id: 'germ-garlic-sausage', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Garlic Sausage', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-grill-bratwurst', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Grill Bratwurst', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-gyulai', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Gyulai', sizes: [{ label: '1 lb', priceNote: '$12' }], flavors: [] },
  { id: 'germ-knackwurst', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Knackwurst', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-kilometer', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Kilometer', sizes: [{ label: '1 lb', priceNote: '$12' }], flavors: [] },
  { id: 'germ-landjager', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Landjager', sizes: [{ label: '1 lb', priceNote: '$12' }], flavors: [] },
  { id: 'germ-leberkase', flag: '🇩🇪', emoji: '🍖', category: 'Preorder German Meats', name: 'Leberkase', sizes: [{ label: '2 lbs', priceNote: '$19' }], flavors: [] },
  { id: 'germ-nuernburger', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Nuernburger Bratwurst', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-weisswurst', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Weisswurst', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-veal-bratwurst', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Veal Bratwurst', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-wieners', flag: '🇩🇪', emoji: '🌭', category: 'Preorder German Meats', name: 'Wieners', sizes: [{ label: '1 lb', priceNote: '$10' }], flavors: [] },
  { id: 'germ-nuss-schinken', flag: '🇩🇪', emoji: '🍖', category: 'Preorder German Meats', name: 'Nuss Schinken', sizes: [{ label: '1.5-2 lbs', priceNote: '$27' }], flavors: [] },
  // ── Andy's Deli — Polish Meats ─────────────────────────────────────────────
  { id: 'pol-forest-sausage', flag: '🇵🇱', emoji: '🌭', category: "Andys Deli", name: 'Forest Sausage', sizes: [{ label: 'Per Ring', priceNote: '$10' }], flavors: [] },
  { id: 'pol-wedding-kielbasa', flag: '🇵🇱', emoji: '🌭', category: "Andys Deli", name: 'Wedding Kielbasa', sizes: [{ label: 'Per Ring', priceNote: '$10' }], flavors: [] },
  { id: 'pol-polish-kielbasa', flag: '🇵🇱', emoji: '🌭', category: "Andys Deli", name: 'Polish Kielbasa', sizes: [{ label: 'Per Ring', priceNote: '$8' }], flavors: [] },
  { id: 'pol-royal-kabanosi', flag: '🇵🇱', emoji: '🌭', category: "Andys Deli", name: 'Royal Kabanosi', sizes: [{ label: 'Per Ring', priceNote: '$6' }], flavors: [] },
  { id: 'pol-kabanosi-sticks', flag: '🇵🇱', emoji: '🌭', category: "Andys Deli", name: 'Polish Kabanosi Sticks', sizes: [{ label: 'Each', priceNote: '$6' }], flavors: [] },
  { id: 'pol-tarczynski-kabanosi', flag: '🇵🇱', emoji: '🌭', category: "Andys Deli", name: 'Tarczynski Brand Kabanosi', sizes: [{ label: 'Each', priceNote: '$6' }], flavors: ['Original', 'With Bacon', 'With Chili'] },
  { id: 'pol-sokolow-kabanosi', flag: '🇵🇱', emoji: '🌭', category: "Andys Deli", name: 'Sokolow Brand Kabanosi', sizes: [{ label: 'Each', priceNote: '$6' }], flavors: ['Polish', 'Fresh', 'Italian', 'With Pepper', 'With Bacon & Pepper'] },
];
