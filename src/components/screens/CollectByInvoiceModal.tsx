import React, { useState } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { formatCurrency, formatDateDMY } from '../../utils/format';
import { X, Search, FileText, ArrowRight } from 'lucide-react';

export const CollectByInvoiceModal: React.FC = () => {
  const {
    isInvoiceWiseModalOpen,
    setIsInvoiceWiseModalOpen,
    invoices,
    customers,
    setSelectedCustomer,
  } = useCreditCollection();

  const [searchQuery, setSearchQuery] = useState('');

  if (!isInvoiceWiseModalOpen) return null;

  // Invoices with outstanding dues
  const dueInvoices = invoices.filter((inv) => inv.dueAmount > 0);

  const filteredInvoices = dueInvoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.customerCode.toLowerCase().includes(q) ||
      (inv.returnInvoices &&
        inv.returnInvoices.some((r) => r.returnInvoiceNo.toLowerCase().includes(q)))
    );
  });

  const handleSelectInvoice = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setSelectedCustomer(cust);
      setIsInvoiceWiseModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 print:hidden">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#2F6FDE] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                Collect Dues By Specific Invoice
              </h3>
              <p className="text-[11px] text-slate-500">
                Search and select any outstanding invoice to open its payment screen directly.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsInvoiceWiseModalOpen(false)}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type min 3 letters to search invoice #, customer name, code..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Invoices List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-slate-200 rounded-lg">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching due invoices found.
            </div>
          ) : (
            filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => handleSelectInvoice(inv.customerId)}
                className="p-3 hover:bg-blue-50/50 cursor-pointer flex items-center justify-between transition group"
              >
                <div>
                  <div className="font-mono font-bold text-xs text-[#2F6FDE] group-hover:underline flex items-center gap-2">
                    <span>#{inv.invoiceNo}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal font-sans">
                      Date: {formatDateDMY(inv.invoiceDate)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 font-medium mt-0.5">
                    {inv.customerName} ({inv.customerCode})
                  </div>
                </div>

                <div className="text-right flex items-center gap-4">
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Due Amount</div>
                    <div className="text-xs font-bold text-red-600">
                      ৳ {formatCurrency(inv.dueAmount)}
                    </div>
                  </div>

                  <button className="w-7 h-7 rounded-full bg-blue-50 group-hover:bg-[#2F6FDE] text-blue-600 group-hover:text-white flex items-center justify-center transition">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => setIsInvoiceWiseModalOpen(false)}
            className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
