import React, { useState } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { formatCurrency, formatDateDMY } from '../../utils/format';
import { generateSingleDueReceiveVoucher } from '../../utils/domain';
import { Search, Eye, AlertTriangle } from 'lucide-react';

export const RequestsTab: React.FC = () => {
  const { requests, setActiveJournalVoucher, vouchers, currentUser } =
    useCreditCollection();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.requestNo.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.customerCode.toLowerCase().includes(q) ||
      r.createdBy.toLowerCase().includes(q) ||
      r.glAccountName.toLowerCase().includes(q)
    );
  });

  const handleOpenVoucher = (req: (typeof requests)[0]) => {
    if (req.voucherNo) {
      const v = vouchers.find((voc) => voc.voucherNo === req.voucherNo);
      if (v) {
        setActiveJournalVoucher(v);
        return;
      }
    }
    const preview = generateSingleDueReceiveVoucher(
      req,
      req.voucherNo || `PREVIEW-${req.requestNo}`,
      currentUser.office
    );
    setActiveJournalVoucher(preview);
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden text-xs">
      {/* Filter Row */}
      <div className="p-3 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-gray-300 rounded px-2.5 py-1 bg-white text-slate-800 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending Approval</option>
            <option value="Approved">Approved & Posted</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search request #, customer, requester..."
            className="pl-8 pr-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-60"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[calc(100vh-14rem)]">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead className="sticky top-0 bg-[#DCEBFA] text-slate-800 font-semibold border-b border-[#cbdff4]">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center">SL</th>
              <th className="py-2.5 px-3">Request No</th>
              <th className="py-2.5 px-3">Request Date</th>
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Mode</th>
              <th className="py-2.5 px-3">GL Account</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Level</th>
              <th className="py-2.5 px-3">Requested By</th>
              <th className="py-2.5 px-3 text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-slate-700">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-400">
                  No collection requests found.
                </td>
              </tr>
            ) : (
              filteredRequests.map((req, idx) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#2F6FDE]">
                    <button
                      type="button"
                      onClick={() => handleOpenVoucher(req)}
                      className="hover:underline flex items-center gap-1"
                    >
                      <span>{req.requestNo}</span>
                      {req.isStale && (
                        <span title="Stale Invoice detected" className="text-amber-600">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{formatDateDMY(req.requestDate)}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-800">{req.customerName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{req.customerCode}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {req.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                        req.mode === 'Mode B'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {req.mode}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 truncate max-w-xs">{req.glAccountName}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                    ৳ {formatCurrency(req.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'Pending'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold font-mono text-[11px] text-slate-600">
                    {req.status === 'Approved' ? 'Done' : `${req.currentLevel}/${req.requiredLevels}`}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-medium">{req.createdBy}</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenVoucher(req)}
                      className="p-1 rounded text-blue-600 hover:bg-blue-50"
                      title="View Accounting Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
