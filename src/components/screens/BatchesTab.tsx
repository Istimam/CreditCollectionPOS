import React, { useState } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { formatCurrency } from '../../utils/format';
import { Layers, ChevronDown, ChevronRight } from 'lucide-react';

export const BatchesTab: React.FC = () => {
  const { batches, requests, navigateTo } = useCreditCollection();
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden text-xs">
      <div className="p-3 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#2F6FDE]" />
          <span className="font-bold text-slate-800">Bulk Collection Batches ({batches.length})</span>
        </div>
        <button
          onClick={() => navigateTo('POS', 'BULK_WIZARD')}
          className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white px-3 py-1 rounded text-xs font-bold transition shadow-xs"
        >
          + New Bulk Batch
        </button>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        {batches.length === 0 ? (
          <div className="py-12 text-center text-slate-400">No bulk batches created yet.</div>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => {
              const isExpanded = expandedBatchId === batch.id;
              const batchRequests = requests.filter((r) => r.batchId === batch.id);

              return (
                <div
                  key={batch.id}
                  className="border border-slate-200 rounded-lg overflow-hidden shadow-xs bg-white"
                >
                  <div
                    onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex flex-wrap items-center justify-between gap-4 transition"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700">{batch.batchNo}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              batch.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {batch.status} ({batch.currentLevel})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{batch.filterSummary}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <span className="text-slate-400">Mode / GL:</span>
                        <span className="ml-1 font-semibold text-slate-800">
                          {batch.mode} ({batch.glAccountCode})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Customers:</span>
                        <span className="ml-1 font-semibold text-slate-800">
                          {batch.totalCustomers}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Total Amount:</span>
                        <span className="ml-1 font-mono font-bold text-emerald-700 text-sm">
                          ৳ {formatCurrency(batch.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Batch Requests Details */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                      <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                        Customer Requests in this Batch ({batchRequests.length})
                      </h4>
                      <table className="w-full text-left text-xs border border-slate-200 rounded">
                        <thead className="bg-[#DCEBFA] text-slate-800 font-semibold">
                          <tr>
                            <th className="py-2 px-3">Request No</th>
                            <th className="py-2 px-3">Customer Code</th>
                            <th className="py-2 px-3">Customer Name</th>
                            <th className="py-2 px-3">Group</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {batchRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono font-bold text-blue-600">
                                {req.requestNo}
                              </td>
                              <td className="py-2 px-3 font-mono">{req.customerCode}</td>
                              <td className="py-2 px-3 font-medium text-slate-800">
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
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
