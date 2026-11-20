import React, { useState, useEffect } from 'react';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { saveAs } from "file-saver";
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { useSelector } from 'react-redux';
import ReportPopupHeader from '../../../../Components/Global/ReportPopupHeader.jsx';


const CashBookPopup = ({ data }) => {
  console.log(data)
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ledgerData, setLedgerData] = useState([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0); // Opening balance from state
  const [allStore, setAllStore] = useState([])
  const [paymentReceivedData, setPaymentReceivedData] = useState([]);
  const [paymentReceivedTotal, setPaymentReceivedTotal] = useState(0);

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
    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      isNaN(Number(amount)) ||
      Number(amount) === 0
    ) {
      return "";
    }

    const value = Number(amount);
    const formattedValue = Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return value < 0 ? `(${formattedValue})` : formattedValue;
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const dataToExport = filteredData.length > 0 ? filteredData : ledgerData;

      const rawData = dataToExport.map(item => ({
        "VOUCH DATE": item.date,
        "VOUCHER NO.": item.voucherNo,
        "STORE": item.store || "",
        "ACCOUNT": item.Account || "",
        "CHO / BILL NO.": item.refNo,
        "CHO / BILL DT.": item.refDate,
        "DESCRIPTION": item.description,
        "DEBIT": item.rawDebit || 0,
        "CREDIT": item.rawCredit || 0,
        "BALANCE": item.rawBalance || 0
      }));

      const totalsRow = {
        "VOUCH DATE": "",
        "VOUCHER NO.": "",
        "STORE": "",
        "ACCOUNT": "",
        "CHO / BILL NO.": "",
        "CHO / BILL DT.": "",
        "DESCRIPTION": "TOTAL",
        "DEBIT": rawData.reduce((sum, row) => sum + (row.DEBIT || 0), 0),
        "CREDIT": rawData.reduce((sum, row) => sum + (row.CREDIT || 0), 0),
        "BALANCE": ""
      };

      const paymentRows = paymentReceivedData.map((item) => ({
        "VOUCH DATE": item.date,
        "VOUCHER NO.": item.voucherNo,
        "STORE": item.Store || "",
        "ACCOUNT": item.Account || "",
        "CHO / BILL NO.": item.refDate || "",
        "CHO / BILL DT.": "",
        "DESCRIPTION": `Payment Received - ${item.Client || ""} ${item.description || ""}`.trim(),
        "DEBIT": 0,
        "CREDIT": item.amount || 0,
        "BALANCE": item.Status || ""
      }));

      if (paymentRows.length > 0) {
        paymentRows.push({
          "VOUCH DATE": "",
          "VOUCHER NO.": "",
          "STORE": "",
          "ACCOUNT": "",
          "CHO / BILL NO.": "",
          "CHO / BILL DT.": "",
          "DESCRIPTION": "PAYMENT RECEIVED TOTAL",
          "DEBIT": 0,
          "CREDIT": paymentReceivedTotal,
          "BALANCE": ""
        });
      }

      const filtersApplied = [
        searchTerm ? `Search: ${searchTerm}` : "",
        dateFilter ? `Date: ${dateFilter}` : "",
        voucherFilter ? `Voucher: ${voucherFilter}` : ""
      ].filter(f => f).join(", ") || "None";

      await exportProfessionalExcel({
        title: 'Cash Book',
        fileName: 'CashBook_Report',
        sheetName: 'Cash Book',
        rows: [...rawData, totalsRow, ...paymentRows],
        meta: [
          `Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
          `Account: ${data.AcCode} - ${data.AcName}`,
          `Opening Balance: ${formatCurrency(openingBalance)}`,
          `Filters: ${filtersApplied}`,
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
      const doc = new jsPDF('portrait');
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(16);
      doc.text("PDL - Cash Book Report", pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Period: ${formatDate(data.startDate)} - ${formatDate(data.endDate)}`, 14, 25);
      doc.text(`Opening Balance: ${formatCurrency(openingBalance)} ${openingBalance < 0 ? '(Cr)' : '(Dr)'}`, 14, 32);
      doc.text(`Account: ${data.AcCode} - ${data.AcName}`, 14, 39);

      // Get data for export (same as view)
      const dataToExport = filteredData.length > 0 ? filteredData : ledgerData;

      // Movement rows exclude opening balance row for correct totals (matching UI)
      const movementData = dataToExport.filter(row => {
        const desc = (row.description || '').toUpperCase();
        return !desc.includes('OPENING BALANCE');
      });

      // Calculate totals ONLY from movement rows (matches how UI computes totalDebit/totalCredit)
      const totalForDebitCol = movementData.reduce((sum, row) => sum + (Number(row.rawCredit) || 0), 0);
      const totalForCreditCol = movementData.reduce((sum, row) => sum + (Number(row.rawDebit) || 0), 0);
      const closingBalance = openingBalance + totalForCreditCol - totalForDebitCol;

      // Prepare table rows - match UI table columns and values exactly
      const tableRows = dataToExport.map(row => {
        const descUpper = (row.description || '').toUpperCase();
        const isOpeningRow = descUpper.includes('OPENING BALANCE');

        // For opening row: blank DEBIT/CREDIT columns (like UI), only balance carries forward
        const debitCol = isOpeningRow ? "" : (formatCurrency(row.rawDebit) || "");
        const creditCol = isOpeningRow ? "" : (formatCurrency(row.rawCredit) || "");

        return [
          row.date || '',
          row.voucherNo || "",
          row.store || "",
          row.Account || '',
          row.description || '',
          debitCol,
          creditCol,
          row.rawBalance !== undefined ? formatCurrency(row.rawBalance) : ""
        ];
      });

      // Add TOTAL row (sums of movements only)
      tableRows.push([
        '',
        '',
        '',
        '',
        'TOTAL',
        formatCurrency(totalForCreditCol) || '0.00',
        formatCurrency(totalForDebitCol) || '0.00',
        ''
      ]);

      // Add CLOSING BALANCE row (computed same formula as UI footer)
      tableRows.push([
        '',
        '',
        '',
        '',
        'CLOSING BALANCE',
        '',
        '',
        formatCurrency((closingBalance)) + (closingBalance < 0 ? ' (Cr)' : ' (Dr)')
      ]);

      // Create table with autoTable - columns now match UI order: DEBIT then CREDIT
      autoTable(doc, {
        head: [["Date", "Voucher No", "Store", "Account", "Description", "DEBIT (Dr)", "CREDIT (Cr)", "Balance"]],
        body: tableRows,
        startY: 45,
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255],
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },
        columnStyles: {
          0: { cellWidth: 22, halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 22 },
          3: { cellWidth: 30 },
          4: { cellWidth: 40 },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 22, halign: 'right' },
          7: { cellWidth: 22, halign: 'right' },
        },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap',
        },
        margin: { top: 45, left: 5, right: 12.7 },
        didDrawPage: function (hookData) {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.text(
            `Page ${hookData.pageNumber} of ${pageCount}`,
            pageWidth - 20,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'right' }
          );
          doc.text(
            `Generated: ${new Date().toLocaleString()}`,
            14,
            doc.internal.pageSize.getHeight() - 10
          );
        },
      });

      if (paymentReceivedData.length > 0) {
        const finalY = doc.lastAutoTable?.finalY || 45;
        doc.setFontSize(11);
        doc.text("Payment Received Summary", 14, finalY + 12);
        doc.setFontSize(8);
        doc.text(`Account: ${data.AcCode} - ${data.AcName}`, 14, finalY + 17);

        autoTable(doc, {
          startY: finalY + 20,
          head: [["Receipt Date", "Receipt No", "Client", "Description", "Amount", "Status"]],
          body: [
            ...paymentReceivedData.map((r) => [
              r.date || "",
              r.voucherNo || "",
              r.Client || "",
              r.description || "",
              (r.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              r.Status || ""
            ]),
            ["", "", "", "TOTAL", paymentReceivedTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), ""]
          ],
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontSize: 8,
            fontStyle: 'bold',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
          },
          bodyStyles: {
            fontSize: 7,
            cellPadding: 2,
            textColor: [0, 0, 0],
          },
          columnStyles: {
            4: { halign: "right" },
          },
          margin: { left: 5, right: 12.7 },
        });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "").split('T')[0];
      doc.save(`CashBook_Report_${timestamp}.pdf`);

    } catch (error) {
      console.error("Export to PDF failed:", error);
      alert("Failed to export to PDF. Please try again. Error: " + error.message);
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
      link.download = "CashBook_Report.html";
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
        alert("Cash Book content not found.");
        return;
      }

      const content = element.cloneNode(true);
      const htmlContent = `
      <html>
        <head>
          <title>Cash Book Report</title>
          <style>
            /* Copy your styles here */
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background: #34495e; color: white; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `;

      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "").split('T')[0];
      saveAs(blob, `CashBook_Report_${timestamp}.doc`);
    } catch (error) {
      console.error("Export to Word failed:", error);
      alert("Failed to export to Word. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
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
      // Get opening balance from previous day
      const previousDate = new Date(data.startDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const before = previousDate.toISOString().split('T')[0];

      const openingBalanceData = await getDataFundtion(
        `GernalLager?startDate=${before}&endDate=${before}&Account=${data.Account}&Store=`
      );


      // Calculate opening balance
      const totalDebitOpening = openingBalanceData.reduce((sum, row) => sum + (Number(row.Debit) || 0), 0);
      const totalCreditOpening = openingBalanceData.reduce((sum, row) => sum + (Number(row.Credit) || 0), 0);

      const calculatedOpeningBalance = totalDebitOpening - totalCreditOpening
      setOpeningBalance(calculatedOpeningBalance);

      // Get cash book data for the period
      const cashBookData = await getDataFundtion(
        `GernalLager/CashBook?startDate=${data.startDate}&endDate=${data.endDate}&Account=${data.Account}`
      );

      const store = await getDataFundtion("/store");
      const storeList = store.data || [];
      setAllStore(storeList);
      // Process and flatten the data
      let runningBalance = calculatedOpeningBalance;
      let debitTotal = 0;
      let creditTotal = 0;
      const transformedData = [];

      // Add opening balance row
      const prevDate = new Date(data.startDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const formattedPrevDate = formatDate(prevDate.toISOString());

      transformedData.push({
        date: formattedPrevDate,
        id: '',
        voucherNo: '',
        refNo: '',
        refDate: '',
        description: `OPENING BALANCE AS ON ${formattedPrevDate}`,
        debit: '',
        credit: '',

        balance: formatCurrency(calculatedOpeningBalance > 0 ? calculatedOpeningBalance : `-${(calculatedOpeningBalance)}`),
        rawDebit: calculatedOpeningBalance < 0 ? calculatedOpeningBalance : 0,
        rawCredit: calculatedOpeningBalance > 0 ? Math.abs(calculatedOpeningBalance) : 0,
        rawBalance: calculatedOpeningBalance
      });

      // Process each voucher in the cash book data
      cashBookData.forEach((voucher) => {
        const voucherDate = formatDate(voucher.VoucherDate);

        // Process each entry in VoucharData
        voucher.VoucharData.forEach((entry) => {
          // ✅ CRITICAL FILTER: Only process entries for the selected account
          if (entry.Account == data.Account) {
            return; // Skip this entry - it's for a different account
          }

          const debit = parseFloat(entry.Credit) || 0;
          const credit = parseFloat(entry.Debit) || 0;

          // Find account details with proper error handling
          let accountName = "";
          let accountCode = "";

          if (data.chartofAccount && data.chartofAccount.length > 0) {
            const AccountDetail = data.chartofAccount.find((item) => item._id === entry.Account);

            if (AccountDetail) {
              // Try different possible property names
              accountName = AccountDetail.AccountName ||
                AccountDetail.accountName ||
                AccountDetail.name ||
                AccountDetail.Name ||
                AccountDetail.account_name ||
                "";

              accountCode = AccountDetail.AccountCode ||
                AccountDetail.accountCode ||
                AccountDetail.code ||
                AccountDetail.Code ||
                "";

              console.log("Account Detail found for entry:", accountCode, accountName);
            } else {
              console.warn(`Account not found for ID: ${entry.Account}`);
              accountName = `Account ID: ${entry.Account}`;
            }
          } else {
            console.warn("chartofAccount is not available or empty");
            accountName = `Account ID: ${entry.Account}`;
          }

          debitTotal += debit;
          creditTotal += credit;
          runningBalance += debit - credit;

          // Create description
          const description = entry.Narration || '';

          transformedData.push({
            id: voucher._id,
            date: voucherDate,
            voucherNo: voucher.VoucherNumber,
            voucherType: voucher.VoucherType,
            accountId: entry.Account,
            Account: accountCode ? `${accountCode} - ${accountName}` : accountName,
            accountCode: accountCode,
            refNo: entry.ChequeNo || entry.RefNo || "",
            refDate: entry.ChequeDate || entry.RefDate || "",
            description: description,
            narration: entry.Narration || "",
            credit: debit > 0 ? formatCurrency(debit) : '',
            debit: credit > 0 ? formatCurrency(credit) : '',
            balance: formatCurrency(runningBalance),
            rawDebit: debit,
            rawCredit: credit,
            rawBalance: runningBalance,
            store: storeList.find((st) => st._id == entry.store)?.StoreName || entry.store || ''
          });
        });
      });

      console.log("Filtered Transformed Data (only selected account):", transformedData);
      console.log("Total Debit:", debitTotal);
      console.log("Total Credit:", creditTotal);
      console.log("Running Balance:", runningBalance);

      setLedgerData(transformedData);
      setFilteredData(transformedData);
      setTotalDebit(debitTotal);
      setTotalCredit(creditTotal);

      try {
        const DistributorRes = await getDataFundtion("/Distrbutor/DistrbutorNameId");
        const distributors = Array.isArray(DistributorRes)
          ? DistributorRes
          : (DistributorRes?.data || []);

        let paymentData = await getDataFundtion(
          `PaymentRecived/PaymentReciptReport?startDate=${data.startDate}&endDate=${data.endDate}&Account=&Store=`
        );
console.log(paymentData)
        if (!Array.isArray(paymentData)) {
          paymentData = paymentData?.data || [];
        }

        if (Array.isArray(data.store) && data.store.length > 0) {
          paymentData = paymentData.filter((item) => data.store.includes(item.Store));
        }

        const mainPaymentEntries = paymentData
          .filter((item) =>
            item.Type === "Voucher" &&
            (!data.Account || !item.ReciptMainAccount || item.ReciptMainAccount == data.Account)
          )
          .sort((a, b) => new Date(a.VoucherDate || 0) - new Date(b.VoucherDate || 0));

        const formatAmount = (amount) =>
          amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const paymentRows = mainPaymentEntries.map((item) => {
          const debit = item.Debit ? parseFloat(item.Debit) : 0;
          const credit = item.Credit ? parseFloat(item.Credit) : 0;
          const amount = credit > 0 ? credit : debit;
          const distributor = distributors.find((d) => d._id == item.Client);
          const accountObj = data.chartofAccount?.find((ac) => ac._id == item.ReciptMainAccount);
          const storeObj = storeList.find((st) => st._id == item.Store)
            || data.allStore?.find((st) => st._id == item.Store || st.value == item.Store);

          return {
            date: formatDate(item.VoucherDate),
            voucherNo: item.VoucherNumber || "",
            Client: distributor?.DistrbutorName || "",
            description: item.Narration || "",
            amount,
            formattedAmount: amount > 0 ? formatAmount(amount) : "",
            Status: item.status == "true" ? "Voucher" : item.status == "Reject" ? "Reject" : "Pending",
            Account: accountObj?.AccountName || "",
            Store: storeObj?.StoreName || storeObj?.label || "",
            refDate: item.Ref || "",
          };
        });

        const paymentTotal = paymentRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
        setPaymentReceivedData(paymentRows);
        setPaymentReceivedTotal(paymentTotal);
      } catch (paymentErr) {
        console.error("Error fetching payment received summary:", paymentErr);
        setPaymentReceivedData([]);
        setPaymentReceivedTotal(0);
      }

    } catch (err) {
      console.error("Error fetching cash book data:", err);
      alert("Error loading cash book data. Please check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (data && data.startDate && data.endDate && data.Account) {
      getData();
    }
  }, [data]);

  const handlePrint = () => {
    const content = document.getElementById("ledger-content");
    if (!content) return;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
      <head>
        <title>Cash Book Report</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 5mm 111.6mm 12.7mm; }
          *, *::before, *::after { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #000; background: #fff; width: 100%; padding-bottom: 100mm; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #000; padding: 5px 6px; text-align: left; }
          th { background: #fff; color: #000; font-weight: 600; border-bottom: 2px solid #000; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .header { text-align: center; margin-bottom: 12px; }
          .header h1 { font-size: 20px; margin: 0; }
          .header h2 { font-size: 14px; margin: 4px 0; }
          .info { display: flex; gap: 30px; font-size: 12px; margin-bottom: 12px; }
          .footer { display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px; }
          .footer div { text-align: center; }
          .amount { text-align: right; font-family: 'Courier New', monospace; }
          .total-row { font-weight: bold; border-top: 2px solid #000; }
          .balance { font-weight: 700; }
          .print-footer { page-break-before: always; margin-top: 50.8mm; }
          @media print { body { padding: 0; margin: 0; } }
          h3 { font-size: 13px; margin: 12px 0 6px; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <div style="margin-top:20px;font-size:9px;text-align:center;color:#333;border-top:1px solid #000;padding-top:6px;">
          Developed by JS International | Website: https://jaffersons.com/ | Contact: 0301-8251291
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  useEffect(() => {
    if (!isLoading && ledgerData.length > 0) {
      handlePrint();
    }
  }, [isLoading, ledgerData]);

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
      <ReportPopupHeader title="Cash Book" />

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
          <p>Loading cash book data...</p>
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
              placeholder="Search in description/voucher..."
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

      {/* Cash Book Content */}
      <div id="ledger-content" style={styles.ledgerContent}>
        <div style={styles.ledgerHeader}>
          <div style={styles.headerTop}>
            <div style={styles.headerLeft}>
              <span style={styles.dateTime}>Date & Time: {formatDate(Date.now())} {currentTime}</span>
              <h2 style={styles.companyName}>PDL - CASH BOOK</h2>
            </div>
            <div style={styles.headerRight}>
              <div style={styles.logoPlaceholder}>
                <img style={styles.logo} src="https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png" alt="logo" />
              </div>
            </div>
          </div>

          <h3 style={styles.ledgerTitle}>CASH BOOK - FROM {formatDate(data.startDate)} TO {formatDate(data.endDate)}</h3>

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
              <span style={styles.infoLabel}>OPENING BALANCE:</span>
              <span style={styles.infoValue}>{formatCurrency((openingBalance))}
                {openingBalance < 0 ? ' (Cr)' : ' (Dr)'}
              </span>
            </div>
          </div>
        </div>

        {/* Cash Book Table */}
        <div style={styles.ledgerTableContainer}>
          <table style={styles.ledgerTable}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>VOUCH DATE</th>
                <th style={styles.tableHeader}>VOUCHER NO.</th>
                <th style={styles.tableHeader}>Store.</th>
                <th style={styles.tableHeader}>Account</th>
                <th style={styles.tableHeader}>DESCRIPTION</th>
                <th style={styles.tableHeader}>DEBIT (Dr)</th>
                <th style={styles.tableHeader}>CREDIT (Cr)</th>
                <th style={styles.tableHeader}>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, index) => (
                <tr
                  key={index}
                  style={{
                    ...styles.tableRow,
                    backgroundColor: '#ffffff'
                  }}
                >
                  <td style={styles.tableCell}>{row.date}</td>
                  <td
                    style={{
                      ...styles.tableCell,
                      ...styles.voucherCell,
                      cursor: row.voucherNo ? "pointer" : "default",
                      textDecoration: row.voucherNo ? "underline" : "none",
                      color: row.voucherNo ? "blue" : "inherit"
                    }}
                    onClick={() => row.voucherNo && openVoucherModal(row.id, row.voucherType, row.voucherNo)}
                  >
                    {row.voucherNo || ""}
                  </td>
                  <td style={{ ...styles.tableCell, ...styles.descriptionCell }}>{row.store}</td>
                  <td style={{ ...styles.tableCell, ...styles.descriptionCell }}>{row.Account}</td>
                  <td style={{ ...styles.tableCell, ...styles.descriptionCell }}>{row.description}</td>
                  <td style={{ ...styles.tableCell, ...styles.amount }}>{row.credit || ""}</td>
                  <td style={{ ...styles.tableCell, ...styles.amount }}>{row.debit || ""}</td>
                  <td
                    style={{
                      ...styles.tableCell,
                      ...styles.amount,
                      ...styles.balance,
                    }}
                  >
                    {formatCurrency(row.rawBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" style={{ ...styles.tableCell, ...styles.totalLabel, textAlign: 'right', fontWeight: 'bold' }}>
                  GRAND TOTALS
                </td>
                <td></td>


                <td style={{ ...styles.tableCell, ...styles.totalAmount }}>
                  {formatTotal(totalDebit)}
                </td>
                <td style={{ ...styles.tableCell, ...styles.totalAmount }}>
                  {formatTotal(totalCredit)}
                </td>
                <td style={styles.tableCell}></td>
              </tr>
              <tr>
                <td colSpan="4" style={{ ...styles.tableCell, ...styles.totalLabel, textAlign: 'right', fontWeight: 'bold' }}>
                  CLOSING BALANCE
                </td>
                <td colSpan="3" style={{ ...styles.tableCell, ...styles.totalAmount, fontWeight: 'bold' }}>
                  {formatTotal(openingBalance + totalDebit - totalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Received Summary - from Payment Realize Report */}
        <div style={styles.paymentSummarySection}>
          <h3 style={styles.paymentSummaryTitle}>PAYMENT RECEIVED SUMMARY</h3>
          <div style={styles.paymentSummaryMeta}>
            Account: {data.AcCode} - {data.AcName}
          </div>
          {paymentReceivedData.length > 0 && (
            <div style={styles.paymentStats}>
              <span style={styles.paymentStatItem}>
                Receipts: <strong>{paymentReceivedData.length}</strong>
              </span>
              <span style={styles.paymentStatItem}>
                Voucher: <strong>{formatTotal(paymentReceivedData.filter((r) => r.Status === "Voucher").reduce((s, r) => s + (r.amount || 0), 0))}</strong>
              </span>
              <span style={styles.paymentStatItem}>
                Pending: <strong>{formatTotal(paymentReceivedData.filter((r) => r.Status === "Pending").reduce((s, r) => s + (r.amount || 0), 0))}</strong>
              </span>
              <span style={styles.paymentStatItem}>
                Reject: <strong>{formatTotal(paymentReceivedData.filter((r) => r.Status === "Reject").reduce((s, r) => s + (r.amount || 0), 0))}</strong>
              </span>
              <span style={styles.paymentStatItem}>
                Total: <strong>{formatTotal(paymentReceivedTotal)}</strong>
              </span>
            </div>
          )}
          {!isLoading && paymentReceivedData.length === 0 ? (
            <p style={styles.paymentSummaryEmpty}>
              No payment received for this account in the selected period.
            </p>
          ) : paymentReceivedData.length > 0 ? (
            <div style={styles.paymentSummaryTableWrap}>
              <table style={styles.paymentSummaryTable}>
                <thead>
                  <tr>
                    <th style={styles.paymentSummaryHeader}>Receipt Date</th>
                    <th style={styles.paymentSummaryHeader}>Receipt No</th>
                    <th style={styles.paymentSummaryHeader}>Client</th>
                    <th style={styles.paymentSummaryHeader}>Description</th>
                    <th style={styles.paymentSummaryHeader}>Amount</th>
                    <th style={styles.paymentSummaryHeader}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentReceivedData.map((row, index) => (
                    <tr
                      key={`${row.voucherNo}-${index}`}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#f9fafc' : '#ffffff'
                      }}
                    >
                      <td style={styles.paymentSummaryCell}>{row.date}</td>
                      <td style={styles.paymentSummaryCell}>{row.voucherNo}</td>
                      <td style={styles.paymentSummaryCell}>{row.Client}</td>
                      <td style={{ ...styles.paymentSummaryCell, ...styles.descriptionCell }}>{row.description}</td>
                      <td style={{ ...styles.paymentSummaryCell, ...styles.amount }}>{row.formattedAmount}</td>
                      <td
                        style={{
                          ...styles.paymentSummaryCell,
                          fontWeight: 600,
                          color: row.Status === "Voucher" ? "#166534" : row.Status === "Reject" ? "#b91c1c" : "#b45309"
                        }}
                      >
                        {row.Status}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan="4"
                      style={{
                        ...styles.paymentSummaryCell,
                        ...styles.totalLabel,
                        textAlign: 'right',
                        fontWeight: 'bold'
                      }}
                    >
                      TOTAL
                    </td>
                    <td style={{ ...styles.paymentSummaryCell, ...styles.totalAmount }}>
                      {formatTotal(paymentReceivedTotal)}
                    </td>
                    <td style={styles.paymentSummaryCell}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : null}
        </div>

        {/* Cash Book Footer */}
        <div className="print-footer" style={styles.ledgerFooter}>
          <div style={styles.footerItem}>
            <span>Prepared By:</span>
            <div style={styles.signature}>{data.PrintedBy || '_________________'}</div>
          </div>
          <div style={styles.footerItem}>
            <span>Reviewed By:</span>
            <div style={styles.signature}>_________________</div>
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
            {/* Modal content */}
          </div>
        </div>
      )}
    </div>
  );
};

// CSS-in-JS styles
const styles = {
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
  },
  resultCount: {
    fontSize: '14px',
    color: '#6c757d',
    marginTop: '5px',
  },
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
    minWidth: '120px',
  },
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
    // Styles
  },
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
    minWidth: '800px',
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
  },
  tableCell: {
    padding: '12px 18px',
    fontSize: '14px',
  },
  amount: {
    textAlign: 'right',
    fontFamily: "'Courier New', Courier, monospace",
    fontWeight: '500',
  },
  balance: {
    fontWeight: '600',
  },
  voucherCell: {
    fontWeight: '500',
  },
  descriptionCell: {
    maxWidth: '300px',
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
    fontSize: '15px',
  },
  paymentSummarySection: {
    padding: '18px 24px 10px',
    background: '#fff',
    borderTop: '2px solid #2c3e50',
  },
  paymentSummaryTitle: {
    margin: '0 0 6px 0',
    fontSize: '15px',
    fontWeight: '700',
    color: '#2c3e50',
    letterSpacing: '0.4px',
  },
  paymentSummaryMeta: {
    fontSize: '13px',
    color: '#4a5568',
    marginBottom: '10px',
  },
  paymentStats: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '10px',
    fontSize: '12px',
    color: '#2c3e50',
  },
  paymentStatItem: {
    background: '#f1f5f9',
    padding: '6px 10px',
    borderRadius: '4px',
  },
  paymentSummaryEmpty: {
    fontSize: '13px',
    color: '#6c757d',
    margin: '8px 0 16px',
  },
  paymentSummaryTableWrap: {
    overflowX: 'auto',
    marginBottom: '8px',
  },
  paymentSummaryTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '700px',
  },
  paymentSummaryHeader: {
    backgroundColor: '#4a6491',
    color: 'white',
    padding: '8px 10px',
    textAlign: 'left',
    fontWeight: '500',
    fontSize: '12px',
  },
  paymentSummaryCell: {
    padding: '7px 10px',
    fontSize: '12px',
    borderBottom: '1px solid #e0e0e0',
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
};

// Add keyframes for spin animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default CashBookPopup;