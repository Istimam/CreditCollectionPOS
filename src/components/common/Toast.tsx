import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useCreditCollection } from '../../context/CreditCollectionContext';

export const Toast: React.FC = () => {
  const { toast, clearToast, setActiveTab } = useCreditCollection();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        clearToast();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 duration-300 print:hidden">
      <div
        className={`rounded-lg shadow-xl border p-4 flex items-start gap-3 bg-white ${
          toast.type === 'success'
            ? 'border-emerald-200 ring-1 ring-emerald-500/20'
            : toast.type === 'error'
            ? 'border-red-200 ring-1 ring-red-500/20'
            : 'border-blue-200 ring-1 ring-blue-500/20'
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
        </div>

        <div className="flex-1 pr-2">
          <h4
            className={`text-xs font-bold ${
              toast.type === 'success'
                ? 'text-emerald-900'
                : toast.type === 'error'
                ? 'text-red-900'
                : 'text-blue-900'
            }`}
          >
            {toast.title}
          </h4>
          {toast.message && (
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{toast.message}</p>
          )}

          {toast.voucherNo && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                Voucher: {toast.voucherNo}
              </span>
              <button
                onClick={() => {
                  setActiveTab('REQUESTS');
                  clearToast();
                }}
                className="text-[11px] text-blue-600 underline font-semibold hover:text-blue-800"
              >
                View in Requests →
              </button>
            </div>
          )}
        </div>

        <button
          onClick={clearToast}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
