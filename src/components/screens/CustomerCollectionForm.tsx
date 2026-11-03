import React, { useState, useMemo, useEffect } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { Customer, Invoice, PaymentMethodType } from '../../types';
import { PAYMENT_ACCOUNTS } from '../../data/mockData';
import { formatCurrency, formatDateDMY, formatDateYMD, getDaysDifference } from '../../utils/format';
import { allocateFIFO, round2 } from '../../utils/fifo';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Building2,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Check,
} from 'lucide-react';

interface CustomerCollectionFormProps {
  customer: Customer;
  onBack: () => void;
}

export const CustomerCollectionForm: React.FC<CustomerCollectionFormProps> = ({
  customer,
  onBack,
}) => {
  const { invoices, saveCollection, setActiveInvoiceForDrawer, showToast } =
    useCreditCollection();

  // All due invoices for this customer sorted by oldest date first
  const customerDueInvoices = useMemo(() => {
    return invoices
      .filter((inv) => inv.customerId === customer.id && inv.dueAmount > 0)
      .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());
  }, [invoices, customer.id]);

  // Total outstanding due across all invoices
  const totalDueAmount = useMemo(() => {
    return round2(customerDueInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0));
  }, [customerDueInvoices]);

  // Form Metadata
  const [collectionDate, setCollectionDate] = useState<string>(formatDateYMD(new Date()));
  const [remarks, setRemarks] = useState<string>('');

  // 1. Single Payment Method & Account DDL (One method per voucher transaction!)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Cash');
  const [selectedAccount, setSelectedAccount] = useState<string>(
    PAYMENT_ACCOUNTS['Cash'][0]
  );
  const [referenceNo, setReferenceNo] = useState<string>('');

  // Update account DDL selection when payment method changes
  useEffect(() => {
    const available = PAYMENT_ACCOUNTS[paymentMethod];
    if (available && available.length > 0) {
      setSelectedAccount(available[0]);
    }
    setReferenceNo(''); // Reset reference when method switches
  }, [paymentMethod]);

  // 2. Checkboxes
  const [isPayAll, setIsPayAll] = useState(false);
  const [isInvoiceWise, setIsInvoiceWise] = useState(false);

  // 3. Normal Mode: Cumulative Payment / Distribute Amount
  const [paymentAmount, setPaymentAmount] = useState<string>(
    customerDueInvoices[0]?.dueAmount ? String(customerDueInvoices[0].dueAmount) : ''
  );

  // 4. Invoices Selected for Invoice-Wise Mode
  const [selectedInvoicesList, setSelectedInvoicesList] = useState<Invoice[]>([]);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>('');
  const [invoiceDropdownValue, setInvoiceDropdownValue] = useState<string>('');

  // 5. Allocation map: invoiceId -> Collect Now amount
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const initialMap: Record<string, number> = {};
    if (customerDueInvoices.length > 0) {
      const firstInv = customerDueInvoices[0];
      initialMap[firstInv.id] = firstInv.dueAmount;
    }
    return initialMap;
  });

  // Error Banner State
  const [formError, setFormError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Invoices to display in the table:
  // - If Invoice-Wise mode: ONLY user-added invoices from the DDL
  // - If Normal mode: ALL due invoices for this customer
  const displayedInvoices = useMemo(() => {
    if (isInvoiceWise) {
      return selectedInvoicesList;
    }
    return customerDueInvoices;
  }, [isInvoiceWise, selectedInvoicesList, customerDueInvoices]);

  // Total allocated across displayed invoices
  const totalAllocatedNow = useMemo(() => {
    return round2(
      displayedInvoices.reduce((sum, inv) => sum + (Number(allocations[inv.id]) || 0), 0)
    );
  }, [displayedInvoices, allocations]);

  // Computed total payment amount:
  // In invoice-wise mode, paymentAmount matches totalAllocatedNow
  const activePaymentAmount = useMemo(() => {
    if (isInvoiceWise) {
      return totalAllocatedNow;
    }
    return round2(parseFloat(paymentAmount) || 0);
  }, [isInvoiceWise, totalAllocatedNow, paymentAmount]);

  const totalBalanceAfter = useMemo(() => {
    return round2(Math.max(0, totalDueAmount - totalAllocatedNow));
  }, [totalDueAmount, totalAllocatedNow]);

  const remainingCreditLimit = useMemo(() => {
    return round2(customer.creditLimit - totalBalanceAfter);
  }, [customer.creditLimit, totalBalanceAfter]);

  // Available invoices to add in invoice-wise DDL (not yet added)
  const availableInvoicesForDropdown = useMemo(() => {
    const addedIds = new Set(selectedInvoicesList.map((i) => i.id));
    return customerDueInvoices.filter((inv) => !addedIds.has(inv.id));
  }, [customerDueInvoices, selectedInvoicesList]);

  // Filtered dropdown invoices based on min 3 letters search
  const filteredDropdownInvoices = useMemo(() => {
    const q = invoiceSearchQuery.toLowerCase().trim();
    if (!q) return availableInvoicesForDropdown;
    return availableInvoicesForDropdown.filter(
      (inv) =>
        inv.invoiceNo.toLowerCase().includes(q) ||
        (inv.returnInvoices &&
          inv.returnInvoices.some((r) => r.returnInvoiceNo.toLowerCase().includes(q)))
    );
  }, [availableInvoicesForDropdown, invoiceSearchQuery]);

  // --- Handlers ---

  // Handle "Pay All?" toggle
  const handlePayAllToggle = (checked: boolean) => {
    setIsPayAll(checked);
    setFormError(null);

    if (isInvoiceWise) {
      // In invoice-wise mode, pay all allocated to currently selected invoices
      const newAllocs: Record<string, number> = { ...allocations };
      selectedInvoicesList.forEach((inv) => {
        newAllocs[inv.id] = inv.dueAmount;
      });
      setAllocations(newAllocs);
    } else {
      // In normal mode, pay full customer due across all invoices via FIFO
      setPaymentAmount(String(totalDueAmount));
      const result = allocateFIFO(customerDueInvoices, totalDueAmount);
      setAllocations(result.allocations);
    }
  };

  // Handle "Collect By Invoice Wise" toggle
  const handleInvoiceWiseToggle = (checked: boolean) => {
    setIsInvoiceWise(checked);
    setFormError(null);
    setIsPayAll(false);

    if (checked) {
      // Switched to Invoice-Wise mode:
      // Clear default table, start with empty list or first invoice
      setSelectedInvoicesList([]);
      const cleared: Record<string, number> = {};
      customerDueInvoices.forEach((i) => (cleared[i.id] = 0));
      setAllocations(cleared);
      setPaymentAmount('0');
    } else {
      // Switched back to Normal FIFO mode:
      setPaymentAmount(customerDueInvoices[0]?.dueAmount ? String(customerDueInvoices[0].dueAmount) : '');
      if (customerDueInvoices.length > 0) {
        const result = allocateFIFO(customerDueInvoices, customerDueInvoices[0].dueAmount);
        setAllocations(result.allocations);
      }
    }
  };

  // Add invoice in Invoice-Wise Mode
  const handleAddInvoiceFromDropdown = (invoiceId: string) => {
    if (!invoiceId) return;
    const invToAdd = customerDueInvoices.find((i) => i.id === invoiceId);
    if (!invToAdd) return;

    if (!selectedInvoicesList.some((i) => i.id === invToAdd.id)) {
      setSelectedInvoicesList((prev) => [...prev, invToAdd]);
      setAllocations((prev) => ({
        ...prev,
        [invToAdd.id]: invToAdd.dueAmount, // Auto-fill with due amount for convenience
      }));
    }

    setInvoiceDropdownValue('');
    setInvoiceSearchQuery('');
    setFormError(null);
  };

  // Remove invoice row in Invoice-Wise Mode
  const handleRemoveInvoiceRow = (invId: string) => {
    setSelectedInvoicesList((prev) => prev.filter((i) => i.id !== invId));
    setAllocations((prev) => {
      const updated = { ...prev };
      delete updated[invId];
      return updated;
    });
  };

  // FIFO Distribute Button in Normal Mode
  const handleDistributeFIFO = () => {
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) {
      setFormError('Please enter a Payment Amount greater than 0.');
      return;
    }
    if (amt > totalDueAmount) {
      setFormError(
        `Payment Amount (৳${formatCurrency(amt)}) cannot exceed Total Outstanding Due (৳${formatCurrency(totalDueAmount)}).`
      );
      return;
    }

    setFormError(null);
    const result = allocateFIFO(customerDueInvoices, amt);
    setAllocations(result.allocations);
  };

  // Clear Allocations Button
  const handleClear = () => {
    const cleared: Record<string, number> = {};
    customerDueInvoices.forEach((inv) => {
      cleared[inv.id] = 0;
    });
    setAllocations(cleared);
    setIsPayAll(false);
    if (!isInvoiceWise) {
      setPaymentAmount('');
    }
    setFormError(null);
  };

  // Manual change of Collect Now on a row
  const handleCollectNowChange = (invId: string, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    const inv = customerDueInvoices.find((i) => i.id === invId);

    if (inv && num > inv.dueAmount) {
      setFormError(
        `Amount entered (৳${formatCurrency(num)}) exceeds invoice #${inv.invoiceNo} due (৳${formatCurrency(inv.dueAmount)}).`
      );
    } else {
      setFormError(null);
    }

    setAllocations((prev) => {
      const updated = { ...prev, [invId]: num };
      // If normal mode and user manually edits rows, sync paymentAmount to match
      if (!isInvoiceWise) {
        const sum = Object.values(updated).reduce((s, a) => s + (a || 0), 0);
        setPaymentAmount(String(round2(sum)));
      }
      return updated;
    });
  };

  // Pre-Save Validation
  const handleInitiateSave = () => {
    setFormError(null);

    if (activePaymentAmount <= 0) {
      setFormError('Payment Amount must be greater than zero.');
      return;
    }

    if (!selectedAccount) {
      setFormError('Please select a valid Account / Wallet from the dropdown.');
      return;
    }

    if (paymentMethod === 'Bank' && !referenceNo.trim()) {
      setFormError('Instrument / Cheque No is required for Bank payment.');
      return;
    }

    if (paymentMethod === 'Wallet' && !referenceNo.trim()) {
      setFormError('Transaction Reference / OTP is required for Wallet payment.');
      return;
    }

    if (displayedInvoices.length === 0) {
      setFormError('Please add at least one invoice to collect against.');
      return;
    }

    if (totalAllocatedNow <= 0) {
      setFormError('Total Allocated to Invoices is ৳0.00. Please enter Collect Now amounts or click "+ Add (FIFO)".');
      return;
    }

    // Check equality between payment amount and distributed invoices
    if (Math.abs(activePaymentAmount - totalAllocatedNow) > 0.01) {
      setFormError(
        `Payment Amount (৳${formatCurrency(activePaymentAmount)}) does not match Total Allocated to Invoices (৳${formatCurrency(totalAllocatedNow)}). Click "+ Add (FIFO)" to synchronize.`
      );
      return;
    }

    // Check individual invoice limits
    for (const inv of displayedInvoices) {
      const alloc = allocations[inv.id] || 0;
      if (alloc > inv.dueAmount) {
        setFormError(
          `Allocation on invoice #${inv.invoiceNo} (৳${formatCurrency(alloc)}) exceeds due amount (৳${formatCurrency(inv.dueAmount)}).`
        );
        return;
      }
    }

    setShowConfirmModal(true);
  };

  // Confirm and Commit Save
  const handleConfirmSave = () => {
    const res = saveCollection({
      customerId: customer.id,
      date: collectionDate,
      paymentMethod,
      account: selectedAccount,
      referenceNo,
      paymentAmount: activePaymentAmount,
      remarks,
      invoiceAllocations: allocations,
    });

    if (res.success) {
      setShowConfirmModal(false);
      onBack();
    } else {
      setFormError(res.error || 'Failed to save collection');
      setShowConfirmModal(false);
      showToast({
        type: 'error',
        title: 'Collection Failed',
        message: res.error,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-screen text-slate-800">
      {/* Top Bar with Back Arrow and SAVE Button */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-14 z-20 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-md hover:bg-gray-100 text-slate-600 transition flex items-center gap-1.5 font-semibold text-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#2F6FDE]" />
            <span>Bill Payment / Credit Collection</span>
          </button>
          <span className="text-gray-300">|</span>
          <span className="font-bold text-sm text-slate-800">{customer.customerName}</span>
          <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
            {customer.customerCode}
          </span>
        </div>

        <button
          onClick={handleInitiateSave}
          className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white font-bold text-xs px-6 py-2 rounded flex items-center gap-2 shadow-sm transition uppercase tracking-wider"
        >
          <Save className="w-4 h-4" />
          <span>SAVE</span>
        </button>
      </div>

      <div className="p-6 space-y-4 max-w-7xl mx-auto w-full">
        {/* PROMINENT ERROR ALERT BANNER (High contrast, impossible to miss) */}
        {formError && (
          <div className="p-4 bg-red-600 text-white rounded-lg shadow-md flex items-start gap-3 animate-bounce-short">
            <AlertTriangle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-xs uppercase tracking-wider">Validation Error</h4>
              <p className="text-xs mt-0.5 font-medium leading-relaxed">{formError}</p>

              {/* One-click auto fix button if it's a mismatch */}
              {!isInvoiceWise && activePaymentAmount > 0 && totalAllocatedNow !== activePaymentAmount && (
                <button
                  type="button"
                  onClick={handleDistributeFIFO}
                  className="mt-2 text-xs font-bold bg-white text-red-700 px-3 py-1 rounded shadow-xs hover:bg-red-50 flex items-center gap-1 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Click here to Auto-Distribute ৳{formatCurrency(activePaymentAmount)} (FIFO)</span>
                </button>
              )}
            </div>
            <button
              onClick={() => setFormError(null)}
              className="text-white hover:text-red-200 font-bold p-1 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Header Summary Card (3 columns of label : value) */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {/* Column 1 */}
            <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Customer Name</span>
                <span className="font-semibold text-slate-800 text-right">{customer.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Customer Mobile No</span>
                <span className="font-mono font-medium text-slate-800">{customer.mobileNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Credit Limit</span>
                <span className="font-semibold text-slate-800">৳ {formatCurrency(customer.creditLimit)}</span>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Credit Sales</span>
                <span className="font-semibold text-slate-800">৳ {formatCurrency(customer.totalCreditSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Return Amount</span>
                <span className="font-medium text-slate-700">
                  {customer.returnAmount > 0 ? `-৳ ${formatCurrency(customer.returnAmount)}` : '0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Already Collected</span>
                <span className="font-semibold text-emerald-700">৳ {formatCurrency(customer.collectedAmount)}</span>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Total Due</span>
                <span className="font-bold text-red-600 text-sm">৳ {formatCurrency(customer.dueAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Remaining Credit Limit</span>
                <span className="font-semibold text-blue-700">৳ {formatCurrency(remainingCreditLimit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Credit Days</span>
                <span className="font-medium text-slate-800">{customer.creditDays} Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Collection Voucher Form & DDLs */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
            {/* Payment Method Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="Wallet">Wallet (bKash / Nagad / Rocket)</option>
              </select>
            </div>

            {/* Account DDL (Dependent on Payment Method) */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {paymentMethod === 'Bank'
                  ? 'Bank Account *'
                  : paymentMethod === 'Wallet'
                  ? 'Wallet Account (MFS) *'
                  : 'Cash Account *'}
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs truncate"
              >
                {PAYMENT_ACCOUNTS[paymentMethod].map((acc, idx) => (
                  <option key={idx} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>

            {/* Collection Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
              />
            </div>

            {/* Office */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Office <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded px-2.5 py-1.5 text-slate-700 font-medium">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>FairPrice (FP-01)</span>
              </div>
            </div>

            {/* Bank: Instrument / Cheque No (mandatory) */}
            {paymentMethod === 'Bank' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Instrument / Cheque No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="Cheque / instrument number"
                  className={`w-full text-xs border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 ${
                    !referenceNo.trim() ? 'border-red-300 bg-red-50/40' : 'border-gray-300'
                  }`}
                />
                {!referenceNo.trim() && (
                  <p className="text-[10px] text-red-500 mt-0.5">Required for Bank payment</p>
                )}
              </div>
            )}

            {/* Wallet: Transaction Ref / OTP (mandatory) */}
            {paymentMethod === 'Wallet' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Transaction Ref / OTP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="Transaction ID or OTP reference"
                  className={`w-full text-xs border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 ${
                    !referenceNo.trim() ? 'border-red-300 bg-red-50/40' : 'border-gray-300'
                  }`}
                />
                {!referenceNo.trim() && (
                  <p className="text-[10px] text-red-500 mt-0.5">Required for Wallet payment</p>
                )}
              </div>
            )}

            {/* Remarks */}
            <div className={paymentMethod === 'Cash' ? 'sm:col-span-2' : ''}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700">Remarks</label>
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Paperclip className="w-3 h-3" /> Attach
                </span>
              </div>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes"
                className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* 3. Action Controls: Amount & FIFO / Invoice-Wise Search */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            {/* LEFT SIDE: Either Normal Cumulative Input OR Invoice Search DDL */}
            {!isInvoiceWise ? (
              /* NORMAL MODE: Cumulative Amount + + Add (FIFO) */
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-semibold">Payment Amount:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-36 border border-gray-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDistributeFIFO}
                  className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white px-3.5 py-1.5 rounded font-bold shadow-xs transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add (FIFO)</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="bg-[#EF4444] hover:bg-[#dc2626] text-white px-3 py-1.5 rounded font-bold shadow-xs transition"
                >
                  ✕ Clear
                </button>

                {/* Parity Status Badge */}
                <div className="ml-2">
                  {Math.abs(activePaymentAmount - totalAllocatedNow) < 0.01 && activePaymentAmount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Allocated: ৳{formatCurrency(totalAllocatedNow)} (Balanced)</span>
                    </span>
                  ) : activePaymentAmount > totalAllocatedNow ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>৳{formatCurrency(activePaymentAmount - totalAllocatedNow)} unallocated. Click "+ Add (FIFO)".</span>
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              /* INVOICE-WISE MODE: Cumulative amount disappeared to make way for Invoice DDL! */
              <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-2xl">
                <span className="text-slate-700 font-bold whitespace-nowrap">Invoice:</span>

                {/* Invoice Search Dropdown (DDL) */}
                <div className="relative flex-1 min-w-[300px]">
                  <select
                    value={invoiceDropdownValue}
                    onChange={(e) => {
                      setInvoiceDropdownValue(e.target.value);
                      handleAddInvoiceFromDropdown(e.target.value);
                    }}
                    className="w-full border border-blue-400 rounded px-3 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="">Select / Search Invoice (min 3 letters)...</option>
                    {filteredDropdownInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        Invoice #{inv.invoiceNo} | Date: {formatDateDMY(inv.invoiceDate)} | Due: ৳{formatCurrency(inv.dueAmount)}
                        {inv.returnAmount > 0 ? ` (Return: ৳${formatCurrency(inv.returnAmount)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddInvoiceFromDropdown(invoiceDropdownValue)}
                  disabled={!invoiceDropdownValue}
                  className={`px-3.5 py-1.5 rounded font-bold shadow-xs transition flex items-center gap-1 ${
                    invoiceDropdownValue
                      ? 'bg-[#2F6FDE] text-white hover:bg-[#255cc0]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add</span>
                </button>

                <div className="text-[11px] text-slate-500 italic">
                  * Select an invoice to add into the collection table.
                </div>
              </div>
            )}

            {/* RIGHT SIDE: Checkboxes (NO Advance checkbox!) */}
            <div className="flex items-center gap-5 text-xs font-semibold text-slate-700">
              {/* Pay all? checkbox */}
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition">
                <input
                  type="checkbox"
                  checked={isPayAll}
                  onChange={(e) => handlePayAllToggle(e.target.checked)}
                  className="rounded text-[#2F6FDE] focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Pay all?</span>
              </label>

              {/* Collect By Invoice Wise checkbox */}
              <label className="flex items-center gap-1.5 cursor-pointer text-[#2F6FDE] hover:text-blue-800 transition">
                <input
                  type="checkbox"
                  checked={isInvoiceWise}
                  onChange={(e) => handleInvoiceWiseToggle(e.target.checked)}
                  className="rounded text-[#2F6FDE] focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-bold">Collect By Invoice Wise</span>
              </label>
            </div>
          </div>
        </div>

        {/* 4. Invoices Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2F6FDE]" />
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                {isInvoiceWise
                  ? `Selected Invoices for Collection (${selectedInvoicesList.length})`
                  : `Outstanding Credit Invoices (${customerDueInvoices.length})`}
              </h4>
            </div>
            <div className="text-[11px] text-slate-500">
              * Click any invoice number to inspect product lines and multi-wallet breakdown.
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse min-w-[1400px] text-xs">
              <thead className="sticky top-0 bg-[#DCEBFA] text-slate-800 font-semibold z-10 border-b border-[#cbdff4]">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12 font-semibold">SL</th>
                  {isInvoiceWise && (
                    <th className="py-2.5 px-3 text-center w-16 font-semibold">Action</th>
                  )}
                  <th className="py-2.5 px-3 font-semibold">Invoice No</th>
                  <th className="py-2.5 px-3 font-semibold">Return Inv / Ref</th>
                  <th className="py-2.5 px-3 font-semibold">Invoice Date</th>
                  <th className="py-2.5 px-3 font-semibold">Due Date</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Overdue / Days</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Gross</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Net</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-rose-700 bg-rose-50/50">
                    Return Amount
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold">Credit Amount</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Prev. Collected</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Due Amount</th>
                  <th className="py-2.5 px-3 text-right font-semibold w-36 bg-blue-100/60">
                    Collect Now
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold">Balance After</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Narration</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-slate-700">
                {displayedInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isInvoiceWise ? 17 : 16}
                      className="py-12 text-center text-slate-400"
                    >
                      {isInvoiceWise ? (
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Search className="w-8 h-8 text-slate-300" />
                          <p className="font-semibold text-slate-600">
                            No invoices selected yet.
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Use the Invoice dropdown above to search and add invoices into this table.
                          </p>
                        </div>
                      ) : (
                        'No pending dues found for this customer.'
                      )}
                    </td>
                  </tr>
                ) : (
                  displayedInvoices.map((inv, index) => {
                    const daysDiff = getDaysDifference(inv.dueDate);
                    const isOverdue = daysDiff < 0 && inv.dueAmount > 0;
                    const collectNow = allocations[inv.id] || 0;
                    const balanceAfter = round2(Math.max(0, inv.dueAmount - collectNow));
                    const statusAfter =
                      balanceAfter <= 0
                        ? 'Paid'
                        : collectNow > 0
                        ? 'Partially Paid'
                        : isOverdue
                        ? 'Overdue'
                        : 'Active';

                    return (
                      <tr
                        key={inv.id}
                        className={`transition-colors ${
                          isOverdue ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-blue-50/40'
                        }`}
                      >
                        {/* SL */}
                        <td className="py-2 px-3 text-center text-slate-500 font-medium">
                          {index + 1}
                        </td>

                        {/* Action: Delete in invoice-wise mode */}
                        {isInvoiceWise && (
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveInvoiceRow(inv.id)}
                              title="Remove invoice from collection list"
                              className="p-1 rounded text-red-500 hover:bg-red-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}

                        {/* Invoice No (clickable) */}
                        <td className="py-2 px-3 font-mono font-bold text-[#2F6FDE]">
                          <button
                            type="button"
                            onClick={() => setActiveInvoiceForDrawer(inv)}
                            className="hover:underline text-left flex items-center gap-1"
                            title="Click to view invoice details"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span>{inv.invoiceNo}</span>
                          </button>
                        </td>

                        {/* Return Inv / Ref (Displays all return invoice numbers) */}
                        <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">
                          {inv.returnInvoices && inv.returnInvoices.length > 0 ? (
                            <div className="flex flex-col gap-1 items-start">
                              {inv.returnInvoices.map((ret, rIdx) => (
                                <span
                                  key={rIdx}
                                  title={`Return Inv: ${ret.returnInvoiceNo} | Date: ${formatDateDMY(ret.returnDate)} | Amount: ৳${formatCurrency(ret.returnAmount)}${ret.reason ? ' | ' + ret.reason : ''}`}
                                  className="inline-flex items-center gap-1 font-bold text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 hover:bg-rose-100 transition cursor-help"
                                >
                                  <span>{ret.returnInvoiceNo}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-sans">—</span>
                          )}
                        </td>

                        {/* Invoice Date */}
                        <td className="py-2 px-3 text-slate-600">
                          {formatDateDMY(inv.invoiceDate)}
                        </td>

                        {/* Due Date */}
                        <td className="py-2 px-3 text-slate-600">
                          {formatDateDMY(inv.dueDate)}
                        </td>

                        {/* Overdue / Days */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOverdue
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isOverdue ? `${Math.abs(daysDiff)}d Overdue` : `${daysDiff}d Left`}
                          </span>
                        </td>

                        {/* Gross */}
                        <td className="py-2 px-3 text-right text-slate-600">
                          {formatCurrency(inv.grossAmount)}
                        </td>

                        {/* Net */}
                        <td className="py-2 px-3 text-right text-slate-700 font-medium">
                          {formatCurrency(inv.netAmount)}
                        </td>

                        {/* Return Amount Column */}
                        <td className="py-2 px-3 text-right font-semibold bg-rose-50/40 text-rose-700">
                          {inv.returnAmount > 0 ? `-${formatCurrency(inv.returnAmount)}` : '0.00'}
                        </td>

                        {/* Credit Amount */}
                        <td className="py-2 px-3 text-right font-medium text-slate-700">
                          {formatCurrency(inv.creditAmount)}
                        </td>

                        {/* Previously Collected */}
                        <td className="py-2 px-3 text-right text-emerald-700 font-medium">
                          {formatCurrency(inv.previouslyCollected)}
                        </td>

                        {/* Due Amount */}
                        <td className="py-2 px-3 text-right font-bold text-red-600">
                          {formatCurrency(inv.dueAmount)}
                        </td>

                        {/* Collect Now (Editable input) */}
                        <td className="py-1.5 px-3 text-right bg-blue-50/50">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={inv.dueAmount}
                            value={collectNow === 0 ? '' : collectNow}
                            onChange={(e) => handleCollectNowChange(inv.id, e.target.value)}
                            placeholder="0.00"
                            className="w-28 text-right font-bold text-[#2F6FDE] border border-blue-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Balance After */}
                        <td className="py-2 px-3 text-right font-bold text-slate-800">
                          {formatCurrency(balanceAfter)}
                        </td>

                        {/* Status Badge */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              statusAfter === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : statusAfter === 'Partially Paid'
                                ? 'bg-amber-100 text-amber-800'
                                : statusAfter === 'Overdue'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {statusAfter}
                          </span>
                        </td>

                        {/* Narration */}
                        <td className="py-2 px-3 text-slate-500 max-w-xs truncate">
                          {inv.narration || 'Credit invoice'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Sticky Footer Row with Totals */}
              {displayedInvoices.length > 0 && (
                <tfoot className="sticky bottom-0 bg-[#F0F5FC] text-slate-800 font-bold border-t-2 border-[#cbdff4] z-10 shadow-inner">
                  <tr>
                    <td
                      colSpan={isInvoiceWise ? 12 : 11}
                      className="py-2.5 px-3 text-right font-bold uppercase tracking-wider text-slate-700"
                    >
                      Totals:
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600">
                      ৳ {formatCurrency(displayedInvoices.reduce((s, i) => s + i.dueAmount, 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-[#2F6FDE] text-sm bg-blue-100/50">
                      ৳ {formatCurrency(totalAllocatedNow)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-800">
                      ৳ {formatCurrency(totalBalanceAfter)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#2F6FDE] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-800">Confirm Credit Collection</h3>
                <p className="text-xs text-slate-500">
                  Please verify the transaction summary before posting.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3.5 space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-800">{customer.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold text-slate-800">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Deposit Account:</span>
                <span className="font-medium text-slate-700 text-right max-w-xs truncate">
                  {selectedAccount}
                </span>
              </div>
              {referenceNo && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Ref / Cheque No:</span>
                  <span className="font-mono text-slate-700">{referenceNo}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1.5">
                <span className="text-slate-700">Total Collection Amount:</span>
                <span className="text-emerald-700">৳ {formatCurrency(activePaymentAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1.5">
                <span>Customer Remaining Due:</span>
                <span className="font-bold text-red-600">৳ {formatCurrency(totalBalanceAfter)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-5 py-2 bg-[#2F6FDE] hover:bg-[#255cc0] text-white rounded text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Confirm & Post Collection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
