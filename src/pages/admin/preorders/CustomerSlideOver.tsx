import type { PreOrder } from './types';
import { STATUS_STYLES, STATUS_LABELS } from './types';

interface Props {
  phone: string;
  orders: PreOrder[];
  onClose: () => void;
}

export function CustomerSlideOver({ phone, orders, onClose }: Props) {
  const customerOrders = orders
    .filter(o => o.customer_phone === phone)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const customer = customerOrders[0];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 overflow-y-auto shadow-2xl border-l border-gray-200">
        <div className="p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-gray-900 font-black text-xl leading-tight">{customer?.customer_name}</h2>
              <p className="text-gray-500 text-sm mt-0.5">{phone}</p>
              {customer?.customer_email && (
                <p className="text-gray-500 text-sm">{customer.customer_email}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-3xl leading-none ml-4 font-light transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
            Order History ({customerOrders.length} order{customerOrders.length !== 1 ? 's' : ''})
          </p>

          <div className="space-y-3">
            {customerOrders.map((order, i) => (
              <div key={order.id} className={`rounded-2xl border-2 p-4 ${order.status === 'pending' ? 'border-amber-300' : 'border-gray-100'} bg-white shadow-sm`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-gray-900 text-sm font-black">
                      {i === 0 ? 'Latest' : `Order #${customerOrders.length - i}`}
                    </span>
                    <span className="text-gray-400 text-xs ml-2">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${STATUS_STYLES[order.status] ?? STATUS_STYLES.pending}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mb-2">📍 {order.pickup_city} · 📅 {order.delivery_date}</p>
                <div className="space-y-0.5">
                  {order.items.map((item, j) => (
                    <p key={j} className="text-gray-700 text-sm">
                      <span className="font-black text-[#CC0000]">×{item.qty}</span> {item.product}
                      {item.size ? <span className="text-gray-500"> ({item.size})</span> : null}
                      {item.flavor ? <span className="text-gray-500"> — {item.flavor}</span> : null}
                    </p>
                  ))}
                </div>
                {order.confirmed_total != null && (
                  <p className="text-gray-500 text-xs mt-2 font-semibold">
                    Total: ${order.confirmed_total.toFixed(2)}
                  </p>
                )}
                {order.payment_method && (
                  <p className="text-xs font-semibold text-gray-600 mt-1">
                    {{ cash: '💵 Cash', zelle: '💜 Zelle', card: '💳 Card' }[order.payment_method] ?? order.payment_method}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
