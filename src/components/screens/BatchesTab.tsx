import React, { useState } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { formatCurrency, formatDateDMY } from '../../utils/format';
import { Layers, ChevronDown, ChevronRight, CheckCircle, XCircle, Eye, Download } from 'lucide-react';
import { downloadBulkTemplate } from '../../utils/excel';

export const BatchesTab: React.FC = () => {
  const {
    batches,
    requests,
    navigateTo,
    approveBatch,
    rejectBatch,
    setActiveJournalVoucher,
    vouchers,
    currentUser,
  } = useCreditCollection();

  const [expandedBatchId, setExpandedBatchId] = useState<string | null>('batch-1'); // Expand first by default
  const [rejectingBatchId, setRejectingBatchId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const handleOpenBatchVoucher = (batch: (typeof batches)[0]) => {
    // If voucher exists, view it
    if (batch.voucherNos && batch.voucherNos.length > 0) {
      const v = vouchers.find((voc) => batch.voucherNos.includes(voc.voucherNo));
      if (v) {
        setActiveJournalVoucher(v);
        return;
      }
    }

    // Preview voucher
    const batchRequests = requests.filter(
      (r) => batch.requestIds.includes(r.id) || r.batchNo === batch.batchNo || r.batchId === batch.id
    );

    const drLine = {
      id: `bl-dr-prev-${batch.id}`,
      chartOfAccountNo: batch.glAccountCode,
      chartOfAccountName: batch.glAccountName,
      customerSupplierEmployee: 'Consolidated Batch Receipt',
      remarks: `Batch #${batch.batchNo} settlement`,
      debit: batch.totalAmount,
      credit: 0.0,
    };

    const crLines = batchRequests.map((req, idx) => ({
      id: `bl-cr-prev-${idx}`,
      chartOfAccountNo: '1200',
      chartOfAccountName: `Accounts receivable : ${req.customerName}`,
      customerSupplierEmployee: req.customerName,
      remarks: `Cust: ${req.customerCode} | Req: ${req.requestNo}`,
      debit: 0.0,
      credit: req.amount,
    }));

    const preview = {
      voucherNo: batch.voucherNos?.[0] || `PREVIEW-${batch.batchNo}`,
      voucherDate: batch.collectionDate,
      voucherType: 'Due Receive (Bulk)' as const,
      officeName: currentUser.office || 'FairPrice',
      actionBy: currentUser.name,
      narration: `Bulk Due Receive Batch ${batch.batchNo} ${batch.filterSummary}`,
      remarks: batch.remarks || 'Consolidated bulk credit collection batch',
      lines: [drLine, ...crLines],
      totalDebit: batch.totalAmount,
      totalCredit: batch.totalAmount,
      batchId: batch.id,
    };

    setActiveJournalVoucher(preview);
  };

  const handleConfirmReject = () => {
    if (!rejectingBatchId || !rejectReason.trim()) return;
    rejectBatch(rejectingBatchId, rejectReason.trim());
    setRejectingBatchId(null);
    setRejectReason('');
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden text-xs">
      <div className="p-3 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#2F6FDE]" />
          <span className="font-bold text-slate-800">Bulk Collection Batches ({batches.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadBulkTemplate}
            className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="Download Excel format template"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Excel Format</span>
          </button>
          <button
            onClick={() => navigateTo('POS', 'BULK_WIZARD')}
            className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white px-3.5 py-1 rounded text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <span>+ New Bulk Batch</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        {batches.length === 0 ? (
          <div className="py-12 text-center text-slate-400">No bulk batches created yet.</div>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => {
              const isExpanded = expandedBatchId === batch.id;
              const batchRequests = requests.filter(
                (r) =>
                  batch.requestIds.includes(r.id) ||
                  r.batchNo === batch.batchNo ||
                  r.batchId === batch.id
              );

              return (
                <div
                  key={batch.id}
                  className="border border-slate-200 rounded-lg overflow-hidden shadow-xs bg-white"
                >
                  <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div
                      onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                      className="flex items-center gap-3 cursor-pointer select-none"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenBatchVoucher(batch);
                            }}
                            className="font-mono font-bold text-blue-700 hover:underline text-sm"
                            title="Click to view Batch Accounting Voucher details"
                          >
                            {batch.batchNo}
                          </button>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              batch.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : batch.status === 'Rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {batch.status === 'Approved'
                              ? 'Approved & Posted'
                              : batch.status === 'Rejected'
                              ? 'Rejected'
                              : `Pending (${batch.currentLevel})`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {batch.filterSummary} • Date: {formatDateDMY(batch.collectionDate)}
                          {batch.referenceNo && ` • Ref: ${batch.referenceNo}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-5 text-xs">
                      <div>
                        <span className="text-slate-400">Mode / GL:</span>
                        <span className="ml-1 font-semibold text-slate-800">
                          {batch.mode} ({batch.glAccountCode})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Customers:</span>
                        <span className="ml-1 font-bold text-slate-800">
                          {batchRequests.length || batch.totalCustomers}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Total Amount:</span>
                        <span className="ml-1 font-mono font-bold text-emerald-700 text-sm">
                          ৳ {formatCurrency(batch.totalAmount)}
                        </span>
                      </div>

                      {/* Batch Action Buttons */}
                      <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                        {batch.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => approveBatch(batch.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded flex items-center gap-1 transition shadow-xs"
                              title="Authorize and Post Batch to General Ledger"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingBatchId(batch.id)}
                              className="border border-red-300 text-red-600 hover:bg-red-50 font-bold px-2.5 py-1 rounded flex items-center gap-1 transition"
                              title="Reject Batch"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenBatchVoucher(batch)}
                          className="text-blue-600 hover:bg-blue-50 border border-blue-200 font-bold px-2.5 py-1 rounded flex items-center gap-1 transition"
                          title="View Accounting Voucher"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Voucher</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Batch Requests Details */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                          <span>Customer Requests in this Batch</span>
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-bold">
                            {batchRequests.length} Customer(s)
                          </span>
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Consolidated under JV: <span className="font-mono font-bold text-slate-700">{batch.referenceNo || batch.batchNo}</span>
                        </span>
                      </div>

                      <table className="w-full text-left text-xs border border-slate-200 rounded">
                        <thead className="bg-[#DCEBFA] text-slate-800 font-semibold">
                          <tr>
                            <th className="py-2 px-3">SL</th>
                            <th className="py-2 px-3">Request No</th>
                            <th className="py-2 px-3">Customer Code</th>
                            <th className="py-2 px-3">Customer Name</th>
                            <th className="py-2 px-3">Group</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {batchRequests.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400">
                                No customer requests registered in this batch.
                              </td>
                            </tr>
                          ) : (
                            batchRequests.map((req, rIdx) => (
                              <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2 px-3 text-slate-500 font-medium">{rIdx + 1}</td>
                                <td className="py-2 px-3 font-mono font-bold text-blue-600">
                                  {req.requestNo}
                                </td>
                                <td className="py-2 px-3 font-mono">{req.customerCode}</td>
                                <td className="py-2 px-3 font-semibold text-slate-800">
                                  {req.customerName}
                                </td>
                                <td className="py-2 px-3 text-slate-600">{req.customerGroup}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                  ৳ {formatCurrency(req.amount)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      req.status === 'Approved'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : req.status === 'Rejected'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {req.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {batchRequests.length > 0 && (
                          <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                            <tr>
                              <td colSpan={5} className="py-2 px-3 text-right text-slate-700">
                                Total Batch Allocation:
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-800 text-sm">
                                ৳ {formatCurrency(batch.totalAmount)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Batch Reason Modal */}
      {rejectingBatchId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Reject Bulk Collection Batch</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Please enter the mandatory rejection reason. All customer dues and invoices reserved by this batch will be released.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Discrepancy between payroll deduction sheet and JV balance..."
                className="w-full border border-gray-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingBatchId(null);
                  setRejectReason('');
                }}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className={`px-4 py-1.5 rounded text-xs font-bold transition text-white ${
                  rejectReason.trim()
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
