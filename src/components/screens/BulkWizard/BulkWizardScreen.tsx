import React, { useState, useMemo } from 'react';
import { useCreditCollection } from '../../../context/CreditCollectionContext';
import { formatCurrency, formatDateDMY } from '../../../utils/format';
import { GLPicker } from '../../common/GLPicker';
import { allocateFIFO, calculateModeBAvailability } from '../../../utils/domain';
import { parseExcelFile, downloadBulkTemplate } from '../../../utils/excel';
import { Customer, Invoice, GLAccount } from '../../../types';
import {
  ArrowLeft,
  Filter,
  CheckSquare,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  ChevronDown,
  ChevronRight,
  Printer,
} from 'lucide-react';

export const BulkWizardScreen: React.FC = () => {
  const {
    customers,
    invoices,
    glAccounts,
    requests,
    glSetup,
    submitBulkWizardBatch,
    navigateTo,
  } = useCreditCollection();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // --- Step 1: Filter State ---
  const [dateType, setDateType] = useState<'invoiceDate' | 'dueDate'>('dueDate');
  const [fromDate, setFromDate] = useState('2026-09-01');
  const [toDate, setToDate] = useState('2026-11-30');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([
    'Factory Employees',
    'Office Staff',
    'Walk-in Credit',
  ]);
  const [minDueAmount, setMinDueAmount] = useState<string>('0');
  const [filterSearch, setFilterSearch] = useState('');

  // --- Step 2: Review Selection State ---
  // Map of customerId -> collectAmount
  const [customerCollectAmounts, setCustomerCollectAmounts] = useState<Record<string, number>>({});
  // Set of selected customerIds
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  // Expanded customer row in step 2
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  // --- Step 3: Settings State ---
  const [collectionMode, setCollectionMode] = useState<'Mode A' | 'Mode B'>('Mode B');
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState<'Bank' | 'Cash' | 'Wallet'>('Bank');
  const [selectedGLCode, setSelectedGLCode] = useState<string>(glSetup.defaultSettlementGL);
  const [collectionDate, setCollectionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNo, setReferenceNo] = useState<string>('JV-PAYROLL-2611');
  const [remarks, setRemarks] = useState<string>('Bulk factory payroll deduction batch');

  // --- Step 4 & 5: Submission & Result ---
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [createdBatchNo, setCreatedBatchNo] = useState<string>('');
  const [wizardError, setWizardError] = useState<string | null>(null);

  // Filtered customers matching Step 1 criteria
  const eligibleCustomers = useMemo(() => {
    return customers.filter((cust: Customer) => {
      if (cust.dueAmount <= 0) return false;
      if (!selectedGroups.includes(cust.customerGroup)) return false;
      if (cust.dueAmount < (parseFloat(minDueAmount) || 0)) return false;

      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase().trim();
        const matches =
          cust.customerName.toLowerCase().includes(q) ||
          cust.customerCode.toLowerCase().includes(q) ||
          cust.mobileNo.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [customers, selectedGroups, minDueAmount, filterSearch]);

  // Total summary of eligible customers
  const step1Summary = useMemo(() => {
    const custCount = eligibleCustomers.length;
    const totalDue = eligibleCustomers.reduce((s: number, c: Customer) => s + c.dueAmount, 0);
    const invoiceCount = invoices.filter(
      (i: Invoice) => i.dueAmount > 0 && eligibleCustomers.some((c: Customer) => c.id === i.customerId)
    ).length;
    return { custCount, totalDue, invoiceCount };
  }, [eligibleCustomers, invoices]);

  // Initialize Review step with all eligible selected
  const handleProceedToStep2 = () => {
    const newSelected = new Set<string>();
    const newAmounts: Record<string, number> = {};

    eligibleCustomers.forEach((c: Customer) => {
      newSelected.add(c.id);
      newAmounts[c.id] = c.dueAmount;
    });

    setSelectedCustomerIds(newSelected);
    setCustomerCollectAmounts(newAmounts);
    setStep(2);
  };

  // Step 2 toggle customer selection
  const handleToggleCustomer = (custId: string) => {
    const next = new Set(selectedCustomerIds);
    if (next.has(custId)) {
      next.delete(custId);
    } else {
      next.add(custId);
      const cust = customers.find((c: Customer) => c.id === custId);
      if (cust && !customerCollectAmounts[custId]) {
        setCustomerCollectAmounts((prev) => ({ ...prev, [custId]: cust.dueAmount }));
      }
    }
    setSelectedCustomerIds(next);
  };

  const handleSelectAllCustomers = (checked: boolean) => {
    if (checked) {
      const next = new Set<string>();
      const nextAmounts: Record<string, number> = { ...customerCollectAmounts };
      eligibleCustomers.forEach((c: Customer) => {
        next.add(c.id);
        if (!nextAmounts[c.id]) nextAmounts[c.id] = c.dueAmount;
      });
      setSelectedCustomerIds(next);
      setCustomerCollectAmounts(nextAmounts);
    } else {
      setSelectedCustomerIds(new Set());
    }
  };

  // Step 2 total selected batch amount
  const step2Totals = useMemo(() => {
    let totalAmount = 0;
    selectedCustomerIds.forEach((id) => {
      totalAmount += customerCollectAmounts[id] || 0;
    });
    return {
      customerCount: selectedCustomerIds.size,
      totalAmount,
    };
  }, [selectedCustomerIds, customerCollectAmounts]);

  // Mode B Availability calculation
  const settlementGL = useMemo(() => {
    return glAccounts.find((g: GLAccount) => g.code === selectedGLCode);
  }, [glAccounts, selectedGLCode]);

  const modeBAvailability = useMemo(() => {
    if (collectionMode !== 'Mode B' || !settlementGL) return null;
    return calculateModeBAvailability(settlementGL, requests);
  }, [collectionMode, settlementGL, requests]);

  // Excel Upload handler for Step 1
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedRows = await parseExcelFile(file, customers, invoices);
      const validRows = parsedRows.filter((r: any) => r.isValid && r.matchedCustomer);

      const newSelected = new Set<string>();
      const newAmounts: Record<string, number> = {};

      validRows.forEach((r: any) => {
        const cid = r.matchedCustomer!.id;
        newSelected.add(cid);
        newAmounts[cid] = (newAmounts[cid] || 0) + r.collectionAmount;
      });

      setSelectedCustomerIds(newSelected);
      setCustomerCollectAmounts(newAmounts);
      setStep(2);
    } catch (err: any) {
      setWizardError(`Excel parsing error: ${err.message}`);
    }
  };

  // Final Submission in Step 4
  const handleFinalSubmit = () => {
    setWizardError(null);

    const generatedBatchNo = `BC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // Build customer allocation records with per-invoice FIFO breakdown
    const customerAllocations = Array.from(selectedCustomerIds).map((custId) => {
      const collectAmount = customerCollectAmounts[custId] || 0;

      const custDueInvoices = invoices.filter(
        (i: Invoice) => i.customerId === custId && i.dueAmount > 0
      );

      const fifoResult = allocateFIFO(custDueInvoices, collectAmount);

      const invoiceAllocations = Object.keys(fifoResult.allocations).map((invId) => ({
        invoiceId: invId,
        collectNow: fifoResult.allocations[invId],
      }));

      return {
        customerId: custId,
        collectAmount,
        invoices: invoiceAllocations,
      };
    });

    const res = submitBulkWizardBatch({
      batchNo: generatedBatchNo,
      collectionDate,
      filterSummary: `${selectedGroups.join(', ')} | Mode: ${collectionMode}`,
      mode: collectionMode,
      glAccountCode: selectedGLCode,
      referenceNo,
      remarks,
      customerAllocations,
    });

    if (res.success) {
      setCreatedBatchNo(generatedBatchNo);
      setStep(5);
    } else {
      setWizardError(res.error || 'Failed to submit batch.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen text-slate-800">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('POS', 'MAIN')}
            className="p-1 rounded hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5 text-[#2F6FDE]" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Bulk Customer Credit Collection Wizard</span>
            </h1>
            <p className="text-xs text-slate-500">
              5-Step enterprise workflow: Filter, Review, Account Tagging, Accounting Preview & Authorization.
            </p>
          </div>
        </div>

        {/* 5-Step Progress Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {[
            { num: 1, label: 'Filter' },
            { num: 2, label: 'Review' },
            { num: 3, label: 'Settings' },
            { num: 4, label: 'Confirm' },
            { num: 5, label: 'Result' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                step === s.num
                  ? 'bg-[#2F6FDE] text-white shadow-xs'
                  : step > s.num
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              <span>{s.num}.</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto w-full space-y-4">
        {/* Error Alert */}
        {wizardError && (
          <div className="p-3 bg-red-600 text-white rounded-lg text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1">{wizardError}</div>
            <button onClick={() => setWizardError(null)} className="font-bold p-1">
              ✕
            </button>
          </div>
        )}

        {/* STEP 1: FILTER */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#2F6FDE]" />
                <h3 className="font-bold text-sm text-slate-800">
                  Step 1: Filter Outstanding Credit Invoices & Customers
                </h3>
              </div>

              {/* Download Template & Upload Excel buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={downloadBulkTemplate}
                  className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition border border-slate-300 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Excel Format</span>
                </button>

                <label className="cursor-pointer bg-[#2F6FDE] hover:bg-[#255cc0] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Excel File</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              {/* Date Filters */}
              <div className="space-y-3">
                <span className="font-bold text-slate-700 block">Date Range Filter</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={dateType === 'dueDate'}
                      onChange={() => setDateType('dueDate')}
                      className="text-[#2F6FDE]"
                    />
                    <span>Due Date</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={dateType === 'invoiceDate'}
                      onChange={() => setDateType('invoiceDate')}
                      className="text-[#2F6FDE]"
                    />
                    <span>Invoice Date</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">From</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">To</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-slate-800"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={overdueOnly}
                    onChange={(e) => setOverdueOnly(e.target.checked)}
                    className="rounded text-[#2F6FDE] w-4 h-4"
                  />
                  <span className="font-semibold text-rose-700">Only Overdue Dues</span>
                </label>
              </div>

              {/* Customer Groups */}
              <div className="space-y-3">
                <span className="font-bold text-slate-700 block">Customer Groups</span>
                {['Factory Employees', 'Office Staff', 'Walk-in Credit'].map((grp) => (
                  <label key={grp} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(grp)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedGroups([...selectedGroups, grp]);
                        else setSelectedGroups(selectedGroups.filter((g) => g !== grp));
                      }}
                      className="rounded text-[#2F6FDE] w-4 h-4"
                    />
                    <span className="text-slate-800 font-medium">{grp}</span>
                  </label>
                ))}
              </div>

              {/* Search & Min Amount */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Search Customer</label>
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Name, Code, Mobile..."
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Minimum Due Amount (৳)</label>
                  <input
                    type="number"
                    value={minDueAmount}
                    onChange={(e) => setMinDueAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-slate-800 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Live Filter Summary Card */}
            <div className="bg-blue-50/60 rounded-lg p-4 border border-blue-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-slate-500">Matching Customers:</span>
                  <span className="ml-2 font-bold text-slate-900 text-sm">
                    {step1Summary.custCount}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Total Dues:</span>
                  <span className="ml-2 font-bold text-red-600 text-sm">
                    ৳ {formatCurrency(step1Summary.totalDue)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleProceedToStep2}
                disabled={step1Summary.custCount === 0}
                className={`px-5 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                  step1Summary.custCount > 0
                    ? 'bg-[#2F6FDE] hover:bg-[#255cc0] text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Proceed to Review Customers ({step1Summary.custCount})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW CUSTOMERS */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-[#2F6FDE]" />
                  <span>Step 2: Review Customers & Allocate Amounts</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select customers and adjust collection amount. Unallocated dues are distributed oldest first (FIFO).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Back to Filter
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedCustomerIds.size === 0}
                  className="px-5 py-1.5 bg-[#2F6FDE] hover:bg-[#255cc0] text-white rounded text-xs font-bold transition flex items-center gap-1"
                >
                  <span>Continue to Settings</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Customer Table */}
            <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#DCEBFA] text-slate-800 font-semibold border-b border-[#cbdff4]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCustomerIds.size === eligibleCustomers.length}
                        onChange={(e) => handleSelectAllCustomers(e.target.checked)}
                        className="rounded text-[#2F6FDE] w-4 h-4"
                      />
                    </th>
                    <th className="py-2.5 px-3">Customer Code</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Group</th>
                    <th className="py-2.5 px-3">Mobile No</th>
                    <th className="py-2.5 px-3 text-right">Total Due</th>
                    <th className="py-2.5 px-3 text-right w-36">Collect Amount</th>
                    <th className="py-2.5 px-3 text-center">Invoices</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-slate-700">
                  {eligibleCustomers.map((cust: Customer) => {
                    const isChecked = selectedCustomerIds.has(cust.id);
                    const currentAmt = customerCollectAmounts[cust.id] ?? cust.dueAmount;
                    const custDueInvoices = invoices.filter(
                      (i: Invoice) => i.customerId === cust.id && i.dueAmount > 0
                    );

                    return (
                      <React.Fragment key={cust.id}>
                        <tr className={isChecked ? 'bg-blue-50/30' : 'opacity-60'}>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCustomer(cust.id)}
                              className="rounded text-[#2F6FDE] w-4 h-4"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono font-medium">{cust.customerCode}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {cust.customerName}
                          </td>
                          <td className="py-2 px-3">{cust.customerGroup}</td>
                          <td className="py-2 px-3 font-mono">{cust.mobileNo}</td>
                          <td className="py-2 px-3 text-right font-bold text-red-600">
                            ৳ {formatCurrency(cust.dueAmount)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              disabled={!isChecked}
                              value={currentAmt === 0 ? '' : currentAmt}
                              max={cust.dueAmount}
                              onChange={(e) => {
                                const val = Math.min(
                                  cust.dueAmount,
                                  Math.max(0, parseFloat(e.target.value) || 0)
                                );
                                setCustomerCollectAmounts((prev) => ({
                                  ...prev,
                                  [cust.id]: val,
                                }));
                              }}
                              className="w-28 text-right font-bold border border-blue-300 rounded px-2 py-1 text-slate-800"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCustomerId(
                                  expandedCustomerId === cust.id ? null : cust.id
                                )
                              }
                              className="text-blue-600 hover:underline flex items-center justify-center gap-0.5 mx-auto font-medium"
                            >
                              <span>{custDueInvoices.length} inv</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Invoice Breakdown */}
                        {expandedCustomerId === cust.id && (
                          <tr>
                            <td colSpan={8} className="bg-slate-50 p-3 pl-12 border-y border-blue-100">
                              <div className="text-[11px] font-bold text-slate-700 mb-1">
                                Outstanding Invoices for {cust.customerName}:
                              </div>
                              <div className="space-y-1">
                                {custDueInvoices.map((inv: Invoice) => (
                                  <div
                                    key={inv.id}
                                    className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200"
                                  >
                                    <span className="font-mono font-medium">#{inv.invoiceNo}</span>
                                    <span>Date: {formatDateDMY(inv.invoiceDate)}</span>
                                    <span>Due: ৳{formatCurrency(inv.dueAmount)}</span>
                                    {inv.pendingApprovalAmount > 0 && (
                                      <span className="text-amber-600 font-bold">
                                        (Reserved: ৳{formatCurrency(inv.pendingApprovalAmount)})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sticky Totals Bar */}
            <div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between text-xs font-bold border border-slate-300">
              <div className="flex items-center gap-6">
                <span>Selected Customers: {step2Totals.customerCount}</span>
                <span className="text-blue-700">
                  Total Collection Amount: ৳ {formatCurrency(step2Totals.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SETTINGS & GL TAGGING */}
        {step === 3 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#2F6FDE]" />
                <h3 className="font-bold text-sm text-slate-800">
                  Step 3: Collection Mode & Accounting GL Setup
                </h3>
              </div>
              <div className="text-xs text-slate-500">
                Batch Total: <span className="font-bold text-slate-800">৳{formatCurrency(step2Totals.totalAmount)}</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Collection Mode Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-2">
                  Select Collection Mode (Exact One Mode &amp; GL per Batch)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      collectionMode === 'Mode B'
                        ? 'border-purple-600 bg-purple-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={collectionMode === 'Mode B'}
                        onChange={() => {
                          setCollectionMode('Mode B');
                          setSelectedGLCode(glSetup.defaultSettlementGL);
                        }}
                        className="text-purple-600"
                      />
                      <span className="font-bold text-slate-900 text-sm">
                        Mode B: Settlement GL (Pre-Funded Clearing)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-5">
                      Deducted from company payroll or corporate settlement JV. Dynamic reservation check applied.
                    </p>
                  </label>

                  <label
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      collectionMode === 'Mode A'
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={collectionMode === 'Mode A'}
                        onChange={() => {
                          setCollectionMode('Mode A');
                          setSelectedGLCode(glSetup.defaultBankGL);
                        }}
                        className="text-blue-600"
                      />
                      <span className="font-bold text-slate-900 text-sm">
                        Mode A: Direct Bank / Cash / Wallet Receipt
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-5">
                      Single consolidated receiving GL (e.g. BRAC Bank A/C). Posts directly upon final authorization.
                    </p>
                  </label>
                </div>
              </div>

              {/* GL Picker */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                {collectionMode === 'Mode A' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Payment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bulkPaymentMethod}
                      onChange={(e) => {
                        const m = e.target.value as 'Bank' | 'Cash' | 'Wallet';
                        setBulkPaymentMethod(m);
                        if (m === 'Bank') setSelectedGLCode(glSetup.defaultBankGL || '2081');
                        else if (m === 'Cash') setSelectedGLCode(glSetup.defaultCashGL || '1000');
                        else if (m === 'Wallet') setSelectedGLCode(glSetup.defaultWalletGL || '0173');
                      }}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs mb-3"
                    >
                      <option value="Bank">Bank Account</option>
                      <option value="Cash">Cash Account</option>
                      <option value="Wallet">Mobile Financial Services (Wallet)</option>
                    </select>
                  </div>
                )}

                <GLPicker
                  label={
                    collectionMode === 'Mode B'
                      ? 'Settlement / Clearing GL Account'
                      : bulkPaymentMethod === 'Bank'
                      ? 'Deposit Bank GL Account'
                      : bulkPaymentMethod === 'Wallet'
                      ? 'Wallet MFS GL Account'
                      : 'Receiving Cash GL Account'
                  }
                  required
                  paymentMethod={collectionMode === 'Mode A' ? bulkPaymentMethod : undefined}
                  purposeTags={
                    collectionMode === 'Mode B'
                      ? ['Settlement/Clearing', 'Salary Deduction']
                      : ['Collection Receipt']
                  }
                  value={selectedGLCode}
                  onChange={setSelectedGLCode}
                />

                {/* Mode B Live Balance & Reservation Check */}
                {modeBAvailability && (
                  <div className="bg-white p-3 rounded border border-purple-200 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Settlement Balance:</span>
                      <span className="font-mono font-bold text-slate-800">
                        ৳ {formatCurrency(modeBAvailability.currentBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pending Request Reservations:</span>
                      <span className="font-mono text-amber-700">
                        -৳ {formatCurrency(modeBAvailability.pendingReservations)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-purple-100 pt-1">
                      <span className="text-purple-900">Available Balance:</span>
                      <span
                        className={`font-mono text-sm ${
                          modeBAvailability.availableBalance >= step2Totals.totalAmount
                            ? 'text-emerald-700'
                            : 'text-red-600'
                        }`}
                      >
                        ৳ {formatCurrency(modeBAvailability.availableBalance)}
                      </span>
                    </div>

                    {modeBAvailability.availableBalance < step2Totals.totalAmount && (
                      <p className="text-[11px] text-red-600 font-bold mt-1">
                        ⚠️ Insufficient available balance. Please deposit funds or click{' '}
                        <span className="underline cursor-pointer">Create Journal Voucher</span>.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Collection Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={collectionDate}
                    onChange={(e) => setCollectionDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Reference No (Payroll / JV No)
                  </label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. JV-PAYROLL-OCT"
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. October payroll deduction"
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Back to Review
              </button>

              <button
                onClick={() => setStep(4)}
                disabled={Boolean(
                  collectionMode === 'Mode B' &&
                  modeBAvailability &&
                  modeBAvailability.availableBalance < step2Totals.totalAmount
                )}
                className="px-6 py-2 bg-[#2F6FDE] hover:bg-[#255cc0] text-white rounded text-xs font-bold shadow-xs transition"
              >
                Continue to Accounting Preview
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRM & ACCOUNTING PREVIEW */}
        {step === 4 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Step 4: Confirmation &amp; Accounting Journal Preview</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Preview the exact double-entry voucher that will post upon final authorization.
                </p>
              </div>

              <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded">
                Will Post upon Final Approval
              </span>
            </div>

            {/* Accounting Preview Voucher Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#DCEBFA] text-slate-800 font-semibold border-b border-[#cbdff4]">
                  <tr>
                    <th className="py-2.5 px-3">Chart Of Account No</th>
                    <th className="py-2.5 px-3">Chart Of Account Name</th>
                    <th className="py-2.5 px-3">Customer / Subledger</th>
                    <th className="py-2.5 px-3 text-right">Debit</th>
                    <th className="py-2.5 px-3 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-slate-700">
                  {/* Dr Line */}
                  <tr className="bg-emerald-50/20 font-medium">
                    <td className="py-2 px-3 font-mono">{selectedGLCode}</td>
                    <td className="py-2 px-3">{settlementGL?.name || selectedGLCode}</td>
                    <td className="py-2 px-3 text-slate-500">Consolidated Batch Receipt</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      ৳ {formatCurrency(step2Totals.totalAmount)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">—</td>
                  </tr>

                  {/* Cr Lines for each Customer */}
                  {Array.from(selectedCustomerIds).map((cid) => {
                    const cust = customers.find((c: Customer) => c.id === cid)!;
                    const amt = customerCollectAmounts[cid] || 0;
                    return (
                      <tr key={cid} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono">1200</td>
                        <td className="py-2 px-3">Accounts receivable : {cust.customerName}</td>
                        <td className="py-2 px-3">{cust.customerName}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">—</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                          ৳ {formatCurrency(amt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right uppercase text-slate-600">
                      Total:
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-blue-700">
                      ৳ {formatCurrency(step2Totals.totalAmount)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-blue-700">
                      ৳ {formatCurrency(step2Totals.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Validation Control Checks with Green Ticks */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Control Check: Total Debit (৳{formatCurrency(step2Totals.totalAmount)}) equals Total Credit.</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Reservation Check: Invoices will be reserved; zero-due customers will exit Due List on final approval.</span>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-center gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50/40 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={confirmedCheckbox}
                onChange={(e) => setConfirmedCheckbox(e.target.checked)}
                className="rounded text-[#2F6FDE] w-4 h-4"
              />
              <span>
                I confirm that I have reviewed the customer due allocations and accounting impact for ৳
                {formatCurrency(step2Totals.totalAmount)}.
              </span>
            </label>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Back to Settings
              </button>

              <button
                onClick={handleFinalSubmit}
                disabled={!confirmedCheckbox}
                className={`px-6 py-2.5 rounded text-xs font-bold transition shadow-xs ${
                  confirmedCheckbox
                    ? 'bg-[#2F6FDE] hover:bg-[#255cc0] text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Submit Bulk Collection for Authorization
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: RESULT */}
        {step === 5 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center space-y-6 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">
                Bulk Collection Batch Submitted for Approval!
              </h3>
              <p className="text-xs text-slate-500">
                Batch <span className="font-mono font-bold text-blue-700">{createdBatchNo}</span> has been dispatched to the Authorization Pipeline.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Batch Number:</span>
                <span className="font-mono font-bold text-slate-800">{createdBatchNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customers Included:</span>
                <span className="font-bold text-slate-800">{step2Totals.customerCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Collection Amount:</span>
                <span className="font-bold text-emerald-700 text-sm">
                  ৳ {formatCurrency(step2Totals.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Approval Stage:</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                  Pending L1 Approval
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Summary</span>
              </button>

              <button
                onClick={() => navigateTo('APPROVAL', 'DUE_APPROVAL_LIST')}
                className="px-5 py-2 bg-[#2F6FDE] hover:bg-[#255cc0] text-white rounded text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <span>View in Approval Screen</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
