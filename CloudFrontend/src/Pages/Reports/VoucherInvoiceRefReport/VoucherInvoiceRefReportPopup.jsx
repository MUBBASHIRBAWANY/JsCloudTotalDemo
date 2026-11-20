import React, { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';

const VoucherInvoiceRefReportPopup = ({ filterData = {} }) => {
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

  const getData = async () => {
    setIsLoading(true);
    try {
      const storeParam = Array.isArray(filterData.Store) && filterData.Store.length
        ? filterData.Store.join(',')
        : '';
      const res = await getDataFundtion(
        `/Voucher/getVoucherInvoiceRefReport?startDate=${filterData.startDate}&endDate=${filterData.endDate}&store=${storeParam}`
      );
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setRows(list.map((item, index) => ({
        ...item,
        id: index + 1,
        dateLabel: formatDate(item.date),
      })));
    } catch (err) {
      console.error('Error fetching voucher invoice ref report:', err);
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
    credit: filteredAndSortedRows.reduce((s, r) => s + Number(r.credit || 0), 0),
    debit: filteredAndSortedRows.reduce((s, r) => s + Number(r.debit || 0), 0),
  }), [filteredAndSortedRows]);

  const exportToExcel = async () => {
    const exportRows = filteredAndSortedRows.map((row) => ({
      'S.No': row.id,
      'Date': row.dateLabel,
      'Voucher': row.voucherNumber,
      'Type': row.voucherType,
      'Status': row.status,
      'Client Code': row.clientCode,
      'Client Name': row.clientName,
      'ClientRef2': row.clientRef2,
      'Ref': row.ref,
      'Cheque': row.chq || '',
      'Credit': Number(Number(row.credit || 0).toFixed(2)),
      'Narration': row.narration || '',
    }));

    await exportProfessionalExcel({
      title: 'Voucher Invoice Ref Report',
      fileName: 'Voucher_Invoice_Ref',
      sheetName: 'Voucher Invoice Ref',
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
    doc.text('Voucher Invoice Ref Report', 148, 12, { align: 'center' });
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
        '#', 'Date', 'Voucher', 'Type', 'Client', 'ClientRef2', 'Ref', 'Cheque', 'Credit'
      ]],
      body: [
        ...filteredAndSortedRows.map((row) => [
          row.id,
          row.dateLabel,
          row.voucherNumber || '',
          row.voucherType || '',
          row.clientName || '',
          row.clientRef2 || '',
          row.ref || '',
          row.chq || '',
          formatCurrency(row.credit),
        ]),
        [
          '', '', '', '', 'TOTAL', '', '', '',
          formatCurrency(totals.credit),
        ]
      ],
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [44, 62, 80], textColor: 255 },
      columnStyles: {
        8: { halign: 'right' },
      }
    });

    doc.save(`Voucher_Invoice_Ref_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    const printContent = reportRef.current?.innerHTML;
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Voucher Invoice Ref Report</title>
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
      <ReportPopupHeader title="Voucher Invoice Ref Report" />

      <div className="sales-report-header">
        <div>
          <h2 className="company-name">Pearl Dynamics</h2>
          <p className="muted">Voucher lines where ClientRef2 or Ref is not empty</p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Voucher Invoice Ref Report</h1>
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
            placeholder="Search vouchers..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="summary-stats">
          <span>Lines: <strong>{filteredAndSortedRows.length}</strong></span>
          <span>Credit: <strong>{formatCurrency(totals.credit)}</strong></span>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
            <p>Loading voucher invoice refs...</p>
          </div>
        ) : (
          <table className="sales-data-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('id')}>#{sortMark('id')}</th>
                <th onClick={() => requestSort('date')}>Date{sortMark('date')}</th>
                <th onClick={() => requestSort('voucherNumber')}>Voucher{sortMark('voucherNumber')}</th>
                <th onClick={() => requestSort('voucherType')}>Type{sortMark('voucherType')}</th>
                <th onClick={() => requestSort('status')}>Status{sortMark('status')}</th>
                <th onClick={() => requestSort('clientCode')}>Client Code{sortMark('clientCode')}</th>
                <th onClick={() => requestSort('clientName')}>Client{sortMark('clientName')}</th>
                <th onClick={() => requestSort('clientRef2')}>ClientRef2{sortMark('clientRef2')}</th>
                <th onClick={() => requestSort('ref')}>Ref{sortMark('ref')}</th>
                <th onClick={() => requestSort('chq')}>Cheque{sortMark('chq')}</th>
                <th onClick={() => requestSort('credit')}>Credit{sortMark('credit')}</th>
                <th onClick={() => requestSort('narration')}>Narration{sortMark('narration')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row) => (
                  <tr key={`${row.voucherNumber}-${row.id}`}>
                    <td>{row.id}</td>
                    <td>{row.dateLabel}</td>
                    <td className="invoice-number">{row.voucherNumber}</td>
                    <td>{row.voucherType}</td>
                    <td>{row.status}</td>
                    <td>{row.clientCode}</td>
                    <td>{row.clientName}</td>
                    <td>{row.clientRef2}</td>
                    <td>{row.ref}</td>
                    <td>{row.chq}</td>
                    <td className="numeric">{formatCurrency(row.credit)}</td>
                    <td>{row.narration}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="12" className="no-data">No voucher lines with invoice reference found</td>
                </tr>
              )}
              {filteredAndSortedRows.length > 0 && (
                <tr className="footer-row">
                  <td colSpan="10" className="footer-total">Totals</td>
                  <td className="numeric footer-total">{formatCurrency(totals.credit)}</td>
                  <td className="footer-total"></td>
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

export default VoucherInvoiceRefReportPopup;
