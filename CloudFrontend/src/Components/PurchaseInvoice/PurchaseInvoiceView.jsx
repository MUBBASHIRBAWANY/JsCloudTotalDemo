import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, TextRun } from "docx";
import { getDataFundtion, updateDataFunction, deleteDataFunction, createDataFunction } from '../../Api/CRUDFunctions';

const PurchaseInvoiceView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [status, setStatus] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [voucherData, setVoucherData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
    const [disable, setdisable] = useState(false)

  const PurchaseInvoice = useSelector((state) => state.PurchaseInvoice.PurchaseInvoice);
  const Vendor = useSelector((state) => state.Vendor.state);
  const Products = useSelector((state) => state.Product.product);
  const Admin = useSelector((state) => state.AdminReducer.AdminReducer);
  const Store = useSelector((state) => state.Store.Store);
  const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const PostPurchase = UserRihts.find((item) => item == "Post Purchase")
  const UnPostPurchase = UserRihts.find((item) => item == "UnPost Purchase")
  
  const editInvoice = PurchaseInvoice.find((item) => item._id === id);
console.log(editInvoice)
  const companyInfo = {
    name: "PearlDynamic Pvt Ltd",
    address: "C20 Site Karachi",
    city: "Karachi",
    phone: "----",
    email: "info@PearlDynamic",
    website: "www.pearldaynamic.com"
  };

  useEffect(() => {
    if (editInvoice) {
      setTableData(editInvoice.PurchaseData || []);
      setStatus(editInvoice.PostStatus || false);
      setIsLoading(false);
    }
  }, [editInvoice]);

  useEffect(() => {
    if (voucherData?.length > 0) {
      setIsLoading(false);
    }
  }, [voucherData]);

  const getProductName = (productId) => {
    const product = Products.find((p) => p._id === productId);
    return product ? `${product.salesFlowRef} ${product.ProductName}` : 'N/A';
  };

  const getVendorName = (vendorId) => {
    const vendor = Vendor.find((v) => v._id === vendorId);
    return vendor ? vendor.VendorName : 'N/A';
  };

  const getStoreName = (storeId) => {
    const store = Store.find((s) => s._id === storeId);
    return store ? store.StoreName : 'N/A';
  };

  const getAccountName = (accountId) => {
    const account = Accounts.find((a) => a._id === accountId);
    return account ? `${account.AccountName} (${account.AccountCode})` : 'N/A';
  };

  const Voucher = async () => {
    try {
      const data = await getDataFundtion(`/Voucher/getVoucherByNumber/Pr${editInvoice.PurchaseInvoice}`);
      setVoucherData(data.data);
    } catch (error) {
      toast.error("Error fetching voucher data");
    }
  };

  
  // Calculate totals
  const totalDiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0);
  const totalGST = tableData.reduce((sum, row) => sum + (parseFloat(row.Gst) || 0), 0);
  const totalBox = tableData.reduce((sum, row) => sum + (parseInt(row.box) || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);
  const totalUnit = tableData.reduce((sum, row) => sum + (parseInt(row.unit) || 0), 0);
  const totalGrossAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.GrossAmount) || 0), 0);
  const totalValueAfterDiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.ValueAfterDiscout) || 0), 0);
  const totalRetailValue = tableData.reduce((sum, row) => sum + (parseFloat(row.RetailValue) || 0), 0);
  const totalValuewithGst = tableData.reduce((sum, row) => sum + (parseFloat(row.ValuewithGst) || 0), 0);
  const netAmuntWithAdvnaceTax = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmuntWithAdvnaceTax) || 0), 0);
  const AdvanceTax = tableData.reduce((sum, row) => sum + (parseFloat(row.AdvanceTax) || 0), 0);
  const AfterTaxdiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.AfterTaxdiscount) || 0), 0);
  const totalNetAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0);

  const handlePostUnpost = async (action) => {
        setdisable(true)

    const VoucharData = [
      {
        Account: Admin.finishedGoods,
        Debit: totalGrossAmount,
        store: editInvoice.Store,
      },
      {
        Account: Admin.PurchaseDiscount,
        Credit: totalDiscount + Number(editInvoice.Discount),
        store: editInvoice.Store,
      },
      {
        Account: Admin.TradeDiscount,
        Credit: AfterTaxdiscount,
        store: editInvoice.Store,
      },
      {
        Account: Admin.Gst,
        Debit: totalGST + Number(editInvoice.GST || 0),
        store: editInvoice.Store,
      },
      {
        Account: Admin.AdvanceTax,
        Debit: editInvoice.AdvanceTax,
        store: editInvoice.Store,
      },
      {
        Account: Admin.Vendor,
        Credit: editInvoice.TotalAmount,
        store: editInvoice.Store,
      },
    ].filter(item => (item.Debit ?? 0) !== 0 || (item.Credit ?? 0) !== 0);
//console.log(VoucharData)
    try {
      const AccountData = {
        VoucherType: "Pr",
        VoucherDate: editInvoice.PurchaseInvoiceDate,
        status: "Post",
        VoucherNumber: `Pr${editInvoice?.PurchaseInvoice}`,
        VoucharData: VoucharData
      };

      let accountsRes = '';
      if (action === true) {
        accountsRes = await createDataFunction('/Voucher/createSystemVoucher', AccountData);
      } else {
        await deleteDataFunction(`/Voucher/deleteVoucher/Pr${editInvoice.PurchaseInvoice}`);
      }

      const res = await updateDataFunction(`/PurchaseInvoice/Changestatus/${id}`, {
        status: action,
        data: editInvoice.PurchaseData,
        Location: editInvoice.Location,
        Store: editInvoice.Store,
        Type : editInvoice.Type,
        RCNumber : editInvoice.RCNumber,
        VoucherRef: accountsRes?.voucher?._id || ""
      });
      
      toast.success(`Invoice ${action ? 'posted' : 'unposted'} successfully!`);
      setStatus(action);
      setTimeout(() => navigate('/PurchaseInvoiceList'), 1500);
    } catch (error) {
      toast.error(`Error ${action ? 'posting' : 'unposting'} invoice: ${error.message}`);
    }
  };

  // PDF Export Function
  const exportPDF = () => {
    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    // Company header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(companyInfo.name, pageWidth / 2, 40, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(companyInfo.address, pageWidth / 2, 60, { align: "center" });
    doc.text(companyInfo.city, pageWidth / 2, 75, { align: "center" });
    doc.text(`${companyInfo.phone} | ${companyInfo.email} | ${companyInfo.website}`, pageWidth / 2, 90, { align: "center" });

    // Invoice title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PURCHASE INVOICE", pageWidth / 2, 120, { align: "center" });

    // Invoice details
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice Number: ${editInvoice?.PurchaseInvoice}`, 40, 140);
    doc.text(`Date: ${new Date(editInvoice?.PurchaseInvoiceDate).toLocaleDateString('en-GB')}`, 40, 155);
    doc.text(`Vendor: ${getVendorName(editInvoice?.Vendor)}`, 40, 170);
    doc.text(`Store: ${getStoreName(editInvoice?.Store)}`, 40, 185);
    doc.text(`Status: ${status ? 'Posted' : 'Draft'}`, 40, 200);

    // Prepare table data
    const tableColumn = [
      "Product", 
      "Unit", 
      "CTN", 
      "Box", 
      "Retail Value", 
      "Trade Value", 
      "Per Box Value", 
      "Discount", 
      "After Discount", 
      "GST", 
      "Value with Gst", 
      "Net Amount"
    ];
    
    const tableRows = tableData.map(row => [
      getProductName(row.product),
      row.unit || 0,
      row.carton || 0,
      row.box || 0,
      Number(row.RetailValue || 0).toFixed(2),
      Number(row.GrossAmount || 0).toFixed(2),
      Number(row.PerBoxValueGrs || 0).toFixed(2),
      Number(row.discount || 0).toFixed(2),
      Number(row.ValueAfterDiscout || 0).toFixed(2),
      Number(row.Gst || 0).toFixed(2),
      Number(row.ValuewithGst || 0).toFixed(2),
      Number(row.netAmunt || 0).toFixed(2)
    ]);

    // Add totals row
    tableRows.push([
      "TOTAL",
      totalUnit,
      totalCarton,
      totalBox,
      totalRetailValue.toFixed(2),
      totalGrossAmount.toFixed(2),
      "-",
      totalDiscount.toFixed(2),
      totalValueAfterDiscount.toFixed(2),
      totalGST.toFixed(2),
      totalValuewithGst.toFixed(2),
      totalNetAmount.toFixed(2)
    ]);

    // Generate the table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 220,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
      didDrawPage: function (data) {
        // Footer on each page
        doc.setFontSize(9);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 40, doc.internal.pageSize.height - 30);
        doc.text("Developed by JS International", pageWidth / 2, doc.internal.pageSize.height - 30, { align: "center" });
      }
    });

    doc.save(`PurchaseInvoice_${editInvoice?.PurchaseInvoice}.pdf`);
  };

  // Excel Export Function
  const handleExcel = () => {
    const wb = XLSX.utils.book_new();

    // Prepare data
    const excelData = [
      [companyInfo.name],
      [companyInfo.address],
      [companyInfo.city],
      [`${companyInfo.phone} | ${companyInfo.email} | ${companyInfo.website}`],
      [],
      ["PURCHASE INVOICE"],
      [],
      [`Invoice Number: ${editInvoice?.PurchaseInvoice}`],
      [`Date: ${new Date(editInvoice?.PurchaseInvoiceDate).toLocaleDateString('en-GB')}`],
      [`Vendor: ${getVendorName(editInvoice?.Vendor)}`],
      [`Store: ${getStoreName(editInvoice?.Store)}`],
      [`Status: ${status ? 'Posted' : 'Draft'}`],
      [],
      ["Product", "Unit", "CTN", "Box", "Retail Value", "Trade Value", "Per Box Value", "Discount", "After Discount", "GST", "Value with Gst", "Net Amount"]
    ];

    // Add rows
    tableData.forEach(row => {
      excelData.push([
        getProductName(row.product),
        row.unit || 0,
        row.carton || 0,
        row.box || 0,
        Number(row.RetailValue || 0),
        Number(row.GrossAmount || 0),
        Number(row.PerBoxValueGrs || 0),
        Number(row.discount || 0),
        Number(row.ValueAfterDiscout || 0),
        Number(row.Gst || 0),
        Number(row.ValuewithGst || 0),
        Number(row.netAmunt || 0)
      ]);
    });

    // Add totals row
    excelData.push([
      "TOTAL",
      totalUnit,
      totalCarton,
      totalBox,
      totalRetailValue,
      totalGrossAmount,
      "-",
      totalDiscount,
      totalValueAfterDiscount,
      totalGST,
      totalValuewithGst,
      totalNetAmount
    ]);

    // Add summary
    excelData.push([]);
    excelData.push(["SUMMARY"]);
    excelData.push(["Advance Tax:", AdvanceTax]);
    excelData.push(["After Tax Discount:", AfterTaxdiscount]);
    excelData.push(["Net Amount with Advance Tax:", netAmuntWithAdvnaceTax]);

    // Add footer
    excelData.push([]);
    excelData.push([`Generated on: ${new Date().toLocaleDateString()}`]);

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Invoice");
    XLSX.writeFile(wb, `PurchaseInvoice_${editInvoice?.PurchaseInvoice}.xlsx`);
  };

  // Word Export Function
  const handleWord = async () => {
    // Prepare table rows
    const tableRows = tableData.map(row => {
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(getProductName(row.product))] }),
          new TableCell({ children: [new Paragraph(String(row.unit || 0))] }),
          new TableCell({ children: [new Paragraph(String(row.carton || 0))] }),
          new TableCell({ children: [new Paragraph(String(row.box || 0))] }),
          new TableCell({ children: [new Paragraph(Number(row.RetailValue || 0).toFixed(2))] }),
          new TableCell({ children: [new Paragraph(Number(row.GrossAmount || 0).toFixed(2))] }),
          new TableCell({ children: [new Paragraph(Number(row.PerBoxValueGrs || 0).toFixed(2))] }),
          new TableCell({ children: [new Paragraph(Number(row.discount || 0).toFixed(2))] }),
          new TableCell({ children: [new Paragraph(Number(row.ValueAfterDiscout || 0).toFixed(2))] }),
          new TableCell({ children: [new Paragraph(Number(row.Gst || 0).toFixed(2))] }),
          new TableCell({ children: [new Paragraph(Number(row.ValuewithGst || 0).toFixed(2))] }),
          new TableCell({ children: [new Paragraph(Number(row.netAmunt || 0).toFixed(2))] })
        ]
      });
    });

    // Add totals row
    tableRows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("TOTAL")], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(String(totalUnit))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(String(totalCarton))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(String(totalBox))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalRetailValue.toFixed(2))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalGrossAmount.toFixed(2))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph("-")], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalDiscount.toFixed(2))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalValueAfterDiscount.toFixed(2))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalGST.toFixed(2))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalValuewithGst.toFixed(2))], shading: { fill: "DDEBF7" } }),
        new TableCell({ children: [new Paragraph(totalNetAmount.toFixed(2))], shading: { fill: "DDEBF7" } })
      ]
    }));

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Company header
            new Paragraph({
              children: [new TextRun({ text: companyInfo.name, bold: true, size: 28 })],
              alignment: 'center'
            }),
            new Paragraph({
              children: [new TextRun({ text: companyInfo.address, size: 22 })],
              alignment: 'center'
            }),
            new Paragraph({
              children: [new TextRun({ text: companyInfo.city, size: 22 })],
              alignment: 'center'
            }),
            new Paragraph({
              children: [new TextRun({ text: `${companyInfo.phone} | ${companyInfo.email} | ${companyInfo.website}`, size: 22 })],
              alignment: 'center',
              spacing: { after: 400 }
            }),

            // Invoice title
            new Paragraph({
              text: "PURCHASE INVOICE",
              heading: HeadingLevel.HEADING_1,
              alignment: 'center',
              spacing: { after: 400 }
            }),

            // Invoice details
            new Paragraph({
              children: [new TextRun({ text: `Invoice Number: ${editInvoice?.PurchaseInvoice}`, bold: true })],
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: `Date: ${new Date(editInvoice?.PurchaseInvoiceDate).toLocaleDateString('en-GB')}`,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: `Vendor: ${getVendorName(editInvoice?.Vendor)}`,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: `Store: ${getStoreName(editInvoice?.Store)}`,
              spacing: { after: 400 }
            }),

            // Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Product")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("Unit")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("CTN")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("Box")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("Retail Value")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("Trade Value")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("Per Box Value")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("Discount")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("After Discount")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("GST")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("Value with Gst")], shading: { fill: "DDEBF7" } }),
                    new TableCell({ children: [new Paragraph("Net Amount")], shading: { fill: "DDEBF7" } })
                  ]
                }),
                ...tableRows
              ]
            }),

            // Summary
            new Paragraph({
              text: "SUMMARY",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 600 }
            }),
            new Paragraph(`Advance Tax: ${AdvanceTax.toFixed(2)}`),
            new Paragraph(`After Tax Discount: ${AfterTaxdiscount.toFixed(2)}`),
            new Paragraph(`Net Amount with Advance Tax: ${netAmuntWithAdvnaceTax.toFixed(2)}`),

            // Footer
            new Paragraph({
              text: `Generated on: ${new Date().toLocaleDateString()}`,
              spacing: { before: 600 }
            })
          ]
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PurchaseInvoice_${editInvoice?.PurchaseInvoice}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print Function
  const handlePrint = () => {
    const printContent = document.getElementById("invoiceView").innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Invoice - ${editInvoice?.PurchaseInvoice}</title>
          <style>
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm 5mm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                font-family: Arial, sans-serif;
              }
              .summary {
                page-break-inside: avoid;
              }
              .print-footer {
                page-break-inside: avoid;
              }
            }

            body {
              font-family: Arial, sans-serif;
              color: #333;
              line-height: 1.5;
              padding: 10px;
              margin: 0;
            }
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
            }
            .invoice-title {
              text-align: center;
              font-size: 20px;
              margin: 20px 0;
              font-weight: bold;
              letter-spacing: 1px;
            }
            .invoice-details {
              margin-bottom: 20px;
              font-size: 10px;
            }
            .invoice-details p {
              margin: 3px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 9px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 5px 6px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .total-row {
              font-weight: bold;
              background-color: #f0f0f0;
            }
            .summary {
              margin-top: 20px;
              font-size: 10px;
              border-top: 2px solid #333;
              padding-top: 10px;
              width: 200px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
            }
            .summary-row span:first-child {
              color: #555;
            }
            .print-footer {
              font-size: 8px;
              text-align: center;
              color: #555;
              border-top: 1px solid #ccc;
              padding: 8px 0;
              margin-top: 20px;
            }
            .Products_Detail {
              font-size: 8px;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${companyInfo.name}</h1>
            <p>${companyInfo.address}, ${companyInfo.city}</p>
            <p>${companyInfo.phone} | ${companyInfo.email} | ${companyInfo.website}</p>
          </div>
          
          <div class="invoice-title">PURCHASE INVOICE</div>
          
          <div class="invoice-details">
            <p><strong>Invoice Number:</strong> ${editInvoice?.PurchaseInvoice}</p>
            <p><strong>Date:</strong> ${new Date(editInvoice?.PurchaseInvoiceDate).toLocaleDateString('en-GB')}</p>
            <p><strong>Vendor:</strong> ${getVendorName(editInvoice?.Vendor)}</p>
            <p><strong>Store:</strong> ${getStoreName(editInvoice?.Store)}</p>
            <p><strong>Status:</strong> ${status ? 'Posted' : 'Draft'}</p>
          </div>
          
          <div class="Products_Detail"> 
            ${printContent}
          </div>
          
          <div class="summary">
            <h3>Invoice Summary</h3>
            <div class="summary-row">
              <span>Total Retail Value:</span>
              <span>${totalRetailValue.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Total Trade Value:</span>
              <span>${totalGrossAmount.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Total Discount:</span>
              <span>-${totalDiscount.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Total GST:</span>
              <span>${totalGST.toFixed(2) + Number(editInvoice.GST) }</span>
            </div>
            <div class="summary-row">
              <span>Advance Tax:</span>
              <span>${AdvanceTax.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>After Tax Discount:</span>
              <span>-${AfterTaxdiscount.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Net Amount:</span>
              <span>${totalNetAmount.toFixed(2)}</span>
            </div>
          </div>

          <div class="print-footer">
            Generated on: ${new Date().toLocaleDateString()}<br>
            Developed by JS International
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[color:var(--pd-primary)] mx-auto"></div>
          <p className="mt-4 pd-text-muted">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (!editInvoice) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="pd-bg-surface p-8 rounded-xl shadow-lg max-w-md text-center">
          <div className="pd-bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 pd-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="pd-page-title mb-2">Invoice Not Found</h2>
          <p className="pd-text-muted mb-6">
            The invoice you requested could not be found.
          </p>
          <button
            onClick={() => navigate("/PurchaseInvoiceList")}
            className="pd-btn-save"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pd-bg-muted py-8 px-4 sm:px-6 lg:px-8">
      <ToastContainer />
      <div className="max-w-7xl mx-auto">
        {/* Document Header */}
        <div className="pd-bg-surface rounded-xl shadow-lg overflow-hidden mb-8 border pd-border-default border">
          <div className="bg-gradient-to-r from-blue-800 to-indigo-900 px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-6 md:mb-0 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white">{companyInfo.name}</h1>
                <p className="text-blue-200 mt-2">{companyInfo.address}</p>
                <p className="text-blue-200">{companyInfo.city}</p>
              </div>

              <div className="pd-card p-4">
                <div className="text-center">
                  <h2 className="pd-page-title">PURCHASE INVOICE</h2>
                  <div className="mt-3 pd-text-muted">
                    <div>Invoice Number: <span className="font-semibold">{editInvoice?.PurchaseInvoice}</span></div>
                    <div className="mt-1">Date: {new Date(editInvoice?.PurchaseInvoiceDate).toLocaleDateString('en-GB')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between">
              <div className="mb-6 md:mb-0">
                <h3 className="text-lg font-semibold pd-text-body">Vendor Information</h3>
                <div className="mt-2 pd-bg-muted p-4 rounded-lg">
                  <p className="font-medium pd-text-body">{getVendorName(editInvoice?.Vendor)}</p>
                  <p className="pd-text-muted">Store: {getStoreName(editInvoice?.Store)}</p>
                  <p className="pd-text-muted">Status: <span className={`font-semibold ${status ? 'pd-stat-positive' : 'text-yellow-600'}`}>
                    {status ? 'Posted' : 'Draft'}
                  </span></p>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <div className="flex flex-wrap gap-3 mb-4">
                  {status === false && PostPurchase && (
                    <button
                      onClick={() => handlePostUnpost(true)}
                      disabled={disable}
                      className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Post Invoice
                    </button>
                  )}
                  {status === true && (
                    <>
                      <button
                        onClick={Voucher}
                        disabled={disable}
                        className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-md"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        View Voucher
                      </button>
                      {UnPostPurchase && (
                        <button
                          onClick={() => handlePostUnpost(false)}
                          className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Unpost Invoice
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => navigate("/PurchaseInvoiceList")}
                    className="flex items-center px-4 py-2 bg-gray-600 hover:pd-bg-readonly text-white rounded-lg transition-colors shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to List
                  </button>
                  <button
                    onClick={exportPDF}
                    className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    Export PDF
                  </button>
                  <button
                    onClick={handleExcel}
                    className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    Export Excel
                  </button>
                  <button
                    onClick={handleWord}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:pd-btn-save rounded-lg transition-colors shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    Export Word
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                    </svg>
                    Print
                  </button>
                </div>

                <div className="pd-bg-muted p-4 rounded-lg border pd-border-default border w-full max-w-xs">
                  <h4 className="font-semibold pd-text-body mb-2">Invoice Summary</h4>
                  <div className="flex justify-between mb-1">
                    <span className="pd-text-muted">Total Items:</span>
                    <span className="font-medium">{tableData.length}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="pd-text-muted">Total Units:</span>
                    <span className="font-medium">{totalUnit}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="pd-text-muted">Total CTN:</span>
                    <span className="font-medium">{totalCarton}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="pd-text-muted">Total Box:</span>
                    <span className="font-medium">{totalBox}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="pd-text-muted">Total Discount:</span>
                    <span className="font-medium pd-stat-negative">-{totalDiscount + Number(editInvoice.Discount)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="pd-text-muted">Total GST:</span>
                    <span className="font-medium">{(totalGST + Number(editInvoice.GST)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="pd-text-muted">Advance Tax</span>
                    <span className="font-medium">{(Number(editInvoice.AdvanceTax)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="pd-text-muted">Net Amount:</span>
                    <span className="font-medium pd-stat-positive">{totalNetAmount +  Number(editInvoice.AdvanceTax) +  (totalGST + Number(editInvoice.GST)) - (totalDiscount + Number(editInvoice.Discount))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div id="invoiceView" className="pd-bg-surface rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="px-6 py-5 border-b pd-border-default border pd-bg-muted">
            <h3 className="pd-section-title">Purchase Details</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[color:var(--pd-border-card)]">
              <thead className="pd-bg-muted">
                <tr>
                  {['Product', 'Unit', 'CTN', 'Box', 'Retail Value', 'Trade Value', 'Per Box Value', 'Discount', 'After Discount', 'GST', 'Value with Gst', 'Net Amount'].map((header) => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium pd-text-body uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="pd-bg-surface divide-y divide-[color:var(--pd-border-card)]">
                {tableData.map((row, index) => (
                  <tr key={index} >
                    <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">
                      {getProductName(row.product)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.carton}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.box}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{Number(row.RetailValue).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{Number(row.GrossAmount).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{Number(row.PerBoxValueGrs).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{Number(row.discount).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{Number(row.ValueAfterDiscout).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{Number(row.Gst).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{Number(row.ValuewithGst).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium pd-text-primary">{Number(row.netAmunt).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="pd-bg-muted font-semibold">
                <tr>
                  <td className="px-6 py-4 text-sm pd-text-body">Total</td>
                  <td className="px-6 py-4 text-sm pd-text-body">{totalUnit}</td>
                  <td className="px-6 py-4 text-sm pd-text-body">{totalCarton}</td>
                  <td className="px-6 py-4 text-sm pd-text-body">{totalBox}</td>
                  <td className="px-6 py-4 text-sm pd-text-body">{totalRetailValue.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm pd-text-body">{totalGrossAmount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm pd-text-body">-</td>
                  <td className="px-6 py-4 text-sm pd-text-body">{totalDiscount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm pd-text-body">{totalValueAfterDiscount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm pd-text-body">{totalGST.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm pd-text-body">{totalValuewithGst.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm pd-text-primary">{totalNetAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Voucher Table */}
        {voucherData?.VoucherNumber && (
          <div className="p-6 pd-bg-surface rounded-lg shadow-md mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold pd-text-body mb-2">📄 Voucher Details</h2>
              <div className="grid grid-cols-2 gap-4 pd-text-body">
                <div><strong>Voucher Number:</strong> {voucherData?.VoucherNumber}</div>
                <div><strong>Voucher Date:</strong> {voucherData?.VoucherDate}</div>
                <div><strong>Voucher Type:</strong> {voucherData?.VoucherType}</div>
                <div><strong>Status:</strong> {voucherData?.status}</div>
              </div>
            </div>

            <div>
              <h3 className="pd-page-title mb-4">💰 Voucher Entries</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full pd-bg-surface border pd-border-default border text-sm">
                  <thead className="pd-bg-muted">
                    <tr>
                      <th className="px-4 py-2 border">#</th>
                      <th className="px-4 py-2 border">Account</th>
                      <th className="px-4 py-2 border">Debit</th>
                      <th className="px-4 py-2 border">Credit</th>
                      <th className="px-4 py-2 border">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voucherData?.VoucharData?.map((item, index) => (
                      <tr key={index} className="text-center hover:pd-bg-muted">
                        <td className="px-4 py-2 border">{index + 1}</td>
                        <td className="px-4 py-2 border">{getAccountName(item.Account)}</td>
                        <td className="px-4 py-2 border">
                          {item.Debit !== undefined ? item.Debit.toLocaleString() : '–'}
                        </td>
                        <td className="px-4 py-2 border">
                          {item.Credit !== undefined ? item.Credit.toLocaleString() : '–'}
                        </td>
                        <td className="px-4 py-2 border">{getStoreName(item.store)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Authorization Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="pd-bg-surface p-6 rounded-xl shadow border pd-border-default border">
            <h4 className="text-sm font-semibold pd-text-body mb-4">Prepared By</h4>
            <div className="mt-8 pt-2 border-t pd-border-default border">
              <p className="text-sm pd-text-muted">Signature:</p>
              <div className="mt-6 h-0.5 pd-bg-readonly w-full"></div>
              <p className="mt-2 text-sm pd-text-muted">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="pd-bg-surface p-6 rounded-xl shadow border pd-border-default border">
            <h4 className="text-sm font-semibold pd-text-body mb-4">Verified By</h4>
            <div className="mt-8 pt-2 border-t pd-border-default border">
              <p className="text-sm pd-text-muted">Signature:</p>
              <div className="mt-6 h-0.5 pd-bg-readonly w-full"></div>
              <p className="mt-2 text-sm pd-text-muted">Date: ___________</p>
            </div>
          </div>

          <div className="pd-bg-surface p-6 rounded-xl shadow border pd-border-default border">
            <h4 className="text-sm font-semibold pd-text-body mb-4">Received By</h4>
            <div className="mt-8 pt-2 border-t pd-border-default border">
              <p className="text-sm pd-text-muted">Signature:</p>
              <div className="mt-6 h-0.5 pd-bg-readonly w-full"></div>
              <p className="mt-2 text-sm pd-text-muted">Date: ___________</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm pd-text-muted">
          <p>{companyInfo.name} | {companyInfo.address} | {companyInfo.city}</p>
          <p className="mt-1">{companyInfo.phone} | {companyInfo.email} | {companyInfo.website}</p>
          <p className="mt-2">Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          <p className="mt-1">Developed by JS International</p>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoiceView;