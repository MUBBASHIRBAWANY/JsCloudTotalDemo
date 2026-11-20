
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { saveAs } from "file-saver";
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';


const PaymentRealizeReportPopup = ({ data }) => {

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // New state for export loading
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [margeVoucher, setMargeVoucher] = useState([])
  const [ledgerData, setLedgerData] = useState([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);



  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [voucherFilter, setVoucherFilter] = useState("");
  const [filteredData, setFilteredData] = useState([]);


  const getExportRows = () => {
    const source = filteredData.length ? filteredData : ledgerData;

    return source.map(row => ({
      ReceiptDate: row.date || "",
      ReceiptNo: row.voucherNo || "",
      "Bank Account": row.Account,
      Client: row.Client || "",
      Ref: row.refDate || "",
      Status: row.Status,
      Description: row.Narration || row.description || "",
      Amount: row.rawCredit || row.rawDebit || 0,
      OrderBooker: row.OrderBooker || "",
      City: row.City || ""
    }));
  };


  // Filter function
  const applyFilters = () => {
    let filtered = ledgerData;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        (item.description && item.description.toLowerCase().includes(term)) ||
        (item.voucherNo && item.voucherNo.toLowerCase().includes(term)) ||
        (item.refNo && item.refNo.toLowerCase().includes(term))
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(item => item.date === dateFilter);
    }

    if (voucherFilter) {
      filtered = filtered.filter(item =>
        item.voucherNo && item.voucherNo.toLowerCase().includes(voucherFilter.toLowerCase())
      );
    }

    setFilteredData(filtered);
  };

  // Apply filters when any filter changes
  useEffect(() => {
    if (ledgerData.length > 0) {
      applyFilters();
    }
  }, [searchTerm, dateFilter, voucherFilter, ledgerData]);

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === '' || isNaN(Number(amount)) || amount === 0) {
      return ''
    }

    return Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const rows = getExportRows();

      await exportProfessionalExcel({
        title: 'Payment Realize Report',
        fileName: 'Ledger_Report',
        sheetName: 'Ledger',
        rows,
        meta: [
          `Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
          data.Account ? `Account: ${data.Account}` : '',
          data.Store ? `Store: ${data.Store}` : '',
        ].filter(Boolean),
        excludeKeys: ['_id', 'id'],
      });
    } catch (err) {
      console.error(err);
      alert("Excel export failed");
    } finally {
      setIsExporting(false);
    }
  };


  const openVoucherModal = (voucher) => {
    const voucherType = voucher.slice(0, 2)
    if (voucherType == "SL") {
      const SplitVoucher = voucher.slice(2)
      window.open(`/SalesInvoiceViewById/${SplitVoucher}`, "_blank");
    }
    if (voucherType == "Pr") {
      const SplitVoucher = voucher.slice(2)
      window.open(`/PurchaseInvoiceViewByNumber/${SplitVoucher}`, "_blank");
    }
    else {
      window.open(`/AllVoucherView/${voucher}`, "_blank");
    }
  };

  const closeVoucherModal = () => {
    setIsModalOpen(false);
    setSelectedVoucher(null);
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");

      doc.setFontSize(14);
      doc.text("Receipt Report", 14, 15);
      doc.text(`${data.AcName} ${data.AcCode}`, 14, 28);

      doc.setFontSize(9);
      doc.text(
        `From ${formatDate(data.startDate)} To ${formatDate(data.endDate)}`,
        14,
        21
      );

      autoTable(doc, {
        startY: 30,
        head: [[
          "Receipt Date",
          "Receipt No",
          "Client",
          "Description",
          "Amount",
          "Status",
          "City",
          "Order Booker"

        ]],
        body: getExportRows().map(r => [
          r.ReceiptDate,
          r.ReceiptNo,
          r.Client,
          r.Description,
          r.Amount.toLocaleString("en-US", { minimumFractionDigits: 2 }),
          r.Status,


        ]),
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          3: { cellWidth: 60 },
          4: { halign: "right" },
          5: { halign: "right" },
        },
        headStyles: {
          fillColor: [52, 73, 94],
          textColor: 255,
        },
      });

      doc.save("Receipt.pdf");
    } catch (err) {
      console.error(err);
      alert("PDF export failed");
    } finally {
      setIsExporting(false);
    }
  };


  const exportToHTML = async () => {
    setIsExporting(true);
    try {
      const content = document.getElementById("ledger-content").innerHTML;
      const blob = new Blob([content], { type: "text/html" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Ledger_Report.html";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export to HTML failed:", error);
      alert("Failed to export to HTML. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToWord = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById("ledger-content");
      if (!element) return alert("Ledger content not found");

      const html = `
      <html>
        <head><meta charset="utf-8"></head>
        <body>${element.outerHTML}</body>
      </html>
    `;

      const blob = htmlDocx.asBlob(html);
      saveAs(blob, "Ledger_Report.docx");
    } catch (err) {
      console.error(err);
      alert("Word export failed");
    } finally {
      setIsExporting(false);
    }
  };


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(",", "");
  };

  const getData = async () => {
    setIsLoading(true);
    try {
      const Distributor = await getDataFundtion("/Distrbutor/DistrbutorNameId")

      let Accountdata = await getDataFundtion(
        `PaymentRecived/PaymentReciptReport?startDate=${data.startDate}&endDate=${data.endDate}&Account=${data.Account}&Store=${data.Store}`
      );

      if(data.store.length > 0){
        Accountdata = Accountdata.filter(item => data.store.includes(item.Store))
      }

      const sortedByDate = Accountdata.sort((a, b) => {
        const dateA = new Date(a.VoucherDate || 0);
        const dateB = new Date(b.VoucherDate || 0);
        return dateA - dateB;
      });

      const openingEntries = Accountdata.filter(item => item.Type === "VoucherBefore");
      const mainEntries = sortedByDate.filter(item => item.Type === "Voucher");
      const modalEntry = Accountdata.filter(item => item.Type === "VoucherCheck");
      setMargeVoucher(modalEntry);

      let openingDebit = 0;
      let openingCredit = 0;

      openingEntries.forEach(item => {
        openingDebit += item.Debit ? parseFloat(item.Debit) : 0;
        openingCredit += item.Credit ? parseFloat(item.Credit) : 0;
      });

      const openingBalance = openingDebit - openingCredit;
      let runningBalance = openingBalance;

      const formatAmount = (amount) =>
        amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const prevDate = new Date(data.startDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const formattedPrevDate = formatDate(prevDate.toISOString());

      const transformedData = [];

      // Opening balance row


      let debitTotal = openingDebit;
      let creditTotal = openingCredit;

      // Main entries
      mainEntries.forEach(item => {
        const debit = item.Debit ? parseFloat(item.Debit) : 0;
        const credit = item.Credit ? parseFloat(item.Credit) : 0;

        debitTotal += debit;
        creditTotal += credit;

        runningBalance += debit - credit;
        const Dis = Distributor?.find((Dis) => Dis._id == item.Client)

        const OrderBookers = data.orderBooker.find((ob)=> ob._id == Dis?.OrderBooker) || ""
        const CityObj = data.city.find(
          c => c._id === Dis?.City
        );
        //console.log(data.orderBooker, Dis?.OrderBooker, "OrderBookers" , OrderBookers)
        //console.log("Popup data orderBooker:", data.orderBooker)
        // //console.log("Popup data city:", data.city)
        // //console.log(data, 'all data');

        // //console.log("item", item)

        transformedData.push({
          date: formatDate(item.VoucherDate),
          voucherNo: item.VoucherNumber,
          Client: Dis?.DistrbutorName,
          OrderBooker: OrderBookers?.OrderBookerName || '',
          City: CityObj?.CityName || '',
          refDate: item.Ref,
          debit: debit > 0 ? formatAmount(debit) : '',
          credit: credit > 0 ? formatAmount(credit) : '',
          Status: item.status == "true" ? "Voucher" : item.status == "Reject" ? "Reject" : "Pending",
          Accountdata: item.VoucharData,
          rawDebit: debit,
          rawCredit: credit,
          Store : data.AllStore.find((s) => s.value == item.Store)?.label || '',
          Account: data.chartofAccount.find((ac) => ac._id == item.ReciptMainAccount).AccountName,
          Narration: item.Narration,

        });
      });
      //console.log(transformedData)
      let AllData
      if (data.VoucherType !== "All") {

        AllData = transformedData.filter((item) => item.Status == data.VoucherType)
      }
      else {
        AllData = transformedData
      }
      setLedgerData(AllData);
      setFilteredData(AllData); // Initialize filtered data
      setTotalDebit(debitTotal);
      setTotalCredit(creditTotal);
    } catch (err) {
      console.error("Error fetching ledger data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [data]);

  const formatTotal = (amount) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const now = new Date();
  const currentTime = now.toLocaleTimeString();

  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setVoucherFilter("");
    setFilteredData(ledgerData);
  };

  // Get unique dates for filter dropdown
  const uniqueDates = [...new Set(ledgerData.map(item => item.date))].filter(date => date);

  return (
    <div style={styles.container}>
      <ReportPopupHeader title="Payment Realize Report" />

      {/* Loader for exports */}
      {isExporting && (
        <div style={styles.exportLoader}>
          <div style={styles.exportLoaderContent}>
            <div style={styles.spinner}></div>
            <p>Exporting data...</p>
          </div>
        </div>
      )}

      {/* Main loader */}
      {isLoading && (
        <div style={styles.loader}>
          <div style={styles.spinner}></div>
          <p>Loading ledger data...</p>
        </div>
      )}

      {/* Filter Section */}
      <div style={styles.filterSection}>
        <h3 style={styles.filterTitle}>Filters</h3>
        <div style={styles.filterGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Search:</label>
            <input
              type="text"
              placeholder="Search in description/voucher/ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Date:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Dates</option>
              {uniqueDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Voucher:</label>
            <input
              type="text"
              placeholder="Filter by voucher number..."
              value={voucherFilter}
              onChange={(e) => setVoucherFilter(e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <button onClick={clearFilters} style={styles.clearButton}>
              Clear Filters
            </button>
            <span style={styles.resultCount}>
              Showing {filteredData.length} of {ledgerData.length} records
            </span>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div style={styles.exportButtons}>
        <button
          onClick={exportToExcel}
          style={styles.exportButton}
          disabled={isExporting || ledgerData.length === 0}
        >
          {isExporting ? 'Exporting...' : 'Export Excel'}
        </button>
        <button
          onClick={exportToPDF}
          style={styles.exportButton}
          disabled={isExporting || ledgerData.length === 0}
        >
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
        <button
          onClick={exportToWord}
          style={styles.exportButton}
          disabled={isExporting || ledgerData.length === 0}
        >
          {isExporting ? 'Exporting...' : 'Export Word'}
        </button>
        <button
          onClick={exportToHTML}
          style={styles.exportButton}
          disabled={isExporting || ledgerData.length === 0}
        >
          {isExporting ? 'Exporting...' : 'Export HTML'}
        </button>
      </div>

      {/* Ledger Content */}
      <div id="ledger-content" style={styles.ledgerContent}>
        <div style={styles.ledgerHeader}>
          <div style={styles.headerTop}>
            <div style={styles.headerLeft}>
              <span style={styles.dateTime}>Date & Time:  {formatDate(Date.now())} {currentTime} </span>
              <h2 style={styles.companyName}>PDL</h2>
            </div>
            <div style={styles.headerRight}>
              <div style={styles.logoPlaceholder}>
                <img style={styles.logo} src="https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png" alt="logo" />
              </div>
            </div>
          </div>

          <h3 style={styles.ledgerTitle}>LEDGER - FROM {formatDate(data.startDate)} TO {formatDate(data.endDate)}</h3>

          <div style={styles.accountInfo}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>A/C. CODE:</span>
              <span style={styles.infoValue}>{data.AcCode}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>A/C. NAME:</span>
              <span style={styles.infoValue}>{data.AcName}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>ADDRESS:</span>
              <span style={styles.infoValue}>Company</span>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div style={styles.ledgerTableContainer}>
          <table style={styles.ledgerTable}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Recipt DATE</th>
                <th style={styles.tableHeader}>Recipt NO.</th>
                <th style={styles.tableHeader}>Bank Account</th>
                <th style={styles.tableHeader}>Client</th>
                <th style={styles.tableHeader}>ClinetInv</th>
                <th style={styles.tableHeader}>DESCRIPTION</th>
                <th style={styles.tableHeader}>Amount</th>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Order Booker</th>
                <th style={styles.tableHeader}>City</th>
                <th style={styles.tableHeader}>Store</th>

              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, index) => (
                <tr
                  key={index}
                  style={{
                    ...styles.tableRow,
                    backgroundColor: index % 2 === 0 ? '#f9fafc' : '#ffffff'
                  }}
                >
                  <td style={styles.tableCell}>{row.date}</td>
                  <td>
                    {row.voucherNo}
                  </td>
                  <td style={styles.tableCell}>{row.Account}</td>
                  <td style={styles.tableCell}>{row.Client}</td>
                  <td style={styles.tableCell}>{row.refDate}</td>
                  <td style={{ ...styles.tableCell, ...styles.descriptionCell }}>{row.Narration}</td>
                  <td style={{ ...styles.tableCell, ...styles.amount }}>{row.credit}</td>
                  <td style={styles.tableCell}>{row.Status}</td>
                  <td style={styles.tableCell}>{row.OrderBooker}</td>
                  <td style={styles.tableCell}>{row.City}</td>
                  <td style={styles.tableCell}>{row.Store}</td>

                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan="5"
                  style={{
                    ...styles.tableCell,
                    ...styles.totalLabel,
                    textAlign: 'right',
                    fontWeight: 'bold'
                  }}
                >
                  TOTALS
                </td>

                <td style={{ ...styles.tableCell, ...styles.totalAmount }}>{formatTotal(totalCredit)}</td>

              </tr>
            </tfoot>
          </table>
        </div>

        {/* Ledger Footer */}
        <div style={styles.ledgerFooter}>
          <div style={styles.footerItem}>
            <span>Prepared By:</span>
            <div style={styles.signature}>{data.PrintedBy}</div>
          </div>
          <div style={styles.footerItem}>
            <span>Reviewed By:</span>
            <div style={styles.signature}></div>
          </div>
          <div style={styles.footerItem}>
            <span>Date:</span>
            <div>{formatDate(Date.now())}</div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeVoucherModal}>
          <div style={styles.modalContainer} onClick={e => e.stopPropagation()}>
            {/* ... modal content remains the same ... */}
          </div>
        </div>
      )}
    </div>
  );
};

// CSS-in-JS styles
const styles = {
  // Loader styles
  loader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    flexDirection: 'column',
    color: 'white',
  },
  exportLoader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
  },
  exportLoaderContent: {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    textAlign: 'center',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 15px',
  },
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },

  // Filter section
  filterSection: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    margin: '20px',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  },
  filterTitle: {
    marginTop: 0,
    marginBottom: '15px',
    color: '#2c3e50',
    fontSize: '18px',
    fontWeight: '600',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    alignItems: 'end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  filterLabel: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#495057',
  },
  filterInput: {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  clearButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#5a6268',
    },
  },
  resultCount: {
    fontSize: '14px',
    color: '#6c757d',
    marginTop: '5px',
  },

  // Export buttons
  exportButtons: {
    display: 'flex',
    gap: '10px',
    padding: '10px 20px',
    flexWrap: 'wrap',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
  },
  exportButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    minWidth: '120px',
    '&:hover:not(:disabled)': {
      backgroundColor: '#0056b3',
    },
    '&:disabled': {
      backgroundColor: '#ccc',
      cursor: 'not-allowed',
    },
  },

  // Existing styles remain the same...
  logo: {
    height: "2vw",
    background: "white",
    padding: "1px"
  },
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: '1200px',
    margin: '20px auto',
    boxShadow: '0 5px 25px rgba(0, 0, 0, 0.15)',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#fff',
    position: 'relative',
  },
  ledgerContent: {
    opacity: (props) => props.isLoading ? 0.5 : 1,
    pointerEvents: (props) => props.isLoading ? 'none' : 'auto',
  },
  // ... rest of your existing styles remain exactly the same
  ledgerHeader: {
    background: 'linear-gradient(135deg, #2c3e50, #4a6491)',
    color: 'white',
    padding: '25px 30px',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: '80px',
    height: '80px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  dateTime: {
    fontSize: '14px',
    opacity: '0.9',
    display: 'block',
    marginBottom: '5px',
  },
  companyName: {
    margin: '0',
    fontSize: '28px',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  ledgerTitle: {
    margin: '0 0 25px 0',
    fontSize: '20px',
    fontWeight: '500',
    textAlign: 'center',
    background: 'rgba(255, 255, 255, 0.15)',
    padding: '10px',
    borderRadius: '6px',
  },
  accountInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '25px',
    paddingTop: '15px',
    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  infoLabel: {
    fontWeight: '600',
    fontSize: '15px',
    opacity: '0.9',
  },
  infoValue: {
    fontWeight: '500',
    fontSize: '16px',
  },
  ledgerTableContainer: {
    overflowX: 'auto',
    maxHeight: '500px',
    position: 'relative',
  },
  ledgerTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1000px',
  },
  tableHeader: {
    backgroundColor: '#34495e',
    color: 'white',
    padding: '15px 18px',
    textAlign: 'left',
    fontWeight: '500',
    position: 'sticky',
    top: '0',
    zIndex: '10',
    fontSize: '15px',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
  },
  tableRow: {
    borderBottom: '1px solid #e0e0e0',
    '&:hover': {
      backgroundColor: '#f1f5f9',
    },
  },
  tableCell: {
    padding: '12px 18px',
    fontSize: '14px',
  },
  amount: {
    textAlign: 'right',
    fontFamily: "'Courier New', Courier, monospace",
    fontWeight: '500',
    color: '#2d3748',
  },
  balance: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  voucherCell: {
    fontWeight: '500',
    color: '#2c5282',
  },
  descriptionCell: {
    maxWidth: '250px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  totalLabel: {
    fontWeight: '600',
    color: '#2c3e50',
    paddingRight: '20px',
  },
  totalAmount: {
    fontFamily: "'Courier New', Courier, monospace",
    fontWeight: '700',
    color: '#2c3e50',
    fontSize: '15px',
  },
  ledgerFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '25px 30px',
    background: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  },
  footerItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '150px',
  },
  signature: {
    height: '40px',
    width: '120px',
    borderBottom: '1px solid #cbd5e0',
    marginTop: '5px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    background: '#fff',
    padding: '30px',
    borderRadius: '10px',
    width: '600px',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '15px',
    border: 'none',
    background: 'transparent',
    fontSize: '20px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  // ... rest of the modal styles
};

export default PaymentRealizeReportPopup