import { useState } from 'react';
import { MapPin, Package, Mail, Download, Printer } from 'lucide-react';
import type { PreOrder, PreorderSettings, ConfirmItem, MenuItem } from './types';
import { STATUS_STYLES, STATUS_LABELS, buildSummary, inferPrice } from './types';
import { CustomerSlideOver } from './CustomerSlideOver';

interface Props {
  settings: PreorderSettings;
  orders: PreOrder[];
  menu: MenuItem[];
  updatingStatus: string | null;
  sendingConf: boolean;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onSendConfirmation: (order: PreOrder, items: ConfirmItem[]) => Promise<void>;
}

function exportCSV(orders: PreOrder[]) {
  const rows = [
    ['Name', 'Phone', 'City', 'Date', 'Status', 'Product', 'Size', 'Flavor', 'Qty', 'Notes'],
  ];
  for (const o of orders) {
    for (const item of o.items) {
      rows.push([
        o.customer_name, o.customer_phone, o.pickup_city, o.delivery_date, o.status,
        item.product, item.size ?? '', item.flavor ?? '', String(item.qty), o.notes ?? '',
      ]);
    }
  }
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""').replace(/[\n\r]+/g, ' ')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `preorders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function OrdersTab({
  orders,
  menu,
  updatingStatus,
  sendingConf,
  onUpdateStatus,
  onSendConfirmation,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [priceInputs, setPriceInputs] = useState<Record<string, ConfirmItem[]>>({});
  const [slideOverPhone, setSlideOverPhone] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [groupByCity, setGroupByCity] = useState(false);

  const summary = buildSummary(orders);

  // Count orders per phone to detect returning customers
  const orderCountByPhone = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.customer_phone] = (acc[o.customer_phone] ?? 0) + 1;
    return acc;
  }, {});

  function startConfirm(order: PreOrder) {
    const existingItems = order.confirmed_items;
    const items: ConfirmItem[] = order.items.map((item, i) => ({
      product: item.product,
      size: item.size,
      flavor: item.flavor,
      qty: item.qty,
      price: existingItems?.[i]?.price ?? inferPrice(menu, item.product, item.size, item.qty),
      available: existingItems?.[i]?.available ?? true,
      substitution: existingItems?.[i]?.substitution ?? '',
    }));
    setPriceInputs(prev => ({ ...prev, [order.id]: items }));
    setExpandedId(order.id);
  }

  function updateConfirmItem(orderId: string, idx: number, patch: Partial<ConfirmItem>) {
    setPriceInputs(prev => {
      const items = [...(prev[orderId] ?? [])];
      items[idx] = { ...items[idx], ...patch };
      return { ...prev, [orderId]: items };
    });
  }

  async function handleSendConfirmation(order: PreOrder) {
    const items = priceInputs[order.id] ?? [];
    await onSendConfirmation(order, items);
    setExpandedId(null);
    setPriceInputs(prev => {
      const copy = { ...prev };
      delete copy[order.id];
      return copy;
    });
  }

  // Sort: pending first, then confirmed, ready, completed
  const statusOrder: Record<string, number> = { pending: 0, confirmed: 1, ready: 2, completed: 3 };
  const sortedOrders = [...orders].sort((a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4));

  // Group by city if enabled
  type DisplayItem = { kind: 'city'; city: string } | { kind: 'order'; order: PreOrder };
  let displayItems: DisplayItem[];
  if (groupByCity) {
    const sorted = [...orders].sort((a, b) => a.pickup_city.localeCompare(b.pickup_city));
    const seen = new Set<string>();
    displayItems = [];
    for (const o of sorted) {
      if (!seen.has(o.pickup_city)) { seen.add(o.pickup_city); displayItems.push({ kind: 'city', city: o.pickup_city }); }
      displayItems.push({ kind: 'order', order: o });
    }
  } else {
    displayItems = sortedOrders.map(o => ({ kind: 'order', order: o }));
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
        <Package className="h-14 w-14 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-bold">No orders yet</p>
        <p className="text-sm mt-1">Orders will appear here once customers submit them</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Sticky production summary */}
      <div className="sticky top-0 z-10 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setSummaryOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <p className="font-black text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
            📋 Production Summary
            {!summaryOpen && (
              <span className="font-normal text-gray-400 normal-case tracking-normal">
                ({summary.reduce((s, [, n]) => s + n, 0)} items)
              </span>
            )}
          </p>
          <span className="text-xs text-gray-400">{summaryOpen ? '▲ collapse' : '▼ expand'}</span>
        </button>
        {summaryOpen && (
          <div className="p-4 divide-y divide-gray-50">
            {summary.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">All orders completed</p>
            ) : summary.map(([key, qty]) => (
              <div key={key} className="flex items-center justify-between py-2.5">
                <p className="text-sm text-gray-700 leading-snug">{key}</p>
                <span className="text-lg font-black text-[#CC0000] ml-4 flex-shrink-0">×{qty}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions row */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setGroupByCity(v => !v)}
          className={`flex items-center justify-center gap-2 border-2 font-bold text-sm px-4 py-3 rounded-xl transition-colors ${
            groupByCity ? 'bg-[#CC0000] border-[#CC0000] text-white' : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
          }`}>
          <MapPin className="w-4 h-4" /> Group by City
        </button>
        <button onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold text-sm px-4 py-3 rounded-xl transition-colors">
          <Printer className="w-4 h-4" /> Print
        </button>
        <button onClick={() => exportCSV(orders)}
          className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold text-sm px-4 py-3 rounded-xl transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Order list */}
      {displayItems.map((item, idx) => {
        if (item.kind === 'city') {
          return (
            <div key={`city-${item.city}`} className={`flex items-center gap-2 py-2 px-1 mb-1 ${idx > 0 ? 'mt-3' : ''}`}>
              <MapPin className="w-4 h-4 text-[#CC0000] flex-shrink-0" />
              <p className="font-black text-gray-800 text-sm uppercase tracking-wider">{item.city}</p>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                {orders.filter(o => o.pickup_city === item.city).length}
              </span>
            </div>
          );
        }

        const order = item.order;
        const count = orderCountByPhone[order.customer_phone] ?? 1;
        const isReturning = count > 1;
        const ordinalIndex = orders
          .filter(o => o.customer_phone === order.customer_phone)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .findIndex(o => o.id === order.id) + 1;
        const ordinalLabel =
          ordinalIndex === 2 ? '2nd' :
          ordinalIndex === 3 ? '3rd' :
          `${ordinalIndex}th`;
        const isExpanded = expandedId === order.id;
        const confirmItems = priceInputs[order.id] ?? [];
        const confirmTotal = confirmItems.filter(i => i.available).reduce((sum, i) => sum + i.price, 0);
        const cardTotal = confirmTotal * 1.035;

        return (
          <div key={order.id} className={`bg-white rounded-2xl border-2 shadow-sm p-5 ${order.status === 'pending' ? 'border-amber-300' : 'border-gray-100'}`}>
            {/* Card header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-lg font-black text-gray-900">{order.customer_name}</p>
                  {isReturning && (
                    <span className="text-xs bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                      ⭐ {ordinalLabel} order!
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSlideOverPhone(order.customer_phone)}
                  className="text-sm text-[#CC0000] font-semibold hover:underline transition-colors">
                  📱 {order.customer_phone}
                </button>
              </div>
              <div className="flex-shrink-0 text-right">
                <label className="text-xs font-bold text-gray-400 block mb-1">Update status</label>
                <select
                  value={order.status}
                  onChange={e => onUpdateStatus(order.id, e.target.value)}
                  disabled={updatingStatus === order.id}
                  className={`text-sm font-bold px-3 py-2 rounded-xl border-2 focus:outline-none cursor-pointer disabled:opacity-60 ${STATUS_STYLES[order.status] ?? STATUS_STYLES.pending}`}>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Order details */}
            <div className="text-sm text-gray-500 space-y-0.5 mb-3">
              <p>📍 {order.pickup_city} · 📅 {order.delivery_date}</p>
              <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
            </div>

            {/* Items */}
            <div className="border-t border-gray-100 pt-3 space-y-1">
              {order.items.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">
                  <span className="font-black text-[#CC0000]">×{item.qty}</span> {item.product}
                  {item.size ? <span className="text-gray-500"> ({item.size})</span> : null}
                  {item.flavor ? <span className="text-gray-500"> — {item.flavor}</span> : null}
                </p>
              ))}
            </div>

            {/* Notes / suggestions */}
            {order.notes && (
              <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                <span className="font-bold">📝 Notes:</span> {order.notes}
              </p>
            )}
            {order.suggestions && (
              <p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                <span className="font-bold">💡 Suggestion:</span> {order.suggestions}
              </p>
            )}

            {/* Payment method */}
            {order.payment_method && (
              <p className="mt-3 text-sm font-bold bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2">
                {{ cash: '💵 Paying with Cash', zelle: '💜 Paying with Zelle', card: '💳 Paying with Card (+3.5%)' }[order.payment_method] ?? order.payment_method}
              </p>
            )}
            {order.status === 'confirmed' && !order.payment_method && (
              <p className="mt-3 text-sm text-gray-400 italic">⏳ Awaiting customer payment choice</p>
            )}

            {/* Action buttons — linear status machine */}
            {!isExpanded && (
              <div className="mt-4">
                {order.status === 'pending' && (
                  <button
                    onClick={() => startConfirm(order)}
                    className="w-full flex items-center justify-center gap-2 bg-[#CC0000] hover:bg-[#AA0000] text-white font-bold text-sm px-4 py-3 rounded-xl transition-colors">
                    <Mail className="w-4 h-4" /> Set Prices & Confirm
                  </button>
                )}
                {order.status === 'confirmed' && (
                  <>
                    <button
                      onClick={() => onUpdateStatus(order.id, 'ready')}
                      disabled={updatingStatus === order.id}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm px-4 py-3 rounded-xl transition-colors mb-2">
                      Mark as Ready 📦
                    </button>
                    <button
                      onClick={() => startConfirm(order)}
                      className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#CC0000]/30 hover:border-[#CC0000] text-[#CC0000] font-bold text-sm px-4 py-3 rounded-xl transition-colors">
                      <Mail className="w-4 h-4" /> Resend Confirmation
                    </button>
                  </>
                )}
                {order.status === 'ready' && (
                  <button
                    onClick={() => onUpdateStatus(order.id, 'completed')}
                    disabled={updatingStatus === order.id}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold text-sm px-4 py-3 rounded-xl transition-colors">
                    Mark as Done ✅
                  </button>
                )}
              </div>
            )}

            {/* Inline confirmation expansion */}
            {isExpanded && (
              <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prices are auto-filled from the menu — adjust if needed, then confirm</p>
                {confirmItems.map((ci, i) => {
                  const label = [ci.product, ci.size && `(${ci.size})`, ci.flavor && `— ${ci.flavor}`].filter(Boolean).join(' ');
                  return (
                    <div key={i} className={`rounded-2xl border-2 p-4 transition-colors ${ci.available ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <p className={`text-sm font-bold leading-snug ${ci.available ? 'text-gray-900' : 'text-red-500 line-through'}`}>
                          {ci.available ? '✅' : '❌'} {label}
                          {ci.qty > 1 && <span className="font-normal text-gray-500"> × {ci.qty}</span>}
                        </p>
                        <button
                          type="button"
                          onClick={() => updateConfirmItem(order.id, i, { available: !ci.available })}
                          className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-colors ${ci.available
                            ? 'border-red-200 text-red-500 hover:bg-red-50'
                            : 'border-green-300 text-green-600 hover:bg-green-50'
                          }`}>
                          {ci.available ? 'Mark unavailable' : 'Mark available'}
                        </button>
                      </div>

                      {ci.available ? (
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1.5">Total price for this item</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.50"
                              value={ci.price || ''}
                              onChange={e => updateConfirmItem(order.id, i, { price: parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                              className="w-full border-2 border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-gray-900 font-bold text-base focus:outline-none focus:border-[#CC0000] transition-colors"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1.5">Substitution (optional)</label>
                          <input
                            type="text"
                            value={ci.substitution}
                            onChange={e => updateConfirmItem(order.id, i, { substitution: e.target.value })}
                            placeholder="e.g. Sweet Cheese Roll Medium ($8)"
                            className="w-full border-2 border-red-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-red-400 transition-colors bg-white"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Totals */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm text-gray-500">Order Total</span>
                    <span className="text-xl font-black text-gray-900">${confirmTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-baseline mb-4">
                    <span className="text-xs text-gray-400">Card total (+3.5%)</span>
                    <span className="text-sm text-gray-400">${cardTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendConfirmation(order)}
                    disabled={sendingConf || (confirmTotal === 0 && confirmItems.some(i => i.available))}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#CC0000] hover:bg-[#AA0000] disabled:opacity-50 text-white font-black text-base px-4 py-4 rounded-2xl transition-colors">
                    {sendingConf
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                      : <><Mail className="w-4 h-4" /> {order.customer_email ? 'Confirm & Send Email' : 'Confirm Order (no email)'}</>
                    }
                  </button>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-2xl text-gray-600 font-bold hover:border-gray-300 transition-colors text-sm">
                    Cancel
                  </button>
                </div>
                {confirmTotal === 0 && confirmItems.some(i => i.available) && (
                  <p className="text-center text-xs text-red-400">Enter at least one price to confirm</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Customer slide-over */}
      {slideOverPhone && (
        <CustomerSlideOver
          phone={slideOverPhone}
          orders={orders}
          onClose={() => setSlideOverPhone(null)}
        />
      )}
    </div>
  );
}
