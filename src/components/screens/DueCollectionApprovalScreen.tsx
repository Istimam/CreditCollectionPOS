import React, { useState, useMemo } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { formatCurrency, formatDateDMY } from '../../utils/format';
import { generateSingleDueReceiveVoucher } from '../../utils/domain';
import {
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
} from 'lucide-react';

export const DueCollectionApprovalScreen: React.FC = () => {
  const {
    requests,
    approveRequest,
    bulkApproveRequests,
    setRejectDialogRequest,
    setActiveJournalVoucher,
    navigateTo,
    currentUser,
    vouchers,
  } = useCreditCollection();

  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'ALL'>('Pending');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Single' | 'Bulk'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        r.requestNo.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerCode.toLowerCase().includes(q) ||
        r.createdBy.toLowerCase().includes(q) ||
        r.glAccountName.toLowerCase().includes(q) ||
        r.narration.toLowerCase().includes(q)
      );
    });
  }, [requests, statusFilter, typeFilter, searchQuery]);

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredRequests.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Preview or View Voucher
  const handleOpenVoucherModal = (req: (typeof requests)[0]) => {
    if (req.voucherNo) {
      const existing = vouchers.find((v) => v.voucherNo === req.voucherNo);
      if (existing) {
        setActiveJournalVoucher(existing);
        return;
      }
    }

    // Generate Accounting Preview Modal (the exact voucher that WILL post on approval)
    const previewVoucher = generateSingleDueReceiveVoucher(
      req,
      req.voucherNo || `PREVIEW-${req.requestNo}`,
      currentUser.office
    );
    setActiveJournalVoucher(previewVoucher);
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    bulkApproveRequests(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen text-slate-800">
      {/* Top Header matching Screenshot 2 */}
      <div className="border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-14 z-20 bg-white shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('APPROVAL', 'APPROVAL_DASHBOARD')}
            className="p-1 rounded hover:bg-slate-100 text-slate-600 transition"
            title="Back to Approval Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Due Collection Approval
          </h1>
          <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
            {filteredRequests.length} record(s)
          </span>
        </div>

        {/* Right Action Controls: Search & Bulk Approve/Reject Buttons */}
        <div className="flex items-center gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
            />
          </div>

          {/* Outlined Buttons matching Screenshot 2 */}
          <button
            onClick={handleBulkApprove}
            disabled={selectedIds.length === 0}
            className={`px-4 py-1.5 rounded text-xs font-bold border transition ${
              selectedIds.length > 0
                ? 'border-[#2F6FDE] text-[#2F6FDE] hover:bg-blue-50 bg-white shadow-xs cursor-pointer'
                : 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
            }`}
          >
            Approve {selectedIds.length > 0 && `(${selectedIds.length})`}
          </button>

          <button
            onClick={() => {
              if (selectedIds.length > 0) {
                const target = requests.find((r) => r.id === selectedIds[0]);
                if (target) setRejectDialogRequest(target);
              }
            }}
            disabled={selectedIds.length === 0}
            className={`px-4 py-1.5 rounded text-xs font-bold border transition ${
              selectedIds.length > 0
                ? 'border-red-400 text-red-600 hover:bg-red-50 bg-white shadow-xs cursor-pointer'
                : 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
            }`}
          >
            Reject
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="px-6 py-2.5 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-gray-300 rounded px-2.5 py-1 bg-white text-slate-800 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Pending">Pending Approval</option>
              <option value="Approved">Approved & Posted</option>
              <option value="Rejected">Rejected</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="border border-gray-300 rounded px-2.5 py-1 bg-white text-slate-800 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="Single">Single Collection</option>
              <option value="Bulk">Bulk Batch</option>
            </select>
          </div>
        </div>

        {/* Approver role indicator */}
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <span>Logged in as:</span>
          <span className="font-bold text-slate-700">{currentUser.name}</span>
          <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono font-semibold">
            {currentUser.level || currentUser.role}
          </span>
          {currentUser.role === 'Collector' && (
            <span className="text-amber-600 font-medium ml-1">
              (Maker cannot approve own requests)
            </span>
          )}
        </div>
      </div>

      {/* Table matching Screenshot 2 */}
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[calc(100vh-14rem)]">
        <table className="w-full text-left border-collapse min-w-[1500px] text-xs">
          <thead className="sticky top-0 bg-[#DCEBFA] text-slate-800 font-semibold z-10 border-b border-[#cbdff4]">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    filteredRequests.length > 0 &&
                    selectedIds.length === filteredRequests.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded text-[#2F6FDE] focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-2 text-center w-10">Sl.</th>
              <th className="py-2.5 px-3">Create Date</th>
              <th className="py-2.5 px-3">Trans. Date</th>
              <th className="py-2.5 px-3">Trans. No.</th>
              <th className="py-2.5 px-3">Office Name</th>
              <th className="py-2.5 px-3">Trans. Type</th>
              <th className="py-2.5 px-3">Customer / Group</th>
              <th className="py-2.5 px-3">Mode / Account</th>
              <th className="py-2.5 px-3 text-right">Debit</th>
              <th className="py-2.5 px-3 text-right">Credit</th>
              <th className="py-2.5 px-3 max-w-xs">Narration</th>
              <th className="py-2.5 px-3">Created By</th>
              <th className="py-2.5 px-3 text-center">Level</th>
              <th className="py-2.5 px-3 text-center w-24">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-slate-700">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-600">No approval requests found.</p>
                    <p className="text-[11px] text-slate-400">
                      Change your status filter or submit a collection request from the POS module.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRequests.map((req, idx) => {
                const isSelected = selectedIds.includes(req.id);
                const isCreator = req.createdById === currentUser.id;
                const canApprove =
                  req.status === 'Pending' &&
                  !isCreator &&
                  (currentUser.role === 'Collector' ||
                    currentUser.level === req.currentLevel ||
                    currentUser.role === 'Approver L3');

                return (
                  <tr
                    key={req.id}
                    className={`transition-colors ${
                      req.isStale
                        ? 'bg-amber-50/60 hover:bg-amber-50'
                        : isSelected
                        ? 'bg-blue-50/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(req.id)}
                        className="rounded text-[#2F6FDE] focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>

                    {/* SL */}
                    <td className="py-2.5 px-2 text-center text-slate-500 font-medium">
                      {idx + 1}
                    </td>

                    {/* Create Date */}
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {formatDateDMY(req.requestDate)}
                    </td>

                    {/* Trans. Date */}
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {formatDateDMY(req.collectionDate)}
                    </td>

                    {/* Trans. No (Clickable blue link opens Account Journal Details modal!) */}
                    <td className="py-2.5 px-3 font-mono font-bold text-[#2F6FDE] whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenVoucherModal(req)}
                        className="hover:underline flex items-center gap-1 text-left"
                        title="Click to view Accounting Voucher details"
                      >
                        <span>{req.voucherNo || req.requestNo}</span>
                        {req.isStale && (
                          <span
                            title="STALE INVOICE: Due amount modified out-of-band in POS!"
                            className="bg-amber-100 text-amber-800 p-0.5 rounded text-[10px]"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Office Name */}
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                      FairPrice
                    </td>

                    {/* Trans. Type */}
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                      {req.type === 'Single' ? 'Due Receive (Manual)' : 'Due Receive (Bulk)'}
                    </td>

                    {/* Customer / Group */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{req.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {req.customerCode} • {req.customerGroup}
                      </div>
                    </td>

                    {/* Mode / Account */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-1 ${
                          req.mode === 'Mode B'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {req.mode}
                      </span>
                      <span className="text-slate-700 font-medium">{req.glAccountCode}</span>
                    </td>

                    {/* Debit */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                      {formatCurrency(req.amount)}
                    </td>

                    {/* Credit */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                      {formatCurrency(req.amount)}
                    </td>

                    {/* Narration */}
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={req.narration}>
                      {req.narration}
                    </td>

                    {/* Created By */}
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                      {req.createdBy}
                    </td>

                    {/* Current Level */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {req.status === 'Pending' ? (
                        <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {req.currentLevel} of {req.requiredLevels}
                        </span>
                      ) : req.status === 'Approved' ? (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          Posted
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          Rejected
                        </span>
                      )}
                    </td>

                    {/* Actions matching Screenshot 2 */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-400">
                        {/* Approve icon */}
                        {req.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => approveRequest(req.id)}
                            disabled={!canApprove}
                            title={
                              isCreator
                                ? 'Maker-Checker policy: You cannot approve your own request'
                                : `Approve (${req.currentLevel})`
                            }
                            className={`p-1 rounded transition ${
                              canApprove
                                ? 'text-emerald-600 hover:bg-emerald-50 cursor-pointer'
                                : 'text-gray-300 cursor-not-allowed opacity-40'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reject icon */}
                        {req.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => setRejectDialogRequest(req)}
                            disabled={!canApprove}
                            title="Reject request with mandatory reason"
                            className={`p-1 rounded transition ${
                              canApprove
                                ? 'text-rose-600 hover:bg-rose-50 cursor-pointer'
                                : 'text-gray-300 cursor-not-allowed opacity-40'
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* View Voucher / Eye icon */}
                        <button
                          type="button"
                          onClick={() => handleOpenVoucherModal(req)}
                          title="View Account Journal Details modal"
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer matching Screenshot 2 */}
      <div className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-0.5 text-xs bg-white text-slate-800"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div>
          1–{filteredRequests.length} of {filteredRequests.length}
        </div>
      </div>
    </div>
  );
};
