import React, { useEffect, useState, useMemo, useRef } from 'react';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';


const OrderBookerAchivmentPopup = ({ filterData = {} }) => {
  console.log("FilterData received:", filterData);
  const [isLoading, setIsLoading] = useState(false);
  const { startDate, endDate } = filterData;
  const [rows, setRows] = useState([]);
  const [Targets, setTargets] = useState([]);
  const [DC, setDC] = useState([]);
  const [Order, setOrder] = useState([]);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);
  const [zsmData, setZsmData] = useState([]);
  const [zoneData, setZoneData] = useState([]);
  const [regionData, setRegionData] = useState([]);

  const getData = async () => {
    if (!startDate || !endDate) {
      console.log("Missing startDate or endDate");
      return;
    }

    setIsLoading(true);
    try {
      const Target = await getDataFundtion(`/Target/getTagetByMonth/${filterData.Month}`)
       
      const gettingdata = await getDataFundtion(`/SaleInvoice/SalesDumpData?startDate=${startDate}&endDate=${endDate}&Store=69589f74bed54ca7db54930c`);
      
      console.log("Target Data:", Target);
      console.log("Order Data (Raw):", Target.Order);
      console.log("DC Data (Raw):", Target.DCData);
      
      setTargets(Target.data || []);
      setDC(Target.DCData || []);
      setOrder(Target.Order || []);

      // Fetch ZSM, Zone, Region data
      const zsmRes = await getDataFundtion("/Zsm");
      setZsmData(zsmRes.data || []);

      const zoneRes = await getDataFundtion("/Zone");
      setZoneData(zoneRes.data || []);

      const regionRes = await getDataFundtion("/Region");
      setRegionData(regionRes.data || []);
      
      console.log("API Sales Response:", gettingdata);
      console.log("Sales Data:", gettingdata.data);

      if (gettingdata.data && gettingdata.data.length > 0) {
        setData(gettingdata.data);
      } else {
        console.log("No data received from API");
        setData([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      getData();
    }
  }, [startDate, endDate]);

  /* ================= BUILD LOOKUPS (component level) ================= */
  const lookupMaps = useMemo(() => {
    // Build OrderBooker -> ZSM lookup from raw OrderBooker data
    const obToZsmMap = new Map();
    (filterData.OrderBookerRaw || []).forEach(ob => {
      if (ob._id && ob.ZSM) obToZsmMap.set(ob._id, ob.ZSM);
    });

    // Build ZSM lookup
    const zsmMap = new Map();
    zsmData.forEach(z => {
      if (z._id) zsmMap.set(z._id, z);
    });

    // Build Zone lookup
    const zoneMap = new Map();
    zoneData.forEach(z => {
      if (z._id) zoneMap.set(z._id, z);
    });

    // Build Region lookup
    const regionMap = new Map();
    regionData.forEach(r => {
      if (r._id) regionMap.set(r._id, r);
    });

    return { obToZsmMap, zsmMap, zoneMap, regionMap };
  }, [filterData.OrderBookerRaw, zsmData, zoneData, regionData]);

  // Process data when data or filterData changes
useEffect(() => {
  console.log("Processing data...");
  console.log("Sales Data:", data);
  console.log("Order Data (from API):", Order);
  console.log("DC Data (from API):", DC);
  console.log("Targets Data:", Targets);

  if (!data || data.length === 0) {
    setRows([]);
    return;
  }

  if (
    !filterData.Product ||
    !filterData.OrderBooker ||
    !filterData.totalCustomer
  ) {
    setRows([]);
    return;
  }

  /* ================= ENRICH SALES DATA ================= */
  const enrichedData = [...data].map((cust) => ({
    ...cust,
    OrderBooker:
      filterData.totalCustomer.find(
        (item) => item._id == cust.Client
      )?.OrderBooker || "Un_define",
  }));

  /* ================= FILTER SALES DATA ================= */
  const filteredProducts = enrichedData.filter((item) => {
    const productMatch = filterData.Product.some(
      (p) => p.value == item.Product
    );

    const orderBookerMatch = filterData.OrderBooker.some(
      (ob) => ob.value == item.OrderBooker
    );

    return productMatch && orderBookerMatch;
  });

  /* ================= BUILD REPORT ================= */
  const reportRows = [];

  filterData.OrderBooker.forEach((orderBooker) => {
    const orderBookerValue = orderBooker.value;
    const orderBookerLabel = orderBooker.label;

    // Resolve ZSM, Zone, Region for this OrderBooker
    const zsmId = lookupMaps.obToZsmMap.get(orderBookerValue);
    const zsmObj = zsmId ? lookupMaps.zsmMap.get(zsmId) : null;
    const zoneId = zsmObj?.Zone;
    const zoneObj = zoneId ? lookupMaps.zoneMap.get(zoneId) : null;
    const regionId = zoneObj?.Region;
    const regionObj = regionId ? lookupMaps.regionMap.get(regionId) : null;

    const zsmName = zsmObj?.ZsmName || '-';
    const zoneName = zoneObj?.ZoneName || '-';
    const regionName = regionObj?.RegionName || '-';

    /* ===== ALL CUSTOMERS OF THIS ORDER BOOKER ===== */
    const clientIds = filterData.totalCustomer
      .filter((item) => item.OrderBooker == orderBookerValue)
      .map((item) => item._id);

    /* ===== TARGET DATA ===== */
    const targetData = Targets.find(
      (item) => item.OrderBooker == orderBookerValue
    );

    if (!targetData?.TargetData) return;

    targetData.TargetData.forEach((targetItem) => {
      const productValue = targetItem.product;
      const targetCartons = Number(targetItem.carton || 0);

      const productInfo = filterData.Product.find(
        (p) => p.value == productValue
      );

      if (!productInfo) return;

      const boxInCarton = Number(productInfo.BoxinCarton || 1);

      /* ================= SALES ================= */
      const salesForTarget = filteredProducts.filter(
        (item) =>
          item.OrderBooker == orderBookerValue &&
          item.Product == productValue
      );

      const totalSalesBox = salesForTarget.reduce(
        (sum, item) => sum + Number(item.carton || 0),
        0
      );

      const totalNetSales = salesForTarget.reduce(
        (sum, item) => sum + Number(item.ProductAmount || 0),
        0
      );

      const salesInUnits = totalSalesBox / boxInCarton;

      /* ================= ORDER ================= */
      const orderForTarget = (Order || []).filter(
        (item) =>
          clientIds.includes(item.Client) &&
          item.Product == productValue
      );

      const totalOrderBox = orderForTarget.reduce(
        (sum, item) => sum + Number(item.carton || 0),
        0
      );

      const totalOrderUnits = totalOrderBox / boxInCarton;

      /* ================= DC ================= */
      const dcForTarget = (DC || []).filter(
        (item) =>
          clientIds.includes(item.Client) &&
          item.Product == productValue
      );

      const totalDCBox = dcForTarget.reduce(
        (sum, item) => sum + Number(item.carton || 0),
        0
      );

      const totalDCUnits = totalDCBox / boxInCarton;

      /* ================= ACHIEVEMENTS ================= */
      const targetAchievement =
        targetCartons > 0
          ? ((salesInUnits / targetCartons) * 100).toFixed(2)
          : "0.00";

      const orderAchievement =
        targetCartons > 0
          ? ((totalOrderUnits / targetCartons) * 100).toFixed(2)
          : "0.00";

      const dcAchievement =
        targetCartons > 0
          ? ((totalDCUnits / targetCartons) * 100).toFixed(2)
          : "0.00";

      /* ================= PUSH ROW ================= */
      reportRows.push({
        OrderBooker: orderBookerLabel,
        ZSM: zsmName,
        Zone: zoneName,
        Region: regionName,
        SKUCode: productInfo.code,
        SKU: productInfo.label,

        Target: targetCartons.toFixed(2),

        SalesBox: salesInUnits.toFixed(2),
        OrderBox: totalOrderUnits.toFixed(2),
        DCBox: totalDCUnits.toFixed(2),

        RemainOrders: (totalOrderUnits - totalDCUnits).toFixed(2),

        NetSales: totalNetSales,

        SalesAchievement: `${targetAchievement}%`,
        OrderAchievement: `${orderAchievement}%`,
        DCAchievement: `${dcAchievement}%`,
      });
    });
  });

  /* ================= FINAL ROWS ================= */
  const finalRows = reportRows.map((item, idx) => ({
    id: idx + 1,
    ...item,
  }));

  console.log("✅ Final Report:", finalRows);

  setRows(finalRows);
}, [data, filterData, Targets, Order, DC]);
  // Filter and sort rows
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

  // Calculate totals
  const totals = useMemo(() => {
    return {
      totalTarget: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.Target || 0), 0),
      totalSales: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.SalesBox || 0), 0),
      totalOrder: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.OrderBox || 0), 0),
      totalDC: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.DCBox || 0), 0),
      totalAmount: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.NetSales || 0), 0),
    };
  }, [filteredAndSortedRows]);

  // Export to Excel
  const exportToExcel = async () => {
    const exportData = filteredAndSortedRows.map(row => ({
      '#': row.id,
      'Order Booker': row.OrderBooker,
      'ZSM': row.ZSM,
      'Zone': row.Zone,
      'Region': row.Region,
      'SKU Code': row.SKUCode,
      'SKU': row.SKU,
      'Target': Number(Number(row.Target || 0).toFixed(2)),
      'Sales': Number(Number(row.SalesBox || 0).toFixed(2)),
      'Order': Number(Number(row.OrderBox || 0).toFixed(2)),
      'DC': Number(Number(row.DCBox || 0).toFixed(2)),
      "RemainOrders" : Number(Number(row.DCBox - row.OrderBox).toFixed(2)),
      'Net Sales Amount (₨)': Number(Number(row.NetSales || 0).toFixed(2)),
      'Sales Achievement %': row.SalesAchievement,
      'Order Achievement %': row.OrderAchievement,
      'DC Achievement %': row.DCAchievement
    }));

    await exportProfessionalExcel({
      title: "Order Booker Achievement Report",
      fileName: "Order_Booker_Report",
      sheetName: "Order_Booker_Report",
      rows: exportData,
      meta: [
        `Period: ${startDate || "N/A"} to ${endDate || "N/A"}`,
      ],
    });
  };

  // Export to PDF
  const exportToPDF = () => {
    if (filteredAndSortedRows.length === 0) return;

    const doc = new jsPDF("landscape");
    
    doc.setFontSize(18);
    doc.text("Pearl Dynamic (pvt) ltd(Private) Limited", 14, 15);
    doc.setFontSize(14);
    doc.text("Order Booker Achievement Report (Order & DC Summary)", 14, 25);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
    doc.text(`Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}`, 14, 38);

    const tableColumn = [
      '#', 'Order Booker', 'ZSM', 'Zone', 'Region', 'SKU Code', 'SKU', 'Target',
      'Sales', 'Order', 'DC', 'Net Sales', 'Sale%', 'Order%', 'DC%'
    ];

    const tableRows = filteredAndSortedRows.map((row) => [
      row.id,
      row.OrderBooker,
      row.ZSM,
      row.Zone,
      row.Region,
      row.SKUCode,
      row.SKU,
      row.Target,
      row.SalesBox,
      row.OrderBox,
      row.DCBox,
      `₨${row.NetSales?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}`,
      row.SalesAchievement,
      row.OrderAchievement,
      row.DCAchievement
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    });

    doc.save(`Order_Booker_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Print report
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1400,height=800");
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Order Booker Achievement Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 30px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .summary { margin: 20px 0; padding: 10px; background: #f9f9f9; }
            .numeric { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Pearl Dynamic (pvt) ltd(Private) Limited</h2>
            <h3>Order Booker Achievement Report</h3>
            <p>Period: ${startDate} to ${endDate}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="summary">
            <strong>Summary:</strong><br/>
            Total Target: ${Number(Number(totals.totalTarget || 0).toFixed(2))} Units | 
            Total Sales: ${Number(Number(totals.totalSales || 0).toFixed(2))} Units | 
            Total Order: ${Number(Number(totals.totalOrder || 0).toFixed(2))} Units | 
            Total DC: ${Number(Number(totals.totalDC || 0).toFixed(2))} Units | 
            Net Sales: ₨${totals.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>#</th><th>Order Booker</th><th>ZSM</th><th>Zone</th><th>Region</th><th>SKU Code</th><th>SKU</th>
                <th>Target</th><th>Sales</th><th>Order</th><th>DC</th>
                <th>Net Sales</th><th>Sale%</th><th>Order%</th><th>DC%</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAndSortedRows.map(row => `
                <tr>
                  <td>${row.id}</td>
                  <td>${row.OrderBooker}</td>
                  <td>${row.ZSM}</td>
                  <td>${row.Zone}</td>
                  <td>${row.Region}</td>
                  <td>${row.SKUCode}</td>
                  <td>${row.SKU}</td>
                  <td class="numeric">${row.Target}</td>
                  <td class="numeric">${row.SalesBox}</td>
                  <td class="numeric">${row.OrderBox}</td>
                  <td class="numeric">${row.DCBox}</td>
                  <td class="numeric">${row.RemainOrders}</td>
                  <td class="numeric">₨${row.NetSales?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</td>
                  <td class="numeric">${row.SalesAchievement}</td>
                  <td class="numeric">${row.OrderAchievement}</td>
                  <td class="numeric">${row.DCAchievement}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            Developed by JS International | Contact: 0301-8251291
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="sales-report-container" ref={reportRef}>
      <ReportPopupHeader title="Order Booker Achievement" />

      <div className="watermark">
        <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png" alt="" />
      </div>

      <div className="report-header">
        <div>
          <h2>Pearl Dynamic (pvt) ltd(Private) Limited</h2>
          <p>Order Booker Achievement Report (With Order & DC)</p>
        </div>
        <div className="report-date-info">
          <p><strong>Period:</strong> {startDate} to {endDate}</p>
          <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
        </div>
      </div>

      <div className="controls-bar">
        <input
          type="text"
          placeholder="Search..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
        <div className="summary-box">
          <span>🎯 Target: {Number(Number(totals.totalTarget || 0).toFixed(2))}</span>
          <span>📦 Sales: {Number(Number(totals.totalSales || 0).toFixed(2))}</span>
          <span>📝 Order: {Number(Number(totals.totalOrder || 0).toFixed(2))}</span>
          <span>🚚 DC: {Number(Number(totals.totalDC || 0).toFixed(2))}</span>
          <span>💰 Amount: ₨{totals.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="table-wrapper">
        {isLoading ? (
          <div className="loader">Loading...</div>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('id')}>#</th>
                <th onClick={() => requestSort('OrderBooker')}>Order Booker</th>
                <th onClick={() => requestSort('ZSM')}>ZSM</th>
                <th onClick={() => requestSort('Zone')}>Zone</th>
                <th onClick={() => requestSort('Region')}>Region</th>
                <th onClick={() => requestSort('SKUCode')}>SKU Code</th>
                <th onClick={() => requestSort('SKU')}>SKU</th>
                <th onClick={() => requestSort('Target')}>Target</th>
                <th onClick={() => requestSort('SalesBox')}>Sales</th>
                <th onClick={() => requestSort('OrderBox')}>Order</th>
                <th onClick={() => requestSort('DCBox')}>DC</th>
                <th onClick={() => requestSort('RemainOrders')}>RemainOrders</th>
                <th onClick={() => requestSort('NetSales')}>Net Sales</th>
                <th onClick={() => requestSort('SalesAchievement')}>Sale%</th>
                <th onClick={() => requestSort('OrderAchievement')}>Order%</th>
                <th onClick={() => requestSort('DCAchievement')}>DC%</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.map(row => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.OrderBooker}</td>
                  <td>{row.ZSM}</td>
                  <td>{row.Zone}</td>
                  <td>{row.Region}</td>
                  <td>{row.SKUCode}</td>
                  <td>{row.SKU}</td>
                  <td className="numeric">{Number(Number(row.Target || 0).toFixed(2))}</td>
                  <td className="numeric">{Number(Number(row.SalesBox || 0).toFixed(2))}</td>
                  <td className="numeric">{Number(Number(row.OrderBox || 0).toFixed(2))}</td>
                  <td className="numeric">{Number(Number(row.DCBox || 0).toFixed(2))}</td>
                  <td className="numeric">{Number(Number(row.RemainOrders || 0).toFixed(2))}</td>
                  <td className="numeric">₨{row.NetSales?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</td>
                  <td className="numeric">{Number(Number(row.SalesAchievement || 0).toFixed(2))}</td>
                  <td className="numeric">{Number(Number(row.OrderAchievement || 0).toFixed(2))}</td>
                  <td className="numeric">{Number(Number(row.DCAchievement || 0).toFixed(2))}</td>
                </tr>
              ))}
              {filteredAndSortedRows.length === 0 && (
                <tr>
                  <td colSpan="15" style={{textAlign: 'center'}}>No data found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="action-buttons">
        <button onClick={exportToExcel} className="btn excel">📊 Export Excel</button>
        <button onClick={exportToPDF} className="btn pdf">📄 Export PDF</button>
        <button onClick={handlePrint} className="btn print">🖨️ Print</button>
      </div>

      <style jsx>{`
        .sales-report-container {
          padding: 20px;
          font-family: Arial, sans-serif;
          position: relative;
          background: white;
          max-width: 100%;
          overflow-x: auto;
        }
        
        .watermark {
          position: fixed;
          opacity: 0.05;
          pointer-events: none;
          z-index: 0;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
        }
        
        .watermark img {
          width: 300px;
        }
        
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #3498db;
        }
        
        .report-header h2 {
          margin: 0;
          color: #2c3e50;
        }
        
        .report-date-info {
          text-align: right;
          font-size: 12px;
          color: #666;
        }
        
        .controls-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 20px;
          flex-wrap: wrap;
        }
        
        .search-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          width: 250px;
        }
        
        .summary-box {
          display: flex;
          gap: 15px;
          background: #f8f9fa;
          padding: 8px 15px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }
        
        .summary-box span {
          color: #2c3e50;
        }
        
        .table-wrapper {
          overflow-x: auto;
          margin-bottom: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
        }
        
        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        
        .report-table th {
          background: #34495e;
          color: white;
          padding: 10px;
          text-align: left;
          cursor: pointer;
          white-space: nowrap;
        }
        
        .report-table th:hover {
          background: #2c3e50;
        }
        
        .report-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #ecf0f1;
        }
        
        .report-table tr:hover {
          background: #f8f9fa;
        }
        
        .numeric {
          text-align: right;
        }
        
        .action-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }
        
        .btn.excel {
          background: #217346;
          color: white;
        }
        
        .btn.pdf {
          background: #f40f02;
          color: white;
        }
        
        .btn.print {
          background: #3498db;
          color: white;
        }
        
        .btn:hover {
          opacity: 0.9;
        }
        
        .loader {
          text-align: center;
          padding: 50px;
          font-size: 18px;
          color: #3498db;
        }
        
        @media print {
          .controls-bar, .action-buttons, .watermark {
            display: none;
          }
          
          .report-table th {
            background: #ddd !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderBookerAchivmentPopup;