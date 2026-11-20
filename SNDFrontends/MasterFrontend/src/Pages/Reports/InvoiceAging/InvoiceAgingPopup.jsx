  import React, { useEffect, useState, useMemo, useRef } from 'react';
  import { getDataFundtion } from '../../../Api/CurdFunctions';
  import { listFromResponse } from '../../../Components/Global/distributorAccess';
  import * as XLSX from 'xlsx';
  import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
  import { saveAs } from 'file-saver';
  import jsPDF from 'jspdf';
  import autoTable from "jspdf-autotable";



  const InvoiceAgingPopup = ({ filterData = [] }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { startDate, endDate } = filterData
    const [rows, setRows] = useState([]);
    const [filter, setFilter] = useState('');
    const [data, setData] = useState([])

    const getDaysDiff = (dateString) => {
      const givenDate = new Date(dateString);
      const today = new Date();
      const diffTime = today - givenDate;
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const reportRef = useRef(null);

    // Sample product data mapping (would typically come from props or API)
    ;

    const getData = async () => {
      setIsLoading(true);

      try {
        const ids = filterData.allowedDistributorIds
        let distributorIds = ids
        if (distributorIds == null) {
          const distributors = await getDataFundtion('/Distrbutor')
          distributorIds = listFromResponse(distributors).map((item) => item._id).filter(Boolean)
        }
        const chunks = await Promise.all((distributorIds || []).map(async (id) => {
          try {
            const gettingdata = await getDataFundtion(`/SalesInvoice/InvoiceAging?startDate=${filterData.startDate}&endDate=${filterData.endDate}&Distrbutor=${id}`)
            return gettingdata?.alldata || listFromResponse(gettingdata)
          } catch (err) {
            console.log(err)
            return []
          }
        }))

        const allowed = ids == null ? null : new Set((ids || []).map(String))
        const alldata = chunks.flat().filter((item) => !allowed || allowed.has(String(item.Distrbutor))).map((item) => ({
          ...item,
          invoice: item.SalesInvoice,
          date: item.SalesInvoiceDate,
          Client: item.Client,
          ClientName: filterData.Customer.find((C) => C.value === item.Client)?.name,
          ClientCode: filterData.Customer.find((C) => C.value === item.Client)?.code,
          OrderBooker: item.OrderBooker || item.SalesData?.[0]?.OrderBooker,
          TotalAmount: item.TotalAmount ?? item.Totalamount,
          RecivedAmount: item.RecivedAmount ?? item.Recived,
          RemainingAmount: item.RemainingAmount ?? item.Remaining,
          PostStatus: true,
        }))
        setData(alldata)

      } catch (err) {
        console.error('Error fetching data:', err);

      }
      finally {
        setIsLoading(false);
      }
    }

    useEffect(() => {
      getData()
    }, [])

    // Process data on component mount or when filterData changes
    useEffect(() => {
      if (data && data.length > 0) {
        const sortedData = data.sort((a, b) => {
          const statusA = a.PostStatus === true ? 1 : 0;
          const statusB = b.PostStatus === true ? 1 : 0;
          if (statusA !== statusB) {
            return statusB - statusA; // Posted first
          }
          return Number(a.invoice) - Number(b.invoice);
        });
        const sortedDataByDate = sortedData.sort((a, b) => new Date(a.date) - new Date(b.date));
        console.log(sortedDataByDate)
        const filteredProducts = sortedDataByDate.filter(item => {
          const customer = filterData.Customer.find(c => c.value === item.Client);
          return (
            customer &&
            filterData.Customer.some(c => c.value === item.Client) &&
            filterData.Region.some(r => r.value == customer.Region) &&
            filterData.City.some(ct => ct.value == customer.city) &&
            filterData.Zone.some(z => z.value == customer.Zone) &&
            filterData.OrderBooker.some(ob => ob.value == item.OrderBooker) &&
            item.PostStatus == true

          );
        });
        console.log(filteredProducts, "filteredProducts")
        // Map and enrich data
        const processed = filteredProducts.map((item, index) => ({
          id: index + 1,
          invoice: item.invoice,
          date: item.date,
          code: item.ClientCode || 0,
          client: filterData.Customer.find((C) => C.value === item?.Client)?.name,
          NTN: filterData.Customer.find((C) => C.value === item.Client)?.NTN,
          STN: filterData.Customer.find((C) => C.value === item.Client)?.STN,
          OrderBooker: filterData.OrderBooker.find((O) => O.value === item.OrderBooker)?.label,
          Region: filterData.Region.find((R) => R?.value == filterData?.Customer.find((C) => C.value === item?.Client)?.Region)?.label,
          Zone: filterData.Zone.find((R) => R?.value == filterData?.Customer.find((C) => C.value === item?.Client)?.Zone)?.label,
          City: filterData.City.find((R) => R?.value == filterData?.Customer.find((C) => C.value === item?.Client)?.city)?.label,
          TotalAmount: item.TotalAmount,
          RecivedAmount: item.RecivedAmount,
          RemainingAmount: item.RemainingAmount,
          OrderBooker: filterData.OrderBooker.find((O) => O.value === item?.OrderBooker)?.label,
          status: item.PostStatus === true ? 'Posted' : 'Pending',
          Days: getDaysDiff(item.date)
        }));
        setRows(processed);
      }
    }, [data]);

    // Filter and sort rows based on user interaction
    const filteredAndSortedRows = useMemo(() => {
      let filtered = rows;
      console.log(filtered)
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
        totalAmount: filteredAndSortedRows.reduce((sum, row) => sum + row.RemainingAmount, 0),
        totalSale: filteredAndSortedRows.reduce((sum, row) => sum + row.TotalAmount, 0),
        totalRecived: filteredAndSortedRows.reduce((sum, row) => sum + row.RecivedAmount, 0),

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
            new Paragraph({ text: "Invoice Aging" }),
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

      // Header
      doc.addImage(
        "https://res.cloudinary.com/dmi26itgk/image/upload/v1755944631/Screenshot_2025-08-23_152337_ajpexh.png",
        "PNG",
        250,
        8,
        50,
        20
      );
      doc.setFontSize(20);
      doc.text("Sales Report", 14, 15);
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
      doc.text(`Period: ${startDate} to ${endDate}`, 14, 29);

      // Table Data
      const tableColumn = Object.keys(filteredAndSortedRows[0] || {});
      const tableRows = filteredAndSortedRows.map((row) => Object.values(row));

      // ✅ Add totals row at the end
      const totalsRow = [
        "Totals", "", "", "", "", "", "", "", "", "", "",
        totals.totalSale.toLocaleString(),
        totals.totalRecived.toLocaleString(),
        totals.totalAmount.toLocaleString(),
        "", "", ""
      ];
      tableRows.push(totalsRow);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      });

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.text(
        "Developed by JS International | / | ",
        doc.internal.pageSize.width / 2,
        pageHeight - 10,
        { align: "center" }
      );

      // Watermark
      const img = "https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png";
      doc.setGState(new doc.GState({ opacity: 0.2 }));
      doc.addImage(img, "PNG", 70, 60, 160, 100);
      doc.setGState(new doc.GState({ opacity: 1 }));

      doc.save("Sales_Report.pdf");
    };

  const OpenInvoice = () =>{
    const printWindow = window.open("", "_blank", "width=1200,height=800");
  }


    // Print function
    const handlePrint = () => {
      const printContent = reportRef.current.innerHTML;
      const printWindow = window.open("", "_blank", "width=1200,height=800");

      // Write the content and styles into new print window
      printWindow.document.write(`
      <html>
        <head>
          <title>Sales Report</title>
          <style>
            body {
              font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
              background: #fff;
              color: #333;
              padding: 20px;
            }
            .sales-report-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 24px;
              padding-bottom: 20px;
              border-bottom: 1px solid #eaeaea;
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
            .report-info {
              text-align: right;
            }
            .report-title {
              font-size: 20px;
              font-weight: 600;
              color: #3498db;
              margin: 0 0 8px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
            }
            th {
              background: #f8f9fa;
              padding: 12px 10px;
              text-align: left;
              font-weight: 600;
              color: #2c3e50;
              border-bottom: 2px solid #e0e0e0;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #eaeaea;
            }
            .numeric {
              text-align: right;
            }
            .footer-total {
              font-weight: 700;
              background: #f8f9fa;
            }
            .print-footer {
              margin-top: 40px;
              font-size: 12px;
              text-align: center;
              color: #555;
              border-top: 1px solid #ccc;
              padding-top: 10px;
            }
            @media print {
              body {
                padding: 0;
              }
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
        // Don't close immediately to allow user to see print dialog
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
            <p className="company-RemainingAmount">123 Business Avenue, Suite 456</p>
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
              Total Recivable: <strong>{totals.totalAmount.toLocaleString()}</strong>
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
            </div>
          ) :
            (<table className="sales-data-table">
              <thead>
                <tr>
                  <th onClick={() => requestSort('id')}># {sortConfig.key === 'id' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('date')}>Date {sortConfig.key === 'date' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('invoice')}>Invoice {sortConfig.key === 'invoice' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('OrderBooker')}>OrderBooker {sortConfig.key === 'OrderBooker' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('code')}>Client Code {sortConfig.key === 'code' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('Client')}>Client  {sortConfig.key === 'ClientCode' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('Region')}>Region {sortConfig.key === 'Region' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('Zone')}>Zone {sortConfig.key === 'Zone' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('City')}>City {sortConfig.key === 'City' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('NTN')}>NTN {sortConfig.key === 'NTN' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('STN')}>STN {sortConfig.key === 'STN' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('TotalAmount')}>TotalAmount {sortConfig.key === 'TotalAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('RecivedAmount')}>RecivedAmount {sortConfig.key === 'RecivedAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('RemainingAmount')}>RemainingAmount {sortConfig.key === 'RemainingAmount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('Days')}>Days {sortConfig.key === 'Days' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                  <th onClick={() => requestSort('status')}>Status {sortConfig.key === 'status' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedRows.length > 0 ? (
                  filteredAndSortedRows.map((row) => (
                    <tr key={row.id} className={row.status === 'Pending' ? 'row-pending' : ''}>
                      <td>{row.id}</td>
                      <td style={{ minWidth: "100px" }}>{formatDate(row.date)}</td>
                      <td className="invoice-number" onClick={()=>OpenInvoice()}>{row.invoice}</td>
                      <td>{row.OrderBooker}</td>
                      <td>{row.code}</td>
                      <td>{row.client}</td>
                      <td>{row.Region}</td>
                      <td>{row.Zone}</td>
                      <td>{row.City}</td>
                      <td>{row.NTN}</td>
                      <td>{row.STN}</td>
                      <td className='numeric'>{Number(row.TotalAmount).toLocaleString()}</td>
                      <td className='numeric'>{Number(row.RecivedAmount).toLocaleString()}</td>
                      <td className='numeric'>{Number(row.RemainingAmount).toLocaleString()}</td>
                      <td>{row.Days}</td>
                      <td>
                        <span className={`status-badge ${row.status.toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="16" className="no-data">
                      No matching records found
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="footer-total">Totals</td>
                  <td className="numeric footer-total"></td>
                  <td className="numeric footer-total"></td>
                  <td className="numeric footer-total"></td>
                  <td className="numeric footer-total"></td>
                  <td className="numeric footer-total"></td>
                  <td className="numeric footer-total"></td>
                  <td className="numeric footer-total"></td>
                  <td className="numeric footer-total"></td>
                  <td className="numeric footer-total"></td>
                  <td className="numeric footer-total">{totals.totalSale.toLocaleString()}</td>
                  <td className="numeric footer-total">{totals.totalRecived.toLocaleString()}</td>
                  <td className="numeric footer-total">{totals.totalAmount.toLocaleString()}</td>
                  <td className="numeric footer-total"></td>
                  <td className="numeric footer-total"></td>
                  <td className="numeric footer-total"></td>
                </tr>
              </tbody>
            </table>)}
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
          
          .company-RemainingAmount, .company-contact {
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
      overflow: visible !important;  /* ✅ allow full table */
      border: none;
    }
    
    .watermark {
      opacity: 0.03;
    }

    .footer-total {
      font-weight: bold;
      background: #f0f0f0 !important; /* ✅ keep totals visible in print */
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
          }
        `}</style>
      </div>
    );
  };

  export default InvoiceAgingPopup;