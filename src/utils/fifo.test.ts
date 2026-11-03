import { describe, it, expect } from 'vitest';
import { allocateFIFO } from './fifo';
import { Invoice } from '../types';

function createMockInvoice(id: string, invoiceNo: string, date: string, dueAmount: number): Invoice {
  return {
    id,
    invoiceNo,
    customerId: 'CUS-1',
    customerCode: 'CUS-001',
    customerName: 'Test Customer',
    customerMobile: '01700000000',
    invoiceDate: date,
    dueDate: '2026-11-30',
    creditDays: 30,
    grossAmount: dueAmount,
    discountAmount: 0,
    netAmount: dueAmount,
    returnAmount: 0,
    creditAmount: dueAmount,
    previouslyCollected: 0,
    dueAmount,
    status: 'Active',
    items: [],
    initialPaymentBreakdown: [],
    collectionHistory: [],
  };
}

describe('FIFO Allocation Logic', () => {
  const invoices: Invoice[] = [
    createMockInvoice('inv-1', 'INV-001', '2026-09-01', 500),
    createMockInvoice('inv-2', 'INV-002', '2026-09-15', 500),
    createMockInvoice('inv-3', 'INV-003', '2026-10-01', 500),
    createMockInvoice('inv-4', 'INV-004', '2026-10-15', 500),
  ];

  it('handles partial payment (prompt example: 4 invoices of 500, customer pays 1,500)', () => {
    const result = allocateFIFO(invoices, 1500);
    expect(result.allocations['inv-1']).toBe(500);
    expect(result.allocations['inv-2']).toBe(500);
    expect(result.allocations['inv-3']).toBe(500);
    expect(result.allocations['inv-4']).toBe(0);
    expect(result.totalAllocated).toBe(1500);
    expect(result.unallocatedExcess).toBe(0);
  });

  it('handles partial last invoice (customer pays 1,250 across 4x500 invoices)', () => {
    const result = allocateFIFO(invoices, 1250);
    expect(result.allocations['inv-1']).toBe(500);
    expect(result.allocations['inv-2']).toBe(500);
    expect(result.allocations['inv-3']).toBe(250);
    expect(result.allocations['inv-4']).toBe(0);
    expect(result.totalAllocated).toBe(1250);
    expect(result.unallocatedExcess).toBe(0);
  });

  it('handles exact total payment (pays full 2,000)', () => {
    const result = allocateFIFO(invoices, 2000);
    expect(result.allocations['inv-1']).toBe(500);
    expect(result.allocations['inv-2']).toBe(500);
    expect(result.allocations['inv-3']).toBe(500);
    expect(result.allocations['inv-4']).toBe(500);
    expect(result.totalAllocated).toBe(2000);
    expect(result.unallocatedExcess).toBe(0);
  });

  it('handles overpayment (customer pays 2,500 against 2,000 total due)', () => {
    const result = allocateFIFO(invoices, 2500);
    expect(result.allocations['inv-1']).toBe(500);
    expect(result.allocations['inv-2']).toBe(500);
    expect(result.allocations['inv-3']).toBe(500);
    expect(result.allocations['inv-4']).toBe(500);
    expect(result.totalAllocated).toBe(2000);
    expect(result.unallocatedExcess).toBe(500);
  });

  it('handles single-invoice mode (targets specific invoice inv-3 for 300)', () => {
    const result = allocateFIFO(invoices, 300, 'inv-3');
    expect(result.allocations['inv-1']).toBe(0);
    expect(result.allocations['inv-2']).toBe(0);
    expect(result.allocations['inv-3']).toBe(300);
    expect(result.allocations['inv-4']).toBe(0);
    expect(result.totalAllocated).toBe(300);
    expect(result.unallocatedExcess).toBe(0);
  });

  it('handles single-invoice overpayment (targets inv-3 due 500 with amount 700)', () => {
    const result = allocateFIFO(invoices, 700, 'inv-3');
    expect(result.allocations['inv-3']).toBe(500);
    expect(result.totalAllocated).toBe(500);
    expect(result.unallocatedExcess).toBe(200);
  });

  it('handles zero or negative payment amounts safely', () => {
    const zeroResult = allocateFIFO(invoices, 0);
    expect(zeroResult.totalAllocated).toBe(0);
    expect(zeroResult.allocations['inv-1']).toBe(0);

    const negResult = allocateFIFO(invoices, -500);
    expect(negResult.totalAllocated).toBe(0);
    expect(negResult.allocations['inv-1']).toBe(0);
  });
});
