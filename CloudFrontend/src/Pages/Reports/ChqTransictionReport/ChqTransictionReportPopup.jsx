import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import { ConvetDate } from '../../../Components/Global/getDate';
import { set } from 'react-hook-form';
import { Store } from 'lucide-react';
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';

const ChqTransictionReportPopup = ({ filterData = [] }) => {
  console.log(filterData)
  const [sampleChqData, setSampleChqData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { startDate, endDate } = filterData;
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([]);
  const [ChartofAccount, setChartofAccount] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  const getOrderBookerDiff = (dateString) => {
    const givenDate = new Date(dateString);
    const today = new Date();
    const diffTime = today - givenDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateValue) => {
    if (dateValue === "" || dateValue == null || dateValue === undefined) {
      return "";
    }
    // Already formatted / already invalid placeholder
    const asText = String(dateValue).trim();
    if (!asText || asText === "Invalid Date" || asText === "—" || asText === "-") {
      return "";
    }
    // Already like "10 Nov 2026"
    if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(asText)) {
      return asText;
    }

    let date;
    if (typeof dateValue === "number") {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const ms = dateValue * 24 * 60 * 60 * 1000;
      date = new Date(excelEpoch.getTime() + ms);
    } else if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}/.test(asText)) {
      // YYYY-MM-DD (avoid timezone shift)
      const [y, m, d] = asText.slice(0, 10).split("-").map(Number);
      date = new Date(y, m - 1, d);
    } else if (typeof dateValue === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(asText)) {
      // DD/MM/YYYY or MM/DD/YYYY — prefer DD/MM when day > 12
      const [a, b, y] = asText.split(/[\/\-]/).map(Number);
      date = a > 12 ? new Date(y, b - 1, a) : new Date(y, a - 1, b);
    } else {
      date = new Date(dateValue);
    }

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "";
    }

    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(",", "");
  };

  const statusLabel = (status) => {
    if (status == null || status === "") return "";
    if (typeof status === "object") {
      return status.label || status.value || status.name || "";
    }
    return String(status);
  };

  const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.result)) return value.result;
    return [];
  };

  const invoiceList = asArray(filterData.invoice);
  const storeList = asArray(filterData.AllStore);
  const orderBookerList = asArray(filterData.AllOrderBooker);
  const customerList = asArray(filterData.Customer);

  const invoiceMap = Object.fromEntries(
    invoiceList.map((i) => [String(i.SalesInvoice), i])
  );

  const storeMap = Object.fromEntries(
    storeList.map((s) => [String(s._id), s])
  );

  const orderBookerMap = Object.fromEntries(
    orderBookerList.map((o) => [String(o._id), o])
  );

  const customerMap = Object.fromEntries(
    customerList.map((c) => [String(c.value), c])
  );

  const isAccountId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || "").trim());

  const banksFromItem = (item, accounts = ChartofAccount) => {
    const apiBank = String(item?.Bank || item?.bank || "").trim();
    const namedBank = String(
      item?.BankName ||
      item?.bankName ||
      item?.ChequeBank ||
      item?.chequeBank ||
      ""
    ).trim();
    let chequeBank = namedBank;
    if (!chequeBank && apiBank && !isAccountId(apiBank)) {
      chequeBank = apiBank;
    }
    if (!chequeBank && isAccountId(apiBank) && accounts?.length) {
      const match = accounts.find(
        (acc) => String(acc._id) === apiBank || String(acc.AccountCode) === apiBank
      );
      chequeBank = match?.AccountName || "";
    }
    const mainBank = String(item?.MainBank || item?.mainBank || "").trim()
      || (isAccountId(apiBank) ? apiBank : "");
    return { chequeBank: chequeBank || "N/A", mainBank };
  };

  const resolveStoreName = (item, invoice) => {
    const rawStoreId = item?.StoreId || item?.Store || invoice?.Store || "";
    if (rawStoreId && storeMap[String(rawStoreId)]?.StoreName) {
      return {
        storeName: storeMap[String(rawStoreId)].StoreName,
        storeId: String(rawStoreId),
      };
    }
    // Already a name (not ObjectId)
    if (rawStoreId && !isAccountId(rawStoreId)) {
      return { storeName: String(rawStoreId), storeId: String(rawStoreId) };
    }
    return { storeName: "N/A", storeId: String(rawStoreId || "") };
  };

  const normalizeStatus = (item) =>
    String(item?.staus || item?.status || item?.Status || item?.groupedStatus || "Pending").trim();

  const processChqRows = (rawData, accounts = ChartofAccount) => {
    const chqData = asArray(rawData);

    return chqData.map((item) => {
      try {
        const invoice = invoiceMap[String(item?.Invoice || item?.invoice || "")];
        const customerId = item?.Customer != null ? String(item.Customer) : "";
        const customer = customerMap[customerId];
        const { storeName, storeId } = resolveStoreName(item, invoice);
        const orderBooker = orderBookerMap[String(invoice?.OrderBooker || "")];
        const { chequeBank, mainBank } = banksFromItem(item, accounts);
        const chqDateRaw = item?.Date || item?.ChqDate || item?.chqDate || "";

        return {
          ...item,
          depositOrReturnDate: formatDate(ConvetDate(item?.DepositOrReturn) || item?.DepositOrReturn),
          realizeDate: formatDate(
            ConvetDate(item?.RealizeDate) ||
            item?.RealizeDate ||
            item?.ChqDate ||
            item?.chequeDate
          ),
          recOrRejectDate: formatDate(ConvetDate(item?.RecOrRejectDate) || item?.RecOrRejectDate),
          CustomerName: customer?.name || (customerId ? `Customer ${customerId.substring(0, 8)}` : "Customer Not Found"),
          CustomerCode: customer?.SalesFlowRef || (customerId ? customerId.substring(0, 8) : ""),
          Status: normalizeStatus(item),
          Remarks: item?.remarks2 || "",
          RealizationDate: item?.RealizationDate,
          Store: storeName,
          StoreId: storeId,
          SalesFlowRef: invoice?.SalesFlowRef || item?.invoice || item?.Invoice || "",
          InvoiceDate: formatDate(invoice?.SalesInvoiceDate || ConvetDate(chqDateRaw) || chqDateRaw),
          chqDate: formatDate(ConvetDate(chqDateRaw) || chqDateRaw),
          OrderBooker: orderBooker?.OrderBookerName || "No Order Booker",
          Amount: Number(item?.Amount) || 0,
          bank: chequeBank,
          mainBank,
        };
      } catch (rowErr) {
        console.error("Failed to map cheque row:", rowErr, item);
        return {
          ...item,
          CustomerName: "Customer Not Found",
          CustomerCode: "",
          Status: normalizeStatus(item),
          Store: "N/A",
          StoreId: "",
          SalesFlowRef: item?.Invoice || "",
          Amount: Number(item?.Amount) || 0,
          bank: "N/A",
          mainBank: "",
          chqDate: "",
          realizeDate: "",
          recOrRejectDate: "",
          depositOrReturnDate: "",
        };
      }
    });
  };

  const toDisplayRows = (mappedRows) => {
    let working = Array.isArray(mappedRows) ? [...mappedRows] : [];

    const sortBy = typeof filterData.SortBy === "object"
      ? (filterData.SortBy?.value || "ChqDate")
      : (Array.isArray(filterData.SortBy) || !filterData.SortBy ? "ChqDate" : filterData.SortBy);

    const sortField = sortBy === "RealizeDate" ? "realizeDate"
      : sortBy === "DepositOrReturn" ? "depositOrReturnDate"
      : sortBy === "RecOrRejectDate" ? "recOrRejectDate" : "chqDate";

    working.sort((a, b) => {
      const dateA = new Date(a?.[sortField] || a?.Date || 0);
      const dateB = new Date(b?.[sortField] || b?.Date || 0);
      const timeA = Number.isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = Number.isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      return timeA - timeB;
    });

    const statusRaw = filterData.Status;
    const statusValue = statusRaw == null || statusRaw === "" || statusRaw === "All"
      ? "All"
      : (typeof statusRaw === "object" ? (statusRaw.value || statusRaw.label || "All") : String(statusRaw));

    if (statusValue !== "All") {
      const wanted = String(statusValue).trim().toLowerCase();
      working = working.filter((item) =>
        String(item.Status || item.status || item.staus || "").trim().toLowerCase() === wanted
      );
    }

    // Store: array / empty = all stores. Object = one selected store.
    const storeFilter = filterData.Store;
    const hasSingleStore =
      storeFilter &&
      !Array.isArray(storeFilter) &&
      (typeof storeFilter === "object"
        ? !!(storeFilter.value || storeFilter.label)
        : String(storeFilter).trim() !== "");

    if (hasSingleStore) {
      const storeValue = typeof storeFilter === "object"
        ? String(storeFilter.value || "")
        : String(storeFilter);
      const storeLabel = typeof storeFilter === "object"
        ? String(storeFilter.label || "")
        : String(storeFilter);

      working = working.filter((item) => {
        const idMatch = storeValue && (
          String(item.StoreId || "") === storeValue ||
          String(item.Store || "") === storeValue
        );
        const labelMatch = storeLabel && String(item.Store || "") === storeLabel;
        // If row has no store info, keep it when filtering (don't wipe report)
        const unresolved = !item.StoreId && (!item.Store || item.Store === "N/A" || item.Store === "Store Not Found");
        return idMatch || labelMatch || unresolved;
      });
    }

    return working.map((item, index) => {
      const customer = customerMap[String(item.Customer || item.customerId || "")] ||
        customerList.find((C) =>
          String(C.value) === String(item.Customer) ||
          String(C.SalesFlowRef) === String(item.CustomerCode)
        );

      return {
        id: index + 1,
        chqNumber: item.chq || item.chqNumber || "",
        chqDate: item.chqDate,
        depositOrReturnDate: item.depositOrReturnDate,
        realizeDate: item.realizeDate,
        recOrRejectDate: item.recOrRejectDate,
        customerCode: customer?.SalesFlowRef || item.CustomerCode || "",
        customerName: customer?.name || item.CustomerName || "Customer Not Found",
        invoice: item.Invoice || item.invoice,
        amount: Number(item.Amount ?? item.amount) || 0,
        status: item.Status || item.status || item.staus || "",
        Store: item.Store,
        StoreId: item.StoreId || "",
        InvoiceDate: item.InvoiceDate,
        SalesFlowRef: item.SalesFlowRef,
        remarks: item.Remarks || item.remarks || "",
        RealizationDate: item.RealizationDate,
        OrderBooker: item.OrderBooker || "",
        bank: item.bank || "N/A",
        mainBank: item.mainBank || "",
        type: item.Type || "Regular",
        customerId: item.Customer,
      };
    });
  };

  const applyMappedData = (rawData, accounts = ChartofAccount) => {
    const mapped = processChqRows(rawData, accounts);
    const display = toDisplayRows(mapped);
    setData(mapped);
    setRows(display);
    return display;
  };

  const getData = async () => {
    setIsLoading(true);
    let gettingdata = [];
    try {
      const dateType =
        typeof filterData.SortBy === "object"
          ? (filterData.SortBy?.value || "ChqDate")
          : (Array.isArray(filterData.SortBy) || !filterData.SortBy ? "ChqDate" : filterData.SortBy);

      const response = await getDataFundtion(
        `/customerChqRecived/chqReports?startdate=${filterData.startDate}&endDate=${filterData.endDate}&DateType=${dateType}`
      );
      gettingdata = asArray(response);
      setSampleChqData(gettingdata);

      // Populate table immediately from chqReports — do not wait on Stage4
      applyMappedData(gettingdata);

      try {
        const chartofAccount = await getDataFundtion(`/chartofAccounts/Stage4`);
        const accounts = asArray(chartofAccount);
        setChartofAccount(accounts);
        if (accounts.length) {
          applyMappedData(gettingdata, accounts);
        }
      } catch (chartErr) {
        console.error("Stage4 chart of accounts failed (non-fatal):", chartErr);
      }
    } catch (err) {
      console.error("Error fetching chqReports:", err);
      const fallback = asArray(gettingdata).length ? gettingdata : asArray(sampleChqData);
      applyMappedData(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply Status / Store / Sort when filters change (data already loaded)
  useEffect(() => {
    if (data.length > 0) {
      setRows(toDisplayRows(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterData.Status, filterData.Store, filterData.SortBy]);

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

    if (filterData.merge) {
      const chqMap = {};
      filtered.forEach(row => {
        const key = row.chqNumber || row.chq || "";
        if (!chqMap[key]) {
          chqMap[key] = {
            ...row,
            amount: 0,
            invoices: [],
          };
        }
        chqMap[key].amount += Number(row.amount) || 0;
        if (row.invoice) {
          chqMap[key].invoices.push(row.invoice);
        }
      });

      filtered = Object.values(chqMap).map((item, idx) => ({
        ...item,
        id: idx + 1,
        invoice: item.invoices.join(", "),
      }));
    }

    return filtered;
  }, [rows, filter, sortConfig, filterData.merge]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const totals = useMemo(() => {
    return {
      totalAmount: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.amount) || 0, 0),
      totalCheques: filteredAndSortedRows.length,
      realizedCheques: filteredAndSortedRows.filter(row => {
        const s = String(row.status || '').trim().toLowerCase();
        return s === 'realize' || s === 'clear';
      }).length,
      bouncedCheques: filteredAndSortedRows.filter(row =>
        String(row.status || '').trim().toLowerCase() === 'bounce'
      ).length,
    };
  }, [filteredAndSortedRows]);

  const exportToExcel = async () => {
    const excelData = filteredAndSortedRows.map(row => ({
      '#': row.id,
      'Customer Name': row.customerName,
      'SalesFlowRef': row.SalesFlowRef,
      'Received Date': formatDate(row.recOrRejectDate) || "",
      'Cheque Date': formatDate(row.realizeDate) || "",
      'Cheque No': row.chqNumber,
      'BANK': row.bank || 'N/A',
      'Amount': Number(Number(row.amount || 0).toFixed(2)),
      'Store': row.Store,
      'Cheque Rcvd Date': formatDate(row.chqDate) || "",
    }));
    await exportProfessionalExcel({
      title: 'Cheque Transaction Report',
      fileName: 'Cheque_Transaction_Report',
      sheetName: 'Cheque Transaction Report',
      rows: excelData,
      meta: [
        filterData.startDate && filterData.endDate
          ? `Period: ${filterData.startDate} to ${filterData.endDate}`
          : '',
        filterData.SortBy ? `Date Type: ${filterData.SortBy}` : '',
        statusLabel(filterData.Status)
          ? `Status: ${statusLabel(filterData.Status)}`
          : '',
      ].filter(Boolean),
      excludeKeys: ['_id', 'id'],
    });
  };

  const exportToWord = async () => {
    const headers = ['#', 'Customer Name', 'SalesFlowRef', 'Received Date', 'Cheque Date', 'Cheque No', 'BANK', 'Amount', 'Store', 'Cheque Rcvd Date'];

    const tableRows = filteredAndSortedRows.map(row =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(row.id) })] }),
          new TableCell({ children: [new Paragraph({ text: row.customerName || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.SalesFlowRef || '' })] }),
          new TableCell({ children: [new Paragraph({ text: formatDate(row.recOrRejectDate) })] }),
          new TableCell({ children: [new Paragraph({ text: formatDate(row.realizeDate) })] }),
          new TableCell({ children: [new Paragraph({ text: String(row.chqNumber || '') })] }),
          new TableCell({ children: [new Paragraph({ text: row.bank || 'N/A' })] }),
          new TableCell({ children: [new Paragraph({ text: String(Number(Number(row.amount || 0).toFixed(2))) })] }),
          new TableCell({ children: [new Paragraph({ text: row.Store || '' })] }),
          new TableCell({ children: [new Paragraph({ text: formatDate(row.chqDate) })] }),
        ],
      })
    );

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

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: "Pearl Dynamics", heading: "Heading1" }),
          new Paragraph({ text: "Cheque Transaction Report" }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
          new Paragraph({ text: "" }),
          table,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Cheque_Transaction_Report.docx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");

    const watermark =
      "https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png";

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(20);
    doc.text("Pearl Dynamic (pvt) ltdPvt Ltd", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(16);
    doc.text("Cheque Transaction Report", pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 42);

    const tableColumn = [
      "#",
      "Customer Name",
      "SalesFlowRef",
      "Received Date",
      "Cheque Date",
      "Cheque No",
      "BANK",
      "Amount",
      "Store",
      "Cheque Rcvd Date",
    ];

    const tableRows = filteredAndSortedRows.map(row => [
      row.id,
      row.customerName,
      row.SalesFlowRef,
      formatDate(row.recOrRejectDate),
      formatDate(row.realizeDate),
      row.chqNumber,
      row.bank || "N/A",
      row.amount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0",
      row.Store,
      formatDate(row.chqDate),
    ]);

    const totalAmount = filteredAndSortedRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const idxAmount = tableColumn.indexOf("Amount");
    const totalsRow = new Array(tableColumn.length).fill("");
    if (idxAmount >= 0) totalsRow[idxAmount] = totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const firstTotalsIndex = Math.min(...[idxAmount].filter(i => i >= 0));
    const totalsLabel = "Totals";
    if (firstTotalsIndex > 0) {
      totalsRow[0] = totalsLabel;
    } else {
      totalsRow[tableColumn.length - 1] = totalsLabel;
    }
    tableRows.push(totalsRow);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: "grid",
      styles: { fontSize: 6, cellPadding: 1.5 },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        minCellHeight: 12,
      },
      bodyStyles: { valign: "middle" },
      didParseCell: function (data) {
        const lastRowIndex = tableRows.length - 1;
        if (data.row.index !== lastRowIndex) return;
        if (firstTotalsIndex > 0) {
          if (data.column.index === 0) {
            data.cell.colSpan = firstTotalsIndex;
            data.cell.styles.halign = "center";
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [230, 230, 230];
            data.cell.text = [totalsLabel];
          } else if (data.column.index > 0 && data.column.index < firstTotalsIndex) {
            data.cell.text = "";
          }
          if (data.column.index >= firstTotalsIndex) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [230, 230, 230];
          }
        } else {
          if (data.column.index === tableColumn.length - 1) {
            data.cell.styles.halign = "center";
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

    const summaryByStatus = rows.reduce((acc, row) => {
      const status = row.status || "Unknown";
      if (!acc[status]) {
        acc[status] = {
          count: 0,
          amount: 0,
        };
      }
      acc[status].count += 1;
      acc[status].amount += Number(row.amount || 0);
      return acc;
    }, {});

    const summaryData = Object.entries(summaryByStatus).map(
      ([status, val], i) => [
        i + 1,
        status,
        val.count.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        val.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ]
    );

    const grandTotals = Object.values(summaryByStatus).reduce(
      (acc, val) => {
        acc.count += val.count;
        acc.amount += val.amount;
        return acc;
      },
      { count: 0, amount: 0 }
    );

    const totalsRow1 = new Array(4).fill("");
    totalsRow1[0] = "TOTAL";
    totalsRow1[2] = grandTotals.count.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    totalsRow1[3] = grandTotals.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    summaryData.push(totalsRow1);

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text("Status-wise Summary", 105, finalY, { align: "center" });

    autoTable(doc, {
      startY: finalY + 5,
      head: [["S.No", "Status", "Count", "Amount"]],
      body: summaryData,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
      bodyStyles: { halign: "right" },
      didParseCell: function (data) {
        const lastRowIndex = summaryData.length - 1;
        if (data.row.index === lastRowIndex) {
          if (data.column.index === 0) {
            data.cell.colSpan = 2;
            data.cell.styles.halign = "center";
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [230, 230, 230];
            data.cell.text = ["TOTAL"];
          } else if (data.column.index === 1) {
            data.cell.text = "";
          } else {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [230, 230, 230];
          }
        }
      },
    });

    doc.setFontSize(9);
    doc.text("Generated on: " + new Date().toLocaleString(), 10, 290);
    doc.text("Pearl Dynamic (pvt) ltdSystem", 180, 290, { align: "right" });
    doc.save("Cheque_Transaction_Report.pdf");
  };

  const OpenChqDetails = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=800");
  };

  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
    <html>
      <head>
        <title>Cheque Transaction Report</title>
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
          .status-realize {
            color: #27ae60;
            font-weight: bold;
          }
          .status-bounce {
            color: #e74c3c;
            font-weight: bold;
          }
          .status-pending {
            color: #f39c12;
            font-weight: bold;
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

  const getStatusClass = (status) => {
    switch (status) {
      case 'Realize': return 'status-realize';
      case 'Bounce': return 'status-bounce';
      case 'Pending': return 'status-pending';
      default: return '';
    }
  };

  return (
    <div className="sales-report-container" ref={reportRef}>
      <ReportPopupHeader title="Cheque Transaction Report" />

      <div className="watermark">
        <div className="watermark-content">
          <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png" alt="" />
        </div>
      </div>

      <div className="sales-report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dynamics</h2>
          <p className="company-RemainingAmount">123 Business Avenue, Suite 456</p>
          <p className="company-contact">Phone: (555) 123-4567 | Email: info@pmmgmt.com</p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Cheque Transaction Report</h1>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">
            {filterData.startDate && filterData.endDate
              ? `Period: ${filterData.startDate} to ${filterData.endDate}`
              : 'No period selected'
            }
          </p>
        </div>
      </div>

      <div className="report-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search cheque transactions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="summary-stats">
          <span className="stat-item">
            Total Amount: <strong>{totals.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </span>
          <span className="stat-item">
            Total Cheques: <strong>{totals.totalCheques}</strong>
          </span>
          <span className="stat-item">
            Realized: <strong>{totals.realizedCheques}</strong>
          </span>
          <span className="stat-item">
            Bounced: <strong>{totals.bouncedCheques}</strong>
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
                <th onClick={() => requestSort('customerName')}>Customer Name {sortConfig.key === 'customerName' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('SalesFlowRef')}>SalesFlowRef {sortConfig.key === 'SalesFlowRef' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('recOrRejectDate')}>Received Date {sortConfig.key === 'recOrRejectDate' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('realizeDate')}>Cheque Date {sortConfig.key === 'realizeDate' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('chqNumber')}>Cheque No {sortConfig.key === 'chqNumber' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('bank')}>BANK {sortConfig.key === 'bank' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('amount')}>Amount {sortConfig.key === 'amount' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('Store')}>Store {sortConfig.key === 'Store' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('chqDate')}>Cheque Rcvd Date {sortConfig.key === 'chqDate' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row) => (
                  <tr key={row.id} className={row.status === 'Pending' ? 'row-pending' : ''}>
                    <td>{row.id}</td>
                    <td>{row.customerName}</td>
                    <td>{row.SalesFlowRef}</td>
                    <td style={{ minWidth: "100px" }}>{formatDate(row.recOrRejectDate)}</td>
                    <td style={{ minWidth: "100px" }}>{formatDate(row.realizeDate)}</td>
                    <td className="invoice-number" onClick={() => OpenChqDetails()}>{row.chqNumber}</td>
                    <td>{row.bank || 'N/A'}</td>
                    <td className='numeric'>{Number(row.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{row.Store}</td>
                    <td style={{ minWidth: "100px" }}>{formatDate(row.chqDate)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="no-data">
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
                <td className="numeric footer-total">{totals.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
        
        .status-realize {
          color: #27ae60;
          font-weight: bold;
        }
        
        .status-bounce {
          color: #e74c3c;
          font-weight: bold;
        }
        
        .status-pending {
          color: #f39c12;
          font-weight: bold;
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
              max-height: 70vh;
              overflow-y: auto;
              overflow-x: auto;
              position: relative;
          }
          
          .watermark {
            opacity: 0.03;
          }

          .footer-total {
            font-weight: bold;
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default ChqTransictionReportPopup;