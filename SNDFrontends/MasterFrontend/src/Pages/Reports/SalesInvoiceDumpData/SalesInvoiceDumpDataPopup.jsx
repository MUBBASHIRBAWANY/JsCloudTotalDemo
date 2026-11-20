import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";

const SalesDumpDataPopup = ({ filterData = [] }) => {
  const [isLoading, setIsLoading] = useState(true); // Start with true
  console.log(isLoading)
  const { startDate, endDate } = filterData
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  const getData = async () => {
    setIsLoading(true);
    try {
      const gettingdata = await getDataFundtion(`inventoryReport/SalesDumpData?startDate=${startDate}&endDate=${endDate}`);
      setData(gettingdata);
    } catch (err) {
      console.error('Error fetching data:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [filterData]);

  // Process data when data or filterData changes
  useEffect(() => {
    if (data && data.length > 0) {
      setIsLoading(true); // Set loading to true while processing

      const sortedData = data.sort((a, b) => {
        const statusA = a.PostStatus === true ? 1 : 0;
        const statusB = b.PostStatus === true ? 1 : 0;
        if (statusA !== statusB) {
          return statusB - statusA; // Posted first
        }
        return Number(a.invoice) - Number(b.invoice);
      });

      const sortedDataByDate = sortedData.sort((a, b) => new Date(a.date) - new Date(b.date));
      const filteredProducts = sortedDataByDate.filter(item => {
        const customer = filterData.Customer.find(c => c.value === item.Client);
        return (

          customer &&
          filterData.Customer.some(c => c.value === item.Client) &&
          filterData.Region.some(r => r.value == customer.Region) &&
          filterData.City.some(ct => ct.value == customer.city) &&
          filterData.Zone.some(z => z.value == customer.Zone) &&
          filterData.OrderBooker.some(ob => ob.value == item.OrderBooker) &&
          (
            filterData.Status === "Both" ||
            filterData.Status == String(item.PostStatus)
          )
        );
      });
      console.log(filteredProducts)
      // Map and enrich data
      const grouped = filteredProducts.reduce((acc, item) => {
        if (!acc[item.invoice]) {
          acc[item.invoice] = {
            invoice: item.invoice,
            date: item.date,
            Ref: item.Ref || '',
            client: filterData.Customer.find((C) => C.value === item?.Client)?.name,
            NTN: filterData.Customer.find((C) => C.value === item.Client)?.NTN,
            STN: filterData.Customer.find((C) => C.value === item.Client)?.STN,
            OrderBooker: filterData.OrderBooker.find((O) => O.value === item.OrderBooker)?.label,
            Region: filterData.Region.find(
              (R) => R?.value == filterData?.Customer.find((C) => C.value === item?.Client)?.Region
            )?.label,
            Zone: filterData.Zone.find(
              (R) => R?.value == filterData?.Customer.find((C) => C.value === item?.Client)?.Zone
            )?.label,
            City: filterData.City.find(
              (R) => R?.value == filterData?.Customer.find((C) => C.value === item?.Client)?.city
            )?.label,
            Address: filterData.Customer.find((C) => C.value === item?.Client)?.Address,
            status: item.PostStatus === true ? 'Posted' : 'Pending',
            carton: 0,
            totalNetSaleAmount: 0,
          };
        }

        // merge sums
        acc[item.invoice].carton += Number(item.carton) || 0;
        acc[item.invoice].totalNetSaleAmount = Number(item.TotalAmount) || 0;
        return acc;
      }, {});

      console.log(grouped)
      // Step 2: Convert object → array with id
      const processed = Object.values(grouped).map((item, index) => ({
        id: index + 1,
        ...item,
      }));
      setRows(processed);
      setIsLoading(false); // Set loading to false after processing
    } else if (data && data.length === 0) {
      setIsLoading(false); // No data, set loading to false
    }
  }, [data, filterData]);

  // Rest of the component remains the same...
  // Filter and sort rows based on user interaction
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

  // Calculate totals for summary
  const totals = useMemo(() => {
    return {
      totalCartons: filteredAndSortedRows.reduce((sum, row) => sum + row.carton, 0),
      totalAmount: filteredAndSortedRows.reduce((sum, row) => sum + row.totalNetSaleAmount, 0),
    };
  }, [filteredAndSortedRows]);

  // Export to Excel function
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredAndSortedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
    XLSX.writeFile(workbook, "Sales_Report.xlsx");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(",", "");
  };

  // Export to Word function
  const exportToWord = async () => {
    // Prepare table rows for Word document
    const tableRows = filteredAndSortedRows.map(row =>
      new TableRow({
        children: Object.values(row).map(value =>
          new TableCell({
            children: [new Paragraph({ text: String(value) })],
          })
        ),
      })
    );

    // Create table with headers
    const headers = Object.keys(filteredAndSortedRows[0] || {});
    const table = new Table({
      rows: [
        new TableRow({
          children: headers.map(header =>
            new TableCell({
              children: [new Paragraph({ text: header, bold: true })],
            })
          ),
        }),
        ...tableRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: "", heading: "Heading1" }),
          new Paragraph({ text: "Sales Report" }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
          new Paragraph({ text: "" }),
          table,
        ],
      }],
    });

    // Generate blob and download
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Sales_Report.docx");
  };

  // Export to PDF function

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");

    // Header text
    doc.addImage(
      "https://res.cloudinary.com/dmi26itgk/image/upload/v1755944631/Screenshot_2025-08-23_152337_ajpexh.png",
      "PNG",
      250,   // X position (adjust as per page size)
      8,     // Y position (same as text baseline)
      50,    // Width
      20     // Height
    );
    doc.setFontSize(20);
    doc.text("Sales Report", 14, 15);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 29);

    // Table
    const tableColumn = Object.keys(filteredAndSortedRows[0] || {});
    const tableRows = filteredAndSortedRows.map((row) => Object.values(row));

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    // Add footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text(
      "Developed by JS International | / | ",
      doc.internal.pageSize.width / 2,
      pageHeight - 10,
      { align: "center" }
    );
    const img = "https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png";
    doc.setGState(new doc.GState({ opacity: 0.2 })); // semi-transparent
    doc.addImage(img, "PNG", 70, 60, 160, 100); // (x,y,width,height)
    doc.setGState(new doc.GState({ opacity: 1 })); // reset

    // Save PDF
    doc.save("Sales_Report.pdf");
  };
  // Print function
  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML; // grab only popup content
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    // Write the content and styles into new print window
    printWindow.document.write(`
    <html>
      <head>
        <title>Sales Report</title>
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
          | Website: <a href="https://jaffersons.com/" target="_blank">https://jaffersons.com/</a> | 
        </div>
      </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();

    // Give it a tick to load content, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };


  return (

    <div className="sales-report-container" ref={reportRef}>
      <div className="watermark">
        <div className="watermark-content">
          <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png" alt="" />
        </div>
      </div>

      <div className="sales-report-header">
        <div className="company-info">
          <h2 className="company-name"></h2>
          <p className="company-address">123 Business Avenue, Suite 456</p>
          <p className="company-contact">Phone: (555) 123-4567 | Email: info@pmmgmt.com</p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Sales Report</h1>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">
            {filteredAndSortedRows.length > 0
              ? `Period: ${filteredAndSortedRows[0].date} to ${filteredAndSortedRows[filteredAndSortedRows.length - 1].date}`
              : 'No data available'
            }
          </p>
        </div>
      </div>

      <div className="report-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search sales data..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="summary-stats">
          <span className="stat-item">
            Total Sales: <strong>{totals.totalAmount.toLocaleString()}</strong>
          </span>
          <span className="stat-item">
            Total Cartons: <strong>{totals.totalCartons}</strong>
          </span>
          <span className="stat-item">
            Transactions: <strong>{filteredAndSortedRows.length}</strong>
          </span>
        </div>
      </div>

      <div className="table-container">
          {isLoading ? (
            <div className="loader-wrapper">
              <div className="spinner"></div>
              <p>Loading sales data...</p>
            </div>
          ) : (
            <table className="sales-data-table">
              <thead>
                <tr>
                  <th onClick={() => requestSort('id')}># {sortConfig.key === 'id' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('date')}>Date {sortConfig.key === 'date' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('invoice')}>SaleInvoice  {sortConfig.key === 'invoice' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('carton')}>Sale Carton {sortConfig.key === 'carton' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('totalNetSaleAmount')}>Net Sale Amount {sortConfig.key === 'totalNetSaleAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('ref')}>Ref {sortConfig.key === 'ref' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('client')}>Client {sortConfig.key === 'client' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('Region')}>Region {sortConfig.key === 'Region' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('Zone')}>Zone {sortConfig.key === 'Zone' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('City')}>City {sortConfig.key === 'City' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('NTN')}>NTN {sortConfig.key === 'NTN' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('STN')}>STN {sortConfig.key === 'STN' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('Address')}>Address {sortConfig.key === 'Address' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('OrderBooker')}>OrderBooker {sortConfig.key === 'OrderBooker' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('status')}>Status {sortConfig.key === 'status' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedRows.length > 0 ? (
                  filteredAndSortedRows.map((row) => (
                    <tr key={row.id} className={row.status === 'Pending' ? 'row-pending' : ''}>
                      <td>{row.id}</td>
                      <td style={{ minWidth: "100px" }}>{formatDate(row.date)}</td>
                      <td className="invoice-number">{row.invoice}</td>
                      <td className="numeric">{row.carton}</td>
                      <td className="numeric currency">{row.totalNetSaleAmount.toLocaleString()}</td>
                      <td>{row.Ref}</td>
                      <td>{row.client}</td>
                      <td>{row.Region}</td>
                      <td>{row.Zone}</td>
                      <td>{row.City}</td>
                      <td>{row.NTN}</td>
                      <td>{row.STN}</td>
                      <td>{row.Address}</td>
                      <td>{row.OrderBooker}</td>
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
                      No matching records found
                    </td>
                  </tr>
                )}
                {filteredAndSortedRows.length > 0 && (
                  <tr>
                    <td colSpan="2" className="footer-total">Totals</td>
                    <td className="numeric footer-total"></td>
                    <td className="numeric footer-total">{totals.totalCartons}</td>
                    <td className="numeric currency footer-total">{totals.totalAmount.toLocaleString()}</td>
                    <td className="numeric footer-total" colSpan="11"></td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="report-actions">
          <button className="btn btn-word" onClick={exportToWord}>
            Download Word
          </button>
          <button className="btn btn-excel" onClick={exportToExcel}>
            Download Excel
          </button>
          <button className="btn btn-pdf" onClick={exportToPDF}>
            Download PDF
          </button>
          <button className="btn btn-print" onClick={handlePrint}>
            Print Report
          </button>
        </div>

        <style jsx>{`
        .loader-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 300px;
          gap: 20px;
        }
        
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }  
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
          overflow: scroll;
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
          overflow-y: hidden;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
          -webkit-overflow-scrolling: touch; 
          min-height: 300px;
        }
        
        .sales-data-table {
          min-width: 1200px;  
          border-collapse: collapse;
          font-size: 14px;
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
        
        tfoot {
          border-top: 2px solid #e0e0e0;
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
            overflow-x: scroll;
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

      export default SalesDumpDataPopup;