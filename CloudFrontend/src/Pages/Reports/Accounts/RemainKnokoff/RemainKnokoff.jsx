import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";


import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import ReportPageLayout from '../../../../Components/Global/ReportPageLayout.jsx';


const VoucherReportPopup = ({ filterData = [] }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { startDate: initStartDate, endDate: initEndDate } = filterData;
  const [startDate, setStartDate] = useState(initStartDate);
  const [endDate, setEndDate] = useState(initEndDate);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([]);
  const [quickSelect, setQuickSelect] = useState('Custom');
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('');

  const quickSelectOptions = [
      { label: "Custom", value: "Custom" },
      { label: "Year to Date", value: "YearToDate" },
      { label: "Month to Date", value: "MonthToDate" }
  ];

    const currentYear = new Date().getFullYear();

    const monthOptions = [
        { label: "January", value: "01" },
        { label: "February", value: "02" },
        { label: "March", value: "03" },
        { label: "April", value: "04" },
        { label: "May", value: "05" },
        { label: "June", value: "06" },
        { label: "July", value: "07" },
        { label: "August", value: "08" },
        { label: "September", value: "09" },
        { label: "October", value: "10" },
        { label: "November", value: "11" },
        { label: "December", value: "12" }
    ];

  const handleQuickSelect = (value) => {
      setQuickSelect(value)
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      if (value === "MonthToDate") {
            const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
            setSelectedMonth(currentMonth);
            const firstDay = `${currentYear}-${currentMonth}-01`;
            setStartDate(firstDay);
            setEndDate(todayStr)
      } else if (value === "YearToDate") {
          const [start, end] = years.at(-1).label.split(" to ");
          setSelectedYear(years.at(-1).value)
          setStartDate(start)
          setEndDate(end)
      }
  }

  const handleYearChange = (year) => {
      setSelectedYear(year.value)
      const [start, end] = year.label.split(" to ");
      if (quickSelect === "YearToDate") {
          setStartDate(start)
          setEndDate(end)
      }
  }

    const handleMonthChange = (month) => {
        setSelectedMonth(month.value);
        const firstDay = `${currentYear}-${month.value}-01`;
        const lastDayDate = new Date(currentYear, parseInt(month.value), 0);
        const lastDay = `${currentYear}-${month.value}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
        setStartDate(firstDay);
        setEndDate(lastDay);
    }

  const formatDate = (dateValue) => {
    if (!dateValue) return "";

    try {
      const date = new Date(dateValue);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).replace(",", "");
    } catch (error) {
      return dateValue;
    }
  };

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  // Fetch and process voucher data
  const getData = async () => {
    setIsLoading(true);
    try {
      const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
      const yearList = yearRes.map((item) => ({
          label: `${item.DateStart} to ${item.DateEnd}`,
          value: item.DateStart.split('-')[0]
      }));
      setYears(yearList)

      // Assuming you have an API endpoint for voucher data
      const gettingdata = await getDataFundtion(`/Voucher/getAllCredit`);
      //console.log(gettingdata.length, "processedData1")
      const Customer = await getDataFundtion('/Distrbutor/DistrbutorNameId');

      // Process the data - you can either use the provided sample data or fetched data
      // For now, I'll assume we're using the provided data structure


      // Process the data to match required format
      const processedData = gettingdata.flatMap((item) =>
        item.VoucharData.map((vd, index) => {

          const clientInfo = Customer.find(
            client => client._id === vd.Client
          );

          const rawCredit =
            Number(vd.Credit || 0) -
            Number(vd.Remain || 0);

          const credit = Number(rawCredit.toFixed(2));

          return {
            voucherNumber: item.VoucherNumber,
            date: formatDate(item.VoucherDate),
            credit,
            client: clientInfo?.DistrbutorName || "",
            clientCode: clientInfo?.code || '',
            clientRef2: vd.ClientRef2,
            narration: vd.Narration,
            store: vd.store,
            debit: vd.Debit
          };
        })
      )
        .filter(item => item.credit > 0).filter(item => item.client !== "").map((val, index) => ({
          ...val,
          id :  index +1
        }));

      setData(processedData);
      setRows(processedData);

    } catch (err) {
      console.error('Error fetching voucher data:', err);

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

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

  // Calculate totals
  const totals = useMemo(() => {
    return {
      totalCredit: filteredAndSortedRows.reduce((sum, row) => sum + (row.credit || 0), 0),
      totalDebit: filteredAndSortedRows.reduce((sum, row) => sum + (row.debit || 0), 0),
      totalTransactions: filteredAndSortedRows.length
    };
  }, [filteredAndSortedRows]);

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const mainData = filteredAndSortedRows.map(row => ({
        'S.No': row.id,
        'Voucher Number': row.voucherNumber,
        'Date': row.date,
        'Client Code': row.clientCode,
        'Client Name': row.client,
        'Credit': row.credit,
        'Client Ref2': row.clientRef2,
        'Narration': row.narration
      }));

      mainData.push({
        'S.No': '',
        'Voucher Number': '',
        'Date': '',
        'Client Code': '',
        'Client Name': 'GRAND TOTAL',
        'Credit': totals.totalCredit,
        'Client Ref2': '',
        'Narration': ''
      });

      await exportProfessionalExcel({
        title: 'Voucher Report',
        fileName: 'Voucher_Report',
        sheetName: 'Voucher Report',
        rows: mainData,
        meta: [
          `Period: ${startDate} to ${endDate}`,
        ],
        excludeKeys: ['_id', 'id'],
      });
    } catch (error) {
      console.error('Excel export error:', error);
      alert("Something Went Wrong");
    }
  };

  // Export to PDF function
  const exportToPDF = () => {
    const doc = new jsPDF("landscape");

    const watermark =
      "https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png";

    // Add Header
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(20);
    doc.text("Pearl Dynamic (pvt) ltdPvt Ltd", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(16);
    doc.text("Voucher Report", pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 42);

    // Table Columns
    const tableColumn = [
      "S.No",
      "Voucher No",
      "Date",
      "Client Code",
      "Client Name",
      "Credit",
      "Client Ref2",
      "Narration"
    ];

    // Prepare rows
    const tableRows = filteredAndSortedRows.map(row => [
      row.id,
      row.voucherNumber,
      row.date,
      row.clientCode,
      row.client,
      row.credit?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0",
      row.clientRef2,
      row.narration || ""
    ]);

    // Create totals row
    const totalsRow = new Array(tableColumn.length).fill("");
    totalsRow[0] = "TOTAL";
    totalsRow[5] = totals.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    tableRows.push(totalsRow);

    // AutoTable
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        minCellHeight: 12,
      },
      bodyStyles: { valign: "middle" },
      didParseCell: function (data) {
        const lastRowIndex = tableRows.length - 1;

        if (data.row.index === lastRowIndex) {
          if (data.column.index === 0) {
            data.cell.colSpan = 5;
            data.cell.styles.halign = "center";
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [230, 230, 230];
            data.cell.text = ["TOTAL"];
          } else if (data.column.index > 0 && data.column.index < 5) {
            data.cell.text = "";
          } else {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [230, 230, 230];
          }
        }
      },
      didDrawPage: function (data) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setGState(new doc.GState({ opacity: 0.1 }));
        doc.addImage(watermark, "PNG", pageWidth / 2 - 80, pageHeight / 2 - 50, 160, 100);
        doc.setGState(new doc.GState({ opacity: 1 }));
        doc.setFontSize(8);
        doc.text(
          "Developed by JS International | Website: https://jaffersons.com/ | Contact: 0301-8251291",
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      },
    });

    // Save file
    doc.save("Voucher_Report.pdf");
  };

  // Print function
  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
      <html>
        <head>
          <title>Voucher Report</title>
          <style>
            body {
              font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
              background: #fff;
              color: #333;
              padding: 20px;
            }
            .report-header {
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
            Developed by JS International | Website: <a href="https://jaffersons.com/" target="_blank">https://jaffersons.com/</a> | Contact: 0301-8251291
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <ReportPageLayout title="Knockoff Remaining">
    <div className="voucher-report-container" ref={reportRef}>
      <div className="watermark">
        <div className="watermark-content">
          <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png" alt="" />
        </div>
      </div>

      <div className="report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dynamics</h2>
          <p className="company-address">123 Business Avenue, Suite 456</p>
          <p className="company-contact">Phone: (555) 123-4567 | Email: info@pearldynamics.com</p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Voucher Report</h1>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">
            {filteredAndSortedRows.length > 0
              ? `Period: ${startDate} to ${endDate}`
              : 'No data available'
            }
          </p>
        </div>
      </div>

      <div className="report-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search voucher data..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="summary-stats">
          <span className="stat-item">
            Total Credit: <strong>{totals.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
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
        ) : (
          <table className="voucher-data-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('id')}># {sortConfig.key === 'id' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('voucherNumber')}>Voucher No {sortConfig.key === 'voucherNumber' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('date')}>Date {sortConfig.key === 'date' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('clientCode')}>Client Code {sortConfig.key === 'clientCode' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('client')}>Client {sortConfig.key === 'client' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('credit')}>Credit {sortConfig.key === 'credit' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('clientRef2')}>Client Ref2 {sortConfig.key === 'clientRef2' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('narration')}>Narration {sortConfig.key === 'narration' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.voucherNumber}</td>
                    <td style={{ minWidth: "100px" }}>{row.date}</td>
                    <td>{row.clientCode}</td>
                    <td>{row.client}</td>
                    <td className='numeric'>{Number(row.credit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{row.clientRef2}</td>
                    <td>{row.narration}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">
                    No matching records found
                  </td>
                </tr>
              )}
              <tr className="footer-total">
                <td>Totals</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td className="numeric">{totals.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="report-actions">
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
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .voucher-report-container {
          font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin: 20px auto;
          max-width: 1400px;
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
        
        .report-header {
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
        }
        
        .voucher-data-table {
          min-width: 1000px;
          border-collapse: collapse;
          font-size: 14px;
          width: 100%;
        }
        
        .voucher-data-table th {
        background: #02234a5e;
          padding: 12px 10px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #e0e0e0;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        
        .voucher-data-table th:hover {
        }
        
        .voucher-data-table td {
          padding: 10px;
          border-bottom: 1px solid #eaeaea;
        }
        
        .voucher-data-table tbody tr:hover {
        }
        
        .numeric {
          text-align: right;
        }
        
        .no-data {
          text-align: center;
          padding: 30px;
          color: #95a5a6;
          font-style: italic;
        }
        
        .footer-total {
          font-weight: 700;
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
          .report-header {
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
          .voucher-report-container {
            box-shadow: none;
            padding: 0;
          }
          
          .report-controls, .report-actions {
            display: none;
          }
          
          .table-container {
            overflow: visible !important;
            border: none;
          }
          
          .watermark {
            opacity: 0.03;
          }
        }
      `}</style>
    </div>
  </ReportPageLayout>
  );
};

export default VoucherReportPopup;