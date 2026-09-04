import { Lightbulb } from 'lucide-react';
import type { PreOrder } from './types';

interface Props {
  orders: PreOrder[];
}

export function SuggestionsTab({ orders }: Props) {
  const suggestions = orders.filter(o => o.suggestions?.trim());

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Products customers are asking for — great for planning future markets.</p>
      {suggestions.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
          <Lightbulb className="h-14 w-14 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-bold">No suggestions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-bold text-gray-900 mb-1">
                {order.customer_name}<span className="font-normal text-gray-500 text-sm"> · {order.pickup_city}</span>
              </p>
              <p className="text-gray-700 text-base leading-relaxed bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
                💡 {order.suggestions}
              </p>
              <p className="text-xs text-gray-400 mt-2">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
