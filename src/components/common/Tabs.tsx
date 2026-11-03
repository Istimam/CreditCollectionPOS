import React from 'react';
import { TabType } from '../../types';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { FileSpreadsheet } from 'lucide-react';

export const Tabs: React.FC = () => {
  const { currentTab, setCurrentTab, customers, invoices, vouchers } = useCreditCollection();

  const dueCustomersCount = customers.filter((c) => c.dueAmount > 0).length;
  const paidInvoicesCount = invoices.filter((i) => i.status === 'Paid').length;
  const historyCount = vouchers.length;

  const tabs: { key: TabType; label: string; count?: number; isExcel?: boolean }[] = [
    { key: 'DUE_LIST', label: 'DUE LIST', count: dueCustomersCount },
    { key: 'PAID INVOICES' as any, label: 'PAID INVOICES', count: paidInvoicesCount },
    { key: 'COLLECTION_HISTORY', label: 'COLLECTION HISTORY', count: historyCount },
    { key: 'BULK_COLLECTION', label: 'BULK COLLECTION (EXCEL)', isExcel: true },
  ];

  return (
    <div className="border-b border-gray-200 bg-white px-6 pt-2 flex items-center gap-6 overflow-x-auto select-none print:hidden">
      {tabs.map((tab) => {
        const isActive =
          currentTab === tab.key ||
          (tab.key === ('PAID INVOICES' as any) && currentTab === 'PAID_INVOICES');

        return (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.key === ('PAID INVOICES' as any)) {
                setCurrentTab('PAID_INVOICES');
              } else {
                setCurrentTab(tab.key);
              }
            }}
            className={`pb-3 text-xs font-bold tracking-wider uppercase transition flex items-center gap-2 relative border-b-2 whitespace-nowrap ${
              isActive
                ? 'text-[#2F6FDE] border-[#2F6FDE]'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.isExcel && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 inline" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
