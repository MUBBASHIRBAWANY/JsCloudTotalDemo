import React, { useState, useEffect } from 'react';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';


const VendorWiseClientLedgerPopup = ({ data }) => {
  //console.log(data);

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [clientLedgers, setClientLedgers] = useState([]); // Array of client ledgers

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

  const toNumber = (val) => {
    if (val === null || val === undefined) return 0;
    const num = Number(String(val).replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  };

  // Fetch data from API — backend resolves vendor → customers → vouchers
  const getData = async () => {
    setIsLoading(true);
    try {
      const response = await getDataFundtion(
        `GernalLager/VendorWiseClientLedger?startDate=${data.startDate}&endDate=${data.endDate}&Vendor=${data.Vendor}`
      );

      const customers = Array.isArray(response?.customers) ? response.customers : [];
      const vouchers = Array.isArray(response?.vouchers) ? response.vouchers : [];

      const groupedByClient = {};

      customers.forEach((customer) => {
        groupedByClient[customer._id] = {
          clientId: customer._id,
          clientName: customer.CutomerName || "",
          clientCode: customer.SalesFlowRef || customer.code || "",
          transactions: {}
        };
      });

      vouchers.forEach((transaction) => {
        const clientId = transaction.Client;
        if (!groupedByClient[clientId]) {
          groupedByClient[clientId] = {
            clientId,
            clientName: "",
            clientCode: "",
            transactions: {}
          };
        }

        const voucherKey = `${transaction.VoucherNumber || ""}|${transaction.VoucherDate || ""}|${transaction.Ref || ""}`;

        if (!groupedByClient[clientId].transactions[voucherKey]) {
          groupedByClient[clientId].transactions[voucherKey] = {
            ...transaction,
            Debit: toNumber(transaction.Debit),
            Credit: toNumber(transaction.Credit)
          };
        } else {
          groupedByClient[clientId].transactions[voucherKey].Debit += toNumber(transaction.Debit);
          groupedByClient[clientId].transactions[voucherKey].Credit += toNumber(transaction.Credit);
        }
      });

      const clientLedgersArray = Object.values(groupedByClient).map((client) => {
        const transactions = Object.values(client.transactions);

        transactions.sort((a, b) => new Date(a.VoucherDate || 0) - new Date(b.VoucherDate || 0));

        const openingTransactions = transactions.filter(
          (t) => t.Type === "VoucherBefore" || t.Type === "OpeningBalance"
        );
        const regularTransactions = transactions.filter(
          (t) => t.Type === "Voucher"
        );

        let openingBalance = 0;
        openingTransactions.forEach((t) => {
          openingBalance += toNumber(t.Debit) - toNumber(t.Credit);
        });

        let runningBalance = openingBalance;

        const transformedTransactions = regularTransactions.map((t) => {
          const debit = toNumber(t.Debit);
          const credit = toNumber(t.Credit);

          runningBalance += debit - credit;

          return {
            date: formatDate(t.VoucherDate),
            voucherNo: t.VoucherNumber,
            refNo: t.SalesFlowRef || t.Ref,
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
      }).filter((client) =>
        client.transactions.length > 0 || Math.abs(Number(client.openingBalance) || 0) > 0
      );

      setClientLedgers(clientLedgersArray);

    } catch (err) {
      console.error("Error fetching vendor wise client ledger data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [data]);

  const visibleLedgers = clientLedgers.map((client) => {
    const term = searchTerm.toLowerCase();
    const nameHit = searchTerm && (
      (client.clientName || "").toLowerCase().includes(term) ||
      String(client.clientCode || "").toLowerCase().includes(term)
    );

    let rows = client.transactions;
    if (searchTerm && !nameHit) {
      rows = rows.filter((item) =>
        (item.narration && item.narration.toLowerCase().includes(term)) ||
        (item.voucherNo && item.voucherNo.toLowerCase().includes(term)) ||
        (item.refNo && item.refNo.toLowerCase().includes(term))
      );
    }
    if (dateFilter) {
      rows = rows.filter((item) => item.date === dateFilter);
    }
    if (voucherFilter) {
      rows = rows.filter((item) =>
        item.voucherNo && item.voucherNo.toLowerCase().includes(voucherFilter.toLowerCase())
      );
    }

    return { ...client, filteredTransactions: rows };
  }).filter((client) => {
    if (!searchTerm && !dateFilter && !voucherFilter) return true;
    return client.filteredTransactions.length > 0;
  });

  // Export to PDF with pagination by client
  const exportToPDF = async () => {
    if (clientLedgers.length === 0) {
      alert("No data to export");
      return;
    }

    setIsExporting(true);

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 8;

      // Helper function for bordered text
      const addBorderedText = (text, x, y, width, height = 5, align = "left", bold = false) => {
        doc.setDrawColor(0);
        doc.setFillColor(255);
        doc.rect(x, y, width, height, "FD");
        doc.setFont(undefined, bold ? "bold" : "normal");
        doc.setFontSize(9);

        const textX = align === "center" ? x + width / 2 :
          align === "right" ? x + width - 2 : x + 2;

        doc.text(text, textX, y + 3.5, { align });
      };

      // Export each client's ledger on a separate page
      clientLedgers.forEach((client, clientIndex) => {
        // Add new page for each client (except first)
        if (clientIndex > 0) {
          doc.addPage();
        }

        const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

        /* ================= HEADER ================= */
        doc.setFillColor(0, 51, 102);
        doc.rect(0, 0, pageWidth, 15, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont(undefined, "bold");
        doc.text("PDL", pageWidth / 2, 10, { align: "center" });

        doc.setFontSize(8);
        doc.setFont(undefined, "normal");
        doc.text("Vendor Wise Client Ledger Report", pageWidth / 2, 14, { align: "center" });

        /* ================= DETAILS ================= */
        doc.setTextColor(0);
        doc.setFontSize(9);

        const detailsLeft = [
          { label: "Vendor:", value: `${data.VendorName || ""} ${data.VendorCode || ""}` },
          { label: "Client:", value: client.clientName },
          { label: "Code:", value: client.clientCode || "N/A" },
          {
            label: "Period:",
            value: `${formatDate(data.startDate)} to ${formatDate(data.endDate)}`
          },
          { label: "Currency:", value: "PKR" }
        ];

        const detailsRight = [
          { label: "Report Date:", value: new Date().toLocaleDateString() },
          { label: "Time:", value: new Date().toLocaleTimeString() },
          { label: "Page:", value: `${clientIndex + 1} of ${clientLedgers.length}` }
        ];

        detailsLeft.forEach((d, i) => {
          addBorderedText(`${d.label} ${d.value}`, margin, 18 + i * 6, 90);
        });

        detailsRight.forEach((d, i) => {
          addBorderedText(`${d.label} ${d.value}`, pageWidth - margin - 90, 18 + i * 6, 90);
        });

        /* ================= OPENING BALANCE ================= */
        const openingText = `Opening Balance: ${formatCurrency(client.openingBalance)}`;
        addBorderedText(openingText, margin, 48, pageWidth - 2 * margin, 6, "left", true);

        /* ================= TABLE DATA ================= */
        const tableData = client.transactions.map(row => [
          row.date || "",
          row.voucherNo || "",
          row.refNo || "",
          row.narration || "",
          formatCurrency(row.debit),
          formatCurrency(row.credit),
          formatCurrency(row.balance)
        ]);

        // Add totals row
        tableData.push([
          "",
          "",
          "",
          "TOTAL",
          formatCurrency(client.totalDebit),
          formatCurrency(client.totalCredit),
          formatCurrency(client.closingBalance)
        ]);

        /* ================= TABLE ================= */
        autoTable(doc, {
          startY: 58,
          tableWidth: "auto",
          theme: "grid",
          head: [[
            "DATE",
            "VOUCHER NO",
            "REF NO",
            "DESCRIPTION",
            "DEBIT",
            "CREDIT",
            "BALANCE"
          ]],
          body: tableData,
          styles: {
            fontSize: 8,
            cellPadding: 1.5,
            overflow: "linebreak"
          },
          headStyles: {
            fillColor: [0, 51, 102],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center"
          },
          columnStyles: {
            0: { halign: "center", cellWidth: 20 },
            1: { halign: "center", cellWidth: 25 },
            2: { halign: "center", cellWidth: 20 },
            3: { cellWidth: "auto" },
            4: { halign: "right", cellWidth: 25 },
            5: { halign: "right", cellWidth: 25 },
            6: { halign: "right", cellWidth: 25 }
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          },
          didParseCell: function (data) {
            if (data.row.index === tableData.length - 1) {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.fillColor = [220, 230, 241];
            }
          },
          margin: {
            left: margin,
            right: margin
          }
        });

        /* ================= FOOTER ================= */
        doc.setFontSize(8);
        doc.setTextColor(100);

        const finalY = doc.lastAutoTable.finalY || pageHeight - 20;

        doc.line(margin, finalY + 5, pageWidth - margin, finalY + 5);

        doc.text(
          `Generated: ${new Date().toLocaleString()}`,
          margin,
          finalY + 10
        );

        doc.text(
          `Client: ${client.clientName} - ${client.clientId}`,
          pageWidth / 2,
          finalY + 10,
          { align: "center" }
        );

        doc.text(
          `Page ${clientIndex + 1} of ${clientLedgers.length}`,
          pageWidth - margin,
          finalY + 10,
          { align: "right" }
        );
      });

      /* ================= SAVE ================= */
      const fileName = `Vendor_Wise_Client_Ledger_${data.VendorName || "Vendor"}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error("Export to PDF failed:", error);
      alert("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Excel — all clients on a single sheet
  const exportToExcel = async () => {
    if (clientLedgers.length === 0) {
      alert("No data to export");
      return;
    }

    setIsExporting(true);
    try {
      const combinedRows = [];

      clientLedgers.forEach((client) => {
        combinedRows.push({
          "Client Name": client.clientName,
          "Client Code": client.clientCode,
          "Date": "",
          "Voucher No": "",
          "Ref No": "",
          "Description": "Opening Balance",
          "Debit": "",
          "Credit": "",
          "Balance": client.openingBalance
        });

        client.transactions.forEach((t) => {
          combinedRows.push({
            "Client Name": client.clientName,
            "Client Code": client.clientCode,
            "Date": t.date,
            "Voucher No": t.voucherNo,
            "Ref No": t.refNo,
            "Description": t.narration,
            "Debit": t.debit,
            "Credit": t.credit,
            "Balance": t.balance
          });
        });

        combinedRows.push({
          "Client Name": client.clientName,
          "Client Code": client.clientCode,
          "Date": "",
          "Voucher No": "",
          "Ref No": "",
          "Description": "TOTALS",
          "Debit": client.totalDebit,
          "Credit": client.totalCredit,
          "Balance": client.closingBalance
        });
      });

      await exportProfessionalExcel({
        title: 'Vendor Wise Client Ledger',
        fileName: `Vendor_Wise_Client_Ledger_${data.VendorName || "Vendor"}`,
        sheetName: 'Client Ledger',
        excludeKeys: ['_id', 'id'],
        rows: combinedRows,
        meta: [
          `Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
          `Vendor: ${data.VendorName || ""} ${data.VendorCode || ""}`.trim(),
        ],
      });
    } catch (error) {
      console.error("Export to Excel failed:", error);
      alert("Failed to export to Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setVoucherFilter("");
  };

  const uniqueDates = [...new Set(
    clientLedgers.flatMap((client) => client.transactions.map((item) => item.date))
  )].filter(Boolean);

  return (
    <div style={styles.container}>
      <ReportPopupHeader title="Vendor Wise Client Ledger" />

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
          <p>Loading vendor client ledger data...</p>
        </div>
      )}

      {!isLoading && clientLedgers.length === 0 && (
        <div style={styles.emptyState}>
          No customers found for this vendor in the selected period.
        </div>
      )}

      {clientLedgers.length > 0 && (
        <div style={styles.clientNavigation}>
          <div style={styles.clientInfo}>
            <span style={styles.clientCounter}>
              {visibleLedgers.length} of {clientLedgers.length} clients
            </span>
            <h3 style={styles.clientName}>
              {data.VendorName || "Vendor"} {data.VendorCode ? `(${data.VendorCode})` : ""}
            </h3>
            <div style={styles.clientStats}>
              <span>Period: {formatDate(data.startDate)} to {formatDate(data.endDate)}</span>
            </div>
          </div>
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
              Showing {visibleLedgers.length} clients
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

      <div id="ledger-content" style={styles.ledgerContent}>
        {visibleLedgers.map((client) => (
          <div key={client.clientId} style={styles.clientBlock}>
            <div style={styles.clientBlockHeader}>
              <div>
                <h3 style={styles.clientBlockName}>
                  {client.clientName} {client.clientCode ? `(${client.clientCode})` : ""}
                </h3>
              </div>
              <div style={styles.clientBlockStats}>
                <span>Opening: {formatCurrency(client.openingBalance) || "0.00"}</span>
                <span>Closing: {formatCurrency(client.closingBalance) || "0.00"}</span>
                <span>Entries: {client.filteredTransactions.length}</span>
              </div>
            </div>
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
                  <tr style={styles.openingRow}>
                    <td style={styles.tableCell} colSpan="4">Opening Balance</td>
                    <td style={styles.amountCell}></td>
                    <td style={styles.amountCell}></td>
                    <td style={styles.amountCell}>{formatCurrency(client.openingBalance) || "0.00"}</td>
                  </tr>
                  {client.filteredTransactions.length > 0 ? (
                    client.filteredTransactions.map((row, index) => (
                      <tr key={`${client.clientId}-${index}`} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                        <td style={styles.tableCell}>{row.date}</td>
                        <td style={styles.tableCell}>{row.voucherNo}</td>
                        <td style={styles.tableCell}>{row.refNo}</td>
                        <td style={styles.tableCell}>{row.narration}</td>
                        <td style={styles.amountCell}>{row.formattedDebit}</td>
                        <td style={styles.amountCell}>{row.formattedCredit}</td>
                        <td style={styles.amountCell}>{row.formattedBalance}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={styles.emptyRows}>No transactions in this period</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" style={styles.totalLabel}>TOTALS</td>
                    <td style={styles.totalAmount}>{formatCurrency(client.totalDebit)}</td>
                    <td style={styles.totalAmount}>{formatCurrency(client.totalCredit)}</td>
                    <td style={styles.totalAmount}>{formatCurrency(client.closingBalance) || "0.00"}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
      </div>
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

  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#6c757d',
    fontSize: '16px',
  },

  ledgerContent: {
    padding: '20px',
  },

  clientBlock: {
    marginBottom: '32px',
    border: '1px solid #dce3ea',
    borderRadius: '8px',
    overflow: 'hidden',
    pageBreakAfter: 'always',
    breakAfter: 'page',
  },

  clientBlockHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    padding: '12px 16px',
    background: '#2c3e50',
    color: 'white',
  },

  clientBlockName: {
    margin: 0,
    fontSize: '16px',
  },

  clientBlockStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    flexWrap: 'wrap',
  },

  openingRow: {
    backgroundColor: '#eef3f8',
    fontWeight: '600',
  },

  emptyRows: {
    padding: '12px',
    textAlign: 'center',
    color: '#6c757d',
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

export default VendorWiseClientLedgerPopup;