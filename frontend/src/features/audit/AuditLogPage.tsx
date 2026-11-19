import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { AuditLog } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { History, Search, ShieldCheck } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entityFilter, setEntityFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [entityFilter]);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getAuditLogs({
        entity: entityFilter || undefined,
        limit: 50,
      });
      if (res.success && res.data) {
        setLogs(res.data);
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
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">System Audit & Traceability Logs</h2>
          <p className="text-xs text-gray-500">Immutable ledger of administrative mutations, price edits, and status transitions</p>
        </div>
      </div>

      <div className="flex gap-4">
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Entities</option>
          <option value="products">products</option>
          <option value="categories">categories</option>
          <option value="product_stock">product_stock</option>
          <option value="orders">orders</option>
          <option value="purchase_orders">purchase_orders</option>
          <option value="suppliers">suppliers</option>
          <option value="users">users</option>
        </select>
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <History className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">No audit logs recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 font-semibold border-b border-gray-100">
                <tr>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Entity</th>
                  <th className="pb-3">Entity ID</th>
                  <th className="pb-3">Origin IP</th>
                  <th className="pb-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-3 text-gray-400">{formatDate(log.created_at)}</td>
                      <td className="py-3">
                        <span className="font-bold text-gray-900">{log.action}</span>
                      </td>
                      <td className="py-3">
                        <Badge variant="blue">{log.entity_name}</Badge>
                      </td>
                      <td className="py-3 font-mono text-gray-500">{log.entity_id}</td>
                      <td className="py-3 text-gray-400 font-mono">{log.ip_address || '—'}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {expandedLog === log.id ? 'Hide' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={6} className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] font-mono">
                            {log.old_values && (
                              <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <span className="font-bold text-rose-600 block mb-1">Original Values:</span>
                                <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(log.old_values, null, 2)}</pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <span className="font-bold text-emerald-600 block mb-1">Mutated Values:</span>
                                <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(log.new_values, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
