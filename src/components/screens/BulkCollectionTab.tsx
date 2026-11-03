import React, { useState, useRef } from 'react';
import { useCreditCollection } from '../../context/CreditCollectionContext';
import { BulkUploadRow } from '../../types';
import {
  downloadBulkTemplate,
  parseBulkExcel,
  exportErrorReport,
} from '../../utils/excel';
import { formatCurrency, formatDateDMY } from '../../utils/format';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  FileDown,
} from 'lucide-react';

export const BulkCollectionTab: React.FC = () => {
  const { customers, invoices, processBulkCollectionBatch, setCurrentTab } =
    useCreditCollection();

  const [uploadedRows, setUploadedRows] = useState<BulkUploadRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<{
    successCount: number;
    totalAmount: number;
    voucherNos: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed counts
  const totalRows = uploadedRows.length;
  const validRows = uploadedRows.filter((r) => r.isValid);
  const invalidRows = uploadedRows.filter((r) => !r.isValid);
  const totalValidAmount = validRows.reduce((sum, r) => sum + r.collectionAmount, 0);

  // File Upload Handlers
  const handleFileSelected = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      alert('Please upload an Excel (.xlsx or .xls) file.');
      return;
    }

    setFileName(file.name);
    setProcessResult(null);

    try {
      const parsed = await parseBulkExcel(file, customers, invoices);
      setUploadedRows(parsed);
    } catch (err: any) {
      alert('Failed to parse Excel file: ' + err.message);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Demo helper: Load sample bulk collection batch with an invalid row
  const handleLoadDemoBatch = () => {
    setFileName('Demo_Bulk_Collection_With_Errors.xlsx');
    setProcessResult(null);

    // Create 4 rows: 3 valid + 1 invalid row (customer does not exist / over due)
    const demoRows: BulkUploadRow[] = [
      {
        rowId: 1,
        customerCode: 'CUS-FAI00001',
        customerName: 'MD. BULBUL HOSSAIN TALUKDAR',
        invoiceNo: '', // FIFO across dues
        collectionAmount: 2500,
        paymentMethod: 'bKash',
        account: 'bKash Merchant 01737626276',
        referenceNo: 'BK-998120',
        collectionDate: '2026-11-04',
        remarks: 'Direct mobile wallet payment',
        isValid: true,
        errors: [],
        matchedCustomer: customers.find((c) => c.customerCode === 'CUS-FAI00001'),
      },
      {
        rowId: 2,
        customerCode: 'CUS-FAI00002',
        customerName: 'M/S Pritom Traders',
        invoiceNo: '122609251841100202', // Direct invoice collection
        collectionAmount: 6250,
        paymentMethod: 'Bank',
        account: '1020 - Brac Bank A/C 2049',
        referenceNo: 'BRAC-TX-771',
        collectionDate: '2026-11-04',
        remarks: 'Invoice settlement',
        isValid: true,
        errors: [],
        matchedCustomer: customers.find((c) => c.customerCode === 'CUS-FAI00002'),
      },
      {
        rowId: 3,
        customerCode: 'CUS-FAI00003',
        customerName: 'Himel Enterprise',
        invoiceNo: '',
        collectionAmount: 1500,
        paymentMethod: 'Cash',
        account: '1000 - Cash in hand',
        referenceNo: '',
        collectionDate: '2026-11-04',
        remarks: 'Counter cash deposit',
        isValid: true,
        errors: [],
        matchedCustomer: customers.find((c) => c.customerCode === 'CUS-FAI00003'),
      },
      {
        rowId: 4,
        customerCode: 'CUS-UNKNOWN999',
        customerName: 'Non-Existent Customer Corp',
        invoiceNo: '',
        collectionAmount: 95000,
        paymentMethod: 'Cryptocurrency',
        account: '',
        referenceNo: '',
        collectionDate: '2026-11-04',
        remarks: 'Invalid row test for demo',
        isValid: false,
        errors: [
          'Customer "CUS-UNKNOWN999" not found in system',
          'Invalid Payment Method "Cryptocurrency". Allowed: Cash, Bank, Wallet, Advance',
          'Account/Wallet is required',
        ],
      },
    ];

    setUploadedRows(demoRows);
  };

  // Process Collection Execution
  const handleProcessCollection = () => {
    if (validRows.length === 0) {
      alert('No valid rows available to process.');
      return;
    }

    setIsProcessing(true);
    const result = processBulkCollectionBatch(validRows);
    setIsProcessing(false);
    setProcessResult(result);
  };

  const handleDownloadErrorReport = () => {
    if (invalidRows.length > 0) {
      exportErrorReport(invalidRows);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto p-6 space-y-5">
      {/* Top Description & Action Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Bulk Credit Collection via Excel (.xlsx)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Upload an Excel spreadsheet with multiple customer collections. The system automatically
            validates each row, performs FIFO allocation against oldest outstanding invoices, and creates
            proper collection vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Load Demo Data with invalid row */}
          <button
            type="button"
            onClick={handleLoadDemoBatch}
            className="text-xs font-semibold px-3 py-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition flex items-center gap-1.5"
            title="Load demo data with 3 valid rows and 1 invalid row for testing"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span>Load Demo Excel Sample</span>
          </button>

          {/* Download Official Template */}
          <button
            type="button"
            onClick={downloadBulkTemplate}
            className="bg-[#2F6FDE] hover:bg-[#255cc0] text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Download Template (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Upload Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition bg-white ${
          isDragging
            ? 'border-[#2F6FDE] bg-blue-50/50'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelected(e.target.files[0]);
            }
          }}
          accept=".xlsx, .xls, .csv"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2F6FDE] flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div className="text-xs font-semibold text-slate-800">
            {fileName ? (
              <span className="text-[#2F6FDE] font-bold text-sm">{fileName}</span>
            ) : (
              <span>Drag & drop your Excel file here, or click to browse</span>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Supports Microsoft Excel (.xlsx, .xls) and CSV files up to 10MB
          </p>
        </div>
      </div>

      {/* Processing Result Banner */}
      {processResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <h4 className="font-bold text-xs text-emerald-900">
                Bulk Collection Processed Successfully!
              </h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                Applied {processResult.successCount} collections for a total of{' '}
                <strong>৳{formatCurrency(processResult.totalAmount)}</strong>. Generated{' '}
                {processResult.voucherNos.length} vouchers.
              </p>
            </div>
          </div>

          <button
            onClick={() => setCurrentTab('COLLECTION_HISTORY')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded transition shadow-xs"
          >
            View in Collection History →
          </button>
        </div>
      )}

      {/* Preview Table & Validation Summary */}
      {uploadedRows.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden space-y-4">
          {/* Summary Counts Bar */}
          <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <span className="text-slate-700">
                Total Rows: <strong className="text-slate-900">{totalRows}</strong>
              </span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ✓ Valid: <strong>{validRows.length}</strong>
              </span>
              <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                ✕ Invalid: <strong>{invalidRows.length}</strong>
              </span>
              <span className="text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                Total Valid Amount: <strong>৳{formatCurrency(totalValidAmount)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {invalidRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadErrorReport}
                  className="border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition"
                >
                  <FileDown className="w-3.5 h-3.5 text-red-600" />
                  <span>Download Error Report (.xlsx)</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleProcessCollection}
                disabled={validRows.length === 0 || isProcessing}
                className={`text-white text-xs font-bold px-5 py-2 rounded flex items-center gap-2 shadow-xs transition ${
                  validRows.length === 0 || isProcessing
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-[#2F6FDE] hover:bg-[#255cc0]'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Process Collection ({validRows.length} Rows)</span>
              </button>
            </div>
          </div>

          {/* Rows Table */}
          <div className="overflow-x-auto max-h-[450px]">
            <table className="w-full text-left border-collapse min-w-[1200px] text-xs">
              <thead className="sticky top-0 bg-[#DCEBFA] text-slate-800 font-semibold z-10 border-b border-[#cbdff4]">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12 font-semibold">Row #</th>
                  <th className="py-2.5 px-3 text-center w-24 font-semibold">Validation</th>
                  <th className="py-2.5 px-3 font-semibold">Customer Code</th>
                  <th className="py-2.5 px-3 font-semibold">Customer Name</th>
                  <th className="py-2.5 px-3 font-semibold">Invoice No</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Collection Amount</th>
                  <th className="py-2.5 px-3 font-semibold">Method</th>
                  <th className="py-2.5 px-3 font-semibold">Account / Wallet</th>
                  <th className="py-2.5 px-3 font-semibold">Ref No</th>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Remarks / Reason</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-slate-700">
                {uploadedRows.map((row) => (
                  <tr
                    key={row.rowId}
                    className={`transition-colors ${
                      row.isValid
                        ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                        : 'bg-rose-50/40 hover:bg-rose-50/70'
                    }`}
                  >
                    {/* Row # */}
                    <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                      {row.rowId}
                    </td>

                    {/* Validation Status Badge */}
                    <td className="py-2.5 px-3 text-center">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Valid</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full border border-red-300">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span>Invalid</span>
                        </span>
                      )}
                    </td>

                    {/* Customer Code */}
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                      {row.customerCode}
                    </td>

                    {/* Customer Name */}
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {row.customerName}
                    </td>

                    {/* Invoice No */}
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {row.invoiceNo || (
                        <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded">
                          FIFO (Auto)
                        </span>
                      )}
                    </td>

                    {/* Collection Amount */}
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      ৳ {formatCurrency(row.collectionAmount)}
                    </td>

                    {/* Method */}
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {row.paymentMethod}
                    </td>

                    {/* Account */}
                    <td className="py-2.5 px-3 text-slate-600">
                      {row.account || '—'}
                    </td>

                    {/* Ref No */}
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {row.referenceNo || '—'}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDateDMY(row.collectionDate)}
                    </td>

                    {/* Remarks / Errors */}
                    <td className="py-2.5 px-3 max-w-sm">
                      {row.isValid ? (
                        <span className="text-slate-500 text-[11px]">{row.remarks || '—'}</span>
                      ) : (
                        <div className="text-red-700 font-semibold text-[11px] space-y-0.5">
                          {row.errors.map((err, eIdx) => (
                            <div key={eIdx} className="flex items-start gap-1">
                              <span>•</span>
                              <span>{err}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
