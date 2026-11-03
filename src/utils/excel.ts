import * as XLSX from 'xlsx';
import { Customer, Invoice, CollectionVoucher, BulkUploadRow } from '../types';
import { formatDateDMY, formatDateYMD, parseCurrency } from './format';

/**
 * Generates and downloads the official Bulk Collection Excel template.
 */
export function downloadBulkTemplate(): void {
  const headers = [
    'Customer Code',
    'Customer Name',
    'Invoice No (optional)',
    'Collection Amount',
    'Payment Method',
    'Account / Wallet',
    'Reference No',
    'Collection Date',
    'Remarks',
  ];

  const sampleData = [
    [
      'CUS-FAI00001',
      'MD. BULBUL HOSSAIN TALUKDAR',
      '', // FIFO across dues
      2500,
      'Wallet',
      '01737626276 [bKash Merchant Account - FairPrice]',
      'BK-884920',
      '04-11-2026',
      'Partial FIFO collection',
    ],
    [
      'CUS-FAI00002',
      'M/S Pritom Traders',
      '122609251841100202', // Direct invoice collection
      6250,
      'Bank',
      '2081007510001 [BRAC BANK LTD PLC][KONABARI SME]',
      'BRAC-99120',
      '04-11-2026',
      'Invoice settlement',
    ],
    [
      'CUS-FAI00003',
      'Himel Enterprise',
      '',
      1500,
      'Cash',
      '1000 - Cash in hand [FairPrice Counter 1]',
      '',
      '04-11-2026',
      'Cash collection counter',
    ],
    [
      '# NOTE:',
      'Leave "Invoice No" blank for FIFO distribution across oldest dues.',
      'Payment Methods: Cash | Bank | Wallet.',
      'Date format: DD-MM-YYYY or YYYY-MM-DD.',
      '',
      '',
      '',
      '',
      '',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  ws['!cols'] = [
    { wch: 18 },
    { wch: 32 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 38 },
    { wch: 18 },
    { wch: 16 },
    { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bulk_Collection');
  XLSX.writeFile(wb, 'Managerium_Credit_Collection_Template.xlsx');
}

/**
 * Parses an uploaded Excel file for Bulk Collection.
 */
export async function parseBulkExcel(
  file: File,
  customers: Customer[],
  invoices: Invoice[]
): Promise<BulkUploadRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const parsedRows: BulkUploadRow[] = [];

  const validMethods = ['cash', 'bank', 'wallet'];

  rawRows.forEach((row, index) => {
    const custCodeKey = Object.keys(row).find((k) => /customer\s*code/i.test(k)) || 'Customer Code';
    const custNameKey = Object.keys(row).find((k) => /customer\s*name/i.test(k)) || 'Customer Name';
    const invNoKey = Object.keys(row).find((k) => /invoice\s*no/i.test(k)) || 'Invoice No (optional)';
    const amountKey = Object.keys(row).find((k) => /collection\s*amount|amount/i.test(k)) || 'Collection Amount';
    const methodKey = Object.keys(row).find((k) => /method/i.test(k)) || 'Payment Method';
    const accountKey = Object.keys(row).find((k) => /account|wallet/i.test(k)) || 'Account / Wallet';
    const refKey = Object.keys(row).find((k) => /ref/i.test(k)) || 'Reference No';
    const dateKey = Object.keys(row).find((k) => /date/i.test(k)) || 'Collection Date';
    const remarksKey = Object.keys(row).find((k) => /remarks|note/i.test(k)) || 'Remarks';

    const customerCode = String(row[custCodeKey] || '').trim();
    const customerName = String(row[custNameKey] || '').trim();
    const invoiceNo = String(row[invNoKey] || '').trim();
    const rawAmount = row[amountKey];
    const amount = parseCurrency(rawAmount);
    const paymentMethod = String(row[methodKey] || 'Cash').trim();
    const account = String(row[accountKey] || '').trim();
    const referenceNo = String(row[refKey] || '').trim();
    const rawDate = String(row[dateKey] || '').trim();
    const remarks = String(row[remarksKey] || '').trim();

    if (!customerCode && !customerName && amount === 0) return;
    if (customerCode.startsWith('#') || customerName.startsWith('#')) return;

    const errors: string[] = [];

    // 1. Customer validation
    const matchedCustomer = customers.find(
      (c) =>
        c.customerCode.toLowerCase() === customerCode.toLowerCase() ||
        (customerName && c.customerName.toLowerCase() === customerName.toLowerCase())
    );

    if (!matchedCustomer) {
      errors.push(`Customer "${customerCode || customerName}" not found in system`);
    } else if (matchedCustomer.dueAmount <= 0) {
      errors.push(`Customer "${matchedCustomer.customerName}" has zero due balance`);
    }

    // 2. Invoice validation (if specified)
    let matchedInvoice: Invoice | undefined;
    if (invoiceNo) {
      matchedInvoice = invoices.find(
        (inv) => inv.invoiceNo.replace(/\s+/g, '') === invoiceNo.replace(/\s+/g, '')
      );
      if (!matchedInvoice) {
        errors.push(`Invoice "${invoiceNo}" not found`);
      } else if (matchedCustomer && matchedInvoice.customerId !== matchedCustomer.id) {
        errors.push(`Invoice "${invoiceNo}" does not belong to customer ${matchedCustomer.customerCode}`);
      } else if (matchedInvoice.dueAmount <= 0) {
        errors.push(`Invoice "${invoiceNo}" is already fully settled`);
      }
    }

    // 3. Amount validation
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Collection Amount must be greater than 0 (got: ${rawAmount})`);
    } else if (matchedInvoice && amount > matchedInvoice.dueAmount) {
      errors.push(
        `Amount (${amount.toLocaleString()}) exceeds invoice due (${matchedInvoice.dueAmount.toLocaleString()})`
      );
    } else if (matchedCustomer && !matchedInvoice && amount > matchedCustomer.dueAmount) {
      errors.push(
        `Amount (${amount.toLocaleString()}) exceeds customer total due (${matchedCustomer.dueAmount.toLocaleString()})`
      );
    }

    // 4. Payment method & Account validation
    if (!validMethods.includes(paymentMethod.toLowerCase())) {
      errors.push(`Invalid Payment Method "${paymentMethod}". Allowed: Cash, Bank, Wallet`);
    }

    if (!account) {
      errors.push(`Account/Wallet is required for payment method ${paymentMethod}`);
    }

    // 5. Date validation
    let parsedDate = rawDate;
    if (!parsedDate) {
      parsedDate = formatDateYMD(new Date());
    } else {
      const testD = new Date(parsedDate);
      if (isNaN(testD.getTime())) {
        const parts = parsedDate.split(/[-/]/);
        if (parts.length === 3 && parts[2].length === 4) {
          parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    parsedRows.push({
      rowId: index + 1,
      customerCode: matchedCustomer ? matchedCustomer.customerCode : customerCode,
      customerName: matchedCustomer ? matchedCustomer.customerName : customerName,
      invoiceNo,
      collectionAmount: amount,
      paymentMethod,
      account,
      referenceNo,
      collectionDate: parsedDate,
      remarks,
      isValid: errors.length === 0,
      errors,
      matchedCustomer,
      matchedInvoice,
    });
  });

  return parsedRows;
}

/**
 * Exports Due List to Excel.
 */
export function exportDueListToExcel(customers: Customer[], filename: string = 'Credit_Collection_Due_List.xlsx'): void {
  const exportData = customers
    .filter((c) => c.dueAmount > 0)
    .map((c, idx) => ({
      'SL': idx + 1,
      'Customer Code': c.customerCode,
      'Customer Name': c.customerName,
      'Mobile No': c.mobileNo,
      'Credit Limit': c.creditLimit,
      'Total Credit Sales': c.totalCreditSales,
      'Return Amount': c.returnAmount,
      'Collected Amount': c.collectedAmount,
      'Due Amount': c.dueAmount,
    }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Due_List');
  XLSX.writeFile(wb, filename);
}

/**
 * Exports Paid Invoices to Excel.
 */
export function exportPaidInvoicesToExcel(invoices: Invoice[], filename: string = 'Credit_Collection_Paid_Invoices.xlsx'): void {
  const exportData = invoices
    .filter((inv) => inv.status === 'Paid')
    .map((inv, idx) => {
      const methods = inv.collectionHistory.map((h) => h.method).join(', ') || 'Direct';
      const lastCollectionDate = inv.collectionHistory[inv.collectionHistory.length - 1]?.date || inv.dueDate;

      return {
        'SL': idx + 1,
        'Invoice No': inv.invoiceNo,
        'Return Inv No(s)': inv.returnInvoices?.map((r) => r.returnInvoiceNo).join(', ') || '—',
        'Customer Code': inv.customerCode,
        'Customer Name': inv.customerName,
        'Customer Mobile': inv.customerMobile,
        'Invoice Date': formatDateDMY(inv.invoiceDate),
        'Gross Amount': inv.grossAmount,
        'Discount': inv.discountAmount,
        'Net Amount': inv.netAmount,
        'Return Amount': inv.returnAmount,
        'Credit Amount': inv.creditAmount,
        'Collected Amount': inv.previouslyCollected,
        'Collection Date': formatDateDMY(lastCollectionDate),
        'Payment Methods': methods,
      };
    });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Paid_Invoices');
  XLSX.writeFile(wb, filename);
}

/**
 * Exports Collection History to Excel.
 */
export function exportHistoryToExcel(vouchers: CollectionVoucher[], filename: string = 'Credit_Collection_History.xlsx'): void {
  const exportData = vouchers.map((v, idx) => ({
    'SL': idx + 1,
    'Voucher No': v.voucherNo,
    'Date': formatDateDMY(v.date),
    'Customer Code': v.customerCode,
    'Customer Name': v.customerName,
    'Mobile No': v.customerMobile,
    'Total Collected': v.totalCollected,
    'Payment Method': v.paymentMethod,
    'Account': v.account,
    'Invoices Settle Count': v.invoicesAffected.length,
    'Created By': v.createdBy,
    'Remarks': v.remarks || '',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Collection_History');
  XLSX.writeFile(wb, filename);
}

/**
 * Exports Error Report for bulk upload.
 */
export function exportErrorReport(invalidRows: BulkUploadRow[]): void {
  const exportData = invalidRows.map((r) => ({
    'Row #': r.rowId,
    'Customer Code': r.customerCode,
    'Customer Name': r.customerName,
    'Invoice No': r.invoiceNo,
    'Amount': r.collectionAmount,
    'Payment Method': r.paymentMethod,
    'Account': r.account,
    'Errors': r.errors.join('; '),
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bulk_Upload_Errors');
  XLSX.writeFile(wb, 'Bulk_Collection_Errors.xlsx');
}
