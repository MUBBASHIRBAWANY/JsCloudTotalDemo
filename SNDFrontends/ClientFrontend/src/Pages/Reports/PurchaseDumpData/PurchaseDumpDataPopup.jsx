import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PurchaseDumpDataPopup = ({ filterData = [] }) => {
  const { startDate, endDate } = filterData;
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  // Fetch Purchase data
  const getData = async () => {
    try {
      const gettingdata = await getDataFundtion(
        `PurchaseOrderDC/PurchaseRepor?startDate=${startDate}&endDate=${endDate}&Distrbutor=${filterData.Distributor}`
      );
      setData(gettingdata);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    getData();
  }, [startDate, endDate]);

  // Process data
  useEffect(() => {
    if (data && data.length > 0) {
      // Group by product to get product details
      const productMap = new Map();
      filterData.Product?.forEach(product => {
        productMap.set(product.value, {
          name: product.ProductName || 'Unknown Product',
          code: product.code || 'N/A'
        });
      });

      

      const processed = data.map((item, index) => ({
        id: index + 1,
        productId: item.product,
        productName: productMap.get(item.product)?.name || 'Unknown Product',
        code: productMap.get(item.product)?.code || 'N/A',
        box: Number(item.Box) || 0,
        date: item.date,
        status: item.PostStatus || 'Received',
      
      }));
      let filtered = processed;
      // Apply filters
      
      if (filterData.Product && filterData.Product.length > 0) {
        filtered = filtered.filter(item => 
          filterData.Product.some(p => p.value === item.productId)
        );
      }
      
      console.log(filtered)
      
      if (filterData.Status && filterData.Status !== "Both") {
        filtered = filtered.filter(item => 
          filterData.Status === item.status
        );
      }
      
      setRows(filtered);
    }
  }, [data, filterData]);

  // Filtering and sorting
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
      filtered.sort((a, b) => {
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
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(",", "");
  };

  // Totals
  const totals = useMemo(() => {
    return {
      totalBoxes: filteredAndSortedRows.reduce((sum, row) => sum + row.box, 0),
      totalRecords: filteredAndSortedRows.length,
    };
  }, [filteredAndSortedRows]);

  // Group by product for summary
  const productSummary = useMemo(() => {
    const summary = new Map();
    filteredAndSortedRows.forEach(row => {
      if (!summary.has(row.productId)) {
        summary.set(row.productId, {
          productName: row.productName,
          code: row.code,
          totalBoxes: 0,
          count: 0
        });
      }
      const product = summary.get(row.productId);
      product.totalBoxes += row.box;
      product.count += 1;
    });
    return Array.from(summary.values());
  }, [filteredAndSortedRows]);

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredAndSortedRows.map(row => ({
      '#': row.id,
      'Date': formatDate(row.date),
      'SKU Code': row.code,
      'Product': row.productName,
      'Boxes': row.box,
      'Status': row.status,
      'Vendor': row.vendor
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Dump Report');
    
    // Add summary sheet
    const summaryData = productSummary.map(product => ({
      'SKU Code': product.code,
      'Product': product.productName,
      'Total Boxes': product.totalBoxes,
      'Number of Records': product.count
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Product Summary');
    
    XLSX.writeFile(workbook, 'Purchase_Dump_Report.xlsx');
  };

  // Export to Word
  const exportToWord = async () => {
    if (!filteredAndSortedRows || filteredAndSortedRows.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ['#', 'Date', 'SKU Code', 'Product', 'Boxes', 'Status', 'Vendor'];
    const headerRow = new TableRow({
      children: headers.map(header =>
        new TableCell({
          children: [new Paragraph({ text: header, bold: true })],
        })
      ),
    });

    const dataRows = filteredAndSortedRows.map(row =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(row.id) })] }),
          new TableCell({ children: [new Paragraph({ text: formatDate(row.date) })] }),
          new TableCell({ children: [new Paragraph({ text: row.code })] }),
          new TableCell({ children: [new Paragraph({ text: row.productName })] }),
          new TableCell({ children: [new Paragraph({ text: String(row.box) })] }),
          new TableCell({ children: [new Paragraph({ text: row.status })] }),
          new TableCell({ children: [new Paragraph({ text: row.vendor })] }),
        ],
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
            new Paragraph({ text: "Pearl Dynamic", heading: "Heading1" }),
            new Paragraph({ text: "Purchase Dump Report" }),
            new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
            new Paragraph({ text: `Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}` }),
            new Paragraph({ text: `Total Records: ${totals.totalRecords}` }),
            new Paragraph({ text: `Total Boxes: ${totals.totalBoxes}` }),
            new Paragraph({ text: "" }),
            table,
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "Developed by JS International | / | ",
              alignment: AlignmentType.CENTER,
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Purchase_Dump_Report.docx");
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.addImage(
      "https://res.cloudinary.com/dmi26itgk/image/upload/v1755944631/Screenshot_2025-08-23_152337_ajpexh.png",
      "PNG",
      250, 8, 50, 20
    );
    doc.setFontSize(20);
    doc.text('Purchase Dump Report', 14, 15);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}`, 14, 29);
    doc.text(`Total Records: ${totals.totalRecords} | Total Boxes: ${totals.totalBoxes}`, 14, 36);

    const tableColumn = ['#', 'Date', 'SKU Code', 'Product', 'Boxes', 'Status', 'Vendor'];
    const tableRows = filteredAndSortedRows.map((row) => [
      row.id,
      formatDate(row.date),
      row.code,
      row.productName,
      row.box,
      row.status,
      row.vendor
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text(
      "Developed by JS International | / | ",
      doc.internal.pageSize.width / 2,
      pageHeight - 10,
      { align: "center" }
    );

    doc.save('Purchase_Dump_Report.pdf');
  };

  // Print function
  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
    <html>
      <head>
        <title>Purchase Dump Report</title>
        <style>
          ${document.querySelector("style")?.innerHTML || ""}
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
          | / | 
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
      {/* Watermark */}
      <div className="watermark">
        <div className="watermark-content">
          <div className="watermark-logo">JSoft</div>
          <div className="watermark-text">Cloud</div>
          <div className="watermark-subtext">PURCHASE DUMP REPORT</div>
        </div>
      </div>

      {/* Header */}
      <div className="sales-report-header">
        <div className="company-info">
          <h1 className="company-name">Pearl Dynamic</h1>
          <p className="company-address">123 Business Avenue, City, Country</p>
          <p className="company-contact">Phone: +1 (234) 567-8900 | Email: info@pmmanagement.com</p>
        </div>
        
        <div className="report-info">
          <h2 className="report-title">Purchase Dump Report</h2>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">Period: {startDate || 'N/A'} to {endDate || 'N/A'}</p>
        </div>
      </div>

      {/* Controls */}
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
          <div className="stat-item">Total Boxes: {totals.totalBoxes}</div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="sales-data-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('id')}>#</th>
              <th onClick={() => requestSort('date')}>Date</th>
              <th onClick={() => requestSort('code')}>SKU Code</th>
              <th onClick={() => requestSort('productName')}>Product</th>
              <th onClick={() => requestSort('box')}>Boxes</th>
              <th onClick={() => requestSort('status')}>Status</th>
              <th onClick={() => requestSort('vendor')}>Vendor</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length > 0 ? (
              filteredAndSortedRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{formatDate(row.date)}</td>
                  <td className="sku-code">{row.code}</td>
                  <td>{row.productName}</td>
                  <td className="numeric">{row.box}</td>
                  <td>
                    <span className={`status-badge ${row.status.toLowerCase()}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>{row.vendor}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  No purchase records found
                </td>
              </tr>
            )}
            <tr className="footer-total">
              <td colSpan="4">Totals</td>
              <td className="numeric">{totals.totalBoxes}</td>
              <td colSpan="2"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Product Summary Section */}
      {productSummary.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '10px' }}>Product Summary</h3>
          <div className="table-container">
            <table className="sales-data-table">
              <thead>
                <tr>
                  <th>SKU Code</th>
                  <th>Product</th>
                  <th>Total Boxes</th>
                  <th>Records Count</th>
                </tr>
              </thead>
              <tbody>
                {productSummary.map((product, idx) => (
                  <tr key={idx}>
                    <td>{product.code}</td>
                    <td>{product.productName}</td>
                    <td className="numeric">{product.totalBoxes}</td>
                    <td className="numeric">{product.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
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
          max-width: 1400px;
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
          min-width: 250px;
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
          overflow-x: auto;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
        }
        
        .sales-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
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
        
        .numeric {
          text-align: right;
        }
        
        .sku-code {
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .status-badge.received {
          background: #e7f4e4;
          color: #2ecc71;
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
        
        @media (max-width: 1200px) {
          .sales-report-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .company-info, .report-info {
            text-align: center;
            margin-bottom: 16px;
          }
          
          .report-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-input {
            min-width: 100%;
          }
          
          .summary-stats {
            justify-content: space-around;
          }
          
          .report-actions {
            flex-wrap: wrap;
            justify-content: center;
          }
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
            overflow: visible;
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

export default PurchaseDumpDataPopup;