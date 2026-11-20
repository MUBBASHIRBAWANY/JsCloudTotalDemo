import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { exportProfessionalExcel } from "../../../../utils/exportProfessionalExcel";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getDataFundtion } from "../../../../Api/CRUDFunctions";
import { fmt2, round2n } from "../../../../utils/round2";

const ProductWiseSalesSummary = ({ data = {} }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { startDate, endDate, store } = data;
  const [productWiseData, setProductWiseData] = useState([]);
  const [filter, setFilter] = useState("");
  const reportRef = useRef(null);
  
  // Cache lookups for performance
  const lookupsRef = useRef({});

  // Initialize lookups
  useEffect(() => {
    if (data && Object.keys(data).length) {
      lookupsRef.current = {
        skuOptionsMap: new Map(data.SkuOptions?.map(p => [p._id, p]) || []),
        brandMap: new Map(data.Brand?.map(b => [b.mastercode, b]) || []),
        categoryMap: new Map(data.Category?.map(c => [c.mastercode, c]) || []),
        masterSkuMap: new Map(data.MastarSku?.map(m => [m.mastercode, m]) || []),
        vendorMap: new Map(data.Vendor?.map(v => [v.mastercode, v]) || []),
      };
    }
  }, [data]);

  // Fetch and process product-wise data
  const getProductWiseData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getDataFundtion(
        `/SaleInvoice/SalesDumpData?startDate=${startDate}&endDate=${endDate}&Store=${store}`
      );
      
      const {
        skuOptionsMap,
        brandMap,
        categoryMap,
        masterSkuMap,
        vendorMap,
      } = lookupsRef.current;

      // Process data and group by product
      const productMap = new Map();

      res.data.forEach((item) => {
        const product = skuOptionsMap.get(item.Product);
        if (!product) return;
        
        const mastercode = product.mastercode || '';
        const brandCode = mastercode.slice(0, 6);
        const categoryCode = mastercode.slice(0, 4);
        const masterSkuCode = mastercode.slice(0, 9);
        const vendorCode = mastercode.slice(0, 2);
        
        const Brand = brandMap.get(brandCode);
        const Category = categoryMap.get(categoryCode);
        const MasterSku = masterSkuMap.get(masterSkuCode);
        const Vendor = vendorMap.get(vendorCode);
        
        const productKey = product._id;
        
        // Calculate product metrics
        const carton = item.carton || 0;
        const pcsinBox = Number(product?.PcsinBox || 0);
        const gram = product?.GRAM || 0;
        const kg = ((pcsinBox * carton) * gram) / 1000;
        
        // Calculate individual discounts
        const diBspass = item.diBspass || 0;
        const rtoffer = item.RToffer || 0;
        const wtoffer = item.WToffer || 0;
        const rpDrive = item.RpDrive || 0;
        const wholesaleDeal = item.WHOLESALEDEAL || 0;
        const rtwholesale = item.RTWholeSale || 0;
        const subDisTPromotion = item.SubDisTPromotion || 0;
        const tradeOffer = item.TradeOffer || 0;
        const hotzoneDrive = item.HOTZONEDRIVE || 0;
        const scheme = item.SpecialTO || 0;
        const specialDiscount = item.SPECIALDISCOUNT || 0;
        
        const totalDiscount = diBspass + rtoffer + wtoffer + rpDrive + wholesaleDeal + 
                            rtwholesale + subDisTPromotion + tradeOffer + hotzoneDrive + 
                            scheme + specialDiscount;
        
        if (!productMap.has(productKey)) {
          // Initialize product entry with all discount fields
          productMap.set(productKey, {
            id: productMap.size + 1,
            productCode: product?.code || '',
            productName: product?.ProductName || '',
            productSalesFlowRef: product?.salesFlowRef || '',
            vendorName: Vendor?.label2 || '',
            vendorCode: Vendor?.mastercode || '',
            brandCode: Brand?.mastercode || '',
            brandName: Brand?.label2 || '',
            categoryCode: Category?.mastercode || '',
            categoryName: Category?.label2 || '',
            masterSkuCode: MasterSku?.mastercode || '',
            masterSkuName: MasterSku?.label2 || '',
            gram: gram,
            totalBox: 0,
            totalKg: 0,
            totalGrossAmount: 0,
            totalGst: 0,
            totalAdvanceTax: 0,
            // Individual Discounts
            totalDiBspass: 0,
            totalRtoffer: 0,
            totalWtoffer: 0,
            totalRpDrive: 0,
            totalWholesaleDeal: 0,
            totalRtwholesale: 0,
            totalSubDisTPromotion: 0,
            totalTradeOffer: 0,
            totalHotzoneDrive: 0,
            totalScheme: 0,
            totalSpecialDiscount: 0,
            // Total Discount
            totalDiscount: 0,
            totalNetAmount: 0,
          });
        }
        
        const productEntry = productMap.get(productKey);
        productEntry.totalBox += carton;
        productEntry.totalKg += kg;
        productEntry.totalGrossAmount += item.GrossAmount || 0;
        productEntry.totalGst += item.Gst || 0;
        productEntry.totalAdvanceTax += item.Advancetax || 0;
        // Accumulate individual discounts
        productEntry.totalDiBspass += diBspass;
        productEntry.totalRtoffer += rtoffer;
        productEntry.totalWtoffer += wtoffer;
        productEntry.totalRpDrive += rpDrive;
        productEntry.totalWholesaleDeal += wholesaleDeal;
        productEntry.totalRtwholesale += rtwholesale;
        productEntry.totalSubDisTPromotion += subDisTPromotion;
        productEntry.totalTradeOffer += tradeOffer;
        productEntry.totalHotzoneDrive += hotzoneDrive;
        productEntry.totalScheme += scheme;
        productEntry.totalSpecialDiscount += specialDiscount;
        productEntry.totalDiscount += totalDiscount;
        productEntry.totalNetAmount += (item.GrossAmount || 0) + (item.Gst || 0) + (item.Advancetax || 0) - totalDiscount;
      });

      setProductWiseData(Array.from(productMap.values()));
    } catch (error) {
      console.error("Error fetching product-wise sales summary:", error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, store]);

  useEffect(() => {
    if (lookupsRef.current.skuOptionsMap?.size) {
      getProductWiseData();
    }
  }, [getProductWiseData, data.SkuOptions]);

  // Calculate totals including all discounts
  const totals = useMemo(() => {
    return productWiseData.reduce((acc, product) => ({
      totalProducts: productWiseData.length,
      totalBox: acc.totalBox + product.totalBox,
      totalNetAmount: acc.totalNetAmount + product.totalNetAmount,
      totalGrossAmount: acc.totalGrossAmount + product.totalGrossAmount,
      totalGst: acc.totalGst + product.totalGst,
      totalAdvanceTax: acc.totalAdvanceTax + product.totalAdvanceTax,
      // Individual Discount Totals
      totalDiBspass: acc.totalDiBspass + product.totalDiBspass,
      totalRtoffer: acc.totalRtoffer + product.totalRtoffer,
      totalWtoffer: acc.totalWtoffer + product.totalWtoffer,
      totalRpDrive: acc.totalRpDrive + product.totalRpDrive,
      totalWholesaleDeal: acc.totalWholesaleDeal + product.totalWholesaleDeal,
      totalRtwholesale: acc.totalRtwholesale + product.totalRtwholesale,
      totalSubDisTPromotion: acc.totalSubDisTPromotion + product.totalSubDisTPromotion,
      totalTradeOffer: acc.totalTradeOffer + product.totalTradeOffer,
      totalHotzoneDrive: acc.totalHotzoneDrive + product.totalHotzoneDrive,
      totalScheme: acc.totalScheme + product.totalScheme,
      totalSpecialDiscount: acc.totalSpecialDiscount + product.totalSpecialDiscount,
      // Total Discount
      totalDiscount: acc.totalDiscount + product.totalDiscount,
    }), {
      totalProducts: 0,
      totalBox: 0,
      totalNetAmount: 0,
      totalGrossAmount: 0,
      totalGst: 0,
      totalAdvanceTax: 0,
      totalDiBspass: 0,
      totalRtoffer: 0,
      totalWtoffer: 0,
      totalRpDrive: 0,
      totalWholesaleDeal: 0,
      totalRtwholesale: 0,
      totalSubDisTPromotion: 0,
      totalTradeOffer: 0,
      totalHotzoneDrive: 0,
      totalScheme: 0,
      totalSpecialDiscount: 0,
      totalDiscount: 0,
    });
  }, [productWiseData]);

  // Filter products
  const filteredData = useMemo(() => {
    if (!filter) return productWiseData;
    const lowerFilter = filter.toLowerCase();
    return productWiseData.filter(product => 
      product.productName?.toLowerCase().includes(lowerFilter) ||
      product.productCode?.toLowerCase().includes(lowerFilter) ||
      product.brandName?.toLowerCase().includes(lowerFilter) ||
      product.categoryName?.toLowerCase().includes(lowerFilter)
    );
  }, [productWiseData, filter]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(",", "");
  }, []);

  // Export to Excel with all discount columns
  const exportToExcel = useCallback(async () => {
    const exportData = filteredData.map(product => ({
      "S.No": product.id,
      "Product Code": product.productCode,
      "Product Name": product.productName,
      "Brand": product.brandName,
      "Category": product.categoryName,
      "Vendor": product.vendorName,
      "GRAM": product.gram,
      "Total Box": round2n(product.totalBox),
      "Total KG": round2n(product.totalKg),
      "Gross Amount": round2n(product.totalGrossAmount),
      "GST": round2n(product.totalGst),
      "Advance Tax": round2n(product.totalAdvanceTax),
      // Individual Discounts
      "diBspass": round2n(product.totalDiBspass),
      "RT Offer": round2n(product.totalRtoffer),
      "WT Offer": round2n(product.totalWtoffer),
      "Rp Drive": round2n(product.totalRpDrive),
      "Wholesale Deal": round2n(product.totalWholesaleDeal),
      "RT Wholesale": round2n(product.totalRtwholesale),
      "Sub Dis T Promotion": round2n(product.totalSubDisTPromotion),
      "Trade Offer": round2n(product.totalTradeOffer),
      "Hotzone Drive": round2n(product.totalHotzoneDrive),
      "Scheme": round2n(product.totalScheme),
      "Special Discount": round2n(product.totalSpecialDiscount),
      // Total Discount
      "Total Discount": round2n(product.totalDiscount),
      "Net Amount": round2n(product.totalNetAmount)
    }));

    const department = data.store?.length > 0
      ? data.storeforDrp
        ?.filter(item => data.store.includes(item._id))
        .map(item => item.StoreName)
        .join(", ") || "All"
      : "All";

    await exportProfessionalExcel({
      title: "Product Wise Sales Summary",
      fileName: "Product_Wise_Sales_Summary",
      sheetName: "Product Wise Summary",
      rows: exportData,
      meta: [
        `Period: ${startDate || ""} to ${endDate || ""}`,
        `Department: ${department}`,
      ],
    });
  }, [filteredData, startDate, endDate, data.store, data.storeforDrp]);

  // Export to PDF with all discount columns
  const exportToPDF = useCallback(() => {
    if (!filteredData.length) return;
    
    const doc = new jsPDF("landscape");
    
    doc.setFontSize(16);
    doc.text("Product Wise Sales Summary Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 22);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    const headers = [
      "#", "Product Code", "Product Name", "Brand", "Category",
      "Box", "KG", "Gross", "GST", "Adv Tax",
      "diBspass", "RT Offer", "WT Offer", "Rp Drive", "Whl Deal",
      "RT Whl", "Sub Dis", "Trade Offer", "Hotzone", "Scheme",
      "Sp Disc", "Total Disc", "Net Amt"
    ];

    const tableData = filteredData.map(product => [
      product.id,
      product.productCode,
      product.productName,
      product.brandName,
      product.categoryName,
      product.totalBox,
      product.totalKg.toFixed(2),
      { content: fmt2(product.totalGrossAmount), styles: { halign: 'right' } },
      { content: fmt2(product.totalGst), styles: { halign: 'right' } },
      { content: fmt2(product.totalAdvanceTax), styles: { halign: 'right' } },
      { content: fmt2(product.totalDiBspass), styles: { halign: 'right' } },
      { content: fmt2(product.totalRtoffer), styles: { halign: 'right' } },
      { content: fmt2(product.totalWtoffer), styles: { halign: 'right' } },
      { content: fmt2(product.totalRpDrive), styles: { halign: 'right' } },
      { content: fmt2(product.totalWholesaleDeal), styles: { halign: 'right' } },
      { content: fmt2(product.totalRtwholesale), styles: { halign: 'right' } },
      { content: fmt2(product.totalSubDisTPromotion), styles: { halign: 'right' } },
      { content: fmt2(product.totalTradeOffer), styles: { halign: 'right' } },
      { content: fmt2(product.totalHotzoneDrive), styles: { halign: 'right' } },
      { content: fmt2(product.totalScheme), styles: { halign: 'right' } },
      { content: fmt2(product.totalSpecialDiscount), styles: { halign: 'right' } },
      { content: fmt2(product.totalDiscount), styles: { halign: 'right' } },
      { content: fmt2(product.totalNetAmount), styles: { halign: 'right' } }
    ]);

    // Add total row
    tableData.push([
      { content: "TOTAL", colSpan: 6, styles: { fontStyle: 'bold', halign: 'center' } },
      "",
      { content: fmt2(totals.totalGrossAmount), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalGst), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalAdvanceTax), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalDiBspass), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalRtoffer), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalWtoffer), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalRpDrive), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalWholesaleDeal), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalRtwholesale), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalSubDisTPromotion), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalTradeOffer), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalHotzoneDrive), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalScheme), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalSpecialDiscount), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalDiscount), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt2(totals.totalNetAmount), styles: { fontStyle: 'bold', halign: 'right', fillColor: [22, 160, 133] } }
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 35,
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 35 }
    });

    doc.save("Product_Wise_Sales_Summary.pdf");
  }, [filteredData, totals, formatDate, startDate, endDate]);

  return (
    <div className="product-sales-container" ref={reportRef}>
      <div className="report-header">
        <div>
          <h2>📊 Product Wise Sales Summary</h2>
          <p>Period: {formatDate(startDate)} to {formatDate(endDate)}</p>
        </div>
        <div>
          <p>Generated: {new Date().toLocaleString()}</p>
          <p>Total Products: {totals.totalProducts}</p>
        </div>
      </div>

      {/* Search Box */}
      <div className="search-box">
        <input
          type="text"
          placeholder="🔍 Search by Product Name, Code, Brand or Category..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-card">
          <label>📦 Total Products</label>
          <span>{totals.totalProducts}</span>
        </div>
        <div className="stat-card">
          <label>📦 Total Boxes</label>
          <span>{fmt2(totals.totalBox)}</span>
        </div>
        <div className="stat-card">
          <label>💰 Gross Amount</label>
          <span>{fmt2(totals.totalGrossAmount)}</span>
        </div>
        <div className="stat-card">
          <label>🎯 Total Discount</label>
          <span>{fmt2(totals.totalDiscount)}</span>
        </div>
        <div className="stat-card">
          <label>✅ Net Amount</label>
          <span>{fmt2(totals.totalNetAmount)}</span>
        </div>
      </div>

      {/* Discount Breakup Summary */}
      <div className="discount-summary">
        <h3>Discount Breakup Summary</h3>
        <div className="discount-grid">
          <div className="discount-item">diBspass: {fmt2(totals.totalDiBspass)}</div>
          <div className="discount-item">RT Offer: {fmt2(totals.totalRtoffer)}</div>
          <div className="discount-item">WT Offer: {fmt2(totals.totalWtoffer)}</div>
          <div className="discount-item">Rp Drive: {fmt2(totals.totalRpDrive)}</div>
          <div className="discount-item">Wholesale Deal: {fmt2(totals.totalWholesaleDeal)}</div>
          <div className="discount-item">RT Wholesale: {fmt2(totals.totalRtwholesale)}</div>
          <div className="discount-item">Sub Dis Promotion: {fmt2(totals.totalSubDisTPromotion)}</div>
          <div className="discount-item">Trade Offer: {fmt2(totals.totalTradeOffer)}</div>
          <div className="discount-item">Hotzone Drive: {fmt2(totals.totalHotzoneDrive)}</div>
          <div className="discount-item">Scheme: {fmt2(totals.totalScheme)}</div>
          <div className="discount-item">Special Discount: {fmt2(totals.totalSpecialDiscount)}</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-wrapper">
        {isLoading ? (
          <div className="loader">Loading...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Box</th>
                <th>KG</th>
                <th>Gross</th>
                <th>GST</th>
                <th>Adv Tax</th>
                <th colSpan="11" style={{textAlign: 'center'}}>💰 Discount Breakup 💰</th>
                <th>Net</th>
              </tr>
              <tr>
                <th></th><th></th><th></th><th></th><th></th><th></th><th></th>
                <th></th><th></th><th></th>
                <th>diBspass</th><th>RT Offer</th><th>WT Offer</th><th>Rp Drive</th>
                <th>Whl Deal</th><th>RT Whl</th><th>Sub Dis</th><th>Trade Offer</th>
                <th>Hotzone</th><th>Scheme</th><th>Sp Disc</th><th>Total Disc</th><th>Net Amt</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((product) => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>{product.productCode}</td>
                    <td style={{minWidth: '150px'}}>{product.productName}</td>
                    <td>{product.brandName}</td>
                    <td>{product.categoryName}</td>
                    <td className="numeric">{fmt2(product.totalBox)}</td>
                    <td className="numeric">{fmt2(product.totalKg)}</td>
                    <td className="numeric">{fmt2(product.totalGrossAmount)}</td>
                    <td className="numeric">{fmt2(product.totalGst)}</td>
                    <td className="numeric">{fmt2(product.totalAdvanceTax)}</td>
                    {/* Individual Discounts */}
                    <td className="numeric">{fmt2(product.totalDiBspass)}</td>
                    <td className="numeric">{fmt2(product.totalRtoffer)}</td>
                    <td className="numeric">{fmt2(product.totalWtoffer)}</td>
                    <td className="numeric">{fmt2(product.totalRpDrive)}</td>
                    <td className="numeric">{fmt2(product.totalWholesaleDeal)}</td>
                    <td className="numeric">{fmt2(product.totalRtwholesale)}</td>
                    <td className="numeric">{fmt2(product.totalSubDisTPromotion)}</td>
                    <td className="numeric">{fmt2(product.totalTradeOffer)}</td>
                    <td className="numeric">{fmt2(product.totalHotzoneDrive)}</td>
                    <td className="numeric">{fmt2(product.totalScheme)}</td>
                    <td className="numeric">{fmt2(product.totalSpecialDiscount)}</td>
                    {/* Total Discount */}
                    <td className="numeric discount-total">{fmt2(product.totalDiscount)}</td>
                    <td className="numeric net-amount">{fmt2(product.totalNetAmount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="23" className="no-data">No products found</td>
                </tr>
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot>
                <tr className="total-row">
                  <td colSpan="6" className="total-label">Grand Total</td>
                  <td className="numeric"></td>
                  <td className="numeric">{fmt2(totals.totalGrossAmount)}</td>
                  <td className="numeric">{fmt2(totals.totalGst)}</td>
                  <td className="numeric">{fmt2(totals.totalAdvanceTax)}</td>
                  <td className="numeric">{fmt2(totals.totalDiBspass)}</td>
                  <td className="numeric">{fmt2(totals.totalRtoffer)}</td>
                  <td className="numeric">{fmt2(totals.totalWtoffer)}</td>
                  <td className="numeric">{fmt2(totals.totalRpDrive)}</td>
                  <td className="numeric">{fmt2(totals.totalWholesaleDeal)}</td>
                  <td className="numeric">{fmt2(totals.totalRtwholesale)}</td>
                  <td className="numeric">{fmt2(totals.totalSubDisTPromotion)}</td>
                  <td className="numeric">{fmt2(totals.totalTradeOffer)}</td>
                  <td className="numeric">{fmt2(totals.totalHotzoneDrive)}</td>
                  <td className="numeric">{fmt2(totals.totalScheme)}</td>
                  <td className="numeric">{fmt2(totals.totalSpecialDiscount)}</td>
                  <td className="numeric discount-total">{fmt2(totals.totalDiscount)}</td>
                  <td className="numeric net-amount">{fmt2(totals.totalNetAmount)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* Export Buttons */}
      <div className="export-buttons">
        <button className="btn-excel" onClick={exportToExcel}>📊 Export to Excel</button>
        <button className="btn-pdf" onClick={exportToPDF}>📄 Export to PDF</button>
      </div>

      <style jsx>{`
        .product-sales-container {
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .report-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f0f0f0;
        }
        
        .report-header h2 {
          margin: 0 0 5px 0;
          color: #2c3e50;
        }
        
        .report-header p {
          margin: 0;
          color: #7f8c8d;
          font-size: 12px;
        }
        
        .search-box {
          margin-bottom: 20px;
        }
        
        .search-box input {
          width: 350px;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }
        
        .stat-card label {
          display: block;
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 5px;
        }
        
        .stat-card span {
          font-size: 20px;
          font-weight: bold;
        }
        
        .discount-summary {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .discount-summary h3 {
          margin: 0 0 10px 0;
          color: #2c3e50;
          font-size: 14px;
        }
        
        .discount-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
        }
        
        .discount-item {
          background: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          border-left: 3px solid #e74c3c;
        }
        
        .table-wrapper {
          overflow-x: auto;
          margin-bottom: 20px;
          max-height: 500px;
          overflow-y: auto;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          min-width: 2200px;
        }
        
        .data-table th,
        .data-table td {
          padding: 8px 6px;
          text-align: left;
          border: 1px solid #e0e0e0;
        }
        
        .data-table th {
          background: #34495e;
          color: white;
          font-weight: 600;
          position: sticky;
          top: 0;
        }
        
        .data-table tbody tr:hover {
          background: #f8f9fa;
        }
        
        .numeric {
          text-align: right;
        }
        
        .discount-total {
          background: #fff3cd;
          font-weight: bold;
        }
        
        .net-amount {
          background: #d4edda;
          font-weight: bold;
        }
        
        .total-label {
          font-weight: bold;
          text-align: right;
        }
        
        tfoot .total-row {
          background: #ecf0f1;
          font-weight: bold;
          border-top: 2px solid #bdc3c7;
        }
        
        tfoot td {
          font-weight: bold;
        }
        
        .no-data {
          text-align: center;
          color: #95a5a6;
          padding: 40px;
        }
        
        .loader {
          text-align: center;
          padding: 40px;
          color: #7f8c8d;
        }
        
        .export-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        
        .btn-excel,
        .btn-pdf {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          transition: all 0.3s;
        }
        
        .btn-excel {
          background: #27ae60;
          color: white;
        }
        
        .btn-excel:hover {
          background: #229954;
          transform: translateY(-2px);
        }
        
        .btn-pdf {
          background: #e74c3c;
          color: white;
        }
        
        .btn-pdf:hover {
          background: #c0392b;
          transform: translateY(-2px);
        }
        
        @media print {
          .export-buttons,
          .search-box,
          .discount-summary {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductWiseSalesSummary;