import React from 'react';
import { TabType } from '../../types';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { Layers, Clock } from 'lucide-react';

export const Tabs: React.FC = () => {
  const { activeTab, setActiveTab, customers, invoices, requests, batches } = useCreditCollection();

  const dueCustomersCount = customers.filter((c) => c.dueAmount > 0).length;
  const paidInvoicesCount = invoices.filter((i) => i.status === 'Paid').length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'Pending').length;
  const batchesCount = batches.length;

  const tabs: { key: TabType; label: string; count?: number; icon?: React.ReactNode }[] = [
    { key: 'DUE_LIST', label: 'DUE LIST', count: dueCustomersCount },
    { key: 'PAID_INVOICES', label: 'PAID INVOICES', count: paidInvoicesCount },
    {
      key: 'REQUESTS',
      label: 'REQUESTS',
      count: pendingRequestsCount,
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      key: 'BATCHES',
      label: 'BATCHES',
      count: batchesCount,
      icon: <Layers className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="border-b border-gray-200 bg-white px-6 pt-2 flex items-center gap-6 overflow-x-auto select-none print:hidden">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2.5 text-xs font-bold tracking-wider uppercase transition flex items-center gap-2 relative border-b-2 whitespace-nowrap ${
              isActive
                ? 'text-[#2F6FDE] border-[#2F6FDE]'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
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
