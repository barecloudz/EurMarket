import { useState, useEffect } from 'react';
import { Wallet, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import Spinner from '../../components/ui/Spinner';

type Tab = 'pending' | 'paid';

interface PayoutItem {
  id: string;
  quantity: number;
  fulfillment_status: string;
  payout_status: string;
  paid_out_at: string | null;
  product: { name: string; wholesale_cost: number | null } | null;
}

export default function SupplierPayouts() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState<PayoutItem[]>([]);
  const [paidItems, setPaidItems] = useState<PayoutItem[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchPayouts();
  }, [user]);

  const fetchPayouts = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, paidRes] = await Promise.all([
        supabase
          .from('order_items')
          .select('id, quantity, fulfillment_status, payout_status, paid_out_at, product:products(name, wholesale_cost)')
          .eq('supplier_id', user!.id)
          .in('fulfillment_status', ['shipped', 'delivered'])
          .eq('payout_status', 'pending'),
        supabase
          .from('order_items')
          .select('id, quantity, fulfillment_status, payout_status, paid_out_at, product:products(name, wholesale_cost)')
          .eq('supplier_id', user!.id)
          .eq('payout_status', 'paid')
          .order('paid_out_at', { ascending: false }),
      ]);

      setPendingItems((pendingRes.data ?? []) as unknown as PayoutItem[]);
      setPaidItems((paidRes.data ?? []) as unknown as PayoutItem[]);
    } catch (err) {
      console.error('Error fetching payouts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingTotal = pendingItems.reduce((sum, item) => sum + (item.product?.wholesale_cost ?? 0) * item.quantity, 0);
  const paidTotal = paidItems.reduce((sum, item) => sum + (item.product?.wholesale_cost ?? 0) * item.quantity, 0);

  const items = tab === 'pending' ? pendingItems : paidItems;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
        <p className="text-gray-500 mt-1">Track what you're owed and your payment history</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending</span>
          </div>
          <p className="text-2xl font-black text-gray-900">${pendingTotal.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{pendingItems.length} item{pendingItems.length !== 1 ? 's' : ''} awaiting payment</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid Out</span>
          </div>
          <p className="text-2xl font-black text-gray-900">${paidTotal.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{paidItems.length} item{paidItems.length !== 1 ? 's' : ''} paid</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-5">
        {(['pending', 'paid'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'pending' ? 'Pending' : 'Paid History'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
          <Wallet className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">
            {tab === 'pending' ? 'No pending payouts — ship your items to start earning' : 'No paid payouts yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {items.map((item) => {
              const unitCost = item.product?.wholesale_cost ?? 0;
              const lineTotal = unitCost * item.quantity;
              const paidDate = item.paid_out_at
                ? new Date(item.paid_out_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : null;
              return (
                <div key={item.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{item.product?.name ?? 'Unknown product'}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {item.quantity} × ${unitCost.toFixed(2)}
                      {paidDate ? ` · Paid ${paidDate}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${lineTotal.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      tab === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'
                    }`}>
                      {tab === 'pending' ? 'Pending' : 'Paid'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
