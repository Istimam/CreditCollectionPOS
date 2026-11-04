export type TabType = 'DUE_LIST' | 'PENDING_LIST' | 'PAID_INVOICES' | 'BULK_UPLOAD';

export type PaymentMethodType = 'Cash' | 'Bank' | 'Wallet';

export type InvoiceStatus = 'Active' | 'Overdue' | 'Partially Paid' | 'Paid';

export interface InvoiceItem {
  name: string;
  barcode: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ReturnInvoiceItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ReturnInvoiceRecord {
  returnInvoiceNo: string;
  returnDate: string; // YYYY-MM-DD
  returnAmount: number;
  reason?: string;
  items?: ReturnInvoiceItem[];
}

export interface PaymentBreakdownItem {
  method: string;
  account: string;
  amount: number;
  reference?: string;
}

export interface InvoiceCollectionRecord {
  voucherNo: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  remarks?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerGroup: string; // e.g. "Factory Employees", "Office Staff", "Walk-in Credit"
  customerMobile: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string;     // YYYY-MM-DD
  creditDays: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;   // gross - discount
  returnAmount: number;
  returnInvoices?: ReturnInvoiceRecord[];
  creditAmount: number;
  previouslyCollected: number;
  pendingApprovalAmount: number; // Reserved by pending collection requests
  dueAmount: number;   // creditAmount - previouslyCollected - returnAmount - pendingApprovalAmount
  effectiveDueAmount: number; // creditAmount - previouslyCollected - returnAmount
  status: InvoiceStatus;
  items: InvoiceItem[];
  initialPaymentBreakdown: PaymentBreakdownItem[];
  collectionHistory: InvoiceCollectionRecord[];
  narration?: string;
}

export interface Customer {
  id: string;
  customerCode: string;
  customerName: string;
  customerGroup: string; // "Factory Employees" | "Office Staff" | "Walk-in Credit"
  mobileNo: string;
  creditLimit: number;
  creditDays: number;
  totalCreditSales: number;
  returnAmount: number;
  collectedAmount: number;
  pendingApprovalAmount: number;
  dueAmount: number;
  isCreditBlocked?: boolean;
}

// Chart of Accounts (COA)
export type GLPurposeTag =
  | 'Collection Receipt'
  | 'Settlement/Clearing'
  | 'Salary Deduction'
  | 'Receivable Control';

export interface GLAccount {
  id: string;
  code: string;
  name: string;
  group: string;     // e.g. "Current Assets"
  class: string;     // e.g. "Cash And Cash Equivalent"
  category: string;  // e.g. "Cash Account", "Bank Account", "Accounts Receivable"
  purposeTag: GLPurposeTag;
  balance: number;   // Current GL balance
  isSystem?: boolean;
}

// Collection Modes
export type CollectionMode = 'Mode A' | 'Mode B'; // Mode A: Direct Receipt, Mode B: Settlement GL

export interface PaymentLineInput {
  id: string;
  method: 'Cash' | 'Bank' | 'Wallet';
  glAccountCode: string;
  glAccountName: string;
  referenceNo: string;
  amount: number;
}

// Approval Status & Trail
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface ApprovalRecord {
  level: string; // e.g. "L1", "L2", "L3"
  approverId: string;
  approverName: string;
  action: 'Approve' | 'Reject';
  timestamp: string;
  comment?: string;
}

export interface InvoiceAllocationItem {
  invoiceId: string;
  invoiceNo: string;
  invoiceDate: string;
  grossAmount: number;
  netAmount: number;
  dueAmount: number;
  collectNow: number;
  balanceAfter: number;
}

// Collection Request (Single or part of Bulk)
export interface CollectionRequest {
  id: string;
  requestNo: string; // e.g. "CRQ-2611-0001"
  requestDate: string;
  collectionDate: string;
  type: 'Single' | 'Bulk';
  customerId: string;
  customerCode: string;
  customerName: string;
  customerGroup: string;
  customerMobile: string;
  mode: CollectionMode;
  glAccountCode: string;
  glAccountName: string;
  paymentLines?: PaymentLineInput[]; // Mode A lines
  amount: number;
  remarks?: string;
  narration: string;
  createdBy: string;
  createdById: string;
  status: ApprovalStatus;
  currentLevel: string; // "L1", "L2", "L3", or "Completed"
  requiredLevels: number; // 1, 2, or 3
  approvalTrail: ApprovalRecord[];
  rejectionReason?: string;
  invoicesAffected: InvoiceAllocationItem[];
  batchId?: string;
  batchNo?: string;
  voucherNo?: string; // Generated on final approval
  isStale?: boolean;  // True if customer paid in POS while request was pending
}

// Bulk Batch
export interface BulkBatch {
  id: string;
  batchNo: string; // e.g. "BC-2026-0001"
  date: string;
  collectionDate: string;
  filterSummary: string;
  mode: CollectionMode;
  glAccountCode: string;
  glAccountName: string;
  referenceNo?: string;
  totalAmount: number;
  totalCustomers: number;
  totalInvoices: number;
  status: ApprovalStatus;
  currentLevel: string;
  requiredLevels: number;
  requestIds: string[];
  approvalTrail: ApprovalRecord[];
  voucherNos: string[];
  remarks?: string;
  createdBy: string;
  createdById: string;
}

// Accounting Journal Voucher
export type VoucherType =
  | 'Due Receive (Manual)'
  | 'Due Receive (Bulk)'
  | 'Sales (Auto)'
  | 'Contra Voucher (Manual)'
  | 'Bank Payment Voucher (Manual)'
  | 'Adjustment Journal (Manual)';

export interface JournalLine {
  id: string;
  chartOfAccountNo: string;
  chartOfAccountName: string;
  customerSupplierEmployee: string;
  remarks: string;
  debit: number;
  credit: number;
}

export interface JournalVoucher {
  voucherNo: string; // format CR-YYMMNNN e.g. CR-2610001 or JV-YYMMNNNNN
  voucherDate: string;
  voucherType: VoucherType;
  officeName: string;
  actionBy: string; // e.g. "Nasrullah" / "Saddam Khan"
  narration: string;
  remarks: string;
  attachment?: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  requestId?: string;
  batchId?: string;
}

// GL Setup Configuration
export interface GLSetupConfig {
  receivableControlGL: string; // default "1200 - Accounts Receivable"
  defaultCashGL: string;       // default "1000 - Cash In Hand"
  defaultBankGL: string;       // default "2081 - Brac Bank Konabari"
  defaultWalletGL: string;     // default "0173 - bKash Merchant Account"
  defaultSettlementGL: string; // default "1300 - Employee Dues Settlement Clearing"
  // Map from PaymentMethodType -> default receiving GL code
  defaultReceivingGLs: Record<string, string>;
  enableModeA: boolean;        // Direct
  enableModeB: boolean;        // Settlement
  bulkVoucherShape: 'One voucher per batch' | 'One voucher per customer';
  thresholdL1Max: number;      // up to 50,000 -> 1 level
  thresholdL2Max: number;      // up to 500,000 -> 2 levels; above -> 3 levels
}

// App User (for demo maker-checker and approver switching)
export interface AppUser {
  id: string;
  name: string;
  role: 'Collector' | 'Approver L1' | 'Approver L2' | 'Approver L3' | 'Viewer';
  level?: string;
  office: string;
}

// Legacy / Helper Voucher Interface for Excel exports
export interface CollectionVoucher {
  voucherNo: string;
  date: string;
  customerCode: string;
  customerName: string;
  customerMobile: string;
  totalCollected: number;
  paymentMethod: string;
  account: string;
  invoicesAffected: { invoiceNo: string; amountCollected: number; remainingDue: number }[];
  createdBy: string;
  remarks?: string;
}

// Bulk Upload Row
export interface BulkUploadRow {
  rowId: number;
  customerCode: string;
  customerName?: string;
  invoiceNo?: string;
  collectionAmount: number;
  paymentMethod?: string;
  account?: string;
  referenceNo?: string;
  collectionDate?: string;
  remarks?: string;
  isValid: boolean;
  errors: string[];
  matchedCustomer?: Customer;
  matchedInvoice?: Invoice;
}
