import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { Customer } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { CustomerDetailModal } from './CustomerDetailModal';
import { CustomerEditModal } from './CustomerEditModal';
import { CustomerResetPasswordModal } from './CustomerResetPasswordModal';
import { MembershipBadge } from '../../components/ui/MembershipBadge';
import { Avatar } from '../../components/ui/Avatar';
import { useDebounce } from '../../hooks/useDebounce';
import {
  Users,
  Search,
  ShoppingBag,
  Eye,
  Edit,
  KeyRound,
  Power,
  SlidersHorizontal,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';

export const CustomerListPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [isLoading, setIsLoading] = useState(true);

  // Modal inspection & editing states
  const [inspectingCustomer, setInspectingCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [resettingCustomer, setResettingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, [debouncedSearch, statusFilter, tierFilter, sortBy, sortOrder]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getCustomers({
        search: debouncedSearch || undefined,
        status: statusFilter,
        tier: tierFilter,
        sort_by: sortBy,
        order: sortOrder,
        limit: 50,
      });
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (c: Customer) => {
    const newStatus = !c.is_active;
    const confirmMsg = newStatus
      ? `Activate customer account for ${c.name}?`
      : `Deactivate customer account for ${c.name}? They will no longer be able to log in or place orders.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await adminApi.updateCustomerStatus(c.id, newStatus);
      if (res.success && res.data) {
        setCustomers((prev) =>
          prev.map((item) => (item.id === c.id ? { ...item, is_active: newStatus } : item))
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update customer status');
    }
  };

  // Metrics summary
  const totalCustomers = customers.length;
  const activeCount = customers.filter((c) => c.is_active).length;
  const inactiveCount = customers.filter((c) => !c.is_active).length;
  const totalLifetimeSpend = customers.reduce((sum, c) => sum + (c.lifetime_spent || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Customer Directory</h2>
          <p className="text-xs text-gray-500">
            Registered commercial accounts, verified WhatsApp contacts, and lifetime purchasing telemetry.
          </p>
        </div>
      </div>

      {/* KPI Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-400">Total Registered</span>
          <p className="text-xl font-black text-gray-900 mt-1">{totalCustomers}</p>
          <span className="text-[10px] text-gray-400">Registered Customers</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-medium text-emerald-600">Active Accounts</span>
          <p className="text-xl font-black text-emerald-700 mt-1">{activeCount}</p>
          <span className="text-[10px] text-emerald-600/80">Can place orders</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-medium text-rose-500">Deactivated</span>
          <p className="text-xl font-black text-rose-700 mt-1">{inactiveCount}</p>
          <span className="text-[10px] text-rose-500/80">Access restricted</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-medium text-blue-600">Total Eligible Spend</span>
          <p className="text-xl font-black text-blue-800 mt-1 font-mono">
            {formatCurrency(totalLifetimeSpend)}
          </p>
          <span className="text-[10px] text-blue-600/80">Verified Customer Revenue</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, username, WhatsApp, or business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All Statuses' },
              { id: 'active', label: 'Active Only' },
              { id: 'inactive', label: 'Deactivated' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Membership Tier & Sorting Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="py-1.5 px-3 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Tiers</option>
              <option value="BRONZE">Bronze</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
              <option value="PLATINUM">Platinum VIP</option>
            </select>

            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split(':');
                setSortBy(f);
                setSortOrder(d as 'ASC' | 'DESC');
              }}
              className="py-1.5 px-3 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="created_at:DESC">Newest Registered</option>
              <option value="created_at:ASC">Oldest Registered</option>
              <option value="lifetime_spent:DESC">Highest Spending</option>
              <option value="lifetime_spent:ASC">Lowest Spending</option>
              <option value="name:ASC">Name (A &rarr; Z)</option>
              <option value="name:DESC">Name (Z &rarr; A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">No matching customer profiles found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-400 font-bold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-3.5">Customer & Handle</th>
                  <th className="py-3 px-3.5">Business / Shop</th>
                  <th className="py-3 px-3.5">WhatsApp / Contact</th>
                  <th className="py-3 px-3.5">Addresses</th>
                  <th className="py-3 px-3.5">Tier</th>
                  <th className="py-3 px-3.5">Lifetime Spend</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Name & Username */}
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={c.profile_photo_url} name={c.name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-extrabold text-gray-900 truncate">{c.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-400 font-mono">
                              @{c.username || 'guest'}
                            </span>
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-100">
                              PW Protected
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Business Name */}
                    <td className="py-3.5 px-3.5 text-gray-600">
                      {c.business_name ? (
                        <span className="font-semibold text-blue-900">{c.business_name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Personal Buyer</span>
                      )}
                    </td>

                    {/* Phone & Email */}
                    <td className="py-3.5 px-3.5">
                      <p className="font-mono text-emerald-700 font-bold flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{c.phone}</span>
                      </p>
                      {c.email && (
                        <p className="text-[11px] text-gray-400 truncate max-w-[160px]" title={c.email}>
                          {c.email}
                        </p>
                      )}
                    </td>

                    {/* Addresses */}
                    <td className="py-3.5 px-3.5 max-w-[180px]">
                      <p className="text-gray-700 truncate text-[11px]" title={`Residential: ${c.residential_address || c.delivery_address || '—'}`}>
                        <span className="text-gray-400">Res:</span> {c.residential_address || c.delivery_address || '—'}
                      </p>
                      {c.delivery_address && c.delivery_address !== c.residential_address && (
                        <p className="text-gray-500 truncate text-[10px]" title={`Delivery: ${c.delivery_address}`}>
                          <span className="text-gray-400">Del:</span> {c.delivery_address}
                        </p>
                      )}
                    </td>

                    {/* Membership Tier */}
                    <td className="py-3.5 px-3.5">
                      <MembershipBadge tier={c.membership_tier} size="xs" />
                    </td>

                    {/* Lifetime Spend */}
                    <td className="py-3.5 px-3.5">
                      <span className="font-extrabold text-gray-900 font-mono">
                        {formatCurrency(c.lifetime_spent || 0)}
                      </span>
                      <span className="block text-[10px] text-blue-600">
                        {c.order_count} order{c.order_count !== 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="py-3.5 px-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                          c.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {c.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{c.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectingCustomer(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                          title="Inspect Customer Dossier"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          <span>Dossier</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingCustomer(c)}
                          className="inline-flex items-center gap-1 p-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Edit Customer Information"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setResettingCustomer(c)}
                          className="inline-flex items-center gap-1 p-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inspect Customer Dossier Modal */}
      <CustomerDetailModal
        isOpen={!!inspectingCustomer}
        onClose={() => setInspectingCustomer(null)}
        customer={inspectingCustomer}
        onCustomerUpdated={(updated) => {
          setCustomers((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
        }}
      />

      {/* Edit Customer Profile Modal */}
      <CustomerEditModal
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        customer={editingCustomer}
        onSuccess={(updated) => {
          setCustomers((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
        }}
      />

      {/* Reset Password Modal */}
      <CustomerResetPasswordModal
        isOpen={!!resettingCustomer}
        onClose={() => setResettingCustomer(null)}
        customer={resettingCustomer}
      />
    </div>
  );
};
