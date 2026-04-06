import { useState, useEffect, useCallback } from 'react';
import { Wallet, CheckCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';

interface SupplierProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface PayoutOrderItem {
  id: string;
  supplier_id: string | null;
  quantity: number;
  fulfillment_status: string;
  payout_status: string;
  paid_out_at: string | null;
  product: { name: string; wholesale_cost: number | null } | null;
  supplier: SupplierProfile | null;
}

interface SupplierGroup {
  supplier: SupplierProfile;
  items: PayoutOrderItem[];
  total: number;
}

function groupBySupplier(items: PayoutOrderItem[]): SupplierGroup[] {
  const map = new Map<string, SupplierGroup>();

  for (const item of items) {
    if (!item.supplier || !item.supplier_id) continue;
    const id = item.supplier_id;
    const unitCost = item.product?.wholesale_cost ?? 0;
    const lineTotal = unitCost * item.quantity;

    if (!map.has(id)) {
      map.set(id, { supplier: item.supplier, items: [], total: 0 });
    }
    const group = map.get(id)!;
    group.items.push(item);
    group.total += lineTotal;
  }

  return Array.from(map.values());
}

export default function AdminPayouts() {
  const { session } = useAuthStore();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingGroups, setPendingGroups] = useState<SupplierGroup[]>([]);
  const [paidGroups, setPaidGroups] = useState<SupplierGroup[]>([]);
  const [payingOut, setPayingOut] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: pendingItems } = await supabase
        .from('order_items')
        .select('*, product:products(name, wholesale_cost), supplier:profiles!order_items_supplier_id_fkey(id, first_name, last_name, email)')
        .in('fulfillment_status', ['shipped', 'delivered'])
        .eq('payout_status', 'pending');

      const { data: paidItems } = await supabase
        .from('order_items')
        .select('*, product:products(name, wholesale_cost), supplier:profiles!order_items_supplier_id_fkey(id, first_name, last_name, email)')
        .eq('payout_status', 'paid')
        .order('paid_out_at', { ascending: false });

      setPendingGroups(groupBySupplier((pendingItems ?? []) as PayoutOrderItem[]));
      setPaidGroups(groupBySupplier((paidItems ?? []) as PayoutOrderItem[]));
    } catch (err) {
      console.error('Error fetching payouts:', err);
      addToast('Failed to load payout data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleMarkPaid = async (supplierId: string) => {
    setPayingOut(supplierId);
    try {
      const res = await fetch('/.netlify/functions/mark-payout-paid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ supplierId }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to mark as paid');
      }

      addToast('Payout marked as paid', 'success');
      await fetchPayouts();
    } catch (err: any) {
      addToast(err.message || 'Something went wrong', 'error');
    } finally {
      setPayingOut(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Wallet className="h-8 w-8 text-[var(--color-primary)]" />
        <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'pending'
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-gray-100 text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending Payouts
        </button>
        <button
          onClick={() => setActiveTab('paid')}
          className={`px-5 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'paid'
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-gray-100 text-gray-600 hover:text-gray-900'
          }`}
        >
          Paid History
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : activeTab === 'pending' ? (
        <>
          {pendingGroups.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-brand-neon mb-4" />
                <p className="text-white text-lg font-semibold">All caught up — no pending payouts</p>
                <p className="text-gray-400 text-sm mt-1">Shipped and delivered items will appear here when a payout is due.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {pendingGroups.map((group) => (
                <div key={group.supplier.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  {/* Supplier header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {group.supplier.first_name || group.supplier.last_name
                          ? `${group.supplier.first_name ?? ''} ${group.supplier.last_name ?? ''}`.trim()
                          : 'Unknown Supplier'}
                      </p>
                      <p className="text-sm text-gray-500">{group.supplier.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Total Owed</p>
                        <p className="text-2xl font-bold text-gray-900">${group.total.toFixed(2)}</p>
                      </div>
                      <Button
                        onClick={() => handleMarkPaid(group.supplier.id)}
                        isLoading={payingOut === group.supplier.id}
                        size="sm"
                      >
                        Mark as Paid
                      </Button>
                    </div>
                  </div>

                  {/* Line items */}
                  <div className="divide-y divide-gray-50">
                    {group.items.map((item) => {
                      const unitCost = item.product?.wholesale_cost ?? 0;
                      const lineTotal = unitCost * item.quantity;
                      return (
                        <div key={item.id} className="flex items-center justify-between px-6 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{item.product?.name ?? 'Unknown product'}</p>
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity} &times; ${unitCost.toFixed(2)} / unit
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">${lineTotal.toFixed(2)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {paidGroups.length === 0 ? (
            <Card>
              <div className="py-12 text-center">
                <p className="text-gray-400">No paid payouts yet.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {paidGroups.map((group) => (
                <div key={group.supplier.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  {/* Supplier header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {group.supplier.first_name || group.supplier.last_name
                          ? `${group.supplier.first_name ?? ''} ${group.supplier.last_name ?? ''}`.trim()
                          : 'Unknown Supplier'}
                      </p>
                      <p className="text-sm text-gray-500">{group.supplier.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Total Paid</p>
                      <p className="text-2xl font-bold text-gray-900">${group.total.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Line items */}
                  <div className="divide-y divide-gray-50">
                    {group.items.map((item) => {
                      const unitCost = item.product?.wholesale_cost ?? 0;
                      const lineTotal = unitCost * item.quantity;
                      const paidDate = item.paid_out_at
                        ? new Date(item.paid_out_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : null;
                      return (
                        <div key={item.id} className="flex items-center justify-between px-6 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{item.product?.name ?? 'Unknown product'}</p>
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity} &times; ${unitCost.toFixed(2)} / unit
                              {paidDate ? ` · Paid ${paidDate}` : ''}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">${lineTotal.toFixed(2)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
