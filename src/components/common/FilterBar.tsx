import React from 'react';
import { Printer, FileSpreadsheet, Eye } from 'lucide-react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import {
  exportDueListToExcel,
  exportPaidInvoicesToExcel,
  exportHistoryToExcel,
} from '../../utils/excel';

export const FilterBar: React.FC = () => {
  const { filters, setFilters, currentTab, customers, invoices, vouchers } = useCreditCollection();

  const handleExcelExport = () => {
    if (currentTab === 'DUE_LIST') {
      exportDueListToExcel(customers);
    } else if (currentTab === 'PAID_INVOICES') {
      exportPaidInvoicesToExcel(invoices);
    } else if (currentTab === 'COLLECTION_HISTORY') {
      exportHistoryToExcel(vouchers);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="bg-white px-6 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 print:hidden">
      {/* Date Filters + Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* From Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">From Date</span>
          <div className="relative">
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 bg-white"
            />
          </div>
        </div>

        {/* To Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">To Date</span>
          <div className="relative">
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 bg-white"
            />
          </div>
        </div>

        {/* View Button */}
        <button
          onClick={() => {}}
          className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white text-xs font-semibold px-4 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View</span>
        </button>

        {/* Excel Button */}
        <button
          onClick={handleExcelExport}
          title="Export current tab data to Excel"
          className="border border-[#2F6FDE] text-[#2F6FDE] hover:bg-blue-50 text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Excel</span>
        </button>

        {/* PDF Button */}
        <button
          onClick={handlePrintPdf}
          title="Print or Save as PDF"
          className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>PDF</span>
        </button>
      </div>
    </div>
  );
};
