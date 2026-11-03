import React, { useState } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { formatCurrency, formatDateDMY } from '../../utils/format';
import { History, ChevronDown, ChevronUp, Receipt, CheckCircle } from 'lucide-react';

export const CollectionHistoryTab: React.FC = () => {
  const { vouchers, filters } = useCreditCollection();
  const [expandedVoucherNo, setExpandedVoucherNo] = useState<string | null>(null);

  const filteredVouchers = vouchers.filter((v) => {
    const q = filters.searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      v.voucherNo.toLowerCase().includes(q) ||
      v.customerName.toLowerCase().includes(q) ||
      v.customerCode.toLowerCase().includes(q) ||
      v.customerMobile.includes(q)
    );
  });

  const totalCollectedSum = filteredVouchers.reduce((sum, v) => sum + v.totalCollected, 0);

  const toggleExpand = (voucherNo: string) => {
    setExpandedVoucherNo(expandedVoucherNo === voucherNo ? null : voucherNo);
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[calc(100vh-14rem)]">
        <table className="w-full text-left border-collapse min-w-[1200px] text-xs">
          <thead className="sticky top-0 bg-[#DCEBFA] text-slate-800 font-semibold z-10 border-b border-[#cbdff4]">
            <tr>
              <th className="py-2.5 px-3 text-center w-12 font-semibold">SL</th>
              <th className="py-2.5 px-3 font-semibold">Voucher No</th>
              <th className="py-2.5 px-3 font-semibold">Date</th>
              <th className="py-2.5 px-3 font-semibold">Customer</th>
              <th className="py-2.5 px-3 font-semibold">Mobile No</th>
              <th className="py-2.5 px-3 text-right font-semibold">Total Collected</th>
              <th className="py-2.5 px-3 font-semibold">Payment Methods</th>
              <th className="py-2.5 px-3 text-center font-semibold">Invoices Affected</th>
              <th className="py-2.5 px-3 font-semibold">Created By</th>
              <th className="py-2.5 px-3 text-center font-semibold">Detail</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-slate-700">
            {filteredVouchers.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <History className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-500">
                      {filters.searchQuery
                        ? `No collection vouchers matching "${filters.searchQuery}"`
                        : 'No collection vouchers recorded yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredVouchers.map((voucher, index) => {
                const isExpanded = expandedVoucherNo === voucher.voucherNo;

                return (
                  <React.Fragment key={voucher.voucherNo}>
                    <tr
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-blue-50/60' : ''
                      }`}
                      onClick={() => toggleExpand(voucher.voucherNo)}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                        {index + 1}
                      </td>

                      {/* Voucher No */}
                      <td className="py-2.5 px-3 font-mono font-bold text-[#2F6FDE] flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-blue-500" />
                        <span>{voucher.voucherNo}</span>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-slate-600">
                        {formatDateDMY(voucher.date)}
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        <div>{voucher.customerName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{voucher.customerCode}</div>
                      </td>

                      {/* Mobile */}
                      <td className="py-2.5 px-3 text-slate-600 font-mono">
                        {voucher.customerMobile}
                      </td>

                      {/* Total Collected */}
                      <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                        ৳ {formatCurrency(voucher.totalCollected)}
                      </td>

                      {/* Methods */}
                      <td className="py-2.5 px-3 text-slate-600">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                          {voucher.methodsSummary}
                        </span>
                      </td>

                      {/* Invoices Count */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {voucher.invoicesAffected.length} inv
                        </span>
                      </td>

                      {/* Created By */}
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {voucher.createdBy}
                      </td>

                      {/* Expand Toggle */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(voucher.voucherNo);
                          }}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500 transition"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-blue-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Drawer Row with Invoices breakdown */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={11} className="p-4 pl-12 border-b border-blue-100">
                          <div className="bg-white rounded border border-blue-100 p-3 shadow-xs">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Invoices Settled by Voucher {voucher.voucherNo}</span>
                              </div>
                              {voucher.remarks && (
                                <div className="text-xs text-slate-500 italic">
                                  Remarks: {voucher.remarks}
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {voucher.invoicesAffected.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 rounded bg-blue-50/40 border border-blue-100 text-xs"
                                >
                                  <div className="flex justify-between font-mono font-semibold text-slate-800">
                                    <span>#{item.invoiceNo}</span>
                                    <span className="text-emerald-700">
                                      +৳{formatCurrency(item.amountCollected)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                                    <span>Inv Date: {formatDateDMY(item.invoiceDate)}</span>
                                    <span>
                                      Remaining Due: ৳{formatCurrency(item.remainingDue)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {filteredVouchers.length > 0 && (
            <tfoot className="sticky bottom-0 bg-[#F0F5FC] text-slate-800 font-bold border-t-2 border-[#cbdff4] z-10 shadow-inner">
              <tr>
                <td colSpan={5} className="py-2.5 px-3 text-right font-bold uppercase tracking-wider text-slate-700">
                  Total Collected ({filteredVouchers.length} Vouchers):
                </td>
                <td className="py-2.5 px-3 text-right font-black text-emerald-800 text-[13px]">
                  ৳ {formatCurrency(totalCollectedSum)}
                </td>
                <td colSpan={5}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="px-6 py-2 bg-slate-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-slate-500">
        <div>Showing {filteredVouchers.length} collection vouchers.</div>
        <div>Click any voucher row to toggle detailed breakdown of invoices settled.</div>
      </div>
    </div>
  );
};
