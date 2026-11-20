import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';


const finiteQty = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? parseFloat(n.toFixed(5)) : 0;
};

const InventoryValuationReport = ({ filterData = {} }) => {
  //console.log("Filter Data Received:", filterData);

  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  const getData = async () => {
    setIsLoading(true);
    try {
      const data = await getDataFundtion(
        `InventoryReport/GetDataByDate?startDate=${filterData.endDate}&endDate=${filterData.endDate}&status=Post&Store=${filterData.selectedStore?.value || filterData.Store}&damage=Fresh`
      );
      const source = Array.isArray(data) ? data : [];
      const Openingmerged = source.reduce((acc, item) => {
        if (!item || typeof item !== "object") return acc;
        const key = item.product;
        if (!key) return acc;
        if (!acc[key]) {
          acc[key] = {
            product: key,
            // EXACT SAME VARIABLES AS SINGLE PRODUCT LEDGER
            totalOpeningBox: 0,
            totalPerBoxCost: 0,
            totalBalanceCost: 0
          };
        }

        const product = acc[key];
        const selectedStoreId = filterData.selectedStore?.value;
        const hasStoreFilter = selectedStoreId !== undefined;

        // EXACT SAME STORE FILTER LOGIC AS SINGLE PRODUCT LEDGER
        const isAllowed = (item) => {
          if (!hasStoreFilter) return true;

          // Sale, Purchase, Return, StockReplacement, PurchaseReturn
          if (item.hasOwnProperty('totalSaleBoxBefore') ||
            item.hasOwnProperty('totalPurchaseBoxBefore') ||
            item.hasOwnProperty('totalReturnBoxBefore') ||
            item.hasOwnProperty('totalBoxesToReplacementBefore') ||
            item.hasOwnProperty('totalPurchaseReturnBoxBefore') ||
            item.hasOwnProperty('totalRCBoxBefore') ||
            item.hasOwnProperty('totalDCBoxBefore')) {
            return item.Store === selectedStoreId;
          }

          // Transfer Out
          if (item.hasOwnProperty('TransferOutBoxesBefore')) {
            return item.StoreFrom === selectedStoreId;
          }

          // Transfer In
          if (item.hasOwnProperty('TransferInBoxesBefore')) {
            return item.StoreTo === selectedStoreId;
          }

          // Default for opening
          return true;
        };

        if (hasStoreFilter && !isAllowed(item)) {
          return acc;
        }

        // EXACT SAME CALCULATIONS AS SINGLE PRODUCT LEDGER

        // Opening. opneingQtyValueExclGst is the per-box rate. Add this line's
        // value onto the balance. Replacing the rate with the last line zeroed
        // the whole product when a later opening line had no rate.
        if (item.hasOwnProperty('opneingQty')) {
          const open = Number(item.opneingQty) || 0;
          const openValue = Number(item.opneingQtyValueExclGst) || 0;

          product.totalOpeningBox += open;
          product.totalBalanceCost += open * openValue;
          product.totalPerBoxCost = product.totalOpeningBox > 0 ? product.totalBalanceCost / product.totalOpeningBox : 0;
        }

        // Purchase
        if (item.hasOwnProperty('totalPurchaseBoxBefore')) {
          const purchase = Number(item.totalPurchaseBoxBefore) || 0;
          const purchaseValue = Number(item.totalPurchaseValueExclGst) || 0;

          product.totalOpeningBox += purchase;
          product.totalBalanceCost += purchaseValue;
          product.totalPerBoxCost = product.totalOpeningBox > 0 ? product.totalBalanceCost / product.totalOpeningBox : 0;
        }

        // Sale
        if (item.hasOwnProperty('totalSaleBoxBefore')) {
          const sale = Number(item.totalSaleBoxBefore) || 0;
          product.totalOpeningBox -= sale;
          product.totalBalanceCost -= sale * product.totalPerBoxCost;
        }

        // Transfer Out
        if (item.hasOwnProperty('TransferOutBoxesBefore')) {
          const transferOut = parseFloat(item.TransferOutBoxesBefore) || 0;
          product.totalOpeningBox -= transferOut;
          product.totalBalanceCost -= transferOut * product.totalPerBoxCost;
        }

        // Transfer In
        if (item.hasOwnProperty('TransferInBoxesBefore')) {
          const transferIn = parseFloat(item.TransferInBoxesBefore) || 0;
          const transferInValue = parseFloat(item.TransferInAmountBefore) || 0;

          product.totalOpeningBox += transferIn;
          product.totalBalanceCost += transferInValue;
          product.totalPerBoxCost = product.totalOpeningBox > 0 ? product.totalBalanceCost / product.totalOpeningBox : 0;
        }

        // Sales Return
        if (item.hasOwnProperty('totalReturnBoxBefore')) {
          const salesReturn = parseFloat(item.totalReturnBoxBefore) || 0;
          const salesReturnValue = parseFloat(item.TotalSRValueExclGstBefore) || 0;

          product.totalOpeningBox += salesReturn;
          product.totalBalanceCost += salesReturnValue;
          product.totalPerBoxCost = product.totalOpeningBox > 0 ? product.totalBalanceCost / product.totalOpeningBox : 0;
        }

        // Purchase Return
        if (item.hasOwnProperty('totalPurchaseReturnBoxBefore')) {
          const purchaseReturn = parseFloat(item.totalPurchaseReturnBoxBefore) || 0;
          product.totalOpeningBox -= purchaseReturn;
          product.totalBalanceCost -= purchaseReturn * product.totalPerBoxCost;
        }

        // Stock Replacement
        if (item.hasOwnProperty('totalBoxesToReplacementBefore')) {
          const stockReplacement = parseFloat(item.totalBoxesToReplacementBefore) || 0;
          product.totalOpeningBox -= stockReplacement;
          product.totalBalanceCost -= stockReplacement * product.totalPerBoxCost;
        }

        // Stock Adjustment Before
        if (item.hasOwnProperty('totalAdjustmentLessBoxBefore')) {
          const adjLess = parseFloat(item.totalAdjustmentLessBoxBefore) || 0;
          product.totalOpeningBox -= adjLess;
          product.totalBalanceCost -= adjLess * product.totalPerBoxCost;
        }
        if (item.hasOwnProperty('totalAdjustmentAddBoxBefore')) {
          const adjAdd = parseFloat(item.totalAdjustmentAddBoxBefore) || 0;
          product.totalOpeningBox += adjAdd;
          product.totalBalanceCost += adjAdd * product.totalPerBoxCost;
        }

        // RC received before the as-of date. Posted RC is stock in.
        if (item.hasOwnProperty('totalRCBoxBefore')) {
          const rcQty = parseFloat(item.totalRCBoxBefore) || 0;
          const rcValue = parseFloat(item.totalRCValueExclGst) || 0;
          product.totalOpeningBox += rcQty;
          product.totalBalanceCost += rcValue;
          product.totalPerBoxCost = product.totalOpeningBox > 0 ? product.totalBalanceCost / product.totalOpeningBox : 0;
        }

        // DC delivered before the as-of date. Same direction as a sale.
        if (item.hasOwnProperty('totalDCBoxBefore')) {
          const dcQty = parseFloat(item.totalDCBoxBefore) || 0;
          product.totalOpeningBox -= dcQty;
          product.totalBalanceCost -= dcQty * product.totalPerBoxCost;
        }

        return acc;
      }, {});
      //console.log(Openingmerged)
      // Now process CURRENT period transactions for each product
      Object.keys(Openingmerged).forEach(productId => {
        const product = Openingmerged[productId];

        // Get all current transactions for this product
        const currentTransactions = source.filter(item => {
          const txDate = item?.date || item?.DCDate;
          return item &&
            item.product === productId &&
            item.type &&
            txDate &&
            new Date(txDate) <= new Date(filterData.endDate);
        });

        // Sort by date (important!)
        currentTransactions.sort((a, b) => new Date(a.date || a.DCDate) - new Date(b.date || b.DCDate));

        // Apply transactions in order (EXACT SAME LOGIC as single product ledger)
        currentTransactions.forEach(transaction => {
          const selectedStoreId = filterData.selectedStore?.value;

          // Store check for each transaction type
          let shouldProcess = true;
          if (selectedStoreId !== undefined) {
            if (transaction.type === "TransferOut") {
              shouldProcess = transaction.StoreFrom === selectedStoreId;
            } else if (transaction.type === "TransferIn") {
              shouldProcess = transaction.StoreTo === selectedStoreId;
            } else {
              shouldProcess = transaction.Store === selectedStoreId;
            }
          }

          if (!shouldProcess) return;

          switch (transaction.type) {
            case "Purchase":
              const purchaseQty = parseFloat(transaction.totalPurchaseBox) || 0;
              const purchaseValue = parseFloat(transaction.totalPurchaseValueExclGst) || 0;

              product.totalOpeningBox += purchaseQty;
              product.totalBalanceCost += purchaseValue;
              product.totalPerBoxCost = product.totalOpeningBox > 0 ? product.totalBalanceCost / product.totalOpeningBox : 0;
              break;

            case "Issue":
              const saleQty = (parseFloat(transaction.totalSaleBox) || 0) + (parseFloat(transaction.totalDCBox) || 0);
              product.totalOpeningBox -= saleQty;
              product.totalBalanceCost -= saleQty * product.totalPerBoxCost;
              break;

            case "RC":
              if (!Object.prototype.hasOwnProperty.call(transaction, "totalRCBox")) break;
              const rcQty = parseFloat(transaction.totalRCBox) || 0;
              const rcValue = parseFloat(transaction.totalRCValueExclGst) || 0;
              product.totalOpeningBox += rcQty;
              product.totalBalanceCost += rcValue;
              product.totalPerBoxCost = product.totalOpeningBox > 0 ? product.totalBalanceCost / product.totalOpeningBox : 0;
              break;

            case "Return":
              const returnQty = parseFloat(transaction.totalReturnBox) || 0;
              const returnValue = parseFloat(transaction.totalValueExclReturnGst) || 0;

              product.totalOpeningBox += returnQty;
              product.totalBalanceCost += returnValue;
              product.totalPerBoxCost = product.totalOpeningBox > 0 ? product.totalBalanceCost / product.totalOpeningBox : 0;
              break;

            case "TransferIn":
              const transferInQty = parseFloat(transaction.totalInBoxes) || 0;
              const transferInValue = parseFloat(transaction.TransferInAmount) || 0;

              product.totalOpeningBox += transferInQty;
              product.totalBalanceCost += transferInValue;
              product.totalPerBoxCost = product.totalOpeningBox > 0 ? product.totalBalanceCost / product.totalOpeningBox : 0;
              break;

            case "TransferOut":
              const transferOutQty = parseFloat(transaction.totalOutBoxes) || 0;
              product.totalOpeningBox -= transferOutQty;
              product.totalBalanceCost -= transferOutQty * product.totalPerBoxCost;
              break;

            case "StockReplacement":
              const replacementQty = parseFloat(transaction.totalBoxesReplacementTo) || 0;
              product.totalOpeningBox -= replacementQty;
              product.totalBalanceCost -= replacementQty * product.totalPerBoxCost;
              break;

            case "PurchaseReturn":
              const purchaseReturnQty = parseFloat(transaction.totalPurchaseReturnBox) || 0;
              product.totalOpeningBox -= purchaseReturnQty;
              product.totalBalanceCost -= purchaseReturnQty * product.totalPerBoxCost;
              break;

            case "StockAdjustment":
              const adjLessBox = parseFloat(transaction.totalAdjustmentLessBox) || 0;
              const adjAddBox = parseFloat(transaction.totalAdjustmentAddBox) || 0;
              product.totalOpeningBox -= adjLessBox;
              product.totalBalanceCost -= adjLessBox * product.totalPerBoxCost;
              product.totalOpeningBox += adjAddBox;
              product.totalBalanceCost += adjAddBox * product.totalPerBoxCost;
              product.totalPerBoxCost = product.totalOpeningBox > 0 ? product.totalBalanceCost / product.totalOpeningBox : 0;
              break;
          }
        });
      });

      const Result = Object.values(Openingmerged);

      const processedRows = Result.map((item, index) => ({
        id: index + 1,
        productId: item.product,
        productName: filterData?.allProduct?.find(p => p._id === item.product)?.ProductName || 'Unknown',
        date: filterData?.allProduct?.find(p => p._id === item.product)?.salesFlowRef || 'Unknown',
        store: filterData.selectedStore?.label || filterData.store || 'All',
        storeid: filterData.selectedStore?.value || filterData.store || 'All',
        balanceQty: finiteQty(item.totalOpeningBox),
        balanceCost: finiteQty(item.totalBalanceCost),
        avgCost: finiteQty(item.totalPerBoxCost)
      }));

      setRows(processedRows);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (filterData.endDate) {
      getData();
    }
  }, [filterData]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows;

    if (filter) {
      filtered = rows.filter(row =>
        Object.values(row).some(value =>
          value && value.toString().toLowerCase().includes(filter.toLowerCase())
        )
      );
    } 

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'ascending'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [rows, filter, sortConfig]);

  const totals = useMemo(() => {
    return {
      totalBalanceQty: filteredAndSortedRows.reduce((sum, row) => sum + row.balanceQty, 0),
      totalBalanceCost: filteredAndSortedRows.reduce((sum, row) => sum + row.balanceCost, 0),
      totalAvgCost: filteredAndSortedRows.length > 0
        ? filteredAndSortedRows.reduce((sum, row) => sum + row.avgCost, 0) / filteredAndSortedRows.length
        : 0,
      totalProducts: filteredAndSortedRows.length,
    };
  }, [filteredAndSortedRows]);

  const exportToExcel = async () => {
    const dataSheetData = filteredAndSortedRows.map((row) => ({
      "Product Name": row.productName,
      "Date": row.date,
      "Store": row.store,
      "Balance Qty": row.balanceQty,
      "Balance Cost": row.balanceCost,
      "Avg Cost": row.avgCost,
    }));

    const totalQty = filteredAndSortedRows.reduce((acc, row) => acc + (Number(row.balanceQty) || 0), 0);
    const totalCost = filteredAndSortedRows.reduce((acc, row) => acc + (Number(row.balanceCost) || 0), 0);

    await exportProfessionalExcel({
      title: 'Inventory Valuation Report',
      fileName: `Inventory_Valuation_${filterData.endDate || new Date().toISOString().split("T")[0]}`,
      sheetName: 'Inventory Valuation',
      rows: dataSheetData,
      meta: [
        `As of Date: ${filterData.endDate || "N/A"}`,
        `Store: ${filterData.selectedStore?.label || "All"}`,
        `Status: ${filterData.status || "All"}`,
        `Quantity Type: ${filterData.qtyType || "N/A"}`,
      ],
      excludeKeys: ['_id', 'id'],
      totals: {
        "Product Name": "TOTAL",
        "Balance Qty": totalQty,
        "Balance Cost": totalCost,
      },
    });
  };


  const exportToWord = async () => {
    const headers = ['Product Name', 'Date', 'Store', 'Balance Qty', 'Balance Cost', 'Avg Cost'];
    const tableRows = filteredAndSortedRows.map(row =>
      new TableRow({
        children: [
          row.productName,
          row.date,
          row.store,
          row.balanceQty.toString(),
          row.balanceCost.toString(),
          row.avgCost.toString(),
        ].map(value =>
          new TableCell({
            children: [new Paragraph({ text: String(value) })],
          })
        ),
      })
    );

    const table = new Table({
      rows: [
        new TableRow({
          children: headers.map(header =>
            new TableCell({
              children: [new Paragraph({ text: header, bold: true })],
            })
          ),
        }),
        ...tableRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: "Pearl Dynamics", heading: "Heading1" }),
          new Paragraph({ text: "Inventory Valuation Report" }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
          new Paragraph({ text: `As of: ${filterData.endDate || 'N/A'}` }),
          new Paragraph({ text: "" }),
          table,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Inventory_Valuation_${filterData.endDate || new Date().toISOString().split('T')[0]}.docx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    const watermark = "https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png";

    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.text("Pearl Dynamic (pvt) ltdPvt Ltd", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(16);
    doc.text("Inventory Valuation Report", pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
    doc.text(`As of Date: ${filterData.endDate || 'N/A'}`, 14, 42);
    doc.text(`Store: ${filterData.selectedStore?.label || filterData.store || 'All'}`, 14, 49);

    // Table Columns
    const tableColumn = ["S.No", "Product Name", "Date", "Store", "Balance Qty", "Balance Cost", "Avg Cost"];

    const tableRows = filteredAndSortedRows.map((row, index) => [
      index + 1,
      row.productName,
      row.date,
      row.store,
      row.balanceQty.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      row.balanceCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      row.avgCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ]);

    // Add totals row
    const totalsRow = [
      "Totals",
      "",
      "",
      "",
      totals.totalBalanceQty.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totals.totalBalanceCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totals.totalAvgCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ];
    tableRows.push(totalsRow);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
      },
      didParseCell: function (data) {
        const lastRowIndex = tableRows.length - 1;
        if (data.row.index === lastRowIndex) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [230, 230, 230];
        }
      },
      didDrawPage: function (data) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setGState(new doc.GState({ opacity: 0.1 }));
        doc.addImage(watermark, "PNG", pageWidth / 2 - 80, pageHeight / 2 - 50, 160, 100);
        doc.setGState(new doc.GState({ opacity: 1 }));
        doc.setFontSize(8);
        doc.text(
          "Developed by JS International | Website: https://jaffersons.com/ | Contact: 0301-8251291",
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      },
    });

    doc.save(`Inventory_Valuation_${filterData.endDate || new Date().toISOString().split('T')[0]}.pdf`);
  };

  const UpdateRate = async () => {

    try {
      const updatedArray = rows.map(item => ({
        product: item.productId,
        store: item.storeid,
        Rate: item.avgCost,
        qty: item.balanceQty,
        amount: item.balanceCost
      }));
      //console.log(updatedArray)

      for (const item of updatedArray) {
        const res = await updateDataFunction('/totalproduct/updateProductRate', item);
        //console.log(res)
      }

      alert("Average Rate Updated Successfully");
    } catch (err) {
      console.error('Error updating average rate:', err);
    } finally {

    }
  };


  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
      <html>
        <head>
          <title>Inventory Valuation Report</title>
          <style>
            body {
              font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
              background: #fff;
              color: #333;
              padding: 20px;
            }
            .report-header {
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
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <div class="print-footer">
            Developed by JS International | Website: <a href="https://jaffersons.com/" target="_blank">https://jaffersons.com/</a> | Contact: 0301-8251291
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
    <div className="sales-report-container" ref={reportRef}>
      <ReportPopupHeader title="Inventory Valuation" />

      <div className="watermark">
        <div className="watermark-content">
          <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png" alt="" />
        </div>
      </div>

      <div className="sales-report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dynamics</h2>
          <p className="company-address">123 Business Avenue, Suite 456</p>
          <p className="company-contact">Phone: (555) 123-4567 | Email: info@pmmgmt.com</p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Inventory Valuation Report</h1>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">
            As of: {filterData.endDate || 'N/A'}
          </p>
          <p className="report-store">
            Store: {filterData.selectedStore?.label || filterData.store || 'All'}
          </p>
        </div>
      </div>

      <div className="report-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search inventory..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="summary-stats">
          <span className="stat-item">
            <button className="btn btn-refresh" onClick={() => UpdateRate()}>Update Rate</button>
          </span>
          <span className="stat-item">
            Total Value: <strong>{totals.totalBalanceCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </span>
          <span className="stat-item">
            Total Qty: <strong>{totals.totalBalanceQty.toFixed(2)}</strong>
          </span>
          <span className="stat-item">
            Products: <strong>{totals.totalProducts}</strong>
          </span>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
          </div>
        ) : (
          <table className="sales-data-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('id')}>
                  # {sortConfig.key === 'id' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('productName')}>
                  Product {sortConfig.key === 'productName' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('date')}>
                  Sales Flow Ref {sortConfig.key === 'Sales Flow Ref' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('store')}>
                  Store {sortConfig.key === 'store' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('balanceQty')}>
                  Balance Qty {sortConfig.key === 'balanceQty' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('balanceCost')}>
                  Balance Cost {sortConfig.key === 'balanceCost' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('avgCost')}>
                  Avg Cost {sortConfig.key === 'avgCost' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td className="product-name">{row.productName}</td>
                    <td>{row.date}</td>
                    <td>{row.store}</td>
                    <td className="numeric">{row.balanceQty.toFixed(2)}</td>
                    <td className="numeric">{row.balanceCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="numeric">{row.avgCost.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">
                    {isLoading ? 'Loading...' : 'No inventory data found'}
                  </td>
                </tr>
              )}
              {filteredAndSortedRows.length > 0 && (
                <tr className="footer-total">
                  <td>Totals</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="numeric">{totals.totalBalanceQty.toFixed(2)}</td>
                  <td className="numeric">{totals.totalBalanceCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{totals.totalAvgCost.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="report-actions no-print">
        <button className="btn btn-word" onClick={exportToWord}>
          Download Word
        </button>
        <button className="btn btn-excel" onClick={exportToExcel}>
          Download Excel
        </button>
        <button className="btn btn-pdf" onClick={exportToPDF}>
          Download PDF
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
        
        .watermark-content img {
          width: 300px;
          height: auto;
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
        
        .report-date, .report-range, .report-store {
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
          transition: border-color 0.3s;
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
          padding: 8px 16px;
          border-radius: 4px;
          border: 1px solid #eaeaea;
        }
        
        .stat-item strong {
          color: #2c3e50;
          margin-left: 8px;
        }
        
        .table-container {
          overflow-x: auto;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
          -webkit-overflow-scrolling: touch;
        }
        
        .sales-data-table {
          min-width: 1000px;
          border-collapse: collapse;
          font-size: 14px;
          width: 100%;
        }
        
        .sales-data-table th {
          background: #f8f9fa;
          padding: 12px 10px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 2px solid #e0e0e0;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        
        .sales-data-table th:hover {
          background: #e9ecef;
        }
        
        .sales-data-table td {
          padding: 10px;
          border-bottom: 1px solid #eaeaea;
        }
        
        .sales-data-table tbody tr:hover {
          background-color: #f8f9fa;
        }
        
        .numeric {
          text-align: right;
          font-family: 'Courier New', monospace;
          font-weight: 500;
        }
        
        .product-name {
          font-weight: 600;
          color: #2c3e50;
        }
        
        .no-data {
          text-align: center;
          padding: 30px;
          color: #95a5a6;
          font-style: italic;
        }
        
        .footer-total {
          font-weight: 700;
          background: #f8f9fa !important;
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
          margin-top: 24px;
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
          transform: translateY(-1px);
        }
        
        .btn-excel {
          background: #217346;
          color: white;
        }
        
        .btn-excel:hover {
          background: #18532f;
          transform: translateY(-1px);
        }
        
        .btn-pdf {
          background: #f40f02;
          color: white;
        }
        
        .btn-pdf:hover {
          background: #c30c01;
          transform: translateY(-1px);
        }
        
        .btn-print {
          background: #555;
          color: white;
        }
        
        .btn-print:hover {
          background: #333;
          transform: translateY(-1px);
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
          
          .search-input {
            min-width: 100%;
          }
          
          .summary-stats {
            justify-content: space-around;
            width: 100%;
          }
          
          .report-actions {
            flex-wrap: wrap;
            justify-content: center;
          }
          
          .btn {
            min-width: 120px;
          }
        }
        
        @media (max-width: 768px) {
          .sales-report-container {
            padding: 16px;
          }
          
          .summary-stats {
            flex-direction: column;
            gap: 8px;
          }
          
          .report-actions {
            flex-direction: column;
          }
          
          .btn {
            width: 100%;
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
            overflow: visible !important;
            border: none;
          }
          
          .watermark {
            opacity: 0.03;
          }
          
          .footer-total {
            font-weight: bold;
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .sales-data-table th {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default InventoryValuationReport;