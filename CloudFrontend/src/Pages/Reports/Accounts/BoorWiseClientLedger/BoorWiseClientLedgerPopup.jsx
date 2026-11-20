import React, { useState, useEffect } from 'react';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import { buildBookerWiseLedgerPdf } from '../../../../utils/buildClientLedgerPdf';
import { useSelector } from 'react-redux';
import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';


const BookerLedgerPopup = ({ data }) => {
  //console.log(data);

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [clientLedgers, setClientLedgers] = useState([]); // Array of client ledgers
  const [currentClientIndex, setCurrentClientIndex] = useState(0);
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [voucherFilter, setVoucherFilter] = useState("");

  // Helper functions
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === '' || isNaN(Number(amount)) || amount === 0) {
      return '';
    }
    return Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (dateString) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(",", "");
  };

  // Fetch data from API
  const getData = async () => {
    setIsLoading(true);
    try {

      const response = await getDataFundtion(
        `GernalLager/BookerLedger?startDate=${data.startDate}&endDate=${data.endDate}&OrderBooker=${data.Booker}`
      );

      // Group transactions by Client
      const groupedByClient = {};

      response.forEach((transaction) => {
        const clientId = transaction.Client;

        if (!groupedByClient[clientId]) {
          const clientObj = data.Clients.find((item) => item._id === clientId);
          const cityObj = data.City.find((city) => city._id === clientObj?.City);

          groupedByClient[clientId] = {
            clientId: clientId,
            clientName: `Client : ${clientObj?.DistrbutorName || ""}`,
            City: cityObj?.CityName || "",
            transactions: {}
          };
        }

        const voucherKey = transaction.VoucherNumber;

        if (!groupedByClient[clientId].transactions[voucherKey]) {
          groupedByClient[clientId].transactions[voucherKey] = {
            ...transaction,
            Debit: Number(transaction.Debit || 0),
            Credit: Number(transaction.Credit || 0)
          };
        } else {
          groupedByClient[clientId].transactions[voucherKey].Debit += Number(transaction.Debit || 0);
          groupedByClient[clientId].transactions[voucherKey].Credit += Number(transaction.Credit || 0);
        }
      });

      // Calculate balances for each client
      const clientLedgersArray = Object.values(groupedByClient).map(client => {

        const transactions = Object.values(client.transactions);

        // sort by date
        transactions.sort((a, b) => new Date(a.VoucherDate) - new Date(b.VoucherDate));

        const openingTransactions = transactions.filter(
          t => t.Type === "VoucherBefore" || t.Type === "OpeningBalance"
        );

        const regularTransactions = transactions.filter(
          t => t.Type === "Voucher"
        );

        let openingBalance = 0;

        openingTransactions.forEach(t => {
          openingBalance += (t.Debit || 0) - (t.Credit || 0);
        });

        let runningBalance = openingBalance;

        const transformedTransactions = regularTransactions.map(t => {
          const debit = t.Debit || 0;
          const credit = t.Credit || 0;

          runningBalance += debit - credit;

          return {
            date: formatDate(t.VoucherDate),
            voucherNo: t.VoucherNumber,
            refNo: t.Ref,
            narration: t.Narration,
            debit,
            credit,
            balance: runningBalance,
            formattedDebit: debit ? formatCurrency(debit) : "",
            formattedCredit: credit ? formatCurrency(credit) : "",
            formattedBalance: formatCurrency(runningBalance)
          };
        });

        const totalDebit = transformedTransactions.reduce((s, t) => s + t.debit, 0);
        const totalCredit = transformedTransactions.reduce((s, t) => s + t.credit, 0);

        return {
          ...client,
          transactions: transformedTransactions,
          openingBalance,
          totalDebit,
          totalCredit,
          closingBalance: runningBalance
        };
      });
      setClientLedgers(clientLedgersArray);
      if (clientLedgersArray.length > 0) {
        setFilteredTransactions(clientLedgersArray[0].transactions);
      }

    } catch (err) {
      console.error("Error fetching booker ledger data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [data]);

  // Apply filters to current client's transactions
  useEffect(() => {
    if (clientLedgers.length === 0) return;

    const currentClient = clientLedgers[currentClientIndex];
    let filtered = currentClient.transactions;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        (item.narration && item.narration.toLowerCase().includes(term)) ||
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

    setFilteredTransactions(filtered);
  }, [searchTerm, dateFilter, voucherFilter, currentClientIndex, clientLedgers]);

  const exportToPDF = async () => {
    if (clientLedgers.length === 0) {
      alert("No data to export");
      return;
    }

    setIsExporting(true);

    try {
      const prevDate = new Date(data.startDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(prevDate.getDate()).padStart(2, "0")}`;
      const doc = buildBookerWiseLedgerPdf({
        bookerName: data.AcName || "",
        periodLabel: `${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
        openingDateLabel: formatDate(prevDateStr),
        printedBy: data.PrintedBy || "",
        clients: clientLedgers.map((client) => ({
          name: client.clientName,
          city: client.City,
          openingBalance: client.openingBalance,
          transactions: client.transactions,
        })),
      });

      const bookerName = String(data.AcName || "Booker Ledger")
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/g, "");
      doc.save(`${bookerName || "Booker Ledger"}.pdf`);
    } catch (error) {
      console.error("Export to PDF failed:", error);
      alert("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const summaryData = clientLedgers.map(client => ({
        "Client Name": client.clientName,
        "Opening Balance": client.openingBalance,
        "Total Debit": client.totalDebit,
        "Total Credit": client.totalCredit,
        "Closing Balance": client.closingBalance,
        "Transaction Count": client.transactions.length
      }));

      const sheets = [
        {
          name: 'Summary',
          title: 'Booker Wise Client Summary',
          rows: summaryData,
          meta: [
            `Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
            `Order Booker: ${data.OrderBooker || "N/A"}`,
          ],
        },
        ...clientLedgers.map((client, index) => {
          const clientData = client.transactions.map(t => ({
            "Date": t.date,
            "Voucher No": t.voucherNo,
            "Ref No": t.refNo,
            "Description": t.narration,
            "Debit": t.debit,
            "Credit": t.credit,
            "Balance": t.balance
          }));

          clientData.push({
            "Date": "",
            "Voucher No": "",
            "Ref No": "",
            "Description": "TOTALS",
            "Debit": client.totalDebit,
            "Credit": client.totalCredit,
            "Balance": client.closingBalance
          });

          return {
            name: `Client_${index + 1}`,
            title: client.clientName || `Client ${index + 1}`,
            rows: clientData,
            meta: [
              `Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
              `Order Booker: ${data.OrderBooker || "N/A"}`,
              `Client: ${client.clientName || ""}`,
            ],
          };
        }),
      ];

      await exportProfessionalExcel({
        title: 'Booker Wise Client Ledger',
        fileName: `Booker_Ledger_${data.OrderBooker}`,
        excludeKeys: ['_id', 'id'],
        sheets,
      });
    } catch (error) {
      console.error("Export to Excel failed:", error);
      alert("Failed to export to Excel");
    } finally {
      setIsExporting(false);
    }
  };

  // Navigation between clients
  const goToNextClient = () => {
    if (currentClientIndex < clientLedgers.length - 1) {
      setCurrentClientIndex(prev => prev + 1);
    }
  };

  const goToPrevClient = () => {
    if (currentClientIndex > 0) {
      setCurrentClientIndex(prev => prev - 1);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setVoucherFilter("");
    if (clientLedgers[currentClientIndex]) {
      setFilteredTransactions(clientLedgers[currentClientIndex].transactions);
    }
  };

  // Get unique dates for filter dropdown
  const uniqueDates = clientLedgers.length > 0
    ? [...new Set(clientLedgers[currentClientIndex].transactions.map(item => item.date))].filter(date => date)
    : [];

  const currentClient = clientLedgers[currentClientIndex] || null;

  return (
    <div style={styles.container}>
      <ReportPopupHeader title="Booker Wise Ledger" />

      {/* Loaders */}
      {isExporting && (
        <div style={styles.exportLoader}>
          <div style={styles.exportLoaderContent}>
            <div style={styles.spinner}></div>
            <p>Exporting data...</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={styles.loader}>
          <div style={styles.spinner}></div>
          <p>Loading booker ledger data...</p>
        </div>
      )}

      {/* Client Navigation */}
      {clientLedgers.length > 0 && (
        <div style={styles.clientNavigation}>
          <button
            onClick={goToPrevClient}
            disabled={currentClientIndex === 0}
            style={styles.navButton}
          >
            ← Previous Client
          </button>

          <div style={styles.clientInfo}>
            <span style={styles.clientCounter}>
              Client {currentClientIndex + 1} of {clientLedgers.length}
            </span>
            <h3 style={styles.clientName}>
              {currentClient?.clientName} (City: {currentClient?.City})
            </h3>
            <div style={styles.clientStats}>
              <span>Opening: {formatCurrency(currentClient?.openingBalance)}</span>
              <span>Closing: {formatCurrency(currentClient?.closingBalance)}</span>
              <span>Transactions: {currentClient?.transactions.length}</span>
            </div>
          </div>

          <button
            onClick={goToNextClient}
            disabled={currentClientIndex === clientLedgers.length - 1}
            style={styles.navButton}
          >
            Next Client →
          </button>
        </div>
      )}

      {/* Filter Section */}
      <div style={styles.filterSection}>
        <div style={styles.filterGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Search:</label>
            <input
              type="text"
              placeholder="Search..."
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
              placeholder="Filter by voucher..."
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
              Showing {filteredTransactions.length} records
            </span>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div style={styles.exportButtons}>
        <button
          onClick={exportToPDF}
          style={styles.exportButton}
          disabled={isExporting || clientLedgers.length === 0}
        >
          {isExporting ? 'Exporting...' : 'Export PDF (All Clients)'}
        </button>
        <button
          onClick={exportToExcel}
          style={styles.exportButton}
          disabled={isExporting || clientLedgers.length === 0}
        >
          {isExporting ? 'Exporting...' : 'Export Excel (All Clients)'}
        </button>
      </div>

      {/* Ledger Table for Current Client */}
      {currentClient && (
        <div id="ledger-content" style={styles.ledgerContent}>
          <div style={styles.ledgerTableContainer}>
            <table style={styles.ledgerTable}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>DATE</th>
                  <th style={styles.tableHeader}>VOUCHER NO.</th>
                  <th style={styles.tableHeader}>REF NO.</th>
                  <th style={styles.tableHeader}>DESCRIPTION</th>
                  <th style={styles.tableHeader}>DEBIT</th>
                  <th style={styles.tableHeader}>CREDIT</th>
                  <th style={styles.tableHeader}>BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((row, index) => (
                  <tr key={index} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                    <td style={styles.tableCell}>{row.date}</td>
                    <td style={styles.tableCell}>{row.voucherNo}</td>
                    <td style={styles.tableCell}>{row.refNo}</td>
                    <td style={styles.tableCell}>{row.narration}</td>
                    <td style={styles.amountCell}>{row.formattedDebit}</td>
                    <td style={styles.amountCell}>{row.formattedCredit}</td>
                    <td style={styles.amountCell}>{row.formattedBalance}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" style={styles.totalLabel}>TOTALS</td>
                  <td style={styles.totalAmount}>{formatCurrency(currentClient.totalDebit)}</td>
                  <td style={styles.totalAmount}>{formatCurrency(currentClient.totalCredit)}</td>
                  <td style={styles.totalAmount}>{formatCurrency(currentClient.closingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// CSS-in-JS styles
const styles = {
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

  clientNavigation: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px',
    background: 'linear-gradient(135deg, #2c3e50, #4a6491)',
    color: 'white',
  },

  navButton: {
    padding: '10px 20px',
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background 0.3s',
    '&:hover:not(:disabled)': {
      background: 'rgba(255, 255, 255, 0.3)',
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },

  clientInfo: {
    textAlign: 'center',
    flex: 1,
    padding: '0 20px',
  },

  clientCounter: {
    fontSize: '14px',
    opacity: 0.9,
  },

  clientName: {
    margin: '5px 0',
    fontSize: '20px',
  },

  clientStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    fontSize: '14px',
    marginTop: '5px',
  },

  filterSection: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderBottom: '1px solid #dee2e6',
  },

  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
    alignItems: 'end',
  },

  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
  },

  filterLabel: {
    fontWeight: '600',
    fontSize: '12px',
    marginBottom: '5px',
    color: '#495057',
  },

  filterInput: {
    padding: '8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
  },

  filterSelect: {
    padding: '8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    background: 'white',
  },

  clearButton: {
    padding: '8px 16px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    '&:hover': {
      background: '#5a6268',
    },
  },

  resultCount: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '5px',
  },

  exportButtons: {
    display: 'flex',
    gap: '10px',
    padding: '15px',
    background: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
  },

  exportButton: {
    padding: '10px 20px',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    '&:hover:not(:disabled)': {
      background: '#0056b3',
    },
    '&:disabled': {
      background: '#ccc',
      cursor: 'not-allowed',
    },
  },

  ledgerContent: {
    padding: '20px',
  },

  ledgerTableContainer: {
    overflowX: 'auto',
  },

  ledgerTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  tableHeader: {
    backgroundColor: '#34495e',
    color: 'white',
    padding: '12px',
    textAlign: 'left',
    fontWeight: '500',
    position: 'sticky',
    top: '0',
  },

  evenRow: {
    backgroundColor: '#f8f9fa',
  },

  oddRow: {
    backgroundColor: 'white',
  },

  tableCell: {
    padding: '10px',
    borderBottom: '1px solid #e0e0e0',
  },

  amountCell: {
    padding: '10px',
    borderBottom: '1px solid #e0e0e0',
    textAlign: 'right',
    fontFamily: "'Courier New', Courier, monospace",
  },

  totalLabel: {
    padding: '12px',
    fontWeight: 'bold',
    textAlign: 'right',
    backgroundColor: '#e9ecef',
  },

  totalAmount: {
    padding: '12px',
    fontWeight: 'bold',
    textAlign: 'right',
    backgroundColor: '#e9ecef',
    fontFamily: "'Courier New', Courier, monospace",
  },

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
};

export default BookerLedgerPopup;