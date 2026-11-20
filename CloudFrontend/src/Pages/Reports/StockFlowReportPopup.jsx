import React, { useEffect, useState } from 'react';
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


const StockFlowReportPopup = ({ data }) => {
  
  
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const qtyType = data.qtyType;

  const downloadPDF = () => {
    // First, create the same transformed data as Excel
    const exportData = rows.map((item) => {
      const row = {
        "SKU Name": item.productName,
        "SKU Code": item.SkuCode,
      };

      if (qtyType === "Three" || qtyType === "Box") {
        row["Opening (Box)"] = item.TotalopenigQty ?? "";
        row["Purchased (Box)"] = item.purchasedBoxes ?? "";
        row["Sales (Box)"] = item.soldBoxes ?? "";
        row["Out (Box)"] = item.totalOutBoxes ?? "";
        row["In (Box)"] = item.totalInBoxes ?? "";
        row["Replacement From (Box)"] = item.totalBoxesReplacementFrom ?? "";
        row["Return (Box)"] = item.totalReturnBox ?? "";
        row["Purchase Return (Box)"] = item.totalPurchaseReturnBox ?? "";
        row["Total Purchase (Box)"] = (item.totalRCBox ?? 0) + (item.purchasedBoxes ?? 0);
        row["Remaining (Box)"] = item.remainingBoxes ?? "";
      }

      if (qtyType === "Three" || qtyType === "Carton") {
        row["Opening (Carton)"] = item.TotalopenigCarton ?? "";
        row["Purchased (Carton)"] = item.purchasedCarton ?? "";
        row["Sales (Carton)"] = item.soldCarton ?? "";
        row["Out (Carton)"] = item.totalOutCarton ?? "";
        row["In (Carton)"] = item.totalInCarton ?? "";
        row["Replacement From (Carton)"] = item.totalCartonReplacementFrom ?? "";
        row["Return (Carton)"] = item.totalReturnCarton ?? "";
        row["Purchase Return (Carton)"] = item.totalPurchaseReturnCarton ?? "";
        row["Total Purchase (Carton)"] = (item.totalRCCarton ?? 0) + (item.purchasedCarton ?? 0);
        row["Remaining (Carton)"] = item.remainingCartons ?? "";
      }

      if (qtyType === "Three" || qtyType === "Unit") {
        row["Opening (Unit)"] = item.TotalopenigUnit ?? "";
        row["Purchased (Unit)"] = item.purchasedUnits ?? "";
        row["Sales (Unit)"] = item.soldUnits ?? "";
        row["Out (Unit)"] = item.totalOutUnit ?? "";
        row["In (Unit)"] = item.totalInUnit ?? "";
        row["Replacement From (Unit)"] = item.totalUnitReplacementFrom ?? "";
        row["Return (Unit)"] = item.totalReturnUnit ?? "";
        row["Purchase Return (Unit)"] = item.totalPurchaseReturnUnit ?? "";
        row["Total Purchase (Unit)"] = (item.totalRCUnit ?? 0) + (item.purchasedUnits ?? 0);
        row["Remaining (Unit)"] = item.remainingUnits ?? "";
      }

      return row;
    });

    // Calculate totals (same as Excel)
    const totalRow = {};
    if (exportData.length > 0) {
      Object.keys(exportData[0]).forEach((key) => {
        if (key === "SKU Name" || key === "SKU Code") {
          totalRow[key] = "TOTAL";
        } else {
          totalRow[key] = exportData.reduce((sum, row) => {
            const val = parseFloat(row[key] || 0);
            return !isNaN(val) ? sum + val : sum;
          }, 0);
        }
      });
    }

    const doc = new jsPDF({ orientation: "landscape" });

    // -------------------- HEADER --------------------
    doc.setFontSize(18);
    doc.text("STOCK FLOW REPORT", 14, 15);

    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 14, 23);
    doc.text(`Period: ${data.startDate} → ${data.endDate}`, 14, 29);

    // -------------------- FILTERS --------------------
    const storeNames =
      data.store.length > 0
        ? data.allStore
          .filter((s) => data.store.includes(s._id))
          .map((s) => s.StoreName)
          .join(", ")
        : "All";

    doc.text(`Store: ${storeNames}`, 14, 37);
    doc.text(`Status: ${data.status || "All"}`, 14, 43);
    doc.text(`Damage: ${data.damage || "No"}`, 14, 49);
    doc.text(`Quantity Type: ${qtyType}`, 14, 55);

    // -------------------- TABLE DATA --------------------
    // Convert exportData to array format for autoTable
    const headers = exportData.length > 0 ? Object.keys(exportData[0]) : [];
    const bodyRows = exportData.map((obj) =>
      headers.map((h) => (obj[h] !== undefined ? obj[h] : ""))
    );

    // Add total row to the table
    if (Object.keys(totalRow).length > 0) {
      bodyRows.push(headers.map((h) => totalRow[h] || ""));
    }

    autoTable(doc, {
      head: [headers],
      body: bodyRows,
      startY: 63,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        fontSize: 10,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 9 },
      styles: {
        cellPadding: 3,
        overflow: 'linebreak'
      },
      // Style the total row
      didDrawCell: (data) => {
        if (data.row.index === bodyRows.length - 1 && bodyRows.length > 0) {

        }
      },
      willDrawCell: (data) => {
        if (data.row.index === bodyRows.length - 1 && bodyRows.length > 0) {
          doc.setFillColor(255, 255, 200); // Light yellow background for total row
          return {
            fillColor: [255, 255, 200]
          };
        }
      }
    });

    doc.save("Stock_Flow_Report.pdf");
  };


  const downloadExcel = async () => {
    // Build export exactly matching the table columns and values shown in the popup view
    const exportData = rows.map((item, index) => {
      const row = {
        "#": index + 1,
        "Sku Name": item.productName,
        "SKU Code": item.SkuCode,
      };

      // Opening
      if (qtyType === "Three" || qtyType === "Box") {
        row["Opening Boxes"] = item.TotalopenigQty ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Opening Carton"] = item.TotalopenigCarton ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Opening Unit"] = item.TotalopenigUnit ?? 0;
      }

      // Purchased
      if (qtyType === "Three" || qtyType === "Box") {
        row["Purchased Boxes"] = item.purchasedBoxes ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Purchased Carton"] = item.purchasedCarton ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Purchased Unit"] = item.purchasedUnits ?? 0;
      }

      // RC
      if (qtyType === "Three" || qtyType === "Box") {
        row["RC Boxes"] = item.totalRCBox ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["RC Carton"] = item.totalRCCarton ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["RC Unit"] = item.totalRCUnit ?? 0;
      }

      // Total Purchase (RC + Purchase)
      if (qtyType === "Three" || qtyType === "Box") {
        row["Total Purchase (Box)"] = (item.totalRCBox ?? 0) + (item.purchasedBoxes ?? 0);
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Total Purchase (Carton)"] = (item.totalRCCarton ?? 0) + (item.purchasedCarton ?? 0);
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Total Purchase (Unit)"] = (item.totalRCUnit ?? 0) + (item.purchasedUnits ?? 0);
      }

      // Transfer In (early columns after RC, matching thead order)
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Transfer In Carton"] = item.totalInCarton ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Transfer In Unit"] = item.totalInUnit ?? 0;
      }

      // Sale
      if (qtyType === "Three" || qtyType === "Box") {
        row["Sale Boxes"] = item.soldBoxes ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Sale Carton"] = item.soldCarton ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Sale Unit"] = item.soldUnits ?? 0;
      }

      // DC
      if (qtyType === "Three" || qtyType === "Box") {
        row["DC Boxes"] = item.totalDCBox ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["DC Carton"] = item.totalDCCarton ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["DC Unit"] = item.totalDCUnits ?? 0;
      }

      // Replacement (early, after DC - Carton/Unit only)
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Replacement Carton"] = item.totalCartonReplacementFrom ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Replacement Unit"] = item.totalUnitReplacementFrom ?? 0;
      }

      // Transfer Out
      if (qtyType === "Three" || qtyType === "Box") {
        row["Transfer Out Boxes"] = item.totalOutBoxes ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Transfer Out Carton"] = item.totalOutCarton ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Transfer Out Unit"] = item.totalOutUnit ?? 0;
      }

      // Transfer in (second set, after Transfer Out)
      if (qtyType === "Three" || qtyType === "Box") {
        row["Transfer in Boxes"] = item.totalInBoxes ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Transfer in Carton"] = item.totalInCarton ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Transfer in Unit"] = item.totalInUnit ?? 0;
      }

      // Stock Replacement
      if (qtyType === "Three" || qtyType === "Box") {
        row["Stock Replacement Boxes"] = item.totalBoxesReplacementFrom ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Stock Replacement Carton"] = item.totalCartonReplacementFrom ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Stock Replacement Unit"] = item.totalUnitReplacementFrom ?? 0;
      }

      // Sales Return
      if (qtyType === "Three" || qtyType === "Box") {
        row["Sales Return Boxes"] = item.totalReturnBox ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Sales Return Carton"] = item.totalReturnCarton ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Sales Return Unit"] = item.totalReturnUnit ?? 0;
      }

      // Purchase Return
      if (qtyType === "Three" || qtyType === "Box") {
        row["Purchase Return Boxes"] = item.totalPurchaseReturnBox ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Purchase Return Carton"] = item.totalPurchaseReturnCarton ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Purchase Return Unit"] = item.totalPurchaseReturnUnit ?? 0;
      }

      // Stock Adjustment Less Box
      if (qtyType === "Three" || qtyType === "Box") {
        row["Adj. Less Box"] = item.totalAdjustmentLessBox ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Adj. Less Carton"] = (item.totalAdjustmentLessBox ?? 0) / pack(item.boxInCarton);
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Adj. Less Unit"] = (item.totalAdjustmentLessBox ?? 0) * (item.PcsinBox || 1);
      }

      // Stock Adjustment Add Box
      if (qtyType === "Three" || qtyType === "Box") {
        row["Adj. Add Box"] = item.totalAdjustmentAddBox ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Adj. Add Carton"] = (item.totalAdjustmentAddBox ?? 0) / pack(item.boxInCarton);
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Adj. Add Unit"] = (item.totalAdjustmentAddBox ?? 0) * (item.PcsinBox || 1);
      }

      // Remaining
      if (qtyType === "Three" || qtyType === "Box") {
        row["Remaining Boxes"] = item.remainingBoxes ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Carton") {
        row["Remaining Carton"] = item.remainingCartons ?? 0;
      }
      if (qtyType === "Three" || qtyType === "Unit") {
        row["Remaining Unit"] = item.remainingUnits ?? 0;
      }

      // Values (always at end, matching table)
      row["Remaining Value"] = item.remainingBoxesValue ?? 0;
      row["Remaining Value With Gst"] = item.remainingBoxesValueWithGst ?? 0;

      return row;
    });

    // -------------------- TOTAL ROW (matching tfoot) --------------------
    const totalRow = { "#": "", "Sku Name": "TOTAL", "SKU Code": "" };

    if (exportData.length > 0) {
      Object.keys(exportData[0]).forEach((key) => {
        if (key === "#" || key === "Sku Name" || key === "SKU Code") {
          // already set
        } else {
          totalRow[key] = exportData.reduce((sum, r) => {
            const val = parseFloat(r[key] || 0);
            return !isNaN(val) ? sum + val : sum;
          }, 0);
        }
      });
    }

    const finalExport = [...exportData, totalRow].map(r => {
      const rounded = {};
      Object.keys(r).forEach((key) => {
        const v = r[key];
        rounded[key] = (typeof v === "number") ? Number(Number(v).toFixed(2)) : v;
      });
      return rounded;
    });

    const storeNames =
      data.store.length > 0
        ? data.allStore
          .filter((item) => data.store.includes(item._id))
          .map((s) => s.StoreName)
          .join(", ")
        : "All";

    await exportProfessionalExcel({
      title: 'Stock Flow Report',
      fileName: 'Stock_Flow_Report',
      sheetName: 'StockFlowReport',
      rows: finalExport,
      meta: [
        `Period: ${data.startDate} → ${data.endDate}`,
        `Store: ${storeNames}`,
        `Status: ${data.status || "All"}`,
        `Damage: ${data.damage || "No"}`,
        `Quantity Type: ${qtyType}`,
      ],
      excludeKeys: ['_id', 'id'],
    });
  };



  const handlePrint = () => {
    const printContent = document.getElementById('stock-flow-report').innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Stock Flow Report</title>
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
        `/InventoryReport/StockFlowReport?startDate=${data.startDate}&endDate=${data.endDate}&status=${status}&Store=${store}&damage=${damage}`
      );
      setRows(Array.isArray(result?.rows) ? result.rows : []);
    } catch (error) {
      console.error("Error fetching stock flow report:", error);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [data]);

  return (
    <div className="sales-report-container" id="stock-flow-report">
      <ReportPopupHeader title="Stock Flow Report" />

      {/* Watermark */}
      <div className="watermark">
        <div className="watermark-content">
          <div className="watermark-logo">STOCK FLOW</div>
          <div className="watermark-text">Inventory Report</div>
          <div className="watermark-subtext">Confidential</div>
        </div>
      </div>

      {/* Header */}
      <div className="sales-report-header">
        <div className="company-info">
          <div className="company-name">Pearl Dynamic</div>
          <div className="company-address">123 Business Avenue, City, Country</div>
          <div className="company-contact">contact@faedibles.com | +1 (234) 567-8901</div>
        </div>

        <div className="report-info">
          <div className="report-title">Stock Flow Report</div>
          <div className="report-date">Generated: {new Date().toLocaleDateString()}</div>
          <div className="report-range">Period: {data.startDate} to {data.endDate}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="report-controls">
        <div className="summary-stats">
          <div className="stat-item">Date From: {formatDate(data.startDate)}</div>
          <div className="stat-item">Date To: {formatDate(data.endDate)}</div>
          <div className="stat-item">Qty In: {qtyType}</div>
          <div className="stat-item">Stock Type: {data.damage}</div>
          <div className="stat-item">Status: {data.status}</div>
          <div className="stat-item">
            Store: {
              data.store.length > 0
                ? data.allStore
                  .filter((item) => data.store.includes(item._id))
                  .map((s) => s.StoreName)
                  .join(", ")
                : "All"
            }
          </div>

          <div className="stat-item">
            Locatione: {
              data.alllocation.find((item) => item.value == data.location)?.label ?? "All"

            }
          </div>

        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper"><div className="spinner"></div></div>
        ) : (
          <table className="sales-data-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th style={{ minWidth: '200px' }}>Sku Name</th>
                <th>SKU Code</th>
                {qtyType === "Three" || qtyType === "Box" ? <th>Opening Boxes</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Opening Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Opening Unit</th> : null}
                {qtyType === "Three" || qtyType === "Box" ? <th>Purchased Boxes</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Purchased Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Purchased Unit</th> : null}
                {qtyType === "Three" || qtyType === "Box" ? <th>RC Boxes</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>RC Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>RC Unit</th> : null}
                {qtyType === "Three" || qtyType === "Box" ? <th>Total Purchase (Box)</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Total Purchase (Carton)</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Total Purchase (Unit)</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Transfer In Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Transfer In Unit</th> : null}
                {qtyType === "Three" || qtyType === "Box" ? <th>Sale Boxes</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Sale Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Sale Unit</th> : null}
                {qtyType === "Three" || qtyType === "Box" ? <th>DC Boxes</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>DC Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>DC Unit</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Replacement Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Replacement Unit</th> : null}
                {/* ADDED TRANSFER OUT COLUMNS */}
                {qtyType === "Three" || qtyType === "Box" ? <th>Transfer Out Boxes</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Transfer Out Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Transfer Out Unit</th> : null}
                {qtyType === "Three" || qtyType === "Box" ? <th>Transfer in Boxes</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Transfer in Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Transfer in Unit</th> : null}
                {qtyType === "Three" || qtyType === "Box" ? <th>Stock Replacement Boxes</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Stock Replacement Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Stock Replacement Unit</th> : null}
                {qtyType === "Three" || qtyType === "Box" ? <th>Sales Return Boxes</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Sales Return Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Sales Return Unit</th> : null}
                {qtyType === "Three" || qtyType === "Box" ? <th>Purchase Return Boxes</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Purchase Return Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Purchase Return Unit</th> : null}
                {qtyType === "Three" || qtyType === "Box" ? <th>Adj. Less Box</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Adj. Less Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Adj. Less Unit</th> : null}
                {qtyType === "Three" || qtyType === "Box" ? <th>Adj. Add Box</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Adj. Add Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Adj. Add Unit</th> : null}
                {qtyType === "Three" || qtyType === "Box" ? <th>Remaining Boxes</th> : null}
                {qtyType === "Three" || qtyType === "Carton" ? <th>Remaining Carton</th> : null}
                {qtyType === "Three" || qtyType === "Unit" ? <th>Remaining Unit</th> : null}
                <th>Remaining Value</th>
                <th>Remaining Value With Gst</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((item, index) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>{item.productName}</td>
                    <td>{item.SkuCode}</td>
                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(item.TotalopenigQty)}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.TotalopenigCarton)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.TotalopenigUnit)}</td> : null}
                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(item.purchasedBoxes)}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.purchasedCarton)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.purchasedUnits)}</td> : null}
                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(item.totalRCBox)}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.totalRCCarton)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.totalRCUnit)}</td> : null}
                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty((item.totalRCBox + item.purchasedBoxes))}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty((item.totalRCCarton + item.purchasedCarton))}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty((item.totalRCUnit + item.purchasedUnits))}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.totalInCarton)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.totalInUnit)}</td> : null}
                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(item.soldBoxes)}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.soldCarton)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.soldUnits)}</td> : null}
                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(item.totalDCBox)}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.totalDCCarton)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.totalDCUnits)}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.totalCartonReplacementFrom)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.totalUnitReplacementFrom)}</td> : null}
                    {/* ADDED TRANSFER OUT DATA CELLS */}
                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(item.totalOutBoxes)}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.totalOutCarton)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.totalOutUnit)}</td> : null}

                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(item.totalInBoxes)}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.totalInCarton)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.totalInUnit)}</td> : null}

                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(item.totalBoxesReplacementFrom)}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.totalCartonReplacementFrom)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.totalUnitReplacementFrom)}</td> : null}
                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(item.totalReturnBox)}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.totalReturnCarton)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.totalReturnUnit)}</td> : null}
                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(item.totalPurchaseReturnBox)}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.totalPurchaseReturnCarton)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.totalPurchaseReturnUnit)}</td> : null}
                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty((item.totalAdjustmentLessBox ?? 0))}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(((item.totalAdjustmentLessBox ?? 0) / (pack(item.boxInCarton))))}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(((item.totalAdjustmentLessBox ?? 0) * (item.PcsinBox || 1)))}</td> : null}
                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty((item.totalAdjustmentAddBox ?? 0))}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(((item.totalAdjustmentAddBox ?? 0) / (pack(item.boxInCarton))))}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(((item.totalAdjustmentAddBox ?? 0) * (item.PcsinBox || 1)))}</td> : null}
                    {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(item.remainingBoxes)}</td> : null}
                    {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(item.remainingCartons)}</td> : null}
                    {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(item.remainingUnits)}</td> : null}
                    <td className="numeric">{formatQty(item.remainingBoxesValue)}</td>
                    <td className="numeric">{formatQty(item.remainingBoxesValueWithGst)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={45} className="no-data">
                    No stock flow data available for the selected period
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <td colSpan={3} style={{ textAlign: 'center' }}>Total</td>
              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.TotalopenigQty) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.TotalopenigCarton) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.TotalopenigUnit) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.purchasedBoxes) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.purchasedCarton) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.purchasedUnits) || 0), 0))}</td> : null}
              
              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalRCBox) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalRCCarton) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalRCUnit) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + ((parseFloat(val.totalRCBox) || 0) + (parseFloat(val.purchasedBoxes) || 0)), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + ((parseFloat(val.totalRCCarton) || 0) + (parseFloat(val.purchasedCarton) || 0)), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + ((parseFloat(val.totalRCUnit) || 0) + (parseFloat(val.purchasedUnits) || 0)), 0))}</td> : null}

              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalInCarton) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalInUnit) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.soldBoxes) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.soldCarton) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.soldUnits) || 0), 0))}</td> : null}

              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalDCBox) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalDCCarton) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalDCUnits) || 0), 0))}</td> : null}
              
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalCartonReplacementFrom) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalUnitReplacementFrom) || 0), 0))}</td> : null}
              {/* ADDED TRANSFER OUT DATA CELLS */}
              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalOutBoxes) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalOutCarton) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalOutUnit) || 0), 0))}</td> : null}

              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalInBoxes) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalInCarton) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalInUnit) || 0), 0))}</td> : null}

              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalBoxesReplacementFrom) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalBoxesReplacementFrom) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalBoxesReplacementFrom) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalReturnBox) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalReturnCarton) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalReturnUnit) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalPurchaseReturnBox) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalPurchaseReturnCarton) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalPurchaseReturnUnit) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalAdjustmentLessBox) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalAdjustmentLessBox) || 0) / (pack(val.boxInCarton)), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalAdjustmentLessBox) || 0) * (val.PcsinBox || 1), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalAdjustmentAddBox) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalAdjustmentAddBox) || 0) / (pack(val.boxInCarton)), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.totalAdjustmentAddBox) || 0) * (val.PcsinBox || 1), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Box" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.remainingBoxes) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Carton" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.remainingCartons) || 0), 0))}</td> : null}
              {qtyType === "Three" || qtyType === "Unit" ? <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.remainingUnits) || 0), 0))}</td> : null}
              <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.remainingBoxesValue) || 0), 0))}</td>
              <td className="numeric">{formatQty(rows.reduce((sum, val) => sum + (parseFloat(val.remainingBoxesValueWithGst) || 0), 0))}</td>

            </tfoot>
          </table>
        )}
      </div>

      {/* Actions */}
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
        
        .summary-stats {
          display: flex;
          gap: 24px;
        }
        
        .stat-item {
          font-size: 14px;
          color: #555;
          padding: 8px 16px;
          background: #f8f9fa;
          border-radius: 4px;
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
          min-height: 300px;
        }
        
        .sales-data-table {
          min-width: 1200px;  
          border-collapse: collapse;
          font-size: 12px;
          width: 100%;
        }
        
        .sales-data-table th {
          background: #f8f9fa;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 2px solid #e0e0e0;
          white-space: nowrap;
          position: sticky;
          top: 0;
        }
        
        .sales-data-table td {
          padding: 8px;
          border-bottom: 1px solid #eaeaea;
          border-right: 1px solid #f0f0f0;
          white-space: nowrap;
        }
        
        .sales-data-table tbody tr:hover {
          background-color: #f8f9fa;
        }
        
        .numeric {
          text-align: right;
          font-family: 'Courier New', monospace;
        }
        
        .no-data {
          text-align: center;
          padding: 30px;
          color: #95a5a6;
          font-style: italic;
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
        
        .loader-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          opacity-50 
          cursor-not-allowed
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
            overflow-x: scroll;
            border: none;
          }
          
          .watermark {
            opacity: 0.03;
          }
        }
      `}</style>
    </div>
  );
};

export default StockFlowReportPopup;