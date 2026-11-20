import React, { useEffect, useState, useMemo, useRef } from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

import { Document, Packer, Paragraph, TextRun } from "docx";
import { GetDataFunctionInCloud, getDataFundtion } from '../../../../Api/CurdFunctions';

const DistributorSummaryReport = ({ filterData }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const reportRef = useRef(null);

    const d = new Date();
    const year1 = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const today = `${year1}-${month}-${day}`;

    // Get distributor IDs from filter
    const getDistributorIds = () => {
        if (!filterData?.Distrbutor || filterData.Distrbutor.length === 0) {
            console.warn("No distributors selected");
            return [];
        }

        if (Array.isArray(filterData.Distrbutor) && filterData.Distrbutor[0]?.value) {
            return filterData.Distrbutor.map(item => item.value);
        }

        return filterData.Distrbutor;
    };

    const getData = async () => {
        try {
            setLoading(true);
            const distributorIds = getDistributorIds();

            if (distributorIds.length === 0) {
                setRows([]);
                setLoading(false);
                return;
            }

            const distributorString = distributorIds.join(',');

            const data = await getDataFundtion(`/PurchaseOrder/getOrders?Distributor=${distributorString}`);
            
            const lager = await GetDataFunctionInCloud(`/GernalLager/DistributorLeger?Distributor=${distributorString}&startDate=${today}&endDate=${today}`);

            const allData = data.concat(lager);
            const processedData = processData(allData, distributorIds);
            setRows(processedData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const processData = (data, distributorIds) => {
        const distributorMap = {};

        // Initialize for each distributor
        distributorIds.forEach(id => {
            distributorMap[id] = {
                distributorId: id,
                distributorName: `Distributor ${id}`, // You should get actual names from API
                distributorCode: `CODE${id}`,
                creditLimit: 0, // You should get this from API
                receivedOrders: 0,
                processedOrders: 0,
                otherOrders: 0,
                voucherCount: 0,
                voucherAmount: 0,
                ledgerBalance: 0,
                // New fields for amounts
                totalReceivedAmount: 0,
                totalProcessedAmount: 0,
                totalOtherAmount: 0,
                totalAmount: 0,
                CrditAmount: 0
            };
        });

        // Process each item
        data.forEach(item => {
            const distributorId = item.Distrbutor || item.Distributor;
            if (!distributorId || !distributorMap[distributorId]) return;

            const amount = item.TotalAmount || 0;

            // Count orders by status and sum amounts
            if (item.PostStatus === "Received") {
                distributorMap[distributorId].receivedOrders++;
                distributorMap[distributorId].totalReceivedAmount += amount;
            } else if (item.PostStatus === "Process") {
                distributorMap[distributorId].processedOrders++;
                distributorMap[distributorId].totalProcessedAmount += amount;
            } else if (item.PostStatus === "Accept") {
                distributorMap[distributorId].otherOrders++;
                distributorMap[distributorId].totalOtherAmount += amount;
            }

            // Process vouchers
            if (item.Type === "VoucherBefore" || item.Type === "Voucher") {
                distributorMap[distributorId].voucherCount++;
                distributorMap[distributorId].voucherAmount += item.Debit || 0;
                distributorMap[distributorId].ledgerBalance += item.Debit -= item.Credit  || 0;
                distributorMap[distributorId].CreditAmount -= item.Credit  ||  0;

            }

            // Add to total amount
            distributorMap[distributorId].totalAmount += amount;
        });

        // Convert map to array
        return Object.values(distributorMap);
    };

    useEffect(() => {
        getData();
    }, [filterData]);

    // Filter rows based on search
    const filteredRows = useMemo(() => {
        if (!filter) return rows;

        return rows.filter(row =>
            Object.values(row).some(value =>
                value && value.toString().toLowerCase().includes(filter.toLowerCase())
            )
        );
    }, [rows, filter]);

    // Calculate totals
    const totals = useMemo(() => {
        return {
            totalReceived: filteredRows.reduce((sum, row) => sum + row.receivedOrders, 0),
            totalProcessed: filteredRows.reduce((sum, row) => sum + row.processedOrders, 0),
            totalOther: filteredRows.reduce((sum, row) => sum + row.otherOrders, 0),
            totalVouchers: filteredRows.reduce((sum, row) => sum + row.voucherCount, 0),
            totalLedger: filteredRows.reduce((sum, row) => sum + row.ledgerBalance, 0)
        };
    }, [filteredRows]);

    // Export Functions
    const exportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Distributor Summary");

        sheet.addRow([
            "Distributor ID",
            "Distributor Name",
            "Code",
            "Credit Limit",
            "Received Orders",
            "Processed Orders",
            "Other Orders",
            "Voucher Count",
            "Voucher Amount",
            "Ledger Balance"
        ]);

        filteredRows.forEach(row =>
            sheet.addRow([
                row.distributorId,
                row.distributorName,
                row.distributorCode,
                row.creditLimit,
                row.receivedOrders,
                row.processedOrders,
                row.otherOrders,
                row.voucherCount,
                row.voucherAmount,
                row.ledgerBalance
            ])
        );

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `DistributorSummary_${today}.xlsx`;
        link.click();
    };

    const exportPDF = () => {
        const pdf = new jsPDF();

        // Header
        pdf.addImage(
            "https://res.cloudinary.com/dmi26itgk/image/upload/v1755944631/Screenshot_2025-08-23_152337_ajpexh.png",
            "PNG",
            250,
            8,
            50,
            20
        );
        pdf.setFontSize(20);
        pdf.text("Distributor Summary Report", 14, 15);
        pdf.setFontSize(12);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
        pdf.text(`Date: ${today}`, 14, 29);

        autoTable(pdf, {
            startY: 40,
            head: [
                ["Distributor Name", "Code", "Received", "Processed", "Other", "Vouchers", "Ledger Balance"]
            ],
            body: filteredRows.map(row => [
                row.distributorName,
                row.distributorCode,
                row.receivedOrders,
                row.processedOrders,
                row.otherOrders,
                row.voucherCount,
                row.ledgerBalance
            ]),
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255 }
        });

        // Footer
        const pageHeight = pdf.internal.pageSize.height;
        pdf.setFontSize(10);
        pdf.text(
            "Developed by JS International | / | ",
            pdf.internal.pageSize.width / 2,
            pageHeight - 10,
            { align: "center" }
        );

        pdf.save(`DistributorSummary_${today}.pdf`);
    };

    const exportWord = async () => {
        const doc = new Document({
            sections: [
                {
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Distributor Summary Report - ${today}`,
                                    bold: true,
                                    size: 28
                                })
                            ]
                        }),
                        ...filteredRows.map(row =>
                            new Paragraph(
                                `${row.distributorName} (${row.distributorCode}) | Received: ${row.receivedOrders} | Processed: ${row.processedOrders} | Other: ${row.otherOrders} | Vouchers: ${row.voucherCount} | Ledger: ${row.ledgerBalance}`
                            )
                        )
                    ]
                }
            ]
        });

        const blob = await Packer.toBlob(doc);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `DistributorSummary_${today}.docx`;
        link.click();
    };

    const handlePrint = () => {
        const printContent = reportRef.current.innerHTML;
        const printWindow = window.open("", "_blank", "width=1200,height=800");

        printWindow.document.write(`
            <html>
                <head>
                    <title>Distributor Summary Report</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
                            background: #fff;
                            color: #333;
                            padding: 20px;
                        }
                        .distributor-report-header {
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
                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent}
                    <div class="print-footer">
                        | Website: <a href="https://jaffersons.com/" target="_blank">https://jaffersons.com/</a> | 
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

    return (
        <div className="distributor-report-container" ref={reportRef}>
            <div className="watermark">
                <div className="watermark-content">
                    <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png" alt="" />
                </div>
            </div>

            <div className="distributor-report-header">
                <div className="company-info">
                    <h2 className="company-name"></h2>
                    <p className="company-address">123 Business Avenue, Suite 456</p>
                    <p className="company-contact">Phone: (555) 123-4567 | Email: info@company.com</p>
                </div>
                <div className="report-info">
                    <h1 className="report-title">Distributor Summary Report</h1>
                    <p className="report-date">Generated: {new Date().toLocaleString()}</p>
                    <p className="report-range">Date: {today}</p>
                </div>
            </div>

            <div className="report-controls">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search distributors..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="summary-stats">
                    <span className="stat-item">
                        Total Distributors: <strong>{filteredRows.length}</strong>
                    </span>
                    <span className="stat-item">
                        Total Ledger Balance: <strong>{totals.totalLedger.toLocaleString()}</strong>
                    </span>
                </div>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loader-wrapper">
                        <div className="spinner"></div>
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="no-data-message">
                        No data available. Please select distributors.
                    </div>
                ) : (
                    // Table को अपडेट करें
                    <table className="distributor-data-table">
                        <thead>
                            <tr>
                                <th>Distributor Name</th>
                                <th>Code</th>
                                <th>Credit Limit</th>
                                <th>Received Amount</th>
                                <th>Processed Orders</th>
                                <th>Processed Amount</th>
                                <th>Other Orders</th>
                                <th>Other Amount</th>
                                <th>Voucher Count</th>
                                <th>Ledger Balance</th>
                                <th>Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((row, index) => (
                                <tr key={index}>
                                    <td>{filterData.DistrbutorDrp.find((item)=> item.value == row.distributorId).label }</td>
                                    <td className="distributor-code">{filterData.DistrbutorDrp.find((item)=> item.value == row.distributorId).label}</td>
                                    <td className="numeric">{row.creditLimit?.toLocaleString() || 0}</td>
                                    <td className="numeric">{row.receivedOrders}</td>
                                    <td className="numeric">{row.totalReceivedAmount?.toLocaleString()|| 0}</td>
                                    <td className="numeric">{row.processedOrders}</td>
                                    <td className="numeric">{row.totalProcessedAmount?.toLocaleString() || 0}</td>
                                    <td className="numeric">{row.otherOrders}</td>
                                    <td className="numeric">{row.totalOtherAmount?.toLocaleString() || 0}</td>
                                    <td className="numeric">{row.voucherCount}</td>
                                    <td className="numeric">{row.ledgerBalance?.toLocaleString() || 0}</td>
                                    <td className="numeric total-amount">{row.totalAmount?.toLocaleString() || 0}</td>
                                </tr>
                            ))}
                            <tr className="footer-total">
                                <td colSpan="3">Totals</td>
                                <td className="numeric">{totals.totalReceived}</td>
                                <td className="numeric">{totals.totalReceivedAmount?.toLocaleString() || 0}</td>
                                <td className="numeric">{totals.totalProcessed}</td>
                                <td className="numeric">{totals.totalProcessedAmount?.toLocaleString() || 0}</td>
                                <td className="numeric">{totals.totalOther}</td>
                                <td className="numeric">{totals.totalOtherAmount?.toLocaleString() || 0}</td>
                                <td className="numeric">{totals.totalVouchers}</td>
                                <td className="numeric">{totals.totalLedger?.toLocaleString() || 0}</td>
                                <td className="numeric total-amount">{totals?.totalAmount?.toLocaleString() || 0}</td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>

            <div className="report-actions">
                <button className="btn btn-excel" onClick={exportExcel}>
                    Export to Excel
                </button>
                <button className="btn btn-pdf" onClick={exportPDF}>
                    Export to PDF
                </button>
                <button className="btn btn-word" onClick={exportWord}>
                    Export to Word
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
                
                .distributor-report-container {
                    font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                    padding: 24px;
                    margin: 20px auto;
                    max-width: 1400px;
                    color: #333;
                    position: relative;
                    overflow-x: auto;
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
                
                .watermark-content img {
                    width: 300px;
                    opacity: 0.3;
                }
                
                .distributor-report-header {
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
                
                .company-address, .company-contact {
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
                    transition: border 0.3s;
                }
                
                .search-input:focus {
                    outline: none;
                    border-color: #3498db;
                    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
                }
                
                .summary-stats {
                    display: flex;
                    gap: 24px;
                }
                
                .stat-item {
                    font-size: 14px;
                    color: #555;
                    background: #f8f9fa;
                    padding: 6px 12px;
                    border-radius: 4px;
                    border-left: 4px solid #3498db;
                }
                
                .stat-item strong {
                    color: #2c3e50;
                    font-weight: 600;
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
                
                .distributor-data-table {
                    min-width: 1000px;
                    border-collapse: collapse;
                    font-size: 14px;
                    width: 100%;
                }
                
                .distributor-data-table th {
                    background: #f8f9fa;
                    padding: 12px 10px;
                    text-align: left;
                    font-weight: 600;
                    color: #2c3e50;
                    border-bottom: 2px solid #e0e0e0;
                    white-space: nowrap;
                }
                
                .distributor-data-table td {
                    padding: 10px;
                    border-bottom: 1px solid #eaeaea;
                }
                
                .distributor-data-table tbody tr:hover {
                    background-color: #f8f9fa;
                }
                
                .distributor-code {
                    font-family: 'Courier New', monospace;
                    font-weight: 600;
                    color: #2c3e50;
                }
                
                .numeric {
                    text-align: right;
                    font-family: 'Courier New', monospace;
                }
                
                .no-data-message {
                    text-align: center;
                    padding: 40px;
                    color: #95a5a6;
                    font-style: italic;
                    background: #f8f9fa;
                    border-radius: 6px;
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
                    min-width: 140px;
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
                    .distributor-report-header {
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
                    .distributor-report-container {
                        box-shadow: none;
                        padding: 0;
                    }
                    
                    .report-controls, .report-actions {
                        display: none;
                    }
                    
                    .table-container {
                        overflow: visible !important;
                        border: none;
                    }
                    
                    .watermark {
                        opacity: 0.03;
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

export default DistributorSummaryReport;