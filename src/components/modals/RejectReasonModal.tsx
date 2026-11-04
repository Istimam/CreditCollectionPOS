import React, { useState } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { X, XCircle } from 'lucide-react';

export const RejectReasonModal: React.FC = () => {
  const { rejectDialogRequest, setRejectDialogRequest, rejectRequest } = useCreditCollection();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!rejectDialogRequest) return null;

  const handleConfirmReject = () => {
    if (!reason.trim()) {
      setError('Please provide an explicit rejection reason.');
      return;
    }

    const res = rejectRequest(rejectDialogRequest.id, reason.trim());
    if (res.success) {
      setReason('');
      setError(null);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 print:hidden animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-rose-600">
            <XCircle className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-800">
              Reject Request #{rejectDialogRequest.requestNo}
            </h3>
          </div>
          <button
            onClick={() => setRejectDialogRequest(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 space-y-1">
            <div className="font-bold">Customer: {rejectDialogRequest.customerName}</div>
            <div>Amount: ৳{rejectDialogRequest.amount.toLocaleString()}</div>
            <p className="text-[11px] text-rose-600 mt-1">
              Rejecting this request will release all reserved invoice dues and funds back to the customer.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter explanation for returning or rejecting this collection..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800"
              autoFocus
            />
            {error && <p className="text-red-500 text-[11px] mt-1 font-medium">{error}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setRejectDialogRequest(null)}
            className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmReject}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold shadow-xs transition"
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
};
