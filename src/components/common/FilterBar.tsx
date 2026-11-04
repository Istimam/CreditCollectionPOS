import React from 'react';
import { Printer, FileSpreadsheet, Eye } from 'lucide-react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import {
  exportDueListToExcel,
  exportPaidInvoicesToExcel,
} from '../../utils/excel';

export const FilterBar: React.FC = () => {
  const { filters, setFilters, activeTab, customers, invoices } = useCreditCollection();

  const handleExcelExport = () => {
    if (activeTab === 'DUE_LIST') {
      exportDueListToExcel(customers);
    } else if (activeTab === 'PAID_INVOICES') {
      exportPaidInvoicesToExcel(invoices);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="bg-white px-6 py-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 print:hidden text-xs">
      {/* Date Filters + Customer Group + Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* From Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">From Date</span>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
            className="border border-gray-300 rounded px-2.5 py-1 text-slate-700 bg-white"
          />
        </div>

        {/* To Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">To Date</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
            className="border border-gray-300 rounded px-2.5 py-1 text-slate-700 bg-white"
          />
        </div>

        {/* Customer Group Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Group:</span>
          <select
            value={filters.customerGroup}
            onChange={(e) => setFilters((prev) => ({ ...prev, customerGroup: e.target.value }))}
            className="border border-gray-300 rounded px-2.5 py-1 bg-white text-slate-800 font-medium"
          >
            <option value="ALL">All Customer Groups</option>
            <option value="Factory Employees">Factory Employees</option>
            <option value="Office Staff">Office Staff</option>
            <option value="Walk-in Credit">Walk-in Credit</option>
          </select>
        </div>

        {/* View Button */}
        <button
          onClick={() => {}}
          className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white font-semibold px-4 py-1 rounded flex items-center gap-1.5 shadow-xs transition"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View</span>
        </button>

        {/* Excel Button */}
        <button
          onClick={handleExcelExport}
          title="Export current table to Excel"
          className="border border-[#2F6FDE] text-[#2F6FDE] hover:bg-blue-50 font-semibold px-3 py-1 rounded flex items-center gap-1.5 transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Excel</span>
        </button>

        {/* PDF Button */}
        <button
          onClick={handlePrintPdf}
          title="Print or Save as PDF"
          className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white font-semibold px-3 py-1 rounded flex items-center gap-1.5 shadow-xs transition"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>PDF</span>
        </button>
      </div>
    </div>
  );
};
