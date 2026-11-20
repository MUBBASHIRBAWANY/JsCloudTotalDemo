import React, { useEffect, useState } from 'react';
import { getDataFundtion } from '../../Api/CurdFunctions';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StockFlowReportPopup = ({ data }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawData, setRawData] = useState({ beforePurchase: [], beforeSales: [], currentPurchase: [], currentSales: [], stockAdjustments: [] });
  const qtyType = data.qtyType;

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

    // Add watermark
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

    let finalY = autoTable(doc, {
      head: [headers],
      body: tableRows,
      startY: 40,
      theme: "grid",
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: { fillColor: [66, 139, 202] },
      margin: { top: 40 }
    }).finalY;

    // --- Detail Section: Current Purchase ---
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

    // --- Detail Section: Before Purchase ---
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

    // --- Detail Section: Current Sales ---
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

    // --- Detail Section: Before Sales ---
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

    // --- Detail Section: Stock Adjustments ---
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
    // Sheet 1: Summary
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

    // Sheet 2: Purchase Detail (Current Period)
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

    // Sheet 3: Purchase Detail (Before Period)
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

    // Sheet 4: Sales Detail (Current Period)
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

    // Sheet 5: Sales Detail (Before Period)
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

    // Sheet 6: Stock Adjustment Detail
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

      const isWithOpen = data.status === "With Open";
      const num = (v) => Number(v) || 0;

      const toProductId = (raw) => {
        if (!raw) return '';
        if (typeof raw === 'object') return String(raw._id || raw.id || '');
        return String(raw);
      };

      const unwrapList = (res) => {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.data)) return res.data;
        return [];
      };

      // ---- Dates (UTC safe) ----
      const SoftwareDate = "2025-01-01";
      const prevDate = new Date(data.startDate);
      prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      const beforeAdjEndDate = prevDate.toISOString().split('T')[0];

      // ---- Fetch everything in parallel ----
      const reportUrl = `/SalesInvoice/StockReport?startDate=${data.startDate}&endDate=${data.endDate}&Distrbutor=${data.Distrbutor}&Store=${data.Store}`;
      const [response, productRes, adjRes, beforeAdjRes] = await Promise.all([
        getDataFundtion(reportUrl),
        getDataFundtion('/Product'),
        getDataFundtion(`/StockAdjustment/Report?Distrbutor=${data.Distrbutor}&startDate=${data.startDate}&endDate=${data.endDate}`)
          .catch((e) => { console.log("Current adjustments error:", e); return []; }),
        // FIX: before-adjustments ab HAMESHA fetch hoti hain (sirf With Open mein nahi)
        getDataFundtion(`/StockAdjustment/Report?Distrbutor=${data.Distrbutor}&startDate=${SoftwareDate}&endDate=${beforeAdjEndDate}`)
          .catch((e) => { console.log("Before adjustments error:", e); return []; }),
      ]);

      const value1 = unwrapList(response);
      const stockAdjustments = unwrapList(adjRes);
      const beforeStockAdjustments = unwrapList(beforeAdjRes);

      // ---- Status filter ----
      let value = [];
      if (!isWithOpen) {
        const Sale = value1.filter((i) => i.PostStatus === "Serviced");
        const Purchase = value1.filter((i) => i.PostStatus === "Received");
        value = Sale.concat(Purchase);
      } else {
        // With Open = Open + Serviced sales, Purchase sirf Received
        const Sale = value1.filter((i) => i.Page === "Sales" && i.PostStatus !== "Cancel");
        const Purchase = value1.filter((i) => i.Page === "Purchase" && i.PostStatus === "Received");
        value = Sale.concat(Purchase);
      }

      const productList = unwrapList(productRes);
      const productMap = new Map(productList.map((p) => [String(p._id), p]));
      setProducts(productList);

      const beforePurchase = value.filter((i) => i.Type === "Before Purchase");
      const beforeSales = value.filter((i) => i.Type === "Before Sales");
      const currentPurchase = value.filter((i) => i.Type === "Current Purchase");
      const currentSales = value.filter((i) => i.Type === "Current Sales");

      console.log("Counts =>", {
        beforePurchase: beforePurchase.length,
        beforeSales: beforeSales.length,
        currentPurchase: currentPurchase.length,
        currentSales: currentSales.length,
        beforeAdj: beforeStockAdjustments.length,
        currentAdj: stockAdjustments.length,
      });

      // ---- Helpers ----
      const productData = new Map();

      const getProductRow = (productId) => {
        if (!productId) return null;
        if (!productData.has(productId)) {
          productData.set(productId, {
            productId,
            productName: productMap.get(productId)?.ProductName || 'Unknown',
            beforePurchase: 0,
            beforeSales: 0,
            currentPurchase: 0,
            currentSales: 0,
            stockAdjustmentAdd: 0,
            stockAdjustmentLess: 0,
            beforeStockAdjustmentAdd: 0,
            beforeStockAdjustmentLess: 0,
          });
        }
        return productData.get(productId);
      };

      // Carton and box are separate parts of the same quantity.
      const getBoxQty = (item, productId) => {
        const box = num(item.Box);
        const carton = num(item.Carton);
        const boxInCarton = num(productMap.get(productId)?.BoxinCarton) || 1;
        if (carton && box) return box + carton * boxInCarton;
        if (box) return box;
        if (carton) return carton * boxInCarton;
        return 0;
      };

      const applyAdjustment = (item, addField, lessField) => {
        const productId = toProductId(item.product);
        const row = getProductRow(productId);
        if (!row) return;
        const qty = getBoxQty(item, productId);
        const type = String(item.adjustmentType || '').trim().toLowerCase();
        if (type === 'add') row[addField] += qty;
        else if (type === 'less') row[lessField] += qty;
        else console.warn("Unknown adjustmentType:", item.adjustmentType, item);
      };

      // ---- Process ----
      beforePurchase.forEach((item) => {
        const id = toProductId(item.product);
        const row = getProductRow(id);
        if (row) row.beforePurchase += getBoxQty(item, id);   // FIX: carton support
      });

      beforeSales.forEach((item) => {
        const row = getProductRow(toProductId(item.ProductId));
        if (row) row.beforeSales += Math.max(0, num(item.DeliveredBox));
      });

      currentPurchase.forEach((item) => {
        const id = toProductId(item.product);
        const row = getProductRow(id);
        if (row) row.currentPurchase += getBoxQty(item, id);  // FIX: carton support
      });

      currentSales.forEach((item) => {
        const row = getProductRow(toProductId(item.ProductId));
        if (row) row.currentSales += Math.max(0, num(item.DeliveredBox));
      });

      beforeStockAdjustments.forEach((i) => applyAdjustment(i, 'beforeStockAdjustmentAdd', 'beforeStockAdjustmentLess'));
      stockAdjustments.forEach((i) => applyAdjustment(i, 'stockAdjustmentAdd', 'stockAdjustmentLess'));

      // ---- Final calculation ----
      const finalRows = Array.from(productData.values()).map((item) => {
        const product = productMap.get(String(item.productId));

        const openingStock =
          item.beforePurchase + item.beforeStockAdjustmentAdd
          - item.beforeSales - item.beforeStockAdjustmentLess;

        const endingStock =
          openingStock + item.currentPurchase + item.stockAdjustmentAdd
          - item.currentSales - item.stockAdjustmentLess;

        const retailPrice = num(product?.RetailPrice);

        return {
          ...item,
          SkuCode: product?.code || 'N/A',
          openingStock,
          endingStock,
          retailPrice,
          endingStockAmount: endingStock * retailPrice,
          boxInCarton: num(product?.BoxinCarton) || 1,
          PcsinBox: num(product?.PcsinBox) || 1,
        };
      });

      const filteredRows = finalRows.filter((i) =>
        i.beforePurchase || i.beforeSales || i.currentPurchase || i.currentSales ||
        i.stockAdjustmentAdd || i.stockAdjustmentLess ||
        i.beforeStockAdjustmentAdd || i.beforeStockAdjustmentLess
      );

      // ---- Debug: kaun se products minus hain aur kyun ----
      const negatives = filteredRows.filter((r) => r.openingStock < 0 || r.endingStock < 0);
      if (negatives.length) {
        console.warn(`Negative stock products: ${negatives.length}`);
        console.table(negatives.map((r) => ({
          product: r.productName,
          bPurchase: r.beforePurchase, bAdjAdd: r.beforeStockAdjustmentAdd,
          bSales: r.beforeSales, bAdjLess: r.beforeStockAdjustmentLess,
          opening: r.openingStock,
          cPurchase: r.currentPurchase, adjAdd: r.stockAdjustmentAdd,
          cSales: r.currentSales, adjLess: r.stockAdjustmentLess,
          ending: r.endingStock,
        })));
      }

      setRows(filteredRows);

      const resolveProductName = (items, idField) => items.map((item) => ({
        ...item,
        ResolvedProductName: productMap.get(toProductId(item[idField]))?.ProductName || item.ProductName || 'Unknown',
      }));

      setRawData({
        beforePurchase: resolveProductName(beforePurchase, 'product'),
        beforeSales: resolveProductName(beforeSales, 'ProductId'),
        currentPurchase: resolveProductName(currentPurchase, 'product'),
        currentSales: resolveProductName(currentSales, 'ProductId'),
        beforeStockAdjustments: resolveProductName(beforeStockAdjustments, 'product'),
        stockAdjustments: resolveProductName(stockAdjustments, 'product'),
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // const getData = async () => {
  //   try {
  //     setIsLoading(true);
  //     const response = await getDataFundtion(`/SalesInvoice/StockReport?startDate=${data.startDate}&endDate=${data.endDate}&Distrbutor=${data.Distrbutor}&Store=${data.Store}`);
  //     console.log(`/SalesInvoice/StockReport?startDate=${data.startDate}&endDate=${data.endDate}&Distrbutor=${data.Distrbutor}&Store=${data.Store}`, "link")

  //     const value1 = response.data || response;

  //     console.log("response----->", response)
  //     let value = [];
  //     if (data.status !== "With Open") {
  //       const Sale = value1.filter(item => item.PostStatus === "Serviced");
  //       const Purchase = value1.filter(item => item.PostStatus === "Received");
  //       value = Sale.concat(Purchase);
  //       console.log(Sale)
  //     }
  //     else {
  //       // With Open = Open + Serviced sales (stock invoice create par nikal chuka).
  //       // Purchase sirf Received — Send DC warehouse mein enter nahi hua.
  //       const Sale = value1.filter((item) => item.Page === "Sales" && item.PostStatus !== "Cancel");
  //       const Purchase = value1.filter((item) => item.Page === "Purchase" && item.PostStatus === "Received");
  //       value = Sale.concat(Purchase);
  //     }
  //     const productRes = await getDataFundtion('/Product');
  //     const productList = productRes.data || productRes || [];
  //     const productMap = new Map(productList.map(p => [String(p._id), p]));
  //     setProducts(productList);

  //     // Separate all four types of data
  //     const beforePurchase = value.filter(item => item.Type === "Before Purchase");
  //     const beforeSales = value.filter(item => item.Type === "Before Sales");
  //     const currentPurchase = value.filter(item => item.Type === "Current Purchase");
  //     const currentSales = value.filter(item => item.Type === "Current Sales");

  //     console.log("Before Purchase:", beforePurchase.length);
  //     console.log("Before Sales:", beforeSales.length);
  //     console.log("Current Purchase:", currentPurchase.length);
  //     console.log("Current Sales:", currentSales.length);

  //     const toProductId = (raw) => {
  //       if (!raw) return '';
  //       if (typeof raw === 'object') return String(raw._id || raw.id || '');
  //       return String(raw);
  //     };

  //     const unwrapList = (res) => {
  //       if (Array.isArray(res)) return res;
  //       if (Array.isArray(res?.data)) return res.data;
  //       return [];
  //     };

  //     // Fetch stock adjustment data
  //     let stockAdjustments = [];
  //     let beforeStockAdjustments = [];
  //     const SoftwareDate = "2025-01-01";
  //     const prevDate = new Date(data.startDate);
  //     prevDate.setDate(prevDate.getDate() - 1);
  //     const beforeAdjEndDate = prevDate.toISOString().split('T')[0];

  //     try {
  //       const adjRes = await getDataFundtion(`/StockAdjustment/Report?Distrbutor=${data.Distrbutor}&startDate=${data.startDate}&endDate=${data.endDate}`);
  //       stockAdjustments = unwrapList(adjRes);
  //       console.log("Stock Adjustments (Current):", stockAdjustments.length);
  //     } catch (err) {
  //       console.log("No stock adjustments found or error:", err);
  //     }

  //     // For "With Open" status, also fetch before-period adjustments
  //     if (data.status === "With Open") {
  //       try {
  //         const beforeAdjRes = await getDataFundtion(`/StockAdjustment/Report?Distrbutor=${data.Distrbutor}&startDate=${SoftwareDate}&endDate=${beforeAdjEndDate}`);
  //         beforeStockAdjustments = unwrapList(beforeAdjRes);
  //         console.log("Stock Adjustments (Before):", beforeStockAdjustments.length);
  //       } catch (err) {
  //         console.log("No before stock adjustments found or error:", err);
  //       }
  //     }

  //     const productData = new Map();

  //     const makeEmptyProduct = (productId) => ({
  //       productId,
  //       productName: productMap.get(productId)?.ProductName || 'Unknown',
  //       beforePurchase: 0,
  //       beforeSales: 0,
  //       currentPurchase: 0,
  //       currentSales: 0,
  //       stockAdjustmentAdd: 0,
  //       stockAdjustmentLess: 0,
  //       beforeStockAdjustmentAdd: 0,
  //       beforeStockAdjustmentLess: 0
  //     });

  //     const getProductRow = (productId) => {
  //       if (!productId) return null;
  //       if (!productData.has(productId)) {
  //         productData.set(productId, makeEmptyProduct(productId));
  //       }
  //       return productData.get(productId);
  //     };

  //     const getAdjBoxQty = (item, productId) => {
  //       const box = Number(item.Box) || 0;
  //       if (box) return box;
  //       const carton = Number(item.Carton) || 0;
  //       if (!carton) return 0;
  //       const boxInCarton = Number(productMap.get(productId)?.BoxinCarton) || 1;
  //       return carton * boxInCarton;
  //     };

  //     const applyAdjustment = (item, addField, lessField) => {
  //       const productId = toProductId(item.product);
  //       const current = getProductRow(productId);
  //       if (!current) return;
  //       const boxQty = getAdjBoxQty(item, productId);
  //       const adjType = String(item.adjustmentType || '').trim().toLowerCase();
  //       if (adjType === 'add') {
  //         current[addField] = (Number(current[addField]) || 0) + boxQty;
  //       } else if (adjType === 'less') {
  //         current[lessField] = (Number(current[lessField]) || 0) + boxQty;
  //       }
  //     };

  //     // Process Before Purchase
  //     beforePurchase.forEach(item => {
  //       const current = getProductRow(toProductId(item.product));
  //       if (!current) return;
  //       current.beforePurchase += Number(item.Box) || 0;
  //     });

  //     // Process Before Sales
  //     beforeSales.forEach(item => {
  //       const current = getProductRow(toProductId(item.ProductId));
  //       if (!current) return;
  //       const deliveredBox = Number(item.DeliveredBox) || 0;
  //       current.beforeSales += Math.max(0, deliveredBox);
  //     });

  //     // Process Current Purchase
  //     currentPurchase.forEach(item => {
  //       const current = getProductRow(toProductId(item.product));
  //       if (!current) return;
  //       current.currentPurchase += Number(item.Box) || 0;
  //     });

  //     // Process Current Sales
  //     currentSales.forEach(item => {
  //       const current = getProductRow(toProductId(item.ProductId));
  //       if (!current) return;
  //       const deliveredBox = Number(item.DeliveredBox) || 0;
  //       current.currentSales += Math.max(0, deliveredBox);
  //     });

  //     // Process Before Stock Adjustments (for With Open mode)
  //     beforeStockAdjustments.forEach(item => {
  //       applyAdjustment(item, 'beforeStockAdjustmentAdd', 'beforeStockAdjustmentLess');
  //     });

  //     // Process Current Stock Adjustments
  //     stockAdjustments.forEach(item => {
  //       applyAdjustment(item, 'stockAdjustmentAdd', 'stockAdjustmentLess');
  //     });

  //     // Calculate final values
  //     const finalRows = Array.from(productData.values()).map(item => {
  //       const product = productMap.get(String(item.productId));

  //       // Before Stock Adjustment Add and Less (affects opening stock)
  //       const beforeAdjAdd = Number(item.beforeStockAdjustmentAdd) || 0;
  //       const beforeAdjLess = Number(item.beforeStockAdjustmentLess) || 0;

  //       // Opening Stock = Before Purchase - Before Sales + Before Adj Add - Before Adj Less
  //       const openingStock = item.beforePurchase - item.beforeSales + beforeAdjAdd - beforeAdjLess;

  //       // Current Stock Adjustment Add and Less
  //       const adjustmentAdd = Number(item.stockAdjustmentAdd) || 0;
  //       const adjustmentLess = Number(item.stockAdjustmentLess) || 0;

  //       // Ending Stock = Opening Stock + Current Purchase + Current Adjustment Add - Current Sales - Current Adjustment Less
  //       const endingStock = openingStock + item.currentPurchase + adjustmentAdd - item.currentSales - adjustmentLess;

  //       // Remaining Stock ki Amount = Ending Stock (Box) x Retail Price (per box)
  //       const retailPrice = Number(product?.RetailPrice) || 0;
  //       const endingStockAmount = endingStock * retailPrice;

  //       return {
  //         ...item,
  //         SkuCode: product?.code || 'N/A',
  //         openingStock: openingStock,
  //         endingStock: endingStock,
  //         retailPrice: retailPrice,
  //         endingStockAmount: endingStockAmount,
  //         boxInCarton: Number(product?.BoxinCarton) || 1,
  //         PcsinBox: Number(product?.PcsinBox) || 1
  //       };
  //     });

  //     // Filter out products with all zeros
  //     const filteredRows = finalRows.filter(item =>
  //       item.beforePurchase !== 0 ||
  //       item.beforeSales !== 0 ||
  //       item.currentPurchase !== 0 ||
  //       item.currentSales !== 0 ||
  //       (item.stockAdjustmentAdd || 0) !== 0 ||
  //       (item.stockAdjustmentLess || 0) !== 0 ||
  //       (item.beforeStockAdjustmentAdd || 0) !== 0 ||
  //       (item.beforeStockAdjustmentLess || 0) !== 0
  //     );

  //     console.log("Final Calculated Rows:", filteredRows);
  //     setRows(filteredRows);

  //     // Resolve product names for all raw data items using productMap
  //     const resolveProductName = (items, idField) => items.map(item => ({
  //       ...item,
  //       ResolvedProductName: productMap.get(toProductId(item[idField]))?.ProductName || item.ProductName || 'Unknown'
  //     }));

  //     setRawData({
  //       beforePurchase: resolveProductName(beforePurchase, 'product'),
  //       beforeSales: resolveProductName(beforeSales, 'ProductId'),
  //       currentPurchase: resolveProductName(currentPurchase, 'product'),
  //       currentSales: resolveProductName(currentSales, 'ProductId'),
  //       stockAdjustments: stockAdjustments.map(item => ({
  //         ...item,
  //         ResolvedProductName: productMap.get(toProductId(item.product))?.ProductName || item.ProductName || 'Unknown'
  //       }))
  //     });
  //     setIsLoading(false);
  //   } catch (error) {
  //     console.error('Error fetching data:', error);
  //     setIsLoading(false);
  //   }
  // };

  useEffect(() => {
    getData();
  }, [data]);

  return (
    <div className="sales-report-container" id="stock-flow-report">
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
          <div className="company-name">Pearl Daynamic</div>
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
          <div className="stat-item">Products: {rows.length}</div>
          <div className="stat-item">Quantity Type: Carton / Box / Total Box</div>
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

      {/* Summary Section */}
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