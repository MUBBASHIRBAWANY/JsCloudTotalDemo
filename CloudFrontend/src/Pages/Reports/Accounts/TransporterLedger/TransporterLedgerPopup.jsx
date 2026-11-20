import React, { useState, useEffect, useMemo } from 'react';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { saveAs } from "file-saver";
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
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
  const [showAllMode, setShowAllMode] = useState(false);
  const [allBalanceData, setAllBalanceData] = useState([]);

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

  // Apply filters when any filter changes
  useEffect(() => {

      applyFilters();

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
        title: 'Transporter Ledger',
        fileName: 'Transporter_Ledger',
        sheetName: 'Ledger',
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
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Constants for layout
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const tableStartY = 50;
    
    // Data to export
    const dataToExport = filteredData.length > 0 ? filteredData : ledgerData;
    
    // Calculate totals
    const totalDebitCalc = dataToExport.reduce((sum, row) => sum + (row.rawDebit || 0), 0);
    const totalCreditCalc = dataToExport.reduce((sum, row) => sum + (row.rawCredit || 0), 0);
    
    // Helper function to add text with borders
    const addBorderedText = (text, x, y, width, height = 5, align = 'left', bold = false) => {
      doc.setDrawColor(0, 0, 0);
      doc.setFillColor(255, 255, 255);
      doc.rect(x, y, width, height, 'FD'); // FD means fill and draw
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, bold ? 'bold' : 'normal');
      doc.setFontSize(9);
      
      const textX = align === 'center' ? x + width / 2 : 
                    align === 'right' ? x + width - 2 : x + 2;
      
      doc.text(text, textX, y + 3.5, {
        align: align
      });
    };

    // Company Header with SAP-like styling
    doc.setFillColor(0, 51, 102); // SAP blue color
    doc.rect(0, 0, pageWidth, 15, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('PDL ', pageWidth / 2, 10, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('CLient Ledger', pageWidth / 2, 14, { align: 'center' });

    // Report Details Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    
    // Left side details
    const detailsLeft = [
      { label: 'Account Code:', value: data.AcCode || 'N/A' },
      { label: 'Account Name:', value: data.AcName || 'N/A' },
      { label: 'Period:', value: `${formatDate(data.startDate)} to ${formatDate(data.endDate)}` },
      { label: 'Currency:', value: 'PKR' }
    ];
    
    // Right side details
    const detailsRight = [
      { label: 'Report Date:', value: new Date().toLocaleDateString() },
      { label: 'Time:', value: new Date().toLocaleTimeString() },
      { label: 'Page:', value: '1' },
      { label: 'User:', value: data.PrintedBy || 'System' }
    ];
    
    // Draw details boxes
    detailsLeft.forEach((detail, index) => {
      addBorderedText(`${detail.label} ${detail.value}`, margin, 20 + (index * 6), 90, 5, 'left', false);
    });
    
    detailsRight.forEach((detail, index) => {
      addBorderedText(`${detail.label} ${detail.value}`, pageWidth - 100, 20 + (index * 6), 90, 5, 'left', false);
    });

    // Create table data
    const tableData = dataToExport.map(row => [
      row.date || '',
      row.voucherNo || '',
      row.refNo || '',
      row.refDate || '',
      row.Narration || '',
      row.debit || '',
      row.credit || '',
      row.balance || ''
    ]);

    // Add totals row
    const totalsRow = ['', '', '', '', 'TOTAL:', 
      formatCurrency(totalDebitCalc), 
      formatCurrency(totalCreditCalc), 
      ''];
    
    tableData.push(totalsRow);

    // Generate table with autoTable
    autoTable(doc, {
      startY: tableStartY,
      head: [[
        { content: 'VOUCH DATE', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'VOUCHER NO.', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'REF NO.', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'REF DATE', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'DESCRIPTION', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'DEBIT', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'CREDIT', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'BALANCE', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } }
      ]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center' }, // Date
        1: { cellWidth: 22, halign: 'center' }, // Voucher No
        2: { cellWidth: 20, halign: 'center' }, // Ref No
        3: { cellWidth: 18, halign: 'center' }, // Ref Date
        4: { cellWidth: 60 }, // Description
        5: { cellWidth: 22, halign: 'right' }, // Debit
        6: { cellWidth: 22, halign: 'right' }, // Credit
        7: { cellWidth: 22, halign: 'right' }  // Balance
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      },
      didParseCell: function(data) {
        // Highlight totals row
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [220, 230, 241];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [0, 0, 0];
        }
        
        // Format currency columns
        if (data.column.index === 5 || data.column.index === 6 || data.column.index === 7) {
          if (data.cell.raw) {
            // Add thousand separators if not already formatted
            const num = parseFloat(data.cell.raw.toString().replace(/[^0-9.-]+/g, ""));
            if (!isNaN(num)) {
              data.cell.text = num.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              });
            }
          }
        }
      },
      margin: { left: margin, right: margin }
    });

    // Get the final Y position after the table
    const finalY = doc.lastAutoTable.finalY || tableStartY + 100;

    // Footer section
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    
    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
    
    // Footer text
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, pageHeight - 15);
    doc.text(`PDL Ledger Report - ${data.AcCode}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text('Page 1 of 1', pageWidth - margin, pageHeight - 15, { align: 'right' });

    // Signature section
    const signatureY = finalY + 15;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    // Prepared by
    doc.text('Prepared By:', margin + 20, signatureY);
    doc.setDrawColor(0, 0, 0);
    doc.line(margin + 50, signatureY - 2, margin + 100, signatureY - 2);
    doc.text(data.PrintedBy || '_________________', margin + 75, signatureY + 3, { align: 'center' });
    
    // Reviewed by
    
    doc.text('Reviewed By:', pageWidth / - 30, signatureY);
    doc.line(pageWidth / 2, signatureY - 2, pageWidth / 2 + 50, signatureY - 2);
    
    // Approved by
    
    doc.text('Approved By:', pageWidth - 60, signatureY);
    doc.line(pageWidth - 80, signatureY - 2, pageWidth - 30, signatureY - 2);
    

    // Save the PDF
    const fileName = `Ledger_${data.AcCode || 'Report'}_${formatDate(data.startDate)}_to_${formatDate(data.endDate)}_${new Date().getTime()}.pdf`;
    doc.save(fileName);

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
    //console.log(VoucherNumber.slice(3))
    const res = data.invoice.find((item) => item.DitributorInvoiceCode == VoucherNumber.slice(3))
    if(res){
      const DcNumber = data.DC.find((item)=> item.DCCode == res.DcNumber)
      //console.log(DcNumber)
    return DcNumber  
    }
    return res

  }
  const getInvDet = (VoucherNumber) => {
    const res = data.sales.find((item) => item.SalesInvoice == VoucherNumber)

    return res

  }

  const getData = async () => {
    setIsLoading(true);
    try {

      // ===== Show All Balance (trial-balance style summary) =====
      if (data.showAll) {
        setShowAllMode(true);

        let transporters = Array.isArray(data.Transporters) ? data.Transporters : [];
        if (transporters.length === 0) {
          const tRes = await getDataFundtion("/Transport");
          transporters = tRes.data || [];
        }

        const transporterEntries = await Promise.all(
          transporters.map(async (tp) => {
            try {
              const res = await getDataFundtion(
                `GernalLager/TransporterlLager?startDate=${data.startDate}&endDate=${data.endDate}&Transporter=${tp._id}`
              );
              return { transporter: tp, entries: res || [] };
            } catch (err) {
              return { transporter: tp, entries: [] };
            }
          })
        );

        const summary = transporterEntries.map(({ transporter, entries }) => {
          let opening = 0;
          let debit = 0;
          let credit = 0;
          entries.forEach((item) => {
            const d = item.Debit ? parseFloat(item.Debit) : 0;
            const c = item.Credit ? parseFloat(item.Credit) : 0;
            if (item.Type === "VoucherBefore") {
              opening += d - c;
            } else {
              debit += d;
              credit += c;
            }
          });
          return {
            transporterId: transporter._id,
            transporterName: transporter.TransporterName || "",
            opening,
            debit,
            credit,
            balance: opening + debit - credit,
          };
        });

        setAllBalanceData(summary);
        setLedgerData([]);
        setFilteredData([]);
        return;
      }

      setShowAllMode(false);

      const Accountdata = await getDataFundtion(
        `GernalLager/TransporterlLager?startDate=${data.startDate}&endDate=${data.endDate}&Transporter=${data.Transporter}`
      );
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
      transformedData.push({
        date: formattedPrevDate,
        voucherNo: '',
        refNo: '',
        refDate: '',
        description: `OPENING BAL. AS ON : ${formattedPrevDate}`,
        balance: openingBalance < 0 ? `(${formatAmount(Math.abs(openingBalance))})` : formatAmount(openingBalance),
        rawDebit: openingBalance > 0 ? openingBalance : 0,
        rawCredit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
        rawBalance: openingBalance
      });

      let debitTotal = 0;
      let creditTotal = 0;

      // Main entries
      mainEntries.forEach(item => {
        const debit = item.Debit ? parseFloat(item.Debit) : 0;
        const credit = item.Credit ? parseFloat(item.Credit) : 0;

        debitTotal += debit;
        creditTotal += credit;

        runningBalance += debit - credit;

        transformedData.push({
          date: formatDate(item.VoucherDate),
          voucherNo: item.VoucherNumber,
          refNo: item?.Cheque || getInv(item.VoucherNumber)?.BiltyNumber ,
          refDate: formatDate(getInv(item.VoucherNumber)?.DCDate) || "",
          debit: debit > 0 ? formatAmount(debit) : '',
          credit: credit > 0 ? formatAmount(credit) : '',
          balance: formatAmount(runningBalance),
          Accountdata: item.VoucharData,
          Narration: `DC${getInv(item.VoucherNumber)?.DCCode}`,
          rawDebit: debit,
          rawCredit: credit,
          rawBalance: runningBalance,
          id: item._id,
          VoucherType: item.VoucherType
        });
      });

      setLedgerData(transformedData);
      setFilteredData(transformedData); // Initialize filtered data
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

  const formatSummaryAmount = (amount) => {
    return Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Summary rows filtered by the search box (show-all mode)
  const filteredSummary = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();
    return allBalanceData.filter(
      (row) => !term || (row.transporterName || "").toLowerCase().includes(term)
    );
  }, [allBalanceData, searchTerm]);

  const summaryTotals = useMemo(() => {
    return allBalanceData.reduce(
      (acc, row) => {
        acc.opening += row.opening || 0;
        acc.debit += row.debit || 0;
        acc.credit += row.credit || 0;
        acc.balance += row.balance || 0;
        return acc;
      },
      { opening: 0, debit: 0, credit: 0, balance: 0 }
    );
  }, [allBalanceData]);

  const exportSummaryToExcel = async () => {
    setIsExporting(true);
    try {
      await exportProfessionalExcel({
        title: 'Transporter Balance Summary',
        fileName: 'Transporter_Balance_Summary',
        sheetName: 'Summary',
        rows: filteredSummary.map((row, index) => ({
          "SR": index + 1,
          "TRANSPORTER NAME": row.transporterName,
          "OPENING": row.opening,
          "DEBIT": row.debit,
          "CREDIT": row.credit,
          "BALANCE": row.balance
        })),
        meta: [
          `Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
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

  const exportSummaryToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(14);
    doc.text("Transporter Balance Summary", 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`, 14, 22);

    const body = filteredSummary.map((row, index) => [
      String(index + 1),
      row.transporterName || "",
      formatSummaryAmount(row.opening),
      formatSummaryAmount(row.debit),
      formatSummaryAmount(row.credit),
      formatSummaryAmount(row.balance)
    ]);

    body.push([
      "",
      "TOTAL",
      formatSummaryAmount(summaryTotals.opening),
      formatSummaryAmount(summaryTotals.debit),
      formatSummaryAmount(summaryTotals.credit),
      formatSummaryAmount(summaryTotals.balance)
    ]);

    autoTable(doc, {
      startY: 30,
      head: [[
        { content: 'SR', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'TRANSPORTER NAME', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'OPENING', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'DEBIT', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'CREDIT', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
        { content: 'BALANCE', styles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } }
      ]],
      body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === body.length - 1) {
          data.cell.styles.fillColor = [220, 230, 241];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [0, 0, 0];
        }
        if (data.column.index >= 2) {
          data.cell.styles.halign = 'right';
        }
      }
    });

    doc.save("Transporter_Balance_Summary.pdf");
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
      <ReportPopupHeader title="Transporter Ledger" />

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

          {!showAllMode && (
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
          )}

          {!showAllMode && (
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
          )}

          <div style={styles.filterGroup}>
            <button onClick={clearFilters} style={styles.clearButton}>
              Clear Filters
            </button>
            <span style={styles.resultCount}>
              {showAllMode
                ? `Showing ${filteredSummary.length} of ${allBalanceData.length} records`
                : `Showing ${filteredData.length} of ${ledgerData.length} records`}
            </span>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div style={styles.exportButtons}>
        <button
          onClick={showAllMode ? exportSummaryToExcel : exportToExcel}
          style={styles.exportButton}
          disabled={isExporting || (showAllMode ? allBalanceData.length === 0 : ledgerData.length === 0)}
        >
          {isExporting ? 'Exporting...' : 'Export Excel'}
        </button>
        <button
          onClick={showAllMode ? exportSummaryToPDF : exportToPDF}
          style={styles.exportButton}
          disabled={isExporting || (showAllMode ? allBalanceData.length === 0 : ledgerData.length === 0)}
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
          </div>            <h3 style={styles.ledgerTitle}>
              {showAllMode
                ? `ALL TRANSPORTERS BALANCE - FROM ${formatDate(data.startDate)} TO ${formatDate(data.endDate)}`
                : `LEDGER - FROM ${formatDate(data.startDate)} TO ${formatDate(data.endDate)}`}
            </h3>

            <div style={styles.accountInfo}>
              {showAllMode ? (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Transporter:</span>
                  <span style={styles.infoValue}>All Transporters</span>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

        {/* Ledger Table */}
        {showAllMode ? (
          <div style={styles.ledgerTableContainer}>
            <table style={styles.ledgerTable}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>SR</th>
                  <th style={styles.tableHeader}>TRANSPORTER NAME</th>
                  <th style={styles.tableHeader}>OPENING</th>
                  <th style={styles.tableHeader}>DEBIT</th>
                  <th style={styles.tableHeader}>CREDIT</th>
                  <th style={styles.tableHeader}>BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {filteredSummary.map((row, index) => (
                  <tr
                    key={index}
                    style={{
                      ...styles.tableRow,
                      backgroundColor: index % 2 === 0 ? '#f9fafc' : '#ffffff'
                    }}
                  >
                    <td style={styles.tableCell}>{index + 1}</td>
                    <td style={styles.tableCell}><strong>{row.transporterName}</strong></td>
                    <td style={{ ...styles.tableCell, ...styles.amount }}>{formatSummaryAmount(row.opening)}</td>
                    <td style={{ ...styles.tableCell, ...styles.amount }}>{formatSummaryAmount(row.debit)}</td>
                    <td style={{ ...styles.tableCell, ...styles.amount }}>{formatSummaryAmount(row.credit)}</td>
                    <td style={{ ...styles.tableCell, ...styles.amount, ...styles.balance }}>{formatSummaryAmount(row.balance)}</td>
                  </tr>
                ))}
                {filteredSummary.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ ...styles.tableCell, textAlign: 'center', color: '#95a5a6' }}>
                      No transporter data found
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ ...styles.tableCell, ...styles.totalLabel, textAlign: 'right', fontWeight: 'bold' }}>
                    TOTALS
                  </td>
                  <td style={{ ...styles.tableCell, ...styles.totalAmount }}>{formatSummaryAmount(summaryTotals.opening)}</td>
                  <td style={{ ...styles.tableCell, ...styles.totalAmount }}>{formatSummaryAmount(summaryTotals.debit)}</td>
                  <td style={{ ...styles.tableCell, ...styles.totalAmount }}>{formatSummaryAmount(summaryTotals.credit)}</td>
                  <td style={{ ...styles.tableCell, ...styles.totalAmount }}>{formatSummaryAmount(summaryTotals.balance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div style={styles.ledgerTableContainer}>
            <table style={styles.ledgerTable}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>VOUCH DATE</th>
                <th style={styles.tableHeader}>VOUCHER NO.</th>
                <th style={styles.tableHeader}>CHO / BILL NO.</th>
                <th style={styles.tableHeader}>CHO / BILL DT.</th>
                <th style={styles.tableHeader}>DESCRIPTION</th>
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
        )}

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