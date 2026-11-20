import React, { useEffect, useState } from 'react';
import { loadStockFlowReport } from './loadStockFlowReport';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StockFlowReportPopup = ({ data }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [, setProducts] = useState([]);
  const [rawData, setRawData] = useState({
    beforePurchase: [],
    beforeSales: [],
    currentPurchase: [],
    currentSales: [],
    stockAdjustments: [],
    beforeStockAdjustments: [],
  });

  const convertQty = (boxes, boxInCarton) => {
    const totalBox = Number(boxes) || 0;
    const bic = Number(boxInCarton) || 1;
    return {
      carton: Math.trunc(totalBox / bic),
      box: totalBox % bic,
      totalBox,
    };
  };

  const formatQty = (n) => {
    const num = Number(n) || 0;
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const qtyParts = (boxes, boxInCarton) => {
    const q = convertQty(boxes, boxInCarton);
    return [formatQty(q.carton), formatQty(q.box), formatQty(q.totalBox)];
  };

  const QtyCells = ({ boxes, boxInCarton, style }) => {
    const q = convertQty(boxes, boxInCarton);
    return (
      <>
        <td className="numeric" style={style}>{formatQty(q.carton)}</td>
        <td className="numeric" style={style}>{formatQty(q.box)}</td>
        <td className="numeric" style={style}>{formatQty(q.totalBox)}</td>
      </>
    );
  };

  const sumFieldQty = (field) => rows.reduce((acc, item) => {
    const q = convertQty(item[field] || 0, item.boxInCarton);
    acc.carton += q.carton;
    acc.box += q.box;
    acc.totalBox += q.totalBox;
    return acc;
  }, { carton: 0, box: 0, totalBox: 0 });

  const formatQtyTriple = (q) => `${formatQty(q.carton)} Ctn / ${formatQty(q.box)} Box / ${formatQty(q.totalBox)} Total Box`;

  const downloadPDF = () => {
    const doc = new jsPDF('landscape');

    doc.setGState(new doc.GState({ opacity: 0.05 }));
    doc.setFontSize(80);
    doc.text("STOCK FLOW REPORT", 80, 150, { angle: 45 });
    doc.setGState(new doc.GState({ opacity: 1 }));

    doc.setFontSize(16);
    doc.text("Stock Flow Report", 14, 15);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Period: ${data.startDate} to ${data.endDate}`, 14, 29);

    const headers = [
      '#',
      'Product Name',
      'SKU Code',
      'Opening Ctn',
      'Opening Box',
      'Opening Total Box',
      'Purchase Ctn',
      'Purchase Box',
      'Purchase Total Box',
      'Sales Ctn',
      'Sales Box',
      'Sales Total Box',
      'Adj Add Ctn',
      'Adj Add Box',
      'Adj Add Total Box',
      'Adj Less Ctn',
      'Adj Less Box',
      'Adj Less Total Box',
      'Ending Ctn',
      'Ending Box',
      'Ending Total Box',
      'Remaining Stock Amount (Rs)'
    ];

    const tableRows = rows.map((item, index) => [
      index + 1,
      item.productName,
      item.SkuCode,
      ...qtyParts(item.openingStock, item.boxInCarton),
      ...qtyParts(item.currentPurchase, item.boxInCarton),
      ...qtyParts(item.currentSales, item.boxInCarton),
      ...qtyParts(item.stockAdjustmentAdd || 0, item.boxInCarton),
      ...qtyParts(item.stockAdjustmentLess || 0, item.boxInCarton),
      ...qtyParts(item.endingStock, item.boxInCarton),
      Number(item.endingStockAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableRows,
      startY: 40,
      theme: "grid",
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: { fillColor: [66, 139, 202] },
      margin: { top: 40 }
    });

    if (rawData.currentPurchase.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Current Purchase Detail", 14, 15);
      doc.setFontSize(10);
      doc.text(`Period: ${data.startDate} to ${data.endDate}`, 14, 22);

      const purchaseHeaders = ['#', 'Date', 'Invoice No', 'Product', 'Boxes', 'Type'];
      const purchaseRows = rawData.currentPurchase.map((item, index) => [
        index + 1,
        item.date,
        item.invoice,
        item.ResolvedProductName || item.product,
        item.Box,
        item.Type
      ]);
      autoTable(doc, {
        head: [purchaseHeaders],
        body: purchaseRows,
        startY: 30,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [46, 125, 50] },
      });
    }

    if (rawData.beforePurchase.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Before Purchase Detail", 14, 15);
      doc.setFontSize(10);
      doc.text(`Period: Software Start to ${data.startDate}`, 14, 22);

      const bpHeaders = ['#', 'Date', 'Invoice No', 'Product', 'Boxes', 'Type'];
      const bpRows = rawData.beforePurchase.map((item, index) => [
        index + 1,
        item.date,
        item.invoice,
        item.ResolvedProductName || item.product,
        item.Box,
        item.Type
      ]);
      autoTable(doc, {
        head: [bpHeaders],
        body: bpRows,
        startY: 30,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [156, 39, 176] },
      });
    }

    if (rawData.currentSales.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Current Sales Detail", 14, 15);
      doc.setFontSize(10);
      doc.text(`Period: ${data.startDate} to ${data.endDate}`, 14, 22);

      const salesHeaders = ['#', 'Date', 'Invoice No', 'Product', 'Delivered Box', 'RTG Box', 'Net Sale Box', 'Type'];
      const salesRows = rawData.currentSales.map((item, index) => [
        index + 1,
        item.SalesInvoiceDate,
        item.SalesInvoice,
        item.ResolvedProductName || 'Unknown',
        item.DeliveredBox,
        item.RTGBox || 0,
        Math.max(0, (Number(item.DeliveredBox) || 0) - (Number(item.RTGBox) || 0)),
        item.Type
      ]);
      autoTable(doc, {
        head: [salesHeaders],
        body: salesRows,
        startY: 30,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [211, 47, 47] },
      });
    }

    if (rawData.beforeSales.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Before Sales Detail", 14, 15);
      doc.setFontSize(10);
      doc.text(`Period: Software Start to ${data.startDate}`, 14, 22);

      const bsHeaders = ['#', 'Date', 'Invoice No', 'Product', 'Delivered Box', 'RTG Box', 'Net Sale Box', 'Type'];
      const bsRows = rawData.beforeSales.map((item, index) => [
        index + 1,
        item.SalesInvoiceDate,
        item.SalesInvoice,
        item.ResolvedProductName || 'Unknown',
        item.DeliveredBox,
        item.RTGBox || 0,
        Math.max(0, (Number(item.DeliveredBox) || 0) - (Number(item.RTGBox) || 0)),
        item.Type
      ]);
      autoTable(doc, {
        head: [bsHeaders],
        body: bsRows,
        startY: 30,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [255, 143, 0] },
      });
    }

    if (rawData.stockAdjustments && rawData.stockAdjustments.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Stock Adjustment Detail", 14, 15);
      doc.setFontSize(10);
      doc.text(`Period: ${data.startDate} to ${data.endDate}`, 14, 22);

      const adjHeaders = ['#', 'Date', 'Product', 'Type', 'Box', 'Reason'];
      const adjRows = rawData.stockAdjustments.map((item, index) => [
        index + 1,
        item.AdjustmentDate,
        item.ResolvedProductName || 'Unknown',
        item.adjustmentType,
        item.Box,
        item.Reason || ''
      ]);
      autoTable(doc, {
        head: [adjHeaders],
        body: adjRows,
        startY: 30,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 150, 136] },
      });
    }

    doc.save("Stock_Flow_Report.pdf");
  };

  const downloadExcel = () => {
    const exportData = rows.map((row, index) => {
      const opening = convertQty(row.openingStock, row.boxInCarton);
      const purchase = convertQty(row.currentPurchase, row.boxInCarton);
      const sales = convertQty(row.currentSales, row.boxInCarton);
      const adjAdd = convertQty(row.stockAdjustmentAdd || 0, row.boxInCarton);
      const adjLess = convertQty(row.stockAdjustmentLess || 0, row.boxInCarton);
      const ending = convertQty(row.endingStock, row.boxInCarton);

      return {
        '#': index + 1,
        'Product Name': row.productName,
        'SKU Code': row.SkuCode,
        'Box in Carton': row.boxInCarton,
        'Opening Carton': opening.carton,
        'Opening Box': opening.box,
        'Opening Total Box': opening.totalBox,
        'Purchase Carton': purchase.carton,
        'Purchase Box': purchase.box,
        'Purchase Total Box': purchase.totalBox,
        'Sales Carton': sales.carton,
        'Sales Box': sales.box,
        'Sales Total Box': sales.totalBox,
        'Adj Add Carton': adjAdd.carton,
        'Adj Add Box': adjAdd.box,
        'Adj Add Total Box': adjAdd.totalBox,
        'Adj Less Carton': adjLess.carton,
        'Adj Less Box': adjLess.box,
        'Adj Less Total Box': adjLess.totalBox,
        'Ending Carton': ending.carton,
        'Ending Box': ending.box,
        'Ending Total Box': ending.totalBox,
        'Remaining Stock Amount (Rs)': row.endingStockAmount
      };
    });

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "StockFlowReport");

    if (rawData.currentPurchase.length > 0) {
      const purchaseDetail = rawData.currentPurchase.map((item, index) => ({
        '#': index + 1,
        'Date': item.date,
        'Invoice No': item.invoice,
        'Product Name': item.ResolvedProductName || item.product,
        'Boxes': item.Box,
        'Type': item.Type
      }));
      const purchaseSheet = XLSX.utils.json_to_sheet(purchaseDetail);
      XLSX.utils.book_append_sheet(workbook, purchaseSheet, "Current Purchase Detail");
    }

    if (rawData.beforePurchase.length > 0) {
      const beforePurchaseDetail = rawData.beforePurchase.map((item, index) => ({
        '#': index + 1,
        'Date': item.date,
        'Invoice No': item.invoice,
        'Product Name': item.ResolvedProductName || item.product,
        'Boxes': item.Box,
        'Type': item.Type
      }));
      const beforePurchaseSheet = XLSX.utils.json_to_sheet(beforePurchaseDetail);
      XLSX.utils.book_append_sheet(workbook, beforePurchaseSheet, "Before Purchase Detail");
    }

    if (rawData.currentSales.length > 0) {
      const salesDetail = rawData.currentSales.map((item, index) => ({
        '#': index + 1,
        'Date': item.SalesInvoiceDate,
        'Invoice No': item.SalesInvoice,
        'Product Name': item.ResolvedProductName || 'Unknown',
        'Delivered Box': item.DeliveredBox,
        'RTG Box': item.RTGBox || 0,
        'Net Sale Box': Math.max(0, (Number(item.DeliveredBox) || 0) - (Number(item.RTGBox) || 0)),
        'Type': item.Type
      }));
      const salesSheet = XLSX.utils.json_to_sheet(salesDetail);
      XLSX.utils.book_append_sheet(workbook, salesSheet, "Current Sales Detail");
    }

    if (rawData.beforeSales.length > 0) {
      const beforeSalesDetail = rawData.beforeSales.map((item, index) => ({
        '#': index + 1,
        'Date': item.SalesInvoiceDate,
        'Invoice No': item.SalesInvoice,
        'Product Name': item.ResolvedProductName || 'Unknown',
        'Delivered Box': item.DeliveredBox,
        'RTG Box': item.RTGBox || 0,
        'Net Sale Box': Math.max(0, (Number(item.DeliveredBox) || 0) - (Number(item.RTGBox) || 0)),
        'Type': item.Type
      }));
      const beforeSalesSheet = XLSX.utils.json_to_sheet(beforeSalesDetail);
      XLSX.utils.book_append_sheet(workbook, beforeSalesSheet, "Before Sales Detail");
    }

    if (rawData.stockAdjustments && rawData.stockAdjustments.length > 0) {
      const adjDetail = rawData.stockAdjustments.map((item, index) => ({
        '#': index + 1,
        'Date': item.AdjustmentDate,
        'Product Name': item.ResolvedProductName || 'Unknown',
        'Type': item.adjustmentType,
        'Box': item.Box,
        'Reason': item.Reason || ''
      }));
      const adjSheet = XLSX.utils.json_to_sheet(adjDetail);
      XLSX.utils.book_append_sheet(workbook, adjSheet, "Stock Adjustment Detail");
    }

    XLSX.writeFile(workbook, "Stock_Flow_Report.xlsx");
  };

  const handlePrint = () => {
    const printContent = document.getElementById('stock-flow-report').innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Stock Flow Report</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
            .sales-report-container { background: #fff; border-radius: 8px; padding: 24px; }
            .watermark { display: none; }
            .report-controls, .report-actions { display: none; }
            .table-container { overflow-x: visible; border: none; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 10px; border: 1px solid #ddd; }
            th { background: #f8f9fa; font-weight: 600; }
            .numeric { text-align: right; }
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
      const result = await loadStockFlowReport({
        distributorIds: data.allowedDistributorIds,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
      });
      setProducts(result.products);
      setRows(result.rows);
      setRawData(result.rawData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [data]);

  const distributorLabel = data.allowedDistributorIds == null
    ? 'All'
    : String(data.allowedDistributorIds.length || 0);

  return (
    <div className="sales-report-container" id="stock-flow-report">
      <div className="watermark">
        <div className="watermark-content">
          <div className="watermark-logo">STOCK FLOW</div>
          <div className="watermark-text">Inventory Report</div>
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
          <div className="report-title">Stock Flow Report</div>
          <div className="report-date">Generated: {new Date().toLocaleDateString()}</div>
          <div className="report-range">Period: {data.startDate} to {data.endDate}</div>
          <div className="report-range">Status: {data.status || 'Serviced'}</div>
        </div>
      </div>

      <div className="report-controls">
        <div className="summary-stats">
          <div className="stat-item">Products: {rows.length}</div>
          <div className="stat-item">Distributors: {distributorLabel}</div>
          <div className="stat-item">Quantity Type: Carton / Box / Total Box</div>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper"><div className="spinner"></div></div>
        ) : (
          <table className="sales-data-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th rowSpan={2} style={{ minWidth: '200px' }}>Product Name</th>
                <th rowSpan={2}>SKU Code</th>
                <th colSpan={3}>Opening Stock</th>
                <th colSpan={3}>Current Purchase</th>
                <th colSpan={3}>Current Sales</th>
                <th colSpan={3} style={{ color: '#2e7d32' }}>Adj. Add</th>
                <th colSpan={3} style={{ color: '#c62828' }}>Adj. Less</th>
                <th colSpan={3}>Ending Stock</th>
                <th rowSpan={2}>Remaining Stock Amount (Rs)</th>
              </tr>
              <tr>
                <th>Carton</th><th>Box</th><th>Total Box</th>
                <th>Carton</th><th>Box</th><th>Total Box</th>
                <th>Carton</th><th>Box</th><th>Total Box</th>
                <th style={{ color: '#2e7d32' }}>Carton</th><th style={{ color: '#2e7d32' }}>Box</th><th style={{ color: '#2e7d32' }}>Total Box</th>
                <th style={{ color: '#c62828' }}>Carton</th><th style={{ color: '#c62828' }}>Box</th><th style={{ color: '#c62828' }}>Total Box</th>
                <th>Carton</th><th>Box</th><th>Total Box</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((item, index) => (
                  <tr key={item.productId}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>{item.productName}</td>
                    <td>{item.SkuCode}</td>
                    <QtyCells boxes={item.openingStock} boxInCarton={item.boxInCarton} style={{ fontWeight: 'bold', backgroundColor: '#e8f5e9' }} />
                    <QtyCells boxes={item.currentPurchase} boxInCarton={item.boxInCarton} />
                    <QtyCells boxes={item.currentSales} boxInCarton={item.boxInCarton} />
                    <QtyCells boxes={item.stockAdjustmentAdd || 0} boxInCarton={item.boxInCarton} style={{ color: '#2e7d32', fontWeight: 'bold' }} />
                    <QtyCells boxes={item.stockAdjustmentLess || 0} boxInCarton={item.boxInCarton} style={{ color: '#c62828', fontWeight: 'bold' }} />
                    <QtyCells boxes={item.endingStock} boxInCarton={item.boxInCarton} style={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }} />
                    <td className="numeric" style={{ fontWeight: 'bold', backgroundColor: '#fff8e1' }}>
                      {Number(item.endingStockAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={22} className="no-data">
                    No stock flow data available for the selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {rows.length > 0 && (
        <div className="summary-section">
          <h4>Summary</h4>
          <div className="summary-stats-footer">
            <div className="summary-item">
              <span>Total Opening Stock:</span>
              <strong>{formatQtyTriple(sumFieldQty('openingStock'))}</strong>
            </div>
            <div className="summary-item">
              <span>Total Current Purchase:</span>
              <strong>{formatQtyTriple(sumFieldQty('currentPurchase'))}</strong>
            </div>
            <div className="summary-item">
              <span>Total Current Sales:</span>
              <strong>{formatQtyTriple(sumFieldQty('currentSales'))}</strong>
            </div>
            <div className="summary-item">
              <span style={{ color: '#2e7d32' }}>Total Stock Adj. Add:</span>
              <strong style={{ color: '#2e7d32' }}>{formatQtyTriple(sumFieldQty('stockAdjustmentAdd'))}</strong>
            </div>
            <div className="summary-item">
              <span style={{ color: '#c62828' }}>Total Stock Adj. Less:</span>
              <strong style={{ color: '#c62828' }}>{formatQtyTriple(sumFieldQty('stockAdjustmentLess'))}</strong>
            </div>
            <div className="summary-item">
              <span>Total Ending Stock:</span>
              <strong>{formatQtyTriple(sumFieldQty('endingStock'))}</strong>
            </div>
            <div className="summary-item">
              <span>Total Remaining Stock Amount:</span>
              <strong>{rows.reduce((sum, item) => sum + (Number(item.endingStockAmount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          </div>
        </div>
      )}

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
          max-width: 1800px;
          color: #333;
          position: relative;
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
          flex-wrap: wrap;
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
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
          min-height: 300px;
        }

        .sales-data-table {
          min-width: 1600px;
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

        .summary-section {
          background: #f8f9fa;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
        }

        .summary-section h4 {
          margin: 0 0 12px 0;
          color: #2c3e50;
        }

        .summary-stats-footer {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: space-between;
        }

        .summary-item {
          display: flex;
          gap: 8px;
          font-size: 13px;
        }

        .summary-item span {
          color: #7f8c8d;
        }

        .summary-item strong {
          color: #2c3e50;
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
