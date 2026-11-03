import React from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { formatCurrency, formatDateDMY, getDaysDifference } from '../../utils/format';
import { X, FileText, Calendar, CreditCard, DollarSign, RotateCcw } from 'lucide-react';

export const InvoiceDetailDrawer: React.FC = () => {
  const {
    activeInvoiceForDrawer,
    setActiveInvoiceForDrawer,
    customers,
    setSelectedCustomer,
  } = useCreditCollection();

  if (!activeInvoiceForDrawer) return null;

  const inv = activeInvoiceForDrawer;
  const daysDiff = getDaysDifference(inv.dueDate);
  const isOverdue = daysDiff < 0 && inv.dueAmount > 0;

  const customer = customers.find((c) => c.id === inv.customerId);

  const handleCollectNow = () => {
    if (customer) {
      setSelectedCustomer(customer);
      setActiveInvoiceForDrawer(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity print:hidden">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-[#f0f5fc] border-b border-[#cbdff4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-[#2F6FDE] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-800 font-mono">
                  #{inv.invoiceNo}
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    inv.status === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : inv.status === 'Overdue'
                      ? 'bg-red-100 text-red-800'
                      : inv.status === 'Partially Paid'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {inv.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {inv.customerName} ({inv.customerCode})
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveInvoiceForDrawer(null)}
            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Metadata Card */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Invoice Date</div>
              <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>{formatDateDMY(inv.invoiceDate)}</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Due Date</div>
              <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                <span>{formatDateDMY(inv.dueDate)}</span>
                {inv.dueAmount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isOverdue
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {isOverdue ? `${Math.abs(daysDiff)}d overdue` : `${daysDiff}d left`}
                  </span>
                )}
              </div>
            </div>

            {/* Return Invoices info */}
            <div className="col-span-2">
              <div className="text-[11px] text-slate-400 font-medium">Sales Return Invoice(s)</div>
              <div className="mt-1">
                {inv.returnInvoices && inv.returnInvoices.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {inv.returnInvoices.map((ret, rIdx) => (
                      <span
                        key={rIdx}
                        className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200"
                      >
                        <RotateCcw className="w-3 h-3 text-rose-500" />
                        <span>{ret.returnInvoiceNo}</span>
                        <span className="text-[10px] text-rose-500 font-sans font-normal">
                          (-৳{formatCurrency(ret.returnAmount)})
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 font-medium text-xs">No returns recorded</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 font-medium">Customer Mobile</div>
              <div className="font-mono font-medium text-slate-800 mt-0.5">
                {inv.customerMobile}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Credit Term</div>
              <div className="font-medium text-slate-800 mt-0.5">
                {inv.creditDays} Days
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <span>Invoice Items ({inv.items.length})</span>
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#DCEBFA] text-slate-700 text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inv.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-800">{item.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{item.barcode}</div>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">{item.qty}</td>
                      <td className="py-2 px-3 text-right text-slate-700">
                        ৳{formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-800">
                        ৳{formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales Return Invoices Section (When returns exist against this invoice) */}
          {inv.returnInvoices && inv.returnInvoices.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-rose-800 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sales Return Invoices ({inv.returnInvoices.length})</span>
                </h4>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Total Return: -৳{formatCurrency(inv.returnAmount)}
                </span>
              </div>

              <div className="space-y-2">
                {inv.returnInvoices.map((ret, rIdx) => (
                  <div
                    key={rIdx}
                    className="border border-rose-200 bg-rose-50/30 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                          {ret.returnInvoiceNo}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Date: {formatDateDMY(ret.returnDate)}
                        </span>
                      </div>
                      <span className="font-bold text-xs text-rose-700 font-mono">
                        -৳ {formatCurrency(ret.returnAmount)}
                      </span>
                    </div>

                    {ret.reason && (
                      <p className="text-[11px] text-slate-600 italic">
                        <span className="font-semibold text-slate-700 not-italic">Reason:</span>{' '}
                        {ret.reason}
                      </p>
                    )}

                    {ret.items && ret.items.length > 0 && (
                      <div className="bg-white rounded border border-rose-100 overflow-hidden mt-1.5">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-rose-50/70 text-slate-600 text-[10px]">
                            <tr>
                              <th className="py-1 px-2.5">Returned Item</th>
                              <th className="py-1 px-2 text-right">Qty</th>
                              <th className="py-1 px-2 text-right">Unit Price</th>
                              <th className="py-1 px-2.5 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-rose-50">
                            {ret.items.map((rItem, iIdx) => (
                              <tr key={iIdx}>
                                <td className="py-1 px-2.5 text-slate-700">{rItem.name}</td>
                                <td className="py-1 px-2 text-right text-slate-600">{rItem.qty}</td>
                                <td className="py-1 px-2 text-right text-slate-600">
                                  ৳{formatCurrency(rItem.unitPrice)}
                                </td>
                                <td className="py-1 px-2.5 text-right font-medium text-rose-700">
                                  ৳{formatCurrency(rItem.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Calculation Reconcile Card */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Gross Amount:</span>
              <span className="font-medium">৳ {formatCurrency(inv.grossAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Discount Amount:</span>
              <span className="font-medium text-emerald-600">
                -৳ {formatCurrency(inv.discountAmount)}
              </span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1.5">
              <span>Net Sale Amount:</span>
              <span>৳ {formatCurrency(inv.netAmount)}</span>
            </div>
            {inv.returnAmount > 0 && (
              <div className="bg-rose-50/80 border border-rose-200 p-2 rounded text-rose-800 space-y-1">
                <div className="flex justify-between font-bold text-xs">
                  <span>
                    Sales Return Deducted ({inv.returnInvoices?.length || 1} Return Inv):
                  </span>
                  <span className="font-mono">-৳ {formatCurrency(inv.returnAmount)}</span>
                </div>
                {inv.returnInvoices && inv.returnInvoices.length > 0 && (
                  <div className="text-[10px] text-rose-600 flex flex-wrap gap-1 font-mono">
                    {inv.returnInvoices.map((r, idx) => (
                      <span key={idx}>
                        {r.returnInvoiceNo} (-৳{formatCurrency(r.returnAmount)})
                        {idx < (inv.returnInvoices?.length || 0) - 1 ? ' • ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-between text-blue-700 font-semibold">
              <span>Net Credit Amount:</span>
              <span>৳ {formatCurrency(inv.creditAmount)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Previously Collected:</span>
              <span>৳ {formatCurrency(inv.previouslyCollected)}</span>
            </div>
            <div className="flex justify-between text-red-600 font-black text-sm border-t border-slate-300 pt-1.5">
              <span>Current Outstanding Due:</span>
              <span>৳ {formatCurrency(inv.dueAmount)}</span>
            </div>
          </div>

          {/* Initial POS Payment Breakdown */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span>Initial Point of Sale Payment Breakdown</span>
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#DCEBFA] text-slate-700 text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3">Account / Instrument</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inv.initialPaymentBreakdown.map((pm, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-700">{pm.method}</td>
                      <td className="py-2 px-3 text-slate-600">
                        {pm.account}
                        {pm.reference && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            Ref: {pm.reference}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-800">
                        ৳{formatCurrency(pm.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Collection Records History */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Credit Due Collections History</span>
            </h4>
            {inv.collectionHistory.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-slate-400">
                No subsequent collections made yet for this invoice.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#DCEBFA] text-slate-700 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Voucher No</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inv.collectionHistory.map((col, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-medium text-blue-600">
                          {col.voucherNo}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{formatDateDMY(col.date)}</td>
                        <td className="py-2 px-3 text-slate-600">{col.method}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          ৳{formatCurrency(col.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => setActiveInvoiceForDrawer(null)}
            className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-medium transition"
          >
            Close
          </button>

          {inv.dueAmount > 0 && customer && (
            <button
              onClick={handleCollectNow}
              className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white px-5 py-2 rounded font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <DollarSign className="w-4 h-4" />
              <span>Collect Outstanding (৳{formatCurrency(inv.dueAmount)})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
