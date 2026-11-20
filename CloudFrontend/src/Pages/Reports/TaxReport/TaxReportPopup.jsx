import React, { useEffect, useState, useMemo, useRef } from "react";
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
import { getDataFundtion } from "../../../Api/CRUDFunctions";
import ReportPopupHeader from "../../../Components/Global/ReportPopupHeader.jsx";
import { exportProfessionalExcel } from "../../../utils/exportProfessionalExcel";

const TaxReportPopup = (fillterData) => {
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState([]);
  const [error, setError] = useState("");
  const reportRef = useRef(null);

  const getData = async () => {


    setIsLoading(true);
    setError("");
    let data;
    try {
      data = await getDataFundtion(`saleInvoice/getOnlyInvoiceAging1?startDate=${fillterData.data.startDate}&endDate=${fillterData.data.endDate}&store=${fillterData.data.store}&onlyCurrunt=true&OrderBooker=All`);
    } catch (err) {
      console.error("Failed to load tax report data:", err);
      setError("Failed to load report data. Please check your connection and try again.");
      setIsLoading(false);
      return;
    }

    // O(1) lookups instead of repeated Array.find() inside the loops below
    // (String keys preserve the original loose-equality matching of IDs)
    const skuOptions = fillterData.data.SkuOptions || [];
    const customers = fillterData.data.Customer || [];
    const skuMap = new Map(skuOptions.map((sku) => [String(sku._id), sku]));
    const customerMap = new Map(customers.map((c) => [String(c._id), c]));
    
    const QtyData = data.data.map((item) => ({
      ...item,
      SalesData: item.SalesData.map((val) => {
        const Product = skuMap.get(String(val.product));

        return {
          ...val,
          Qty:
            Product && Product.PcsinBox && Product.GRAM
              ? (Number(Product.PcsinBox) * Number(val.totalBox) * Number(Product.GRAM)) / 1000
              : 0,
        };
      }),

    }));

    const merged = Object.values(
      QtyData.reduce((acc, curr) => {
        // loop through each SalesData item, because each product may have its own hsCode
        curr.SalesData.forEach((item) => {
          // read hsCode (safely handle missing product)
          const sku = skuMap.get(String(item?.product));
          const hsCode = sku?.HSCODE || sku?.hsCode || "NO_HSCODE";
          const productDescription = sku?.SaleType || "productDescription";
          // Merge only when invoice, HS code, and sales type are the same
          const key = `${curr.SalesFlowRef}_${hsCode}_${productDescription}`;

          if (!acc[key]) {
            acc[key] = {
              invoiceRefNo: curr.SalesFlowRef,
              invoiceDate: curr.SalesInvoiceDate,
              Client: curr.Client,
              Location: curr.Location,
              Store: curr.Store,
              OrderBooker: curr.OrderBooker,
              hsCode: hsCode,
              productDescription: productDescription || "",
              totalCarton: 0,
              TradeOffer: 0,
              totalGst: 0,
              totalValue: 0,
              totalAdvanceTax: 0,
              totalAmount: 0,
              totalQTY: 0,
              valueSalesExcludingST: 0,
            };
          }

          // add totals for this hsCode entry
          acc[key].totalCarton += item.totalBox || 0;
          acc[key].totalGst += item.Gst || 0;
          acc[key].totalAdvanceTax += item.AdvanceTax || 0;
          acc[key].totalValue += item.TotalValueExclGst || 0;
          acc[key].totalQTY += item.Qty || 0;
          acc[key].TradeOffer += item.TradeOffer || 0;
          // convert all to numbers safely
          const net = Number(item.netAmunt) || 0;

          // value excluding sales tax
          acc[key].valueSalesExcludingST += item.TotalValueExclGst || 0;

          // total amount (net + taxes)
          acc[key].totalAmount += net;

        });

        return acc;
      }, {})
    );

    const totalSalesData = merged.map((item) => {
      const customer = customerMap.get(String(item.Client)) || {};

      const tradeOffer = Number(item.TradeOffer) || 0;
      const base = item.productDescription !== "3rd Schedule Goods" ? Number(item.valueSalesExcludingST - tradeOffer) || 0 : Number(item.valueSalesExcludingST);
      const gst = Number(item.totalGst) || 0;

      const ratePercent = base ? (gst / base) * 100 : 0;
      const baseValue =
        ratePercent > 0 ? (gst / ratePercent) * 100 : 0;

      const salesTax =
        item.productDescription !== "3rd Schedule Goods"
          ? ratePercent > 18
            ? (baseValue * 18) / 100
            : gst
          : gst;

      const furtherTax =
        item.productDescription !== "3rd Schedule Goods"
          ? ratePercent > 18
            ? gst - salesTax   // 👈 residual logic
            : 0
          : 0;
      const acctulFurtherTax = item.productDescription !== "3rd Schedule Goods" && customer.Registered !== "1"
        ? (salesTax / 18) * 4   // 👈 residual logic
        : 0

      return {
        invoiceType: "Sale Invoice",
        sellerNTNCNIC: "E235257",
        sellerBusinessName: "Pearl Dynamic (pvt) ltdPvt Ltd.",
        sellerProvince: "Sindh",
        invoiceDate: item.invoiceDate,
        invoiceRefNo: item.invoiceRefNo,
        sellerAddress: "Karachi",

        HSCODE: item.hsCode || item.HSCODE,

        buyerNTNCNIC:
          customer.NTN || customer.OwnerCnic || "",

        buyerBusinessName: customer.CutomerName || "",
        buyerProvince: customer.buyerProvince || "Sindh",
        buyerAddress: customer.CutomerName || "Karachi",

        buyerRegistrationType:
          customer.Registered == "1" ? "Registered" : "Unregistered",

        productDescription: item.productDescription,

        rate: ratePercent,

        uoM: "KG",
        valueSalesExcludingST: item.valueSalesExcludingST || 0,

        fixedNotifiedValueOrRetailPrice:
          item.productDescription === "3rd Schedule Goods"
            ? (gst / 18) * 100
            : 0,





        salesTaxWithheldAtSource: 0,
        extraTax: 0,

        salesTaxApplicable: salesTax,
        furtherTax: furtherTax,
        acctulFurtherTax: acctulFurtherTax,
        sroScheduleNo: 0,
        fedPayable: 0,
        discount: 0,
        difrenceBetweenFurteherTax: acctulFurtherTax - item.furtherTax,
        saleType: item.productDescription,
        sroItemSerialNo: 0,

        QTY: Number(item.totalQTY) || 0,
        TradeOffer: tradeOffer,
      };
    });
    const processedData = totalSalesData.map((item, index) => ({
      id: index + 1,
      buyerBusinessName: item.buyerBusinessName || "",
      buyerNTNCNIC: item.buyerNTNCNIC || "",
      buyerAddress: item.buyerAddress || "",
      buyerProvince: item.buyerProvince || "",
      invoiceDate : item.invoiceDate,
      buyerRegistrationType: item.buyerRegistrationType || "",
      sellerBusinessName: item.sellerBusinessName || "",
      sellerNTNCNIC: item.sellerNTNCNIC || "",
      sellerAddress: item.sellerAddress || "",
      sellerProvince: item.sellerProvince || "",
      productDescription: item.productDescription || "",
      invoiceType: item.invoiceType || "",
      saleType: item.saleType || "",
      uoM: item.uoM || "",
      invoiceRefNo: item.invoiceRefNo,
      rate: item.rate || "",
      QTY: Number(item.QTY),
      HSCODE: item.HSCODE,
      valueSalesExcludingST: item.valueSalesExcludingST || 0,
      salesTaxApplicable: item.salesTaxApplicable || 0,
      fixedNotifiedValueOrRetailPrice: item.fixedNotifiedValueOrRetailPrice || 0,
      discount: item.TradeOffer || 0,
      extraTax: item.extraTax || 0,
      furtherTax: item.furtherTax || 0,
      acctulFurtherTax: item.acctulFurtherTax || 0,
      difrenceBetweenFurteherTax: item.furtherTax - item.acctulFurtherTax || 0,
      fedPayable: item.fedPayable || 0,
      salesTaxWithheldAtSource: item.salesTaxWithheldAtSource || 0,
      sroScheduleNo: item.sroScheduleNo || 0,
      sroItemSerialNo: item.sroItemSerialNo || 0,
    })).filter(item => item.QTY > 0); // Filter out items with zero sales value
    setInvoiceData(processedData);
    setIsLoading(false);

  }

  // Process the incoming data
  useEffect(() => {
    getData()
  }, []);

  // Totals for invoice data
  const totals = useMemo(() => {
    const sumField = (field) =>
      invoiceData.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);

    return {
      totalQty: sumField("QTY"),
      totalInvoices: invoiceData.length,
      totalValueSales: sumField("valueSalesExcludingST"),
      totalSalesTax: sumField("salesTaxApplicable"),
      totalFixedValue: sumField("fixedNotifiedValueOrRetailPrice"),
      totalDiscount: sumField("discount"),
      totalExtraTax: sumField("extraTax"),
      totalFurtherTax: sumField("furtherTax"),
      totalAcctulFurtherTax: sumField("acctulFurtherTax"),
      totalDifrenceBetweenFurteherTax: sumField("difrenceBetweenFurteherTax"),
      totalFedPayable: sumField("fedPayable"),
      totalWithheldTax: sumField("salesTaxWithheldAtSource"),
    };
  }, [invoiceData]);

  // Export to Excel
  const exportToExcel = async () => {
    const exportRows = invoiceData.map(item => ({
      "invoiceRefNo": item.invoiceRefNo,
      "sellerBusinessName": item.sellerBusinessName,
      "sellerNTNCNIC": item.sellerNTNCNIC,
      "sellerAddress": item.sellerAddress,
      "sellerProvince": item.sellerProvince,
      "buyerBusinessName": item.buyerBusinessName,
      "buyerNTNCNIC": item.buyerNTNCNIC,
      "buyerAddress": item.buyerAddress,
      "buyerProvince": item.buyerProvince,
      "buyerRegistrationType": item.buyerRegistrationType,
      "productDescription": item.productDescription,
      "invoiceType": item.invoiceType,
      "saleType": item.saleType,      
      "UploadedDate": item.invoiceDate,
      "invoiceDate": item.invoiceDate,
      "uoM": item.uoM,
      "rate": Number(Number(item.rate || 0).toFixed(2)),
      "quantity": Number(Number(item.QTY || 0).toFixed(2)),
      "valueSalesExcludingST": Number(Number(item.valueSalesExcludingST || 0).toFixed(2)),
      "salesTaxApplicable": Number(Number(item.salesTaxApplicable || 0).toFixed(2)),
      "fixedNotifiedValueOrRetailPrice": Number(Number(item.fixedNotifiedValueOrRetailPrice || 0).toFixed(2)),
      "discount": Number(Number(item.discount || 0).toFixed(2)),
      "extraTax": Number(Number(item.extraTax || 0).toFixed(2)),
      "furtherTax": Number(Number(item.furtherTax || 0).toFixed(2)),
      "acctulaFurtherTax": Number(Number(item.acctulFurtherTax || 0).toFixed(2)),
      "difrenceBetweenFurteherTax": Number(Number(item.difrenceBetweenFurteherTax || 0).toFixed(2)),
      "sroScheduleNo": 0,
      "hsCode": item.HSCODE,
      "fedPayable": Number(Number(item.fedPayable || 0).toFixed(2)),
      "sroItemSerialNo": item.sroItemSerialNo,
      "Sales Tax Withheld": Number(Number(item.salesTaxWithheldAtSource || 0).toFixed(2))
    }));

    await exportProfessionalExcel({
      title: 'Sales Tax Invoices',
      fileName: 'Sales_Tax_Invoices',
      sheetName: 'Sales Tax Invoices',
      rows: exportRows,
      meta: [
        fillterData.data?.startDate && fillterData.data?.endDate
          ? `Period: ${fillterData.data.startDate} to ${fillterData.data.endDate}`
          : '',
        fillterData.data?.store ? `Store: ${fillterData.data.store}` : '',
      ].filter(Boolean),
      excludeKeys: ['_id', 'id'],
    });
  };

  // Export to Word
  const exportToWord = async () => {
    const headers = [
      "#", "Buyer Business", "Buyer NTN/CNIC", "Product Description",
      "Invoice Type", "Sale Type", "HSCODE", "QTY", "Value Sales", "Sales Tax",
      "Fixed Value", "Discount", "Extra Tax", "Further Tax", "FED Payable"
    ];

    const tableRows = [
      new TableRow({
        children: headers.map(header =>
          new TableCell({
            children: [new Paragraph(header)],
          })
        ),
      }),
      ...invoiceData.map((item) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(String(item.id || ""))] }),
            new TableCell({ children: [new Paragraph(item.buyerBusinessName || "")] }),
            new TableCell({ children: [new Paragraph(item.buyerNTNCNIC || "")] }),
            new TableCell({ children: [new Paragraph(item.productDescription || "")] }),
            new TableCell({ children: [new Paragraph(item.invoiceType || "")] }),
            new TableCell({ children: [new Paragraph(item.saleType || "")] }),
            new TableCell({ children: [new Paragraph(item.HSCODE || "")] }),
            new TableCell({ children: [new Paragraph(Number(Number(item.QTY || 0).toFixed(2)) || "")] }),
            new TableCell({ children: [new Paragraph(item.valueSalesExcludingST?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(item.salesTaxApplicable?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(item.fixedNotifiedValueOrRetailPrice?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(item.discount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(item.extraTax?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(item.furtherTax?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(item.fedPayable?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          ],
        })
      ),
    ];

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: "Pearl Dynamics", heading: "Heading1" }),
            new Paragraph({ text: "Sales Tax Invoice Report" }),
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
    saveAs(blob, "Sales_Tax_Invoices.docx");
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF("landscape");

    // Title and headers
    doc.setFontSize(16);
    doc.text("Sales Tax Invoice Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    // Prepare table data
    const headers = [
      "#", "Buyer Business", "Buyer NTN/CNIC", "Product Description",
      "Invoice Type", "Sale Type", "HSCODE", "QTY", "Value Sales", "Sales Tax",
      "Fixed Value", "Discount", "Extra Tax", "Further Tax", "FED Payable"
    ];

    const tableData = invoiceData.map(item => [
      item.id,
      item.buyerBusinessName || "",
      item.buyerNTNCNIC || "",
      item.productDescription || "",
      item.invoiceType || "",
      item.saleType || "",
      item.HSCODE,
      Number(Number(item.QTY || 0).toFixed(2)),
      { content: item.valueSalesExcludingST?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: item.salesTaxApplicable?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: item.fixedNotifiedValueOrRetailPrice?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: item.discount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: item.extraTax?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: item.furtherTax?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: item.fedPayable?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } }
    ]);

    // Add totals row
    tableData.push([
      { content: "TOTAL", colSpan: 7, styles: { fontStyle: 'bold', halign: 'center' } },
      { content: totals.totalValueSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.totalSalesTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.totalFixedValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.totalExtraTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.totalFurtherTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.totalFedPayable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right', fillColor: [22, 160, 133] } }
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 30,
      styles: {
        fontSize: 7,
        cellPadding: 2,
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
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
        10: { halign: 'right' },
        11: { halign: 'right' },
        12: { halign: 'right' }
      },
      margin: { top: 30 }
    });

    // Add summary section at the bottom
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text("Summary:", 14, finalY);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Invoices: ${totals.totalInvoices}`, 14, finalY + 5);
    doc.text(`Total Value Sales: ${totals.totalValueSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY + 10);
    doc.text(`Total Sales Tax: ${totals.totalSalesTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY + 15);
    doc.text(`Total Fixed Value: ${totals.totalFixedValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 80, finalY + 5);
    doc.text(`Total Discount: ${totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 80, finalY + 10);
    doc.text(`Total FED Payable: ${totals.totalFedPayable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 80, finalY + 15);
    doc.text(`Total Accounted Further Tax: ${totals.totalAcctulFurtherTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 80, finalY + 20);
    doc.text(`Total Difference Between Further Tax and Advance Tax: ${totals.totalDifrenceBetweenFurteherTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 80, finalY + 25);

    doc.save("Sales_Tax_Invoices.pdf");
  };

  // Print
  const handlePrint = () => {
    const content = reportRef.current.innerHTML;
    const win = window.open("", "_blank", "width=1400,height=800");
    win.document.write(`
      <html>
        <head>
          <title>Sales Tax Invoice Report</title>
          <style>
            body { font-family: Arial; padding:20px; }
            table { border-collapse: collapse; width:100%; font-size:8px; }
            th, td { border:1px solid #ccc; padding:3px; text-align:left; }
            th { background:#f4f4f4; font-weight:bold; }
            .numeric { text-align:right; }
            .summary-stats { margin:15px 0; font-weight:bold; }
            .invoice-table { min-width: 1600px; }
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
      <ReportPopupHeader title="Tax Report" />
      <div className="sales-report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dynamics</h2>
          <p>Sales Tax Invoice Report</p>
        </div>
        <div className="report-info">
          <p>Generated: {new Date().toLocaleString()}</p>
          <p>
            {invoiceData.length > 0
              ? `Total Invoices: ${invoiceData.length}`
              : "No data"}
          </p>
        </div>
      </div>

      <div className="summary-stats">
        <span>Total Invoices: {totals.totalInvoices}</span>
        <span>Value Sales: {totals.totalValueSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span>Sales Tax: {totals.totalSalesTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span>Fixed Value: {totals.totalFixedValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span>Discount: {totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span>Extra Tax: {totals.totalExtraTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span>Further Tax: {totals.totalFurtherTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span>FED Payable: {totals.totalFedPayable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
          </div>
        ) : error ? (
          <div className="no-data">{error}</div>
        ) : (
          <table className="sales-data-table invoice-table" border={"All"}>
            <thead>
              <tr>
                <th>#</th>
                <th>Invoice Date</th>
                <th>invoice Ref No</th>
                <th>Buyer Business Name</th>
                <th>Buyer NTN/CNIC</th>
                <th>Buyer Address</th>
                <th>Buyer Province</th>
                <th>Buyer Registration Type</th>
                <th>Seller Business Name</th>
                <th>Seller NTN</th>
                <th>Seller Address</th>
                <th>Seller Province</th>
                <th>Product Description</th>
                <th>Invoice Type</th>
                <th>Sale Type</th>
                <th>HSCODE</th>
                <th>QTY</th>
                <th>UoM</th>
                <th>Rate</th>
                <th>Value Sales Excluding ST</th>
                <th>Sales Tax Applicable</th>
                <th>Fixed Notified Value</th>
                <th>Discount</th>
                <th>Extra Tax</th>
                <th>Further Tax</th>
                <th>Accounted Further Tax</th>
                <th>Difference Between Further Tax and Advance Tax</th>
                <th>FED Payable</th>
                <th>Sales Tax Withheld</th>
                <th>SRO Schedule No</th>
                <th>SRO Item Serial No</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.length > 0 ? (
                invoiceData.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>{item.invoiceDate}</td>
                    <td>{item.invoiceRefNo}</td>
                    <td>{item.buyerBusinessName}</td>
                    <td>{item.buyerNTNCNIC}</td>
                    <td>{item.buyerAddress}</td>
                    <td>{item.buyerProvince}</td>
                    <td>{item.buyerRegistrationType}</td>
                    <td>{item.sellerBusinessName}</td>
                    <td>{item.sellerNTNCNIC}</td>
                    <td>{item.sellerAddress}</td>
                    <td>{item.sellerProvince}</td>
                    <td>{item.productDescription}</td>
                    <td>{item.invoiceType}</td>
                    <td>{item.saleType}</td>
                    <td>{item.HSCODE}</td>
                    <td>{Number(Number(item.QTY || 0).toFixed(2))}</td>
                    <td>{item.uoM}</td>
                    <td>{Number(Number(item.rate || 0).toFixed(2))}</td>
                    <td className="numeric">{item.valueSalesExcludingST?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="numeric">{item.salesTaxApplicable?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="numeric">{item.fixedNotifiedValueOrRetailPrice?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="numeric">{item.discount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="numeric">{item.extraTax?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="numeric">{item.furtherTax?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="numeric">{item.acctulFurtherTax?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="numeric">{item.difrenceBetweenFurteherTax?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="numeric">{item.fedPayable?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="numeric">{item.salesTaxWithheldAtSource?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{item.sroScheduleNo}</td>
                    <td>{item.sroItemSerialNo}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="31" className="no-data">No records found</td>
                </tr>
              )}
            </tbody>
            {invoiceData.length > 0 && (
              <tfoot>
                <tr className="footer-total">
                  <td colSpan="16">Total</td>
                  <td className="numeric">{totals.totalQty.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td></td>
                  <td></td>
                  <td className="numeric">{totals.totalValueSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{totals.totalSalesTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{totals.totalFixedValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{totals.totalExtraTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{totals.totalFurtherTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{totals.totalAcctulFurtherTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{totals.totalDifrenceBetweenFurteherTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{totals.totalFedPayable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{totals.totalWithheldTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td colSpan="2"></td>
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

      <style>{`
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
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .summary-stats span {
          background: #f8f9fa;
          padding: 6px 10px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 11px;
          border: 1px solid #e9ecef;
        }
        
        .table-container {
          overflow-x: auto;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .sales-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }
        
        .invoice-table {
          min-width: 2000px;
        }
        
        .sales-data-table th {
          background: #f8f9fa;
          padding: 8px 4px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 2px solid #e0e0e0;
          white-space: nowrap;
        }
        
        .sales-data-table td {
          padding: 6px 4px;
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
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
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
            font-size: 7px;
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

export default TaxReportPopup;