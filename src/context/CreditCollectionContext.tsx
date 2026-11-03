import React, { createContext, useContext, useState } from 'react';
import { Customer, Invoice, CollectionVoucher, TabType, BulkUploadRow, InvoiceStatus, PaymentMethodType } from '../types';
import { INITIAL_CUSTOMERS, INITIAL_INVOICES, INITIAL_VOUCHERS } from '../data/mockData';
import { round2, allocateFIFO } from '../utils/fifo';
import { formatDateYMD } from '../utils/format';

export interface ToastState {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  voucherNo?: string;
}

interface CreditCollectionContextType {
  customers: Customer[];
  invoices: Invoice[];
  vouchers: CollectionVoucher[];
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  activeInvoiceForDrawer: Invoice | null;
  setActiveInvoiceForDrawer: (invoice: Invoice | null) => void;
  isInvoiceWiseModalOpen: boolean;
  setIsInvoiceWiseModalOpen: (open: boolean) => void;
  filters: {
    searchQuery: string;
    fromDate: string;
    toDate: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    searchQuery: string;
    fromDate: string;
    toDate: string;
  }>>;
  toast: ToastState | null;
  showToast: (toast: Omit<ToastState, 'id'>) => void;
  clearToast: () => void;
  saveCollection: (params: {
    customerId: string;
    date: string;
    paymentMethod: PaymentMethodType;
    account: string;
    referenceNo?: string;
    paymentAmount: number;
    remarks?: string;
    invoiceAllocations: Record<string, number>;
  }) => { success: boolean; voucherNo?: string; error?: string };
  processBulkCollectionBatch: (rows: BulkUploadRow[]) => {
    successCount: number;
    totalAmount: number;
    voucherNos: string[];
  };
  resetAllData: () => void;
}

const CreditCollectionContext = createContext<CreditCollectionContextType | undefined>(undefined);

export const CreditCollectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [vouchers, setVouchers] = useState<CollectionVoucher[]>(INITIAL_VOUCHERS);
  const [currentTab, setCurrentTab] = useState<TabType>('DUE_LIST');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeInvoiceForDrawer, setActiveInvoiceForDrawer] = useState<Invoice | null>(null);
  const [isInvoiceWiseModalOpen, setIsInvoiceWiseModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [filters, setFilters] = useState({
    searchQuery: '',
    fromDate: '2026-09-01',
    toDate: '2026-11-04',
  });

  const showToast = (toastData: Omit<ToastState, 'id'>) => {
    setToast({
      ...toastData,
      id: String(Date.now()),
    });
  };

  const clearToast = () => setToast(null);

  const resetAllData = () => {
    setCustomers(INITIAL_CUSTOMERS);
    setInvoices(INITIAL_INVOICES);
    setVouchers(INITIAL_VOUCHERS);
    setSelectedCustomer(null);
    setCurrentTab('DUE_LIST');
    showToast({
      type: 'info',
      title: 'Data Reset',
      message: 'All demo mock data has been restored to initial state.',
    });
  };

  /**
   * Saves a single-method collection voucher and updates invoices and customer balances.
   */
  const saveCollection = (params: {
    customerId: string;
    date: string;
    paymentMethod: PaymentMethodType;
    account: string;
    referenceNo?: string;
    paymentAmount: number;
    remarks?: string;
    invoiceAllocations: Record<string, number>;
  }) => {
    const customer = customers.find((c) => c.id === params.customerId);
    if (!customer) {
      return { success: false, error: 'Customer not found.' };
    }

    const paymentAmount = round2(Number(params.paymentAmount) || 0);
    const totalAllocated = round2(
      Object.values(params.invoiceAllocations).reduce((sum, amt) => sum + (Number(amt) || 0), 0)
    );

    if (paymentAmount <= 0) {
      return { success: false, error: 'Payment Amount must be greater than zero.' };
    }

    if (!params.account) {
      return { success: false, error: 'Please select an Account / Wallet from the dropdown.' };
    }

    if (Math.abs(paymentAmount - totalAllocated) > 0.01) {
      return {
        success: false,
        error: `Payment Amount (৳${paymentAmount.toLocaleString()}) does not match Total Allocated to Invoices (৳${totalAllocated.toLocaleString()}). Please click "+ Add (FIFO)" or adjust row values.`,
      };
    }

    if (totalAllocated > customer.dueAmount) {
      return {
        success: false,
        error: `Collection Amount (৳${totalAllocated.toLocaleString()}) exceeds Customer Total Due (৳${customer.dueAmount.toLocaleString()}).`,
      };
    }

    // Generate unique Voucher No: CRV-YYMMDD-XXXX
    const dateFormatted = params.date.replace(/-/g, '').slice(2);
    const voucherSeq = String(vouchers.length + 1).padStart(4, '0');
    const voucherNo = `CRV-${dateFormatted}-${voucherSeq}`;

    const methodsSummary = `${params.paymentMethod} (৳${paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })})`;

    const invoicesAffectedList: CollectionVoucher['invoicesAffected'] = [];

    // Update Invoices
    const updatedInvoices = invoices.map((inv) => {
      const allocated = params.invoiceAllocations[inv.id] || 0;
      if (allocated <= 0) return inv;

      const newCollected = round2(inv.previouslyCollected + allocated);
      const newDue = round2(Math.max(0, inv.creditAmount - newCollected - inv.returnAmount));
      const newStatus: InvoiceStatus = newDue <= 0 ? 'Paid' : 'Partially Paid';

      invoicesAffectedList.push({
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        amountCollected: allocated,
        remainingDue: newDue,
        statusAfter: newStatus,
      });

      return {
        ...inv,
        previouslyCollected: newCollected,
        dueAmount: newDue,
        status: newStatus,
        collectionHistory: [
          ...inv.collectionHistory,
          {
            voucherNo,
            date: params.date,
            amount: allocated,
            method: `${params.paymentMethod} (${params.account})`,
            reference: params.referenceNo || '',
            remarks: params.remarks,
          },
        ],
      };
    });

    // Update Customer
    const updatedCustomers = customers.map((c) => {
      if (c.id !== customer.id) return c;

      const newCollected = round2(c.collectedAmount + totalAllocated);
      const newDue = round2(Math.max(0, c.dueAmount - totalAllocated));

      return {
        ...c,
        collectedAmount: newCollected,
        dueAmount: newDue,
      };
    });

    // Create New Voucher
    const newVoucher: CollectionVoucher = {
      voucherNo,
      date: params.date,
      customerId: customer.id,
      customerCode: customer.customerCode,
      customerName: customer.customerName,
      customerMobile: customer.mobileNo,
      totalCollected: paymentAmount,
      paymentMethod: params.paymentMethod,
      account: params.account,
      referenceNo: params.referenceNo,
      methodsSummary,
      invoicesAffected: invoicesAffectedList,
      remarks: params.remarks || '',
      createdBy: 'Saddam Khan',
    };

    setInvoices(updatedInvoices);
    setCustomers(updatedCustomers);
    setVouchers([newVoucher, ...vouchers]);

    // Close collection screen and return to Due List
    setSelectedCustomer(null);

    // Show Toast
    showToast({
      type: 'success',
      title: 'Collection Saved Successfully!',
      message: `Received ৳${paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} via ${params.paymentMethod} from ${customer.customerName}. ${invoicesAffectedList.length} invoice(s) updated.`,
      voucherNo,
    });

    return { success: true, voucherNo };
  };

  /**
   * Processes a batch of valid rows from Bulk Excel Upload.
   */
  const processBulkCollectionBatch = (rows: BulkUploadRow[]) => {
    const validRows = rows.filter((r) => r.isValid && r.collectionAmount > 0);
    if (validRows.length === 0) {
      return { successCount: 0, totalAmount: 0, voucherNos: [] };
    }

    let runningInvoices = [...invoices];
    let runningCustomers = [...customers];
    let runningVouchers = [...vouchers];
    const generatedVouchers: string[] = [];
    let totalProcessedAmount = 0;

    validRows.forEach((row, idx) => {
      const customer = runningCustomers.find(
        (c) => c.customerCode === row.customerCode || c.id === row.matchedCustomer?.id
      );
      if (!customer) return;

      const dateStr = row.collectionDate || formatDateYMD(new Date());
      const dateFormatted = dateStr.replace(/-/g, '').slice(2);
      const voucherSeq = String(runningVouchers.length + 1 + idx).padStart(4, '0');
      const voucherNo = `CRV-${dateFormatted}-${voucherSeq}`;

      let allocations: Record<string, number> = {};
      const customerInvoices = runningInvoices.filter(
        (inv) => inv.customerId === customer.id && inv.dueAmount > 0
      );

      if (row.invoiceNo) {
        const targetInv = customerInvoices.find(
          (inv) => inv.invoiceNo.replace(/\s+/g, '') === row.invoiceNo.replace(/\s+/g, '')
        );
        if (targetInv) {
          allocations = allocateFIFO(customerInvoices, row.collectionAmount, targetInv.id).allocations;
        } else {
          allocations = allocateFIFO(customerInvoices, row.collectionAmount).allocations;
        }
      } else {
        allocations = allocateFIFO(customerInvoices, row.collectionAmount).allocations;
      }

      const allocatedTotal = round2(
        Object.values(allocations).reduce((sum, amt) => sum + (amt || 0), 0)
      );

      if (allocatedTotal <= 0) return;

      totalProcessedAmount = round2(totalProcessedAmount + allocatedTotal);
      generatedVouchers.push(voucherNo);

      const invoicesAffected: CollectionVoucher['invoicesAffected'] = [];

      runningInvoices = runningInvoices.map((inv) => {
        const alloc = allocations[inv.id] || 0;
        if (alloc <= 0) return inv;

        const newCollected = round2(inv.previouslyCollected + alloc);
        const newDue = round2(Math.max(0, inv.creditAmount - newCollected - inv.returnAmount));
        const newStatus: InvoiceStatus = newDue <= 0 ? 'Paid' : 'Partially Paid';

        invoicesAffected.push({
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          amountCollected: alloc,
          remainingDue: newDue,
          statusAfter: newStatus,
        });

        return {
          ...inv,
          previouslyCollected: newCollected,
          dueAmount: newDue,
          status: newStatus,
          collectionHistory: [
            ...inv.collectionHistory,
            {
              voucherNo,
              date: dateStr,
              amount: alloc,
              method: `${row.paymentMethod} (${row.account})`,
              reference: row.referenceNo,
              remarks: row.remarks,
            },
          ],
        };
      });

      runningCustomers = runningCustomers.map((c) => {
        if (c.id !== customer.id) return c;
        const newCollected = round2(c.collectedAmount + allocatedTotal);
        const newDue = round2(Math.max(0, c.dueAmount - allocatedTotal));
        return {
          ...c,
          collectedAmount: newCollected,
          dueAmount: newDue,
        };
      });

      runningVouchers = [
        {
          voucherNo,
          date: dateStr,
          customerId: customer.id,
          customerCode: customer.customerCode,
          customerName: customer.customerName,
          customerMobile: customer.mobileNo,
          totalCollected: allocatedTotal,
          paymentMethod: row.paymentMethod as PaymentMethodType,
          account: row.account,
          referenceNo: row.referenceNo,
          methodsSummary: `${row.paymentMethod} (৳${allocatedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
          invoicesAffected,
          remarks: `Bulk Upload: ${row.remarks || 'Processed via Excel'}`,
          createdBy: 'Saddam Khan',
        },
        ...runningVouchers,
      ];
    });

    setInvoices(runningInvoices);
    setCustomers(runningCustomers);
    setVouchers(runningVouchers);

    showToast({
      type: 'success',
      title: 'Bulk Collection Processed Successfully!',
      message: `Processed ${validRows.length} collection entries for total BDT ${totalProcessedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} across ${generatedVouchers.length} vouchers.`,
    });

    return {
      successCount: validRows.length,
      totalAmount: totalProcessedAmount,
      voucherNos: generatedVouchers,
    };
  };

  return (
    <CreditCollectionContext.Provider
      value={{
        customers,
        invoices,
        vouchers,
        currentTab,
        setCurrentTab,
        selectedCustomer,
        setSelectedCustomer,
        activeInvoiceForDrawer,
        setActiveInvoiceForDrawer,
        isInvoiceWiseModalOpen,
        setIsInvoiceWiseModalOpen,
        filters,
        setFilters,
        toast,
        showToast,
        clearToast,
        saveCollection,
        processBulkCollectionBatch,
        resetAllData,
      }}
    >
      {children}
    </CreditCollectionContext.Provider>
  );
};

export const useCreditCollection = (): CreditCollectionContextType => {
  const context = useContext(CreditCollectionContext);
  if (!context) {
    throw new Error('useCreditCollection must be used within a CreditCollectionProvider');
  }
  return context;
};
