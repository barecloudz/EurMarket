# Admin Overhaul Design Spec

**Date:** 2026-09-04
**Status:** Approved
**Audience:** The admin (store owner) is not technical. Every UI decision must pass the test: "Can someone who needs to be told what a button does figure this out without instructions?"

---

## Context

The pre-order admin is a single 1,246-line file (`src/pages/admin/PreOrders.tsx`) that handles four unrelated concerns. The admin user runs a small Eastern European food market and uses this daily to open/close orders, set up market dates, confirm customer orders, and track what to make. She needs things to be obvious, visual, and self-saving.

---

## Subsystem A — Architecture: Split PreOrders.tsx

### Problem
1,246 lines in one file causes bugs (components defined inside render scope remount on every poll), slows every edit, and makes the other improvements hard to build cleanly.

### Solution
Extract each tab into its own file. The shell fetches shared data once and passes it as props. No logic changes — pure extraction.

### File Structure

```
src/pages/admin/preorders/
  types.ts            — DeliveryDate, PreorderSettings, PreOrder, MenuItem,
                        ConfirmItem, DeliveryDateTemplate interfaces
  SettingsTab.tsx     — orders open/close toggle, deadline, market dates,
                        "use again" quick-add cards
  OrdersTab.tsx       — order list, inline confirmation, sticky summary
  MenuTab.tsx         — menu editor (extracted as-is)
  SuggestionsTab.tsx  — customer suggestions (extracted as-is)

src/pages/admin/PreOrders.tsx  — thin shell: fetch, tab nav, pass props down
```

### Data Flow
The shell fetches `preorder_settings` and `pre_orders` on mount and on a 60-second poll. It passes data down as props and receives mutation callbacks (`onSettingsChange`, `onOrderChange`) from tabs. Tabs do not fetch independently.

### New Type (types.ts)

```typescript
interface DeliveryDateTemplate {
  id: string;           // crypto.randomUUID()
  time: string;         // e.g. "10:00 AM – 2:00 PM"
  location_address: string;
  cities: string[];
}

// PreorderSettings gains one new field:
interface PreorderSettings {
  orders_open: boolean;
  order_deadline: string | null;
  delivery_dates: DeliveryDate[];
  delivery_date_templates: DeliveryDateTemplate[];
  menu: MenuItem[] | null;
}
```

### Database Migration

```sql
ALTER TABLE preorder_settings
  ADD COLUMN IF NOT EXISTS delivery_date_templates JSONB NOT NULL DEFAULT '[]';
```

---

## Subsystem B — Order Flow

### Problem
- Confirming an order requires a modal that confuses the admin
- The status dropdown allows nonsensical status jumps
- The "What to Make" summary scrolls out of view while working
- Dashboard says "Good morning" at 9pm

### B1 — Inline Order Confirmation (replaces modal)

**Current:** "Pack & Set Prices" → modal → fill prices → confirm → close modal.

**New:** "Set Prices & Confirm" button expands the order card inline. Each ordered item shows its name and a large price input. Unavailable toggle per item. "Confirm & Send Email ✉️" button at the bottom. An explicit "Cancel" link collapses it. Tapping outside does NOT close it (she would lose her work). Nothing auto-saves until she taps Confirm.

No z-index, no overlay, no modal — just more card.

### B2 — Linear Status Buttons (replaces dropdown)

One contextual button per order showing only the valid next step:

| Current status | Button label | Color |
|---|---|---|
| pending | Set Prices & Confirm | Amber |
| confirmed | Mark as Ready 📦 | Blue |
| ready | Mark as Done ✅ | Green |
| completed | Done ✅ (badge only) | Grey, not tappable |

No dropdown. No skipping steps.

### B3 — Sticky Production Summary

The "What to Make" card gets `position: sticky; top: 0` within the Orders tab scroll container. Collapsed by default on mobile (shows total item count only), expandable with one tap. Always visible while scrolling through orders.

### B4 — Dashboard Greeting

```typescript
const hour = new Date().getHours();
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
```

---

## Subsystem E — Cities (first-class concept)

### Problem
Cities are currently a side effect of delivery date setup. There is no standalone city list. When a delivery date expires, its cities silently vanish from the customer wizard. The admin has no way to see, add, or remove cities independently. She cannot understand why a customer suddenly can't find their city.

### Solution: "Cities we serve" in Settings

A dedicated section in the Settings tab — above market dates — with a simple managed list:

```
Cities we serve
───────────────
[Hendersonville, NC  ×]  [Hickory, NC  ×]  [Arden, NC  ×]
[+ Add a city ____________] [Add]
```

- Adding a city → appears immediately as a card on the customer wizard
- Removing a city × → disappears from the customer wizard
- Cities persist permanently regardless of whether a future date exists for them
- Auto-saves on every add/delete (no Save button)

### Impact on delivery date city picker
The city picker inside "Add / Edit a market date" changes from a free-text input to a multi-select from the `served_cities` list, plus an "All Cities" toggle. No more typos creating phantom cities. No more "Hickory NC" vs "Hickory, NC" mismatch.

### Impact on customer wizard
`availableCities` in `PreOrder.tsx` reads from `settings.served_cities` directly. CITIES_FALLBACK is removed. If `served_cities` is empty, Step 1 shows a friendly "No cities set up yet — check back soon" message instead of cards.

### Database Migration

```sql
ALTER TABLE preorder_settings
  ADD COLUMN IF NOT EXISTS served_cities JSONB NOT NULL DEFAULT '[]';
```

On first load after migration, the Settings tab auto-seeds `served_cities` from unique city values in existing `delivery_dates` (excluding "all") so the admin doesn't start with a blank list.

### New Type (types.ts addition)
```typescript
// PreorderSettings gains:
served_cities: string[];
```

---

## Subsystem C — "Use Again" Quick-Add

### Problem
Adding a market date requires retyping the same time and address every week.

### Solution
When the admin opens "Add a market date," show up to 3 cards derived from the most recent distinct `delivery_dates` entries (unique by time + location_address):

```
┌──────────────────────────────────────┐
│  📍 123 Main St, Marshall, NC        │
│  🕐 10:00 AM – 2:00 PM              │
│  🏙 All Cities                       │
│        [ Use This Setup ]            │
└──────────────────────────────────────┘
```

Tapping "Use This Setup" pre-fills time, address, and cities. Admin picks the date only. "Start Fresh" shows the blank form.

No templates to name or manage. Cards auto-derive from existing `delivery_dates` history at render time. No migration needed for this subsystem.

---

## Subsystem D — Returning Customer Recognition

### Problem
Admin has no way to know if an order is from a repeat customer.

### Solution

**Returning badge on order cards:**
Group all loaded `pre_orders` by `customer_phone` in the frontend. If a phone has more than one order, show: `⭐ 3rd order!` (amber badge) next to the customer name.

**History slide-over:**
Tapping the customer's phone number opens a right slide-over showing:
- Customer name, phone, email
- All past orders: date, city, items, status — most recent first
- Large × to close, read-only

No separate Customers tab. No new Supabase tables. Derived entirely from the `pre_orders` data the Orders tab already loads.

---

## Implementation Order

Each step is independently shippable:

1. **A — Split the file** (invisible to admin, unblocks everything else)
2. **E — Cities** (fix the broken mental model before anything else touches delivery dates)
3. **B — Order flow** (highest daily-use impact)
4. **C — "Use Again" cards** (saves weekly repetition on date setup)
5. **D — Returning badge + slide-over** (low effort, high delight for the admin)

---

## What We Are NOT Building

- Full Customers admin tab
- Named template management UI
- Bulk order confirmation
- Order search or filter
- Email resend
- Any new pages or routes
- Any new Supabase tables beyond the one `delivery_date_templates` column

---

## Success Criteria

After this ships, the admin should be able to:
- Add and remove a city from one place and immediately see it reflected on the customer wizard
- Open orders, add a market date, and confirm 5 orders without consulting the help guide
- See what she needs to make without scrolling
- Recognize a returning customer from the order list
- Set up a recurring weekly market date in under 30 seconds
- Never lose a city because a past market date expired
