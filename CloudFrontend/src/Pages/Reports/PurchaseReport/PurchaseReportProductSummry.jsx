import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';

const PurchaseReportProductSummry = ({ filterData = [] }) => {
  const { startDate, endDate } = filterData;
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  // Fetch Purchase data
  const getData = async () => {
    try {
      //console.log("Data Loading...")
      const gettingdata = await getDataFundtion(
        `inventoryReport/PurchaseDumpData?startDate=${startDate}&endDate=${endDate}`
      );
      
      //console.log(gettingdata)
      setData(gettingdata);
    } catch (err) {
      //console.log(err);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  // Process data and group by product
  useEffect(() => {
    if (data && data.length > 0) {
      const sortedData = data.sort((a, b) => Number(a.invoice) - Number(b.invoice));

      const filteredProducts = sortedData.filter(item => {
        // PRODUCT
        const productMatch = filterData.Product.some(p => p.value == item.product);

        // VENDOR
        const vendorMatch = filterData.Vendor.some(v => v.value === item.Vendor);

        // LOCATION
        const locationMatch =
          filterData.Location === null ||
          filterData.Location === "All" ||
          filterData.Location.value === undefined
            ? true
            : item.Location == filterData.Location.value;

        // DEPARTMENT / STORE
        const departmentMatch =
          filterData.Department === null ||
          filterData.Department === "All" ||
          filterData.Department.value === undefined
            ? true
            : item.Store == filterData.Department.value;

        // STATUS
        const statusMatch =
          filterData.Status === "Both" ||
          filterData.Status == String(item.PostStatus);

        return productMatch && vendorMatch && locationMatch && departmentMatch && statusMatch;
      });

      // Group data by product
      const groupedByProduct = {};
      
      filteredProducts.forEach((item) => {
        const productId = item.product;
        const productInfo = filterData.Product.find(p => p.value === productId);
        
        if (!groupedByProduct[productId]) {
          // Initialize product group
          const location = filterData.totalLocation.find(loc => loc.value === item.Location)?.label;
          const store = filterData.totalStore.find(dep => dep.value === item.Store)?.label;
          const vendorInfo = filterData.Vendor.find(v => v.value === item.Vendor);
          
          groupedByProduct[productId] = {
            productId: productId,
            productName: productInfo?.ProductName || "Unknown Product",
            code: productInfo?.code || "N/A",
            Hscode: productInfo?.HSCODE || "N/A",
            carton: 0,
            Box: 0,
            Ton: 0,
            Kg: 0,
            totalAmount: 0,
            discount: 0,
            Gst: 0,
            netAmount: 0,
            vendor: vendorInfo?.name || "Unknown Vendor",
            Location: location || "N/A",
            Store: store || "N/A",
            invoices: new Set(),
            dates: new Set(),
            statuses: new Set(),
            itemCount: 0
          };
        }
        
        // Calculate values for this item
        const Box = Number(item.Box) || 0;
        const pcsInBox = Number(productInfo?.PcsinBox) || 0;
        const gram = Number(productInfo?.Gram) || 0;
        const boxesPerCarton = Number(productInfo?.BoxinCarton) || 0;
        const carton = boxesPerCarton > 0 ? Box / boxesPerCarton : 0;
        const Kg = (pcsInBox * Box * gram) / 1000;
        const Ton = Kg / 1000;
        const netAmount = Number(item.GrossAmount - item.Gst - item.discount) || 0;
        
        // Accumulate values
        groupedByProduct[productId].carton += carton;
        groupedByProduct[productId].Box += Box;
        groupedByProduct[productId].Ton += Ton;
        groupedByProduct[productId].Kg += Kg;
        groupedByProduct[productId].totalAmount += Number(item.GrossAmount) || 0;
        groupedByProduct[productId].discount += Number(item.discount) || 0;
        groupedByProduct[productId].Gst += Number(item.Gst) || 0;
        groupedByProduct[productId].netAmount += netAmount;
        groupedByProduct[productId].invoices.add(item.invoice);
        groupedByProduct[productId].dates.add(item.date);
        groupedByProduct[productId].statuses.add(item.PostStatus ? "Posted" : "Pending");
        groupedByProduct[productId].itemCount += 1;
      });

      // Convert grouped object to array for rows
      const processed = Object.values(groupedByProduct).map((group, index) => {
        // Get unique values as strings
        const invoiceList = Array.from(group.invoices).sort((a, b) => Number(a) - Number(b));
        const dateList = Array.from(group.dates).sort();
        const statusList = Array.from(group.statuses);
        
        return {
          id: index + 1,
          productName: group.productName,
          code: group.code,
          Hscode: group.Hscode,
          carton: Math.round(group.carton * 100) / 100, // Round to 2 decimal places
          Box: group.Box,
          Ton: Math.round(group.Ton * 1000) / 1000, // Keep 3 decimal places
          Kg: Math.round(group.Kg * 1000) / 1000, // Keep 3 decimal places
          totalAmount: Math.round(group.totalAmount * 100) / 100,
          discount: Math.round(group.discount * 100) / 100,
          Gst: Math.round(group.Gst * 100) / 100,
          netAmount: Math.round(group.netAmount * 100) / 100,
          vendor: group.vendor,
          Location: group.Location,
          Store: group.Store,
          invoices: invoiceList.length > 3 ? 
            `${invoiceList.slice(0, 3).join(', ')}... (+${invoiceList.length - 3} more)` : 
            invoiceList.join(', '),
          dates: dateList.length > 2 ?
            `${dateList.slice(0, 2).join(', ')}...` :
            dateList.join(', '),
          status: statusList.length > 1 ? 'Mixed' : statusList[0] || 'Unknown',
          transactions: group.itemCount
        };
      });

      setRows(processed);
    }
  }, [data, filterData]);

  // Filtering and sorting
  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows;
    if (filter) {
      filtered = rows.filter((row) =>
        Object.values(row).some(
          (value) => value && value.toString().toLowerCase().includes(filter.toLowerCase())
        )
      );
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [rows, filter, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(",", "");
  };

  // Totals
  const totals = useMemo(() => {
    return {
      totalCartons: filteredAndSortedRows.reduce((sum, row) => sum + row.carton, 0),
      totalBox: filteredAndSortedRows.reduce((sum, row) => sum + row.Box, 0),
      totalTon: filteredAndSortedRows.reduce((sum, row) => sum + row.Ton, 0),
      totalKg: filteredAndSortedRows.reduce((sum, row) => sum + row.Kg, 0),
      totalAmount: filteredAndSortedRows.reduce((sum, row) => sum + row.totalAmount, 0),
      totalGst: filteredAndSortedRows.reduce((sum, row) => sum + row.Gst, 0),
      totalDiscount: filteredAndSortedRows.reduce((sum, row) => sum + row.discount, 0),
      totalNet: filteredAndSortedRows.reduce((sum, row) => sum + row.netAmount, 0),
      totalProducts: filteredAndSortedRows.length,
      totalTransactions: filteredAndSortedRows.reduce((sum, row) => sum + row.transactions, 0)
    };
  }, [filteredAndSortedRows]);

  // Export to Excel
  const exportToExcel = async () => {
    const exportRows = filteredAndSortedRows.map((row, index) => ({
      '#': index + 1,
      ...row,
      carton: Number(Number(row.carton || 0).toFixed(2)),
      Box: Number(Number(row.Box || 0).toFixed(2)),
      Ton: Number(Number(row.Ton || 0).toFixed(2)),
      Kg: Number(Number(row.Kg || 0).toFixed(2)),
      totalAmount: Number(Number(row.totalAmount || 0).toFixed(2)),
      discount: Number(Number(row.discount || 0).toFixed(2)),
      Gst: Number(Number(row.Gst || 0).toFixed(2)),
      netAmount: Number(Number(row.netAmount || 0).toFixed(2)),
    }));
    await exportProfessionalExcel({
      title: 'Purchase Report By Product',
      fileName: 'Purchase_Report_By_Product',
      sheetName: 'Purchase Report',
      rows: exportRows,
      meta: [
        startDate && endDate ? `Period: ${startDate} to ${endDate}` : '',
        filterData.Department?.label ? `Store: ${filterData.Department.label}` : '',
        filterData.Location?.label ? `Location: ${filterData.Location.label}` : '',
        filterData.Status ? `Status: ${filterData.Status}` : '',
      ].filter(Boolean),
      excludeKeys: ['_id', 'id'],
    });
  };

  // Export to Word
  const exportToWord = async () => {
    if (!filteredAndSortedRows || filteredAndSortedRows.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = Object.keys(filteredAndSortedRows[0]);

    const headerRow = new TableRow({
      children: headers.map(header =>
        new TableCell({
          children: [new Paragraph({ text: header })],
        })
      ),
    });

    const dataRows = filteredAndSortedRows.map(row =>
      new TableRow({
        children: Object.values(row).map(value =>
          new TableCell({
            children: [new Paragraph({ text: String(value ?? "") })],
          })
        ),
      })
    );

    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: "Pearl Dynamic", heading: "Heading1" }),
            new Paragraph({ text: "Purchase Report - By Product" }),
            new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
            new Paragraph({ text: `Period: ${startDate} to ${endDate}` }),
            new Paragraph({ text: "" }),
            table,
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "Developed by JS International | Website: https://jaffersons.com/ | Contact: 0301-8251291",
              alignment: AlignmentType.CENTER,
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Purchase_Report_By_Product.docx");
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.addImage(
      "https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png",
      "PNG",
      250,
      8,
      50,
      20
    );
    doc.setFontSize(20);
    doc.text('Purchase Report - By Product', 14, 15);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 29);

    const tableColumn = Object.keys(filteredAndSortedRows[0] || {});
    const tableRows = filteredAndSortedRows.map((row) => Object.values(row));

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    // Add footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text(
      "Developed by JS International | Website: https://jaffersons.com/ | Contact: 0301-8251291",
      doc.internal.pageSize.width / 2,
      pageHeight - 10,
      { align: "center" }
    );

    const img = "https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png";
    doc.setGState(new doc.GState({ opacity: 0.2 }));
    doc.addImage(img, "PNG", 70, 60, 160, 100);
    doc.setGState(new doc.GState({ opacity: 1 }));

    doc.save('Purchase_Report_By_Product.pdf');
  };

  // Print function
  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
    <html>
      <head>
        <title>Purchase Report - By Product</title>
        <style>
          ${document.querySelector("style")?.innerHTML || ""}
          .print-footer {
            margin-top: 40px;
            font-size: 12px;
            text-align: center;
            color: #555;
            border-top: 1px solid #ccc;
            padding-top: 10px;
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
      printWindow.close();
    }, 500);
  };

  return (
    <div className="sales-report-container" ref={reportRef}>
      {/* Watermark */}
      <div className="watermark">
        <div className="watermark-content">
          <div className="watermark-logo">JSoft</div>
          <div className="watermark-text">Cloud</div>
          <div className="watermark-subtext">PURCHASE REPORT BY PRODUCT</div>
        </div>
      </div>

      {/* Header */}
      <div className="sales-report-header">
        <div className="company-info">
          <h1 className="company-name">Pearl Dynamic</h1>
          <p className="company-address">123 Business Avenue, City, Country</p>
          <p className="company-contact">Phone: +1 (234) 567-8900 | Email: info@pmmanagement.com</p>
        </div>
        <div>
          <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png" height={"80vh"} alt="" />
        </div>
        <div className="report-info">
          <h2 className="report-title">Purchase Report - By Product</h2>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">Period: {startDate} to {endDate}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-panel">
        <div className="summary-row">
          <div className="summary-item">
            <span className="summary-label">Total Products:</span>
            <span className="summary-value">{totals.totalProducts}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Transactions:</span>
            <span className="summary-value">{totals.totalTransactions}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Cartons:</span>
            <span className="summary-value">{totals.totalCartons.toFixed(2)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Boxes:</span>
            <span className="summary-value">{totals.totalBox}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Tons:</span>
            <span className="summary-value">{totals.totalTon.toFixed(2)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Kgs:</span>
            <span className="summary-value">{totals.totalKg.toFixed(2)}</span>
          </div>
        </div>
        <div className="summary-row">
          <div className="summary-item">
            <span className="summary-label">Total Amount:</span>
            <span className="summary-value currency">{totals.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total GST:</span>
            <span className="summary-value currency">{totals.totalGst.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Discount:</span>
            <span className="summary-value currency">{totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="summary-item highlight">
            <span className="summary-label">Net Amount:</span>
            <span className="summary-value currency">{totals.totalNet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="report-controls">
        <input
          type="text"
          placeholder="Search products..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
        <div className="summary-stats">
          <div className="stat-item">Products: {filteredAndSortedRows.length}</div>
          <div className="stat-item">Cartons: {totals.totalCartons.toFixed(2)}</div>
          <div className="stat-item">Net Amount: {totals.totalNet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="sales-data-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('id')}>#</th>
              <th onClick={() => requestSort('code')}>SKU Code</th>
              <th onClick={() => requestSort('productName')}>Product Name</th>
              <th onClick={() => requestSort('Hscode')}>HS Code</th>
              <th onClick={() => requestSort('carton')}>Cartons</th>
              <th onClick={() => requestSort('Box')}>Boxes</th>
              <th onClick={() => requestSort('Ton')}>Tons</th>
              <th onClick={() => requestSort('Kg')}>Kgs</th>
              <th onClick={() => requestSort('totalAmount')}>Amount</th>
              <th onClick={() => requestSort('Gst')}>GST</th>
              <th onClick={() => requestSort('discount')}>Discount</th>
              <th onClick={() => requestSort('netAmount')}>Net Amount</th>
              <th onClick={() => requestSort('vendor')}>Vendor</th>
              <th onClick={() => requestSort('Location')}>Location</th>
              <th onClick={() => requestSort('Store')}>Department</th>
              <th onClick={() => requestSort('transactions')}>Transactions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length > 0 ? (
              filteredAndSortedRows.map((row) => (
                <tr key={row.id} className={row.status === 'Pending' ? 'row-pending' : row.status === 'Mixed' ? 'row-mixed' : ''}>
                  <td>{row.id}</td>
                  <td className="sku-code">{row.code}</td>
                  <td>{row.productName}</td>
                  <td>{row.Hscode}</td>
                  <td className="numeric">{row.carton.toFixed(2)}</td>
                  <td className="numeric">{row.Box}</td>
                  <td className="numeric">{row.Ton.toFixed(2)}</td>
                  <td className="numeric">{row.Kg.toFixed(2)}</td>
                  <td className="numeric currency">{row.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric currency">{row.Gst.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric currency">{row.discount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric currency">{row.netAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{row.vendor}</td>
                  <td>{row.Location}</td>
                  <td>{row.Store}</td>
                  
                  
                  <td className="numeric">{row.transactions}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="16" className="no-data">
                  No purchase records found
                </td>
              </tr>
            )}
            <tr className="footer-total">
              <td colSpan="4">Totals</td>
              <td className="numeric">{totals.totalCartons.toFixed(2)}</td>
              <td className="numeric">{totals.totalBox}</td>
              <td className="numeric">{totals.totalTon.toFixed(2)}</td>
              <td className="numeric">{totals.totalKg.toFixed(2)}</td>
              <td className="numeric currency">{totals.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="numeric currency">{totals.totalGst.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="numeric currency">{totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="numeric currency">{totals.totalNet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td colSpan="3"></td>
              <td className="numeric">{totals.totalTransactions}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="report-actions">
        <button className="btn btn-word" onClick={exportToWord}>
          Export to Word
        </button>
        <button className="btn btn-excel" onClick={exportToExcel}>
          Export to Excel
        </button>
        <button className="btn btn-pdf" onClick={exportToPDF}>
          Export to PDF
        </button>
        <button className="btn btn-print" onClick={handlePrint}>
          Print Report
        </button>
      </div>

      <style jsx>{`
        .sales-report-container {
          font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin: 20px auto;
          overflow: scroll;
          color: #333;
          position: relative;
          overflow: hidden;
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
        
        .summary-panel {
          background: #f8f9fa;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 20px;
          border-left: 4px solid #3498db;
          position: relative;
          z-index: 2;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 12px;
        }
        
        .summary-row:last-child {
          margin-bottom: 0;
        }
        
        .summary-item {
          display: flex;
          flex-direction: column;
          min-width: 120px;
        }
        
        .summary-item.highlight {
          background: #e3f2fd;
          padding: 8px 12px;
          border-radius: 4px;
          border: 1px solid #bbdefb;
        }
        
        .summary-label {
          font-size: 12px;
          color: #666;
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .summary-value {
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .summary-value.currency {
          font-family: 'Courier New', monospace;
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
          max-width: 10vw;
        }
        
        .summary-stats {
          display: flex;
          gap: 24px;
        }
        
        .stat-item {
          font-size: 14px;
          color: #555;
        }
        
        .table-container {
          overflow-x: scroll;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
        }
        
        .sales-data-table {
          width: 2500px;
          overflow: scroll;
          height: 20px;
          font-size: 16px;
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
        
        .row-pending {
          background-color: #fff9e6;
        }
        
        .row-mixed {
          background-color: #f0f8ff;
        }
        
        .row-pending:hover {
          background-color: #ffeeb5;
        }
        
        .row-mixed:hover {
          background-color: #e1f0ff;
        }
        
        .numeric {
          text-align: right;
        }
        
        .currency {
          font-family: 'Courier New', monospace;
        }
        
        .invoice-number, .sku-code {
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }
        
        .invoice-list {
          max-width: 150px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: help;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .status-badge.posted {
          background: #e7f4e4;
          color: #2ecc71;
        }
        
        .status-badge.pending {
          background: #fef5e7;
          color: #f39c12;
        }
        
        .status-badge.mixed {
          background: #e8f4f9;
          color: #3498db;
        }
        
        .no-data {
          text-align: center;
          padding: 30px;
          color: #95a5a6;
          font-style: italic;
        }
        
        tfoot {
          border-top: 2px solid #e0e0e0;
        }
        
        .footer-total {
          font-weight: 700;
          background: #f8f9fa;
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
        
        @media (max-width: 5000px) {
          .sales-report-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .company-info, .report-info {
            text-align: center;
            margin-bottom: 16px;
          }
          
          .summary-row {
            flex-direction: column;
            gap: 12px;
          }
          
          .summary-item {
            min-width: 100%;
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
          .sales-report-container {
            box-shadow: none;
            padding: 0;
          }
          
          .report-controls, .report-actions {
            display: none;
          }
          
          .table-container {
            overflow: scroll;
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

export default PurchaseReportProductSummry;