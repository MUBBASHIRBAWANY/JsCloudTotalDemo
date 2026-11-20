import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SalesInvoiceSummaryPopup = ({ filterData = {} }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  const { startDate, endDate } = filterData;

  const getData = async () => {
    setIsLoading(true);
    try {
      console.log(`SalesInvoice/InvoiceSummary?startDate=${startDate}&endDate=${endDate}&Distributor=${filterData.Distributor || ''}`)
      const response = await getDataFundtion(
        `SalesInvoice/InvoiceSummary?startDate=${startDate}&endDate=${endDate}&Distributor=${filterData.Distributor || ''}`
      );
      const list = response?.data || [];
      const allowed = filterData.allowedDistributorIds == null
        ? null
        : new Set(filterData.allowedDistributorIds.map(String));
      const data = allowed
        ? list.filter((row) => allowed.has(String(row.Distrbutor)))
        : list;
      setRows(data);
      console.log('Sales Invoice Summary:', data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      getData();
    }
  }, [startDate, endDate]);

  // Filter and sort
  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows;

    if (filter) {
      filtered = rows.filter(row =>
        Object.values(row).some(value =>
          value && value.toString().toLowerCase().includes(filter.toLowerCase())
        )
      );
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'SalesInvoiceDate' || sortConfig.key === 'SalesDumpDate') {
          aValue = new Date(aValue || 0);
          bValue = new Date(bValue || 0);
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
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

  // Totals
  const totals = useMemo(() => {
    const statusOf = (row) => String(row.PostStatus || '').trim().toLowerCase();
    const byStatus = (status) => filteredAndSortedRows.reduce((acc, row) => {
      if (statusOf(row) !== status) return acc;
      acc.count += 1;
      acc.amount += Number(row.TotalAmount) || 0;
      return acc;
    }, { count: 0, amount: 0 });
    const open = byStatus('open');
    const serviced = byStatus('serviced');
    return {
      totalGross: filteredAndSortedRows.reduce((sum, row) => sum + (row.GrossAmount || 0), 0),
      totalTo: filteredAndSortedRows.reduce((sum, row) => sum + (row.To || 0), 0),
      totalScheme: filteredAndSortedRows.reduce((sum, row) => sum + (row.Scheme || 0), 0),
      totalAmount: filteredAndSortedRows.reduce((sum, row) => sum + (row.TotalAmount || 0), 0),
      SlabDiscount: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.SlabDiscount || 0), 0),
      openCount: open.count,
      openAmount: open.amount,
      servicedCount: serviced.count,
      servicedAmount: serviced.amount,
    };
  }, [filteredAndSortedRows]);

  const showAmountCount = (amount, count) => `${(Number(amount) || 0).toLocaleString()}(${count})`;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).replace(',', '');
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredAndSortedRows.map((row, index) => ({
      '#': index + 1,
      'Invoice #': row.DisSalesInvoice || row.SalesInvoice,
      'Date': row.SalesInvoiceDate,
      'Customer': row.Client,
      "Slab" : row.SlabPercentage,
      "SlabDiscount" : row.SlabDiscount,
      'Order Booker': row.OrderBooker,
      'Gross Amount': row.GrossAmount,
      'TO': row.To,
      'Scheme': row.Scheme,
      'Total Amount': row.TotalAmount,
      'Sales Dump Date': row.SalesDumpDate,
      'Status': row.PostStatus,
    }));

    // Add totals row
    exportData.push({
      '#': '',
      'Invoice #': 'TOTAL',
      'Date': '',
      'Customer': '',
      'Order Booker': '',
      'Gross Amount': totals.totalGross,
      'TO': totals.totalTo,
      
      "SlabDiscount" : totals.SlabDiscount,
      'Scheme': totals.totalScheme,
      'Total Amount': totals.totalAmount,
      'Sales Dump Date': '',
      'Status': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice Summary');
    XLSX.writeFile(workbook, 'Sales_Invoice_Summary.xlsx');
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape');

    doc.setFontSize(20);
    doc.text('Sales Invoice Summary', 14, 15);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}`, 14, 29);
    doc.text(`Total Invoices: ${filteredAndSortedRows.length}`, 14, 36);
    doc.text(`Open Total Amount: ${showAmountCount(totals.openAmount, totals.openCount)}`, 14, 43);
    doc.text(`Serviced Amount: ${showAmountCount(totals.servicedAmount, totals.servicedCount)}`, 14, 50);

    const headers = ['#', 'Invoice #', 'Date', 'Customer', 'Order Booker', 'Gross Amount', 'TO', 'Scheme', 'Total Amount', 'Dump Date', 'Status'];
    const tableRows = filteredAndSortedRows.map((row, index) => [
      index + 1,
      row.DisSalesInvoice || row.SalesInvoice,
      formatDate(row.SalesInvoiceDate),
      row.Client,
      row.OrderBooker,
      (row.GrossAmount || 0).toLocaleString(),
      (row.To || 0).toLocaleString(),
      (row.Scheme || 0).toLocaleString(),
      (row.TotalAmount || 0).toLocaleString(),
      row.SalesDumpDate ? formatDate(row.SalesDumpDate) : '',
      row.PostStatus,
    ]);

    // Add totals row
    tableRows.push([
      '',
      'TOTAL',
      '',
      '',
      '',
      totals.totalGross.toLocaleString(),
      totals.totalTo.toLocaleString(),
      totals.totalScheme.toLocaleString(),
      totals.totalAmount.toLocaleString(),
      '',
      '',
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableRows,
      startY: 56,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    });

    doc.save('Sales_Invoice_Summary.pdf');
  };

  // Print
  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=1200,height=800');

    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Invoice Summary</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
            .report-container { background: #fff; border-radius: 8px; padding: 24px; }
            .report-header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
            .company-name { font-size: 22px; font-weight: bold; color: #2c3e50; }
            .report-title { font-size: 18px; color: #3498db; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { padding: 8px 10px; border: 1px solid #ddd; text-align: left; }
            th { background: #f8f9fa; font-weight: 600; }
            .numeric { text-align: right; font-family: 'Courier New', monospace; }
            .total-row { font-weight: bold; background: #f0f0f0; }
            .report-controls, .report-actions { display: none; }
            .status-amount-row { display: flex; gap: 16px; margin: 0 0 14px 0; }
            .status-amount-card { border: 1px solid #ddd; border-radius: 6px; padding: 8px 14px; min-width: 220px; }
            .status-amount-label { display: block; font-size: 12px; color: #555; }
            .status-amount-value { display: block; font-size: 16px; font-weight: 700; margin-top: 4px; }
            .status-amount-card.open .status-amount-value { color: #f39c12; }
            .status-amount-card.serviced .status-amount-value { color: #2ecc71; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div>
              <div class="company-name">Pearl Dynamic</div>
              <div style="font-size:12px;color:#7f8c8d;">Sales Invoice Summary</div>
            </div>
            <div style="text-align:right;">
              <div class="report-title">Sales Invoice Summary</div>
              <div style="font-size:12px;color:#7f8c8d;">Period: ${startDate} to ${endDate}</div>
              <div style="font-size:12px;color:#7f8c8d;">Generated: ${new Date().toLocaleString()}</div>
            </div>
          </div>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="sales-report-container" ref={reportRef}>
      {/* Header */}
      <div className="sales-report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dynamic</h2>
          <p className="company-address">123 Business Avenue, Suite 456</p>
          <p className="company-contact">Phone: (555) 123-4567 | Email: info@pmmgmt.com</p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Sales Invoice Summary</h1>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">Period: {startDate || 'N/A'} to {endDate || 'N/A'}</p>
        </div>
      </div>

      <div className="status-amount-row">
        <div className="status-amount-card open">
          <span className="status-amount-label">Open Total Amount</span>
          <strong className="status-amount-value">{showAmountCount(totals.openAmount, totals.openCount)}</strong>
        </div>
        <div className="status-amount-card serviced">
          <span className="status-amount-label">Serviced Amount</span>
          <strong className="status-amount-value">{showAmountCount(totals.servicedAmount, totals.servicedCount)}</strong>
        </div>
      </div>

      {/* Controls */}
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
          <span className="stat-item">
            Invoices: <strong>{filteredAndSortedRows.length}</strong>
          </span>
          <span className="stat-item">
            Total Gross: <strong>{totals.totalGross.toLocaleString()}</strong>
          </span>
          <span className="stat-item">
            Total TO: <strong>{totals.totalTo.toLocaleString()}</strong>
          </span>
          <span className="stat-item">
            Total Scheme: <strong>{totals.totalScheme.toLocaleString()}</strong>
          </span>
          <span className="stat-item">
            Total Amount: <strong>{totals.totalAmount.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
          </div>
        ) : (
          <table className="sales-data-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('SalesInvoice')} style={{ width: '40px', textAlign: 'center' }}>#</th>
                <th onClick={() => requestSort('SalesInvoice')}>Invoice #</th>
                <th onClick={() => requestSort('SalesInvoiceDate')}>Date</th>
                <th onClick={() => requestSort('Client')}>Customer</th>
                <th onClick={() => requestSort('OrderBooker')}>Order Booker</th>
                <th onClick={() => requestSort('GrossAmount')}>Gross Amount</th>
                <th onClick={() => requestSort('To')}>TO</th>
                <th onClick={() => requestSort('Scheme')}>Scheme</th>
                <th onClick={() => requestSort('Slab')}>SlabPercentage</th>
                <th onClick={() => requestSort('SlabDiscont')}>SlabDiscount</th>
                <th onClick={() => requestSort('TotalAmount')}>Total Amount</th>
                <th onClick={() => requestSort('SalesDumpDate')}>Sales Dump Date</th>
                <th onClick={() => requestSort('PostStatus')}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td className="invoice-number">{row.DisSalesInvoice || row.SalesInvoice}</td>
                    <td>{formatDate(row.SalesInvoiceDate)}</td>
                    <td>{row.Client}</td>
                    <td>{row.OrderBooker}</td>
                    <td className="numeric">{(row.GrossAmount || 0).toLocaleString()}</td>
                    <td className="numeric">{(row.To || 0).toLocaleString()}</td>
                    
                    <td className="numeric" style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                      {(row.Scheme || 0).toLocaleString()}
                    </td>
                    <td >{(row.SlabPercentage || 0)}%</td>
                    <td className="numeric">{(row.SlabDiscount || 0).toLocaleString()}</td>
                    <td className="numeric" style={{ fontWeight: 'bold' }}>
                      {(row.TotalAmount || 0).toLocaleString()}
                    </td>
                    <td>{row.SalesDumpDate ? formatDate(row.SalesDumpDate) : '-'}</td>
                    <td>
                      <span className={`status-badge status-${(row.PostStatus || '').toLowerCase()}`}>
                        {row.PostStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="no-data">
                    No invoice summary data available for the selected period
                  </td>
                </tr>
              )}
            </tbody>
            {filteredAndSortedRows.length > 0 && (
              <tfoot>
                <tr className="footer-total">
                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td>
                  <td className="numeric">{totals.totalGross.toLocaleString()}</td>
                  <td className="numeric">{totals.totalTo.toLocaleString()}</td>
                  <td className="numeric">{totals.totalScheme.toLocaleString()}</td>
                  <td className="numeric"></td>
                  <td className="numeric">{totals.SlabDiscount.toLocaleString()}</td>
                  <td className="numeric">{totals.totalAmount.toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* Actions */}
      <div className="report-actions">
        <button className="btn btn-excel" onClick={exportToExcel}>Export to Excel</button>
        <button className="btn btn-pdf" onClick={exportToPDF}>Export to PDF</button>
        <button className="btn btn-print" onClick={handlePrint}>Print Report</button>
      </div>

      <style jsx>{`
        .sales-report-container {
          font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin: 20px auto;
          max-width: 1400px;
          color: #333;
          position: relative;
          overflow-x: auto;
        }

        .sales-report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eaeaea;
          position: relative;
          z-index: 2;
        }

        .company-info { text-align: left; }
        .company-name { font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0 0 8px 0; }
        .company-address, .company-contact { font-size: 12px; color: #7f8c8d; margin: 4px 0; }
        .report-info { text-align: right; }
        .report-title { font-size: 20px; font-weight: 600; color: #3498db; margin: 0 0 8px 0; }
        .report-date, .report-range { font-size: 12px; color: #7f8c8d; margin: 4px 0; }

        .report-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
          position: relative;
          z-index: 2;
        }

        .search-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          min-width: 250px;
        }

        .status-amount-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .status-amount-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 12px 16px;
          min-width: 240px;
          background: #fff;
        }
        .status-amount-card.open { border-left: 4px solid #f39c12; }
        .status-amount-card.serviced { border-left: 4px solid #2ecc71; }
        .status-amount-label { display: block; font-size: 13px; color: #555; }
        .status-amount-value { display: block; font-size: 20px; margin-top: 4px; }
        .status-amount-card.open .status-amount-value { color: #f39c12; }
        .status-amount-card.serviced .status-amount-value { color: #2ecc71; }

        .summary-stats { display: flex; gap: 24px; flex-wrap: wrap; }
        .stat-item { font-size: 14px; color: #555; }

        .table-container {
          overflow-x: auto;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
        }

        .sales-data-table {
          min-width: 1100px;
          border-collapse: collapse;
          font-size: 13px;
          width: 100%;
        }

        .sales-data-table th {
          background: #f8f9fa;
          padding: 12px 10px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 2px solid #e0e0e0;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }

        .sales-data-table th:hover { background: #e9ecef; }

        .sales-data-table td {
          padding: 10px;
          border-bottom: 1px solid #eaeaea;
        }

        .sales-data-table tbody tr:hover { background-color: #f8f9fa; }

        .numeric { text-align: right; font-family: 'Courier New', monospace; }
        .invoice-number { font-family: 'Courier New', monospace; font-weight: 600; }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-serviced { background: #e7f4e4; color: #2ecc71; }
        .status-cancel { background: #fdeaea; color: #e74c3c; }
        .status-open { background: #fef5e7; color: #f39c12; }

        .no-data {
          text-align: center;
          padding: 30px;
          color: #95a5a6;
          font-style: italic;
        }

        .footer-total {
          font-weight: 700;
          background: #f8f9fa;
        }

        .report-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          position: relative;
          z-index: 2;
          margin-top: 20px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-excel { background: #217346; color: white; }
        .btn-excel:hover { background: #18532f; }
        .btn-pdf { background: #f40f02; color: white; }
        .btn-pdf:hover { background: #c30c01; }
        .btn-print { background: #555; color: white; }
        .btn-print:hover { background: #333; }

        .loader-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 6px solid #ccc;
          border-top: 6px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 1200px) {
          .sales-report-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .company-info, .report-info { text-align: center; margin-bottom: 16px; }
          .report-controls { flex-direction: column; align-items: stretch; }
          .search-input { min-width: 100%; }
          .summary-stats { justify-content: space-around; }
          .report-actions { flex-wrap: wrap; justify-content: center; }
        }

        @media print {
          .sales-report-container { box-shadow: none; padding: 0; }
          .report-controls, .report-actions { display: none; }
          .table-container { overflow-x: visible; border: none; }
        }
      `}</style>
    </div>
  );
};

export default SalesInvoiceSummaryPopup;
