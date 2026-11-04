import React from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { GLPurposeTag } from '../../types';
import { formatCurrency } from '../../utils/format';
import { Plus } from 'lucide-react';

interface GLPickerProps {
  label?: string;
  required?: boolean;
  purposeTags?: GLPurposeTag[];
  paymentMethod?: 'Cash' | 'Bank' | 'Wallet';
  value: string; // GL Code
  onChange: (code: string) => void;
  className?: string;
}

export const GLPicker: React.FC<GLPickerProps> = ({
  label,
  required = false,
  purposeTags,
  paymentMethod,
  value,
  onChange,
  className = '',
}) => {
  const { glAccounts, setIsNewGLModalOpen } = useCreditCollection();

  const filteredAccounts = glAccounts.filter((gl) => {
    // 1. Purpose tag filter if provided
    if (purposeTags && purposeTags.length > 0 && !purposeTags.includes(gl.purposeTag)) {
      return false;
    }

    // 2. Payment Method category filter
    if (paymentMethod === 'Cash') {
      return gl.category === 'Cash Account' || /cash/i.test(gl.name);
    }
    if (paymentMethod === 'Bank') {
      return gl.category === 'Bank Account' || /bank/i.test(gl.name);
    }
    if (paymentMethod === 'Wallet') {
      return (
        gl.category === 'Mobile Financial Services' ||
        /bkash|nagad|rocket|wallet/i.test(gl.name)
      );
    }

    return true;
  });

  const selectedGL = glAccounts.find((g) => g.code === value);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-semibold text-slate-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <button
            type="button"
            onClick={() => setIsNewGLModalOpen(true)}
            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 hover:underline"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>+ New GL</span>
          </button>
        </div>
      )}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs truncate"
      >
        <option value="">Select Account (GL)...</option>
        {filteredAccounts.map((gl) => (
          <option key={gl.id} value={gl.code}>
            {gl.code} - {gl.name} (৳{formatCurrency(gl.balance)})
          </option>
        ))}
      </select>

      {/* Grey breadcrumb path & live balance display */}
      {selectedGL && (
        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-0.5">
          <span className="truncate max-w-[280px]">
            {selectedGL.group} &gt; {selectedGL.class} &gt; {selectedGL.category}
          </span>
          <span className="font-semibold text-slate-700 font-mono">
            Balance: ৳{formatCurrency(selectedGL.balance)}
          </span>
        </div>
      )}
    </div>
  );
};
