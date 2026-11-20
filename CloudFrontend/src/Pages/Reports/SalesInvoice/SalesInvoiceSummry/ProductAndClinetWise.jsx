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
import { salesReturnProductClientRows } from "./salesReturnSummaryRows";
import { fmt2, round2n } from "../../../../utils/round2";

const ProductSaleWiseSummry = ({ data = {} }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { startDate, endDate } = data;
    const [rows, setRows] = useState([]);
    const [productWiseData, setProductWiseData] = useState([]);
    const [filter, setFilter] = useState("");
    const reportRef = useRef(null);
    const [count, setCount] = useState(1);

    // Fetch data
    const getData = async () => {
        setIsLoading(true);
        //console.log("Request data:", data);
        setCount(2);
        try {
            const [res, dumpRes] = await Promise.all([
                getDataFundtion(
                    `/SaleInvoice/ProductSalesSummry?startDate=${data.startDate}&endDate=${data.endDate}&Store=${data.store}`
                ),
                getDataFundtion(
                    `/SaleInvoice/SalesDumpData?startDate=${data.startDate}&endDate=${data.endDate}&Store=${data.store}`
                ).catch(() => ({ data: [] })),
            ]);
            const returnRows = salesReturnProductClientRows(
                Array.isArray(dumpRes?.data) ? dumpRes.data : []
            ).filter((row) => (data.SkuOptions || []).some((product) => product._id === row.Product));
            const sortedData = [...(Array.isArray(res?.data) ? res.data : []), ...returnRows]
                .sort((a, b) => String(b.Client || "").localeCompare(String(a.Client || "")));

            const alldata = sortedData.map((item, index) => ({
                id: index + 1,
                productCode: data.SkuOptions.find((p) => p._id === item.Product)?.code,
                Client: data.Customer?.find((c) => c._id === item.Client)?.CutomerName || data.Customer?.find((c) => c._id === item.Client)?.DistrbutorName,
                ClientSalesFlow: data.Customer?.find((c) => c._id === item.Client)?.SalesFlowRef || data.Customer?.find((c) => c._id === item.Client)?.OldCode,
                productName: data.SkuOptions.find((p) => p._id === item.Product)?.ProductName,
                SalesflowRef: data.SkuOptions.find((p) => p._id === item.Product)?.salesFlowRef,
                totalBox: item.carton || 0,
                carton : item.carton / (data.SkuOptions.find((p) => p._id === item.Product).BoxinCarton),
                totalGrossAmount: item.GrossAmount || 0,
                totalGst: item.Gst || 0,
                totalAdvanceTax: item.Advancetax || 0,
                totalDiscount: item.discount || 0,
                totalNetAmount: item.GrossAmount + item.Gst + item.Advancetax - item.discount || 0,
                TotalAmount: item.TotalNetAmount || 0
            }));

            setProductWiseData(alldata);
        } catch (error) {
            console.error("Error fetching product-wise sales summary:", error);
        } finally {
            setIsLoading(false);
        }

    };

    useEffect(() => {
        getData();
    }, [count == 1]);

    // Totals for product-wise data
    const totals = useMemo(() => {
        return {
            totalProducts: productWiseData.length,
            totalBox: productWiseData.reduce((sum, product) => sum + product.totalBox, 0),
            totalGrossAmount: productWiseData.reduce((sum, product) => sum + product.totalGrossAmount, 0),
            totalGst: productWiseData.reduce((sum, product) => sum + product.totalGst, 0),
            totalAdvanceTax: productWiseData.reduce((sum, product) => sum + product.totalAdvanceTax, 0),
            totalDiscount: productWiseData.reduce((sum, product) => sum + product.totalDiscount, 0),
            totalNetAmount: productWiseData.reduce((sum, product) => sum + product.totalNetAmount, 0),
        };
    }, [productWiseData]);

    // Format Date
    const formatDate = (dateString) => {
        if (!dateString) return "-";
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
            title: "Product Wise Sale Summary",
            fileName: "Product_Wise_Sale_Summary",
            sheetName: "Product Wise Summary",
            rows: productWiseData.map(product => ({
                "Product Code": product.productCode,
                "Product Name": product.productName,
                "Client Name": product.Client,
                "Box": round2n(product.totalBox),
                "Gross Amount": round2n(product.totalGrossAmount),
                "Total Discount": round2n(product.totalDiscount),
                "GST": round2n(product.totalGst),
                "Advance Tax": round2n(product.totalAdvanceTax),
                "Net Amount": round2n(product.totalNetAmount)
            })),
            meta: [
                `Period: ${data.startDate || ""} to ${data.endDate || ""}`,
                `Department: ${department}`,
                "Report Type: Product Wise",
            ],
        });
    };

    // Export to Word
    const exportToWord = async () => {
        const headers = ["#", "Product Code", "Product Name", "Category", "Unit", "Box", "Gross Amount", "Total Discount", "GST", "Advance Tax", "Net Amount"];

        const tableRows = [
            new TableRow({
                children: headers.map(header =>
                    new TableCell({
                        children: [new Paragraph(header)],
                    })
                ),
            }),
            ...productWiseData.map((product) =>
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(String(product.id || ""))] }),
                        new TableCell({ children: [new Paragraph(product.productCode || "")] }),
                        new TableCell({ children: [new Paragraph(product.productName || "")] }),

                        new TableCell({ children: [new Paragraph(fmt2(product.totalBox) || "0")] }),
                        new TableCell({ children: [new Paragraph(fmt2(product.totalGrossAmount) || "0")] }),
                        new TableCell({ children: [new Paragraph(fmt2(product.totalDiscount) || "0")] }),
                        new TableCell({ children: [new Paragraph(fmt2(product.totalGst) || "0")] }),
                        new TableCell({ children: [new Paragraph(fmt2(product.totalAdvanceTax) || "0")] }),
                        new TableCell({ children: [new Paragraph(fmt2(product.totalNetAmount) || "0")] }),
                    ],
                })
            ),
        ];

        const doc = new Document({
            sections: [
                {
                    children: [
                        new Paragraph({ text: "Pearl Dynamics", heading: "Heading1" }),
                        new Paragraph({ text: "Product & Client Wise Sale Summary Report" }),
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
        saveAs(blob, "Product_Wise_Sale_Summary.docx");
    };

    // Export to PDF
    const exportToPDF = () => {
        const doc = new jsPDF("landscape");

        // Title and headers
        doc.setFontSize(16);
        doc.text("Product & Client Wise Sale Summary Report", 14, 15);
        doc.setFontSize(10);
        doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 22);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

        // Prepare table data
        const headers = [
            "#", "Product Code", "Product Name", "Category", "Unit", "Box",
            "Gross Amount", "Total Discount",
            "GST", "Advance Tax", "Net Amount"
        ];

        const tableData = productWiseData.map(product => [
            product.id,
            product.productCode || "",
            product.productName || "",

            product.totalBox?.toString() || "0",
            { content: fmt2(product.totalGrossAmount) || "0", styles: { halign: 'right' } },
            { content: fmt2(product.totalDiscount) || "0", styles: { halign: 'right' } },
            { content: fmt2(product.totalGst) || "0", styles: { halign: 'right' } },
            { content: fmt2(product.totalAdvanceTax) || "0", styles: { halign: 'right' } },
            { content: fmt2(product.totalNetAmount) || "0", styles: { halign: 'right' } }
        ]);

        // Add totals row
        tableData.push([
            { content: "TOTAL", colSpan: 6, styles: { fontStyle: 'bold', halign: 'center' } },
            { content: fmt2(totals.totalGrossAmount), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: fmt2(totals.totalDiscount), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: fmt2(totals.totalGst), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: fmt2(totals.totalAdvanceTax), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: fmt2(totals.totalNetAmount), styles: { fontStyle: 'bold', halign: 'right', fillColor: [22, 160, 133] } }
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
                0: { cellWidth: 'auto' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 'auto' },
                6: { halign: 'right' },
                7: { halign: 'right' },
                8: { halign: 'right' },
                9: { halign: 'right' },
                10: { halign: 'right' },
                11: { halign: 'right' },
                12: { halign: 'right' }
            },
            margin: { top: 35 }
        });

        // Add summary section at the bottom
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text("Summary:", 14, finalY);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Products: ${totals.totalProducts}`, 14, finalY + 6);
        doc.text(`Total Box: ${totals.totalBox}`, 14, finalY + 18);
        doc.text(`Grand Total Amount: ${fmt2(totals.totalNetAmount)}`, 80, finalY + 6);
        doc.text(`Total Gross Amount: ${fmt2(totals.totalGrossAmount)}`, 80, finalY + 12);
        doc.text(`Total Discount: ${fmt2(totals.totalDiscount)}`, 140, finalY + 6);
        doc.text(`Total GST: ${fmt2(totals.totalGst)}`, 140, finalY + 12);
        doc.text(`Total Advance Tax: ${fmt2(totals.totalAdvanceTax)}`, 140, finalY + 18);

        doc.save("Product_Wise_Sale_Summary.pdf");
    };

    // Print
    const handlePrint = () => {
        const content = reportRef.current.innerHTML;
        const win = window.open("", "_blank", "width=1400,height=800");
        win.document.write(`
      <html>
        <head>
          <title>Product & Client Wise Sale Summary Report</title>
          <style>
            body { font-family: Arial; padding:20px; }
            table { border-collapse: collapse; width:100%; font-size:10px; }
            th, td { border:1px solid #ccc; padding:4px; text-align:left; }
            th { background:#f4f4f4; font-weight:bold; }
            .numeric { text-align:right; }
            .summary-stats { margin:15px 0; font-weight:bold; }
            .product-table { min-width: 1200px; }
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
                    <p>Product & Client Wise Sale Summary Report</p>
                </div>
                <div className="report-info">
                    <p>Generated: {new Date().toLocaleString()}</p>
                    <p>
                        {productWiseData.length > 0
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
                    Report Type : ProductWiseSaleSummry
                </span>

            </div>

            <div className="table-container">
                {isLoading ? (
                    <div className="loader-wrapper">
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <table className="sales-data-table product-table" border={"All"}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Client</th>
                                <th>Client Code</th>
                                <th>Product Code</th>
                                <th>Sales Flow Ref</th>
                                <th>Product Name</th>
                                <th>Box</th>
                                <th>Carton</th>
                                <th>Gross Amount</th>
                                <th>Total Discount</th>
                                <th>GST</th>
                                <th>Advance Tax</th>
                                <th>Net Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productWiseData.length > 0 ? (
                                productWiseData.map((product) => (
                                    <tr key={product.id}>
                                        <td>{product.id}</td>
                                        <td>{product.Client}</td>
                                        <td>{product.ClientCode}</td>
                                        <td>{product.productCode}</td>
                                        <td>{product.SalesflowRef}</td>
                                        <td>{product.productName}</td>
                                        <td >{product.totalBox}</td>
                                        <td>{product.carton}</td>
                                        <td className="numeric">{fmt2(product.totalGrossAmount)}</td>
                                        <td className="numeric">{fmt2(product.totalDiscount)}</td>
                                        <td className="numeric">{fmt2(product.totalGst)}</td>
                                        <td className="numeric">{fmt2(product.totalAdvanceTax)}</td>
                                        <td className="numeric">{fmt2(product.totalNetAmount)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="15" className="no-data">No records found</td>
                                </tr>
                            )}
                        </tbody>
                        {productWiseData.length > 0 && (
                            <tfoot>
                                <tr className="footer-total">
                                    <td colSpan="6">Total</td>
                                    <td >{fmt2(totals.totalBox)}</td>
                                    <td className="numeric">{fmt2(totals.totalGrossAmount)}</td>
                                    <td className="numeric">{fmt2(totals.totalDiscount)}</td>
                                    <td className="numeric">{fmt2(totals.totalGst)}</td>
                                    <td className="numeric">{fmt2(totals.totalAdvanceTax)}</td>
                                    <td className="numeric">{fmt2(totals.totalNetAmount)}</td>
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
          font-size: 11px;
        }
        
        .product-table {
          min-width: 1300px;
        }
        
        .sales-data-table th {
          background: #f8f9fa;
          padding: 10px 6px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 2px solid #e0e0e0;
          white-space: nowrap;
        }
        
        .sales-data-table td {
          padding: 8px 6px;
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
            font-size: 9px;
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

export default ProductSaleWiseSummry;