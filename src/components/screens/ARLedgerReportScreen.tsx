import React, { useState, useMemo } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { formatCurrency, formatDateDMY } from '../../utils/format';
import {
  ArrowLeft,
  Search,
  Printer,
  BookOpen,
} from 'lucide-react';

interface LedgerRow {
  id: string;
  date: string;
  office: string;
  transactionNo: string;
  voucherType: string;
  contraAccountName: string;
  narration: string;
  debit: number;
  credit: number;
  closingBalance: number;
}

export const ARLedgerReportScreen: React.FC = () => {
  const { vouchers, setActiveJournalVoucher, navigateTo } = useCreditCollection();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('All');
  const [fromDate, setFromDate] = useState('2026-09-01');
  const [toDate, setToDate] = useState('2026-11-30');

  // Build the live AR Ledger rows from all posted vouchers!
  const ledgerRows = useMemo(() => {
    let runningBalance = 0;
    const rows: LedgerRow[] = [];

    // Sort vouchers chronologically
    const sorted = [...vouchers].sort(
      (a, b) => new Date(a.voucherDate).getTime() - new Date(b.voucherDate).getTime()
    );

    sorted.forEach((v) => {
      // Find lines affecting Accounts Receivable (1200)
      const arLines = v.lines.filter(
        (l) => l.chartOfAccountNo === '1200' || l.chartOfAccountName.includes('Accounts receivable')
      );

      arLines.forEach((arLine, idx) => {
        // Find contra lines
        const contraLines = v.lines.filter((l) => l.id !== arLine.id);
        const contraAccountName =
          contraLines.map((c) => c.chartOfAccountName).join(', ') || 'General Offset';

        // AR is an Asset: Debit increases AR, Credit decreases AR
        runningBalance = runningBalance + arLine.debit - arLine.credit;

        rows.push({
          id: `${v.voucherNo}-${idx}`,
          date: v.voucherDate,
          office: v.officeName,
          transactionNo: v.voucherNo,
          voucherType: v.voucherType,
          contraAccountName,
          narration: v.narration,
          debit: arLine.debit,
          credit: arLine.credit,
          closingBalance: runningBalance,
        });
      });
    });

    return rows;
  }, [vouchers]);

  const filteredRows = useMemo(() => {
    return ledgerRows.filter((r) => {
      if (selectedOffice !== 'All' && r.office !== selectedOffice) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        r.transactionNo.toLowerCase().includes(q) ||
        r.contraAccountName.toLowerCase().includes(q) ||
        r.narration.toLowerCase().includes(q)
      );
    });
  }, [ledgerRows, selectedOffice, searchQuery]);

  const totalPeriodDebit = filteredRows.reduce((sum, r) => sum + r.debit, 0);
  const totalPeriodCredit = filteredRows.reduce((sum, r) => sum + r.credit, 0);

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen text-slate-800">
      {/* Top Header */}
      <div className="border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-14 z-20 bg-white shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('POS', 'MAIN')}
            className="p-1 rounded hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#2F6FDE]" />
              <span>General Ledger of Accounts Receivable (1200)</span>
            </h1>
            <p className="text-xs text-slate-500">
              Official Subledger Audit Trail: Credit Sales (Debit) and Approved Collections (Credit).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF / Print</span>
          </button>
        </div>
      </div>

      {/* Filter Row matching Managerium reports */}
      <div className="px-6 py-3 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">From Date:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">To Date:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Office:</span>
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="border border-gray-300 rounded px-2.5 py-1 bg-white text-slate-800 font-medium"
            >
              <option value="All">All Offices</option>
              <option value="FairPrice">FairPrice</option>
              <option value="Japan Garden City-JGC">Japan Garden City-JGC</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Voucher, Contra, Customer..."
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-60"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse min-w-[1100px] text-xs">
            <thead className="bg-[#DCEBFA] text-slate-800 font-semibold border-b border-[#cbdff4]">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Office</th>
                <th className="py-2.5 px-3">Transaction No</th>
                <th className="py-2.5 px-3">Contra Account Name</th>
                <th className="py-2.5 px-3 max-w-sm">Remarks / Narration</th>
                <th className="py-2.5 px-3 text-right">Debit (Sales)</th>
                <th className="py-2.5 px-3 text-right">Credit (Collections)</th>
                <th className="py-2.5 px-3 text-right font-bold">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-slate-700">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No transactions recorded for the selected filter period.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {formatDateDMY(row.date)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">{row.office}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-[#2F6FDE]">
                      <button
                        type="button"
                        onClick={() => {
                          const v = vouchers.find((voc) => voc.voucherNo === row.transactionNo);
                          if (v) setActiveJournalVoucher(v);
                        }}
                        className="hover:underline"
                        title="Click to view Account Journal Details"
                      >
                        {row.transactionNo}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">
                      {row.contraAccountName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-sm truncate" title={row.narration}>
                      {row.narration}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {row.debit > 0 ? formatCurrency(row.debit) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                      {row.credit > 0 ? formatCurrency(row.credit) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ৳ {formatCurrency(row.closingBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Balance (During the Period) row per Section 12 */}
            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
              <tr>
                <td colSpan={5} className="py-3 px-3 text-right uppercase tracking-wider text-slate-700">
                  Balance (During the Period):
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-900">
                  ৳ {formatCurrency(totalPeriodDebit)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-700">
                  ৳ {formatCurrency(totalPeriodCredit)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-blue-800 text-sm">
                  ৳ {formatCurrency(totalPeriodDebit - totalPeriodCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
