import {
  Invoice,
  CollectionRequest,
  JournalVoucher,
  JournalLine,
  GLAccount,
  GLSetupConfig,
} from '../types';

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * 1. FIFO Allocation: Allocates a payment amount across invoices ordered oldest first.
 */
export function allocateFIFO(
  invoices: Invoice[],
  paymentAmount: number
): {
  allocations: Record<string, number>;
  totalAllocated: number;
  remainingUnallocated: number;
  fullyPaidCount: number;
} {
  const sorted = [...invoices].sort(
    (a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
  );

  let unallocated = round2(Math.max(0, paymentAmount));
  const allocations: Record<string, number> = {};
  let totalAllocated = 0;
  let fullyPaidCount = 0;

  for (const inv of sorted) {
    if (inv.dueAmount <= 0) {
      allocations[inv.id] = 0;
      continue;
    }

    if (unallocated <= 0) {
      allocations[inv.id] = 0;
      continue;
    }

    if (unallocated >= inv.dueAmount) {
      allocations[inv.id] = round2(inv.dueAmount);
      unallocated = round2(unallocated - inv.dueAmount);
      totalAllocated = round2(totalAllocated + inv.dueAmount);
      fullyPaidCount++;
    } else {
      // Partial payment on the last invoice
      allocations[inv.id] = round2(unallocated);
      totalAllocated = round2(totalAllocated + unallocated);
      unallocated = 0;
    }
  }

  return {
    allocations,
    totalAllocated: round2(totalAllocated),
    remainingUnallocated: round2(unallocated),
    fullyPaidCount,
  };
}

/**
 * 2. Reservation Conflict Validation:
 * Checks whether any of the requested invoices are currently reserved by another pending collection request.
 */
export function validateReservationConflict(
  invoiceIds: string[],
  pendingRequests: CollectionRequest[],
  excludeRequestId?: string
): { hasConflict: boolean; conflictingInvoiceIds: string[]; conflictingRequestNos: string[] } {
  const conflictingInvoiceIds = new Set<string>();
  const conflictingRequestNos = new Set<string>();

  const activePending = pendingRequests.filter(
    (r) => r.status === 'Pending' && r.id !== excludeRequestId
  );

  for (const req of activePending) {
    for (const inv of req.invoicesAffected) {
      if (invoiceIds.includes(inv.invoiceId) && inv.collectNow > 0) {
        conflictingInvoiceIds.add(inv.invoiceId);
        conflictingRequestNos.add(req.requestNo);
      }
    }
  }

  return {
    hasConflict: conflictingInvoiceIds.size > 0,
    conflictingInvoiceIds: Array.from(conflictingInvoiceIds),
    conflictingRequestNos: Array.from(conflictingRequestNos),
  };
}

/**
 * 3. Mode B (Settlement GL) Balance and Reservations:
 * Available Balance = Current GL Balance - sum(Active Pending Mode B Reservations)
 */
export function calculateModeBAvailability(
  settlementGL: GLAccount,
  pendingRequests: CollectionRequest[],
  excludeRequestId?: string
): {
  currentBalance: number;
  pendingReservations: number;
  availableBalance: number;
} {
  const currentBalance = round2(settlementGL.balance);

  const pendingReservations = pendingRequests
    .filter(
      (r) =>
        r.status === 'Pending' &&
        r.mode === 'Mode B' &&
        r.glAccountCode === settlementGL.code &&
        r.id !== excludeRequestId
    )
    .reduce((sum, r) => sum + r.amount, 0);

  const availableBalance = round2(currentBalance - pendingReservations);

  return {
    currentBalance,
    pendingReservations: round2(pendingReservations),
    availableBalance,
  };
}

/**
 * 4. Locked Period Validation:
 * No collection can be dated before the mock accounting lock date (01-10-2026).
 */
export const LOCKED_PERIOD_CUTOFF = '2026-10-01';

export function isDateInLockedPeriod(dateStr: string, cutoffDate: string = LOCKED_PERIOD_CUTOFF): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < new Date(cutoffDate).getTime();
}

/**
 * 5. Stale Invoices Detection (Re-validation at Final Approval):
 * Checks if the current invoice dues still match the requested amounts.
 * If customer paid in POS while request was pending, invoice is stale.
 */
export function detectStaleInvoices(
  request: CollectionRequest,
  currentInvoices: Invoice[]
): { isStale: boolean; staleInvoiceNos: string[]; message?: string } {
  const staleInvoiceNos: string[] = [];

  for (const item of request.invoicesAffected) {
    const liveInv = currentInvoices.find((i) => i.id === item.invoiceId);
    if (!liveInv) {
      staleInvoiceNos.push(item.invoiceNo);
      continue;
    }

    // If live due is less than the requested collection amount, stale!
    if (round2(liveInv.dueAmount) < round2(item.collectNow)) {
      staleInvoiceNos.push(item.invoiceNo);
    }
  }

  return {
    isStale: staleInvoiceNos.length > 0,
    staleInvoiceNos,
    message:
      staleInvoiceNos.length > 0
        ? `Invoice(s) ${staleInvoiceNos.join(', ')} were collected or modified out-of-band while this request was pending approval.`
        : undefined,
  };
}

/**
 * 6. Multi-level Approval Threshold Calculation:
 * - Up to 50,000: 1 level (L1)
 * - Up to 500,000: 2 levels (L1, L2)
 * - Above 500,000: 3 levels (L1, L2, L3)
 */
export function calculateRequiredLevels(
  amount: number,
  config: Pick<GLSetupConfig, 'thresholdL1Max' | 'thresholdL2Max'>
): number {
  if (amount <= config.thresholdL1Max) return 1;
  if (amount <= config.thresholdL2Max) return 2;
  return 3;
}

/**
 * 7. Maker-Checker Validation:
 * Requester cannot approve their own request.
 */
export function validateMakerChecker(
  requesterId: string,
  approverId: string
): { isValid: boolean; error?: string } {
  if (requesterId === approverId) {
    return {
      isValid: false,
      error: 'Maker-Checker policy: You cannot approve a collection request created by yourself.',
    };
  }
  return { isValid: true };
}

/**
 * 8. Accounting Voucher Generator (Section 12 compliant):
 * SINGLE collection -> "Due Receive (Manual)", voucher CR-YYMMNNN
 * Narration: "Due Receive from <CUSTOMER NAME> Invoice(s): <invoiceNo1>,<invoiceNo2>,..." (comma-separated, no spaces)
 */
export function generateSingleDueReceiveVoucher(
  request: CollectionRequest,
  voucherNo: string,
  officeName: string = 'FairPrice'
): JournalVoucher {
  const invNos = request.invoicesAffected
    .filter((i) => i.collectNow > 0)
    .map((i) => i.invoiceNo)
    .join(',');

  const narration = `Due Receive from ${request.customerName} Invoice(s): ${invNos}`;

  const lines: JournalLine[] = [];

  if (request.mode === 'Mode A' && request.paymentLines && request.paymentLines.length > 0) {
    // Mode A: Dr per payment line
    request.paymentLines.forEach((line, idx) => {
      lines.push({
        id: `line-dr-${idx + 1}`,
        chartOfAccountNo: line.glAccountCode,
        chartOfAccountName: line.glAccountName,
        customerSupplierEmployee: request.customerName,
        remarks: line.referenceNo ? `Ref: ${line.referenceNo}` : `Method: ${line.method}`,
        debit: round2(line.amount),
        credit: 0,
      });
    });
  } else {
    // Mode B (or default): Dr Settlement / Receiving GL
    lines.push({
      id: 'line-dr-1',
      chartOfAccountNo: request.glAccountCode,
      chartOfAccountName: request.glAccountName,
      customerSupplierEmployee: request.customerName,
      remarks: request.mode === 'Mode B' ? 'Settlement GL Clearing' : request.narration,
      debit: round2(request.amount),
      credit: 0,
    });
  }

  // Cr Accounts Receivable (tagged with customer)
  lines.push({
    id: `line-cr-${lines.length + 1}`,
    chartOfAccountNo: '1200',
    chartOfAccountName: `Accounts receivable : ${request.customerName}`,
    customerSupplierEmployee: request.customerName,
    remarks: `Invoices: ${invNos}`,
    debit: 0,
    credit: round2(request.amount),
  });

  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));

  return {
    voucherNo,
    voucherDate: request.collectionDate,
    voucherType: 'Due Receive (Manual)',
    officeName,
    actionBy: request.createdBy,
    narration,
    remarks: request.remarks || '',
    lines,
    totalDebit,
    totalCredit,
    requestId: request.id,
    batchId: request.batchId,
  };
}

/**
 * 9. Bulk Due Receive Voucher (Section 12 compliant):
 * One Dr line on the chosen GL for the batch total,
 * plus one Cr line per customer on "Accounts receivable : <CUSTOMER>" with the customer tagged.
 */
export function generateBulkDueReceiveVoucher(
  batchNo: string,
  voucherNo: string,
  collectionDate: string,
  mode: 'Mode A' | 'Mode B',
  glCode: string,
  glName: string,
  requests: CollectionRequest[],
  filterSummary: string,
  createdBy: string,
  officeName: string = 'FairPrice'
): JournalVoucher {
  const totalBatchAmount = round2(requests.reduce((s, r) => s + r.amount, 0));
  const lines: JournalLine[] = [];

  // Dr Receiving or Settlement GL for total batch amount
  lines.push({
    id: 'bulk-line-dr-1',
    chartOfAccountNo: glCode,
    chartOfAccountName: glName,
    customerSupplierEmployee: 'Multiple Customers',
    remarks: `Bulk Due Receive Batch ${batchNo} (${requests.length} customers)`,
    debit: totalBatchAmount,
    credit: 0,
  });

  // Cr one line per customer
  requests.forEach((req, idx) => {
    const invNos = req.invoicesAffected.map((i) => i.invoiceNo).join(',');
    lines.push({
      id: `bulk-line-cr-${idx + 1}`,
      chartOfAccountNo: '1200',
      chartOfAccountName: `Accounts receivable : ${req.customerName}`,
      customerSupplierEmployee: req.customerName,
      remarks: `Inv: ${invNos}`,
      debit: 0,
      credit: round2(req.amount),
    });
  });

  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));

  return {
    voucherNo,
    voucherDate: collectionDate,
    voucherType: 'Due Receive (Bulk)',
    officeName,
    actionBy: createdBy,
    narration: `Bulk Due Receive Batch ${batchNo} ${filterSummary}`,
    remarks: `Processed bulk credit collection for ${requests.length} customers via ${mode} (${glCode})`,
    lines,
    totalDebit,
    totalCredit,
    batchId: batchNo,
  };
}

/**
 * 10. Reversal Voucher Generator:
 * Generates an exact offsetting Journal Voucher (Debit AR, Credit Receipt/Settlement GL)
 */
export function generateReversalVoucher(
  originalVoucher: JournalVoucher,
  reversalVoucherNo: string,
  reversedBy: string,
  reversalReason: string,
  currentDate: string
): JournalVoucher {
  const reversedLines: JournalLine[] = originalVoucher.lines.map((l, idx) => ({
    id: `rev-line-${idx + 1}`,
    chartOfAccountNo: l.chartOfAccountNo,
    chartOfAccountName: l.chartOfAccountName,
    customerSupplierEmployee: l.customerSupplierEmployee,
    remarks: `Reversal of ${originalVoucher.voucherNo}: ${reversalReason}`,
    debit: l.credit, // Invert Debit and Credit!
    credit: l.debit,
  }));

  return {
    voucherNo: reversalVoucherNo,
    voucherDate: currentDate,
    voucherType: 'Adjustment Journal (Manual)',
    officeName: originalVoucher.officeName,
    actionBy: reversedBy,
    narration: `Reversal of Voucher ${originalVoucher.voucherNo}. Reason: ${reversalReason}`,
    remarks: `Linked original voucher: ${originalVoucher.voucherNo}`,
    lines: reversedLines,
    totalDebit: originalVoucher.totalCredit,
    totalCredit: originalVoucher.totalDebit,
    requestId: originalVoucher.requestId,
    batchId: originalVoucher.batchId,
  };
}
