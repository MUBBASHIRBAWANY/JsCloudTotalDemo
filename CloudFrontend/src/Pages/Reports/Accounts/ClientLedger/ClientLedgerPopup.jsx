import React, { useState, useEffect } from 'react';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { saveAs } from "file-saver";
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import { buildClientLedgerPdf } from '../../../../utils/buildClientLedgerPdf';
import { useSelector } from 'react-redux';
import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';


const GenrallagerPopup = ({ data }) => {
  //console.log(data)
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // New state for export loading
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [margeVoucher, setMargeVoucher] = useState([])
  const [ledgerData, setLedgerData] = useState([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [sales, setsales] = useState([])

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [voucherFilter, setVoucherFilter] = useState("");
  const [filteredData, setFilteredData] = useState([]);

  // Filter function
  const applyFilters = () => {
    let filtered = ledgerData;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        (item.Narration && item.Narration.toLowerCase().includes(term)) ||
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
const toNumber = (val) => {
  if (val === null || val === undefined) return 0;

  const num = Number(String(val).replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
};
  // Apply filters when any filter changes
  useEffect(() => {

    applyFilters();

  }, [searchTerm, dateFilter, voucherFilter, ledgerData]);

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const dataToExport = filteredData.length > 0 ? filteredData : ledgerData;

      const rawData = dataToExport.map(item => ({
        "VOUCH DATE": item.date,
        "VOUCHER NO.": item.voucherNo,
        "CHO / BILL NO.": item.refNo,
        "CHO / BILL DT.": item.refDate,
        "ACCOUNT NAME / DESCRIPTION": item.Narration,
        "DEBIT": Number(item.rawDebit).toFixed(2) || parseFloat(item.debit?.replace(/[^0-9.-]+/g, "") || 0),
        "CREDIT": Number(item.rawCredit).toFixed(2) || parseFloat(item.credit?.replace(/[^0-9.-]+/g, "") || 0),
        "BALANCE": Number(item.rawBalance).toFixed(2) || parseFloat(item.balance?.replace(/[^0-9.-]+/g, "") || 0)
      }));

      const totalsRow = {
        "VOUCH DATE": "",
        "VOUCHER NO.": "",
        "CHO / BILL NO.": "",
        "CHO / BILL DT.": "",
        "ACCOUNT NAME / DESCRIPTION": "TOTAL",
        "DEBIT": rawData.reduce((sum, row) => sum + Number(row.DEBIT || 0), 0),
        "CREDIT": rawData.reduce((sum, row) => sum + Number(row.CREDIT || 0), 0),
        "BALANCE": ""
      };

      await exportProfessionalExcel({
        title: 'Client Ledger',
        fileName: 'Client_Ledger',
        sheetName: 'Client Ledger',
        rows: [...rawData, totalsRow],
        meta: [
          `Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
          `Account: ${data.AcCode} - ${data.AcName || data.AcCode}`,
        ],
        excludeKeys: ['_id', 'id'],
      });
    } catch (error) {
      console.error("Export to Excel failed:", error);
      alert("Failed to export to Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const openVoucherModal = (id, type, voucherNo) => {
    if (!id || id === "undefined") {
      console.log("Invalid ID:", id);
      return;
    }
    const objectId = typeof id === "object" ? id.id || id._id : id;
    let voucherType = type;
    if (!voucherType && voucherNo) {
      voucherType = voucherNo.slice(0, 2);
    }

    switch (voucherType) {
      case "BR":
        window.open(`/BankReciptVoucherView/${objectId}`, "_blank");
        break;
      case "BP":
        window.open(`/BankPaymentVoucherView/${objectId}`, "_blank");
        break;
      case "CP":
        window.open(`/CashPaymentVoucherView/${objectId}`, "_blank");
        break;
      case "CR":
        window.open(`/CashReciptVoucherView/${objectId}`, "_blank");
        break;
      default:
        window.open(`/JournalVoucherView/${objectId}`, "_blank");
    }
  };

  const closeVoucherModal = () => {
    setIsModalOpen(false);
    setSelectedVoucher(null);
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const filtersActive =
        Boolean(searchTerm || dateFilter || voucherFilter) &&
        filteredData.length > 0 &&
        filteredData.length < ledgerData.length;
      const dataToExport = filteredData.length > 0 ? filteredData : ledgerData;
      const doc = buildClientLedgerPdf({
        rows: dataToExport,
        accountName: data.AcName || "",
        accountCode: data.AcCode || "",
        periodLabel: `${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
        printedBy: data.PrintedBy || "",
        filtered: filtersActive,
      });

      const accountName = String(data.AcName || data.AcCode || "Client Ledger")
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/g, "");
      const periodFrom = formatDate(data.startDate);
      const periodTo = formatDate(data.endDate);
      const period =
        periodFrom && periodTo
          ? `${periodFrom} to ${periodTo}`
          : periodFrom || periodTo;
      const fileName = [accountName || "Client Ledger", period]
        .filter(Boolean)
        .join(" ")
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/g, "");
      doc.save(`${fileName || "Client Ledger"}.pdf`);
    } catch (error) {
      console.error("Export to PDF failed:", error);
      alert("Failed to export to PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Add this helper function for currency formatting


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
      if (!element) {
        alert("Ledger content not found.");
        return;
      }

      const content = element.innerHTML;
      const converted = htmlDocx.asBlob(`<html><body>${content}</body></html>`);
      saveAs(converted, "Ledger_Report.docx");
    } catch (error) {
      console.error("Export to Word failed:", error);
      alert("Failed to export to Word. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString) => {
    // ✅ must be exactly YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return "";

    const date = new Date(dateString);

    // ✅ Invalid date protection (e.g. 2025-13-40)
    if (isNaN(date.getTime())) return "";

    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(",", "");
  };


  const getInv = (VoucherNumber) => {
    if (data.type == "Dsitributor") {
      //console.log(VoucherNumber)
      return VoucherNumber.slice(3)
    }
    const res = data.sales.find((item) => item.SalesInvoice == VoucherNumber.slice(2))

    return res

  }
  const getInvDet = (VoucherNumber) => {
    if (data.type == "Dsitributor") {
      
      const res = data.DisSales.find((item) => item.DitributorInvoiceCode == VoucherNumber)  
      //console.log(res)
    return res
      
    }
    const res = data.sales.find((item) => item.SalesInvoice == VoucherNumber)

    return res

  }

  // Extract SalesFlowRef from ClientRef2 (value after comma, e.g. "UnRealized , 217940" -> "217940")
  const extractSalesFlowRefFromClientRef2 = (item) => {
    // First check if ClientRef2 exists directly on the item (flattened data)
    if (item?.ClientRef2) {
      console.log(item?.ClientRef2)
      const parts = String(item.ClientRef2).split(",");
      if (parts.length > 1) {
        const value = parts[parts.length - 1]?.trim();
        if (value && value !== "undefined" && value !== "null") return value;
      }
    }
    // Then check inside VoucharData array (raw voucher data)
    const voucharData = item?.VoucharData;
    if (!voucharData || !Array.isArray(voucharData)) return "";
    for (const entry of voucharData) {
      if (entry.ClientRef2) {
        const parts = String(entry.ClientRef2).split(",");
        if (parts.length > 1) {
          const value = parts[parts.length - 1]?.trim();
          if (value && value !== "undefined" && value !== "null") return value;
        }
      }
    }
    return "";
  };
const getData = async () => {
  setIsLoading(true);
  try {
    
    const Accountdata = await getDataFundtion(
      `GernalLager/ClientlLager?startDate=${data.startDate}&endDate=${data.endDate}&Client=${data.Client}`
    );
    console.log(Accountdata)
    const Accountdata1 = Accountdata.map((item) => ({
      ...item,
      Debit: Number(item.Debit || 0),
      Credit: Number(item.Credit || 0),
    }))
    const sortedByDate = Accountdata1.sort((a, b) => {
      const dateA = new Date(a.VoucherDate || 0);
      const dateB = new Date(b.VoucherDate || 0);
      return dateA - dateB;
    });

    const openingEntries = Accountdata.filter(item => item.Type === "VoucherBefore");
    const mainEntries = sortedByDate.filter(item => item.Type === "Voucher");
    const modalEntry = Accountdata.filter(item => item.Type === "VoucherCheck");
    setMargeVoucher(openingEntries, "openingEntries");

    let openingDebit = 0;
    let openingCredit = 0;
const safeNumber = (val) => {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};
    openingEntries.forEach(item => {
  const debit = safeNumber(item.Debit);
  const credit = safeNumber(item.Credit);

  openingDebit += debit;
  openingCredit += credit;
});
    const openingBalance = openingDebit - openingCredit;
    console.log(openingDebit , openingCredit, "openingBalance");
    let runningBalance = openingBalance;

    const formatAmount = (amount) =>
      amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // FIX: Properly format the previous date to YYYY-MM-DD
    const prevDate = new Date(data.startDate);
    prevDate.setDate(prevDate.getDate() - 1);
    // Format to YYYY-MM-DD for the formatDate function
    const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
    const formattedPrevDate = formatDate(prevDateStr);

    const transformedData = [];

    // Opening balance row
    transformedData.push({
      date: formattedPrevDate,
      voucherNo: '',
      refNo: '',
      refDate: '',
      Narration: `OPENING BAL. AS ON : ${formattedPrevDate}`,
      debit: '',
      credit: '',
      balance: openingBalance < 0 ? `(${formatAmount(Math.abs(openingBalance))})` : formatAmount(openingBalance),
      rawDebit: openingBalance > 0 ? openingBalance : 0,
      rawCredit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      rawBalance: openingBalance
    });

    let debitTotal = 0;
    let creditTotal = 0;

    // Main entries
    mainEntries.forEach(item => {
      const debit = toNumber(item.Debit);
      const credit = toNumber(item.Credit);

      debitTotal += debit;
      creditTotal += credit;

      runningBalance = toNumber(runningBalance) + debit - credit;

      transformedData.push({
        date: formatDate(item.VoucherDate),
        voucherNo: item.VoucherNumber,
        refNo: item?.Cheque || data.type == "Dsitributor" ? item.Ref : getInv(item.VoucherNumber)?.SalesFlowRef || getInvDet(item.Ref)?.SalesFlowRef || extractSalesFlowRefFromClientRef2(item) || "",
        refDate: data.type == "Dsitributor" ? formatDate(getInvDet(item.Ref)?.InvoiceDate) : formatDate(getInvDet(item.Ref)?.SalesInvoiceDate),
        debit: debit > 0 ? formatAmount(debit) : '',
        credit: credit > 0 ? formatAmount(credit) : '',
        balance: formatAmount(runningBalance),
        Accountdata: item.VoucharData,
        Narration: item.Narration,
        rawDebit: debit,
        rawCredit: credit,
        rawBalance: runningBalance,
        id: item._id,
        VoucherType: item.VoucherType
      });
    });

    setLedgerData(transformedData);
    setFilteredData(transformedData);
    setTotalDebit(debitTotal);
    setTotalCredit(creditTotal);
  } catch (err) {
    console.error("Error fetching ledger data:", err);
  } finally {
    setIsLoading(false);
  }
};

const MargegetData = async () => {
  setIsLoading(true);
  try {
    const Accountdata = await getDataFundtion(
      `GernalLager/ClientlLager?startDate=${data.startDate}&endDate=${data.endDate}&Client=${data.Client}`
    )
    
    const Accountdata1 = Accountdata.map((item) => ({
      ...item,
      Debit: Number(item.Debit || 0),
      Credit: Number(item.Credit || 0),
    }));

    const sortedByDate = Accountdata1.sort((a, b) => {
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

    // FIX: Properly format the previous date to YYYY-MM-DD
    const prevDate = new Date(data.startDate);
    prevDate.setDate(prevDate.getDate() - 1);
    // Format to YYYY-MM-DD for the formatDate function
    const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
    const formattedPrevDate = formatDate(prevDateStr);

    const transformedData = [];

    // Opening Balance
    transformedData.push({
      date: formattedPrevDate,
      voucherNo: '',
      refNo: '',
      refDate: '',
      Narration: `OPENING BAL. AS ON : ${formattedPrevDate}`,
      debit: '',
      credit: '',
      balance: openingBalance < 0 ? `(${formatAmount(Math.abs(openingBalance))})` : formatAmount(openingBalance),
      rawDebit: openingBalance > 0 ? openingBalance : 0,
      rawCredit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      rawBalance: openingBalance
    });

    let debitTotal = 0;
    let creditTotal = 0;

    /* =============================
       MERGE DATA BY VOUCHER NUMBER
    ==============================*/

    const voucherMap = {};

    mainEntries.forEach(item => {
      const vNo = item.VoucherNumber;

      if (!voucherMap[vNo]) {
        voucherMap[vNo] = {
          ...item,
          Debit: 0,
          Credit: 0,
          rows: []
        };
      }

      const debit = item.Debit ? parseFloat(item.Debit) : 0;
      const credit = item.Credit ? parseFloat(item.Credit) : 0;

      voucherMap[vNo].Debit += debit;
      voucherMap[vNo].Credit += credit;
      voucherMap[vNo].rows.push(item);
    });

    const mergedEntries = Object.values(voucherMap);

    /* =============================
       PROCESS MERGED ENTRIES
    ==============================*/

    mergedEntries.forEach(item => {
      const debit = item.Debit || 0;
      const credit = item.Credit || 0;

      debitTotal += debit;
      creditTotal += credit;

      runningBalance += debit - credit;

      transformedData.push({
        date: formatDate(item.VoucherDate),
        voucherNo: item.VoucherNumber,
        refNo: item?.Cheque || data.type == "Dsitributor"
          ? item.Ref
          : getInv(item.VoucherNumber)?.SalesFlowRef ||
            getInvDet(item.Ref)?.SalesFlowRef ||
            extractSalesFlowRefFromClientRef2(item) || "",
        refDate: data.type == "Dsitributor"
          ? formatDate(getInvDet(item.Ref)?.InvoiceDate)
          : formatDate(getInvDet(item.Ref)?.SalesInvoiceDate),
        debit: debit > 0 ? formatAmount(debit) : '',
        credit: credit > 0 ? formatAmount(credit) : '',
        balance: formatAmount(runningBalance),
        Accountdata: item.rows,
        Narration: item.Narration,
        rawDebit: debit,
        rawCredit: credit,
        rawBalance: runningBalance,
        id: item._id,
        VoucherType: item.VoucherType
      });
    });

    setLedgerData(transformedData);
    setFilteredData(transformedData);
    setTotalDebit(debitTotal);
    setTotalCredit(creditTotal);
  } catch (err) {
    console.error("Error fetching ledger data:", err);
  } finally {
    setIsLoading(false);
  }
};
  useEffect(() => {
    if(data.marge == true){
      MargegetData()
    }
    else {
      getData();

    }
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
      <ReportPopupHeader title="Client Ledger" />

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
              <span style={styles.infoLabel}>SalesFlow CODE:</span>
              <span style={styles.infoValue}>{data.AcCode}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Client Name :</span>
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
                <th style={styles.tableHeader}>VOUCH DATE</th>
                <th style={styles.tableHeader}>VOUCHER NO.</th>
                <th style={styles.tableHeader}>CHO / BILL NO.</th>
                <th style={styles.tableHeader}>CHO / BILL DT.</th>
                <th style={styles.tableHeader}>ACCOUNT NAME / DESCRIPTION</th>
                <th style={styles.tableHeader}>DEBIT</th>
                <th style={styles.tableHeader}>CREDIT</th>
                <th style={styles.tableHeader}>BALANCE</th>
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
                  <td
                    style={{
                      ...styles.tableCell,
                      ...styles.voucherCell,
                      cursor: "pointer",
                      textDecoration: "underline",
                      color: "blue"
                    }}
                    onClick={() => openVoucherModal(row.id?.id || row.id, row.VoucherType, row.voucherNo)}
                  >
                    {row.voucherNo}
                  </td>
                  <td style={styles.tableCell}>{row.refNo}</td>
                  <td style={styles.tableCell}>{row.refDate}</td>
                  <td style={{ ...styles.tableCell, ...styles.descriptionCell }}>{row.Narration}</td>
                  <td style={{ ...styles.tableCell, ...styles.amount }}>{row.debit}</td>
                  <td style={{ ...styles.tableCell, ...styles.amount }}>{row.credit}</td>
                  <td style={{ ...styles.tableCell, ...styles.amount, ...styles.balance }}>{row.balance}</td>
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
                <td style={{ ...styles.tableCell, ...styles.totalAmount }}>{formatTotal(totalDebit)}</td>
                <td style={{ ...styles.tableCell, ...styles.totalAmount }}>{formatTotal(totalCredit)}</td>
                <td style={styles.tableCell}></td>
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
    maxHeight: '50px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',

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

export default GenrallagerPopup;