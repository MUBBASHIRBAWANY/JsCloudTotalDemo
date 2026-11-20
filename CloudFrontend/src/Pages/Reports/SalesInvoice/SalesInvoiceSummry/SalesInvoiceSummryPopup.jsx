import React, { useEffect, useState, useMemo, useRef } from "react";
import { exportProfessionalExcel } from "../../../../utils/exportProfessionalExcel";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getDataFundtion } from "../../../../Api/CRUDFunctions";
import { useSelector } from "react-redux";
import { fmt2, round2n } from "../../../../utils/round2";
import { buildInvoiceGeoLookups, resolveInvoiceGeo } from "./resolveInvoiceGeo";
import { mergeSalesReturnInvoices } from "./salesReturnSummaryRows";

const safeNum = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const invoiceLookupKey = (item = {}) =>
  String(item.SalesInvoice || item.Invoice || item.invoice || "").trim();

const SalesInvoiceSummryPopup = ({ data = {} }) => {
  //console.log(data)
  const [isLoading, setIsLoading] = useState(false);
  const { startDate, endDate } = data;
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");
  const reportRef = useRef(null);
  const [count, setCount] = useState(1);

  // Days difference
  const getDaysDiff = (dateString) => {
    const givenDate = new Date(dateString);
    const today = new Date();
    const diffTime = today - givenDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Fetch data
const getData = async () => {
    setIsLoading(true);
    setCount(2);
    try {
      const storeParam = data.store || "";
      const [res, dumpRes, avgRateRes, brandRes, productRes] = await Promise.all([
        getDataFundtion(
          `/SaleInvoice/SalesinvoiceSummry?startDate=${data.startDate}&endDate=${data.endDate}&Store=${storeParam}`
        ),
        getDataFundtion(
          `/SaleInvoice/SalesDumpData?startDate=${data.startDate}&endDate=${data.endDate}&Store=${storeParam}`
        ).catch(() => ({ data: [] })),
        getDataFundtion(
          `/Costing/avg-rate-report?startDate=${data.startDate}&endDate=${data.endDate}&Store=${storeParam}`
        ).catch(() => ({ data: [] })),
        getDataFundtion("/Brand").catch(() => ({ data: [] })),
        getDataFundtion("/product").catch(() => ({ data: data.SkuOptions || [] })),
      ]);

      const skuOptionsMap = new Map();
      unwrapList(productRes).forEach((p) => {
        if (p?._id == null) return;
        skuOptionsMap.set(p._id, p);
        skuOptionsMap.set(String(p._id), p);
      });

      const brandMap = new Map();
      unwrapList(brandRes).forEach((b) => {
        const brand = {
          ...b,
          MarketingExpence: b?.MarketingExpence ?? b?.MarketingExpense,
        };
        if (b?.mastercode == null || b.mastercode === "") return;
        brandMap.set(b.mastercode, brand);
        brandMap.set(String(b.mastercode), brand);
      });

      const customerMap = new Map();
      (data.Customer || []).forEach((c) => {
        if (c?._id == null) return;
        customerMap.set(c._id, c);
        customerMap.set(String(c._id), c);
      });

      const geoLookups = buildInvoiceGeoLookups(data);
      const avgRateMap = new Map();
      unwrapList(avgRateRes).forEach((item) => {
        if (item.product) {
          avgRateMap.set(item.product, safeNum(item.avgRate));
          avgRateMap.set(String(item.product), safeNum(item.avgRate));
        }
      });

      const costByInvoice = {};
      const marketingExpenseByInvoice = {};
      const onlyDist = data.loginVendor?.OnlyDist == true;
      unwrapList(dumpRes).forEach((item) => {
        const product = skuOptionsMap.get(item.Product) || skuOptionsMap.get(String(item.Product));
        if (!product) return;

        if (onlyDist) {
          const customer = customerMap.get(item.Client) || customerMap.get(String(item.Client));
          if (customer?.City != data.loginVendor.City) return;
        }

        const invoice = invoiceLookupKey(item);
        if (!invoice) return;

        const carton = safeNum(item.carton);
        const avgRate = safeNum(avgRateMap.get(item.Product) ?? avgRateMap.get(String(item.Product)));
        const discountPercentage = safeNum(
          product?.PurchaseDiscountPer ??
          product?.DiscountPercentage ??
          product?.DiscountPersentage
        );
        const grossCost = safeNum(carton * avgRate);
        const cost = safeNum(grossCost - (grossCost / 100) * discountPercentage);
        costByInvoice[invoice] = safeNum(costByInvoice[invoice]) + cost;

        const mastercode = product.mastercode || "";
        const Brand = brandMap.get(mastercode.slice(0, 6));
        const brandMarketingExpence = String(
          Brand?.MarketingExpence ?? Brand?.MarketingExpense ?? ""
        ).trim().toLowerCase();
        const marketingExpense = brandMarketingExpence === "yes"
          ? safeNum((safeNum(item.GrossAmount) / 100) * 2)
          : 0;
        marketingExpenseByInvoice[invoice] =
          safeNum(marketingExpenseByInvoice[invoice]) + marketingExpense;
      });

      const summaryRows = mergeSalesReturnInvoices(
        Array.isArray(res?.data) ? res.data : [],
        unwrapList(dumpRes)
      );
      const alldata = summaryRows.map((item, idx) => {
        const client = data.Customer?.find(c => c._id === item.Client);
        const location = data.setlocation?.find(l => l.value === item.Location);
        const store = data.storeforDrp?.find(s => s._id === item.Store);
        
        // ✅ Properly calculate discount including SpecialTO
        const discountAmount = Number(item.discount || 0);
        const specialTOAmount = Number(item.SpecialTO || 0);
        const specialdiscount = Number(item.specialdiscount || 0);
        const totalDiscount = discountAmount;
        
        // ✅ Calculate Total Amount correctly
        const grossAmount = Number(item.GrossAmount || item.Amount || 0);
        const tts = Number(item.TTS || 0);
        const lessAmount = Number(item.LessAmount || 0);
        const addAmount = Number(item.AddAmount || 0);
        const gst = Number(item.Gst || 0);
        const invoiceNo = item.SalesInvoice || item.Invoice || "-";
        const invoiceLabel = item.SaleType === "Return" && invoiceNo !== "-"
          ? `${invoiceNo}`
          : invoiceNo;
        const invoiceKey = invoiceLookupKey(item);
        
        const totalAmount = grossAmount - tts - lessAmount - totalDiscount + addAmount - gst - specialTOAmount - specialdiscount;
        const geo = resolveInvoiceGeo({
          ...(client || {}),
          OrderBooker: item.OrderBooker || client?.OrderBooker,
        }, geoLookups);
        
        return {
          id: idx + 1,
          invoice: invoiceLabel,
          date: item.SalesInvoiceDate || item.date || "-",
          City: geo.City,
          Zone: geo.Zone,
          Region: geo.Region,
          client: client?.CutomerName || client?.DistrbutorName || "-",
          ClientSalesFlow: client?.SalesFlowRef || client?.OldCode || "-",
          code: client?.code || "-",
          NTN: client?.NTN || "-",
          STN: client?.STN || "-",
          SalesFlowRef: item.SalesFlowRef || "-",
          Location: location?.label || "-",
          Store: store?.StoreName || "-",
          carton: Number(item.carton ?? 0),
          GrossAmount: grossAmount,
          TTS: tts,
          Gst: gst,
          Advancetax: Number(item.Advancetax ?? 0),
          SpecialTO: specialTOAmount,
          claimedScheme: safeNum(item.ClaimableSpecialTO),
          unclaimedScheme: safeNum(item.UnClaimableSpecialTO),
          specialdiscount : specialdiscount,
          discount: totalDiscount,  // ✅ discount now includes SpecialTO
          AddAmount: addAmount,
          LessAmount: lessAmount,
          Cost: safeNum(costByInvoice[invoiceKey] ?? costByInvoice[String(invoiceNo).trim()]),
          marketingExpense: safeNum(
            marketingExpenseByInvoice[invoiceKey] ??
            marketingExpenseByInvoice[String(invoiceNo).trim()]
          ),
          TotalAmount: totalAmount,
        };
      });

      // ✅ Debug log to verify
      
       const totalData = alldata.map(item => ({ 
        ...item,
        invoice: item.invoice, 
        discount: item.discount, 
        SpecialTO: item.SpecialTO,
        claimedScheme: Number(item.claimedScheme || 0),
        unclaimedScheme: Number(item.unclaimedScheme || 0),
        specialdiscount : Number(item.specialdiscount || 0),
        Cost: Number(item.Cost || 0),
        marketingExpense: Number(item.marketingExpense || 0),
        totalDiscount: item.discount + item.SpecialTO + Number(item.specialdiscount || 0)
      }));
      
      setRows(totalData);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
};

  useEffect(() => {
    getData();
  }, [count == 1]);

  // Totals
  const totals = useMemo(() => {
    return {
      totalSale: rows.reduce((s, r) => s + (r.TotalAmount || 0), 0),
      AddAmount: rows.reduce((s, r) => s + (r.AddAmount || 0), 0),
      LessAmount: rows.reduce((s, r) => s + (r.LessAmount || 0), 0),
      carton: rows.reduce((s, r) => s + (r.carton || 0), 0),
      totalGross: rows.reduce((s, r) => s + (r.GrossAmount || 0), 0),
      totalDiscount: rows.reduce((s, r) => s + (r.discount || 0), 0),
      totalSpecialTo: rows.reduce((s, r) => s + (r.SpecialTO || 0), 0),
      claimedScheme: rows.reduce((s, r) => s + (r.claimedScheme || 0), 0),
      unclaimedScheme: rows.reduce((s, r) => s + (r.unclaimedScheme || 0), 0),
      specialdiscount: rows.reduce((s, r) => s + (r.specialdiscount || 0), 0),
      Cost: rows.reduce((s, r) => s + (r.Cost || 0), 0),
      marketingExpense: rows.reduce((s, r) => s + (r.marketingExpense || 0), 0),
      totalGst: rows.reduce((s, r) => s + (r.Gst || 0), 0),
      TTS: rows.reduce((s, r) => s + (r.TTS || 0), 0),
      totalAdvanceTax: rows.reduce((s, r) => s + (r.Advancetax || 0), 0),
    };
  }, [rows]);
  //console.log(totals)
  // Format Date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(",", "");
  };

  // Export to Excel
  const exportToExcel = async () => {
    const department = data.store?.length > 0
      ? data.storeforDrp
        .filter(item => data.store.includes(item._id))
        .map(item => item.StoreName)
        .join(", ")
      : "All";

    const exportData = rows.map((r) => ({
      "#": r.id,
      "Date": formatDate(r.date),
      "Invoice": r.invoice,
      "Client": r.client,
      "City": r.City,
      "Zone": r.Zone,
      "Region": r.Region,
      "ClientSalesFlowRef": r.ClientSalesFlow,
      "Code": r.code,
      "NTN": r.NTN,
      "STN": r.STN,
      "SalesFlowRef": r.SalesFlowRef,
      "Location": r.Location,
      "Department": r.Store,
      "totalBox": round2n(r.carton),
      "Gross Amount": round2n(r.GrossAmount),
      "Discount": round2n(r.discount),
      "Special To": round2n(r.SpecialTO),
      "Claimed Scheme": round2n(r.claimedScheme),
      "Unclaimed Scheme": round2n(r.unclaimedScheme),
      "Special Discount": round2n(r.specialdiscount),
      "Gst": round2n(r.Gst),
      "Advance Tax": round2n(r.Advancetax),
      "TTS": round2n(r.TTS),
      "Add Freight Amount": round2n(r.AddAmount),
      "Less Freight Amount": round2n(r.LessAmount),
      "Cost": round2n(r.Cost),
      "Marketing Expense": round2n(r.marketingExpense),
      "Total": round2n(r.TotalAmount),
    }));

    if (rows.length > 0) {
      exportData.push({
        "#": "",
        "Date": "",
        "Invoice": "",
        "Client": "",
        "City": "",
        "Zone": "",
        "Region": "",
        "ClientSalesFlowRef": "",
        "Code": "",
        "NTN": "",
        "STN": "",
        "SalesFlowRef": "",
        "Location": "",
        "Department": "Total",
        "totalBox": round2n(totals.carton),
        "Gross Amount": round2n(totals.totalGross),
        "Discount": round2n(totals.totalDiscount),
        "Special To": round2n(totals.totalSpecialTo),
        "Claimed Scheme": round2n(totals.claimedScheme),
        "Unclaimed Scheme": round2n(totals.unclaimedScheme),
        "Special Discount": round2n(totals.specialdiscount),
        "Gst": round2n(totals.totalGst),
        "Advance Tax": round2n(totals.totalAdvanceTax),
        "TTS": round2n(totals.TTS),
        "Add Freight Amount": round2n(totals.AddAmount),
        "Less Freight Amount": round2n(totals.LessAmount),
        "Cost": round2n(totals.Cost),
        "Marketing Expense": round2n(totals.marketingExpense),
        "Total": round2n(totals.totalSale),
      });
    }

    await exportProfessionalExcel({
      title: "Sales Invoice Summary",
      fileName: "Sales_Invoice_Summary",
      sheetName: "Sales Invoice Summary",
      rows: exportData,
      meta: [
        `Period: ${data.startDate || ""} to ${data.endDate || ""}`,
        `Department: ${department}`,
        "Report Type: Invoice Wise",
      ],
    });
  };


  // Export to Word
  const exportToWord = async () => {
    const headers = ["#", "Date", "Invoice", "Client", "City", "Zone", "Region", "ClientSalesFlowRef", "Code", "NTN", "STN", "SalesFlowRef", "Location", "Store", "Gross Amount", "Discount", "Gst", "Advance Tax", "Total"];

    const tableRows = [
      new TableRow({
        children: headers.map(header =>
          new TableCell({
            children: [new Paragraph(header)],
          })
        ),
      }),
      ...rows.map((row) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(String(row.id || ""))] }),
            new TableCell({ children: [new Paragraph(formatDate(row.date) || "")] }),
            new TableCell({ children: [new Paragraph(row.invoice || "")] }),
            new TableCell({ children: [new Paragraph(row.client || "")] }),
            new TableCell({ children: [new Paragraph(row.City || "")] }),
            new TableCell({ children: [new Paragraph(row.Zone || "")] }),
            new TableCell({ children: [new Paragraph(row.Region || "")] }),
            new TableCell({ children: [new Paragraph(row.ClientSalesFlow || "")] }),
            new TableCell({ children: [new Paragraph(row.code || "")] }),
            new TableCell({ children: [new Paragraph(row.NTN || "")] }),
            new TableCell({ children: [new Paragraph(row.STN || "")] }),
            new TableCell({ children: [new Paragraph(row.SalesFlowRef || "")] }),
            new TableCell({ children: [new Paragraph(row.Location || "")] }),
            new TableCell({ children: [new Paragraph(row.Store || "")] }),
            new TableCell({ children: [new Paragraph(fmt2(row.GrossAmount) || "0")] }),
            new TableCell({ children: [new Paragraph(fmt2(row.discount) || "0")] }),
            new TableCell({ children: [new Paragraph(fmt2(row.Gst) || "0")] }),
            new TableCell({ children: [new Paragraph(fmt2(row.Advancetax) || "0")] }),
            new TableCell({ children: [new Paragraph(fmt2(row.TotalAmount) || "0")] }),
          ],
        })
      ),
    ];

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: "Pearl Dynamics", heading: "Heading1" }),
            new Paragraph({ text: "Sales Invoice Summary Report" }),
            new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Sales_Invoice_Summary.docx");
  };

  // Export to PDF
  // Export to PDF - Simplified version
  const exportToPDF = () => {
    const doc = new jsPDF("landscape");

    // Title and headers
    doc.setFontSize(16);
    doc.text("Sales Invoice Summary Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 22);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // Prepare table data
    const headers = [
      "#", "Date", "Invoice", "Client", "City", "Zone", "Region", "ClientSalesFlow", "Code",
      "NTN", "STN", "SalesFlowRef", "Location", "Store",
      "Gross Amount", "Discount", "Special To", "Claimed Scheme", "Unclaimed Scheme",
      "GST", "Advance Tax", "Cost", "Marketing Expense", "Total"
    ];

    const tableData = rows.map(row => [
      row.id,
      formatDate(row.date),
      row.invoice || "",
      row.client || "",
      row.City || "",
      row.Zone || "",
      row.Region || "",
      row.ClientSalesFlow || "",
      row.code || "",
      row.NTN || "",
      row.STN || "",
      row.SalesFlowRef || "",
      row.Location || "",
      row.Store || "",
      { content: fmt2(row.GrossAmount) || "0", styles: { halign: 'right' } },
      { content: fmt2(row.discount) || "0", styles: { halign: 'right' } },
      { content: fmt2(row.SpecialTO) || "0", styles: { halign: 'right' } },
      { content: fmt2(row.claimedScheme) || "0", styles: { halign: 'right' } },
      { content: fmt2(row.unclaimedScheme) || "0", styles: { halign: 'right' } },
      { content: fmt2(row.Gst) || "0", styles: { halign: 'right' } },
      { content: fmt2(row.Advancetax) || "0", styles: { halign: 'right' } },
      { content: fmt2(row.Cost) || "0", styles: { halign: 'right' } },
      { content: fmt2(row.marketingExpense) || "0", styles: { halign: 'right' } },
      { content: fmt2(row.TotalAmount) || "0", styles: { halign: 'right' } }
    ]);

    // Add totals row
    tableData.push([
      { content: "TOTAL", colSpan: 14, styles: { fontStyle: 'bold', halign: 'center' } },

      { content: fmt2(totals.totalGross), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalDiscount), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalSpecialTo), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.claimedScheme), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.unclaimedScheme), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalGst), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalAdvanceTax), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.Cost), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.marketingExpense), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalSale), styles: { fontStyle: 'bold', halign: 'right', fillColor: [22, 160, 133] } }
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 35,
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [50, 50, 50],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 'auto' }, // #
        1: { cellWidth: 'auto' }, // Date
        2: { cellWidth: 'auto' }, // Invoice
        3: { cellWidth: 'auto' }, // Client
        11: { halign: 'right' }, // Gross Amount
        12: { halign: 'right' }, // Discount
        13: { halign: 'right' }, // GST
        14: { halign: 'right' }, // Advance Tax
        15: { halign: 'right' }  // Total
      },
      margin: { top: 35 }
    });

    // Add summary section at the bottom
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text("Summary:", 14, finalY);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Invoices: ${rows.length}`, 14, finalY + 6);
    doc.text(`Grand Total Amount: ${fmt2(totals.totalSale)}`, 14, finalY + 12);
    doc.text(`Total Gross Amount: ${fmt2(totals.totalGross)}`, 80, finalY + 6);
    doc.text(`Total Discount: ${fmt2(totals.totalDiscount)}`, 80, finalY + 12);
    doc.text(`Total GST: ${fmt2(totals.totalGst)}`, 140, finalY + 6);
    doc.text(`Total Advance Tax: ${fmt2(totals.totalAdvanceTax)}`, 140, finalY + 12);

    doc.save("Sales_Invoice_Summary.pdf");
  };

  // Print
  const handlePrint = () => {
    const content = reportRef.current.innerHTML;
    const win = window.open("", "_blank", "width=1400,height=800");
    win.document.write(`
      <html>
        <head>
          <title>Sales Invoice Summary Report</title>
          <style>
            body { font-family: Arial; padding:20px; }
            table { border-collapse: collapse; width:100%; font-size:10px; }
            th, td { border:1px solid #ccc; padding:4px; text-align:left; }
            th { background:#f4f4f4; font-weight:bold; }
            .numeric { text-align:right; }
            .summary-stats { margin:15px 0; font-weight:bold; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="sales-report-container" ref={reportRef}>
      <div className="sales-report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dynamics</h2>
          <p>Sales Invoice Summary Report</p>
        </div>
        <div className="report-info">
          <p>Generated: {new Date().toLocaleString()}</p>
          <p>
            {rows.length > 0
              ? `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`
              : "No data"}
          </p>
        </div>
      </div>

      <div className="summary-stats">
        <span>
          Department : {data.storeforDrp
            .filter(item => data.store.includes(item._id))
            .map(item => item.StoreName)
            .join(", ")
          }
        </span>
        <span>
          Date From : {formatDate(data.startDate)}
        </span>
        <span>
          Date To : {formatDate(data.endDate)}
        </span>
        <span>
          Report Type : SalesInvoiceSummryPopup
        </span>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
          </div>
        ) : (
          <table className="sales-data-table">
            <thead className="table-header">
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Invoice</th>
                <th>Client</th>
                <th>City</th>
                <th>Zone</th>
                <th>Region</th>
                <th>ClientSalesFlowRef</th>
                <th>Code</th>
                <th>NTN</th>
                <th>STN</th>
                <th>SalesFlowRef</th>
                <th>Location</th>
                <th>Department</th>
                <th>totalBox</th>
                <th>Gross Amount</th>
                <th>Discount</th>
                <th>Special To</th>
                <th>Claimed Scheme</th>
                <th>Unclaimed Scheme</th>
                <th>Special Discount</th>
                <th>Gst</th>
                <th>Advance Tax</th>
                <th>TTS</th>
                <th>Add Freight Amount </th>
                <th>Less Freight Amount</th>
                <th>Cost</th>
                <th>Marketing Expense</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {rows.length > 0 ? (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.invoice}</td>
                    <td>{r.client}</td>
                    <td>{r.City}</td>
                    <td>{r.Zone}</td>
                    <td>{r.Region}</td>
                    <td>{r.ClientSalesFlow}</td>
                    <td>{r.code}</td>
                    <td>{r.NTN}</td>
                    <td>{r.STN}</td>
                    <td>{r.SalesFlowRef}</td>
                    <td>{r.Location}</td>
                    <td>{r.Store}</td>
                    <td className="numeric">{fmt2(r.carton)}</td>
                    <td className="numeric">{fmt2(r.GrossAmount)}</td>
                    <td className="numeric">{fmt2(r.discount)}</td>
                    <td className="numeric">{fmt2(r.SpecialTO)}</td>
                    <td className="numeric">{fmt2(r.claimedScheme)}</td>
                    <td className="numeric">{fmt2(r.unclaimedScheme)}</td>
                    <td className="numeric">{fmt2(r.specialdiscount)}</td>
                    <td className="numeric">{fmt2(r.Gst)}</td>
                    <td className="numeric">{fmt2(r.Advancetax)}</td>
                    <td className="numeric">{fmt2(r.TTS)}</td>
                    <td className="numeric">{fmt2(r.AddAmount)}</td>
                    <td className="numeric">{fmt2(r.LessAmount)}</td>
                    <td className="numeric">{fmt2(r.Cost)}</td>
                    <td className="numeric">{fmt2(r.marketingExpense)}</td>
                    <td className="numeric">{fmt2(r.TotalAmount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="29" className="no-data">No records found</td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="footer-total">
                  <td colSpan="14">Total</td>
                  <td className="numeric">{fmt2(totals.carton)}</td>
                  <td className="numeric">{fmt2(totals.totalGross)}</td>
                  <td className="numeric">{fmt2(totals.totalDiscount)}</td> 
                  <td className="numeric">{fmt2(totals.totalSpecialTo)}</td>
                  <td className="numeric">{fmt2(totals.claimedScheme)}</td>
                  <td className="numeric">{fmt2(totals.unclaimedScheme)}</td>
                  <td className="numeric">{fmt2(totals.specialdiscount)}</td>
                  <td className="numeric">{fmt2(totals.totalGst)}</td>
                  <td className="numeric">{fmt2(totals.totalAdvanceTax)}</td>
                  <td className="numeric">{fmt2(totals.TTS)}</td>
                  <td className="numeric">{fmt2(totals.AddAmount)}</td>
                  <td className="numeric">{fmt2(totals.LessAmount)}</td>
                  <td className="numeric">{fmt2(totals.Cost)}</td>
                  <td className="numeric">{fmt2(totals.marketingExpense)}</td>
                  <td className="numeric">{fmt2(totals.totalSale)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      <div className="report-actions">
        <button className="btn btn-word" onClick={exportToWord}>Word</button>
        <button className="btn btn-excel" onClick={exportToExcel}>Excel</button>
        <button className="btn btn-pdf" onClick={exportToPDF}>PDF</button>
        <button className="btn btn-print" onClick={handlePrint}>Print</button>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
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
        
        .sales-report-container {
          font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin: 20px auto;
          max-width: 100%;
          color: #333;
          position: relative;
          overflow-x: auto;
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
        
        .report-info p {
          margin: 4px 0;
          font-size: 14px;
          color: #666;
        }
        
        .summary-stats {
          display: flex;
          gap: 24px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .summary-stats span {
          background: #f8f9fa;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          border: 1px solid #e9ecef;
        }
        
        .table-container {
          overflow-x: auto;
           max-height: 80vh;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
        }
     .table-container table {
  border-collapse: collapse;
  width: 100%;
}
.table-container th,
.table-container td {
  padding: 10px;
  border: 1px solid #ccc;
  text-align: left;
}
  .table-container thead th {
  position: sticky;
  top: 0;
  background: #f1f3f5;
  z-index: 10;
}
        .sales-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          min-width: 1600px;
        }
        
        .sales-data-table th {
          background: #f8f9fa;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 2px solid #e0e0e0;
          white-space: nowrap;
        }
        
        .sales-data-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #eaeaea;
          white-space: nowrap;
        }
        
        .sales-data-table tbody tr:hover {
          background-color: #f8f9fa;
        }
        
        .numeric {
          text-align: right;
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }
        
        .no-data {
          text-align: center;
          color: #95a5a6;
          font-style: italic;
          padding: 20px;
        }
        
        tfoot {
          border-top: 2px solid #e0e0e0;
        }
        
        .footer-total {
          font-weight: 700;
          background: #f8f9fa;
        }
        
        .footer-total td {
          border-top: 2px solid #e0e0e0;
        }
        
        .report-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
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
          
          .summary-stats {
            justify-content: center;
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
          
          .report-actions {
            display: none;
          }
          
          .table-container {
            overflow: visible;
            border: none;
          }
          
          .sales-data-table {
            font-size: 10px;
          }
          
          .footer-total {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default SalesInvoiceSummryPopup;