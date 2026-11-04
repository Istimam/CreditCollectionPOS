import { describe, it, expect } from 'vitest';
import {
  allocateFIFO,
  validateReservationConflict,
  calculateModeBAvailability,
  isDateInLockedPeriod,
  detectStaleInvoices,
  calculateRequiredLevels,
  validateMakerChecker,
  generateSingleDueReceiveVoucher,
  generateBulkDueReceiveVoucher,
  generateReversalVoucher,
} from './domain';
import { Invoice, CollectionRequest, GLAccount, JournalVoucher } from '../types';

describe('Credit Collection Pure Domain Logic', () => {
  const mockInvoices: Invoice[] = [
    {
      id: 'inv-1',
      invoiceNo: 'INV-001',
      customerId: 'cus-1',
      customerCode: 'CUS-001',
      customerName: 'MD Bulbul',
      customerGroup: 'Factory Employees',
      customerMobile: '01700000001',
      invoiceDate: '2026-09-01',
      dueDate: '2026-10-01',
      creditDays: 30,
      grossAmount: 3000,
      discountAmount: 0,
      netAmount: 3000,
      returnAmount: 0,
      creditAmount: 3000,
      previouslyCollected: 1000,
      pendingApprovalAmount: 0,
      dueAmount: 2000,
      effectiveDueAmount: 2000,
      status: 'Overdue',
      items: [],
      initialPaymentBreakdown: [],
      collectionHistory: [],
    },
    {
      id: 'inv-2',
      invoiceNo: 'INV-002',
      customerId: 'cus-1',
      customerCode: 'CUS-001',
      customerName: 'MD Bulbul',
      customerGroup: 'Factory Employees',
      customerMobile: '01700000001',
      invoiceDate: '2026-09-15',
      dueDate: '2026-10-15',
      creditDays: 30,
      grossAmount: 5000,
      discountAmount: 0,
      netAmount: 5000,
      returnAmount: 0,
      creditAmount: 5000,
      previouslyCollected: 0,
      pendingApprovalAmount: 0,
      dueAmount: 5000,
      effectiveDueAmount: 5000,
      status: 'Active',
      items: [],
      initialPaymentBreakdown: [],
      collectionHistory: [],
    },
  ];

  it('1. FIFO allocates exact full payment to oldest invoice', () => {
    const result = allocateFIFO(mockInvoices, 2000);
    expect(result.allocations['inv-1']).toBe(2000);
    expect(result.allocations['inv-2']).toBe(0);
    expect(result.totalAllocated).toBe(2000);
    expect(result.fullyPaidCount).toBe(1);
    expect(result.remainingUnallocated).toBe(0);
  });

  it('2. FIFO allocates partial to the second invoice', () => {
    const result = allocateFIFO(mockInvoices, 3500);
    expect(result.allocations['inv-1']).toBe(2000); // Fully settled
    expect(result.allocations['inv-2']).toBe(1500); // Partial
    expect(result.totalAllocated).toBe(3500);
    expect(result.fullyPaidCount).toBe(1);
    expect(result.remainingUnallocated).toBe(0);
  });

  it('3. Reservation conflicts detect already reserved invoices', () => {
    const pendingRequests: CollectionRequest[] = [
      {
        id: 'req-1',
        requestNo: 'CRQ-001',
        requestDate: '2026-11-01',
        collectionDate: '2026-11-01',
        type: 'Single',
        customerId: 'cus-1',
        customerCode: 'CUS-001',
        customerName: 'MD Bulbul',
        customerGroup: 'Factory Employees',
        customerMobile: '01700000001',
        mode: 'Mode A',
        glAccountCode: '1000',
        glAccountName: 'Cash',
        amount: 2000,
        narration: '',
        createdBy: 'Saddam',
        createdById: 'usr-1',
        status: 'Pending',
        currentLevel: 'L1',
        requiredLevels: 1,
        approvalTrail: [],
        invoicesAffected: [
          {
            invoiceId: 'inv-1',
            invoiceNo: 'INV-001',
            invoiceDate: '2026-09-01',
            grossAmount: 3000,
            netAmount: 3000,
            dueAmount: 2000,
            collectNow: 2000,
            balanceAfter: 0,
          },
        ],
      },
    ];

    const conflictResult = validateReservationConflict(['inv-1', 'inv-2'], pendingRequests);
    expect(conflictResult.hasConflict).toBe(true);
    expect(conflictResult.conflictingInvoiceIds).toEqual(['inv-1']);
    expect(conflictResult.conflictingRequestNos).toEqual(['CRQ-001']);

    const noConflictResult = validateReservationConflict(['inv-2'], pendingRequests);
    expect(noConflictResult.hasConflict).toBe(false);
  });

  it('4. Mode B settlement GL availability deducts active pending reservations', () => {
    const settlementGL: GLAccount = {
      id: 'gl-1300',
      code: '1300',
      name: 'Employee Dues Settlement Clearing',
      group: 'Current Assets',
      class: 'Clearing',
      category: 'Settlement',
      purposeTag: 'Settlement/Clearing',
      balance: 1500000,
    };

    const pendingRequests: CollectionRequest[] = [
      {
        id: 'req-b-1',
        requestNo: 'CRQ-B1',
        requestDate: '2026-11-01',
        collectionDate: '2026-11-01',
        type: 'Bulk',
        customerId: 'cus-1',
        customerCode: 'CUS-001',
        customerName: 'MD Bulbul',
        customerGroup: 'Factory Employees',
        customerMobile: '01700000001',
        mode: 'Mode B',
        glAccountCode: '1300',
        glAccountName: 'Employee Dues Settlement Clearing',
        amount: 250000,
        narration: '',
        createdBy: 'Saddam',
        createdById: 'usr-1',
        status: 'Pending',
        currentLevel: 'L1',
        requiredLevels: 2,
        approvalTrail: [],
        invoicesAffected: [],
      },
    ];

    const availability = calculateModeBAvailability(settlementGL, pendingRequests);
    expect(availability.currentBalance).toBe(1500000);
    expect(availability.pendingReservations).toBe(250000);
    expect(availability.availableBalance).toBe(1250000);
  });

  it('5. Locked period detects dates before 01-10-2026', () => {
    expect(isDateInLockedPeriod('2026-09-15')).toBe(true);
    expect(isDateInLockedPeriod('2026-09-30')).toBe(true);
    expect(isDateInLockedPeriod('2026-10-01')).toBe(false);
    expect(isDateInLockedPeriod('2026-11-04')).toBe(false);
  });

  it('6. Stale invoice detection catches out-of-band payment in POS', () => {
    const request: CollectionRequest = {
      id: 'req-stale',
      requestNo: 'CRQ-STALE',
      requestDate: '2026-11-01',
      collectionDate: '2026-11-01',
      type: 'Single',
      customerId: 'cus-1',
      customerCode: 'CUS-001',
      customerName: 'MD Bulbul',
      customerGroup: 'Factory Employees',
      customerMobile: '01700000001',
      mode: 'Mode A',
      glAccountCode: '1000',
      glAccountName: 'Cash',
      amount: 2000,
      narration: '',
      createdBy: 'Saddam',
      createdById: 'usr-1',
      status: 'Pending',
      currentLevel: 'L1',
      requiredLevels: 1,
      approvalTrail: [],
      invoicesAffected: [
        {
          invoiceId: 'inv-1',
          invoiceNo: 'INV-001',
          invoiceDate: '2026-09-01',
          grossAmount: 3000,
          netAmount: 3000,
          dueAmount: 2000,
          collectNow: 2000,
          balanceAfter: 0,
        },
      ],
    };

    // Live invoice due is now 500 (customer paid 1500 at POS register while request was pending!)
    const liveInvoices: Invoice[] = [
      {
        ...mockInvoices[0],
        dueAmount: 500,
      },
    ];

    const staleResult = detectStaleInvoices(request, liveInvoices);
    expect(staleResult.isStale).toBe(true);
    expect(staleResult.staleInvoiceNos).toEqual(['INV-001']);
  });

  it('7. Multi-level approval thresholds correctly assign L1, L2, L3', () => {
    const config = { thresholdL1Max: 50000, thresholdL2Max: 500000 };
    expect(calculateRequiredLevels(25000, config)).toBe(1);
    expect(calculateRequiredLevels(50000, config)).toBe(1);
    expect(calculateRequiredLevels(50001, config)).toBe(2);
    expect(calculateRequiredLevels(450000, config)).toBe(2);
    expect(calculateRequiredLevels(500000, config)).toBe(2);
    expect(calculateRequiredLevels(500001, config)).toBe(3);
  });

  it('8. Maker-checker policy prohibits creator approving own request', () => {
    const invalidCheck = validateMakerChecker('usr-saddam', 'usr-saddam');
    expect(invalidCheck.isValid).toBe(false);

    const validCheck = validateMakerChecker('usr-saddam', 'usr-approver-l1');
    expect(validCheck.isValid).toBe(true);
  });

  it('9. Single collection voucher formats narration and balances debit == credit', () => {
    const request: CollectionRequest = {
      id: 'req-single',
      requestNo: 'CRQ-S1',
      requestDate: '2026-11-04',
      collectionDate: '2026-11-04',
      type: 'Single',
      customerId: 'cus-1',
      customerCode: 'CUS-001',
      customerName: 'MD Bulbul',
      customerGroup: 'Factory Employees',
      customerMobile: '01700000001',
      mode: 'Mode A',
      glAccountCode: '1000',
      glAccountName: '1000 - Cash in hand',
      paymentLines: [
        {
          id: 'pl-1',
          method: 'Cash',
          glAccountCode: '1000',
          glAccountName: '1000 - Cash in hand',
          referenceNo: '',
          amount: 2000,
        },
      ],
      amount: 2000,
      narration: '',
      createdBy: 'Saddam Khan',
      createdById: 'usr-saddam',
      status: 'Approved',
      currentLevel: 'Completed',
      requiredLevels: 1,
      approvalTrail: [],
      invoicesAffected: [
        {
          invoiceId: 'inv-1',
          invoiceNo: '122609051841100101',
          invoiceDate: '2026-09-05',
          grossAmount: 3000,
          netAmount: 3000,
          dueAmount: 2000,
          collectNow: 2000,
          balanceAfter: 0,
        },
      ],
    };

    const voucher = generateSingleDueReceiveVoucher(request, 'CR-2611001', 'FairPrice');
    expect(voucher.voucherType).toBe('Due Receive (Manual)');
    expect(voucher.narration).toBe(
      'Due Receive from MD Bulbul Invoice(s): 122609051841100101'
    );
    expect(voucher.totalDebit).toBe(2000);
    expect(voucher.totalCredit).toBe(2000);
    expect(voucher.totalDebit).toBe(voucher.totalCredit);
  });

  it('10. Bulk collection voucher balances batch total across multi-customer lines', () => {
    const requests: CollectionRequest[] = [
      {
        id: 'r1',
        requestNo: 'CRQ-1',
        requestDate: '2026-11-04',
        collectionDate: '2026-11-04',
        type: 'Bulk',
        customerId: 'cus-1',
        customerCode: 'CUS-001',
        customerName: 'MD Bulbul',
        customerGroup: 'Factory Employees',
        customerMobile: '01700000001',
        mode: 'Mode B',
        glAccountCode: '1300',
        glAccountName: 'Employee Settlement GL',
        amount: 3000,
        narration: '',
        createdBy: 'Saddam Khan',
        createdById: 'usr-saddam',
        status: 'Approved',
        currentLevel: 'Completed',
        requiredLevels: 1,
        approvalTrail: [],
        invoicesAffected: [
          {
            invoiceId: 'i1',
            invoiceNo: 'INV-101',
            invoiceDate: '2026-09-01',
            grossAmount: 3000,
            netAmount: 3000,
            dueAmount: 3000,
            collectNow: 3000,
            balanceAfter: 0,
          },
        ],
      },
      {
        id: 'r2',
        requestNo: 'CRQ-2',
        requestDate: '2026-11-04',
        collectionDate: '2026-11-04',
        type: 'Bulk',
        customerId: 'cus-2',
        customerCode: 'CUS-002',
        customerName: 'Pritom Traders',
        customerGroup: 'Walk-in Credit',
        customerMobile: '01700000002',
        mode: 'Mode B',
        glAccountCode: '1300',
        glAccountName: 'Employee Settlement GL',
        amount: 4500,
        narration: '',
        createdBy: 'Saddam Khan',
        createdById: 'usr-saddam',
        status: 'Approved',
        currentLevel: 'Completed',
        requiredLevels: 1,
        approvalTrail: [],
        invoicesAffected: [
          {
            invoiceId: 'i2',
            invoiceNo: 'INV-201',
            invoiceDate: '2026-09-02',
            grossAmount: 4500,
            netAmount: 4500,
            dueAmount: 4500,
            collectNow: 4500,
            balanceAfter: 0,
          },
        ],
      },
    ];

    const bulkVoucher = generateBulkDueReceiveVoucher(
      'BC-2026-0001',
      'CR-2611002',
      '2026-11-04',
      'Mode B',
      '1300',
      'Employee Settlement GL',
      requests,
      'Factory Employees',
      'Saddam Khan'
    );

    expect(bulkVoucher.voucherType).toBe('Due Receive (Bulk)');
    expect(bulkVoucher.totalDebit).toBe(7500);
    expect(bulkVoucher.totalCredit).toBe(7500);
    expect(bulkVoucher.lines.length).toBe(3); // 1 Dr line + 2 Cr customer lines
  });

  it('11. Reversal voucher inverts debits and credits accurately', () => {
    const originalVoucher: JournalVoucher = {
      voucherNo: 'CR-2611001',
      voucherDate: '2026-11-04',
      voucherType: 'Due Receive (Manual)',
      officeName: 'FairPrice',
      actionBy: 'Saddam',
      narration: 'Due Receive',
      remarks: '',
      lines: [
        {
          id: 'l1',
          chartOfAccountNo: '1000',
          chartOfAccountName: 'Cash',
          customerSupplierEmployee: 'MD Bulbul',
          remarks: '',
          debit: 2000,
          credit: 0,
        },
        {
          id: 'l2',
          chartOfAccountNo: '1200',
          chartOfAccountName: 'Accounts receivable : MD Bulbul',
          customerSupplierEmployee: 'MD Bulbul',
          remarks: '',
          debit: 0,
          credit: 2000,
        },
      ],
      totalDebit: 2000,
      totalCredit: 2000,
    };

    const reversal = generateReversalVoucher(
      originalVoucher,
      'JV-REV-001',
      'Nasarullah',
      'Check bounced',
      '2026-11-04'
    );

    expect(reversal.voucherType).toBe('Adjustment Journal (Manual)');
    expect(reversal.lines[0].debit).toBe(0);
    expect(reversal.lines[0].credit).toBe(2000); // Inverted!
    expect(reversal.lines[1].debit).toBe(2000);
    expect(reversal.lines[1].credit).toBe(0); // Inverted!
  });
});
