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

const CustomerSaleWiseSummry = ({ data = {} }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { startDate, endDate } = data;
  const [rows, setRows] = useState([]);
  const [customerWiseData, setCustomerWiseData] = useState([]);
  const [filter, setFilter] = useState("");
  const reportRef = useRef(null);
  const [count, setCount] = useState(1);

  // Fetch data
  const getData = async () => {
    setIsLoading(true);
    //console.log(data);
    setCount(2);
    try {
      const [res, dumpRes] = await Promise.all([
        getDataFundtion(
          `/SaleInvoice/SalesinvoiceSummry?startDate=${data.startDate}&endDate=${data.endDate}&Store=${data.store}`
        ),
        getDataFundtion(
          `/SaleInvoice/SalesDumpData?startDate=${data.startDate}&endDate=${data.endDate}&Store=${data.store}`
        ).catch(() => ({ data: [] })),
      ]);

      const geoLookups = buildInvoiceGeoLookups(data);
      const summaryRows = mergeSalesReturnInvoices(
        Array.isArray(res?.data) ? res.data : [],
        Array.isArray(dumpRes?.data) ? dumpRes.data : []
      );
      const alldata = summaryRows.map((item, idx) => {
        const client = data.Customer?.find((c) => c._id === item.Client);
        const geo = resolveInvoiceGeo({
          ...(client || {}),
          OrderBooker: item.OrderBooker || client?.OrderBooker,
        }, geoLookups);
        return {
        id: idx + 1,
        invoice: item.SalesInvoice || item.Invoice,
        date: item.SalesInvoiceDate || item.date,
        client: client?.CutomerName || client?.DistrbutorName,
        City: geo.City,
        Zone: geo.Zone,
        Region: geo.Region,
        ClientSalesFlow: client?.SalesFlowRef || client?.OldCode,
        code: client?.code,
        NTN: client?.NTN,
        STN: client?.STN,
        SalesFlowRef: item.SalesFlowRef || item.SalesFlowRef,
        Location: data.setlocation?.find((l)=> l.value === item.Location)?.label || "-",
        Store: data.storeforDrp?.find((s)=> s._id === item.Store)?.StoreName || "-",
        TotalAmount: Number((Number(item.TotalAmount) ?? Number(item.Amount) ?? 0) + (Number(item.LessAmount ?? 0) - Number(item.AddAmount ?? 0))),
        GrossAmount: Number(item.GrossAmount)  || 0,
        Gst: Number(item.Gst) || 0,
        ProductAmount: Number(item.ProductAmount) || 0,
        Advancetax: Number(item.Advancetax) || 0,
        discount: Number(item.discount) + Number(item.TTS) || 0,
        diBspass: Number(item.diBspass) || 0,
        RToffer: Number(item.RToffer) || 0,
        WToffer: Number(item.WToffer) || 0,
        RpDrive: Number(item.RpDrive) || 0,
        WHOLESALEDEAL: Number(item.WHOLESALEDEAL) || 0,
        RTWholeSale: Number(item.RTWholeSale) || 0,
        SubDisTPromotion: Number(item.SubDisTPromotion) || 0,
        TradeOffer: Number(item.TradeOffer) || 0,
        HOTZONEDRIVE: Number(item.HOTZONEDRIVE) || 0,
        SPECIALDISCOUNT: Number(item.SPECIALDISCOUNT) || 0,
      };
      });

      setRows(alldata);
      
      // Process customer-wise data
      processCustomerWiseData(alldata);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Process data for customer-wise summary
  const processCustomerWiseData = (invoiceData) => {
    const customerMap = new Map();

    invoiceData.forEach(invoice => {
      const customerKey = invoice.client || 'Unknown Customer';
      
      if (!customerMap.has(customerKey)) {
        customerMap.set(customerKey, {
          id: customerMap.size + 1,
          customer: customerKey,
          City: invoice.City,
          Zone: invoice.Zone,
          Region: invoice.Region,
          code: invoice.code,
          NTN: invoice.NTN,
          STN: invoice.STN,
          ClientSalesFlow: invoice.ClientSalesFlow,
          invoiceCount: 0,
          totalGrossAmount: 0,
          totalDiscount: 0,
          totalGst: 0,
          totalAdvanceTax: 0,
          totalAmount: 0,
          invoices: []
        });
      }

      const customerData = customerMap.get(customerKey);
      customerData.invoiceCount += 1;
      customerData.totalGrossAmount += invoice.GrossAmount;
      customerData.totalDiscount += invoice.discount;
      customerData.totalGst += invoice.Gst;
      customerData.totalAdvanceTax += invoice.Advancetax;
      customerData.totalAmount += invoice.TotalAmount;
      customerData.invoices.push(invoice);
    });

    // Convert map to array and sort by total amount (descending)
    const customerArray = Array.from(customerMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
    setCustomerWiseData(customerArray);
  };

  useEffect(() => {
    getData();
  }, [count == 1]);

  // Totals for customer-wise data
  const totals = useMemo(() => {
    return {
      totalCustomers: customerWiseData.length,
      totalInvoices: customerWiseData.reduce((sum, customer) => sum + customer.invoiceCount, 0),
      totalSale: customerWiseData.reduce((sum, customer) => sum + customer.totalAmount, 0),
      totalGross: customerWiseData.reduce((sum, customer) => sum + customer.totalGrossAmount, 0),
      totalDiscount: customerWiseData.reduce((sum, customer) => sum + customer.totalDiscount, 0),
      totalGst: customerWiseData.reduce((sum, customer) => sum + customer.totalGst, 0),
      totalAdvanceTax: customerWiseData.reduce((sum, customer) => sum + customer.totalAdvanceTax, 0),
    };
  }, [customerWiseData]);

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

    await exportProfessionalExcel({
      title: "Customer Wise Sale Summary",
      fileName: "Customer_Wise_Sale_Summary",
      sheetName: "Customer Wise Summary",
      rows: customerWiseData.map(customer => ({
        "Customer": customer.customer,
        "City": customer.City,
        "Zone": customer.Zone,
        "Region": customer.Region,
        "Code": customer.code,
        "NTN": customer.NTN,
        "STN": customer.STN,
        "Client Sales Flow": customer.ClientSalesFlow,
        "Invoice Count": customer.invoiceCount,
        "Gross Amount": round2n(customer.totalGrossAmount),
        "Discount": round2n(customer.totalDiscount),
        "GST": round2n(customer.totalGst),
        "Advance Tax": round2n(customer.totalAdvanceTax),
        "Total Amount": round2n(customer.totalAmount)
      })),
      meta: [
        `Period: ${data.startDate || ""} to ${data.endDate || ""}`,
        `Department: ${department}`,
        "Report Type: Customer Wise",
      ],
    });
  };

  // Export to Word
  const exportToWord = async () => {
    const headers = ["#", "Customer", "City", "Zone", "Region", "Code", "NTN", "STN", "Client Sales Flow", "Invoices", "Gross Amount", "Discount", "GST", "Advance Tax", "Total Amount"];
    
    const tableRows = [
      new TableRow({
        children: headers.map(header => 
          new TableCell({
            children: [new Paragraph(header)],
          })
        ),
      }),
      ...customerWiseData.map((customer) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(String(customer.id || ""))] }),
            new TableCell({ children: [new Paragraph(customer.customer || "")] }),
            new TableCell({ children: [new Paragraph(customer.City || "")] }),
            new TableCell({ children: [new Paragraph(customer.Zone || "")] }),
            new TableCell({ children: [new Paragraph(customer.Region || "")] }),
            new TableCell({ children: [new Paragraph(customer.code || "")] }),
            new TableCell({ children: [new Paragraph(customer.NTN || "")] }),
            new TableCell({ children: [new Paragraph(customer.STN || "")] }),
            new TableCell({ children: [new Paragraph(customer.ClientSalesFlow || "")] }),
            new TableCell({ children: [new Paragraph(customer.invoiceCount?.toString() || "0")] }),
            new TableCell({ children: [new Paragraph(fmt2(customer.totalGrossAmount) || "0")] }),
            new TableCell({ children: [new Paragraph(fmt2(customer.totalDiscount) || "0")] }),
            new TableCell({ children: [new Paragraph(fmt2(customer.totalGst) || "0")] }),
            new TableCell({ children: [new Paragraph(fmt2(customer.totalAdvanceTax) || "0")] }),
            new TableCell({ children: [new Paragraph(fmt2(customer.totalAmount) || "0")] }),
          ],
        })
      ),
    ];

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: "Pearl Dynamics", heading: "Heading1" }),
            new Paragraph({ text: "Customer Wise Sale Summary Report" }),
            new Paragraph({ text: `Period: ${formatDate(startDate)} to ${formatDate(endDate)}` }),
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
    saveAs(blob, "Customer_Wise_Sale_Summary.docx");
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF("landscape");

    // Title and headers
    doc.setFontSize(16);
    doc.text("Customer Wise Sale Summary Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 22);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // Prepare table data
    const headers = [
      "#", "Customer", "City", "Zone", "Region", "Code", "NTN", "STN", "Client Sales Flow", 
      "Invoices", "Gross Amount", "Discount", "GST", "Advance Tax", "Total Amount"
    ];

    const tableData = customerWiseData.map(customer => [
      customer.id,
      customer.customer || "",
      customer.City || "",
      customer.Zone || "",
      customer.Region || "",
      customer.code || "",
      customer.NTN || "",
      customer.STN || "",
      customer.ClientSalesFlow || "",
      customer.invoiceCount?.toString() || "0",
      { content: fmt2(customer.totalGrossAmount) || "0", styles: { halign: 'right' } },
      { content: fmt2(customer.totalDiscount) || "0", styles: { halign: 'right' } },
      { content: fmt2(customer.totalGst) || "0", styles: { halign: 'right' } },
      { content: fmt2(customer.totalAdvanceTax) || "0", styles: { halign: 'right' } },
      { content: fmt2(customer.totalAmount) || "0", styles: { halign: 'right' } }
    ]);

    // Add totals row
    tableData.push([
      { content: "TOTAL", colSpan: 9, styles: { fontStyle: 'bold', halign: 'center' } },
      { content: totals.totalInvoices.toString(), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalGross), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalDiscount), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalGst), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalAdvanceTax), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalSale), styles: { fontStyle: 'bold', halign: 'right', fillColor: [22, 160, 133] } }
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 35,
      styles: { 
        fontSize: 8,
        cellPadding: 2,
        lineColor: [50, 50, 50],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 'auto' }, // #
        1: { cellWidth: 'auto' }, // Customer
        6: { halign: 'right' }, // Invoices
        7: { halign: 'right' }, // Gross Amount
        8: { halign: 'right' }, // Discount
        9: { halign: 'right' }, // GST
        10: { halign: 'right' }, // Advance Tax
        11: { halign: 'right' }  // Total Amount
      },
      margin: { top: 35 }
    });

    // Add summary section at the bottom
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text("Summary:", 14, finalY);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Customers: ${totals.totalCustomers}`, 14, finalY + 6);
    doc.text(`Total Invoices: ${totals.totalInvoices}`, 14, finalY + 12);
    doc.text(`Grand Total Amount: ${fmt2(totals.totalSale)}`, 80, finalY + 6);
    doc.text(`Total Gross Amount: ${fmt2(totals.totalGross)}`, 80, finalY + 12);
    doc.text(`Total Discount: ${fmt2(totals.totalDiscount)}`, 140, finalY + 6);
    doc.text(`Total GST: ${fmt2(totals.totalGst)}`, 140, finalY + 12);
    doc.text(`Total Advance Tax: ${fmt2(totals.totalAdvanceTax)}`, 200, finalY + 6);

    doc.save("Customer_Wise_Sale_Summary.pdf");
  };

  // Print
  const handlePrint = () => {
    const content = reportRef.current.innerHTML;
    const win = window.open("", "_blank", "width=1400,height=800");
    win.document.write(`
      <html>
        <head>
          <title>Customer Wise Sale Summary Report</title>
          <style>
            body { font-family: Arial; padding:20px; }
            table { border-collapse: collapse; width:100%; font-size:12px; }
            th, td { border:1px solid #ccc; padding:6px; text-align:left; }
            th { background:#f4f4f4; font-weight:bold; }
            .numeric { text-align:right; }
            .summary-stats { margin:15px 0; font-weight:bold; }
            .customer-table { min-width: 1200px; }
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
          <p>Customer Wise Sale Summary Report</p>
        </div>
        <div className="report-info">
          <p>Generated: {new Date().toLocaleString()}</p>
          <p>
            {customerWiseData.length > 0
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
            Report Type : Custumer Wise Sales Summry
          </span>
      
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
          </div>
        ) : (
          <table className="sales-data-table customer-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>City</th>
                <th>Zone</th>
                <th>Region</th>
                <th>Code</th>
                <th>NTN</th>
                <th>STN</th>
                <th>Client Sales Flow</th>
                <th>Invoices</th>
                <th>Gross Amount</th>
                <th>Discount</th>
                <th>GST</th>
                <th>Advance Tax</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {customerWiseData.length > 0 ? (
                customerWiseData.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.id}</td>
                    <td>{customer.customer}</td>
                    <td>{customer.City}</td>
                    <td>{customer.Zone}</td>
                    <td>{customer.Region}</td>
                    <td>{customer.code}</td>
                    <td>{customer.NTN}</td>
                    <td>{customer.STN}</td>
                    <td>{customer.ClientSalesFlow}</td>
                    <td className="numeric">{customer.invoiceCount}</td>
                    <td className="numeric">{fmt2(customer.totalGrossAmount)}</td>
                    <td className="numeric">{fmt2(customer.totalDiscount)}</td>
                    <td className="numeric">{fmt2(customer.totalGst)}</td>
                    <td className="numeric">{fmt2(customer.totalAdvanceTax)}</td>
                    <td className="numeric">{fmt2(customer.totalAmount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="15" className="no-data">No records found</td>
                </tr>
              )}
            </tbody>
            {customerWiseData.length > 0 && (
              <tfoot>
                <tr className="footer-total">
                  <td colSpan="9">Total</td>
                  <td className="numeric">{totals.totalInvoices}</td>
                  <td className="numeric">{fmt2(totals.totalGross)}</td>
                  <td className="numeric">{fmt2(totals.totalDiscount)}</td>
                  <td className="numeric">{fmt2(totals.totalGst)}</td>
                  <td className="numeric">{fmt2(totals.totalAdvanceTax)}</td>
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
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .summary-stats span {
          background: #f8f9fa;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 12px;
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
          font-size: 12px;
        }
        
        .customer-table {
          min-width: 1200px;
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

export default CustomerSaleWiseSummry;