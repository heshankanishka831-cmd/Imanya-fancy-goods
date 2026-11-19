import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { SalesReport } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Printer, Calendar, TrendingUp, ShoppingBag, PackageCheck, Layers } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all'>('weekly');
  const [report, setReport] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [period]);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getSalesReport(period);
      if (res.success && res.data) {
        setReport(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header controls (Hidden during print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Business Reports & PDF Export</h2>
          <p className="text-xs text-gray-500">
            Official sales analytics, bulk wholesale volume, and executive business summaries
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Period selector */}
          <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-xs">
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === 'weekly' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === 'monthly' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Print PDF Button */}
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            <span>Print / Save as PDF</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : !report ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-medium">No sales report data available.</p>
        </div>
      ) : (
        <div className="space-y-6 printable-document bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs print:border-none print:shadow-none print:p-0">
          {/* Official Letterhead Header */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">IMANYA FANCY GOODS</h1>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
                  Import & Wholesale Distribution Management
                </p>
                <p className="text-xs text-gray-600 mt-1">Official Executive Sales & Turnover Statement</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p className="font-semibold text-gray-800 uppercase tracking-wider">
                  Report Period: {report.period.toUpperCase()}
                </p>
                <p className="text-gray-500 mt-0.5">
                  {report.start_date} to {report.end_date}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">Printed on: {formatDate(new Date().toISOString())}</p>
              </div>
            </div>
          </div>

          {/* Metric KPI Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Total Turnover
              </span>
              <p className="text-xl font-extrabold text-blue-700 tracking-tight">
                {formatCurrency(report.total_revenue)}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Total Orders
              </span>
              <p className="text-xl font-extrabold text-slate-900 tracking-tight">{report.total_orders}</p>
              <span className="text-[11px] text-emerald-600 font-medium">
                {report.completed_orders} Completed
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Bulk Units Sold
              </span>
              <p className="text-xl font-extrabold text-slate-900 tracking-tight">{report.total_units_sold}</p>
              <span className="text-[11px] text-slate-500">Wholesale Quantity</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Avg. Order Size
              </span>
              <p className="text-xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(report.average_order)}
              </p>
            </div>
          </div>

          {/* Top Selling Wholesale Products Table */}
          <div className="pt-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span>Top Performing Wholesale Items</span>
            </h3>

            {!report.top_products || report.top_products.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl text-xs text-gray-400">
                No wholesale items sold during this period yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-right">Units Sold</th>
                      <th className="py-2.5 px-3 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {report.top_products.map((tp, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-mono text-gray-500">{tp.sku}</td>
                        <td className="py-2.5 px-3 text-gray-900 font-bold">{tp.product_name}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{tp.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {formatCurrency(tp.total_sales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Daily Breakdown Table */}
          {report.daily_sales && report.daily_sales.length > 0 && (
            <div className="pt-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>Daily Sales Trend</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Orders</th>
                      <th className="py-2.5 px-3 text-right">Daily Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {report.daily_sales.map((ds, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 text-gray-700">{ds.date}</td>
                        <td className="py-2 px-3 text-right text-gray-700">{ds.orders}</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900">
                          {formatCurrency(ds.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Report Footer / Signature Line */}
          <div className="pt-10 mt-10 border-t border-gray-200 flex justify-between items-end text-xs text-gray-500">
            <div>
              <p className="font-semibold text-gray-800">Imanya Fancy Goods</p>
              <p className="text-[11px]">System of Record: PostgreSQL Ledger Database</p>
            </div>
            <div className="text-center w-48">
              <div className="border-b border-gray-400 mb-1"></div>
              <p className="text-[11px] font-semibold text-gray-700">Authorized Signature</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
