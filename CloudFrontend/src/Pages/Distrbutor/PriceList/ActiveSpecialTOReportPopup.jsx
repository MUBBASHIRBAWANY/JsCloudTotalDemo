import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';

const ActiveSpecialTOReportPopup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const reportRef = useRef(null);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const getData = useCallback(async () => {
    const getSchemeStatus = (startDate, endDate) => {
      if (!startDate || !endDate) return 'No Dates';
      if (todayStr < startDate) return 'Upcoming';
      if (todayStr > endDate) return 'Expired';
      return 'Active';
    };

    setIsLoading(true);
    try {
      const priceLists = await getDataFundtion('/PriceList/GetALLPriceList');
      const productRes = await getDataFundtion('/Product/getProductNameId');
      const products = productRes?.data || [];

      const productMap = new Map(products.map((p) => [p._id, p]));

      const processed = [];
      (priceLists || []).forEach((pl) => {
        const plData = pl.PriceListData || [];
        plData.forEach((row) => {
          const specialTO = Number(row.SpecialTO) || 0;
          const isSchemeBox = row.isSchemeBox === true;
          const schemeBox = Number(row.schemeBox) || 0;
          const onBox = isSchemeBox && schemeBox > 0
            ? (Number(row.onBox) || 24)
            : (Number(row.onBox) || 0);
          const hasFreeBox = isSchemeBox && schemeBox > 0 && onBox > 0;
          const hasRsScheme = specialTO > 0;
          // RS scheme (SpecialTO) and free-box scheme are independent.
          // A free-box-only row stores SpecialTO as 0 and must still appear.
          if (!hasRsScheme && !hasFreeBox) return;
          const product = productMap.get(row.product) || {};
          processed.push({
            priceListId: pl._id,
            priceListNumber: pl.PriceListNumber || '',
            priceListName: pl.PriceListName || '',
            productId: row.product,
            productName: product.ProductName || row.ProductName || row.product,
            salesFlowRef: product.salesFlowRef || row.salesFlowRef || '',
            code: product.code || '',
            ClaimableSpecialTO: hasRsScheme ? (Number(row.ClaimableSpecialTO) || 0) : 0,
            UnClaimableSpecialTO: hasRsScheme ? (Number(row.UnClaimableSpecialTO) || 0) : 0,
            SpecialTO: specialTO,
            isSchemeBox: hasFreeBox,
            schemeBox: hasFreeBox ? schemeBox : 0,
            onBox: hasFreeBox ? onBox : 0,
            freeBoxLabel: hasFreeBox ? `${schemeBox} per ${onBox}` : '',
            schemeKind: hasRsScheme && hasFreeBox ? 'RS + Free Box' : hasFreeBox ? 'Free Box' : 'RS',
            SchemeStartDate: row.SchemeStartDate || '',
            SchemeEndDate: row.SchemeEndDate || '',
            Status: getSchemeStatus(row.SchemeStartDate, row.SchemeEndDate),
          });
        });
      });

      setRows(processed);
    } catch (err) {
      console.error('Error fetching data:', err);
      alert('Error loading report data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    getData();
  }, [getData]);

  const filteredRows = useMemo(() => {
    let filtered = rows;

    if (statusFilter === 'Active') {
      filtered = filtered.filter((r) => r.Status === 'Active');
    } else if (statusFilter === 'All') {
      // keep all
    } else {
      filtered = filtered.filter((r) => r.Status === statusFilter);
    }

    if (filter) {
      const term = filter.toLowerCase();
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          value && value.toString().toLowerCase().includes(term)
        )
      );
    }

    return filtered;
  }, [rows, filter, statusFilter]);

  const totals = useMemo(() => {
    return {
      count: filteredRows.length,
      claimable: filteredRows.reduce((s, r) => s + r.ClaimableSpecialTO, 0),
      unclaimable: filteredRows.reduce((s, r) => s + r.UnClaimableSpecialTO, 0),
      specialTO: filteredRows.reduce((s, r) => s + r.SpecialTO, 0),
      freeBox: filteredRows.filter((r) => r.isSchemeBox).length,
    };
  }, [filteredRows]);

  const activeCount = useMemo(() => rows.filter((r) => r.Status === 'Active').length, [rows]);

  const formatNum = (n) => (Number(n) || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d)) return dateString;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(',', '');
  };

  const exportToExcel = async () => {
    if (!filteredRows.length) {
      alert('No data to export');
      return;
    }

    try {
      const rows = filteredRows.map((row) => ({
        'Price List Number': row.priceListNumber,
        'Price List Name': row.priceListName,
        'Product': row.productName,
        'Sales Flow Ref': row.salesFlowRef,
        'Claimable SpecialTO': row.ClaimableSpecialTO,
        'UnClaimable SpecialTO': row.UnClaimableSpecialTO,
        'SpecialTO': row.SpecialTO,
        'Scheme Type': row.schemeKind,
        'Free Box': row.freeBoxLabel,
        'Scheme Start Date': row.SchemeStartDate,
        'Scheme End Date': row.SchemeEndDate,
        'Status': row.Status,
      }));

      await exportProfessionalExcel({
        title: 'Active SpecialTO Report',
        fileName: 'Active_SpecialTO_Report',
        sheetName: 'Active SpecialTO',
        rows,
        meta: [
          `As on: ${formatDate(todayStr)}`,
          `Status filter: ${statusFilter}`,
          `Total Active Schemes: ${activeCount}`,
          `Showing: ${totals.count}`,
          `Total Claimable: ${totals.claimable}`,
          `Total UnClaimable: ${totals.unclaimable}`,
          `Total SpecialTO: ${totals.specialTO}`,
          `Free Box Schemes: ${totals.freeBox}`,
        ],
        totals: {
          'Price List Number': 'TOTAL',
          'Price List Name': `(${totals.count} schemes)`,
          'Claimable SpecialTO': totals.claimable,
          'UnClaimable SpecialTO': totals.unclaimable,
          'SpecialTO': totals.specialTO,
          'Free Box': `${totals.freeBox} schemes`,
        },
        excludeKeys: ['_id', 'id', 'priceListId', 'productId'],
      });
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Failed to export Excel. Please try again.');
    }
  };

  const exportToWord = async () => {
    const tableRows = filteredRows.map((row) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: row.priceListName || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.productName || '' })] }),
          new TableCell({ children: [new Paragraph({ text: formatNum(row.ClaimableSpecialTO) })] }),
          new TableCell({ children: [new Paragraph({ text: formatNum(row.UnClaimableSpecialTO) })] }),
          new TableCell({ children: [new Paragraph({ text: formatNum(row.SpecialTO) })] }),
          new TableCell({ children: [new Paragraph({ text: row.schemeKind || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.freeBoxLabel || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.SchemeStartDate || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.SchemeEndDate || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.Status || '' })] }),
        ],
      })
    );

    const headers = ['Price List', 'Product', 'Claimable', 'UnClaimable', 'SpecialTO', 'Type', 'Free Box', 'Start Date', 'End Date', 'Status'];
    const table = new Table({
      rows: [
        new TableRow({
          children: headers.map((header) =>
            new TableCell({ children: [new Paragraph({ text: header, bold: true })] })
          ),
        }),
        ...tableRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: 'Active SpecialTO Report', heading: 'Heading1' }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
          new Paragraph({ text: `Total Active Schemes: ${totals.count} | Total SpecialTO: ${formatNum(totals.specialTO)}` }),
          new Paragraph({ text: '' }),
          table,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'Active_SpecialTO_Report.docx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');

    doc.setFontSize(18);
    doc.text('Active SpecialTO Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total Active Schemes: ${totals.count}`, 14, 28);

    const tableColumn = ['Price List', 'Product', 'Claimable', 'UnClaimable', 'SpecialTO', 'Type', 'Free Box', 'Start Date', 'End Date', 'Status'];
    const tableData = filteredRows.map((row) => [
      row.priceListName || '',
      row.productName || '',
      formatNum(row.ClaimableSpecialTO),
      formatNum(row.UnClaimableSpecialTO),
      formatNum(row.SpecialTO),
      row.schemeKind || '',
      row.freeBoxLabel || '',
      row.SchemeStartDate || '',
      row.SchemeEndDate || '',
      row.Status || '',
    ]);

    tableData.push([
      'TOTAL', `(${totals.count} schemes)`,
      formatNum(totals.claimable),
      formatNum(totals.unclaimable),
      formatNum(totals.specialTO),
      '',
      `${totals.freeBox} schemes`,
      '', '', '',
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableData,
      startY: 34,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [255, 255, 204];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [0, 0, 0];
          if ([2, 3, 4, 6].includes(data.column.index)) data.cell.styles.halign = 'right';
        }
      },
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text('Developed by JS International', doc.internal.pageSize.width / 2, pageHeight - 10, { align: 'center' });

    doc.save('Active_SpecialTO_Report.pdf');
  };

  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=1300,height=800');

    printWindow.document.write(`
      <html>
        <head>
          <title>Active SpecialTO Report</title>
          <style>
            body { font-family: 'Segoe UI', 'Roboto', sans-serif; background: #fff; color: #333; padding: 20px; }
            .pd-report-popup-header { background: #1f2d3d; color: #fff; padding: 18px 24px; border-radius: 8px 8px 0 0; margin-bottom: 20px; }
            .pd-report-popup-header__eyebrow { margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; }
            .pd-report-popup-header__title { margin: 0; font-size: 22px; font-weight: 700; }
            .pd-report-popup-header__subtitle { margin: 4px 0 0 0; font-size: 13px; opacity: 0.85; }
            h2 { margin: 0 0 4px 0; }
            .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #f8f9fa; padding: 8px 6px; text-align: left; font-weight: 600; color: #2c3e50; border-bottom: 2px solid #e0e0e0; }
            td { padding: 6px 4px; border-bottom: 1px solid #eaeaea; }
            .numeric { text-align: right; }
            .footer-total { font-weight: 700; background: #f8f9fa; }
            .status-active { color: #27ae60; font-weight: 600; }
            .status-expired { color: #e74c3c; }
            .status-upcoming { color: #f39c12; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const statusClass = (status) => {
    if (status === 'Active') return 'status-active';
    if (status === 'Expired') return 'status-expired';
    if (status === 'Upcoming') return 'status-upcoming';
    return '';
  };

  return (
    <div className="active-specialto-container" ref={reportRef}>
      <ReportPopupHeader title="Active SpecialTO Report" />

      <div className="report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dynamic</h2>
          <p className="company-address">123 Business Avenue, Suite 456</p>
          <p className="company-contact"></p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Active SpecialTO Report</h1>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">
            As on: {formatDate(todayStr)} — {activeCount} scheme(s) currently running
          </p>
        </div>
      </div>

      <div className="report-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search price list / product..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="status-filter">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-select">
            <option value="Active">Active</option>
            <option value="All">All</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
        <div className="summary-stats">
          <span className="stat-item">Active Schemes: <strong>{activeCount}</strong></span>
          <span className="stat-item">Showing: <strong>{totals.count}</strong></span>
          <span className="stat-item">Total SpecialTO: <strong>{formatNum(totals.specialTO)}</strong></span>
          <span className="stat-item">Free Box Schemes: <strong>{totals.freeBox}</strong></span>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
          </div>
        ) : (
          <table className="specialto-table">
            <thead>
              <tr>
                <th>Price List</th>
                <th>Product</th>
                <th>Claimable SpecialTO</th>
                <th>UnClaimable SpecialTO</th>
                <th>SpecialTO</th>
                <th>Scheme Type</th>
                <th>Free Box</th>
                <th>Scheme Start</th>
                <th>Scheme End</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((row, index) => (
                  <tr key={`${row.priceListId}_${row.productId}_${index}`}>
                    <td>
                      <strong>{row.priceListName}</strong>
                      {row.priceListNumber && <div className="sub-text">{row.priceListNumber}</div>}
                    </td>
                    <td>
                      <strong>{row.productName}</strong>
                      {(row.code || row.salesFlowRef) && <div className="sub-text">{row.code || row.salesFlowRef}</div>}
                    </td>
                    <td className="numeric">{formatNum(row.ClaimableSpecialTO)}</td>
                    <td className="numeric">{formatNum(row.UnClaimableSpecialTO)}</td>
                    <td className="numeric"><strong>{formatNum(row.SpecialTO)}</strong></td>
                    <td>{row.schemeKind}</td>
                    <td className="numeric">{row.freeBoxLabel || '—'}</td>
                    <td>{formatDate(row.SchemeStartDate)}</td>
                    <td>{formatDate(row.SchemeEndDate)}</td>
                    <td><span className={`status-badge ${statusClass(row.Status)}`}>{row.Status}</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="no-data">
                    No SpecialTO schemes found for the selected status
                  </td>
                </tr>
              )}
              {filteredRows.length > 0 && (
                <tr className="grand-total-row">
                  <td colSpan="2"><strong>Grand Total ({totals.count} schemes)</strong></td>
                  <td className="numeric"><strong>{formatNum(totals.claimable)}</strong></td>
                  <td className="numeric"><strong>{formatNum(totals.unclaimable)}</strong></td>
                  <td className="numeric"><strong>{formatNum(totals.specialTO)}</strong></td>
                  <td></td>
                  <td className="numeric"><strong>{totals.freeBox}</strong></td>
                  <td colSpan="3"></td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="report-actions">
        <button className="btn btn-word" onClick={exportToWord}>Download Word</button>
        <button className="btn btn-excel" onClick={exportToExcel}>Download Excel</button>
        <button className="btn btn-pdf" onClick={exportToPDF}>Download PDF</button>
        <button className="btn btn-print" onClick={handlePrint}>Print Report</button>
      </div>

      <style>{`
        /* Fallback styles for the report header in the popup window */
        .pd-report-popup-header { background: #1f2d3d; color: #fff; padding: 18px 24px; border-radius: 8px 8px 0 0; margin-bottom: 20px; }
        .pd-report-popup-header__eyebrow { margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; }
        .pd-report-popup-header__title { margin: 0; font-size: 22px; font-weight: 700; }
        .pd-report-popup-header__subtitle { margin: 4px 0 0 0; font-size: 13px; opacity: 0.85; }
        .pd-report-popup-header__meta { margin-top: 8px; font-size: 12px; opacity: 0.8; }
        .active-specialto-container {
          font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin: 20px auto;
          max-width: 1200px;
          color: #333;
          position: relative;
          overflow-x: auto;
        }
        .grand-total-row { background: #34495e !important; color: white; }
        .grand-total-row td { background: #34495e !important; color: white; border-top: 2px solid #2c3e50; }
        .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #eaeaea; }
        .company-name { font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0 0 8px 0; }
        .company-address { font-size: 12px; color: #888; margin: 0; }
        .company-contact { font-size: 12px; color: #888; margin: 0; }
        .report-title { font-size: 20px; font-weight: 600; color: #3498db; margin: 0 0 8px 0; text-align: right; }
        .report-date, .report-range { font-size: 12px; color: #555; margin: 0; text-align: right; }
        .report-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 16px; }
        .search-input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; min-width: 250px; }
        .status-select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; background: #fff; }
        .summary-stats { display: flex; gap: 16px; flex-wrap: wrap; }
        .stat-item { font-size: 12px; color: #555; }
        .stat-item strong { color: #2c3e50; }
        .table-container { overflow-x: auto; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 20px; }
        .specialto-table { min-width: 1100px; border-collapse: collapse; font-size: 12px; width: 100%; }
        .specialto-table th { background: #f8f9fa; padding: 10px 8px; text-align: left; font-weight: 600; color: #2c3e50; border-bottom: 2px solid #e0e0e0; white-space: nowrap; font-size: 11px; }
        .specialto-table td { padding: 8px 6px; border-bottom: 1px solid #eaeaea; font-size: 11px; }
        .numeric { text-align: right; }
        .sub-text { font-size: 10px; color: #888; }
        .no-data { text-align: center; padding: 30px; color: #95a5a6; font-style: italic; }
        .status-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; }
        .status-active { background: #e8f8f0; color: #27ae60; }
        .status-expired { background: #fdecea; color: #e74c3c; }
        .status-upcoming { background: #fef5e7; color: #f39c12; }
        .report-actions { display: flex; justify-content: flex-end; gap: 12px; }
        .btn { padding: 8px 16px; border: none; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .btn-word { background: #2b579a; color: white; }
        .btn-excel { background: #217346; color: white; }
        .btn-pdf { background: #f40f02; color: white; }
        .btn-print { background: #555; color: white; }
        .btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .loader-wrapper { display: flex; justify-content: center; align-items: center; height: 200px; }
        .spinner { width: 48px; height: 48px; border: 6px solid #ccc; border-top: 6px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media print {
          .report-controls, .report-actions { display: none; }
        }
      `}</style>
    </div>
  );
};

export default ActiveSpecialTOReportPopup;
