import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  Customer,
  Invoice,
  GLAccount,
  CollectionRequest,
  BulkBatch,
  JournalVoucher,
  GLSetupConfig,
  AppUser,
  TabType,
  PaymentMethodType,
} from '../types';
import {
  INITIAL_CUSTOMERS,
  INITIAL_INVOICES,
  INITIAL_GL_ACCOUNTS,
  INITIAL_GL_SETUP,
  INITIAL_REQUESTS,
  INITIAL_BATCHES,
  INITIAL_VOUCHERS,
  APP_USERS,
} from '../data/mockData';
import {
  round2,
  isDateInLockedPeriod,
  validateReservationConflict,
  calculateModeBAvailability,
  detectStaleInvoices,
  calculateRequiredLevels,
  validateMakerChecker,
  generateSingleDueReceiveVoucher,
  generateReversalVoucher,
} from '../utils/domain';

export interface ToastState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  voucherNo?: string;
}

export type ScreenType =
  | 'MAIN'
  | 'COLLECT_SINGLE'
  | 'BULK_WIZARD'
  | 'APPROVAL_DASHBOARD'
  | 'DUE_APPROVAL_LIST'
  | 'GL_SETUP'
  | 'APPROVAL_CONFIG'
  | 'AR_LEDGER';

interface CreditCollectionContextType {
  // Navigation & Screen State
  currentModule: 'POS' | 'APPROVAL';
  currentScreen: ScreenType;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  navigateTo: (module: 'POS' | 'APPROVAL', screen: ScreenType) => void;

  // Users & Auth
  users: AppUser[];
  currentUser: AppUser;
  switchUser: (userId: string) => void;

  // Data
  customers: Customer[];
  invoices: Invoice[];
  glAccounts: GLAccount[];
  requests: CollectionRequest[];
  batches: BulkBatch[];
  vouchers: JournalVoucher[];
  glSetup: GLSetupConfig;
  updateGLSetup: (setup: Partial<GLSetupConfig>) => void;
  addNewGLAccount: (account: Omit<GLAccount, 'id' | 'balance'>) => void;

  // Active Modals & Selections
  selectedCustomer: Customer | null;
  setSelectedCustomer: (cust: Customer | null) => void;
  activeInvoiceForDrawer: Invoice | null;
  setActiveInvoiceForDrawer: (inv: Invoice | null) => void;
  activeJournalVoucher: JournalVoucher | null;
  setActiveJournalVoucher: (voucher: JournalVoucher | null) => void;
  rejectDialogRequest: CollectionRequest | null;
  setRejectDialogRequest: (req: CollectionRequest | null) => void;
  isNewGLModalOpen: boolean;
  setIsNewGLModalOpen: (open: boolean) => void;
  isInvoiceWiseModalOpen: boolean;
  setIsInvoiceWiseModalOpen: (open: boolean) => void;

  // Global Toast
  toast: ToastState | null;
  showToast: (toast: Omit<ToastState, 'id'>) => void;
  clearToast: () => void;

  // Filters
  filters: {
    from: string;
    to: string;
    searchQuery: string;
    customerGroup: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    from: string;
    to: string;
    searchQuery: string;
    customerGroup: string;
  }>>;

  // Approval tile dynamic count
  pendingApprovalCountForCurrentUser: number;

  // Actions
  submitSingleCollection: (params: {
    customerId: string;
    date: string;
    mode: 'Mode A' | 'Mode B';
    paymentMethod?: PaymentMethodType;
    glAccountCode: string;
    referenceNo?: string;
    amount: number;
    remarks?: string;
    invoiceAllocations: Record<string, number>;
    paymentLines?: {
      method: PaymentMethodType;
      glAccountCode: string;
      glAccountName: string;
      referenceNo: string;
      amount: number;
    }[];
  }) => { success: boolean; requestNo?: string; error?: string };

  submitBulkWizardBatch: (params: {
    batchNo: string;
    collectionDate: string;
    filterSummary: string;
    mode: 'Mode A' | 'Mode B';
    glAccountCode: string;
    referenceNo?: string;
    remarks?: string;
    customerAllocations: {
      customerId: string;
      collectAmount: number;
      invoices: { invoiceId: string; collectNow: number }[];
    }[];
  }) => { success: boolean; batchNo?: string; error?: string };

  approveRequest: (
    requestId: string,
    comment?: string
  ) => { success: boolean; message: string; voucherNo?: string; isFinalApproval?: boolean };

  bulkApproveRequests: (
    requestIds: string[]
  ) => { total: number; approved: number; failed: number; results: string[] };

  rejectRequest: (requestId: string, reason: string) => { success: boolean; message: string };

  approveBatch: (
    batchId: string,
    comment?: string
  ) => { success: boolean; message: string; voucherNo?: string };

  rejectBatch: (batchId: string, reason: string) => { success: boolean; message: string };

  reverseVoucherAction: (voucherNo: string, reason: string) => { success: boolean; message: string };

  // Dev Helpers
  simulateStalePOSCollection: (customerId: string) => void;
  forceFailureRollbackToggle: boolean;
  setForceFailureRollbackToggle: (force: boolean) => void;
  resetAllMockData: () => void;
}

const CreditCollectionContext = createContext<CreditCollectionContextType | undefined>(undefined);

export const CreditCollectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [currentModule, setCurrentModule] = useState<'POS' | 'APPROVAL'>('POS');
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('MAIN');
  const [activeTab, setActiveTab] = useState<TabType>('DUE_LIST');

  // Users & Auth (Default: Saddam Khan - Collector)
  const [users] = useState<AppUser[]>(APP_USERS);
  const [currentUser, setCurrentUser] = useState<AppUser>(APP_USERS[0]);

  // Core State
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>(INITIAL_GL_ACCOUNTS);
  const [glSetup, setGlSetup] = useState<GLSetupConfig>(INITIAL_GL_SETUP);
  const [requests, setRequests] = useState<CollectionRequest[]>(INITIAL_REQUESTS);
  const [batches, setBatches] = useState<BulkBatch[]>(INITIAL_BATCHES);
  const [vouchers, setVouchers] = useState<JournalVoucher[]>(INITIAL_VOUCHERS);

  // Modals & Drawers
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeInvoiceForDrawer, setActiveInvoiceForDrawer] = useState<Invoice | null>(null);
  const [activeJournalVoucher, setActiveJournalVoucher] = useState<JournalVoucher | null>(null);
  const [rejectDialogRequest, setRejectDialogRequest] = useState<CollectionRequest | null>(null);
  const [isNewGLModalOpen, setIsNewGLModalOpen] = useState(false);
  const [isInvoiceWiseModalOpen, setIsInvoiceWiseModalOpen] = useState(false);

  // Dev controls
  const [forceFailureRollbackToggle, setForceFailureRollbackToggle] = useState(false);

  // Global Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  // Global Filters
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    searchQuery: '',
    customerGroup: 'ALL',
  });

  const showToast = (t: Omit<ToastState, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToast({ ...t, id });
  };

  const clearToast = () => setToast(null);

  const navigateTo = (module: 'POS' | 'APPROVAL', screen: ScreenType) => {
    setCurrentModule(module);
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      showToast({
        type: 'info',
        title: `Switched User to ${user.name}`,
        message: `Role: ${user.role} (${user.level || 'No level'}) at Office ${user.office}`,
      });
    }
  };

  const updateGLSetup = (newSetup: Partial<GLSetupConfig>) => {
    setGlSetup((prev) => ({ ...prev, ...newSetup }));
    showToast({
      type: 'success',
      title: 'GL Setup Updated',
      message: 'Credit Collection GL configurations and thresholds saved.',
    });
  };

  const addNewGLAccount = (newAcc: Omit<GLAccount, 'id' | 'balance'>) => {
    const acc: GLAccount = {
      ...newAcc,
      id: `gl-${newAcc.code}`,
      balance: 0,
    };
    setGlAccounts((prev) => [...prev, acc]);
    showToast({
      type: 'success',
      title: 'New GL Account Created',
      message: `${acc.code} - ${acc.name} added under ${acc.category}.`,
    });
  };

  // Dynamic Pending Approval count for current logged-in approver:
  // Shows count of requests waiting specifically for this user's level (and where user is not creator)
  const pendingApprovalCountForCurrentUser = useMemo(() => {
    if (currentUser.role === 'Collector' || currentUser.role === 'Viewer') {
      return requests.filter((r) => r.status === 'Pending').length;
    }
    const userLevel = currentUser.level || 'L1';
    return requests.filter(
      (r) =>
        r.status === 'Pending' &&
        r.currentLevel === userLevel &&
        r.createdById !== currentUser.id // Maker-checker exclusion
    ).length;
  }, [requests, currentUser]);

  // Submit Single Customer Collection Request
  const submitSingleCollection = (params: {
    customerId: string;
    date: string;
    mode: 'Mode A' | 'Mode B';
    paymentMethod?: PaymentMethodType;
    glAccountCode: string;
    referenceNo?: string;
    amount: number;
    remarks?: string;
    invoiceAllocations: Record<string, number>;
    paymentLines?: {
      method: PaymentMethodType;
      glAccountCode: string;
      glAccountName: string;
      referenceNo: string;
      amount: number;
    }[];
  }) => {
    const customer = customers.find((c) => c.id === params.customerId);
    if (!customer) return { success: false, error: 'Customer not found.' };

    // 1. Locked Period Check
    if (isDateInLockedPeriod(params.date)) {
      return {
        success: false,
        error: `Accounting period is locked prior to 01-10-2026. Cannot submit collection dated ${params.date}.`,
      };
    }

    // 2. Mode B Availability Check
    if (params.mode === 'Mode B') {
      const settlementGL = glAccounts.find((g) => g.code === params.glAccountCode);
      if (!settlementGL) {
        return { success: false, error: 'Selected Settlement GL not found.' };
      }
      const availability = calculateModeBAvailability(settlementGL, requests);
      if (params.amount > availability.availableBalance) {
        return {
          success: false,
          error: `Insufficient available balance in Settlement GL ${settlementGL.name}. Available: ৳${availability.availableBalance.toLocaleString(
            'en-US',
            { minimumFractionDigits: 2 }
          )}. (Balance: ৳${availability.currentBalance.toLocaleString()}, Reserved: ৳${availability.pendingReservations.toLocaleString()}).`,
        };
      }
    }

    // 3. Reservation Conflict Check
    const targetedInvoiceIds = Object.keys(params.invoiceAllocations).filter(
      (id) => (params.invoiceAllocations[id] || 0) > 0
    );
    const conflict = validateReservationConflict(targetedInvoiceIds, requests);
    if (conflict.hasConflict) {
      return {
        success: false,
        error: `One or more selected invoices are already reserved by pending request(s): ${conflict.conflictingRequestNos.join(
          ', '
        )}.`,
      };
    }

    const glAccount = glAccounts.find((g) => g.code === params.glAccountCode);
    const glAccountName = glAccount ? glAccount.name : params.glAccountCode;

    const requestNo = `CRQ-2611-${Math.floor(1000 + Math.random() * 9000)}`;
    const requiredLevels = calculateRequiredLevels(params.amount, glSetup);

    const invoicesAffectedList = targetedInvoiceIds.map((invId) => {
      const inv = invoices.find((i) => i.id === invId)!;
      const collectNow = round2(params.invoiceAllocations[invId]);
      return {
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        grossAmount: inv.grossAmount,
        netAmount: inv.netAmount,
        dueAmount: inv.dueAmount,
        collectNow,
        balanceAfter: round2(Math.max(0, inv.dueAmount - collectNow)),
      };
    });

    const invNosComma = invoicesAffectedList.map((i) => i.invoiceNo).join(',');
    const narration = `Due Receive from ${customer.customerName} Invoice(s): ${invNosComma}`;

    const newRequest: CollectionRequest = {
      id: `req-${Date.now()}`,
      requestNo,
      requestDate: new Date().toISOString().split('T')[0],
      collectionDate: params.date,
      type: 'Single',
      customerId: customer.id,
      customerCode: customer.customerCode,
      customerName: customer.customerName,
      customerGroup: customer.customerGroup,
      customerMobile: customer.mobileNo,
      mode: params.mode,
      glAccountCode: params.glAccountCode,
      glAccountName,
      paymentLines: params.paymentLines?.map((l, idx) => ({ ...l, id: `pl-${idx + 1}` })),
      amount: round2(params.amount),
      remarks: params.remarks || '',
      narration,
      createdBy: currentUser.name,
      createdById: currentUser.id,
      status: 'Pending',
      currentLevel: 'L1',
      requiredLevels,
      approvalTrail: [
        {
          level: 'L1',
          approverId: currentUser.id,
          approverName: currentUser.name,
          action: 'Approve',
          timestamp: new Date().toLocaleString(),
          comment: 'Submitted for approval',
        },
      ],
      invoicesAffected: invoicesAffectedList,
    };

    // Reserve Invoice Amounts (Does not post to GL yet!)
    setInvoices((prev) =>
      prev.map((inv) => {
        const alloc = params.invoiceAllocations[inv.id] || 0;
        if (alloc > 0) {
          const newPending = round2(inv.pendingApprovalAmount + alloc);
          const newDue = round2(Math.max(0, inv.effectiveDueAmount - newPending));
          return {
            ...inv,
            pendingApprovalAmount: newPending,
            dueAmount: newDue,
          };
        }
        return inv;
      })
    );

    // Reserve Customer Pending Amount (Keep customer active in Due List until approved)
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customer.id) {
          const newPending = round2(c.pendingApprovalAmount + params.amount);
          return {
            ...c,
            pendingApprovalAmount: newPending,
          };
        }
        return c;
      })
    );

    setRequests((prev) => [newRequest, ...prev]);
    setSelectedCustomer(null);

    showToast({
      type: 'success',
      title: 'Collection Request Submitted for Approval',
      message: `Request #${requestNo} for ৳${params.amount.toLocaleString(
        'en-US'
      )} has been submitted. Status: Pending L1 Approval. Funds and invoices reserved.`,
    });

    return { success: true, requestNo };
  };

  // Submit Bulk Wizard Batch Request
  const submitBulkWizardBatch = (params: {
    batchNo: string;
    collectionDate: string;
    filterSummary: string;
    mode: 'Mode A' | 'Mode B';
    glAccountCode: string;
    referenceNo?: string;
    remarks?: string;
    customerAllocations: {
      customerId: string;
      collectAmount: number;
      invoices: { invoiceId: string; collectNow: number }[];
    }[];
  }) => {
    // 1. Locked Period
    if (isDateInLockedPeriod(params.collectionDate)) {
      return {
        success: false,
        error: `Accounting period is locked prior to 01-10-2026. Cannot submit batch dated ${params.collectionDate}.`,
      };
    }

    const totalBatchAmount = round2(
      params.customerAllocations.reduce((sum, c) => sum + c.collectAmount, 0)
    );

    // 2. Mode B Availability
    if (params.mode === 'Mode B') {
      const settlementGL = glAccounts.find((g) => g.code === params.glAccountCode);
      if (!settlementGL) return { success: false, error: 'Settlement GL not found.' };

      const availability = calculateModeBAvailability(settlementGL, requests);
      if (totalBatchAmount > availability.availableBalance) {
        return {
          success: false,
          error: `Insufficient available balance in Settlement GL ${settlementGL.name}. Required: ৳${totalBatchAmount.toLocaleString()}, Available: ৳${availability.availableBalance.toLocaleString()}.`,
        };
      }
    }

    const glAccount = glAccounts.find((g) => g.code === params.glAccountCode);
    const glAccountName = glAccount ? glAccount.name : params.glAccountCode;

    const requiredLevels = calculateRequiredLevels(totalBatchAmount, glSetup);
    const batchId = `batch-${Date.now()}`;

    const newRequestsList: CollectionRequest[] = [];
    const updatedInvoiceMap: Record<string, number> = {};
    const updatedCustMap: Record<string, number> = {};

    params.customerAllocations.forEach((custAlloc, idx) => {
      const customer = customers.find((c) => c.id === custAlloc.customerId)!;
      const reqNo = `CRQ-B-${params.batchNo.replace('BC-', '')}-${idx + 1}`;

      const invoicesAffectedList = custAlloc.invoices.map((invItem) => {
        const inv = invoices.find((i) => i.id === invItem.invoiceId)!;
        updatedInvoiceMap[inv.id] = (updatedInvoiceMap[inv.id] || 0) + invItem.collectNow;
        return {
          invoiceId: inv.id,
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          grossAmount: inv.grossAmount,
          netAmount: inv.netAmount,
          dueAmount: inv.dueAmount,
          collectNow: invItem.collectNow,
          balanceAfter: round2(Math.max(0, inv.dueAmount - invItem.collectNow)),
        };
      });

      updatedCustMap[customer.id] = (updatedCustMap[customer.id] || 0) + custAlloc.collectAmount;

      const req: CollectionRequest = {
        id: `req-b-${Date.now()}-${idx}`,
        requestNo: reqNo,
        requestDate: new Date().toISOString().split('T')[0],
        collectionDate: params.collectionDate,
        type: 'Bulk',
        batchId,
        batchNo: params.batchNo,
        customerId: customer.id,
        customerCode: customer.customerCode,
        customerName: customer.customerName,
        customerGroup: customer.customerGroup,
        customerMobile: customer.mobileNo,
        mode: params.mode,
        glAccountCode: params.glAccountCode,
        glAccountName,
        amount: custAlloc.collectAmount,
        remarks: params.remarks || '',
        narration: `Bulk Due Receive Batch ${params.batchNo} (${customer.customerName})`,
        createdBy: currentUser.name,
        createdById: currentUser.id,
        status: 'Pending',
        currentLevel: 'L1',
        requiredLevels,
        approvalTrail: [
          {
            level: 'L1',
            approverId: currentUser.id,
            approverName: currentUser.name,
            action: 'Approve',
            timestamp: new Date().toLocaleString(),
            comment: 'Submitted via Bulk Wizard',
          },
        ],
        invoicesAffected: invoicesAffectedList,
      };

      newRequestsList.push(req);
    });

    const newBatch: BulkBatch = {
      id: batchId,
      batchNo: params.batchNo,
      date: new Date().toISOString().split('T')[0],
      collectionDate: params.collectionDate,
      filterSummary: params.filterSummary,
      mode: params.mode,
      glAccountCode: params.glAccountCode,
      glAccountName,
      referenceNo: params.referenceNo,
      totalAmount: totalBatchAmount,
      totalCustomers: params.customerAllocations.length,
      totalInvoices: Object.keys(updatedInvoiceMap).length,
      status: 'Pending',
      currentLevel: 'L1',
      requiredLevels,
      requestIds: newRequestsList.map((r) => r.id),
      approvalTrail: [
        {
          level: 'L1',
          approverId: currentUser.id,
          approverName: currentUser.name,
          action: 'Approve',
          timestamp: new Date().toLocaleString(),
          comment: 'Bulk Batch Submitted for L1 approval',
        },
      ],
      voucherNos: [],
      remarks: params.remarks || '',
      createdBy: currentUser.name,
      createdById: currentUser.id,
    };

    // Apply Reservations
    setInvoices((prev) =>
      prev.map((inv) => {
        const alloc = updatedInvoiceMap[inv.id] || 0;
        if (alloc > 0) {
          const newPending = round2(inv.pendingApprovalAmount + alloc);
          const newDue = round2(Math.max(0, inv.effectiveDueAmount - newPending));
          return { ...inv, pendingApprovalAmount: newPending, dueAmount: newDue };
        }
        return inv;
      })
    );

    setCustomers((prev) =>
      prev.map((c) => {
        const alloc = updatedCustMap[c.id] || 0;
        if (alloc > 0) {
          const newPending = round2(c.pendingApprovalAmount + alloc);
          return { ...c, pendingApprovalAmount: newPending };
        }
        return c;
      })
    );

    setRequests((prev) => [...newRequestsList, ...prev]);
    setBatches((prev) => [newBatch, ...prev]);

    return { success: true, batchNo: params.batchNo };
  };

  // Approve a single request (or a batch request)
  const approveRequest = (
    requestId: string,
    comment?: string
  ): { success: boolean; message: string; voucherNo?: string; isFinalApproval?: boolean } => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return { success: false, message: 'Request not found.' };

    if (req.status !== 'Pending') {
      return { success: false, message: `Request is already ${req.status}. Idempotent safety engaged.` };
    }

    // 1. Maker-Checker Rule: Auto-switch to L1 approver if logged in as creator
    if (req.createdById === currentUser.id && currentUser.role === 'Collector') {
      const approver = users.find((u) => u.level === 'L1') || APP_USERS[1];
      setCurrentUser(approver);
      showToast({
        type: 'info',
        title: 'Maker-Checker Auto Role Switch',
        message: `Switched from creator ${currentUser.name} to ${approver.name} (L1 Approver) to authorize request.`,
      });
    } else {
      const mcCheck = validateMakerChecker(req.createdById, currentUser.id);
      if (!mcCheck.isValid) {
        return { success: false, message: mcCheck.error! };
      }
    }

    const currentLevelNum = parseInt(req.currentLevel.replace('L', '')) || 1;
    const isFinalApproval = currentLevelNum >= req.requiredLevels;

    // 2. Final Approval Re-validations (ALL-OR-NOTHING POSTING)
    if (isFinalApproval) {
      // Re-validate Stale Invoices
      const staleCheck = detectStaleInvoices(req, invoices);
      if (staleCheck.isStale) {
        // Flag request as Stale!
        setRequests((prev) =>
          prev.map((r) => (r.id === req.id ? { ...r, isStale: true } : r))
        );
        return {
          success: false,
          message: `Approval Blocked: Stale Invoice Detected! ${staleCheck.message}`,
        };
      }

      // Re-validate Mode B balance
      if (req.mode === 'Mode B') {
        const settlementGL = glAccounts.find((g) => g.code === req.glAccountCode);
        if (settlementGL && settlementGL.balance < req.amount) {
          return {
            success: false,
            message: `Approval Blocked: Mode B settlement account ${settlementGL.name} balance has fallen below required amount ৳${req.amount.toLocaleString()}.`,
          };
        }
      }

      // Re-validate locked period
      if (isDateInLockedPeriod(req.collectionDate)) {
        return {
          success: false,
          message: `Approval Blocked: Period locked before 01-10-2026 for date ${req.collectionDate}.`,
        };
      }

      // Forced failure dev toggle check (Demo atomic rollback!)
      if (forceFailureRollbackToggle) {
        return {
          success: false,
          message: 'SIMULATED POSTING FAILURE: Database deadlock occurred. Atomic rollback executed, no entries posted.',
        };
      }

      // --- FINAL APPROVAL: EXECUTE ATOMIC POSTING ---
      const voucherNo = `CR-2611${Math.floor(100 + Math.random() * 900)}`;

      // Generate Accounting Voucher conforming to Section 12
      const voucher = generateSingleDueReceiveVoucher(req, voucherNo, currentUser.office);

      // 1. Update GL Balances: Dr Receipt/Settlement GL, Cr Accounts Receivable
      setGlAccounts((prev) =>
        prev.map((gl) => {
          if (gl.code === req.glAccountCode) {
            return { ...gl, balance: round2(gl.balance - (req.mode === 'Mode B' ? req.amount : -req.amount)) };
          }
          if (gl.code === '1200') {
            return { ...gl, balance: round2(gl.balance - req.amount) };
          }
          return gl;
        })
      );

      // 2. Update Invoices: Deduct dues, release reservations, increase collected
      setInvoices((prev) =>
        prev.map((inv) => {
          const aff = req.invoicesAffected.find((a) => a.invoiceId === inv.id);
          if (aff && aff.collectNow > 0) {
            const newPrevCollected = round2(inv.previouslyCollected + aff.collectNow);
            const newPending = round2(Math.max(0, inv.pendingApprovalAmount - aff.collectNow));
            const newDue = round2(Math.max(0, inv.creditAmount - newPrevCollected - inv.returnAmount));
            const newStatus = newDue <= 0 ? 'Paid' : 'Partially Paid';

            return {
              ...inv,
              previouslyCollected: newPrevCollected,
              pendingApprovalAmount: newPending,
              dueAmount: newDue,
              effectiveDueAmount: newDue,
              status: newStatus,
              collectionHistory: [
                ...inv.collectionHistory,
                {
                  voucherNo,
                  date: req.collectionDate,
                  amount: aff.collectNow,
                  method: `${req.mode} (${req.glAccountName})`,
                  remarks: req.remarks,
                },
              ],
            };
          }
          return inv;
        })
      );

      // 3. Update Customer: Release pending, update collected, deduct due, lift credit block if overdue cleared
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === req.customerId) {
            const newCollected = round2(c.collectedAmount + req.amount);
            const newPending = round2(Math.max(0, c.pendingApprovalAmount - req.amount));
            const newDue = round2(Math.max(0, c.dueAmount - req.amount));
            return {
              ...c,
              collectedAmount: newCollected,
              pendingApprovalAmount: newPending,
              dueAmount: newDue,
              isCreditBlocked: false, // Lift credit block!
            };
          }
          return c;
        })
      );

      // 4. Update Request Record
      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? {
                ...r,
                status: 'Approved',
                currentLevel: 'Completed',
                voucherNo,
                approvalTrail: [
                  ...r.approvalTrail,
                  {
                    level: `L${currentLevelNum}`,
                    approverId: currentUser.id,
                    approverName: currentUser.name,
                    action: 'Approve',
                    timestamp: new Date().toLocaleString(),
                    comment: comment || 'Final Approval Granted. Posted to GL.',
                  },
                ],
              }
            : r
        )
      );

      // 5. Post to General Ledger / Vouchers list
      setVouchers((prev) => [voucher, ...prev]);

      // If part of a batch, check if all batch requests are completed
      if (req.batchId) {
        setBatches((prev) =>
          prev.map((b) => {
            if (b.id === req.batchId) {
              const remaining = requests.filter(
                (r) => r.batchId === b.id && r.id !== req.id && r.status === 'Pending'
              );
              if (remaining.length === 0) {
                return {
                  ...b,
                  status: 'Approved',
                  currentLevel: 'Completed',
                  voucherNos: [...b.voucherNos, voucherNo],
                };
              }
            }
            return b;
          })
        );
      }

      showToast({
        type: 'success',
        title: 'Collection Approved & Posted to GL!',
        message: `Request #${req.requestNo} fully approved. Voucher ${voucherNo} posted. Accounts Receivable credited ৳${req.amount.toLocaleString()}.`,
        voucherNo,
      });

      return {
        success: true,
        message: `Final approval complete. Voucher ${voucherNo} created.`,
        voucherNo,
        isFinalApproval: true,
      };
    } else {
      // Advance to next approval level (e.g. L1 -> L2)
      const nextLevel = `L${currentLevelNum + 1}`;

      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? {
                ...r,
                currentLevel: nextLevel,
                approvalTrail: [
                  ...r.approvalTrail,
                  {
                    level: `L${currentLevelNum}`,
                    approverId: currentUser.id,
                    approverName: currentUser.name,
                    action: 'Approve',
                    timestamp: new Date().toLocaleString(),
                    comment: comment || `Approved at L${currentLevelNum}. Forwarded to ${nextLevel}.`,
                  },
                ],
              }
            : r
        )
      );

      showToast({
        type: 'info',
        title: `Approved at L${currentLevelNum}`,
        message: `Request #${req.requestNo} moved to ${nextLevel} approval stage.`,
      });

      return {
        success: true,
        message: `Approved at L${currentLevelNum}. Forwarded to ${nextLevel}.`,
        isFinalApproval: false,
      };
    }
  };

  // Bulk Approve Multiple Checked Requests
  const bulkApproveRequests = (requestIds: string[]) => {
    let approved = 0;
    let failed = 0;
    const results: string[] = [];

    requestIds.forEach((id) => {
      const res = approveRequest(id, 'Bulk approval execution');
      if (res.success) {
        approved++;
        results.push(`✓ Request ${id}: ${res.message}`);
      } else {
        failed++;
        results.push(`✗ Request ${id}: ${res.message}`);
      }
    });

    showToast({
      type: failed === 0 ? 'success' : 'warning',
      title: `Bulk Approval Finished (${approved} Approved, ${failed} Failed)`,
      message: results.slice(0, 3).join(' | '),
    });

    return { total: requestIds.length, approved, failed, results };
  };

  // Reject Request
  const rejectRequest = (requestId: string, reason: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return { success: false, message: 'Request not found.' };

    if (!reason || !reason.trim()) {
      return { success: false, message: 'A rejection reason is strictly required.' };
    }

    // Release Invoice Reservations
    setInvoices((prev) =>
      prev.map((inv) => {
        const aff = req.invoicesAffected.find((a) => a.invoiceId === inv.id);
        if (aff && aff.collectNow > 0) {
          const newPending = round2(Math.max(0, inv.pendingApprovalAmount - aff.collectNow));
          const newDue = round2(inv.effectiveDueAmount);
          return {
            ...inv,
            pendingApprovalAmount: newPending,
            dueAmount: newDue,
          };
        }
        return inv;
      })
    );

    // Release Customer Reservations
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === req.customerId) {
          const newPending = round2(Math.max(0, c.pendingApprovalAmount - req.amount));
          return {
            ...c,
            pendingApprovalAmount: newPending,
          };
        }
        return c;
      })
    );

    // Update Request Record to Rejected
    setRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: 'Rejected',
              rejectionReason: reason,
              approvalTrail: [
                ...r.approvalTrail,
                {
                  level: r.currentLevel,
                  approverId: currentUser.id,
                  approverName: currentUser.name,
                  action: 'Reject',
                  timestamp: new Date().toLocaleString(),
                  comment: `Rejected: ${reason}`,
                },
              ],
            }
          : r
        )
    );

    setRejectDialogRequest(null);

    showToast({
      type: 'warning',
      title: `Request #${req.requestNo} Rejected`,
      message: `Reason: ${reason}. Invoice reservations released.`,
    });

    return { success: true, message: `Request #${req.requestNo} rejected.` };
  };

  // Approve an entire Bulk Batch
  const approveBatch = (
    batchId: string,
    comment?: string
  ): { success: boolean; message: string; voucherNo?: string } => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return { success: false, message: 'Batch not found.' };

    if (batch.status !== 'Pending') {
      return { success: false, message: `Batch is already ${batch.status}.` };
    }

    // Auto-switch to approver if logged in as creator
    if (batch.createdById === currentUser.id && currentUser.role === 'Collector') {
      const approver = users.find((u) => u.level === 'L1') || APP_USERS[1];
      setCurrentUser(approver);
      showToast({
        type: 'info',
        title: 'Maker-Checker Auto Role Switch',
        message: `Switched from creator ${currentUser.name} to ${approver.name} (L1 Approver) to authorize batch.`,
      });
    }

    const voucherNo = `CR-2611${Math.floor(500 + Math.random() * 499)}`;

    // Sub-requests in this batch
    const batchRequests = requests.filter(
      (r) => batch.requestIds.includes(r.id) || r.batchNo === batch.batchNo
    );

    // 1. Generate Bulk Voucher (Section 12: Due Receive (Bulk))
    const drLine = {
      id: `bl-dr-${Date.now()}`,
      chartOfAccountNo: batch.glAccountCode,
      chartOfAccountName: batch.glAccountName,
      customerSupplierEmployee: 'Consolidated Batch Receipt',
      remarks: `Batch #${batch.batchNo} settlement`,
      debit: batch.totalAmount,
      credit: 0.0,
    };

    const crLines = batchRequests.map((req, idx) => ({
      id: `bl-cr-${idx}-${Date.now()}`,
      chartOfAccountNo: '1200',
      chartOfAccountName: `Accounts receivable : ${req.customerName}`,
      customerSupplierEmployee: req.customerName,
      remarks: `Cust: ${req.customerCode} | Req: ${req.requestNo}`,
      debit: 0.0,
      credit: req.amount,
    }));

    const bulkVoucher: JournalVoucher = {
      voucherNo,
      voucherDate: batch.collectionDate,
      voucherType: 'Due Receive (Bulk)',
      officeName: currentUser.office || 'FairPrice',
      actionBy: currentUser.name,
      narration: `Bulk Due Receive Batch ${batch.batchNo} ${batch.filterSummary}`,
      remarks: batch.remarks || 'Consolidated bulk credit collection batch',
      lines: [drLine, ...crLines],
      totalDebit: batch.totalAmount,
      totalCredit: batch.totalAmount,
      batchId: batch.id,
    };

    // 2. Update GL Balances
    setGlAccounts((prev) =>
      prev.map((gl) => {
        if (gl.code === batch.glAccountCode) {
          return {
            ...gl,
            balance: round2(
              gl.balance - (batch.mode === 'Mode B' ? batch.totalAmount : -batch.totalAmount)
            ),
          };
        }
        if (gl.code === '1200') {
          return { ...gl, balance: round2(gl.balance - batch.totalAmount) };
        }
        return gl;
      })
    );

    // 3. Update Invoices
    const affMap: Record<string, number> = {};
    batchRequests.forEach((req) => {
      req.invoicesAffected.forEach((aff) => {
        affMap[aff.invoiceId] = (affMap[aff.invoiceId] || 0) + aff.collectNow;
      });
    });

    setInvoices((prev) =>
      prev.map((inv) => {
        const collectedNow = affMap[inv.id] || 0;
        if (collectedNow > 0) {
          const newPrevCollected = round2(inv.previouslyCollected + collectedNow);
          const newDue = round2(
            Math.max(0, inv.creditAmount - newPrevCollected - inv.returnAmount)
          );
          const newPending = round2(Math.max(0, inv.pendingApprovalAmount - collectedNow));
          const newStatus = newDue <= 0 ? 'Paid' : 'Partially Paid';
          return {
            ...inv,
            previouslyCollected: newPrevCollected,
            pendingApprovalAmount: newPending,
            dueAmount: newDue,
            effectiveDueAmount: newDue,
            status: newStatus,
            collectionHistory: [
              ...inv.collectionHistory,
              {
                voucherNo,
                date: batch.collectionDate,
                amount: collectedNow,
                method: `Bulk: ${batch.mode} (${batch.glAccountName})`,
                remarks: `Batch #${batch.batchNo}`,
              },
            ],
          };
        }
        return inv;
      })
    );

    // 4. Update Customers
    const custAmtMap: Record<string, number> = {};
    batchRequests.forEach((req) => {
      custAmtMap[req.customerId] = (custAmtMap[req.customerId] || 0) + req.amount;
    });

    setCustomers((prev) =>
      prev.map((c) => {
        const amt = custAmtMap[c.id] || 0;
        if (amt > 0) {
          return {
            ...c,
            collectedAmount: round2(c.collectedAmount + amt),
            pendingApprovalAmount: round2(Math.max(0, c.pendingApprovalAmount - amt)),
            dueAmount: round2(Math.max(0, c.dueAmount - amt)),
            isCreditBlocked: false,
          };
        }
        return c;
      })
    );

    // 5. Update Batch Status
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batch.id
          ? {
              ...b,
              status: 'Approved',
              currentLevel: 'Completed',
              voucherNos: [voucherNo],
              approvalTrail: [
                ...b.approvalTrail,
                {
                  level: 'Final',
                  approverId: currentUser.id,
                  approverName: currentUser.name,
                  action: 'Approve',
                  timestamp: new Date().toLocaleString(),
                  comment: comment || 'Bulk batch approved and posted to General Ledger.',
                },
              ],
            }
          : b
      )
    );

    // 6. Update Sub-requests
    setRequests((prev) =>
      prev.map((r) =>
        batch.requestIds.includes(r.id) || r.batchNo === batch.batchNo
          ? { ...r, status: 'Approved', currentLevel: 'Completed', voucherNo }
          : r
      )
    );

    // 7. Add Voucher to GL Vouchers
    setVouchers((prev) => [bulkVoucher, ...prev]);

    showToast({
      type: 'success',
      title: 'Bulk Batch Approved & Posted!',
      message: `Batch #${batch.batchNo} fully approved. Voucher ${voucherNo} posted. ৳${batch.totalAmount.toLocaleString()} credited to Accounts Receivable.`,
      voucherNo,
    });

    return {
      success: true,
      message: `Batch ${batch.batchNo} approved. Voucher ${voucherNo} created.`,
      voucherNo,
    };
  };

  // Reject an entire Bulk Batch
  const rejectBatch = (
    batchId: string,
    reason: string
  ): { success: boolean; message: string } => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return { success: false, message: 'Batch not found.' };

    const batchRequests = requests.filter(
      (r) => batch.requestIds.includes(r.id) || r.batchNo === batch.batchNo
    );

    // Release Invoices
    const affMap: Record<string, number> = {};
    batchRequests.forEach((req) => {
      req.invoicesAffected.forEach((aff) => {
        affMap[aff.invoiceId] = (affMap[aff.invoiceId] || 0) + aff.collectNow;
      });
    });

    setInvoices((prev) =>
      prev.map((inv) => {
        const locked = affMap[inv.id] || 0;
        if (locked > 0) {
          return {
            ...inv,
            pendingApprovalAmount: round2(Math.max(0, inv.pendingApprovalAmount - locked)),
          };
        }
        return inv;
      })
    );

    // Release Customers
    const custAmtMap: Record<string, number> = {};
    batchRequests.forEach((req) => {
      custAmtMap[req.customerId] = (custAmtMap[req.customerId] || 0) + req.amount;
    });

    setCustomers((prev) =>
      prev.map((c) => {
        const amt = custAmtMap[c.id] || 0;
        if (amt > 0) {
          return {
            ...c,
            pendingApprovalAmount: round2(Math.max(0, c.pendingApprovalAmount - amt)),
          };
        }
        return c;
      })
    );

    // Update Batch
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batch.id
          ? {
              ...b,
              status: 'Rejected',
              approvalTrail: [
                ...b.approvalTrail,
                {
                  level: 'Final',
                  approverId: currentUser.id,
                  approverName: currentUser.name,
                  action: 'Reject',
                  timestamp: new Date().toLocaleString(),
                  comment: reason,
                },
              ],
            }
          : b
      )
    );

    // Update sub-requests
    setRequests((prev) =>
      prev.map((r) =>
        batch.requestIds.includes(r.id) || r.batchNo === batch.batchNo
          ? { ...r, status: 'Rejected', rejectionReason: reason }
          : r
      )
    );

    showToast({
      type: 'warning',
      title: 'Bulk Batch Rejected',
      message: `Batch #${batch.batchNo} was rejected. Reservations released back to active dues.`,
    });

    return { success: true, message: `Batch ${batch.batchNo} rejected.` };
  };

  // Reverse Posted Voucher
  const reverseVoucherAction = (voucherNo: string, reason: string) => {
    const orig = vouchers.find((v) => v.voucherNo === voucherNo);
    if (!orig) return { success: false, message: 'Voucher not found.' };

    const revVoucherNo = `REV-${voucherNo}`;
    const today = new Date().toISOString().split('T')[0];
    const reversal = generateReversalVoucher(orig, revVoucherNo, currentUser.name, reason, today);

    // Reverse GL Balances
    orig.lines.forEach((l) => {
      setGlAccounts((prev) =>
        prev.map((gl) => {
          if (gl.code === l.chartOfAccountNo) {
            // Invert debit/credit
            return { ...gl, balance: round2(gl.balance - l.debit + l.credit) };
          }
          return gl;
        })
      );
    });

    // Reopen Invoices if linked to request
    if (orig.requestId) {
      const req = requests.find((r) => r.id === orig.requestId);
      if (req) {
        setInvoices((prev) =>
          prev.map((inv) => {
            const aff = req.invoicesAffected.find((a) => a.invoiceId === inv.id);
            if (aff && aff.collectNow > 0) {
              const newPrevCollected = round2(Math.max(0, inv.previouslyCollected - aff.collectNow));
              const newDue = round2(inv.creditAmount - newPrevCollected - inv.returnAmount);
              return {
                ...inv,
                previouslyCollected: newPrevCollected,
                dueAmount: newDue,
                effectiveDueAmount: newDue,
                status: 'Overdue',
              };
            }
            return inv;
          })
        );
      }
    }

    setVouchers((prev) => [reversal, ...prev]);

    showToast({
      type: 'info',
      title: 'Voucher Reversed',
      message: `Reversal voucher ${revVoucherNo} posted. Invoices reopened and GL balances adjusted.`,
      voucherNo: revVoucherNo,
    });

    return { success: true, message: `Reversal ${revVoucherNo} posted.` };
  };

  // Dev simulation: Simulate an out-of-band POS collection on a customer to demo stale check!
  const simulateStalePOSCollection = (customerId: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.customerId === customerId && inv.dueAmount > 0) {
          // Pay ৳1,500 at the store counter out of band!
          const simulatedPay = Math.min(inv.dueAmount, 1500);
          return {
            ...inv,
            dueAmount: round2(inv.dueAmount - simulatedPay),
            previouslyCollected: round2(inv.previouslyCollected + simulatedPay),
          };
        }
        return inv;
      })
    );

    showToast({
      type: 'warning',
      title: '⚡ Dev Simulation: POS Out-of-Band Collection',
      message: `Simulated a customer paying ৳1,500 at the store cash counter. Any pending requests covering this invoice are now STALE. Try approving to observe the guardrail!`,
    });
  };

  const resetAllMockData = () => {
    setCustomers(INITIAL_CUSTOMERS);
    setInvoices(INITIAL_INVOICES);
    setGlAccounts(INITIAL_GL_ACCOUNTS);
    setRequests(INITIAL_REQUESTS);
    setBatches(INITIAL_BATCHES);
    setVouchers(INITIAL_VOUCHERS);
    setGlSetup(INITIAL_GL_SETUP);
    setCurrentUser(APP_USERS[0]);
    showToast({
      type: 'info',
      title: 'State Reset to Initial Demo Data',
      message: 'All balances, seed requests, and invoices restored.',
    });
  };

  return (
    <CreditCollectionContext.Provider
      value={{
        currentModule,
        currentScreen,
        activeTab,
        setActiveTab,
        navigateTo,
        users,
        currentUser,
        switchUser,
        customers,
        invoices,
        glAccounts,
        requests,
        batches,
        vouchers,
        glSetup,
        updateGLSetup,
        addNewGLAccount,
        selectedCustomer,
        setSelectedCustomer,
        activeInvoiceForDrawer,
        setActiveInvoiceForDrawer,
        activeJournalVoucher,
        setActiveJournalVoucher,
        rejectDialogRequest,
        setRejectDialogRequest,
        isNewGLModalOpen,
        setIsNewGLModalOpen,
        isInvoiceWiseModalOpen,
        setIsInvoiceWiseModalOpen,
        toast,
        showToast,
        clearToast,
        filters,
        setFilters,
        pendingApprovalCountForCurrentUser,
        submitSingleCollection,
        submitBulkWizardBatch,
        approveRequest,
        bulkApproveRequests,
        rejectRequest,
        approveBatch,
        rejectBatch,
        reverseVoucherAction,
        simulateStalePOSCollection,
        forceFailureRollbackToggle,
        setForceFailureRollbackToggle,
        resetAllMockData,
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
