import React, { useState } from 'react';
import { CreditCollectionProvider, useCreditCollection } from './context/CreditCollectionContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { PageHeader } from './components/layout/PageHeader';
import { Tabs } from './components/common/Tabs';
import { FilterBar } from './components/common/FilterBar';
import { DueListTab } from './components/screens/DueListTab';
import { PaidInvoicesTab } from './components/screens/PaidInvoicesTab';
import { RequestsTab } from './components/screens/RequestsTab';
import { BatchesTab } from './components/screens/BatchesTab';
import { CustomerCollectionForm } from './components/screens/CustomerCollectionForm';
import { InvoiceDetailDrawer } from './components/screens/InvoiceDetailDrawer';
import { ApprovalDashboard } from './components/screens/ApprovalDashboard';
import { DueCollectionApprovalScreen } from './components/screens/DueCollectionApprovalScreen';
import { GLSetupScreen } from './components/screens/GLSetupScreen';
import { ARLedgerReportScreen } from './components/screens/ARLedgerReportScreen';
import { BulkWizardScreen } from './components/screens/BulkWizard/BulkWizardScreen';
import { AccountJournalDetailsModal } from './components/modals/AccountJournalDetailsModal';
import { RejectReasonModal } from './components/modals/RejectReasonModal';
import { NewGLAccountModal } from './components/modals/NewGLAccountModal';
import { DevControlsBar } from './components/common/DevControlsBar';
import { Toast } from './components/common/Toast';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const {
    currentModule,
    currentScreen,
    activeTab,
    selectedCustomer,
    setSelectedCustomer,
  } = useCreditCollection();

  // Determine what main content to render
  const renderContent = () => {
    // APPROVAL module screens
    if (currentModule === 'APPROVAL') {
      if (currentScreen === 'DUE_APPROVAL_LIST') {
        return <DueCollectionApprovalScreen />;
      }
      return <ApprovalDashboard />;
    }

    // POS module screens
    if (currentScreen === 'GL_SETUP') {
      return <GLSetupScreen />;
    }
    if (currentScreen === 'AR_LEDGER') {
      return <ARLedgerReportScreen />;
    }
    if (currentScreen === 'BULK_WIZARD') {
      return <BulkWizardScreen />;
    }
    if (currentScreen === 'COLLECT_SINGLE' && selectedCustomer) {
      return (
        <CustomerCollectionForm
          customer={selectedCustomer}
          onBack={() => setSelectedCustomer(null)}
        />
      );
    }
    if (selectedCustomer) {
      return (
        <CustomerCollectionForm
          customer={selectedCustomer}
          onBack={() => setSelectedCustomer(null)}
        />
      );
    }

    // Main CREDIT COLLECTION tab view
    return (
      <>
        <PageHeader />
        <Tabs />
        {activeTab !== 'BULK_UPLOAD' && <FilterBar />}

        <div className="flex-1 flex flex-col">
          {activeTab === 'DUE_LIST' && <DueListTab />}
          {activeTab === 'PAID_INVOICES' && <PaidInvoicesTab />}
          {activeTab === 'PENDING_LIST' && <RequestsTab />}
          {activeTab === 'BULK_UPLOAD' && <BatchesTab />}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Dev Controls Bar (always at the very top in demo) */}
      <DevControlsBar />

      {/* Top Header */}
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar isOpen={sidebarOpen} />

        {/* Center Content Workspace */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Slide-out Invoice Detail Drawer */}
      <InvoiceDetailDrawer />

      {/* Global Modals */}
      <AccountJournalDetailsModal />
      <RejectReasonModal />
      <NewGLAccountModal />

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
