import React, { useState } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { GLPurposeTag } from '../../types';
import { X, Plus, BookOpen } from 'lucide-react';

export const NewGLAccountModal: React.FC = () => {
  const { isNewGLModalOpen, setIsNewGLModalOpen, addNewGLAccount } = useCreditCollection();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Current Assets');
  const [glClass, setGlClass] = useState('Cash And Cash Equivalent');
  const [category, setCategory] = useState('Bank Account');
  const [purposeTag, setPurposeTag] = useState<GLPurposeTag>('Collection Receipt');
  const [error, setError] = useState<string | null>(null);

  if (!isNewGLModalOpen) return null;

  const handleSave = () => {
    if (!code.trim() || !name.trim()) {
      setError('GL Code and GL Name are required.');
      return;
    }

    addNewGLAccount({
      code: code.trim(),
      name: name.trim(),
      group,
      class: glClass,
      category,
      purposeTag,
    });

    setIsNewGLModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 print:hidden animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-[#2F6FDE]">
            <BookOpen className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-800">Create New Chart of Account (GL)</h3>
          </div>
          <button
            onClick={() => setIsNewGLModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <div className="p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">{error}</div>}

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Account Group <span className="text-red-500">*</span>
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white text-slate-800"
              >
                <option value="Current Assets">Current Assets</option>
                <option value="Non-Current Assets">Non-Current Assets</option>
                <option value="Current Liabilities">Current Liabilities</option>
                <option value="Equity">Equity</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Account Class <span className="text-red-500">*</span>
              </label>
              <select
                value={glClass}
                onChange={(e) => setGlClass(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white text-slate-800"
              >
                <option value="Cash And Cash Equivalent">Cash And Cash Equivalent</option>
                <option value="Clearing & Settlement">Clearing & Settlement</option>
                <option value="Receivables">Receivables</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Bank Account / Wallet"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Purpose Tag <span className="text-red-500">*</span>
              </label>
              <select
                value={purposeTag}
                onChange={(e) => setPurposeTag(e.target.value as GLPurposeTag)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-semibold"
              >
                <option value="Collection Receipt">Collection Receipt (Mode A)</option>
                <option value="Settlement/Clearing">Settlement/Clearing (Mode B)</option>
                <option value="Salary Deduction">Salary Deduction (Mode B)</option>
                <option value="Receivable Control">Receivable Control</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                GL Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 2095"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-slate-800 font-mono"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                GL Account Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Eastern Bank Ltd - Corporate"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setIsNewGLModalOpen(false)}
            className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-[#2F6FDE] hover:bg-[#255cc0] text-white rounded text-xs font-bold shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create GL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
