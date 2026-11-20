import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const round2 = (num) => Math.round((Number(num) || 0) * 100) / 100;

const emptyTotals = () => ({ invoices: 0, gross: 0, to: 0, scheme: 0, slab: 0, amount: 0 });

const addInvoice = (acc, row) => {
  acc.invoices += 1;
  acc.gross += Number(row.GrossAmount) || 0;
  acc.to += Number(row.To) || 0;
  acc.scheme += Number(row.Scheme) || 0;
  acc.slab += Number(row.SlabDiscount) || 0;
  acc.amount += Number(row.TotalAmount) || 0;
};

const SalesInvoiceSummaryPopup = ({ filterData = {} }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [showOpen, setShowOpen] = useState(true);
  const [showServiced, setShowServiced] = useState(true);
  const [activeTab, setActiveTab] = useState('distributor');
  const reportRef = useRef(null);

  const { startDate, endDate, Distributor, allowedDistributorIds } = filterData;

  const getData = async () => {
    setIsLoading(true);
    try {
      const response = await getDataFundtion(
        `SalesInvoice/InvoiceSummary?startDate=${startDate}&endDate=${endDate}&Distributor=${Distributor || 'all'}`
      );
      const list = response?.data || [];
      const allowed = allowedDistributorIds == null
        ? null
        : new Set(allowedDistributorIds.map(String));
      setRows(allowed ? list.filter((row) => allowed.has(String(row.Distrbutor))) : list);
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
  }, [startDate, endDate, Distributor]);

  const filteredRows = useMemo(() => {
    const statusRows = rows.filter((row) => {
      const status = String(row.PostStatus || '').trim().toLowerCase();
      if (status === 'open') return showOpen;
      if (status === 'serviced') return showServiced;
      return false;
    });
    if (!filter) return statusRows;
    const q = filter.toLowerCase();
    return statusRows.filter((row) =>
      Object.values(row).some((value) => value && value.toString().toLowerCase().includes(q))
    );
  }, [rows, filter, showOpen, showServiced]);

  const statusLabel = showOpen && showServiced
    ? 'Open + Serviced'
    : showOpen
      ? 'Open'
      : showServiced
        ? 'Serviced'
        : 'None';

  const grouped = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      const key = row.Distrbutor || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: row.DistrbutorName || 'Unknown',
          rows: [],
          totals: emptyTotals(),
        });
      }
      const group = map.get(key);
      group.rows.push(row);
      addInvoice(group.totals, row);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredRows]);

  const bookerGrouped = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      const distKey = row.Distrbutor || 'unknown';
      if (!map.has(distKey)) {
        map.set(distKey, {
          id: distKey,
          name: row.DistrbutorName || 'Unknown',
          bookers: new Map(),
          totals: emptyTotals(),
        });
      }
      const group = map.get(distKey);
      const bookerName = row.OrderBooker || 'Unknown';
      if (!group.bookers.has(bookerName)) {
        group.bookers.set(bookerName, { name: bookerName, totals: emptyTotals() });
      }
      addInvoice(group.bookers.get(bookerName).totals, row);
      addInvoice(group.totals, row);
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        bookers: Array.from(group.bookers.values()).sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredRows]);

  const bookerCount = useMemo(
    () => bookerGrouped.reduce((sum, group) => sum + group.bookers.length, 0),
    [bookerGrouped]
  );

  const grandTotals = useMemo(
    () =>
      grouped.reduce(
        (acc, group) => {
          acc.invoices += group.totals.invoices;
          acc.gross += group.totals.gross;
          acc.to += group.totals.to;
          acc.scheme += group.totals.scheme;
          acc.slab += group.totals.slab;
          acc.amount += group.totals.amount;
          return acc;
        },
        { invoices: 0, gross: 0, to: 0, scheme: 0, slab: 0, amount: 0 }
      ),
    [grouped]
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).replace(',', '');
  };

  const formatNum = (num) => round2(num).toLocaleString();

  const exportBookerExcel = () => {
    const exportData = [];
    bookerGrouped.forEach((group) => {
      group.bookers.forEach((booker) => {
        exportData.push({
          Distributor: group.name,
          'Order Booker': booker.name,
          Invoices: booker.totals.invoices,
          'Gross Amount': booker.totals.gross,
          TO: booker.totals.to,
          Scheme: booker.totals.scheme,
          SlabDiscount: booker.totals.slab,
          'Total Amount': booker.totals.amount,
        });
      });
      exportData.push({
        Distributor: `${group.name} TOTAL`,
        'Order Booker': '',
        Invoices: group.totals.invoices,
        'Gross Amount': group.totals.gross,
        TO: group.totals.to,
        Scheme: group.totals.scheme,
        SlabDiscount: group.totals.slab,
        'Total Amount': group.totals.amount,
      });
    });
    exportData.push({
      Distributor: 'GRAND TOTAL',
      'Order Booker': '',
      Invoices: grandTotals.invoices,
      'Gross Amount': grandTotals.gross,
      TO: grandTotals.to,
      Scheme: grandTotals.scheme,
      SlabDiscount: grandTotals.slab,
      'Total Amount': grandTotals.amount,
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Booker Summary');
    XLSX.writeFile(workbook, 'Sales_Invoice_Summary_Booker.xlsx');
  };

  const exportToExcel = () => {
    if (activeTab === 'booker') {
      exportBookerExcel();
      return;
    }
    const exportData = [];
    grouped.forEach((group) => {
      group.rows.forEach((row, index) => {
        exportData.push({
          Distributor: group.name,
          '#': index + 1,
          'Invoice #': row.DisSalesInvoice || row.SalesInvoice,
          Date: row.SalesInvoiceDate,
          Customer: row.Client,
          'Order Booker': row.OrderBooker,
          'Gross Amount': row.GrossAmount,
          TO: row.To,
          Scheme: row.Scheme,
          'Slab %': row.SlabPercentage,
          SlabDiscount: row.SlabDiscount,
          'Total Amount': row.TotalAmount,
          'Sales Dump Date': row.SalesDumpDate,
          Status: row.PostStatus,
        });
      });
      exportData.push({
        Distributor: `${group.name} TOTAL`,
        '#': '',
        'Invoice #': group.totals.invoices,
        Date: '',
        Customer: '',
        'Order Booker': '',
        'Gross Amount': group.totals.gross,
        TO: group.totals.to,
        Scheme: group.totals.scheme,
        'Slab %': '',
        SlabDiscount: group.totals.slab,
        'Total Amount': group.totals.amount,
        'Sales Dump Date': '',
        Status: '',
      });
    });
    exportData.push({
      Distributor: 'GRAND TOTAL',
      '#': '',
      'Invoice #': grandTotals.invoices,
      Date: '',
      Customer: '',
      'Order Booker': '',
      'Gross Amount': grandTotals.gross,
      TO: grandTotals.to,
      Scheme: grandTotals.scheme,
      'Slab %': '',
      SlabDiscount: grandTotals.slab,
      'Total Amount': grandTotals.amount,
      'Sales Dump Date': '',
      Status: '',
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice Summary');
    XLSX.writeFile(workbook, 'Sales_Invoice_Summary.xlsx');
  };

  const exportBookerPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Sales Invoice Summary — Distributor & Booker Wise', 14, 14);
    doc.setFontSize(10);
    doc.text(`Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}`, 14, 21);
    doc.text(`Status: ${statusLabel}`, 14, 27);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 33);

    const body = [];
    bookerGrouped.forEach((group) => {
      group.bookers.forEach((booker) => {
        body.push([
          group.name,
          booker.name,
          booker.totals.invoices,
          formatNum(booker.totals.gross),
          formatNum(booker.totals.to),
          formatNum(booker.totals.scheme),
          formatNum(booker.totals.slab),
          formatNum(booker.totals.amount),
        ]);
      });
      body.push([
        `${group.name} TOTAL`,
        '',
        group.totals.invoices,
        formatNum(group.totals.gross),
        formatNum(group.totals.to),
        formatNum(group.totals.scheme),
        formatNum(group.totals.slab),
        formatNum(group.totals.amount),
      ]);
    });
    body.push([
      'GRAND TOTAL',
      '',
      grandTotals.invoices,
      formatNum(grandTotals.gross),
      formatNum(grandTotals.to),
      formatNum(grandTotals.scheme),
      formatNum(grandTotals.slab),
      formatNum(grandTotals.amount),
    ]);

    autoTable(doc, {
      startY: 38,
      head: [['Distributor', 'Order Booker', 'Invoices', 'Gross', 'TO', 'Scheme', 'Slab Disc.', 'Total Amount']],
      body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    doc.save('Sales_Invoice_Summary_Booker.pdf');
  };

  const exportToPDF = () => {
    if (activeTab === 'booker') {
      exportBookerPDF();
      return;
    }
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Sales Invoice Summary — Distributor Wise', 14, 14);
    doc.setFontSize(10);
    doc.text(`Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}`, 14, 21);
    doc.text(`Status: ${statusLabel}`, 14, 27);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 33);

    autoTable(doc, {
      startY: 38,
      head: [['Distributor', 'Invoices', 'Gross', 'TO', 'Scheme', 'Slab Disc.', 'Total Amount']],
      body: [
        ...grouped.map((group) => [
          group.name,
          group.totals.invoices,
          formatNum(group.totals.gross),
          formatNum(group.totals.to),
          formatNum(group.totals.scheme),
          formatNum(group.totals.slab),
          formatNum(group.totals.amount),
        ]),
        [
          'GRAND TOTAL',
          grandTotals.invoices,
          formatNum(grandTotals.gross),
          formatNum(grandTotals.to),
          formatNum(grandTotals.scheme),
          formatNum(grandTotals.slab),
          formatNum(grandTotals.amount),
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    const detailRows = [];
    grouped.forEach((group) => {
      group.rows.forEach((row, index) => {
        detailRows.push([
          group.name,
          index + 1,
          row.DisSalesInvoice || row.SalesInvoice,
          formatDate(row.SalesInvoiceDate),
          row.Client,
          row.OrderBooker,
          formatNum(row.GrossAmount),
          formatNum(row.To),
          formatNum(row.Scheme),
          formatNum(row.TotalAmount),
          row.PostStatus,
        ]);
      });
    });

    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY || 40) + 8,
      head: [['Distributor', '#', 'Invoice #', 'Date', 'Customer', 'Order Booker', 'Gross', 'TO', 'Scheme', 'Total', 'Status']],
      body: detailRows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    doc.save('Sales_Invoice_Summary.pdf');
  };

  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=1400,height=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Invoice Summary</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { padding: 6px 8px; border: 1px solid #ddd; text-align: left; }
            th { background: #f8f9fa; }
            .numeric { text-align: right; }
            .dist-head { background: #1e3a5f; color: #fff; font-weight: 700; }
            .subtotal { background: #eef6ff; font-weight: 700; }
            .grand { background: #dbeafe; font-weight: 700; }
            .report-actions, .search-box, .sis-tabs, .status-checks { display: none !important; }
            thead th { position: static; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <div className="sis-wrap" ref={reportRef}>
      <div className="sis-header">
        <div>
          <h2>Pearl Dynamic</h2>
          <p>
            {activeTab === 'booker'
              ? 'Sales Invoice Summary — Distributor & Booker Wise'
              : 'Sales Invoice Summary — Distributor Wise'}
          </p>
        </div>
        <div className="sis-right">
          <h1>Sales Invoice Summary</h1>
          <p>Period: {startDate || 'N/A'} to {endDate || 'N/A'}</p>
          <p>Status: {statusLabel}</p>
          <p>Generated: {new Date().toLocaleString()}</p>
        </div>
      </div>

      <div className="sis-tabs">
        <button
          type="button"
          className={activeTab === 'distributor' ? 'sis-tab active' : 'sis-tab'}
          onClick={() => setActiveTab('distributor')}
        >
          Distributor Wise
        </button>
        <button
          type="button"
          className={activeTab === 'booker' ? 'sis-tab active' : 'sis-tab'}
          onClick={() => setActiveTab('booker')}
        >
          Distributor & Booker
        </button>
      </div>

      <div className="sis-controls">
        <input
          className="search-box"
          type="text"
          placeholder="Search invoices..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="status-checks">
          <label>
            <input
              type="checkbox"
              checked={showOpen}
              onChange={(e) => setShowOpen(e.target.checked)}
            />
            Open
          </label>
          <label>
            <input
              type="checkbox"
              checked={showServiced}
              onChange={(e) => setShowServiced(e.target.checked)}
            />
            Serviced
          </label>
        </div>
        <div className="sis-stats">
          <span>Distributors: <strong>{grouped.length}</strong></span>
          {activeTab === 'booker' && <span>Bookers: <strong>{bookerCount}</strong></span>}
          <span>Invoices: <strong>{grandTotals.invoices}</strong></span>
          <span>Gross: <strong>{formatNum(grandTotals.gross)}</strong></span>
          <span>Total Amount: <strong>{formatNum(grandTotals.amount)}</strong></span>
        </div>
      </div>

      {isLoading ? (
        <div className="sis-loader"><div className="spinner" /></div>
      ) : activeTab === 'booker' ? (
        <>
          <h3 className="sis-section">Distributor & Booker Totals</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order Booker</th>
                  <th className="numeric">Invoices</th>
                  <th className="numeric">Gross Amount</th>
                  <th className="numeric">TO</th>
                  <th className="numeric">Scheme</th>
                  <th className="numeric">Slab Discount</th>
                  <th className="numeric">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {bookerGrouped.length ? bookerGrouped.map((group) => (
                  <React.Fragment key={group.id}>
                    <tr className="dist-head">
                      <td colSpan={7}>{group.name}</td>
                    </tr>
                    {group.bookers.map((booker) => (
                      <tr key={`${group.id}-${booker.name}`}>
                        <td>{booker.name}</td>
                        <td className="numeric">{booker.totals.invoices}</td>
                        <td className="numeric">{formatNum(booker.totals.gross)}</td>
                        <td className="numeric">{formatNum(booker.totals.to)}</td>
                        <td className="numeric">{formatNum(booker.totals.scheme)}</td>
                        <td className="numeric">{formatNum(booker.totals.slab)}</td>
                        <td className="numeric">{formatNum(booker.totals.amount)}</td>
                      </tr>
                    ))}
                    <tr className="subtotal">
                      <td>Subtotal — {group.name}</td>
                      <td className="numeric">{group.totals.invoices}</td>
                      <td className="numeric">{formatNum(group.totals.gross)}</td>
                      <td className="numeric">{formatNum(group.totals.to)}</td>
                      <td className="numeric">{formatNum(group.totals.scheme)}</td>
                      <td className="numeric">{formatNum(group.totals.slab)}</td>
                      <td className="numeric">{formatNum(group.totals.amount)}</td>
                    </tr>
                  </React.Fragment>
                )) : (
                  <tr><td colSpan={7} className="no-data">No invoice summary data for the selected period</td></tr>
                )}
              </tbody>
              {bookerGrouped.length > 0 && (
                <tfoot>
                  <tr className="grand">
                    <td>GRAND TOTAL</td>
                    <td className="numeric">{grandTotals.invoices}</td>
                    <td className="numeric">{formatNum(grandTotals.gross)}</td>
                    <td className="numeric">{formatNum(grandTotals.to)}</td>
                    <td className="numeric">{formatNum(grandTotals.scheme)}</td>
                    <td className="numeric">{formatNum(grandTotals.slab)}</td>
                    <td className="numeric">{formatNum(grandTotals.amount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      ) : (
        <>
          <h3 className="sis-section">Distributor Totals</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Distributor</th>
                  <th className="numeric">Invoices</th>
                  <th className="numeric">Gross Amount</th>
                  <th className="numeric">TO</th>
                  <th className="numeric">Scheme</th>
                  <th className="numeric">Slab Discount</th>
                  <th className="numeric">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {grouped.length ? grouped.map((group) => (
                  <tr key={group.id}>
                    <td>{group.name}</td>
                    <td className="numeric">{group.totals.invoices}</td>
                    <td className="numeric">{formatNum(group.totals.gross)}</td>
                    <td className="numeric">{formatNum(group.totals.to)}</td>
                    <td className="numeric">{formatNum(group.totals.scheme)}</td>
                    <td className="numeric">{formatNum(group.totals.slab)}</td>
                    <td className="numeric">{formatNum(group.totals.amount)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="no-data">No invoice summary data for the selected period</td></tr>
                )}
              </tbody>
              {grouped.length > 0 && (
                <tfoot>
                  <tr className="grand">
                    <td>GRAND TOTAL</td>
                    <td className="numeric">{grandTotals.invoices}</td>
                    <td className="numeric">{formatNum(grandTotals.gross)}</td>
                    <td className="numeric">{formatNum(grandTotals.to)}</td>
                    <td className="numeric">{formatNum(grandTotals.scheme)}</td>
                    <td className="numeric">{formatNum(grandTotals.slab)}</td>
                    <td className="numeric">{formatNum(grandTotals.amount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <h3 className="sis-section">Invoice Detail</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Order Booker</th>
                  <th className="numeric">Gross Amount</th>
                  <th className="numeric">TO</th>
                  <th className="numeric">Scheme</th>
                  <th>Slab %</th>
                  <th className="numeric">Slab Discount</th>
                  <th className="numeric">Total Amount</th>
                  <th>Dump Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {grouped.length ? grouped.map((group) => (
                  <React.Fragment key={group.id}>
                    <tr className="dist-head">
                      <td colSpan={13}>{group.name}</td>
                    </tr>
                    {group.rows.map((row, index) => (
                      <tr key={`${group.id}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{row.DisSalesInvoice || row.SalesInvoice}</td>
                        <td>{formatDate(row.SalesInvoiceDate)}</td>
                        <td>{row.Client}</td>
                        <td>{row.OrderBooker}</td>
                        <td className="numeric">{formatNum(row.GrossAmount)}</td>
                        <td className="numeric">{formatNum(row.To)}</td>
                        <td className="numeric">{formatNum(row.Scheme)}</td>
                        <td>{row.SlabPercentage || 0}%</td>
                        <td className="numeric">{formatNum(row.SlabDiscount)}</td>
                        <td className="numeric">{formatNum(row.TotalAmount)}</td>
                        <td>{row.SalesDumpDate ? formatDate(row.SalesDumpDate) : '-'}</td>
                        <td>{row.PostStatus}</td>
                      </tr>
                    ))}
                    <tr className="subtotal">
                      <td colSpan={5}>Subtotal — {group.name}</td>
                      <td className="numeric">{formatNum(group.totals.gross)}</td>
                      <td className="numeric">{formatNum(group.totals.to)}</td>
                      <td className="numeric">{formatNum(group.totals.scheme)}</td>
                      <td />
                      <td className="numeric">{formatNum(group.totals.slab)}</td>
                      <td className="numeric">{formatNum(group.totals.amount)}</td>
                      <td colSpan={2} />
                    </tr>
                  </React.Fragment>
                )) : (
                  <tr><td colSpan={13} className="no-data">No invoice summary data for the selected period</td></tr>
                )}
              </tbody>
              {grouped.length > 0 && (
                <tfoot>
                  <tr className="grand">
                    <td colSpan={5}>GRAND TOTAL</td>
                    <td className="numeric">{formatNum(grandTotals.gross)}</td>
                    <td className="numeric">{formatNum(grandTotals.to)}</td>
                    <td className="numeric">{formatNum(grandTotals.scheme)}</td>
                    <td />
                    <td className="numeric">{formatNum(grandTotals.slab)}</td>
                    <td className="numeric">{formatNum(grandTotals.amount)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      <div className="report-actions">
        <button className="btn excel" onClick={exportToExcel}>Export to Excel</button>
        <button className="btn pdf" onClick={exportToPDF}>Export to PDF</button>
        <button className="btn print" onClick={handlePrint}>Print Report</button>
      </div>

      <style>{`
        .sis-wrap { font-family: 'Segoe UI', sans-serif; background: #fff; padding: 24px; max-width: 1400px; margin: 20px auto; color: #333; }
        .sis-header { display: flex; justify-content: space-between; border-bottom: 1px solid #eaeaea; padding-bottom: 16px; margin-bottom: 16px; }
        .sis-header h2 { margin: 0 0 4px; }
        .sis-header p, .sis-right p { margin: 2px 0; color: #7f8c8d; font-size: 12px; }
        .sis-right { text-align: right; }
        .sis-right h1 { margin: 0 0 6px; font-size: 20px; color: #3498db; }
        .sis-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .sis-tab { padding: 8px 16px; border: 1px solid #d0d7de; background: #f8f9fa; border-radius: 4px; cursor: pointer; font-weight: 600; color: #1e3a5f; }
        .sis-tab.active { background: #1e3a5f; color: #fff; border-color: #1e3a5f; }
        .sis-controls { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
        .search-box { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; min-width: 240px; }
        .status-checks { display: flex; align-items: center; gap: 16px; }
        .status-checks label { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #1e3a5f; cursor: pointer; }
        .status-checks input { width: 16px; height: 16px; cursor: pointer; }
        .sis-stats { display: flex; gap: 18px; flex-wrap: wrap; font-size: 14px; }
        .sis-section { margin: 18px 0 8px; font-size: 16px; color: #1e3a5f; }
        .table-wrap { overflow: visible; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; min-width: 1100px; }
        th, td { padding: 8px 10px; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; text-align: left; white-space: nowrap; }
        thead th { position: sticky; top: 0; z-index: 3; background: #f8f9fa; box-shadow: inset 0 -1px 0 #d0d7de; }
        .numeric { text-align: right; font-family: 'Courier New', monospace; }
        .dist-head td { background: #1e3a5f; color: #fff; font-weight: 700; }
        .subtotal td { background: #eef6ff; font-weight: 700; }
        .grand td { background: #dbeafe; font-weight: 700; }
        .no-data { text-align: center; padding: 24px; color: #95a5a6; }
        .report-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
        .btn { padding: 8px 16px; border: none; border-radius: 4px; color: #fff; font-weight: 600; cursor: pointer; }
        .excel { background: #217346; }
        .pdf { background: #f40f02; }
        .print { background: #555; }
        .sis-loader { display: flex; justify-content: center; padding: 40px; }
        .spinner { width: 42px; height: 42px; border: 5px solid #ccc; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .report-actions, .search-box, .sis-tabs, .status-checks { display: none !important; }
          thead th { position: static; box-shadow: none; }
        }
      `}</style>
    </div>
  );
};

export default SalesInvoiceSummaryPopup;
