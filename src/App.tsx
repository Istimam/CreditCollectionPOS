import React, { useState } from 'react';
import { CreditCollectionProvider, useCreditCollection } from './context/CreditCollectionContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { PageHeader } from './components/layout/PageHeader';
import { Tabs } from './components/common/Tabs';
import { FilterBar } from './components/common/FilterBar';
import { DueListTab } from './components/screens/DueListTab';
import { PaidInvoicesTab } from './components/screens/PaidInvoicesTab';
import { CollectionHistoryTab } from './components/screens/CollectionHistoryTab';
import { BulkCollectionTab } from './components/screens/BulkCollectionTab';
import { CustomerCollectionForm } from './components/screens/CustomerCollectionForm';
import { InvoiceDetailDrawer } from './components/screens/InvoiceDetailDrawer';
import { CollectByInvoiceModal } from './components/screens/CollectByInvoiceModal';
import { Toast } from './components/common/Toast';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentTab, selectedCustomer, setSelectedCustomer } = useCreditCollection();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Header */}
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar isOpen={sidebarOpen} />

        {/* Center Content Workspace */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {selectedCustomer ? (
            /* Screen B: Single Customer Collection View */
            <CustomerCollectionForm
              customer={selectedCustomer}
              onBack={() => setSelectedCustomer(null)}
            />
          ) : (
            /* Screen A: Tabs List View */
            <>
              <PageHeader />
              <Tabs />
              {currentTab !== 'BULK_COLLECTION' && <FilterBar />}

              {/* Tab Contents */}
              <div className="flex-1 flex flex-col">
                {currentTab === 'DUE_LIST' && <DueListTab />}
                {currentTab === 'PAID_INVOICES' && <PaidInvoicesTab />}
                {currentTab === 'COLLECTION_HISTORY' && <CollectionHistoryTab />}
                {currentTab === 'BULK_COLLECTION' && <BulkCollectionTab />}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Slide-out Invoice Detail Drawer */}
      <InvoiceDetailDrawer />

      {/* Modals */}
      <CollectByInvoiceModal />

      {/* Notifications Toast */}
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <CreditCollectionProvider>
      <MainLayout />
    </CreditCollectionProvider>
  );
}
