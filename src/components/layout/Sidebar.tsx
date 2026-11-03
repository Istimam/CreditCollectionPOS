import React, { useState } from 'react';
import {
  ShoppingBag,
  Store,
  Boxes,
  Landmark,
  Users,
  CheckCircle2,
  Settings,
  ChevronDown,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import { useCreditCollection } from '../../context/CreditCollectionContext';

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { setSelectedCustomer, setCurrentTab } = useCreditCollection();
  const [isPosExpanded, setIsPosExpanded] = useState(true);
  const [isPurchaseExpanded, setIsPurchaseExpanded] = useState(false);

  if (!isOpen) return null;

  return (
    <aside className="w-56 bg-[#f0f5fc] border-r border-[#d9e5f5] flex-shrink-0 flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto select-none print:hidden text-slate-700">
      <div className="py-2 space-y-0.5">
        {/* Module: Purchase */}
        <div>
          <button
            onClick={() => setIsPurchaseExpanded(!isPurchaseExpanded)}
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-[#e4ecf8] transition"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-slate-500" />
              <span>Purchase</span>
            </div>
            {isPurchaseExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {isPurchaseExpanded && (
            <div className="bg-[#e8f0fa]/60 py-1 pl-7 pr-2 space-y-0.5 text-xs text-slate-600">
              <div className="py-1 px-2 rounded hover:bg-[#dbe7f7] cursor-pointer">
                • Purchase Dashboard
              </div>
              <div className="py-1 px-2 rounded hover:bg-[#dbe7f7] cursor-pointer">
                • Purchase Order
              </div>
              <div className="py-1 px-2 rounded hover:bg-[#dbe7f7] cursor-pointer">
                • Purchase Receive
              </div>
              <div className="py-1 px-2 rounded hover:bg-[#dbe7f7] cursor-pointer">
                • Purchase Payment
              </div>
              <div className="py-1 px-2 rounded hover:bg-[#dbe7f7] cursor-pointer">
                • Purchase Return
              </div>
            </div>
          )}
        </div>

        {/* Module: POS (Expanded with Credit Collection) */}
        <div>
          <button
            onClick={() => setIsPosExpanded(!isPosExpanded)}
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-[#1e3a8a] bg-[#e4ecf8] transition"
          >
            <div className="flex items-center gap-2.5">
              <Store className="w-4 h-4 text-[#2F6FDE]" />
              <span className="font-bold">POS</span>
            </div>
            {isPosExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {isPosExpanded && (
            <div className="bg-[#e8f0fa]/70 py-1 pl-6 pr-2 space-y-1 text-xs">
              <div className="py-1.5 px-2.5 rounded text-slate-600 hover:bg-[#dbe7f7] cursor-pointer flex items-center gap-2 transition">
                <span className="text-[10px] text-slate-400">•</span>
                <span>POS Dashboard</span>
              </div>

              {/* ACTIVE ITEM: Credit Collection */}
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setCurrentTab('DUE_LIST');
                }}
                className="w-full text-left py-1.5 px-2.5 rounded bg-[#2F6FDE] text-white font-medium flex items-center gap-2 shadow-sm transition"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Credit Collection</span>
              </button>

              <div className="py-1.5 px-2.5 rounded text-slate-600 hover:bg-[#dbe7f7] cursor-pointer flex items-center gap-2 transition">
                <span className="text-[10px] text-slate-400">•</span>
                <span>Setup</span>
              </div>
              <div className="py-1.5 px-2.5 rounded text-slate-600 hover:bg-[#dbe7f7] cursor-pointer flex items-center gap-2 transition">
                <span className="text-[10px] text-slate-400">•</span>
                <span>Reports</span>
              </div>
            </div>
          )}
        </div>

        {/* Module: Inventory */}
        <div className="flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-[#e4ecf8] cursor-pointer transition">
          <div className="flex items-center gap-2.5">
            <Boxes className="w-4 h-4 text-slate-500" />
            <span>Inventory</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Module: Accounts */}
        <div className="flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-[#e4ecf8] cursor-pointer transition">
          <div className="flex items-center gap-2.5">
            <Landmark className="w-4 h-4 text-slate-500" />
            <span>Accounts</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Module: Payroll */}
        <div className="flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-[#e4ecf8] cursor-pointer transition">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-slate-500" />
            <span>Payroll</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Module: Approval */}
        <div className="flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-[#e4ecf8] cursor-pointer transition">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-slate-500" />
            <span>Approval</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Module: Configuration */}
        <div className="flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-[#e4ecf8] cursor-pointer transition">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Configuration</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* Footer Info in Sidebar */}
      <div className="mt-auto p-3 text-[11px] text-slate-400 border-t border-[#d9e5f5]">
        <div>Managerium ERP v5.0.59</div>
        <div className="text-[10px] text-slate-400">POS Module • FairPrice</div>
      </div>
    </aside>
  );
};
