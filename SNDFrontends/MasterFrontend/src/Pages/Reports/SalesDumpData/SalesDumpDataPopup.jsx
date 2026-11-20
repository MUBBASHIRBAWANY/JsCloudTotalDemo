import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import { listFromResponse } from '../../../Components/Global/distributorAccess';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";

const idOf = (value) => {
  if (value && typeof value === 'object') return String(value._id || value.id || '')
  return value == null ? '' : String(value)
}

const attachSkuProductBooker = (salesData, products, bookers) => {
  const productMap = new Map(products.map((item) => [idOf(item._id), item]))
  const bookerMap = new Map(bookers.map((item) => [idOf(item._id), item]))
  return salesData.map((item) => {
    const product = productMap.get(idOf(item.ProductId))
    const booker = bookerMap.get(idOf(item.OrderBookerId))
    return {
      ...item,
      ProductCode: item.ProductCode || product?.code || '',
      ProductName: item.ProductName || product?.ProductName || '',
      OrderBookerName: item.OrderBookerName || booker?.OrderBookerName || '',
    }
  })
}

const attachDisSalesInvoice = async (salesData, distributorIds) => {
  if (!salesData.length || salesData.some((item) => item.DisSalesInvoice)) return salesData;
  const ids = [...new Set(
    (distributorIds?.length ? distributorIds : salesData.map((item) => item.DistributorId))
      .map((id) => (id == null ? '' : String(id)))
      .filter(Boolean)
  )];
  const chunks = await Promise.all(ids.map(async (id) => {
    try {
      const response = await getDataFundtion(`SalesInvoice/Distributer/${id}`);
      return listFromResponse(response);
    } catch (err) {
      console.error('Error fetching distributor invoices:', err);
      return [];
    }
  }));
  const byInvoice = new Map();
  const byInvoiceClient = new Map();
  chunks.flat().forEach((inv) => {
    if (inv?.SalesInvoice == null || !inv.DisSalesInvoice) return;
    byInvoice.set(String(inv.SalesInvoice), inv.DisSalesInvoice);
    byInvoiceClient.set(`${inv.SalesInvoice}|${inv.Client || ''}`, inv.DisSalesInvoice);
  });
  return salesData.map((item) => ({
    ...item,
    DisSalesInvoice:
      item.DisSalesInvoice ||
      byInvoiceClient.get(`${item.SalesInvoice}|${item.ClientId || ''}`) ||
      byInvoice.get(String(item.SalesInvoice)) ||
      '',
  }));
};

const SalesDumpDataPopup = ({ filterData = [] }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { startDate, endDate } = filterData;
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  const getData = async () => {
    setIsLoading(true);
    try {
      const ids = filterData.allowedDistributorIds
      const productPromise = getDataFundtion('/product').catch(() => [])
      const bookerPromise = getDataFundtion('/orderbooker').catch(() => [])
      let salesData = []
      if (ids == null) {
        const response = await getDataFundtion(`SalesInvoice/SalesDumpdate?startDate=${startDate}&endDate=${endDate}`)
        salesData = listFromResponse(response)
      } else if (ids.length) {
        const chunks = await Promise.all(ids.map(async (id) => {
          try {
            const response = await getDataFundtion(`SalesInvoice/SalesDumpdate?startDate=${startDate}&endDate=${endDate}&Distributor=${id}`)
            return listFromResponse(response)
          } catch (fetchErr) {
            console.log(fetchErr)
            return []
          }
        }))
        salesData = chunks.flat()
      }
      const allowed = ids == null ? null : new Set(ids.map(String))
      if (allowed) {
        salesData = salesData.filter((item) => allowed.has(String(item.DistributorId || item.Distrbutor || '')))
      }
      const [productRes, bookerRes] = await Promise.all([productPromise, bookerPromise])
      salesData = attachSkuProductBooker(
        salesData,
        listFromResponse(productRes),
        listFromResponse(bookerRes)
      )
      salesData = await attachDisSalesInvoice(salesData, ids)

      setData(salesData);
      // const rows =  salesData.filter(item => item.PostStatus == "Open" , "Open")
      
      console.log("Fetched data:", salesData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      getData();
    }
  }, [startDate, endDate]);

  // Process data when data changes or filterData changes
  useEffect(() => {
    if (data && data.length > 0) {
      // Sort data by SalesInvoiceDate
      const sortedDataByDate = [...data].sort((a, b) => 
        new Date(a.SalesInvoiceDate) - new Date(b.SalesInvoiceDate)
      );
      
      // Filter based on filterData
      const sameId = (a, b) => String(a) === String(b)
      const filteredProducts = sortedDataByDate.filter(item => {
        const productMatch = !filterData.Product?.length || filterData.Product.some((p) => sameId(p.value, item.ProductId))
        const customerMatch = !filterData.Customer?.length || filterData.Customer.some((c) => sameId(c.value, item.ClientId) || sameId(c.value, item.Client))
        const orderBookerMatch = !filterData.OrderBooker?.length || filterData.OrderBooker.some((ob) => sameId(ob.value, item.OrderBookerId))
        const statusMatch = filterData.Status === "Both" || filterData.Status === item.PostStatus
        return productMatch && customerMatch && orderBookerMatch && statusMatch
      });
      
      // Map and enrich data
      const processed = filteredProducts.map((item, index) => {
        const customer = filterData.Customer?.find((c) => String(c.value) === String(item.ClientId) || String(c.value) === String(item.Client));
        const product = filterData.Product?.find((p) => String(p.value) === String(item.ProductId));
        const orderBooker = filterData.OrderBooker?.find((ob) => String(ob.value) === String(item.OrderBookerId));
        
        // Get Region, Zone, City from customer
        const region = filterData.Region?.find((r) => String(r.value) === String(customer?.Region))?.label || '';
        const zone = filterData.Zone?.find((z) => String(z.value) === String(customer?.Zone))?.label || '';
        const city = filterData.City?.find((ct) => String(ct.value) === String(customer?.city || customer?.City))?.label || '';
        
        return {
          id: index + 1,
          invoice: item.DisSalesInvoice || item.SalesInvoice,
          invoiceDate: item.SalesInvoiceDate,
          orderNumber: item.OrderNumber,
          loadFormNumber: item.LoadFormNumber,  
          productName: product?.ProductName || item.ProductName || "Unknown Product",
          code: product?.code || item.ProductCode || "N/A",
          Box: (Number(item.DeliveredBox || 0)),
          totalNetSaleAmount: Number(item.NetSale) || Number(item.GrossAmount) || 0,
          grossAmount: Number(item.GrossAmount) || 0,
          date: item.SalesInvoiceDate,
          client: customer?.name || item.Client,
          clientId: item.Client,
          distributorId: item.DistributorId,
          NTN: customer?.NTN || '',
          STN: customer?.STN || '',
          OrderBooker: orderBooker?.label || item.OrderBookerName || '',
          Address: customer?.Address || '',
          To: (Number(item.DeliveredBox) || 0) === 0
            ? 0
            : (Number(item.To) || Number(item.TO) || 0) + (Number(item.SpecialTO) || 0),
          Region: region,
          Zone: zone,
          City: city,
          status: item.PostStatus,
        };
      });
      
      setRows(processed);
    }
  }, [data, filterData]);

  // Filter and sort rows based on user interaction
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
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle date sorting
        if (sortConfig.key === 'date' || sortConfig.key === 'invoiceDate') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
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

  // Calculate totals for summary
  const totals = useMemo(() => {
    return {
      totalBox: filteredAndSortedRows.reduce((sum, row) => sum + (row.Box || 0), 0),
      To: filteredAndSortedRows.reduce((sum, row) => sum + (row.To || 0), 0),
      totalAmount: filteredAndSortedRows.reduce((sum, row) => sum + (row.totalNetSaleAmount || 0), 0),
      totalGrossAmount: filteredAndSortedRows.reduce((sum, row) => sum + (row.grossAmount || 0), 0),
    };
  }, [filteredAndSortedRows]);

  // Group by invoice for summary
  const invoiceSummary = useMemo(() => {
    const summary = new Map();
    filteredAndSortedRows.forEach(row => {
      if (!summary.has(row.invoice)) {
        summary.set(row.invoice, {
          invoice: row.invoice,
          invoiceDate: row.invoiceDate,
          client: row.client,
          totalBox: 0,
          totalNetAmount: 0,
          totalGrossAmount: 0,
          status: row.status,
        });
      }
      const inv = summary.get(row.invoice);
      inv.totalBox += row.Box;
      inv.totalNetAmount += row.totalNetSaleAmount;
      inv.totalGrossAmount += row.grossAmount;
    });
    return Array.from(summary.values());
  }, [filteredAndSortedRows]);

  // Export to Excel function
  const exportToExcel = () => {
    const exportData = filteredAndSortedRows.map(row => ({
      '#': row.id,
      'Date': row.invoiceDate,
      'Invoice #': row.invoice,
      'Order #': row.orderNumber,
      'SKU Code': row.code,
      'Product': row.productName,
      'Box': row.Box,
      'Gross Amount': row.grossAmount,
      'TO': row.To,
      'Net Sale Amount': row.totalNetSaleAmount,
      'Client': row.client,
      'Region': row.Region,
      'Zone': row.Zone,
      'City': row.City,
      'Order Booker': row.OrderBooker,
      'Status': row.status,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
    
    // Add summary sheet
    const summaryData = invoiceSummary.map(inv => ({
      'Invoice #': inv.invoice,
      'Date': inv.invoiceDate,
      'Client': inv.client,
      'Total Box': inv.totalBox,
      'Total Net Amount': inv.totalNetAmount,
      'Total Gross Amount': inv.totalGrossAmount,
      'Status': inv.status,
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Invoice Summary");
    
    XLSX.writeFile(workbook, "Sales_Report.xlsx");
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(",", "");
  };

  // Export to Word function
  const exportToWord = async () => {
    if (filteredAndSortedRows.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = ['#', 'Date', 'Invoice #', 'Order #', 'SKU Code', 'Product', 'Box', 'Gross Amount', 'TO', 'Net Amount', 'Client', 'Region', 'Zone', 'City', 'Order Booker', 'Status'];
    
    const tableRows = filteredAndSortedRows.map(row =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(row.id) })] }),
          new TableCell({ children: [new Paragraph({ text: formatDate(row.invoiceDate) })] }),
          new TableCell({ children: [new Paragraph({ text: row.invoice })] }),
          new TableCell({ children: [new Paragraph({ text: row.orderNumber || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.code })] }),
          new TableCell({ children: [new Paragraph({ text: row.productName })] }),
          new TableCell({ children: [new Paragraph({ text: String(row.Box) })] }),
          new TableCell({ children: [new Paragraph({ text: row.grossAmount?.toLocaleString() || '0' })] }),
          new TableCell({ children: [new Paragraph({ text: row.To?.toLocaleString() || '0' })] }),
          new TableCell({ children: [new Paragraph({ text: row.totalNetSaleAmount.toLocaleString() })] }),
          new TableCell({ children: [new Paragraph({ text: row.client || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.Region || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.Zone || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.City || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.OrderBooker || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.status })] }),
        ],
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
        children: [
          new Paragraph({ text: "Pearl Dynamic", heading: "Heading1" }),
          new Paragraph({ text: "Sales Report" }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
          new Paragraph({ text: `Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}` }),
          new Paragraph({ text: `Total Records: ${filteredAndSortedRows.length} | Total Box: ${totals.totalBox} | Total Amount: ${totals.totalAmount.toLocaleString()}` }),
          new Paragraph({ text: "" }),
          table,
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "Developed by JS International | / | ",
            alignment: AlignmentType.CENTER,
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Sales_Report.docx");
  };

  // Export to PDF function
  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    
    doc.addImage(
      "https://res.cloudinary.com/dmi26itgk/image/upload/v1755944631/Screenshot_2025-08-23_152337_ajpexh.png",
      "PNG",
      250, 8, 50, 20
    );
    doc.setFontSize(20);
    doc.text("Sales Report", 14, 15);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}`, 14, 29);
    doc.text(`Total Records: ${filteredAndSortedRows.length} | Total Box: ${totals.totalBox} | Total Amount: ${totals.totalAmount.toLocaleString()}`, 14, 36);

    const tableColumn = ['#', 'Date', 'Invoice #', 'Order #', 'SKU Code', 'Product', 'Box', 'Gross Amount', 'TO', 'Net Amount', 'Client', 'Region', 'Zone', 'City', 'Order Booker', 'Status'];
    const tableRows = filteredAndSortedRows.map((row) => [
      row.id,
      formatDate(row.invoiceDate),
      row.invoice,
      row.orderNumber || '',
      row.code,
      row.productName,
      row.Box,
      row.grossAmount?.toLocaleString() || '0',
      row.To?.toLocaleString() || '0',
      row.totalNetSaleAmount.toLocaleString(),
      row.client || '',
      row.Region || '',
      row.Zone || '',
      row.City || '',
      row.OrderBooker || '',
      row.status,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text(
      "Developed by JS International | / | ",
      doc.internal.pageSize.width / 2,
      pageHeight - 10,
      { align: "center" }
    );
    
    doc.save("Sales_Report.pdf");
  };

  // Print function
  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Report</title>
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
            @media print {
              .report-controls, .report-actions {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <div class="print-footer">
            | / | 
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

  const getStatusBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'serviced': return 'status-serviced';
      case 'cancel': return 'status-cancel';
      case 'Open': return 'status-pending';
      default: return 'status-default';
    }
  };

  return (
    <div className="sales-report-container" ref={reportRef}>
      <div className="watermark">
        <div className="watermark-content">
          <div className="watermark-logo">JSoft</div>
          <div className="watermark-text">Cloud</div>
          <div className="watermark-subtext">SALES REPORT</div>
        </div>
      </div>

      <div className="sales-report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dynamic</h2>
          <p className="company-address">123 Business Avenue, Suite 456</p>
          <p className="company-contact">Phone: (555) 123-4567 | Email: info@pmmgmt.com</p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Sales Report</h1>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">Period: {startDate || 'N/A'} to {endDate || 'N/A'}</p>
        </div>
      </div>

      <div className="report-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search sales data..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="summary-stats">
          <span className="stat-item">
            Total Sales: <strong>{totals.totalAmount.toLocaleString()}</strong>
          </span>
          <span className="stat-item">
            Total Box: <strong>{totals.totalBox}</strong>
          </span>
          <span className="stat-item">
            Transactions: <strong>{filteredAndSortedRows.length}</strong>
          </span>
          <span className="stat-item">
            Invoices: <strong>{invoiceSummary.length}</strong>
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
                <th onClick={() => requestSort('id')}>#</th>
                <th onClick={() => requestSort('invoiceDate')}>Date</th>
                <th onClick={() => requestSort('invoice')}>Invoice #</th>
                <th onClick={() => requestSort('orderNumber')}>Order #</th>
                <th onClick={() => requestSort('code')}>SKU Code</th>
                <th onClick={() => requestSort('productName')}>Product</th>
                <th onClick={() => requestSort('Box')}>Box</th>
                <th onClick={() => requestSort('grossAmount')}>Gross Amount</th>
                <th onClick={() => requestSort('grossAmount')}>TO</th>
                <th onClick={() => requestSort('totalNetSaleAmount')}>Net Amount</th>
                <th onClick={() => requestSort('client')}>Client</th>
                <th onClick={() => requestSort('Region')}>Region</th>
                <th onClick={() => requestSort('Zone')}>Zone</th>
                <th onClick={() => requestSort('City')}>City</th>
                <th onClick={() => requestSort('OrderBooker')}>Order Booker</th>
                <th onClick={() => requestSort('status')}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td style={{ minWidth: "100px" }}>{formatDate(row.invoiceDate)}</td>
                    <td className="invoice-number">{row.invoice}</td>
                    <td>{row.orderNumber}</td>
                    <td className="sku-code">{row.code}</td>
                    <td>{row.productName}</td>
                    <td className="numeric">{row.Box}</td>
                    <td className="numeric currency">{row.grossAmount?.toLocaleString() || 0}</td>
                    <td className="numeric currency">{row.To?.toLocaleString() || 0}</td>
                    <td className="numeric currency">{row.totalNetSaleAmount?.toLocaleString() || 0}</td>
                    <td>{row.client}</td>
                    <td>{row.Region}</td>
                    <td>{row.Zone}</td>
                    <td>{row.City}</td>
                    <td>{row.OrderBooker}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="15" className="no-data">
                    No matching records found
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="footer-total">
                <td colSpan="6">Totals</td>
                <td className="numeric">{totals.totalBox}</td>
                <td className="numeric currency">{totals.totalGrossAmount.toLocaleString()}</td>
                <td className="numeric currency">{totals.To.toLocaleString()}</td>
                <td className="numeric currency">{totals.totalAmount.toLocaleString()}</td>
                <td colSpan="6"></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Invoice Summary Section */}
      {invoiceSummary.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Invoice Summary</h3>
          <div className="table-container">
            <table className="sales-data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Total Box</th>
                  <th>Total Net Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoiceSummary.map((inv, idx) => (
                  <tr key={idx}>
                    <td>{inv.invoice}</td>
                    <td>{formatDate(inv.invoiceDate)}</td>
                    <td>{inv.client}</td>
                    <td className="numeric">{inv.totalBox}</td>
                    <td className="numeric currency">{inv.totalNetAmount.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="report-actions">
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
        
        .search-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          min-width: 250px;
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
          overflow-x: auto;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
        }
        
        .sales-data-table {
          min-width: 1200px;
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
        }
        
        .currency {
          font-family: 'Courier New', monospace;
        }
        
        .invoice-number, .sku-code {
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .status-serviced {
          background: #e7f4e4;
          color: #2ecc71;
        }
        
        .status-cancel {
          background: #fdeaea;
          color: #e74c3c;
        }
        
        .status-pending {
          background: #fef5e7;
          color: #f39c12;
        }
        
        .status-default {
          background: #e8e8e8;
          color: #7f8c8d;
        }
        
        .no-data {
          text-align: center;
          padding: 30px;
          color: #95a5a6;
          font-style: italic;
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
          margin-top: 20px;
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
          
          .report-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-input {
            min-width: 100%;
          }
          
          .summary-stats {
            justify-content: space-around;
            flex-wrap: wrap;
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
            overflow-x: visible;
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

export default SalesDumpDataPopup;