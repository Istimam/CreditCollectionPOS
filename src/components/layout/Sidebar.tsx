import React, { useState } from 'react';
import {
  ShoppingBag,
  Store,
  Boxes,
  Landmark,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  Receipt,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { useCreditCollection } from '../../context/CreditCollectionContext';

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const {
    currentModule,
    currentScreen,
    navigateTo,
    setSelectedCustomer,
    pendingApprovalCountForCurrentUser,
  } = useCreditCollection();

  const [isPosExpanded, setIsPosExpanded] = useState(true);
  const [isPosSetupExpanded, setIsPosSetupExpanded] = useState(true);
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
        </div>

        {/* Module: POS (Expanded with Credit Collection & Setup) */}
        <div>
          <button
            onClick={() => setIsPosExpanded(!isPosExpanded)}
            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition ${
              currentModule === 'POS'
                ? 'text-[#1e3a8a] bg-[#e4ecf8]'
                : 'text-slate-700 hover:bg-[#e4ecf8]'
            }`}
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

              {/* Item: Credit Collection (New feature) */}
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  navigateTo('POS', 'MAIN');
                }}
                className={`w-full text-left py-1.5 px-2.5 rounded font-medium flex items-center gap-2 transition ${
                  currentModule === 'POS' && currentScreen === 'MAIN'
                    ? 'bg-[#2F6FDE] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-[#dbe7f7]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Credit Collection</span>
              </button>

              {/* Sub-item: Setup */}
              <div>
                <button
                  onClick={() => setIsPosSetupExpanded(!isPosSetupExpanded)}
                  className="w-full flex items-center justify-between py-1.5 px-2.5 rounded text-slate-700 hover:bg-[#dbe7f7] font-medium transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">•</span>
                    <span>Setup</span>
                  </div>
                  {isPosSetupExpanded ? (
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  )}
                </button>

                {isPosSetupExpanded && (
                  <div className="pl-4 pr-1 py-0.5 space-y-1">
                    <button
                      onClick={() => navigateTo('POS', 'GL_SETUP')}
                      className={`w-full text-left py-1.5 px-2 rounded text-[11px] font-medium flex items-center gap-1.5 transition ${
                        currentScreen === 'GL_SETUP'
                          ? 'bg-blue-200/80 text-blue-900 font-bold'
                          : 'text-slate-600 hover:bg-[#dbe7f7]'
                      }`}
                    >
                      <Sliders className="w-3 h-3 text-blue-600" />
                      <span>Credit Collection GL Setup</span>
                    </button>
                  </div>
                )}
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

        {/* Module: APPROVAL (Navigates to Approval Dashboard) */}
        <button
          onClick={() => navigateTo('APPROVAL', 'APPROVAL_DASHBOARD')}
          className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition ${
            currentModule === 'APPROVAL'
              ? 'bg-[#2F6FDE] text-white font-bold shadow-xs'
              : 'text-slate-700 hover:bg-[#e4ecf8]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Approval</span>
          </div>
          {pendingApprovalCountForCurrentUser > 0 ? (
            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {pendingApprovalCountForCurrentUser}
            </span>
          ) : (
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          )}
        </button>

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
