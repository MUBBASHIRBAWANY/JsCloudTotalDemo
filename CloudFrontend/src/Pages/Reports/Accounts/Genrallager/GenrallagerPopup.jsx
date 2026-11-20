import React, { useState, useEffect } from 'react';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { saveAs } from "file-saver";
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { useSelector } from 'react-redux';
import { Store } from 'lucide-react';
import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';


const GenrallagerPopup = ({ data }) => {
  
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // New state for export loading
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [margeVoucher, setMargeVoucher] = useState([])
  const [accountSections, setAccountSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [openingBalance, setopeningBalance] = useState(0)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [voucherFilter, setVoucherFilter] = useState("");

  // Filter function
  const applyFilters = () => {
    const filteredSections = accountSections.map(section => {
      let filtered = section.rows;

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

      return { ...section, rows: filtered };
    });

    setFilteredSections(filteredSections);
  };

  // Apply filters when any filter changes
  useEffect(() => {
    if (accountSections.length > 0) {
      applyFilters();
    }
  }, [searchTerm, dateFilter, voucherFilter, accountSections]);

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
      const filtersApplied = [
        searchTerm ? `Search: ${searchTerm}` : "",
        dateFilter ? `Date: ${dateFilter}` : "",
        voucherFilter ? `Voucher: ${voucherFilter}` : ""
      ].filter(f => f).join(", ") || "None";

      const usedNames = new Set();
      const sheets = filteredSections.map((section) => {
        const rawData = section.rows.map(item => ({
          "VOUCH DATE": item.date,
          "VOUCHER NO.": item.voucherNo,
          "STORE": item.Store || item.store || "",
          "REF NO.": item.refNo || '',
          "CHO / BILL DT.": item.refDate,
          "DESCRIPTION": item.description || item.Narration,
          "DEBIT": item.rawDebit || 0,
          "CREDIT": item.rawCredit || 0,
          "BALANCE": item.rawBalance || 0
        }));

        const totalsRow = {
          "VOUCH DATE": "",
          "VOUCHER NO.": "",
          "STORE": "",
          "REF NO.": "",
          "CHO / BILL DT.": "",
          "DESCRIPTION": "TOTAL",
          "DEBIT": section.debitTotal,
          "CREDIT": section.creditTotal,
          "BALANCE": ""
        };

        let sheetName = `${section.accountCode || 'Ledger'}`.substring(0, 31);
        if (usedNames.has(sheetName)) {
          sheetName = `${sheetName}`.substring(0, 28) + `_${usedNames.size}`;
        }
        usedNames.add(sheetName);

        return {
          name: sheetName,
          title: `${section.accountCode} - ${section.accountName}`,
          rows: [...rawData, totalsRow],
          meta: [
            `Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
            `Account: ${section.accountCode} - ${section.accountName}`,
            `From Account: ${data.fromAccount || "All"}`,
            `To Account: ${data.toAccount || "All"}`,
            `Store: ${data.store || "All"}`,
            `Filters: ${filtersApplied}`,
          ],
        };
      });

      await exportProfessionalExcel({
        title: 'General Ledger',
        fileName: 'Ledger_Report',
        excludeKeys: ['_id', 'id'],
        sheets,
      });
    } catch (error) {
      console.error("Export to Excel failed:", error);
      alert("Failed to export to Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // const openVoucherModal = (voucher) => {
  //   const voucherType = voucher.slice(0, 2)
  //   if (voucherType == "SL") {
  //     const SplitVoucher = voucher.slice(2)
  //     window.open(`/SalesInvoiceViewById/${SplitVoucher}`, "_blank");
  //   }
  //   if (voucherType == "Pr") {
  //     const SplitVoucher = voucher.slice(2)
  //     window.open(`/PurchaseInvoiceViewByNumber/${SplitVoucher}`, "_blank");
  //   }
  //   else {
  //     window.open(`/AllVoucherView/${voucher}`, "_blank");
  //   }
  // };

  const openVoucherModal = (id, type, voucherNo) => {
    
 if (!id || id === "undefined") {
    console.log("Invalid ID:", id);
    return;
  }  const objectId = typeof id === "object" ? id.id || id._id : id;
 let voucherType = type;
    if (!voucherType && voucherNo) {
        // Assume first 2 chars of voucherNo indicate type
        voucherType = voucherNo.slice(0, 2); 
    }

    // ✅ Open URL based on type
    switch (voucherType) {
        // case "SL":
        //     window.open(`/SalesInvoiceViewById/${objectId}`, "_blank");
        //     break;
        // case "PR":
        //     window.open(`/PurchaseInvoiceViewByNumber/${objectId}`, "_blank");
        //     break;
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
  }

  const closeVoucherModal = () => {
    setIsModalOpen(false);
    setSelectedVoucher(null);
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 10;

      const addBorderedText = (text, x, y, width, height = 5, align = 'left', bold = false) => {
        doc.setDrawColor(0, 0, 0);
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, width, height, 'FD');
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, bold ? 'bold' : 'normal');
        doc.setFontSize(9);
        const textX = align === 'center' ? x + width / 2 : align === 'right' ? x + width - 2 : x + 2;
        doc.text(text, textX, y + 3.5, { align });
      };

      const drawHeader = (doc, pageWidth, margin) => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(margin, 2, pageWidth - 2 * margin, 16, 'S');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('PDL', pageWidth / 2, 10, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text('General Ledger', pageWidth / 2, 14, { align: 'center' });
      };

      const drawDetails = (doc, pageWidth, margin) => {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(13);
        const detailsLeft = [
          { label: 'From Account:', value: data.fromAccount || 'All' },
          { label: 'To Account:', value: data.toAccount || 'All' },
          { label: 'Period:', value: `${formatDate(data.startDate)} to ${formatDate(data.endDate)}` },
          { label: 'Currency:', value: 'PKR' }
        ];
        const detailsRight = [
          { label: 'Report Date:', value: new Date().toLocaleDateString() },
          { label: 'Time:', value: new Date().toLocaleTimeString() },
          { label: 'User:', value: data.PrintedBy || 'System' }
        ];
        detailsLeft.forEach((detail, index) => {
          addBorderedText(`${detail.label} ${detail.value}`, margin, 20 + (index * 6), 90, 5, 'left', false);
        });
        detailsRight.forEach((detail, index) => {
          addBorderedText(`${detail.label} ${detail.value}`, pageWidth - 100, 20 + (index * 6), 90, 5, 'left', false);
        });
      };

      // First page
      drawHeader(doc, pageWidth, margin);
      drawDetails(doc, pageWidth, margin);

      let currentY = 50;

      for (let sIndex = 0; sIndex < filteredSections.length; sIndex++) {
        const section = filteredSections[sIndex];

        if (sIndex > 0) {
          doc.addPage();
          drawHeader(doc, pageWidth, margin);
          currentY = 25;
        }

        // Account section title
        doc.setDrawColor(0, 0, 0);
        doc.setFillColor(230, 230, 230);
        doc.rect(margin, currentY, pageWidth - 2 * margin, 8, 'FD');
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`A/C: ${section.accountCode} - ${section.accountName}`, margin + 2, currentY + 5.5);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text(`Opening: ${formatTotal(section.openingBalance)}  |  Closing: ${formatTotal(section.closingBalance)}`, pageWidth - margin - 2, currentY + 5.5, { align: 'right' });
        currentY += 10;

        const tableData = section.rows.map(row => [
          row.date || '',
          row.voucherNo || '',
          row.Store || '',
          row.refNo || '',
          row.refDate || '',
          row.Narration || row.description || '',
          row.debit || '',
          row.credit || '',
          row.balance || ''
        ]);

        const totalsRow = ['', '', '', '', '', 'TOTAL:',
          formatTotal(section.debitTotal),
          formatTotal(section.creditTotal),
          ''];
        tableData.push(totalsRow);

        autoTable(doc, {
          startY: currentY,
          head: [[
            { content: 'VOUCH DATE', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] } },
            { content: 'VOUCHER NO.', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] } },
            { content: 'STORE', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] } },
            { content: 'REF NO.', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] } },
            { content: 'REF DATE', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] } },
            { content: 'DESCRIPTION', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] } },
            { content: 'DEBIT', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] } },
            { content: 'CREDIT', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] } },
            { content: 'BALANCE', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] } }
          ]],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', halign: 'left', fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.3, lineColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 16, halign: 'center' }, 1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 16, halign: 'center' },
            4: { cellWidth: 16, halign: 'center' }, 5: { cellWidth: 38 },
            6: { cellWidth: 18, halign: 'right' }, 7: { cellWidth: 18, halign: 'right' },
            8: { cellWidth: 18, halign: 'right' }
          },
          alternateRowStyles: { fillColor: [255, 255, 255] },
          didParseCell: function (cellData) {
            if (cellData.row.index === tableData.length - 1) {
              cellData.cell.styles.fontStyle = 'bold';
              cellData.cell.styles.textColor = [0, 0, 0];
            }
          },
          margin: { left: margin, right: margin }
        });

        currentY = doc.lastAutoTable.finalY + 15;
      }

      // Footer on last page
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, pageHeight - 15);
      doc.text(`PDL General Ledger - ${data.fromAccount || 'All'} to ${data.toAccount || 'All'}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

      const signatureY = currentY + 10;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('Prepared By:', margin + 20, signatureY);
      doc.setDrawColor(0, 0, 0);
      doc.line(margin + 50, signatureY - 2, margin + 100, signatureY - 2);
      doc.text(data.PrintedBy || '_________________', margin + 75, signatureY + 3, { align: 'center' });
      doc.text('Reviewed By:', pageWidth / 2 - 30, signatureY);
      doc.line(pageWidth / 2, signatureY - 2, pageWidth / 2 + 50, signatureY - 2);

      doc.autoPrint();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => { printWindow.print(); };
      }
    } catch (error) {
      console.error("Export to PDF failed:", error);
      alert("Failed to export to PDF. Please try again.");
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
      const allAccounts = data.chartofAccount || [];


      const fromCode = data.fromAccount || '';
      const toCode = data.toAccount || '';

      let filteredAccounts = allAccounts.filter(acc => String(acc.Stage) === "4");
      if (fromCode || toCode) {
        filteredAccounts = filteredAccounts.filter(acc => {
          const code = acc.AccountCode || '';
          if (fromCode && toCode) {
            const prefixLen = Math.min(fromCode.length, toCode.length, code.length);
            const codePrefix = code.substring(0, prefixLen);
            return codePrefix >= fromCode.substring(0, prefixLen) && codePrefix <= toCode.substring(0, prefixLen);
          } else if (fromCode) {
            const prefixLen = Math.min(fromCode.length, code.length);
            return code.substring(0, prefixLen) >= fromCode.substring(0, prefixLen);
          } else if (toCode) {
            const prefixLen = Math.min(toCode.length, code.length);
            return code.substring(0, prefixLen) <= toCode.substring(0, prefixLen);
          }
          return true;
        });
      }

      filteredAccounts.sort((a, b) => {
        const numA = parseFloat(a.AccountCode) || 0;
        const numB = parseFloat(b.AccountCode) || 0;
        return numA - numB;
      });

      const formatAmount = (amount) =>
        amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const prevDate = new Date(data.startDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const formattedPrevDate = formatDate(prevDate.toISOString());

      const sections = [];
      let grandTotalDebit = 0;
      let grandTotalCredit = 0;
      let allMargeVoucher = [];

      const storeParam = Array.isArray(data.store)
        ? data.store.filter((s) => s != null && s !== "" && s !== "undefined").map(String).join(",")
        : (data.store != null && data.store !== "" && data.store !== "undefined" ? String(data.store) : "");

      const buildAccountQuery = (accId) => {
        const params = new URLSearchParams({
          startDate: data.startDate,
          endDate: data.endDate,
          Account: String(accId),
        });
        if (storeParam) params.set("Store", storeParam);
        return `GernalLager?${params.toString()}`;
      };

      // Fetch a few accounts in parallel (backend is now fast per account)
      const CONCURRENCY = 4;
      const accountChunks = [];
      for (let i = 0; i < filteredAccounts.length; i += CONCURRENCY) {
        accountChunks.push(filteredAccounts.slice(i, i + CONCURRENCY));
      }

      for (const chunk of accountChunks) {
        const chunkResults = await Promise.all(
          chunk.map(async (acc) => {
            const accId = acc._id || acc.id;
            if (!accId) return null;
            try {
              const Accountdata = await getDataFundtion(buildAccountQuery(accId));
              return { acc, accId, Accountdata: Accountdata || [] };
            } catch (err) {
              console.error("GL account fetch failed", accId, err);
              return { acc, accId, Accountdata: [] };
            }
          })
        );

        for (const result of chunkResults) {
          if (!result) continue;
          const { acc, accId, Accountdata } = result;

        const sortedByDate = (Accountdata || []).sort((a, b) => {
          const dateA = String(a.VoucherDate || "");
          const dateB = String(b.VoucherDate || "");
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          return String(a.VoucherNumber || "").localeCompare(String(b.VoucherNumber || ""));
        });

        const openingEntries = sortedByDate.filter(item => item.Type === "VoucherBefore");
        const mainEntries = sortedByDate.filter(item => item.Type === "Voucher");
        const modalEntry = sortedByDate.filter(item => item.Type === "VoucherCheck");
        allMargeVoucher = [...allMargeVoucher, ...modalEntry];

        let openingDebit = 0;
        let openingCredit = 0;
        openingEntries.forEach(item => {
          openingDebit += item.Debit ? Number(item.Debit || 0) : 0;
          openingCredit += item.Credit ? Number(item.Credit || 0) : 0;
        });

        const accOpeningBalance = openingDebit - openingCredit;
        let runningBalance = accOpeningBalance;

        // Skip empty ledgers (no opening, no period activity)
        if (!mainEntries.length && !openingDebit && !openingCredit) {
          continue;
        }

        const rows = [];

        rows.push({
          date: formattedPrevDate,
          id: '',
          voucherNo: '',
          refNo: '',
          refDate: '',
          description: `OPENING BAL. AS ON : ${formattedPrevDate}`,
          balance: accOpeningBalance < 0 ? `${formatAmount(Math.abs(accOpeningBalance))}` : formatAmount(accOpeningBalance),
          rawDebit: accOpeningBalance > 0 ? accOpeningBalance : 0,
          rawCredit: accOpeningBalance < 0 ? Math.abs(accOpeningBalance) : 0,
          rawBalance: accOpeningBalance
        });

        let debitTotal = 0;
        let creditTotal = 0;

        mainEntries.forEach(item => {
          const debit = item.Debit ? parseFloat(item.Debit) : 0;
          const credit = item.Credit ? parseFloat(item.Credit) : 0;

          debitTotal += debit;
          creditTotal += credit;
          runningBalance += debit - credit;

          rows.push({
            id: item._id || item.id,
            date: formatDate(item.VoucherDate),
            Store: data.allStore?.find(store => String(store._id) === String(item.store))?.StoreName || '',
            voucherNo: item.VoucherNumber,
            refNo: item.InvoiceRef || item.SalesFlowRef || item.Ref || item.Cheque || item.ChqNumber || "",
            refDate: item.RefDate || item.Slip || "",
            debit: debit > 0 ? formatAmount(debit) : '',
            credit: credit > 0 ? formatAmount(credit) : '',
            balance: formatAmount(Math.abs(runningBalance)),
            Accountdata: item.VoucharData,
            rawDebit: debit,
            rawCredit: credit,
            Narration: item.Narration,
            rawBalance: runningBalance
          });
        });

        grandTotalDebit += debitTotal;
        grandTotalCredit += creditTotal;

        sections.push({
          accountCode: acc.AccountCode,
          accountName: acc.AccountName,
          accountId: accId,
          openingBalance: accOpeningBalance,
          rows: rows,
          debitTotal: debitTotal,
          creditTotal: creditTotal,
          closingBalance: runningBalance
        });
        }
      }

      setMargeVoucher(allMargeVoucher);
      setAccountSections(sections);
      setFilteredSections(sections);
      setTotalDebit(grandTotalDebit);
      setTotalCredit(grandTotalCredit);
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
    setFilteredSections(accountSections);
  };

  // Get unique dates for filter dropdown
  const uniqueDates = [...new Set(filteredSections.flatMap(section => section.rows.map(item => item.date)))].filter(date => date);

  return (
    <div style={styles.container}>
      <ReportPopupHeader title="General Ledger" />

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
              Showing {filteredSections.length} account(s)
            </span>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div style={styles.exportButtons}>
        <button
          onClick={exportToExcel}
          style={styles.exportButton}
          disabled={isExporting || filteredSections.length === 0}
        >
          {isExporting ? 'Exporting...' : 'Export Excel'}
        </button>
        <button
          onClick={exportToPDF}
          style={styles.exportButton}
          disabled={isExporting || filteredSections.length === 0}
        >
          {isExporting ? 'Printing...' : 'Print PDF'}
        </button>
        <button
          onClick={exportToWord}
          style={styles.exportButton}
          disabled={isExporting || filteredSections.length === 0}
        >
          {isExporting ? 'Exporting...' : 'Export Word'}
        </button>
        <button
          onClick={exportToHTML}
          style={styles.exportButton}
          disabled={isExporting || filteredSections.length === 0}
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
              <span style={styles.infoLabel}>FROM A/C:</span>
              <span style={styles.infoValue}>{data.fromAccount || 'All'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>TO A/C:</span>
              <span style={styles.infoValue}>{data.toAccount || 'All'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>ADDRESS:</span>
              <span style={styles.infoValue}>Company</span>
            </div>
          </div>
        </div>

        {/* Ledger Sections - One per Account */}
        {filteredSections.map((section, sIndex) => {
          const sectionTotalDebit = section.debitTotal;
          const sectionTotalCredit = section.creditTotal;
          return (
            <div key={section.accountId || sIndex} style={{ marginBottom: '40px', pageBreakAfter: 'always' }}>
              {/* Account Section Header */}
              <div style={styles.accountSectionHeader}>
                <div style={styles.accountSectionTitle}>
                  A/C: {section.accountCode} - {section.accountName}
                </div>
                <div style={styles.accountSectionInfo}>
                  <span>Opening: {formatTotal(section.openingBalance)}</span>
                  <span> | </span>
                  <span>Closing: {formatTotal(section.closingBalance)}</span>
                </div>
              </div>

              {/* Account Table */}
              <div style={styles.ledgerTableContainer}>
                <table style={styles.ledgerTable}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>VOUCH DATE</th>
                      <th style={styles.tableHeader}>VOUCHER NO.</th>
                      <th style={styles.tableHeader}>STORE</th>
                      <th style={styles.tableHeader}>REF NO.</th>
                      <th style={styles.tableHeader}>REF DATE</th>
                      <th style={styles.tableHeader}>DESCRIPTION</th>
                      <th style={styles.tableHeader}>DEBIT</th>
                      <th style={styles.tableHeader}>CREDIT</th>
                      <th style={styles.tableHeader}>BALANCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, index) => (
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
                        <td style={styles.tableCell}>{row.Store}</td>
                        <td style={styles.tableCell}>{row.refNo}</td>
                        <td style={styles.tableCell}>{row.refDate}</td>
                        <td style={{ ...styles.tableCell, ...styles.descriptionCell }}>{row.Narration}</td>
                        <td style={{ ...styles.tableCell, ...styles.amount }}>{row.debit}</td>
                        <td style={{ ...styles.tableCell, ...styles.amount }}>{row.credit}</td>
                        {row.rawBalance < 0 ?
                          <td style={{ ...styles.tableCell, ...styles.amount, ...styles.balance, color: 'red' }}>
                            ({(row.balance)})
                          </td> :
                          <td style={{ ...styles.tableCell, ...styles.amount, ...styles.balance, color: 'black' }}>
                            {row.balance}
                          </td>
                        }
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="5" style={{ ...styles.tableCell, ...styles.totalLabel, textAlign: 'right', fontWeight: 'bold' }}>
                        TOTALS
                      </td>
                      <td style={{ ...styles.tableCell, ...styles.totalAmount }}>{formatTotal(sectionTotalDebit)}</td>
                      <td style={{ ...styles.tableCell, ...styles.totalAmount }}>{formatTotal(sectionTotalCredit)}</td>
                      <td style={styles.tableCell}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}

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
  accountSectionHeader: {
    background: '#e8edf2',
    padding: '12px 20px',
    margin: '10px 20px',
    borderRadius: '6px',
    border: '1px solid #c5cdd8',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountSectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#2c3e50',
  },
  accountSectionInfo: {
    fontSize: '13px',
    color: '#555',
    fontWeight: '500',
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

export default GenrallagerPopup;
