import React from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  FileText,
  CreditCard,
  Users,
  Boxes,
  ShieldCheck,
} from 'lucide-react';

interface TileProps {
  title: string;
  count: number;
  icon?: React.ReactNode;
  onClick?: () => void;
  isSpecial?: boolean;
}

const ApprovalTile: React.FC<TileProps> = ({ title, count, icon, onClick, isSpecial }) => {
  const isPending = count > 0;

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-between p-3 rounded-lg border transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : 'cursor-default opacity-90'
      } ${
        isSpecial
          ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200'
          : 'bg-white border-slate-200 shadow-xs'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div
          className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-xs ${
            isSpecial ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {icon || <FileText className="w-4 h-4" />}
        </div>
        <span className="text-[11px] font-semibold text-slate-800 leading-snug truncate">
          {title}
        </span>
      </div>

      {/* Badge matching Screenshot 1 (Red if > 0, Green if 0) */}
      <div
        className={`px-2 py-0.5 rounded text-[11px] font-bold text-white min-w-[24px] text-center flex-shrink-0 ${
          isPending ? 'bg-[#EF4444]' : 'bg-[#4ADE80]'
        }`}
      >
        {count}
      </div>
    </div>
  );
};

export const ApprovalDashboard: React.FC = () => {
  const { navigateTo, pendingApprovalCountForCurrentUser, currentUser } = useCreditCollection();

  return (
    <div className="flex-1 bg-slate-50 min-h-screen text-slate-800 p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#2F6FDE]" />
            <span>Approval Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-department approval requests awaiting authorization.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-slate-500">Current Approver:</span>
          <span className="font-bold text-slate-800">{currentUser.name}</span>
          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-mono font-bold">
            {currentUser.level || currentUser.role}
          </span>
        </div>
      </div>

      {/* Section: POS APPROVAL (NEW! Prominent) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#2F6FDE] flex items-center gap-1.5">
            <span>POS APPROVAL</span>
            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded">
              Feature Active
            </span>
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">
            Click tile to review customer due collections
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <ApprovalTile
            title="Due Collection Approval"
            count={pendingApprovalCountForCurrentUser}
            icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
            onClick={() => navigateTo('APPROVAL', 'DUE_APPROVAL_LIST')}
            isSpecial={true}
          />
        </div>
      </div>

      {/* Section: PURCHASE APPROVAL (from Screenshot 1) */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
          PURCHASE APPROVAL
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <ApprovalTile title="Purchase Order Approval" count={102} icon={<ShoppingCart className="w-4 h-4 text-amber-600" />} />
          <ApprovalTile title="Purchase Bill Approval" count={0} />
          <ApprovalTile title="RFQ Approval" count={0} />
          <ApprovalTile title="Quotation Entry Approval" count={0} />
          <ApprovalTile title="Shipment Approval" count={0} />
          <ApprovalTile title="Purchase Return Approval" count={0} />
          <ApprovalTile title="Purchase Requisition Approval" count={0} />
          <ApprovalTile title="Purchase Clear Invoice Approval" count={0} />
        </div>
      </div>

      {/* Section: SALES APPROVAL (from Screenshot 1) */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
          SALES APPROVAL
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <ApprovalTile title="Sales Order Approval" count={0} icon={<TrendingUp className="w-4 h-4 text-blue-600" />} />
          <ApprovalTile title="Sales Quotation Approval" count={0} />
          <ApprovalTile title="Sales Return Approval" count={0} />
          <ApprovalTile title="Sales Collection & Bill Approval" count={0} />
          <ApprovalTile title="Point Redeem Approval" count={0} />
          <ApprovalTile title="Schedule Delivery Approval" count={0} />
          <ApprovalTile title="Credit Limit Approval" count={0} />
          <ApprovalTile title="Clear Invoice Approval" count={0} />
          <ApprovalTile title="Export Sales Order Approval" count={0} />
          <ApprovalTile title="Proforma Invoice Approval" count={0} />
          <ApprovalTile title="Export Sales Schedule Approval" count={0} />
          <ApprovalTile title="Export Sales Lc Fees Approval" count={0} />
        </div>
      </div>

      {/* Section: ACCOUNT APPROVAL (from Screenshot 1) */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
          ACCOUNT APPROVAL
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <ApprovalTile title="Expense/Advance Approval" count={0} icon={<CreditCard className="w-4 h-4 text-indigo-600" />} />
          <ApprovalTile title="Fund Transfer Approval" count={0} />
          <ApprovalTile title="Budget Approval" count={0} />
          <ApprovalTile title="Journal Voucher" count={0} />
          <ApprovalTile title="Financial Budget Approval" count={0} />
          <ApprovalTile title="GL Merge Approval" count={0} />
          <ApprovalTile title="Chart Of Account Approval" count={0} />
        </div>
      </div>

      {/* Section: HR APPROVAL */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
          HR APPROVAL
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <ApprovalTile title="Attendance Register Approval" count={0} icon={<Users className="w-4 h-4 text-teal-600" />} />
          <ApprovalTile title="Employee Leave Approval" count={0} />
          <ApprovalTile title="Employee Movement Approval" count={0} />
          <ApprovalTile title="Employee Attendance Approval" count={0} />
          <ApprovalTile title="Employee Over Time Approval" count={0} />
          <ApprovalTile title="Salary Sheet Approval" count={0} />
          <ApprovalTile title="Bonus Approval" count={0} />
          <ApprovalTile title="Employee Increment Approval" count={0} />
          <ApprovalTile title="Salary Advice Approval" count={0} />
          <ApprovalTile title="Bonus Advice Approval" count={0} />
        </div>
      </div>

      {/* Section: INVENTORY APPROVAL */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
          INVENTORY APPROVAL
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <ApprovalTile title="Stock Adjustment Approval" count={0} icon={<Boxes className="w-4 h-4 text-orange-600" />} />
          <ApprovalTile title="Inventory Requisition Approval" count={0} />
          <ApprovalTile title="Inventory Item Conversion Approval" count={0} />
          <ApprovalTile title="Transfer Request Approval" count={0} />
          <ApprovalTile title="Audit Config Approval" count={0} />
          <ApprovalTile title="Audit Approval" count={0} />
          <ApprovalTile title="Transfer Return Approval" count={0} />
        </div>
      </div>
    </div>
  );
};
