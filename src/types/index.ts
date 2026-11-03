export type TabType = 'DUE_LIST' | 'PAID_INVOICES' | 'COLLECTION_HISTORY' | 'BULK_COLLECTION';

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
  customerMobile: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string;     // YYYY-MM-DD
  creditDays: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;   // gross - discount
  returnAmount: number; // Total return amount against this invoice
  returnInvoices?: ReturnInvoiceRecord[]; // Sales return invoices generated against this sale invoice
  creditAmount: number;
  previouslyCollected: number;
  dueAmount: number;   // creditAmount - previouslyCollected - returnAmount
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
  mobileNo: string;
  creditLimit: number;
  creditDays: number;
  totalCreditSales: number;
  returnAmount: number;
  collectedAmount: number;
  dueAmount: number;
}

export type PaymentMethodType = 'Cash' | 'Bank' | 'Wallet';

export interface PaymentDetail {
  method: PaymentMethodType;
  account: string;
  referenceNo: string;
  amount: number;
}

export interface InvoicesAffectedItem {
  invoiceNo: string;
  invoiceDate: string;
  amountCollected: number;
  remainingDue: number;
  statusAfter: InvoiceStatus;
}

export interface CollectionVoucher {
  voucherNo: string;
  date: string; // YYYY-MM-DD
  customerId: string;
  customerCode: string;
  customerName: string;
  customerMobile: string;
  totalCollected: number;
  paymentMethod: PaymentMethodType;
  account: string;
  referenceNo?: string;
  methodsSummary: string;
  invoicesAffected: InvoicesAffectedItem[];
  remarks?: string;
  createdBy: string;
}

export interface BulkUploadRow {
  rowId: number;
  customerCode: string;
  customerName: string;
  invoiceNo: string;
  collectionAmount: number;
  paymentMethod: PaymentMethodType | string;
  account: string;
  referenceNo: string;
  collectionDate: string;
  remarks: string;
  isValid: boolean;
  errors: string[];
  matchedCustomer?: Customer;
  matchedInvoice?: Invoice;
}
