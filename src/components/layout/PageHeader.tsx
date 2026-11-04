import React from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { Plus, Search, BookOpen, Layers } from 'lucide-react';

export const PageHeader: React.FC = () => {
  const { filters, setFilters, navigateTo, setIsInvoiceWiseModalOpen } = useCreditCollection();

  return (
    <div className="bg-white px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Credit Collection</h1>
        <span className="text-xs text-slate-400 hidden sm:inline">
          (Customer Credit Due Collection &amp; Approval)
        </span>
      </div>

      {/* Right Controls: Search + Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search input beside buttons */}
        <div className="relative w-56 sm:w-60">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Search customer, code, mobile..."
            className="w-full pl-3 pr-8 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 bg-white"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Action Button 1: + Single Collection */}
        <button
          onClick={() => setIsInvoiceWiseModalOpen(true)}
          className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Single Collection</span>
        </button>

        {/* Action Button 2: + Bulk Collection */}
        <button
          onClick={() => navigateTo('POS', 'BULK_WIZARD')}
          className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-xs transition"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>+ Bulk Collection</span>
        </button>

        {/* Action Button 3: AR Ledger Report */}
        <button
          onClick={() => navigateTo('POS', 'AR_LEDGER')}
          className="border border-[#2F6FDE] text-[#2F6FDE] hover:bg-blue-50 text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition"
          title="View Accounts Receivable General Ledger audit report"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>AR Ledger</span>
        </button>
      </div>
    </div>
  );
};
