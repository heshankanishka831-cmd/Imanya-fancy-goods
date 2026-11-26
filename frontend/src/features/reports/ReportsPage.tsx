import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../services/endpoints';
import { SalesReport, ProductAdmin, Supplier, PurchaseOrder } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Printer, Calendar, TrendingUp, ShoppingBag, PackageCheck, Layers, Boxes, Truck, FileSpreadsheet } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'procurement'>('sales');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all'>('weekly');
  const [report, setReport] = useState<SalesReport | null>(null);
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [reportType, period]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (reportType === 'sales') {
        const res = await adminApi.getSalesReport(period);
        if (res.success && res.data) {
          setReport(res.data);
        }
      } else if (reportType === 'inventory') {
        const res = await adminApi.getProducts({ limit: 200 });
        if (res.success && res.data) {
          setProducts(res.data);
        }
      } else if (reportType === 'procurement') {
        const [supRes, poRes] = await Promise.all([
          adminApi.getSuppliers({ limit: 100 }),
          adminApi.getPurchaseOrders({ limit: 100 }),
        ]);
        if (supRes.data) setSuppliers(supRes.data);
        if (poRes.data) setPOs(poRes.data);
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

  // Inventory valuation aggregates
  const invTotalCost = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.current_stock || 0) * (p.cost_price || 0), 0);
  }, [products]);

  const invTotalRetail = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.current_stock || 0) * (p.selling_price || 0), 0);
  }, [products]);

  const invTotalUnits = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.current_stock || 0), 0);
  }, [products]);

  // Procurement aggregates
  const poTotalSpend = useMemo(() => {
    return pos.reduce((acc, po) => acc + (po.total_amount || 0), 0);
  }, [pos]);

  return (
    <div className="space-y-6">
      {/* Header controls (Hidden during print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Business Reports & PDF Export</h2>
          <p className="text-xs text-gray-500">
            Official sales analytics, warehouse inventory valuations, and supplier procurement statements
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Report Category Selector */}
          <div className="flex bg-gray-100 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setReportType('sales')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                reportType === 'sales' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Sales</span>
            </button>
            <button
              onClick={() => setReportType('inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                reportType === 'inventory' ? 'bg-white text-purple-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>Inventory</span>
            </button>
            <button
              onClick={() => setReportType('procurement')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                reportType === 'procurement' ? 'bg-white text-rose-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              <span>Procurement</span>
            </button>
          </div>

          {/* Period selector (Sales only) */}
          {reportType === 'sales' && (
            <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-xs">
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === 'weekly' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === 'monthly' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Time
              </button>
            </div>
          )}

          {/* Print PDF Button */}
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            <span>Print / Save as PDF</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : reportType === 'sales' ? (
        /* SALES REPORT VIEW */
        !report ? (
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
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">IMANYA FANCY GOODS (PVT) LTD</h1>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
                    Import & Distribution Management
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
                <span className="text-[11px] text-slate-500">Sales Quantity</span>
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

            {/* Top Selling Products Table */}
            <div className="pt-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span>Top Performing Ordered Items</span>
              </h3>

              {!report.top_products || report.top_products.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl text-xs text-gray-400">
                  No ordered items sold during this period yet.
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
                <p className="font-semibold text-gray-800">Imanya Fancy Goods (Pvt) Ltd</p>
                <p className="text-[11px]">System of Record: PostgreSQL Ledger Database</p>
              </div>
              <div className="text-center w-48">
                <div className="border-b border-gray-400 mb-1"></div>
                <p className="text-[11px] font-semibold text-gray-700">Authorized Signature</p>
              </div>
            </div>
          </div>
        )
      ) : reportType === 'inventory' ? (
        /* INVENTORY VALUATION REPORT VIEW */
        <div className="space-y-6 printable-document bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs print:border-none print:shadow-none print:p-0">
          {/* Official Letterhead Header */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">IMANYA FANCY GOODS (PVT) LTD</h1>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
                  Import & Distribution Management
                </p>
                <p className="text-xs text-gray-600 mt-1">Official Warehouse Inventory Valuation Statement</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p className="font-semibold text-gray-800 uppercase tracking-wider">
                  Report: Physical Asset Valuation
                </p>
                <p className="text-gray-500 mt-0.5">Active Catalog SKUs: {products.length}</p>
                <p className="text-[11px] text-gray-400 mt-1">Printed on: {formatDate(new Date().toISOString())}</p>
              </div>
            </div>
          </div>

          {/* Metric KPI Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Cost Valuation
              </span>
              <p className="text-xl font-extrabold text-purple-700 tracking-tight">
                {formatCurrency(invTotalCost)}
              </p>
              <span className="text-[10px] text-gray-500">Asset Value at Cost</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Stock Valuation
              </span>
              <p className="text-xl font-extrabold text-blue-700 tracking-tight">
                {formatCurrency(invTotalRetail)}
              </p>
              <span className="text-[10px] text-gray-500">Potential Gross Sales</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Gross Margin Spread
              </span>
              <p className="text-xl font-extrabold text-emerald-700 tracking-tight">
                {formatCurrency(Math.max(0, invTotalRetail - invTotalCost))}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold">Estimated Gross Profit</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Physical Units In Stock
              </span>
              <p className="text-xl font-extrabold text-slate-900 tracking-tight">{invTotalUnits}</p>
              <span className="text-[10px] text-gray-500">Warehouse Piece Count</span>
            </div>
          </div>

          {/* Itemized Stock Table */}
          <div className="pt-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Boxes className="h-4 w-4 text-purple-600" />
              <span>SKU Stock Valuation Breakdown</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Cost Price</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Units</th>
                    <th className="py-2.5 px-3 text-right">Total Cost Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {products.map((p) => {
                    const itemCostValue = (p.current_stock || 0) * (p.cost_price || 0);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 font-mono text-gray-500">{p.sku}</td>
                        <td className="py-2 px-3 font-bold text-gray-900">{p.name}</td>
                        <td className="py-2 px-3 text-gray-600">{p.category_name}</td>
                        <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(p.cost_price)}</td>
                        <td className="py-2 px-3 text-right font-bold text-blue-600">{formatCurrency(p.selling_price)}</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900">{p.current_stock}</td>
                        <td className="py-2 px-3 text-right font-extrabold text-gray-900">
                          {formatCurrency(itemCostValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report Footer / Signature Line */}
          <div className="pt-10 mt-10 border-t border-gray-200 flex justify-between items-end text-xs text-gray-500">
            <div>
              <p className="font-semibold text-gray-800">Imanya Fancy Goods (Pvt) Ltd</p>
              <p className="text-[11px]">System of Record: PostgreSQL Ledger Database</p>
            </div>
            <div className="text-center w-48">
              <div className="border-b border-gray-400 mb-1"></div>
              <p className="text-[11px] font-semibold text-gray-700">Authorized Signature</p>
            </div>
          </div>
        </div>
      ) : (
        /* SUPPLIER PROCUREMENT REPORT VIEW */
        <div className="space-y-6 printable-document bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs print:border-none print:shadow-none print:p-0">
          {/* Official Letterhead Header */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">IMANYA FANCY GOODS (PVT) LTD</h1>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
                  Import & Distribution Management
                </p>
                <p className="text-xs text-gray-600 mt-1">Official Supplier Procurement & Spend Statement</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p className="font-semibold text-gray-800 uppercase tracking-wider">
                  Report: Procurement Channels
                </p>
                <p className="text-gray-500 mt-0.5">Total Suppliers: {suppliers.length}</p>
                <p className="text-[11px] text-gray-400 mt-1">Printed on: {formatDate(new Date().toISOString())}</p>
              </div>
            </div>
          </div>

          {/* Metric KPI Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Total Procurement Spend
              </span>
              <p className="text-xl font-extrabold text-rose-700 tracking-tight">
                {formatCurrency(poTotalSpend)}
              </p>
              <span className="text-[10px] text-gray-500">Aggregate PO value issued</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Purchase Orders Placed
              </span>
              <p className="text-xl font-extrabold text-slate-900 tracking-tight">{pos.length}</p>
              <span className="text-[10px] text-gray-500">Import & local POs</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Active Supplier Channels
              </span>
              <p className="text-xl font-extrabold text-slate-900 tracking-tight">
                {suppliers.filter((s) => s.is_active).length}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold">Registered overseas & local</span>
            </div>
          </div>

          {/* Supplier PO Breakdown Table */}
          <div className="pt-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Truck className="h-4 w-4 text-rose-600" />
              <span>Purchase Orders Issued by Supplier</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">PO Number</th>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Expected Date</th>
                    <th className="py-2.5 px-3 text-right">PO Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {pos.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50/50">
                      <td className="py-2 px-3 font-mono font-bold text-gray-900">{po.po_number}</td>
                      <td className="py-2 px-3 text-gray-800">{po.supplier_name}</td>
                      <td className="py-2 px-3">
                        <Badge status={po.status} />
                      </td>
                      <td className="py-2 px-3 text-gray-500">{po.expected_delivery_date || '—'}</td>
                      <td className="py-2 px-3 text-right font-extrabold text-gray-900">
                        {formatCurrency(po.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report Footer / Signature Line */}
          <div className="pt-10 mt-10 border-t border-gray-200 flex justify-between items-end text-xs text-gray-500">
            <div>
              <p className="font-semibold text-gray-800">Imanya Fancy Goods (Pvt) Ltd</p>
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
