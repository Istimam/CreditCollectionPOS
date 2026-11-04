import React from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { Customer } from '../../types';
import { formatCurrency } from '../../utils/format';
import { DollarSign, Users } from 'lucide-react';

export const DueListTab: React.FC = () => {
  const { customers, setSelectedCustomer, filters, setFilters } = useCreditCollection();

  // Filter 1: Only customers who have at least one due (dueAmount > 0)
  const dueCustomers = customers.filter((c) => c.dueAmount > 0);

  // Filter 2: Search Query filter & Customer Group filter
  const filteredCustomers = dueCustomers.filter((c) => {
    if (filters.customerGroup && filters.customerGroup !== 'ALL') {
      if (c.customerGroup !== filters.customerGroup) return false;
    }

    const q = filters.searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.customerName.toLowerCase().includes(q) ||
      c.customerCode.toLowerCase().includes(q) ||
      c.mobileNo.includes(q) ||
      c.customerGroup.toLowerCase().includes(q)
    );
  });

  // Calculate totals
  const totalCreditLimit = filteredCustomers.reduce((sum, c) => sum + c.creditLimit, 0);
  const totalSales = filteredCustomers.reduce((sum, c) => sum + c.totalCreditSales, 0);
  const totalReturn = filteredCustomers.reduce((sum, c) => sum + c.returnAmount, 0);
  const totalCollected = filteredCustomers.reduce((sum, c) => sum + c.collectedAmount, 0);
  const totalPendingApproval = filteredCustomers.reduce((sum, c) => sum + c.pendingApprovalAmount, 0);
  const totalDue = filteredCustomers.reduce((sum, c) => sum + c.dueAmount, 0);

  const handleOpenCollection = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden text-xs">
      {/* Table Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[calc(100vh-14rem)]">
        <table className="w-full text-left border-collapse min-w-[1300px]">
          {/* Pale-blue Managerium Header */}
          <thead className="sticky top-0 bg-[#DCEBFA] text-slate-800 font-semibold z-10 border-b border-[#cbdff4]">
            <tr>
              <th className="py-2.5 px-3 text-center w-12 font-semibold">SL</th>
              <th className="py-2.5 px-3 text-center w-16 font-semibold">Action</th>
              <th className="py-2.5 px-3 font-semibold">Customer Code</th>
              <th className="py-2.5 px-3 font-semibold">Customer Name</th>
              <th className="py-2.5 px-3 font-semibold">Group</th>
              <th className="py-2.5 px-3 font-semibold">Mobile No.</th>
              <th className="py-2.5 px-3 text-right font-semibold">Credit Limit</th>
              <th className="py-2.5 px-3 text-right font-semibold">Total Credit Sales</th>
              <th className="py-2.5 px-3 text-right font-semibold text-rose-700 bg-rose-50/50">
                Return Amount
              </th>
              <th className="py-2.5 px-3 text-right font-semibold">Collected Amount</th>
              <th className="py-2.5 px-3 text-right font-semibold text-amber-700 bg-amber-50/60">
                Pending Approval
              </th>
              <th className="py-2.5 px-3 text-right font-semibold">Due Amount</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-slate-700">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-500">
                      {filters.searchQuery
                        ? `No customers found matching "${filters.searchQuery}"`
                        : 'No pending customer credit dues! All accounts are fully settled.'}
                    </p>
                    {filters.searchQuery && (
                      <button
                        onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                        className="text-xs text-blue-600 underline font-semibold mt-1"
                      >
                        Clear search filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer, index) => (
                <tr
                  key={customer.id}
                  className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                  onClick={() => handleOpenCollection(customer)}
                >
                  {/* SL */}
                  <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                    {index + 1}
                  </td>

                  {/* Action: Round $ icon */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCollection(customer);
                      }}
                      title={`Collect dues for ${customer.customerName}`}
                      className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-[#2F6FDE] text-slate-600 group-hover:text-white inline-flex items-center justify-center transition shadow-xs"
                    >
                      <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </td>

                  {/* Customer Code */}
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                    {customer.customerCode}
                  </td>

                  {/* Customer Name */}
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span>{customer.customerName}</span>
                      {customer.isCreditBlocked && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">
                          Blocked
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Group */}
                  <td className="py-2.5 px-3 text-slate-600">
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                      {customer.customerGroup}
                    </span>
                  </td>

                  {/* Mobile No. */}
                  <td className="py-2.5 px-3 font-mono text-slate-600">{customer.mobileNo}</td>

                  {/* Credit Limit */}
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {formatCurrency(customer.creditLimit)}
                  </td>

                  {/* Total Credit Sales */}
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                    {formatCurrency(customer.totalCreditSales)}
                  </td>

                  {/* Return Amount */}
                  <td className="py-2.5 px-3 text-right font-mono bg-rose-50/30 text-rose-700 font-semibold">
                    {customer.returnAmount > 0 ? `-${formatCurrency(customer.returnAmount)}` : '0.00'}
                  </td>

                  {/* Collected Amount */}
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                    {formatCurrency(customer.collectedAmount)}
                  </td>

                  {/* Pending Approval Amount */}
                  <td className="py-2.5 px-3 text-right font-mono bg-amber-50/50 text-amber-800 font-bold">
                    {customer.pendingApprovalAmount > 0
                      ? formatCurrency(customer.pendingApprovalAmount)
                      : '0.00'}
                  </td>

                  {/* Due Amount */}
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                    {formatCurrency(customer.dueAmount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Sticky Totals Footer */}
          {filteredCustomers.length > 0 && (
            <tfoot className="sticky bottom-0 bg-[#F0F5FC] text-slate-800 font-bold border-t-2 border-[#cbdff4] z-10 shadow-inner">
              <tr>
                <td colSpan={6} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-700">
                  Total:
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                  {formatCurrency(totalCreditLimit)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                  {formatCurrency(totalSales)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                  {totalReturn > 0 ? `-${formatCurrency(totalReturn)}` : '0.00'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                  {formatCurrency(totalCollected)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-amber-800 bg-amber-100/40">
                  {formatCurrency(totalPendingApproval)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-red-600 text-sm">
                  ৳ {formatCurrency(totalDue)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
