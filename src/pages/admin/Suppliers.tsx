import { useState, useEffect } from 'react';
import { UserPlus, Users, Package, Trash2, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import type { Supplier } from '../../types';

export default function AdminSuppliers() {
  const { addToast } = useToast();
  const { session } = useAuthStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, phone, created_at')
        .eq('role', 'supplier')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);

      // Fetch product counts per supplier
      if (data && data.length > 0) {
        const supplierIds = data.map(s => s.id);
        const { data: products } = await supabase
          .from('products')
          .select('supplier_id')
          .in('supplier_id', supplierIds);

        const counts: Record<string, number> = {};
        for (const p of products || []) {
          if (p.supplier_id) {
            counts[p.supplier_id] = (counts[p.supplier_id] || 0) + 1;
          }
        }
        setProductCounts(counts);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteSupplier = async () => {
    if (!inviteEmail) return;
    setIsSending(true);

    try {
      const response = await fetch('/.netlify/functions/create-supplier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          first_name: inviteFirstName || null,
          last_name: inviteLastName || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to invite supplier');

      setTempPassword('invited');
      fetchSuppliers();
    } catch (err: any) {
      addToast(err.message || 'Failed to invite supplier', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleRemoveSupplier = async (id: string) => {
    if (!confirm('Downgrade this supplier to a regular customer? Their products will remain but become unassigned.')) return;

    try {
      const response = await fetch('/.netlify/functions/remove-supplier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ supplierId: id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update supplier');

      setSuppliers(prev => prev.filter(s => s.id !== id));
      addToast('Supplier access revoked', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to update supplier', 'error');
    }
  };

  const closeInviteModal = () => {
    setInviteOpen(false);
    setInviteEmail('');
    setInviteFirstName('');
    setInviteLastName('');
    setTempPassword(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 mt-1">{suppliers.length} supplier account{suppliers.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          <UserPlus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      {suppliers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-4">No suppliers yet</p>
          <button
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            <UserPlus className="h-4 w-4" />
            Add First Supplier
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--color-primary)] font-bold text-sm">
                  {(supplier.first_name?.[0] || supplier.email[0]).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">
                  {supplier.first_name || supplier.last_name
                    ? `${supplier.first_name || ''} ${supplier.last_name || ''}`.trim()
                    : supplier.email}
                </p>
                <p className="text-sm text-gray-500 truncate">{supplier.email}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">Joined {formatDate(supplier.created_at)}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Package className="h-3.5 w-3.5" />
                    {productCounts[supplier.id] || 0} products
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleRemoveSupplier(supplier.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Revoke supplier access"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      <Modal isOpen={inviteOpen} onClose={closeInviteModal} title="Add Supplier">
        {tempPassword === 'invited' ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Invite Sent!</h3>
              <p className="text-gray-500 text-sm">
                An email has been sent to <span className="font-semibold text-gray-900">{inviteEmail}</span> with a link to set up their account.
              </p>
              <p className="text-gray-400 text-xs mt-3">
                They'll be taken directly to their product dashboard after setting their password.
              </p>
            </div>
            <button
              onClick={closeInviteModal}
              className="w-full px-4 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">First Name</label>
                <input
                  type="text"
                  value={inviteFirstName}
                  onChange={(e) => setInviteFirstName(e.target.value)}
                  placeholder="Jane"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Last Name</label>
                <input
                  type="text"
                  value={inviteLastName}
                  onChange={(e) => setInviteLastName(e.target.value)}
                  placeholder="Smith"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Email *</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="supplier@example.com"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              />
            </div>
            <p className="text-xs text-gray-400">
              A temporary password will be generated. The supplier logs in at /supplier/orders.
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeInviteModal}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteSupplier}
                disabled={!inviteEmail || isSending}
                className="flex-1 px-4 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSending ? <Spinner size="sm" /> : 'Create Account'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
