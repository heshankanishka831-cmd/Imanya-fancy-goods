import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { Customer } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Users, Search, ShoppingBag } from 'lucide-react';

export const CustomerListPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getCustomers({ search: search || undefined });
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Wholesale Customers</h2>
          <p className="text-xs text-gray-500">Directory of retail clients, buyers, and order frequency</p>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">No customer profiles found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 font-semibold border-b border-gray-100">
                <tr>
                  <th className="pb-3">Customer Name</th>
                  <th className="pb-3">Business / Trading Name</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Destination Address</th>
                  <th className="pb-3">Total Orders</th>
                  <th className="pb-3">Registered Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 font-bold text-gray-900">{c.name}</td>
                    <td className="py-3.5 text-gray-600">{c.business_name || '—'}</td>
                    <td className="py-3.5 font-mono">{c.phone}</td>
                    <td className="py-3.5 text-gray-500">{c.email || '—'}</td>
                    <td className="py-3.5 text-gray-600 max-w-xs truncate">{c.delivery_address || '—'}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                        <ShoppingBag className="h-3 w-3" />
                        {c.order_count}
                      </span>
                    </td>
                    <td className="py-3.5 text-gray-400">{formatDate(c.created_at).split(',')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
