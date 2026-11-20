import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import * as XLSX from 'xlsx';
import { createDataFunction } from '../../Api/CRUDFunctions';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

const PreviouseInvoiceRealization = () => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [filter, setFilter] = useState("");
  const [disable, setdisable] = useState(false);
  const [fullDetail, setFullDetail] = useState("All");
  const editOpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = React.useRef();
  const Client = useSelector((state) => state.Client.client)
  const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
  const SalesInvoice = useSelector((state) => state.SalesInvoice.SalesInvoice)

  const formatDate = (serial) => {
    const excelEpoch = new Date(1900, 0, 1);
    const days = serial - 2; // Excel's leap year bug adjustment
    const date = new Date(excelEpoch.getTime() + days * 86400000);

    // Format YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  };

  // ✅ File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileData = new Uint8Array(e.target.result);
      const workbook = XLSX.read(fileData, { type: 'array' });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];

      setData(jsonData);
      setHeaders(firstRow);
    };

    reader.readAsArrayBuffer(file);
  };

  // ✅ Sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedRows = React.useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // ✅ Filter
  const filteredAndSortedRows = sortedRows.filter((row) =>
    Object.values(row).some((val) =>
      val?.toString().toLowerCase().includes(filter.toLowerCase())
    )
  );

  // ✅ Totals (numeric only)
  const totals = headers.reduce((acc, h) => {
    const nums = filteredAndSortedRows.map(r => Number(r[h]) || 0);
    acc[h] = nums.reduce((a, b) => a + b, 0);
    return acc;
  }, {});

  const changeHandler = (row, field, value) => {
    const updatedData = data.map(r => {
      if (r.id === row.id) {   // ✅ safer comparison
        if (field === "shortage") {
          value = Number(value)
          r.CashAmount = r.CashAmount - value
        }
        if (field === "ChqAmount") {
          value = Number(value); // Ensure ChqAmount is stored as a number
        }
        if (field === "Credit") {
          r.Cash = Number(r.ChqAmount || 0) - Number(value); // Ensure Credit is stored as a number
        }
        return { ...r, [field]: value };
      }
      return r;
    });

    setData(updatedData);
  };

  const nevigate = useNavigate()

  const submitData = async () => {
    setdisable(true);

    const customRound = (value) => {
      const num = parseFloat(value) || 0;
      const floor = Math.floor(num);
      const decimal = num - floor;
      return decimal > 0.5 ? floor + 1 : floor;
    };

    try {
      const onlyCheque = data.filter(row => Number(row.ChqAmount) > 0);
      const onlyCredit = data.filter(row => row.PmntMode === "Credit");
      const onlyShortage = data.filter(row => row.shortage > 0);

      const onlyCash = fullDetail === "All"
        ? data.filter(row => Number(row.CashAmount) > 0)
        : data.filter(row =>
          Number(row.TotalAmount) -
          ((Number(row.ChqAmount) || 0) + (Number(row.Credit) || 0)) > 0
        );

      const cashData = onlyCash.map(row => {
        const openingItem = editOpeningInvoices?.[0]?.InvoiceData?.find(
          item => item.Invoice === row.SalesFlowRef
        );
        const invoiceNumber = openingItem?.Invoice || row.SalesFlowRef;
        const client = openingItem?.Client || row.ClientSalesFlow;
        const type = openingItem?.Invoice ? "Opening" : "Current";
        const store = openingItem?.Invoice ? openingItem?.Store : row.SalesFlowRef;

        return {
          Client: row.ClientSalesFlow,
          Credit:
            customRound(
              Number(row.TotalAmount) -
              ((Number(row.ChqAmount) || 0) + (Number(row.Credit) || 0)) -
              row.shortage
            ) ||
            customRound(row.CashAmount) + (row.shortage || 0),
          Account: Admin.Client,
          ClientRef2: invoiceNumber,
          ref: invoiceNumber,
          store,
          Type: type,
          Narration: `Cash Rcvd against invoice ${invoiceNumber} received from ${Client.find(c => c.SalesFlowRef === row.ClientSalesFlow)?.CutomerName
            }`,
            
          id: Date.now() + Math.random().toString(36).substring(2, 15),
        };

      });

      // Add shortage entries
      for (let i = 0; i < onlyShortage.length; i++) {
        const row = onlyShortage[i];
        const openingItem = editOpeningInvoices?.[0]?.InvoiceData?.find(
          item => item.Invoice === row.SalesFlowRef
        );
        const invoiceItem = SalesInvoice.find(item => item.SalesFlowRef === row.SalesFlowRef);
        const invoiceNumber = invoiceItem?.SalesInvoice || openingItem?.Invoice;
        const client = invoiceItem?.Client || openingItem?.Client;
      }

      // Add balancing entry


      // Function to split into chunks of 300



      const CashVoucher = {
        VoucherDate: new Date().toISOString().split("T")[0],
        VoucherType: "CR",
        VoucherMainAccount: Admin.pettyCashAccount,
        Admin: Admin,
        status: "Post",
        PaidFor: "Client",
        TotalDebit: cashData.reduce((a, b) => a + (b.Debit || 0), 0),
        TotalCredit: cashData.reduce((a, b) => a + (b.Credit || 0), 0),
        VoucharData: cashData,
      };

//console.log(CashVoucher)
      // Uncomment to post to backend
      await createDataFunction("/Voucher/createPreviouseVoucher", CashVoucher);


      setdisable(false);
      nevigate('/SalesInvoice');
    } catch (error) {
      //console.log(error)
      if (toast.error(error.response?.data?.errors[0])) {
        toast.error(error.response.data.errors[0])
        console.error("Error submitting data:", error.response.data.errors[0]);
      }
      else {
        toast.error("Something went wrong")
        
      }

      
    }
  };


  return (
    <div className="sales-report-container" ref={reportRef}>
      {/* Watermark */}
      <ToastContainer />
      <div className="watermark">
        <div className="watermark-content">
          <img
            src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png"
            alt=""
          />
        </div>
      </div>

      {/* Header */}
      <div className="sales-report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dyanmic</h2>
          <p className="company-RemainingAmount">123 Business Avenue, Suite 456</p>
          <p className="company-contact">Phone: (555) 123-4567 | Email: info@pmmgmt.com</p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Uploaded Excel Report</h1>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">
            {filteredAndSortedRows.length > 0
              ? `Rows: ${filteredAndSortedRows.length}`
              : 'No data available'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="report-controls">
        <div>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
        </div>
        <div className="search-box">
          <input
            type="radio"
            value="All"
            defaultChecked={true}
            onChange={(e) => setFullDetail(e.target.value)}
            name="dataType"
          />

          &nbsp; full Data &nbsp;
          <input
            type="radio"
            value="enterCheque "
            onChange={(e) => setFullDetail(e.target.value)}
            name="dataType"
          />
          &nbsp; Enter Cheque Detail &nbsp;
        </div>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search uploaded data..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="summary-stats">
          <span className="stat-item">
            Total Rows: <strong>{filteredAndSortedRows.length}</strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="sales-data-table">
          <thead>
            <tr>
              {headers.map((h) => (
                <>
                  <th key={h} onClick={() => requestSort(h)}>
                    {h} {sortConfig.key === h ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                  </th>
                </>
              ))}
              <th>
                Shortage
              </th>
              {fullDetail !== "All" ?
                <>

                  <th>
                    Cash
                  </th>
                </> : null}

            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length > 0 ? (
              filteredAndSortedRows.map((row, i) => (
                <tr key={i}>
                  {headers.map((h) => (
                    <>
                      <td key={h} className={typeof row[h] === "number" ? "numeric" : ""}>
                        {row[h]}
                      </td>
                    </>
                  ))}
                  <td>
                    <input className="Options" type="text" width={"20px"}
                      onChange={(e) => changeHandler(row, "shortage", e.target.value)} />
                  </td>

                  {fullDetail !== "All" ?
                    <>

                      <td>
                        <span>
                          {row.TotalAmount - ((Number(row.ChqAmount) || 0) + (Number(row.Credit) || 0))}
                        </span>
                      </td>
                    </>
                    : null}
                </tr>

              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="no-data">
                  No matching records found
                </td>
              </tr>
            )}
            {filteredAndSortedRows.length > 0 && (
              <tr>
                {headers.map((h, i) => (

                  <td key={i} className="footer-total numeric">
                    {totals[h] ? totals[h].toLocaleString() : ""}
                  </td>

                ))}

              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Actions */}
      <div className="report-actions">
        <button disabled={disable} className="btn btn-word" onClick={() => submitData()}>
          Submit
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
          .Options{
            padding: 2px 3px;
            border: 1px solid black;
            border-radius: 4px;
            font-size: 14px;
          }
        .sales-report-container {
          font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          padding-left: 40px;
          margin: 20px auto;
          color: #333;
          position: relative;
          overflow-y: auto;    /* ✅ only vertical scroll */
          max-height: 80vh;
          max-width: 80vw;
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
          overflow-x: scroll;
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
   
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
  of
  -webkit-overflow-scrolling: touch; 
}
        
       .sales-data-table {
  min-width: 1200px;   /* ✅ forces scroll if table is wider */
  border-collapse: collapse;
   overflow-x: scroll;    /* ✅ horizontal scroll only for table */

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

export default PreviouseInvoiceRealization;
