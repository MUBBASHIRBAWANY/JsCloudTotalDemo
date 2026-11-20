import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';

const invoiceKey = (item) =>
  [
    item?.invoice ?? '',
    item?.date ?? '',
    item?.Store ?? '',
    item?.Location ?? '',
    item?.Vendor ?? '',
    item?.SalesflowRef ?? '',
    item?.PostStatus ?? '',
  ].join('|');

const matchesInvoiceFilters = (item, filterData) => {
  const vendorMatch = filterData.Vendor?.some((v) => v.value === item.Vendor);

  const locationMatch =
    filterData.Location === null ||
    filterData.Location === 'All' ||
    filterData.Location?.value === undefined
      ? true
      : item.Location == filterData.Location.value;

  const departmentMatch =
    filterData.Department === null ||
    filterData.Department === 'All' ||
    filterData.Department?.value === undefined
      ? true
      : item.Store == filterData.Department.value;

  const statusMatch =
    filterData.Status === 'Both' ||
    filterData.Status == String(item.PostStatus);

  return vendorMatch && locationMatch && departmentMatch && statusMatch;
};

const PurchaseReportSummryWithKg = ({ filterData = [] }) => {
  const { startDate, endDate } = filterData;
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [summaryData, setSummaryData] = useState([]);
  const [detailData, setDetailData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  const getData = async () => {
    try {
      setLoading(true);
      const [summaryResult, detailResult] = await Promise.allSettled([
        getDataFundtion(`inventoryReport/PurchaseSummry?startDate=${startDate}&endDate=${endDate}`),
        getDataFundtion(`inventoryReport/PurchaseDumpData?startDate=${startDate}&endDate=${endDate}`),
      ]);
      setSummaryData(
        summaryResult.status === 'fulfilled' && Array.isArray(summaryResult.value) ? summaryResult.value : []
      );
      setDetailData(
        detailResult.status === 'fulfilled' && Array.isArray(detailResult.value) ? detailResult.value : []
      );
    } catch (err) {
      setSummaryData([]);
      setDetailData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    if (!summaryData || summaryData.length === 0) {
      setRows([]);
      return;
    }

    const products = filterData.allProducts?.length ? filterData.allProducts : (filterData.Product || []);
    const productById = new Map(products.map((product) => [String(product.value), product]));

    // KG is the full invoice weight from detail lines. Amounts stay on the summary invoice.
    const kgByInvoice = new Map();
    (detailData || []).forEach((item) => {
      if (!matchesInvoiceFilters(item, filterData)) return;
      const productInfo = productById.get(String(item.product));
      const box = Number(item.Box) || 0;
      const pcsInBox = Number(productInfo?.PcsinBox) || 0;
      const gram = Number(productInfo?.Gram) || 0;
      const kg = (pcsInBox * box * gram) / 1000;
      const key = invoiceKey(item);
      kgByInvoice.set(key, (kgByInvoice.get(key) || 0) + kg);
    });

    const sortedData = [...summaryData].sort((a, b) => Number(a.invoice) - Number(b.invoice));
    const filteredInvoices = sortedData.filter((item) => matchesInvoiceFilters(item, filterData));

    const processed = filteredInvoices.map((item, index) => {
      const vendorInfo = filterData.Vendor.find((v) => v.value === item.Vendor);
      const Box = Number(item.Box) || 0;
      const location = filterData.totalLocation.find((loc) => loc.value === item.Location)?.label;
      const Store = filterData.totalStore.find((dep) => dep.value === item.Store)?.label;
      const allGST = (Number(item.invoiceGST || 0) + Number(item.GST || 0));
      const Kg = kgByInvoice.get(invoiceKey(item)) || 0;

      return {
        id: index + 1,
        invoice: item.invoice,
        Box,
        Kg: Math.round(Kg * 1000) / 1000,
        totalAmount: Number(item.Gst + item.GrossAmount) || 0,
        Gst: allGST || 0,
        GrossAmount: Number(item.GrossAmount) || 0,
        netAmount: Number(item.TotalAmount) || 0,
        Discount: Number(item.Discount) || 0,
        AdvanceTax: Number(item.AdvanceTax) || 0,
        date: item.date,
        SalesflowRef: item.SalesflowRef,
        Location: location || 'N/A',
        Store: Store || 'N/A',
        vendor: vendorInfo?.name || 'Unknown Vendor',
        status: item.PostStatus ? 'Posted' : 'Pending',
      };
    });

    setRows(processed);
  }, [summaryData, detailData, filterData]);

  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows;
    if (filter) {
      filtered = rows.filter((row) =>
        Object.values(row).some(
          (value) => value && value.toString().toLowerCase().includes(filter.toLowerCase())
        )
      );
    }

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).replace(',', '');
  };

  const differenceOf = (row) =>
    Number(((row.GrossAmount + row.Gst + row.AdvanceTax) - row.Discount - row.netAmount).toFixed(2));

  const totals = useMemo(() => {
    return {
      totalBox: filteredAndSortedRows.reduce((sum, row) => sum + row.Box, 0),
      totalKg: filteredAndSortedRows.reduce((sum, row) => sum + row.Kg, 0),
      GrossAmount: filteredAndSortedRows.reduce((sum, row) => sum + row.GrossAmount, 0),
      totalGst: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.Gst || 0), 0),
      totalAmount: filteredAndSortedRows.reduce((sum, row) => sum + row.totalAmount, 0),
      AdvanceTax: filteredAndSortedRows.reduce((sum, row) => sum + row.AdvanceTax, 0),
      Discount: filteredAndSortedRows.reduce((sum, row) => sum + row.Discount, 0),
      totalNet: filteredAndSortedRows.reduce((sum, row) => sum + row.netAmount, 0),
      totalDifference: filteredAndSortedRows.reduce((sum, row) => sum + differenceOf(row), 0),
    };
  }, [filteredAndSortedRows]);

  const money = (value) =>
    Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const exportToExcel = async () => {
    const exportRows = filteredAndSortedRows.map((row, index) => ({
      '#': index + 1,
      ...row,
      Box: Number(Number(row.Box || 0).toFixed(2)),
      Kg: Number(Number(row.Kg || 0).toFixed(2)),
      totalAmount: Number(Number(row.totalAmount || 0).toFixed(2)),
      Gst: Number(Number(row.Gst || 0).toFixed(2)),
      GrossAmount: Number(Number(row.GrossAmount || 0).toFixed(2)),
      netAmount: Number(Number(row.netAmount || 0).toFixed(2)),
      Discount: Number(Number(row.Discount || 0).toFixed(2)),
      AdvanceTax: Number(Number(row.AdvanceTax || 0).toFixed(2)),
    }));
    await exportProfessionalExcel({
      title: 'Purchase Report Summary with KG',
      fileName: 'Purchase_Report_Summary_With_KG',
      sheetName: 'Purchase Report',
      rows: exportRows,
      meta: [
        startDate && endDate ? `Period: ${startDate} to ${endDate}` : '',
        filterData.Department?.label ? `Store: ${filterData.Department.label}` : '',
        filterData.Location?.label ? `Location: ${filterData.Location.label}` : '',
        filterData.Status ? `Status: ${filterData.Status}` : '',
      ].filter(Boolean),
      excludeKeys: ['_id', 'id'],
    });
  };

  const exportToWord = async () => {
    if (!filteredAndSortedRows || filteredAndSortedRows.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(filteredAndSortedRows[0]);
    const headerRow = new TableRow({
      children: headers.map((header) =>
        new TableCell({
          children: [new Paragraph({ text: header })],
        })
      ),
    });

    const dataRows = filteredAndSortedRows.map((row) =>
      new TableRow({
        children: Object.values(row).map((value) =>
          new TableCell({
            children: [new Paragraph({ text: String(value ?? '') })],
          })
        ),
      })
    );

    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: 'Pearl Dynamic', heading: 'Heading1' }),
            new Paragraph({ text: 'Purchase Report Summary with KG' }),
            new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
            new Paragraph({ text: '' }),
            table,
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'Developed by JS International | Website: https://jaffersons.com/ | Contact: 0301-8251291',
              alignment: AlignmentType.CENTER,
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'Purchase_Report_Summary_With_KG.docx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.addImage(
      'https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png',
      'PNG',
      250,
      8,
      50,
      20
    );
    doc.setFontSize(20);
    doc.text('Purchase Report Summary with KG', 14, 15);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 29);

    const tableColumn = Object.keys(filteredAndSortedRows[0] || {});
    const tableRows = filteredAndSortedRows.map((row) => Object.values(row));

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text(
      'Developed by JS International | Website: https://jaffersons.com/ | Contact: 0301-8251291',
      doc.internal.pageSize.width / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    const img = 'https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png';
    doc.setGState(new doc.GState({ opacity: 0.2 }));
    doc.addImage(img, 'PNG', 70, 60, 160, 100);
    doc.setGState(new doc.GState({ opacity: 1 }));

    doc.save('Purchase_Report_Summary_With_KG.pdf');
  };

  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=1200,height=800');

    printWindow.document.write(`
    <html>
      <head>
        <title>Purchase Report Summary with KG</title>
        <style>
          ${document.querySelector('style')?.innerHTML || ''}
            .print-footer {
            margin-top: 40px;
            font-size: 12px;
            text-align: center;
            color: #555;
            border-top: 1px solid #ccc;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        ${printContent}
        <div class="print-footer">
          Developed by JS International | Website: <a href="https://jaffersons.com/" target="_blank">https://jaffersons.com/</a> | Contact: 0301-8251291
        </div>
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
      <div className="watermark">
        <div className="watermark-content">
          <div className="watermark-logo">JSoft</div>
          <div className="watermark-text">Cloud</div>
          <div className="watermark-subtext">PURCHASE REPORT</div>
        </div>
      </div>

      <div className="sales-report-header">
        <div className="company-info">
          <h1 className="company-name">Pearl Dynamic</h1>
          <p className="company-address">123 Business Avenue, City, Country</p>
          <p className="company-contact">Phone: +1 (234) 567-8900 | Email: info@pmmanagement.com</p>
        </div>
        <div>
          <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png" height={'80vh'} alt="" />
        </div>
        <div className="report-info">
          <h2 className="report-title">Purchase Report Summary with KG</h2>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">Period: {startDate} to {endDate}</p>
        </div>
      </div>

      <div className="report-controls">
        <input
          type="text"
          placeholder="Search purchases..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
        <div className="summary-stats">
          <div className="stat-item">Records: {filteredAndSortedRows.length}</div>
          <div className="stat-item">KG: {Number(totals.totalKg || 0).toFixed(2)}</div>
          <div className="stat-item">Net Amount: {money(totals.totalNet)}</div>
        </div>
      </div>

      <div className="table-container">
        <table className="sales-data-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('id')}>#</th>
              <th onClick={() => requestSort('date')}>Date</th>
              <th onClick={() => requestSort('invoice')}>Invoice</th>
              <th onClick={() => requestSort('SalesflowRef')}>SalesflowRef</th>
              <th onClick={() => requestSort('Box')}>Qty In Box</th>
              <th onClick={() => requestSort('Kg')}>KG</th>
              <th onClick={() => requestSort('GrossAmount')}>GrossAmount</th>
              <th onClick={() => requestSort('Gst')}>Gst</th>
              <th onClick={() => requestSort('totalAmount')}>TotalAmount</th>
              <th onClick={() => requestSort('Discount')}>Discount</th>
              <th onClick={() => requestSort('AdvanceTax')}>AdvanceTax</th>
              <th onClick={() => requestSort('netAmount')}>Net Amount</th>
              <th>Diffrence</th>
              <th onClick={() => requestSort('vendor')}>Vendor</th>
              <th onClick={() => requestSort('Location')}>Location</th>
              <th onClick={() => requestSort('Store')}>Department</th>
              <th onClick={() => requestSort('status')}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length > 0 ? (
              filteredAndSortedRows.map((row) => (
                <tr key={row.id} className={row.status === 'Pending' ? 'row-pending' : ''}>
                  <td>{row.id}</td>
                  <td>{formatDate(row.date)}</td>
                  <td className="invoice-number">{row.invoice}</td>
                  <td className="invoice-number">{row.SalesflowRef}</td>
                  <td className="numeric">{Number(Number(row.Box || 0).toFixed(2))}</td>
                  <td className="numeric">{Number(row.Kg || 0).toFixed(2)}</td>
                  <td className="numeric currency">{money(row.GrossAmount)}</td>
                  <td className="numeric currency">{money(row.Gst)}</td>
                  <td className="numeric currency">{money(row.totalAmount)}</td>
                  <td className="numeric currency">{money(row.Discount)}</td>
                  <td className="numeric currency">{money(row.AdvanceTax)}</td>
                  <td className="numeric currency">{money(row.netAmount)}</td>
                  <td className="numeric">{differenceOf(row).toFixed(2)}</td>
                  <td>{row.vendor}</td>
                  <td>{row.Location}</td>
                  <td>{row.Store}</td>
                  <td>
                    <span className={`status-badge ${row.status.toLowerCase()}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="17" className="no-data">
                  {loading ? 'Loading purchase report...' : 'No purchase records found'}
                </td>
              </tr>
            )}
            {!loading && (
            <tr className="footer-total">
              <td colSpan="4">Totals</td>
              <td className="numeric">{Number(Number(totals.totalBox || 0).toFixed(2))}</td>
              <td className="numeric">{Number(totals.totalKg || 0).toFixed(2)}</td>
              <td className="numeric currency">{money(totals.GrossAmount)}</td>
              <td className="numeric currency">{money(totals.totalGst)}</td>
              <td className="numeric currency">{money(totals.totalAmount)}</td>
              <td className="numeric currency">{money(totals.Discount)}</td>
              <td className="numeric currency">{money(totals.AdvanceTax)}</td>
              <td className="numeric currency">{money(totals.totalNet)}</td>
              <td className="numeric">{Number(totals.totalDifference || 0).toFixed(2)}</td>
              <td colSpan="4"></td>
            </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="report-actions">
        <button className="btn btn-word" onClick={exportToWord}>
          Export to Word
        </button>
        <button className="btn btn-excel" onClick={exportToExcel}>
          Export to Excel
        </button>
        <button className="btn btn-pdf" onClick={exportToPDF}>
          Export to PDF
        </button>
        <button className="btn btn-print" onClick={handlePrint}>
          Print Report
        </button>
      </div>

      <style jsx>{`
        .sales-report-container {
          font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin: 20px auto;
          overflow: scroll;
          color: #333;
          position: relative;
          overflow: hidden;
        }

        .watermark {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 1;
          opacity: 0.05;
        }

        .watermark-content {
          text-align: center;
          transform: rotate(-45deg);
        }

        .watermark-logo {
          font-size: 120px;
          font-weight: bold;
          color: #2c3e50;
          line-height: 1;
        }

        .watermark-text {
          font-size: 40px;
          font-weight: bold;
          color: #2c3e50;
          margin-top: 10px;
        }

        .watermark-subtext {
          font-size: 30px;
          color: #2c3e50;
          margin-top: 5px;
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

        .company-info {
          text-align: left;
        }

        .company-name {
          font-size: 24px;
          font-weight: 700;
          color: #2c3e50;
          margin: 0 0 8px 0;
        }

        .company-address, .company-contact {
          font-size: 12px;
          color: #7f8c8d;
          margin: 4px 0;
        }

        .report-info {
          text-align: right;
        }

        .report-title {
          font-size: 20px;
          font-weight: 600;
          color: #3498db;
          margin: 0 0 8px 0;
        }

        .report-date, .report-range {
          font-size: 12px;
          color: #7f8c8d;
          margin: 4px 0;
        }

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
          max-width: 10vw;
        }

        .summary-stats {
          display: flex;
          gap: 24px;
        }

        .stat-item {
          font-size: 14px;
          color: #555;
        }

        .table-container {
          overflow-x: scroll;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
        }

        .sales-data-table {
          width: 2500px;
          overflow: scroll;
          height: 20px;
          font-size: 16px;
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

        .sales-data-table th:hover {
          background: #e9ecef;
        }

        .sales-data-table td {
          padding: 10px;
          border-bottom: 1px solid #eaeaea;
        }

        .sales-data-table tbody tr:hover {
          background-color: #f8f9fa;
        }

        .row-pending {
          background-color: #fff9e6;
        }

        .row-pending:hover {
          background-color: #ffeeb5;
        }

        .numeric {
          text-align: right;
        }

        .currency {
          font-family: 'Courier New', monospace;
        }

        .invoice-number, .sku-code {
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge.posted {
          background: #e7f4e4;
          color: #2ecc71;
        }

        .status-badge.pending {
          background: #fef5e7;
          color: #f39c12;
        }

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
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-word {
          background: #2b579a;
          color: white;
        }

        .btn-word:hover {
          background: #1e3f6e;
        }

        .btn-excel {
          background: #217346;
          color: white;
        }

        .btn-excel:hover {
          background: #18532f;
        }

        .btn-pdf {
          background: #f40f02;
          color: white;
        }

        .btn-pdf:hover {
          background: #c30c01;
        }

        .btn-print {
          background: #555;
          color: white;
        }

        .btn-print:hover {
          background: #333;
        }

        @media print {
          .sales-report-container {
            box-shadow: none;
            padding: 0;
          }

          .report-controls, .report-actions {
            display: none;
          }

          .table-container {
            overflow: scroll;
            border: none;
          }

          .watermark {
            opacity: 0.03;
          }
        }
      `}</style>
    </div>
  );
};

export default PurchaseReportSummryWithKg;
