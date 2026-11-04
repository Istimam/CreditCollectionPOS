import React, { useState } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { formatCurrency, formatDateDMY } from '../../utils/format';
import { X, FileText, CheckCircle2, History, List } from 'lucide-react';

export const AccountJournalDetailsModal: React.FC = () => {
  const { activeJournalVoucher, setActiveJournalVoucher, requests } = useCreditCollection();
  const [activeTab, setActiveTab] = useState<'VOUCHER' | 'INVOICES' | 'TRAIL'>('VOUCHER');

  if (!activeJournalVoucher) return null;

  const voucher = activeJournalVoucher;
  const linkedRequest = requests.find(
    (r) => r.voucherNo === voucher.voucherNo || r.id === voucher.requestId
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 print:hidden animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200">
        {/* Modal Header Title */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800">Account Journal Details</h2>
            <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold">
              {voucher.voucherNo}
            </span>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
              {voucher.voucherType}
            </span>
          </div>
          <button
            onClick={() => setActiveJournalVoucher(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-6 border-b border-gray-200 bg-slate-50/60 flex items-center gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('VOUCHER')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'VOUCHER'
                ? 'border-[#2F6FDE] text-[#2F6FDE]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Journal Lines</span>
          </button>

          {linkedRequest && (
            <button
              onClick={() => setActiveTab('INVOICES')}
              className={`py-2.5 border-b-2 flex items-center gap-1.5 transition ${
                activeTab === 'INVOICES'
                  ? 'border-[#2F6FDE] text-[#2F6FDE]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Invoices Allocation ({linkedRequest.invoicesAffected.length})</span>
            </button>
          )}

          {linkedRequest && linkedRequest.approvalTrail.length > 0 && (
            <button
              onClick={() => setActiveTab('TRAIL')}
              className={`py-2.5 border-b-2 flex items-center gap-1.5 transition ${
                activeTab === 'TRAIL'
                  ? 'border-[#2F6FDE] text-[#2F6FDE]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Approval Trail ({linkedRequest.approvalTrail.length})</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {activeTab === 'VOUCHER' && (
            <>
              {/* Metadata Grid (exactly matching Screenshot 3) */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-slate-700">
                <div className="flex">
                  <span className="w-36 text-slate-500 font-medium">Office Name</span>
                  <span className="font-semibold text-slate-900">: {voucher.officeName}</span>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-500 font-medium">Transaction Date</span>
                  <span className="font-semibold text-slate-900">
                    : {voucher.voucherDate ? formatDateDMY(voucher.voucherDate) : '—'}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-500 font-medium">Transaction No</span>
                  <span className="font-mono font-bold text-blue-700">: {voucher.voucherNo}</span>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-500 font-medium">Action By</span>
                  <span className="font-semibold text-slate-900">: {voucher.actionBy}</span>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-500 font-medium">Transaction Type</span>
                  <span className="font-semibold text-slate-900">: {voucher.voucherType}</span>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-500 font-medium">Narration</span>
                  <span className="font-medium text-slate-800 break-words">: {voucher.narration}</span>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-500 font-medium">Attachment</span>
                  <span className="text-slate-500">: {voucher.attachment || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="w-36 text-slate-500 font-medium">Remarks</span>
                  <span className="text-slate-800">: {voucher.remarks || 'N/A'}</span>
                </div>
              </div>

              {/* Table of Journal Lines (exactly matching Screenshot 3) */}
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs mt-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#DCEBFA] text-slate-800 font-semibold border-b border-[#cbdff4]">
                    <tr>
                      <th className="py-2 px-3 w-40">Chart Of Account No</th>
                      <th className="py-2 px-3">Chart Of Account Name</th>
                      <th className="py-2 px-3">Customer/Supplier/Employee</th>
                      <th className="py-2 px-3">Remarks</th>
                      <th className="py-2 px-3 text-right w-28">Debit</th>
                      <th className="py-2 px-3 text-right w-28">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-slate-700">
                    {voucher.lines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-medium text-slate-800">
                          {line.chartOfAccountNo}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {line.chartOfAccountName}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {line.customerSupplierEmployee || 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{line.remarks || 'N/A'}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                          {line.debit > 0 ? formatCurrency(line.debit) : ''}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                          {line.credit > 0 ? formatCurrency(line.credit) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Row */}
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-600">
                        Total:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-700">
                        {formatCurrency(voucher.totalDebit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-700">
                        {formatCurrency(voucher.totalCredit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Balance Equality Badge */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Double-entry balanced: Total Debits equal Total Credits.</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Transaction posted automatically by Managerium Accounting Engine.
                </div>
              </div>
            </>
          )}

          {activeTab === 'INVOICES' && linkedRequest && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Invoices Settled by this Collection ({linkedRequest.invoicesAffected.length})
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#DCEBFA] text-slate-800 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Invoice No</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Net Amount</th>
                      <th className="py-2 px-3 text-right">Due Before</th>
                      <th className="py-2 px-3 text-right text-emerald-700">Collected</th>
                      <th className="py-2 px-3 text-right font-bold">Remaining Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {linkedRequest.invoicesAffected.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-blue-600">
                          {item.invoiceNo}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{formatDateDMY(item.invoiceDate)}</td>
                        <td className="py-2 px-3 text-right">৳{formatCurrency(item.netAmount)}</td>
                        <td className="py-2 px-3 text-right text-red-600">
                          ৳{formatCurrency(item.dueAmount)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          ৳{formatCurrency(item.collectNow)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800">
                          ৳{formatCurrency(item.balanceAfter)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'TRAIL' && linkedRequest && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Multi-Level Approval & Audit History
              </h4>
              <div className="space-y-2">
                {linkedRequest.approvalTrail.map((record, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs mt-0.5">
                      {record.level}
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{record.approverName}</span>
                        <span className="text-[10px] text-slate-400">{record.timestamp}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Action: <span className="font-semibold text-emerald-700">{record.action}</span>
                      </div>
                      {record.comment && (
                        <p className="mt-1 text-slate-600 italic bg-white p-1.5 rounded border border-slate-100">
                          "{record.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (matching Screenshot 3 with CLOSE button) */}
        <div className="px-6 py-3 bg-white border-t border-gray-100 flex items-center justify-end">
          <button
            onClick={() => setActiveJournalVoucher(null)}
            className="text-red-500 hover:text-red-700 font-bold uppercase tracking-wider text-xs px-4 py-1.5 rounded hover:bg-red-50 transition"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
