import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";
import { getDataFundtion } from '../../../Api/CRUDFunctions';

const SalesDumpDataPopup2 = ({ filterData = {} }) => {
  const { startDate, endDate } = filterData;
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);

  const [zsmData, setZsmData] = useState([]);
  const [zoneData, setZoneData] = useState([]);
  const [regionData, setRegionData] = useState([]);

  const getData = async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);
    try {
      const res = await getDataFundtion(
        `/SaleInvoice/SalesDumpData?startDate=${startDate}&endDate=${endDate}`
      );

      const zsmRes = await getDataFundtion("/Zsm");
      setZsmData(zsmRes.data || []);

      const zoneRes = await getDataFundtion("/Zone");
      setZoneData(zoneRes.data || []);

      const regionRes = await getDataFundtion("/Region");
      setRegionData(regionRes.data || []);

      if (res.data && res.data.length > 0) {
        setData(res.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const [data, setData] = useState([]);

  useEffect(() => {
    if (startDate && endDate) {
      getData();
    }
  }, [startDate, endDate]);

  const lookupMaps = useMemo(() => {
    const obToZsmMap = new Map();
    (filterData.OrderBookerRaw || []).forEach(ob => {
      if (ob._id && ob.ZSM) obToZsmMap.set(ob._id, ob.ZSM);
    });

    const zsmMap = new Map();
    zsmData.forEach(z => {
      if (z._id) zsmMap.set(z._id, z);
    });

    const zoneMap = new Map();
    zoneData.forEach(z => {
      if (z._id) zoneMap.set(z._id, z);
    });

    const regionMap = new Map();
    regionData.forEach(r => {
      if (r._id) regionMap.set(r._id, r);
    });

    const skuMap = new Map();
    (filterData.Product || []).forEach(p => {
      if (p.value) skuMap.set(p.value, p);
    });

    const customerMap = new Map();
    (filterData.Customer || []).forEach(c => {
      if (c.value) customerMap.set(c.value, c);
    });

    const orderBookerMap = new Map();
    (filterData.OrderBooker || []).forEach(ob => {
      if (ob.value) orderBookerMap.set(ob.value, ob);
    });

    const cityMap = new Map();
    (filterData.City || []).forEach(c => {
      if (c.value) cityMap.set(c.value, c);
    });

    return { obToZsmMap, zsmMap, zoneMap, regionMap, skuMap, customerMap, orderBookerMap, cityMap };
  }, [filterData.OrderBookerRaw, filterData.Product, filterData.Customer, filterData.OrderBooker, filterData.City, zsmData, zoneData, regionData]);

  useEffect(() => {
    if (!data || data.length === 0) {
      setRows([]);
      return;
    }

    const processed = data.map((item, index) => {
      const product = lookupMaps.skuMap.get(item.Product);
      const customer = lookupMaps.customerMap.get(item.Client);
      const orderBookerId = customer?.OrderBooker;
      const orderBookerObj = orderBookerId ? lookupMaps.orderBookerMap.get(orderBookerId) : null;
      const cityObj = customer?.City ? lookupMaps.cityMap.get(customer.City) : null;

      const zsmId = orderBookerId ? lookupMaps.obToZsmMap.get(orderBookerId) : null;
      const zsmObj = zsmId ? lookupMaps.zsmMap.get(zsmId) : null;
      const zoneId = zsmObj?.Zone;
      const zoneObj = zoneId ? lookupMaps.zoneMap.get(zoneId) : null;
      const regionId = zoneObj?.Region;
      const regionObj = regionId ? lookupMaps.regionMap.get(regionId) : null;

      return {
        id: index + 1,
        ProductCode: product?.code || '',
        ProductName: product?.label || product?.ProductName || '',
        Customer: customer?.label || '',
        OrderBooker: orderBookerObj?.label || '',
        City: cityObj?.label || '',
        ZSM: zsmObj?.ZsmName || '-',
        Zone: zoneObj?.ZoneName || '-',
        Region: regionObj?.RegionName || '-',
        DCNumber: item.DCNumber || '',
        SalesInvoice: item.SalesInvoice || '',
        SalesInvoiceDate: item.SalesInvoiceDate || '',
        totalBOX: Number(item.carton || 0),
        Box: item.Box || 0,
        totalBox: item.totalBox || 0,
        KG: Number(item.KG || 0),
        GRAM: product?.GRAM || 0,
        GrossAmount: Number(item.GrossAmount || 0),
        Gst: Number(item.Gst || 0),
        AdvanceTax: Number(item.Advancetax || 0),
        diBspass: Number(item.diBspass || 0),
        RToffer: Number(item.RToffer || 0),
        WToffer: Number(item.WToffer || 0),
        RpDrive: Number(item.RpDrive || 0),
        WholesaleDeal: Number(item.WHOLESALEDEAL || 0),
        RTWholeSale: Number(item.RTWholeSale || 0),
        SubDisTPromotion: Number(item.SubDisTPromotion || 0),
        TradeOffer: Number(item.TradeOffer || 0),
        HotzoneDrive: Number(item.HOTZONEDRIVE || 0),
        Scheme: Number(item.SpecialTO || 0),
        SpecialDiscount: Number(item.SPECIALDISCOUNT || 0),
        totalDiscount: (Number(item.diBspass || 0) + Number(item.RToffer || 0) + Number(item.WToffer || 0) + Number(item.RpDrive || 0) + Number(item.WHOLESALEDEAL || 0) + Number(item.RTWholeSale || 0) + Number(item.SubDisTPromotion || 0) + Number(item.TradeOffer || 0) + Number(item.HOTZONEDRIVE || 0) + Number(item.SpecialTO || 0) + Number(item.SPECIALDISCOUNT || 0)),
        totalNetAmount: (Number(item.GrossAmount || 0) + Number(item.Gst || 0) + Number(item.Advancetax || 0)) - (Number(item.diBspass || 0) + Number(item.RToffer || 0) + Number(item.WToffer || 0) + Number(item.RpDrive || 0) + Number(item.WHOLESALEDEAL || 0) + Number(item.RTWholeSale || 0) + Number(item.SubDisTPromotion || 0) + Number(item.TradeOffer || 0) + Number(item.HOTZONEDRIVE || 0) + Number(item.SpecialTO || 0) + Number(item.SPECIALDISCOUNT || 0)),
      };
    });

    setRows(processed);
  }, [data, lookupMaps]);

  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = rows.filter(row =>
        Object.values(row).some(value =>
          value && value.toString().toLowerCase().includes(lowerFilter)
        )
      );
    }
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
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

  const totals = useMemo(() => {
    return {
      totalBOX: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.totalBOX || 0), 0),
      totalGrossAmount: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.GrossAmount || 0), 0),
      totalGst: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.Gst || 0), 0),
      totalAdvanceTax: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.AdvanceTax || 0), 0),
      totalDiscount: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.totalDiscount || 0), 0),
      totalNetAmount: filteredAndSortedRows.reduce((sum, row) => sum + Number(row.totalNetAmount || 0), 0),
    };
  }, [filteredAndSortedRows]);

  const exportToExcel = useCallback(async () => {
    const exportData = filteredAndSortedRows.map(row => ({
      '#': row.id,
      'Product Code': row.ProductCode,
      'Product Name': row.ProductName,
      'Customer': row.Customer,
      'Order Booker': row.OrderBooker,
      'City': row.City,
      'ZSM': row.ZSM,
      'Zone': row.Zone,
      'Region': row.Region,
      'DC Number': row.DCNumber,
      'Sales Invoice': row.SalesInvoice,
      'Invoice Date': row.SalesInvoiceDate,
      'BOX': Number(Number(row.totalBOX || 0).toFixed(2)),
      'KG': Number(Number(row.KG || 0).toFixed(2)),
      'Gross Amount': Number(Number(row.GrossAmount || 0).toFixed(2)),
      'GST': Number(Number(row.Gst || 0).toFixed(2)),
      'Advance Tax': Number(Number(row.AdvanceTax || 0).toFixed(2)),
      'diBspass': Number(Number(row.diBspass || 0).toFixed(2)),
      'RT Offer': Number(Number(row.RToffer || 0).toFixed(2)),
      'WT Offer': Number(Number(row.WToffer || 0).toFixed(2)),
      'Rp Drive': Number(Number(row.RpDrive || 0).toFixed(2)),
      'Wholesale Deal': Number(Number(row.WholesaleDeal || 0).toFixed(2)),
      'RT Wholesale': Number(Number(row.RTWholeSale || 0).toFixed(2)),
      'Sub Dis T Promotion': Number(Number(row.SubDisTPromotion || 0).toFixed(2)),
      'Trade Offer': Number(Number(row.TradeOffer || 0).toFixed(2)),
      'Hotzone Drive': Number(Number(row.HotzoneDrive || 0).toFixed(2)),
      'Scheme': Number(Number(row.Scheme || 0).toFixed(2)),
      'Special Discount': Number(Number(row.SpecialDiscount || 0).toFixed(2)),
      'Total Discount': Number(Number(row.totalDiscount || 0).toFixed(2)),
      'Net Amount': Number(Number(row.totalNetAmount || 0).toFixed(2)),
    }));

    await exportProfessionalExcel({
      title: "Sales Dump Data",
      fileName: "Sales_Dump_Data",
      sheetName: "Sales Dump Data",
      rows: exportData,
      meta: [
        `Period: ${startDate || "N/A"} to ${endDate || "N/A"}`,
      ],
    });
  }, [filteredAndSortedRows, startDate, endDate]);

  const exportToPDF = useCallback(() => {
    if (filteredAndSortedRows.length === 0) return;

    const doc = new jsPDF("landscape");

    doc.setFontSize(18);
    doc.text("Pearl Dynamic (pvt) ltd(Private) Limited", 14, 15);
    doc.setFontSize(14);
    doc.text("Sales Dump Data Report", 14, 25);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
    doc.text(`Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}`, 14, 38);

    const tableColumn = [
      '#', 'Order Booker', 'ZSM', 'Zone', 'Region', 'Customer', 'Product', 'BOX', 'Gross Amount', 'GST', 'Discount', 'Net Amount'
    ];

    const tableRows = filteredAndSortedRows.map((row) => [
      row.id,
      row.OrderBooker,
      row.ZSM,
      row.Zone,
      row.Region,
      row.Customer,
      row.ProductName,
      Number(Number(row.totalBOX || 0).toFixed(2)),
      `₨${row.GrossAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}`,
      `₨${row.Gst?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}`,
      `₨${row.totalDiscount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}`,
      `₨${row.totalNetAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}`,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    });

    doc.save(`Sales_Dump_Data_${new Date().toISOString().split('T')[0]}.pdf`);
  }, [filteredAndSortedRows, startDate, endDate]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank", "width=1400,height=800");

    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Dump Data Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 11px; }
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
            <h3>Sales Dump Data Report</h3>
            <p>Period: ${startDate} to ${endDate}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div class="summary">
            <strong>Summary:</strong><br/>
            Total BOX: ${Number(Number(totals.totalBOX || 0).toFixed(2))} |
            Total Gross: ₨${totals.totalGrossAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |
            Total GST: ₨${totals.totalGst.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |
            Total Discount: ₨${totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |
            Net Amount: ₨${totals.totalNetAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th><th>Order Booker</th><th>ZSM</th><th>Zone</th><th>Region</th><th>Customer</th><th>City</th>
                <th>Product</th><th>BOX</th><th>Gross Amount</th><th>GST</th><th>Advance Tax</th>
                <th>Discount</th><th>Net Amount</th>
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
                  <td>${row.Customer}</td>
                  <td>${row.City}</td>
                  <td>${row.ProductName}</td>
                  <td class="numeric">${Number(Number(row.totalBOX || 0).toFixed(2))}</td>
                  <td class="numeric">₨${row.GrossAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</td>
                  <td class="numeric">₨${row.Gst?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</td>
                  <td class="numeric">₨${row.AdvanceTax?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</td>
                  <td class="numeric">₨${row.totalDiscount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</td>
                  <td class="numeric">₨${row.totalNetAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</td>
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
  }, [filteredAndSortedRows, startDate, endDate, totals]);

  return (
    <div className="sales-report-container" ref={reportRef}>
      <div className="report-header">
        <div>
          <h2>Pearl Dynamic (pvt) ltd(Private) Limited</h2>
          <p>Sales Dump Data Report</p>
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
          <span>BOX: {Number(Number(totals.totalBOX || 0).toFixed(2))}</span>
          <span>Gross: ₨{totals.totalGrossAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span>GST: ₨{totals.totalGst.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span>Discount: ₨{totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span>Net: ₨{totals.totalNetAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                <th onClick={() => requestSort('Customer')}>Customer</th>
                <th onClick={() => requestSort('City')}>City</th>
                <th onClick={() => requestSort('ProductCode')}>Product Code</th>
                <th onClick={() => requestSort('ProductName')}>Product</th>
                <th onClick={() => requestSort('DCNumber')}>DC Number</th>
                <th onClick={() => requestSort('SalesInvoice')}>Sales Invoice</th>
                <th onClick={() => requestSort('totalBOX')}>BOX</th>
                <th onClick={() => requestSort('GrossAmount')}>Gross Amount</th>
                <th onClick={() => requestSort('Gst')}>GST</th>
                <th onClick={() => requestSort('AdvanceTax')}>Advance Tax</th>
                <th onClick={() => requestSort('diBspass')}>diBspass</th>
                <th onClick={() => requestSort('RToffer')}>RT Offer</th>
                <th onClick={() => requestSort('WToffer')}>WT Offer</th>
                <th onClick={() => requestSort('RpDrive')}>Rp Drive</th>
                <th onClick={() => requestSort('WholesaleDeal')}>Wholesale Deal</th>
                <th onClick={() => requestSort('RTWholeSale')}>RT Wholesale</th>
                <th onClick={() => requestSort('SubDisTPromotion')}>Sub Dis T Promo</th>
                <th onClick={() => requestSort('TradeOffer')}>Trade Offer</th>
                <th onClick={() => requestSort('HotzoneDrive')}>Hotzone Drive</th>
                <th onClick={() => requestSort('Scheme')}>Scheme</th>
                <th onClick={() => requestSort('SpecialDiscount')}>Special Discount</th>
                <th onClick={() => requestSort('totalDiscount')}>Total Discount</th>
                <th onClick={() => requestSort('totalNetAmount')}>Net Amount</th>
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
                  <td>{row.Customer}</td>
                  <td>{row.City}</td>
                  <td>{row.ProductCode}</td>
                  <td>{row.ProductName}</td>
                  <td>{row.DCNumber}</td>
                  <td>{row.SalesInvoice}</td>
                  <td className="numeric">{Number(Number(row.totalBOX || 0).toFixed(2))}</td>
                  <td className="numeric">{row.GrossAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.Gst.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.AdvanceTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.diBspass.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.RToffer.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.WToffer.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.RpDrive.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.WholesaleDeal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.RTWholeSale.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.SubDisTPromotion.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.TradeOffer.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.HotzoneDrive.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.Scheme.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.SpecialDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="numeric">{row.totalNetAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {filteredAndSortedRows.length === 0 && (
                <tr>
                  <td colSpan="28" style={{ textAlign: 'center' }}>No data found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="action-buttons">
        <button onClick={exportToExcel} className="btn excel">Export Excel</button>
        <button onClick={exportToPDF} className="btn pdf">Export PDF</button>
        <button onClick={handlePrint} className="btn print">Print</button>
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
          font-size: 12px;
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
          .controls-bar, .action-buttons {
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

export default SalesDumpDataPopup2;
