import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { adminApi } from '../../services/endpoints';
import { Customer, Order } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { OrderDetailModal } from '../orders/OrderDetailModal';
import { MembershipBadge } from '../../components/ui/MembershipBadge';
import { Avatar } from '../../components/ui/Avatar';
import { CustomerEditModal } from './CustomerEditModal';
import { CustomerResetPasswordModal } from './CustomerResetPasswordModal';
import {
  Users,
  Phone,
  Mail,
  MapPin,
  Building,
  Calendar,
  ShoppingBag,
  Eye,
  AlertCircle,
  Crown,
  Lock,
  Edit,
  KeyRound,
  Power,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onCustomerUpdated?: (updated: Customer) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated,
}) => {
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(customer);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentCustomer(customer);
    if (isOpen && customer) {
      loadCustomerOrders(customer.id);
      loadFullCustomerDetails(customer.id);
    }
  }, [isOpen, customer]);

  const loadFullCustomerDetails = async (customerId: string) => {
    try {
      const res = await adminApi.getCustomer(customerId);
      if (res.success && res.data) {
        setCurrentCustomer(res.data);
      }
    } catch (err) {
      console.error('Failed to load full customer record', err);
    }
  };

  const loadCustomerOrders = async (customerId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await adminApi.getOrders({ customer_id: customerId, limit: 50 });
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load customer orders', err);
      setError('Unable to load order history for this customer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!currentCustomer) return;
    const newStatus = !currentCustomer.is_active;
    const confirmMsg = newStatus
      ? `Activate customer account for ${currentCustomer.name}?`
      : `Deactivate customer account for ${currentCustomer.name}? They will no longer be able to log in or place orders.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsTogglingStatus(true);
      setStatusMessage(null);
      const res = await adminApi.updateCustomerStatus(currentCustomer.id, newStatus);
      if (res.success && res.data) {
        setCurrentCustomer(res.data);
        if (onCustomerUpdated) onCustomerUpdated(res.data);
        setStatusMessage(`Customer account ${newStatus ? 'activated' : 'deactivated'} successfully.`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update account status.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleCustomerSaved = (updated: Customer) => {
    setCurrentCustomer(updated);
    if (onCustomerUpdated) onCustomerUpdated(updated);
  };

  if (!currentCustomer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Customer Dossier: ${currentCustomer.name}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Status notification banner if any */}
        {statusMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Admin Quick Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 text-white rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-medium">Actions for this customer:</span>
            <MembershipBadge tier={currentCustomer.membership_tier} size="xs" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20 inline-flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5 text-blue-300" />
              <span>Edit Details</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetPasswordOpen(true)}
              className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20 inline-flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span>Reset Password</span>
            </Button>

            <button
              type="button"
              disabled={isTogglingStatus}
              onClick={handleToggleStatus}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all inline-flex items-center gap-1.5 ${
                currentCustomer.is_active
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{currentCustomer.is_active ? 'Deactivate Account' : 'Activate Account'}</span>
            </button>
          </div>
        </div>

        {/* Customer Dossier Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-100 text-xs">
          {/* Card 1: Identity & Credentials */}
          <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Identity & Credentials
            </span>
            <div className="flex items-center gap-2.5 pt-0.5">
              <Avatar src={currentCustomer.profile_photo_url} name={currentCustomer.name} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-gray-900 truncate">{currentCustomer.name}</p>
                {currentCustomer.first_name && (
                  <p className="text-[11px] text-gray-500">
                    First: <strong>{currentCustomer.first_name}</strong> | Last: <strong>{currentCustomer.last_name}</strong>
                  </p>
                )}
              </div>
            </div>
            <p className="text-gray-600 font-mono flex items-center gap-1">
              <span>Username:</span>
              <strong className="text-blue-700">{currentCustomer.username || '—'}</strong>
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Password: Protected</span>
            </div>
          </div>

          {/* Card 2: Contact Information */}
          <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Contact Channels
            </span>
            <p className="font-mono text-emerald-700 font-bold flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              <span>{currentCustomer.phone}</span>
            </p>
            <p className="text-gray-600 flex items-center gap-1 truncate" title={currentCustomer.email}>
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{currentCustomer.email || 'No email registered'}</span>
            </p>
            {currentCustomer.business_name && (
              <p className="text-blue-800 font-semibold flex items-center gap-1 mt-1">
                <Building className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">{currentCustomer.business_name}</span>
              </p>
            )}
          </div>

          {/* Card 3: Physical & Delivery Addresses */}
          <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Addresses
            </span>
            <div>
              <span className="text-[10px] text-gray-400 block font-semibold">Residential Address:</span>
              <p className="text-gray-700 leading-tight">
                {currentCustomer.residential_address || currentCustomer.delivery_address || '—'}
              </p>
            </div>
            <div className="pt-1 border-t border-gray-100">
              <span className="text-[10px] text-gray-400 block font-semibold">Delivery Destination:</span>
              <p className="text-gray-700 leading-tight">
                {currentCustomer.delivery_address || 'Same as residential'}
              </p>
            </div>
          </div>

          {/* Card 4: Loyalty & Account Telemetry */}
          <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Loyalty & Status
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize"
                style={{
                  backgroundColor: currentCustomer.is_active ? '#ecfdf5' : '#fff1f2',
                  color: currentCustomer.is_active ? '#065f46' : '#9f1239',
                  borderColor: currentCustomer.is_active ? '#a7f3d0' : '#fecdd3',
                }}
              >
                {currentCustomer.is_active ? 'Active Buyer' : 'Deactivated'}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                ID: {currentCustomer.id.slice(0, 8)}...
              </span>
            </div>
            <div className="pt-1">
              <span className="text-[10px] text-gray-400 block font-semibold">Eligible Lifetime Purchases:</span>
              <p className="text-base font-extrabold text-gray-900 font-mono">
                {formatCurrency(currentCustomer.lifetime_spent || 0)}
              </p>
            </div>
            <p className="text-[10px] text-gray-400">
              Registered: {formatDate(currentCustomer.created_at)}
            </p>
          </div>
        </div>

        {/* Customer Order History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-blue-600" />
              <span>Customer Order History</span>
            </h4>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
              {orders.length} Order{orders.length !== 1 ? 's' : ''} Placed
            </span>
          </div>

          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Spinner />
            </div>
          ) : error ? (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-gray-400">
              <ShoppingBag className="h-8 w-8 mx-auto text-gray-300 mb-1" />
              <p className="text-xs font-medium">No orders recorded for this customer yet.</p>
            </div>
          ) : (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="p-3">Order Number</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Order Value</th>
                    <th className="p-3 text-right">Date Placed</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-mono font-bold text-gray-900">{o.order_number}</td>
                      <td className="p-3">
                        <Badge status={o.status} />
                      </td>
                      <td className="p-3 text-right font-extrabold text-gray-900 font-mono">
                        {formatCurrency(o.total_amount)}
                      </td>
                      <td className="p-3 text-right text-gray-500">
                        {formatDate(o.created_at)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Slip & Items</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Nested Order Detail Modal */}
        {selectedOrder && (
          <OrderDetailModal
            isOpen={!!selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onSuccess={() => {
              loadCustomerOrders(currentCustomer.id);
            }}
            order={selectedOrder}
          />
        )}

        {/* Admin Edit Modal */}
        <CustomerEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          customer={currentCustomer}
          onSuccess={handleCustomerSaved}
        />

        {/* Admin Reset Password Modal */}
        <CustomerResetPasswordModal
          isOpen={isResetPasswordOpen}
          onClose={() => setIsResetPasswordOpen(false)}
          customer={currentCustomer}
          onSuccess={() => {
            loadFullCustomerDetails(currentCustomer.id);
          }}
        />
      </div>
    </Modal>
  );
};
