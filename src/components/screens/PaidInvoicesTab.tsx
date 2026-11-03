import React from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { formatCurrency, formatDateDMY } from '../../utils/format';
import { CheckCircle2, FileText } from 'lucide-react';

export const PaidInvoicesTab: React.FC = () => {
  const { invoices, setActiveInvoiceForDrawer, filters } = useCreditCollection();

  const paidInvoices = invoices.filter((inv) => inv.status === 'Paid');

  const filteredInvoices = paidInvoices.filter((inv) => {
    const q = filters.searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.customerCode.toLowerCase().includes(q) ||
      inv.customerMobile.includes(q) ||
      (inv.returnRefNo && inv.returnRefNo.toLowerCase().includes(q))
    );
  });

  const totalGross = filteredInvoices.reduce((sum, i) => sum + i.grossAmount, 0);
  const totalNet = filteredInvoices.reduce((sum, i) => sum + i.netAmount, 0);
  const totalReturn = filteredInvoices.reduce((sum, i) => sum + i.returnAmount, 0);
  const totalCredit = filteredInvoices.reduce((sum, i) => sum + i.creditAmount, 0);
  const totalCollected = filteredInvoices.reduce((sum, i) => sum + i.previouslyCollected, 0);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[calc(100vh-14rem)]">
        <table className="w-full text-left border-collapse min-w-[1300px] text-xs">
          <thead className="sticky top-0 bg-[#DCEBFA] text-slate-800 font-semibold z-10 border-b border-[#cbdff4]">
            <tr>
              <th className="py-2.5 px-3 text-center w-12 font-semibold">SL</th>
              <th className="py-2.5 px-3 font-semibold">Invoice No</th>
              <th className="py-2.5 px-3 font-semibold">Return Ref / Challan</th>
              <th className="py-2.5 px-3 font-semibold">Customer</th>
              <th className="py-2.5 px-3 font-semibold">Mobile No</th>
              <th className="py-2.5 px-3 font-semibold">Invoice Date</th>
              <th className="py-2.5 px-3 text-right font-semibold">Gross</th>
              <th className="py-2.5 px-3 text-right font-semibold">Net</th>
              <th className="py-2.5 px-3 text-right font-semibold text-rose-700 bg-rose-50/50">
                Return Amount
              </th>
              <th className="py-2.5 px-3 text-right font-semibold">Credit Amount</th>
              <th className="py-2.5 px-3 text-right font-semibold">Collected</th>
              <th className="py-2.5 px-3 font-semibold">Collection Date</th>
              <th className="py-2.5 px-3 font-semibold">Payment Method Used</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-slate-700">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-500">
                      {filters.searchQuery
                        ? `No paid invoices matching "${filters.searchQuery}"`
                        : 'No paid invoices found.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv, index) => {
                const methodsUsed =
                  inv.collectionHistory.map((h) => h.method).join(', ') || 'Direct POS / Cash';
                const latestDate =
                  inv.collectionHistory[inv.collectionHistory.length - 1]?.date || inv.dueDate;

                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    onClick={() => setActiveInvoiceForDrawer(inv)}
                  >
                    <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                      {index + 1}
                    </td>

                    {/* Clickable Invoice No */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#2F6FDE] group-hover:underline flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>{inv.invoiceNo}</span>
                    </td>

                    {/* Return Ref / Challan */}
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {inv.returnRefNo ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-rose-700">{inv.returnRefNo}</span>
                          <span className="text-[10px] text-slate-400">{inv.challanNo || '—'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">{inv.challanNo || '—'}</span>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      <div>{inv.customerName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{inv.customerCode}</div>
                    </td>

                    {/* Mobile */}
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {inv.customerMobile}
                    </td>

                    {/* Invoice Date */}
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDateDMY(inv.invoiceDate)}
                    </td>

                    {/* Gross */}
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {formatCurrency(inv.grossAmount)}
                    </td>

                    {/* Net */}
                    <td className="py-2.5 px-3 text-right text-slate-700 font-medium">
                      {formatCurrency(inv.netAmount)}
                    </td>

                    {/* Return Amount */}
                    <td className="py-2.5 px-3 text-right font-semibold bg-rose-50/40 text-rose-700">
                      {inv.returnAmount > 0 ? `-${formatCurrency(inv.returnAmount)}` : '0.00'}
                    </td>

                    {/* Credit Amount */}
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      {formatCurrency(inv.creditAmount)}
                    </td>

                    {/* Collected */}
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                      {formatCurrency(inv.previouslyCollected)}
                    </td>

                    {/* Collection Date */}
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDateDMY(latestDate)}
                    </td>

                    {/* Payment Methods */}
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={methodsUsed}>
                      <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                        {methodsUsed}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {filteredInvoices.length > 0 && (
            <tfoot className="sticky bottom-0 bg-[#F0F5FC] text-slate-800 font-bold border-t-2 border-[#cbdff4] z-10 shadow-inner">
              <tr>
                <td colSpan={6} className="py-2.5 px-3 text-right font-bold uppercase tracking-wider text-slate-700">
                  Total ({filteredInvoices.length} Paid Invoices):
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                  {formatCurrency(totalGross)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                  {formatCurrency(totalNet)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                  {totalReturn > 0 ? `-${formatCurrency(totalReturn)}` : '0.00'}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                  {formatCurrency(totalCredit)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                  {formatCurrency(totalCollected)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="px-6 py-2 bg-slate-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-slate-500">
        <div>Showing {filteredInvoices.length} fully settled credit invoices.</div>
        <div>Click any invoice row to view items breakdown, receipt breakdown & collection trail.</div>
      </div>
    </div>
  );
};
