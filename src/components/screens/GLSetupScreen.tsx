import React, { useState } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { GLPicker } from '../common/GLPicker';
import { ArrowLeft, Save, Sliders, Shield, BookOpen, Layers } from 'lucide-react';

export const GLSetupScreen: React.FC = () => {
  const { glSetup, updateGLSetup, navigateTo } = useCreditCollection();

  const [receivableControlGL, setReceivableControlGL] = useState(glSetup.receivableControlGL);
  const [defaultCashGL, setDefaultCashGL] = useState(glSetup.defaultCashGL);
  const [defaultBankGL, setDefaultBankGL] = useState(glSetup.defaultBankGL);
  const [defaultWalletGL, setDefaultWalletGL] = useState(glSetup.defaultWalletGL);
  const [defaultSettlementGL, setDefaultSettlementGL] = useState(glSetup.defaultSettlementGL);
  const [enableModeA, setEnableModeA] = useState(glSetup.enableModeA);
  const [enableModeB, setEnableModeB] = useState(glSetup.enableModeB);
  const [bulkVoucherShape, setBulkVoucherShape] = useState(glSetup.bulkVoucherShape);
  const [thresholdL1Max, setThresholdL1Max] = useState(glSetup.thresholdL1Max);
  const [thresholdL2Max, setThresholdL2Max] = useState(glSetup.thresholdL2Max);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateGLSetup({
      receivableControlGL,
      defaultCashGL,
      defaultBankGL,
      defaultWalletGL,
      defaultSettlementGL,
      enableModeA,
      enableModeB,
      bulkVoucherShape,
      thresholdL1Max,
      thresholdL2Max,
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen text-slate-800">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-14 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('POS', 'MAIN')}
            className="p-1 rounded hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#2F6FDE]" />
              <span>Credit Collection GL Setup</span>
            </h1>
            <p className="text-xs text-slate-500">
              Configure General Ledger mapping, collection modes, and multi-tier approval thresholds.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white font-bold text-xs px-5 py-2 rounded flex items-center gap-2 shadow-xs transition"
        >
          <Save className="w-4 h-4" />
          <span>Save Configurations</span>
        </button>
      </div>

      <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Card 1: Default Chart of Accounts Mapping */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#2F6FDE]" />
            <h2 className="font-bold text-sm text-slate-800">
              Chart of Accounts (GL) Default Tagging
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GLPicker
              label="Receivable Control GL (Credit Customer Subledger)"
              required
              purposeTags={['Receivable Control']}
              value={receivableControlGL}
              onChange={setReceivableControlGL}
            />

            <GLPicker
              label="Default Settlement / Clearing GL (Mode B Pre-funded)"
              required
              purposeTags={['Settlement/Clearing', 'Salary Deduction']}
              value={defaultSettlementGL}
              onChange={setDefaultSettlementGL}
            />

            <GLPicker
              label="Default Cash Receipt GL"
              required
              paymentMethod="Cash"
              purposeTags={['Collection Receipt']}
              value={defaultCashGL}
              onChange={setDefaultCashGL}
            />

            <GLPicker
              label="Default Bank Receipt GL"
              required
              paymentMethod="Bank"
              purposeTags={['Collection Receipt']}
              value={defaultBankGL}
              onChange={setDefaultBankGL}
            />

            <GLPicker
              label="Default Mobile Wallet Receipt GL"
              required
              paymentMethod="Wallet"
              purposeTags={['Collection Receipt']}
              value={defaultWalletGL}
              onChange={setDefaultWalletGL}
            />
          </div>
        </div>

        {/* Card 2: Collection Modes & Voucher Shape */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2F6FDE]" />
            <h2 className="font-bold text-sm text-slate-800">
              Collection Modes & Bulk Voucher Architecture
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableModeA}
                  onChange={(e) => setEnableModeA(e.target.checked)}
                  className="rounded text-[#2F6FDE] focus:ring-blue-500 w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-800 block text-xs">
                    Enable Mode A (Direct Multi-Method Receipt)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    User chooses Cash, Bank, or Wallet directly. On final approval posts: Dr Receiving GL, Cr Accounts Receivable.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableModeB}
                  onChange={(e) => setEnableModeB(e.target.checked)}
                  className="rounded text-[#2F6FDE] focus:ring-blue-500 w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-800 block text-xs">
                    Enable Mode B (Pre-Funded Settlement GL)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Funds pre-recorded via Journal Voucher into clearing GL. Available balance verified dynamically.
                  </p>
                </div>
              </label>
            </div>

            {/* Bulk Voucher Shape setting per Section 12 */}
            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Bulk Collection Voucher Generation Shape:
              </label>
              <div className="flex items-center gap-6 mt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bulkShape"
                    value="One voucher per batch"
                    checked={bulkVoucherShape === 'One voucher per batch'}
                    onChange={() => setBulkVoucherShape('One voucher per batch')}
                    className="text-[#2F6FDE]"
                  />
                  <span className="font-semibold text-slate-800">
                    One voucher per batch (Default — consolidated Dr & per-customer Cr lines)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bulkShape"
                    value="One voucher per customer"
                    checked={bulkVoucherShape === 'One voucher per customer'}
                    onChange={() => setBulkVoucherShape('One voucher per customer')}
                    className="text-[#2F6FDE]"
                  />
                  <span className="font-semibold text-slate-800">
                    One voucher per customer
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Multi-tier Approval Thresholds */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#2F6FDE]" />
            <h2 className="font-bold text-sm text-slate-800">
              Multi-Layer Authorization Thresholds
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                L1 Max Amount Threshold (৳)
              </label>
              <input
                type="number"
                value={thresholdL1Max}
                onChange={(e) => setThresholdL1Max(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 font-bold text-slate-800"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Amounts up to ৳{thresholdL1Max.toLocaleString()} require 1 Level (L1 Approver).
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                L2 Max Amount Threshold (৳)
              </label>
              <input
                type="number"
                value={thresholdL2Max}
                onChange={(e) => setThresholdL2Max(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 font-bold text-slate-800"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Amounts up to ৳{thresholdL2Max.toLocaleString()} require 2 Levels (L1 + L2). Amounts exceeding require 3 Levels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
