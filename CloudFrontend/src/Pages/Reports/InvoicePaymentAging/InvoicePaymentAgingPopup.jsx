import React, { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';

const InvoicePaymentAgingPopup = ({ filterData = {} }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  const formatCurrency = (amount) => {
    const n = Number(amount || 0);
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).replace(',', '');
  };

  const isOutstanding = (item) => {
    const aging = Math.abs(Number(item.agingRemaining || 0));
    const afterPayment = Math.abs(Number(item.balanceAfterPayment || 0));
    const chq = Math.abs(Number(item.chqAmount || 0));
    return aging > 1 || afterPayment > 1 || chq > 1;
  };

  const getData = async () => {
    setIsLoading(true);
    try {
      const storeParam = Array.isArray(filterData.Store) && filterData.Store.length
        ? filterData.Store.join(',')
        : '';
      const res = await getDataFundtion(
        `/SaleInvoice/getInvoicePaymentAging?startDate=${filterData.startDate}&endDate=${filterData.endDate}&store=${storeParam}`
      );
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const outstanding = list
        .filter(isOutstanding)
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
        .map((item, index) => ({
          ...item,
          id: index + 1,
          dateLabel: formatDate(item.date),
        }));
      setRows(outstanding);
    } catch (err) {
      console.error('Error fetching invoice payment aging:', err);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [filterData]);

  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows;
    if (filter) {
      const term = filter.toLowerCase();
      filtered = rows.filter((row) =>
        Object.values(row).some((value) =>
          value && String(value).toLowerCase().includes(term)
        )
      );
    }
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const av = a[sortConfig.key];
        const bv = b[sortConfig.key];
        if (av < bv) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (av > bv) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [rows, filter, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortMark = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
  };

  const totals = useMemo(() => ({
    totalAmount: filteredAndSortedRows.reduce((s, r) => s + Number(r.totalAmount || 0), 0),
    voucherPayment: filteredAndSortedRows.reduce((s, r) => s + Number(r.voucherPayment || 0), 0),
    agingRemaining: filteredAndSortedRows.reduce((s, r) => s + Number(r.agingRemaining || 0), 0),
    chqAmount: filteredAndSortedRows.reduce((s, r) => s + Number(r.chqAmount || 0), 0),
    balanceAfterPayment: filteredAndSortedRows.reduce((s, r) => s + Number(r.balanceAfterPayment || 0), 0),
  }), [filteredAndSortedRows]);

  const exportToExcel = async () => {
    const exportRows = filteredAndSortedRows.map((row) => ({
      'S.No': row.id,
      'Date': row.dateLabel,
      'Invoice': row.invoice,
      'Invoice Ref': row.salesFlowRef,
      'Client Code': row.clientCode,
      'Client Name': row.clientName,
      'Invoice Amount': Number(Number(row.totalAmount || 0).toFixed(2)),
      'Voucher Payment': Number(Number(row.voucherPayment || 0).toFixed(2)),
      'Aging Remaining': Number(Number(row.agingRemaining || 0).toFixed(2)),
      'Cheque': row.chqNumbers || '',
      'Cheque Amount': Number(Number(row.chqAmount || 0).toFixed(2)),
      'Balance After Payment': Number(Number(row.balanceAfterPayment || 0).toFixed(2)),
      'Vouchers': row.voucherNumbers || '',
    }));

    await exportProfessionalExcel({
      title: 'Invoice Payment Aging',
      fileName: 'Invoice_Payment_Aging',
      sheetName: 'Invoice Payment Aging',
      rows: exportRows,
      meta: [
        filterData.startDate && filterData.endDate
          ? `Period: ${formatDate(filterData.startDate)} to ${formatDate(filterData.endDate)}`
          : '',
      ].filter(Boolean),
      excludeKeys: ['_id', 'id'],
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.text('Invoice Payment Aging', 148, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.text(
      `Period: ${formatDate(filterData.startDate)} to ${formatDate(filterData.endDate)}`,
      148,
      18,
      { align: 'center' }
    );

    autoTable(doc, {
      startY: 24,
      head: [[
        '#', 'Date', 'Invoice', 'Client', 'Invoice Amt', 'Voucher Pmt', 'Vouchers',
        'Aging Remaining', 'Cheque', 'Chq Amt', 'Balance'
      ]],
      body: [
        ...filteredAndSortedRows.map((row) => [
          row.id,
          row.dateLabel,
          row.invoice || '',
          row.clientName || '',
          formatCurrency(row.totalAmount),
          formatCurrency(row.voucherPayment),
          row.voucherNumbers || '',
          formatCurrency(row.agingRemaining),
          row.chqNumbers || '',
          formatCurrency(row.chqAmount),
          formatCurrency(row.balanceAfterPayment),
        ]),
        [
          '', '', '', 'TOTAL',
          formatCurrency(totals.totalAmount),
          formatCurrency(totals.voucherPayment),
          '',
          formatCurrency(totals.agingRemaining),
          '',
          formatCurrency(totals.chqAmount),
          formatCurrency(totals.balanceAfterPayment),
        ]
      ],
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [44, 62, 80], textColor: 255 },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        7: { halign: 'right' },
        9: { halign: 'right' },
        10: { halign: 'right' },
      }
    });

    doc.save(`Invoice_Payment_Aging_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    const printContent = reportRef.current?.innerHTML;
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice Payment Aging</title>
          <style>
            body { font-family: Segoe UI, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; }
            th { background: #f8f9fa; }
            .numeric { text-align: right; }
            .report-actions, .search-box { display: none; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  };

  return (
    <div className="sales-report-container" ref={reportRef}>
      <ReportPopupHeader title="Invoice Payment Aging" />

      <div className="sales-report-header">
        <div>
          <h2 className="company-name">Pearl Dynamics</h2>
          <p className="muted">Outstanding invoices only (remaining not zero)</p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Invoice Payment Aging</h1>
          <p className="muted">Generated: {new Date().toLocaleString()}</p>
          <p className="muted">
            Period: {formatDate(filterData.startDate)} to {formatDate(filterData.endDate)}
          </p>
        </div>
      </div>

      <div className="report-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search invoices..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="summary-stats">
          <span>Invoices: <strong>{filteredAndSortedRows.length}</strong></span>
          <span>Aging Remaining: <strong>{formatCurrency(totals.agingRemaining)}</strong></span>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
            <p>Loading invoice payments...</p>
          </div>
        ) : (
          <table className="sales-data-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('id')}>#{sortMark('id')}</th>
                <th onClick={() => requestSort('date')}>Date{sortMark('date')}</th>
                <th onClick={() => requestSort('invoice')}>Invoice{sortMark('invoice')}</th>
                <th onClick={() => requestSort('salesFlowRef')}>Invoice Ref{sortMark('salesFlowRef')}</th>
                <th onClick={() => requestSort('clientCode')}>Client Code{sortMark('clientCode')}</th>
                <th onClick={() => requestSort('clientName')}>Client{sortMark('clientName')}</th>
                <th onClick={() => requestSort('totalAmount')}>Invoice Amount{sortMark('totalAmount')}</th>
                <th onClick={() => requestSort('voucherPayment')}>Voucher Payment{sortMark('voucherPayment')}</th>
                <th onClick={() => requestSort('voucherNumbers')}>Vouchers{sortMark('voucherNumbers')}</th>
                <th onClick={() => requestSort('agingRemaining')}>Aging Remaining{sortMark('agingRemaining')}</th>
                <th onClick={() => requestSort('chqNumbers')}>Cheque{sortMark('chqNumbers')}</th>
                <th onClick={() => requestSort('chqAmount')}>Cheque Amount{sortMark('chqAmount')}</th>
                <th onClick={() => requestSort('balanceAfterPayment')}>Balance After Payment{sortMark('balanceAfterPayment')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row) => (
                  <tr key={`${row.invoice}-${row.id}`}>
                    <td>{row.id}</td>
                    <td>{row.dateLabel}</td>
                    <td className="invoice-number">{row.invoice}</td>
                    <td>{row.salesFlowRef}</td>
                    <td>{row.clientCode}</td>
                    <td>{row.clientName}</td>
                    <td className="numeric">{formatCurrency(row.totalAmount)}</td>
                    <td className="numeric">{formatCurrency(row.voucherPayment)}</td>
                    <td>{row.voucherNumbers}</td>
                    <td className="numeric">{formatCurrency(row.agingRemaining)}</td>
                    <td>{row.chqNumbers}</td>
                    <td className="numeric">{formatCurrency(row.chqAmount)}</td>
                    <td className="numeric">{formatCurrency(row.balanceAfterPayment)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="13" className="no-data">No outstanding invoices found</td>
                </tr>
              )}
              {filteredAndSortedRows.length > 0 && (
                <tr className="footer-row">
                  <td colSpan="6" className="footer-total">Totals</td>
                  <td className="numeric footer-total">{formatCurrency(totals.totalAmount)}</td>
                  <td className="numeric footer-total">{formatCurrency(totals.voucherPayment)}</td>
                  <td className="footer-total"></td>
                  <td className="numeric footer-total">{formatCurrency(totals.agingRemaining)}</td>
                  <td className="footer-total"></td>
                  <td className="numeric footer-total">{formatCurrency(totals.chqAmount)}</td>
                  <td className="numeric footer-total">{formatCurrency(totals.balanceAfterPayment)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="report-actions">
        <button className="btn btn-excel" onClick={exportToExcel} disabled={isLoading || !rows.length}>Excel</button>
        <button className="btn btn-pdf" onClick={exportToPDF} disabled={isLoading || !rows.length}>PDF</button>
        <button className="btn btn-print" onClick={handlePrint} disabled={isLoading || !rows.length}>Print</button>
      </div>

      <style>{`
        .sales-report-container {
          font-family: 'Segoe UI', sans-serif;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin: 20px auto;
          max-width: 1400px;
          color: #333;
        }
        .sales-report-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eaeaea;
        }
        .company-name { margin: 0 0 6px 0; color: #2c3e50; }
        .report-title { margin: 0 0 6px 0; color: #3498db; font-size: 20px; }
        .report-info { text-align: right; }
        .muted { color: #7f8c8d; font-size: 12px; margin: 4px 0; }
        .report-controls {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .search-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          min-width: 250px;
        }
        .summary-stats { display: flex; gap: 20px; font-size: 14px; }
        .table-container { overflow-x: auto; border: 1px solid #e0e0e0; border-radius: 6px; }
        .sales-data-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1100px; }
        .sales-data-table th {
          background: #f8f9fa;
          padding: 10px;
          text-align: left;
          cursor: pointer;
          white-space: nowrap;
        }
        .sales-data-table td { padding: 8px 10px; border-bottom: 1px solid #eaeaea; }
        .numeric { text-align: right; font-variant-numeric: tabular-nums; }
        .invoice-number { font-weight: 600; }
        .footer-total { font-weight: 700; background: #f8f9fa; }
        .no-data { text-align: center; padding: 30px; color: #95a5a6; }
        .report-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          color: #fff;
          cursor: pointer;
          font-weight: 600;
        }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-excel { background: #217346; }
        .btn-pdf { background: #f40f02; }
        .btn-print { background: #555; }
        .loader-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 180px;
          gap: 12px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 5px solid #ccc;
          border-top: 5px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .report-controls, .report-actions { display: none; }
        }
      `}</style>
    </div>
  );
};

export default InvoicePaymentAgingPopup;
