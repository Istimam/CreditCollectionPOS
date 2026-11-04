import React from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { Shield, UserCheck, Zap, RotateCcw, AlertTriangle } from 'lucide-react';

export const DevControlsBar: React.FC = () => {
  const {
    currentUser,
    switchUser,
    users,
    simulateStalePOSCollection,
    forceFailureRollbackToggle,
    setForceFailureRollbackToggle,
    resetAllMockData,
    pendingApprovalCountForCurrentUser,
  } = useCreditCollection();

  return (
    <div className="bg-slate-900 text-white text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 shadow-md sticky top-0 z-50 print:hidden">
      {/* User Switcher (Maker-Checker & Approvers) */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 font-bold text-amber-400">
          <Shield className="w-3.5 h-3.5" />
          <span>Demo Role:</span>
        </span>
        <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded border border-slate-700">
          {users.map((u) => {
            const isActive = currentUser.id === u.id;
            return (
              <button
                key={u.id}
                onClick={() => switchUser(u.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={`Switch to ${u.name} (${u.role})`}
              >
                {isActive && <UserCheck className="w-3 h-3" />}
                <span>{u.name.split(' ')[0]}</span>
                <span className="text-[9px] opacity-75">
                  ({u.role === 'Collector' ? 'Collector' : u.level || 'Viewer'})
                </span>
              </button>
            );
          })}
        </div>
        {pendingApprovalCountForCurrentUser > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
            {pendingApprovalCountForCurrentUser} pending
          </span>
        )}
      </div>

      {/* Dev Interactive Scenarios */}
      <div className="flex items-center gap-2">
        {/* Simulate Stale POS Collection */}
        <button
          onClick={() => simulateStalePOSCollection('cus-4')}
          className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
          title="Simulate store customer paying at POS counter out-of-band to test Stale detection during approval"
        >
          <Zap className="w-3 h-3" />
          <span>Simulate POS Collection (Trigger Stale)</span>
        </button>

        {/* Toggle Force Atomic Failure Rollback */}
        <button
          onClick={() => setForceFailureRollbackToggle(!forceFailureRollbackToggle)}
          className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition shadow-xs ${
            forceFailureRollbackToggle
              ? 'bg-red-600 text-white ring-2 ring-red-400'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}
          title="Force posting failure to demonstrate all-or-nothing rollback"
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Force Post Failure: {forceFailureRollbackToggle ? 'ON' : 'OFF'}</span>
        </button>

        {/* Reset State */}
        <button
          onClick={resetAllMockData}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition"
          title="Reset all demo data to seed state"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
