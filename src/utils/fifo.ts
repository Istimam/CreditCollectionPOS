import { Invoice } from '../types';

export interface AllocationResult {
  allocations: Record<string, number>; // invoiceId -> allocated amount
  totalAllocated: number;
  unallocatedExcess: number;
}

/**
 * Distributes a payment amount across due invoices in FIFO order (oldest invoiceDate first).
 * If targetInvoiceId is provided, allocates exclusively to that invoice up to its due amount.
 */
export function allocateFIFO(
  invoices: Invoice[],
  amount: number,
  targetInvoiceId?: string
): AllocationResult {
  const result: AllocationResult = {
    allocations: {},
    totalAllocated: 0,
    unallocatedExcess: 0,
  };

  const cleanAmount = Math.max(0, Number(amount) || 0);
  if (cleanAmount <= 0) {
    invoices.forEach((inv) => {
      result.allocations[inv.id] = 0;
    });
    return result;
  }

  // Single-invoice mode
  if (targetInvoiceId) {
    invoices.forEach((inv) => {
      result.allocations[inv.id] = 0;
    });

    const target = invoices.find((inv) => inv.id === targetInvoiceId);
    if (target) {
      const alloc = Math.min(cleanAmount, target.dueAmount);
      result.allocations[target.id] = round2(alloc);
      result.totalAllocated = round2(alloc);
      result.unallocatedExcess = round2(cleanAmount - alloc);
    } else {
      result.unallocatedExcess = round2(cleanAmount);
    }
    return result;
  }

  // FIFO mode across invoices sorted by date ascending
  const sortedInvoices = [...invoices].sort((a, b) => {
    const timeA = new Date(a.invoiceDate).getTime();
    const timeB = new Date(b.invoiceDate).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.invoiceNo.localeCompare(b.invoiceNo);
  });

  let remainingToDistribute = cleanAmount;

  for (const inv of sortedInvoices) {
    if (inv.dueAmount <= 0) {
      result.allocations[inv.id] = 0;
      continue;
    }

    if (remainingToDistribute <= 0) {
      result.allocations[inv.id] = 0;
      continue;
    }

    const alloc = Math.min(remainingToDistribute, inv.dueAmount);
    const roundedAlloc = round2(alloc);
    result.allocations[inv.id] = roundedAlloc;
    result.totalAllocated = round2(result.totalAllocated + roundedAlloc);
    remainingToDistribute = round2(remainingToDistribute - roundedAlloc);
  }

  result.unallocatedExcess = round2(Math.max(0, remainingToDistribute));
  return result;
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
