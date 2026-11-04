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
  Layers,
  FileCheck2,
} from 'lucide-react';

export const DueCollectionApprovalScreen: React.FC = () => {
  const {
    requests,
    batches,
    approveRequest,
    bulkApproveRequests,
    approveBatch,
    rejectBatch,
    setRejectDialogRequest,
    setActiveJournalVoucher,
    navigateTo,
    currentUser,
    vouchers,
  } = useCreditCollection();

  // Mode: 'Single' or 'Bulk'
  const [activeApprovalType, setActiveApprovalType] = useState<'Single' | 'Bulk'>('Single');
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'ALL'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);

  // Reject Batch Dialog State
  const [rejectingBatchId, setRejectingBatchId] = useState<string | null>(null);
  const [batchRejectReason, setBatchRejectReason] = useState<string>('');

  // 1. Single requests
  const singleRequests = useMemo(() => {
    return requests.filter((r) => r.type === 'Single');
  }, [requests]);

  const filteredSingleRequests = useMemo(() => {
    return singleRequests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
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
  }, [singleRequests, statusFilter, searchQuery]);

  // 2. Bulk batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        b.batchNo.toLowerCase().includes(q) ||
        (b.referenceNo && b.referenceNo.toLowerCase().includes(q)) ||
        b.filterSummary.toLowerCase().includes(q) ||
        b.createdBy.toLowerCase().includes(q) ||
        b.glAccountName.toLowerCase().includes(q)
      );
    });
  }, [batches, statusFilter, searchQuery]);

  const pendingSingleCount = singleRequests.filter((r) => r.status === 'Pending').length;
  const pendingBulkCount = batches.filter((b) => b.status === 'Pending').length;

  // Single Selection Handlers
  const handleSelectAllSingle = (checked: boolean) => {
    setSelectedRequestIds(checked ? filteredSingleRequests.map((r) => r.id) : []);
  };

  const handleToggleSelectSingle = (id: string) => {
    setSelectedRequestIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Selection Handlers
  const handleSelectAllBatches = (checked: boolean) => {
    setSelectedBatchIds(checked ? filteredBatches.map((b) => b.id) : []);
  };

  const handleToggleSelectBatch = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open Voucher for Single Request
  const handleOpenSingleVoucher = (req: (typeof requests)[0]) => {
    if (req.voucherNo) {
      const existing = vouchers.find((v) => v.voucherNo === req.voucherNo);
      if (existing) {
        setActiveJournalVoucher(existing);
        return;
      }
    }

    const previewVoucher = generateSingleDueReceiveVoucher(
      req,
      req.voucherNo || `PREVIEW-${req.requestNo}`,
      currentUser.office
    );
    setActiveJournalVoucher(previewVoucher);
  };

  // Open Voucher for Bulk Batch
  const handleOpenBatchVoucher = (batch: (typeof batches)[0]) => {
    if (batch.voucherNos && batch.voucherNos.length > 0) {
      const v = vouchers.find((voc) => batch.voucherNos.includes(voc.voucherNo));
      if (v) {
        setActiveJournalVoucher(v);
        return;
      }
    }

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

  // Bulk Actions
  const handleBulkApprove = () => {
    if (activeApprovalType === 'Single') {
      if (selectedRequestIds.length === 0) return;
      bulkApproveRequests(selectedRequestIds);
      setSelectedRequestIds([]);
    } else {
      if (selectedBatchIds.length === 0) return;
      selectedBatchIds.forEach((id) => approveBatch(id));
      setSelectedBatchIds([]);
    }
  };

  const handleBulkReject = () => {
    if (activeApprovalType === 'Single') {
      if (selectedRequestIds.length > 0) {
        const target = singleRequests.find((r) => r.id === selectedRequestIds[0]);
        if (target) setRejectDialogRequest(target);
      }
    } else {
      if (selectedBatchIds.length > 0) {
        setRejectingBatchId(selectedBatchIds[0]);
      }
    }
  };

  const handleConfirmBatchReject = () => {
    if (!rejectingBatchId || !batchRejectReason.trim()) return;
    rejectBatch(rejectingBatchId, batchRejectReason.trim());
    setSelectedBatchIds((prev) => prev.filter((id) => id !== rejectingBatchId));
    setRejectingBatchId(null);
    setBatchRejectReason('');
  };

  const selectedCount =
    activeApprovalType === 'Single' ? selectedRequestIds.length : selectedBatchIds.length;

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen text-slate-800">
      {/* Top Header matching Screenshot 2 */}
      <div className="border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 bg-white shadow-xs">
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
            {activeApprovalType === 'Single'
              ? `${filteredSingleRequests.length} Single Record(s)`
              : `${filteredBatches.length} Bulk Batch(es)`}
          </span>
        </div>

        {/* Right Action Controls: Search & Bulk Approve/Reject Buttons */}
        <div className="flex items-center gap-3">
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

          <button
            onClick={handleBulkApprove}
            disabled={selectedCount === 0}
            className={`px-4 py-1.5 rounded text-xs font-bold border transition ${
              selectedCount > 0
                ? 'border-[#2F6FDE] text-[#2F6FDE] hover:bg-blue-50 bg-white shadow-xs cursor-pointer'
                : 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
            }`}
          >
            Approve {selectedCount > 0 && `(${selectedCount})`}
          </button>

          <button
            onClick={handleBulkReject}
            disabled={selectedCount === 0}
            className={`px-4 py-1.5 rounded text-xs font-bold border transition ${
              selectedCount > 0
                ? 'border-red-400 text-red-600 hover:bg-red-50 bg-white shadow-xs cursor-pointer'
                : 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
            }`}
          >
            Reject
          </button>
        </div>
      </div>

      {/* Two Approval Types Navigation Bar */}
      <div className="px-6 bg-white border-b border-gray-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => {
              setActiveApprovalType('Single');
              setSearchQuery('');
            }}
            className={`py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeApprovalType === 'Single'
                ? 'border-[#2F6FDE] text-[#2F6FDE]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Single Collection Approval</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                pendingSingleCount > 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {pendingSingleCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveApprovalType('Bulk');
              setSearchQuery('');
            }}
            className={`py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeApprovalType === 'Bulk'
                ? 'border-[#2F6FDE] text-[#2F6FDE]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Bulk Batch Approval</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                pendingBulkCount > 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {pendingBulkCount}
            </span>
          </button>
        </div>

        {/* Approver role indicator */}
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 py-2">
          <span>Logged in as:</span>
          <span className="font-bold text-slate-700">{currentUser.name}</span>
          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono font-semibold border border-slate-200">
            {currentUser.level || currentUser.role}
          </span>
          {currentUser.role === 'Collector' && (
            <span className="text-amber-600 font-medium ml-1">
              (Maker auto-switched to Approver upon action)
            </span>
          )}
        </div>
      </div>

      {/* Sub Filter Row: Status Selector */}
      <div className="px-6 py-2.5 bg-slate-50 border-b border-gray-200 flex items-center gap-4 text-xs">
        <span className="font-semibold text-slate-600">Status:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="border border-gray-300 rounded px-2.5 py-1 bg-white text-slate-800 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="Pending">Pending Authorization</option>
          <option value="Approved">Approved & Posted</option>
          <option value="Rejected">Rejected</option>
          <option value="ALL">All Statuses</option>
        </select>
      </div>

      {/* Main Content: Render based on activeApprovalType */}
      {activeApprovalType === 'Single' ? (
        /* ================= SINGLE COLLECTION APPROVAL TABLE ================= */
        <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[calc(100vh-14rem)]">
          <table className="w-full text-left border-collapse min-w-[1500px] text-xs">
            <thead className="sticky top-0 bg-[#DCEBFA] text-slate-800 font-semibold z-10 border-b border-[#cbdff4]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredSingleRequests.length > 0 &&
                      selectedRequestIds.length === filteredSingleRequests.length
                    }
                    onChange={(e) => handleSelectAllSingle(e.target.checked)}
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
              {filteredSingleRequests.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">No single approval requests found.</p>
                      <p className="text-[11px] text-slate-400">
                        All single collections authorized or no requests match the status filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSingleRequests.map((req, idx) => {
                  const isSelected = selectedRequestIds.includes(req.id);

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
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectSingle(req.id)}
                          className="rounded text-[#2F6FDE] focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      <td className="py-2.5 px-2 text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {formatDateDMY(req.requestDate)}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {formatDateDMY(req.collectionDate)}
                      </td>

                      {/* Trans. No (Clickable blue link opens Account Journal Details modal) */}
                      <td className="py-2.5 px-3 font-mono font-bold text-[#2F6FDE] whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenSingleVoucher(req)}
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

                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                        FairPrice
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                        Due Receive (Manual)
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{req.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {req.customerCode} • {req.customerGroup}
                        </div>
                      </td>

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

                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(req.amount)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(req.amount)}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={req.narration}>
                        {req.narration}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                        {req.createdBy}
                      </td>

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

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {req.status === 'Pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => approveRequest(req.id)}
                                title={`Approve (${req.currentLevel})`}
                                className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectDialogRequest(req)}
                                title="Reject request"
                                className="p-1 rounded text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenSingleVoucher(req)}
                            title="View Voucher Details"
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
      ) : (
        /* ================= BULK BATCH APPROVAL TABLE (EACH ROW = 1 BATCH) ================= */
        <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[calc(100vh-14rem)]">
          <table className="w-full text-left border-collapse min-w-[1500px] text-xs">
            <thead className="sticky top-0 bg-[#DCEBFA] text-slate-800 font-semibold z-10 border-b border-[#cbdff4]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredBatches.length > 0 &&
                      selectedBatchIds.length === filteredBatches.length
                    }
                    onChange={(e) => handleSelectAllBatches(e.target.checked)}
                    className="rounded text-[#2F6FDE] focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-2 text-center w-10">Sl.</th>
                <th className="py-2.5 px-3">Create Date</th>
                <th className="py-2.5 px-3">Trans. Date</th>
                <th className="py-2.5 px-3">Batch / JV No.</th>
                <th className="py-2.5 px-3">Office Name</th>
                <th className="py-2.5 px-3">Trans. Type</th>
                <th className="py-2.5 px-3">Filter / Group Criteria</th>
                <th className="py-2.5 px-3">Mode / Account</th>
                <th className="py-2.5 px-3 text-center">Customers</th>
                <th className="py-2.5 px-3 text-right">Debit</th>
                <th className="py-2.5 px-3 text-right">Credit</th>
                <th className="py-2.5 px-3">Created By</th>
                <th className="py-2.5 px-3 text-center">Level</th>
                <th className="py-2.5 px-3 text-center w-28">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-slate-700">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">No bulk batches found.</p>
                      <p className="text-[11px] text-slate-400">
                        Create bulk collection batches from the Bulk Wizard in POS module.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch, idx) => {
                  const isSelected = selectedBatchIds.includes(batch.id);

                  return (
                    <tr
                      key={batch.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectBatch(batch.id)}
                          className="rounded text-[#2F6FDE] focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      <td className="py-2.5 px-2 text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {formatDateDMY(batch.date)}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {formatDateDMY(batch.collectionDate)}
                      </td>

                      {/* Trans. No: Clickable blue link opens Batch Journal Details modal */}
                      <td className="py-2.5 px-3 font-mono font-bold text-[#2F6FDE] whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenBatchVoucher(batch)}
                          className="hover:underline flex items-center gap-1 text-left"
                          title="Click to view Batch Accounting Details"
                        >
                          <span>{batch.referenceNo || batch.batchNo}</span>
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                        FairPrice
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                        Due Receive (Bulk)
                      </td>

                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        <div>{batch.filterSummary}</div>
                        {batch.referenceNo && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ref: {batch.referenceNo}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-1 ${
                            batch.mode === 'Mode B'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {batch.mode}
                        </span>
                        <span className="text-slate-700 font-medium">{batch.glAccountCode}</span>
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          {batch.totalCustomers} Cust.
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {formatCurrency(batch.totalAmount)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {formatCurrency(batch.totalAmount)}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                        {batch.createdBy}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {batch.status === 'Pending' ? (
                          <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            {batch.currentLevel} of {batch.requiredLevels}
                          </span>
                        ) : batch.status === 'Approved' ? (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            Posted
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            Rejected
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {batch.status === 'Pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => approveBatch(batch.id)}
                                title={`Approve Batch (${batch.currentLevel})`}
                                className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectingBatchId(batch.id)}
                                title="Reject Batch"
                                className="p-1 rounded text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenBatchVoucher(batch)}
                            title="View Batch Voucher Details"
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
      )}

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
          1–{activeApprovalType === 'Single' ? filteredSingleRequests.length : filteredBatches.length} of{' '}
          {activeApprovalType === 'Single' ? filteredSingleRequests.length : filteredBatches.length}
        </div>
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
              Please enter the mandatory rejection reason. All customer dues and invoices reserved by this batch will be released back to the Due List.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={batchRejectReason}
                onChange={(e) => setBatchRejectReason(e.target.value)}
                placeholder="e.g. Schedule mismatch with corporate JV..."
                className="w-full border border-gray-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingBatchId(null);
                  setBatchRejectReason('');
                }}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchReject}
                disabled={!batchRejectReason.trim()}
                className={`px-4 py-1.5 rounded text-xs font-bold transition text-white ${
                  batchRejectReason.trim()
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
