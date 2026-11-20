import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDataFundtion } from '../../Api/CRUDFunctions';
import { formatDate } from '../../Components/Global/getDate';
import ReportPopupHeader from '../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../utils/exportProfessionalExcel';

const pack = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

const formatQty = (value) => {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const qtyOf = (item, fieldBox, fieldCarton, fieldUnit, qtyType) => {
  if (qtyType === "Carton") {
    if (item[fieldCarton] != null) return Number(item[fieldCarton]) || 0;
    return (Number(item[fieldBox]) || 0) / pack(item.boxInCarton);
  }
  if (qtyType === "Unit") {
    if (item[fieldUnit] != null) return Number(item[fieldUnit]) || 0;
    return (Number(item[fieldBox]) || 0) * (item.PcsinBox || 1);
  }
  return Number(item[fieldBox]) || 0;
};

const DistributorStockFlowReportPopup = ({ data }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const qtyType = data.qtyType || "Box";
  const unitLabel = qtyType === "Three" ? "Box" : qtyType;

  const mappedRows = useMemo(() => {
    return rows.map((item) => {
      const closing = qtyOf(item, "closingBalance", "closingCarton", "closingUnit", qtyType === "Three" ? "Box" : qtyType);
      const remaining = qtyOf(item, "remainingBoxes", "remainingCartons", "remainingUnits", qtyType === "Three" ? "Box" : qtyType);
      return {
        ...item,
        opening: qtyOf(item, "openingBalance", "TotalopenigCarton", "TotalopenigUnit", qtyType === "Three" ? "Box" : qtyType),
        rc: qtyOf(item, "totalRCBox", "totalRCCarton", "totalRCUnit", qtyType === "Three" ? "Box" : qtyType),
        saleReturn: qtyOf(item, "totalReturnBox", "totalReturnCarton", "totalReturnUnit", qtyType === "Three" ? "Box" : qtyType),
        dc: qtyOf(item, "totalDCBox", "totalDCCarton", "totalDCUnits", qtyType === "Three" ? "Box" : qtyType),
        purchaseReturn: qtyOf(item, "totalPurchaseReturnBox", "totalPurchaseReturnCarton", "totalPurchaseReturnUnit", qtyType === "Three" ? "Box" : qtyType),
        adjustIn: qtyOf(item, "totalAdjustmentAddBox", "adjustInCarton", "adjustInUnit", qtyType === "Three" ? "Box" : qtyType),
        adjustOut: qtyOf(item, "totalAdjustmentLessBox", "adjustOutCarton", "adjustOutUnit", qtyType === "Three" ? "Box" : qtyType),
        closing,
        // remainingBoxes from API; fall back to closing if missing
        remaining: remaining || closing,
      };
    });
  }, [rows, qtyType]);

  const totals = useMemo(() => {
    return mappedRows.reduce(
      (acc, row) => {
        acc.opening += row.opening || 0;
        acc.rc += row.rc || 0;
        acc.saleReturn += row.saleReturn || 0;
        acc.dc += row.dc || 0;
        acc.purchaseReturn += row.purchaseReturn || 0;
        acc.adjustIn += row.adjustIn || 0;
        acc.adjustOut += row.adjustOut || 0;
        acc.closing += row.closing || 0;
        acc.remaining += row.remaining || 0;
        return acc;
      },
      { opening: 0, rc: 0, saleReturn: 0, dc: 0, purchaseReturn: 0, adjustIn: 0, adjustOut: 0, closing: 0, remaining: 0 }
    );
  }, [mappedRows]);

  const buildExportRows = () =>
    mappedRows.map((item, index) => ({
      "#": index + 1,
      "Department": item.storeName || item.Department || "",
      "Sku Name": item.productName,
      "SKU Code": item.SkuCode,
      [`Opening Balance (${unitLabel})`]: item.opening,
      [`RC (${unitLabel})`]: item.rc,
      [`Sale Return (${unitLabel})`]: item.saleReturn,
      [`DC (${unitLabel})`]: item.dc,
      [`Purchase Return (${unitLabel})`]: item.purchaseReturn,
      [`Adjust In (${unitLabel})`]: item.adjustIn,
      [`Adjust Out (${unitLabel})`]: item.adjustOut,
      [`Closing Balance (${unitLabel})`]: item.closing,
      [`Remaining Boxes (${unitLabel})`]: item.remaining,
    }));

  const downloadPDF = () => {
    const exportData = buildExportRows();
    const headers = exportData.length > 0 ? Object.keys(exportData[0]) : [];
    const bodyRows = exportData.map((obj) => headers.map((h) => (obj[h] !== undefined ? obj[h] : "")));

    if (exportData.length > 0) {
      const totalRow = headers.map((h) => {
        if (h === "Sku Name") return "TOTAL";
        if (h === "#" || h === "SKU Code" || h === "Department") return "";
        return exportData.reduce((sum, row) => sum + (parseFloat(row[h]) || 0), 0);
      });
      bodyRows.push(totalRow);
    }

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("DISTRIBUTOR STOCK FLOW REPORT", 14, 15);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 14, 23);
    doc.text(`Period: ${data.startDate} → ${data.endDate}`, 14, 29);
    doc.text(`Qty Type: ${qtyType}`, 14, 35);
    doc.text("Formula: Opening + RC + SaleReturn - DC - PurchaseReturn + AdjustIn - AdjustOut = Closing", 14, 41);

    autoTable(doc, {
      head: [headers],
      body: bodyRows,
      startY: 48,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        fontSize: 10,
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      bodyStyles: { fontSize: 9 },
      styles: { cellPadding: 3, overflow: "linebreak" },
    });

    doc.save("Distributor_Stock_Flow_Report.pdf");
  };

  const downloadExcel = async () => {
    const exportData = buildExportRows();
    await exportProfessionalExcel({
      title: "Distributor Stock Flow Report",
      fileName: "Distributor_Stock_Flow_Report",
      sheetName: "DistributorStockFlow",
      rows: exportData,
      meta: [
        data.startDate && data.endDate ? `Period: ${data.startDate} to ${data.endDate}` : "",
        `Qty Type: ${qtyType}`,
        "Opening + RC + SaleReturn - DC - PurchaseReturn + AdjustIn - AdjustOut = Closing",
        "Prev month Closing = Current month Opening (when dates continue)",
      ].filter(Boolean),
    });
  };

  const handlePrint = () => {
    const printContent = document.getElementById("distributor-stock-flow-report").innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Distributor Stock Flow Report</title>
          <style>
            body { font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; padding: 20px; }
            .sales-report-container { background: #fff; border-radius: 8px; padding: 24px; }
            .watermark { display: none; }
            .report-controls, .report-actions { display: none; }
            .table-container { overflow-x: visible; border: none; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 10px; border: 1px solid #ddd; }
            th { background: #f8f9fa; font-weight: 600; }
            .numeric { text-align: right; }
            .company-name { font-size: 20px; font-weight: bold; }
            .report-title { font-size: 18px; color: #3498db; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const getData = async () => {
    try {
      setIsLoading(true);
      const store = Array.isArray(data.store) ? data.store.join(",") : (data.store || "");
      const status = data.status || "Post";
      const damage = data.damage || "Fresh";
      const result = await getDataFundtion(
        `/InventoryReport/DistributorStockFlowReport?startDate=${data.startDate}&endDate=${data.endDate}&status=${status}&Store=${store}&damage=${damage}`
      );
      setRows(Array.isArray(result?.rows) ? result.rows : []);
    } catch (error) {
      console.error("Error fetching distributor stock flow report:", error);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [data]);

  return (
    <div className="sales-report-container" id="distributor-stock-flow-report">
      <ReportPopupHeader title="Distributor Stock Flow Report" />

      <div className="watermark">
        <div className="watermark-content">
          <div className="watermark-logo">STOCK FLOW</div>
          <div className="watermark-text">Distributor Report</div>
          <div className="watermark-subtext">Confidential</div>
        </div>
      </div>

      <div className="sales-report-header">
        <div className="company-info">
          <div className="company-name">Pearl Dynamic</div>
          <div className="company-address">123 Business Avenue, City, Country</div>
          <div className="company-contact">contact@faedibles.com | +1 (234) 567-8901</div>
        </div>

        <div className="report-info">
          <div className="report-title">Distributor Stock Flow Report</div>
          <div className="report-date">Generated: {new Date().toLocaleDateString()}</div>
          <div className="report-range">Period: {data.startDate} to {data.endDate}</div>
        </div>
      </div>

      <div className="report-controls">
        <div className="summary-stats">
          <div className="stat-item">Date From: {formatDate(data.startDate)}</div>
          <div className="stat-item">Date To: {formatDate(data.endDate)}</div>
          <div className="stat-item">Qty In: {qtyType}</div>
          <div className="stat-item">Status: {data.status || "Post"}</div>
          <div className="stat-item">
            Store: {
              Array.isArray(data.store) && data.store.length > 0
                ? (data.allStore || [])
                  .filter((item) => data.store.includes(item._id))
                  .map((s) => s.StoreName)
                  .join(", ")
                : "All"
            }
          </div>
        </div>
      </div>

      <div className="formula-note">
        Store / Department wise &nbsp;|&nbsp;
        Opening + RC + Sale Return − DC − Purchase Return + Adjust In − Adjust Out = Closing &nbsp;|&nbsp;
        Previous month Closing = Current month Opening
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper"><div className="spinner"></div></div>
        ) : (
          <table className="sales-data-table">
            <thead>
              <tr>
                <th style={{ width: "50px", textAlign: "center" }}>#</th>
                <th>Department</th>
                <th style={{ minWidth: "200px" }}>Sku Name</th>
                <th>SKU Code</th>
                <th>Opening Balance</th>
                <th>RC</th>
                <th>Sale Return</th>
                <th>DC</th>
                <th>Purchase Return</th>
                <th>Adjust In</th>
                <th>Adjust Out</th>
                <th>Closing Balance</th>
                <th>Remaining Boxes</th>
              </tr>
            </thead>
            <tbody>
              {mappedRows.length > 0 ? (
                mappedRows.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td>{item.storeName || item.Department || ""}</td>
                    <td>{item.productName}</td>
                    <td>{item.SkuCode}</td>
                    <td className="numeric">{formatQty(item.opening)}</td>
                    <td className="numeric">{formatQty(item.rc)}</td>
                    <td className="numeric">{formatQty(item.saleReturn)}</td>
                    <td className="numeric">{formatQty(item.dc)}</td>
                    <td className="numeric">{formatQty(item.purchaseReturn)}</td>
                    <td className="numeric">{formatQty(item.adjustIn)}</td>
                    <td className="numeric">{formatQty(item.adjustOut)}</td>
                    <td className="numeric">{formatQty(item.closing)}</td>
                    <td className="numeric">{formatQty(item.remaining)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="no-data">
                    No stock flow data available for the selected period
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>Total</td>
                <td className="numeric">{formatQty(totals.opening)}</td>
                <td className="numeric">{formatQty(totals.rc)}</td>
                <td className="numeric">{formatQty(totals.saleReturn)}</td>
                <td className="numeric">{formatQty(totals.dc)}</td>
                <td className="numeric">{formatQty(totals.purchaseReturn)}</td>
                <td className="numeric">{formatQty(totals.adjustIn)}</td>
                <td className="numeric">{formatQty(totals.adjustOut)}</td>
                <td className="numeric">{formatQty(totals.closing)}</td>
                <td className="numeric">{formatQty(totals.remaining)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <div className="report-actions">
        <button className="btn btn-excel" onClick={downloadExcel}>Export to Excel</button>
        <button className="btn btn-pdf" onClick={downloadPDF}>Export to PDF</button>
        <button className="btn btn-print" onClick={handlePrint}>Print Report</button>
      </div>

      <style jsx>{`
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
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none; z-index: 1; opacity: 0.05;
        }
        .watermark-content { text-align: center; transform: rotate(-45deg); }
        .watermark-logo { font-size: 120px; font-weight: bold; color: #2c3e50; line-height: 1; }
        .watermark-text { font-size: 40px; font-weight: bold; color: #2c3e50; margin-top: 10px; }
        .watermark-subtext { font-size: 30px; color: #2c3e50; margin-top: 5px; }
        .sales-report-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #eaeaea;
          position: relative; z-index: 2;
        }
        .company-name { font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0 0 8px 0; }
        .company-address, .company-contact { font-size: 12px; color: #7f8c8d; margin: 4px 0; }
        .report-info { text-align: right; }
        .report-title { font-size: 20px; font-weight: 600; color: #3498db; margin: 0 0 8px 0; }
        .report-date, .report-range { font-size: 12px; color: #7f8c8d; margin: 4px 0; }
        .report-controls {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px; flex-wrap: wrap; gap: 16px; position: relative; z-index: 2;
        }
        .summary-stats { display: flex; gap: 12px; flex-wrap: wrap; }
        .stat-item {
          font-size: 14px; color: #555; padding: 8px 16px;
          background: #f8f9fa; border-radius: 4px; font-weight: 600;
        }
        .formula-note {
          position: relative; z-index: 2;
          margin-bottom: 12px; padding: 8px 12px;
          background: #eef6ff; border-left: 4px solid #3498db;
          font-size: 13px; color: #2c3e50; font-weight: 600;
        }
        .table-container {
          overflow-x: auto; border: 1px solid #e0e0e0; border-radius: 6px;
          margin-bottom: 20px; position: relative; z-index: 2; min-height: 300px;
        }
        .sales-data-table { min-width: 900px; border-collapse: collapse; font-size: 12px; width: 100%; }
        .sales-data-table th {
          background: #f8f9fa; padding: 10px 8px; text-align: left; font-weight: 600;
          color: #2c3e50; border-bottom: 2px solid #e0e0e0; white-space: nowrap;
        }
        .sales-data-table td {
          padding: 8px; border-bottom: 1px solid #eaeaea; border-right: 1px solid #f0f0f0; white-space: nowrap;
        }
        .sales-data-table tbody tr:hover { background-color: #f8f9fa; }
        .sales-data-table tfoot td { font-weight: 700; background: #f8f9fa; }
        .numeric { text-align: right; font-family: 'Courier New', monospace; }
        .no-data { text-align: center; padding: 30px; color: #95a5a6; font-style: italic; }
        .report-actions { display: flex; justify-content: flex-end; gap: 12px; position: relative; z-index: 2; }
        .btn {
          padding: 10px 20px; border: none; border-radius: 4px; font-size: 14px;
          font-weight: 600; cursor: pointer; color: white;
        }
        .btn-excel { background: #217346; }
        .btn-pdf { background: #f40f02; }
        .btn-print { background: #555; }
        .loader-wrapper { display: flex; justify-content: center; align-items: center; height: 200px; }
        .spinner {
          width: 48px; height: 48px; border: 6px solid #ccc; border-top: 6px solid #3b82f6;
          border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DistributorStockFlowReportPopup;