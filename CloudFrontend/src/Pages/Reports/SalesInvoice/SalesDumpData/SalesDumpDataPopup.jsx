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

// Missing, blank, or the string "NaN" must stay 0 so totals do not become NaN.
const safeNum = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const safeFormat = (val, opts = { minimumFractionDigits: 2, maximumFractionDigits: 2 }) => {
  return safeNum(val).toLocaleString("en-US", opts);
};

const SalesDumpDataPopup = ({ data = {} }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { startDate, endDate, store } = data;
  const [rows, setRows] = useState([]);
  const [productWiseData, setProductWiseData] = useState([]);
  const [filter, setFilter] = useState("");
  const reportRef = useRef(null);
  
  // Cache lookups to avoid repeated find operations
  const lookupsRef = useRef({});

  // Update lookups when data dependencies change
  useEffect(() => {
    if (data && Object.keys(data).length) {
      lookupsRef.current = {
        skuOptionsMap: new Map(data.SkuOptions?.map(p => [p._id, p]) || []),
        brandMap: new Map(data.Brand?.map(b => [b.mastercode, b]) || []),
        categoryMap: new Map(data.Category?.map(c => [c.mastercode, c]) || []),
        masterSkuMap: new Map(data.MastarSku?.map(m => [m.mastercode, m]) || []),
        vendorMap: new Map(data.Vendor?.map(v => [v.mastercode, v]) || []),
        customerMap: new Map(data.Customer?.map(c => [c._id, c]) || []),
        orderBookerMap: new Map(data.TotalOrderBooker?.map(o => [o._id, o]) || []),
        cityMap: new Map(data.City?.map(c => [c._id, c]) || []),
        zsmMap: new Map(data.Zsm?.map(z => [z._id, z]) || []),
        zoneMap: new Map(data.Zone?.map(z => [z._id, z]) || []),
        regionMap: new Map(data.Region?.map(r => [r._id, r]) || [])
      };
    }
  }, [data]);

  // Fetch data - optimized with single pass processing
  const getData = useCallback(async () => {
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
        customerMap,
        orderBookerMap,
        cityMap,
        zsmMap,
        zoneMap,
        regionMap
      } = lookupsRef.current;
const PclData = res.AllOrder || [];
// Build DC Number -> Order lookup Map for O(1) merge (case-insensitive, type-safe)
const dcOrderMap = new Map();
PclData.forEach((order) => {
  const key = String(order.dcNumber || '').trim();
  if (key) dcOrderMap.set(key, order);
});
      // Single pass through data with Map lookups (O(1) instead of O(n))
      const processedData = res.data.map((item, index) => {
        const product = skuOptionsMap.get(item.Product);
        if (!product) return null;
        
        const mastercode = product.mastercode || '';
        const brandCode = mastercode.slice(0, 6);
        const categoryCode = mastercode.slice(0, 4);
        const masterSkuCode = mastercode.slice(0, 9);
        const vendorCode = mastercode.slice(0, 2);
        
        const Brand = brandMap.get(brandCode);
        const Category = categoryMap.get(categoryCode);
        const MasterSku = masterSkuMap.get(masterSkuCode);
        const Vendor = vendorMap.get(vendorCode);
        const customer = customerMap.get(item.Client);

        // Zone and Region follow Order Booker -> ZSM -> Zone, then the booker's own region.
        const orderBookerId = customer?.OrderBooker;
        const obData = orderBookerMap.get(orderBookerId);
        const zsmData = zsmMap.get(obData?.ZSM);
        const regionFromOb = regionMap.get(obData?.Region);
        const cityData = cityMap.get(customer?.City);
        const zoneData =
          zoneMap.get(zsmData?.Zone || obData?.Zone || customer?.Zone) ||
          zoneMap.get(regionFromOb?.Zone);
        const regionData =
          regionMap.get(zoneData?.Region) ||
          regionMap.get(cityData?.Region) ||
          regionFromOb;

        const carton = safeNum(item.carton);
        const pcsinBox = safeNum(product?.PcsinBox);
        const gram = safeNum(product?.GRAM);
        const boxInCarton = safeNum(product?.BoxinCarton) || 1;
        
        // Pre-calculate discount total once. TradeOffer wins; discount is only the fallback.
        const discounts = {
          diBspass: safeNum(item.diBspass),
          rtoffer: safeNum(item.RToffer),
          wtoffer: safeNum(item.WToffer),
          rpDrive: safeNum(item.RpDrive),
          wholesaleDeal: safeNum(item.WHOLESALEDEAL),
          rtwholesale: safeNum(item.RTWholeSale),
          subDisTPromotion: safeNum(item.SubDisTPromotion),
          tradeOffer: safeNum(item.TradeOffer) || safeNum(item.discount),
          hotzoneDrive: safeNum(item.HOTZONEDRIVE),
          scheme: safeNum(item.SpecialTO),
          specialDiscount: safeNum(item?.SPECIALDISCOUNT),
          tts: safeNum(item.TTS),
        };
        
        const totalDiscount = Object.values(discounts).reduce((sum, val) => sum + safeNum(val), 0);
        const totalGrossAmount = safeNum(item.GrossAmount);
        const totalGst = safeNum(item.Gst);
        const totalAdvanceTax = safeNum(item.Advancetax);
        
        return {
          id: index + 1,
          productCode: product?.code || '',
          productName: product?.ProductName || '',
          ProductSalesflowRef: product?.salesFlowRef || '',
          VendorName: Vendor?.label2 || '',
          VendorCode: Vendor?.mastercode || '',
          Customer: customer?.ClientName || customer?.DistrbutorName || '',
          OrderBooker: obData?.OrderBookerName || '',
          orderBookerId: obData?._id ? String(obData._id) : '',
          City: cityData?.CityName || "",
          Zone: zoneData?.ZoneName || '',
          zoneId: zoneData?._id ? String(zoneData._id) : '',
          Region: regionData?.RegionName || '',
          regionId: regionData?._id ? String(regionData._id) : '',
          DCnumber : item.DCNumber || '',
          OrderNumber : dcOrderMap.get(String(item.DCNumber || '').trim())?.OrderCode || '',
          OrderDate : dcOrderMap.get(String(item.DCNumber || '').trim())?.OrderDate || '',
          Brandcode: Brand?.mastercode || '',
          GRAM: gram,
          KG: safeNum((pcsinBox * carton * gram) / 1000),
          BrandName: Brand?.label2 || '',
          CategoryName: Category?.label2 || '',
          Categorycode: Category?.mastercode || '',
          MasterSkuName: MasterSku?.label2 || '',
          MasterSkucode: MasterSku?.mastercode || '',
          salesInvoice: item.SalesInvoice || '',
          saleType: item.SaleType === "Return" ? "Return" : item.SaleType === "Distributor" ? "Distributor" : "Sale",
          salesFlowRef: item.SalesFlowRef || '',
          totalBOX: carton,
          totalBOX1: safeNum(item.totalBox),
          BOX: safeNum(item.Box),
          SalesInCarton: safeNum(carton / boxInCarton),
          SalesInUnit: safeNum(carton * pcsinBox),
          SalesInvoiceDate: item.SalesInvoiceDate,
          totalGrossAmount,
          totalGst,
          cityid : customer?.City,
          totalAdvanceTax,
          ...discounts,
          totalDiscount,
          totalNetAmount: safeNum(totalGrossAmount + totalGst + totalAdvanceTax - totalDiscount),
        };
      }).filter(item => item !== null); // Remove any null items
let allprocessed = []
if(data.loginVendor.OnlyDist == true){
  allprocessed = processedData.filter((item)=> item.cityid == data.loginVendor.City )
}
else {
  allprocessed = processedData
}
       
      
      setProductWiseData(allprocessed);
    } catch (error) {
      console.error("Error fetching product-wise sales summary:", error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, store]);

  useEffect(() => {
    if (lookupsRef.current.skuOptionsMap?.size) {
      getData();
    }
  }, [getData, data.SkuOptions]);

  // Search plus Zone, Region, and Order Booker. An empty selection means all.
  const filteredData = useMemo(() => {
    const zoneIds = new Set((data.selectedZone || []).map((zone) => String(zone.value)));
    const regionIds = new Set((data.selectedRegion || []).map((region) => String(region.value)));
    const bookerIds = new Set((data.selectedOrderBooker || []).map((booker) => String(booker.value)));
    const lowerFilter = filter.trim().toLowerCase();

    return productWiseData.filter((item) => {
      if (zoneIds.size && !zoneIds.has(String(item.zoneId || ""))) return false;
      if (regionIds.size && !regionIds.has(String(item.regionId || ""))) return false;
      if (bookerIds.size && !bookerIds.has(String(item.orderBookerId || ""))) return false;
      if (!lowerFilter) return true;
      return (
        item.productName?.toLowerCase().includes(lowerFilter) ||
        item.productCode?.toLowerCase().includes(lowerFilter) ||
        item.Customer?.toLowerCase().includes(lowerFilter) ||
        item.salesInvoice?.toLowerCase().includes(lowerFilter) ||
        item.saleType?.toLowerCase().includes(lowerFilter)
      );
    });
  }, [productWiseData, filter, data.selectedZone, data.selectedRegion, data.selectedOrderBooker]);

  // Memoized totals from filtered rows (footer + summary stats)
  const totals = useMemo(() => {
    const initialTotals = {
      totalProducts: filteredData.length,
      totalBOX: 0,
      totalBOX1: 0,
      BOX: 0,
      SalesInCarton: 0,
      SalesInUnit: 0,
      KG: 0,
      totalGrossAmount: 0,
      totalGst: 0,
      totalAdvanceTax: 0,
      diBspass: 0,
      rtoffer: 0,
      wtoffer: 0,
      rpDrive: 0,
      wholesaleDeal: 0,
      rtwholesale: 0,
      subDisTPromotion: 0,
      tradeOffer: 0,
      hotzoneDrive: 0,
      Scheme: 0,
      specialDiscount: 0,
      totalDiscount: 0,
      totalNetAmount: 0,
    };

    const summed = filteredData.reduce((acc, product) => {
      acc.totalBOX += safeNum(product.totalBOX);
      acc.totalBOX1 += safeNum(product.totalBOX1);
      acc.BOX += safeNum(product.BOX);
      acc.SalesInCarton += safeNum(product.SalesInCarton);
      acc.SalesInUnit += safeNum(product.SalesInUnit);
      acc.KG += safeNum(product.KG);
      acc.totalGrossAmount += safeNum(product.totalGrossAmount);
      acc.totalGst += safeNum(product.totalGst);
      acc.totalAdvanceTax += safeNum(product.totalAdvanceTax);
      acc.diBspass += safeNum(product.diBspass);
      acc.rtoffer += safeNum(product.rtoffer);
      acc.wtoffer += safeNum(product.wtoffer);
      acc.rpDrive += safeNum(product.rpDrive);
      acc.wholesaleDeal += safeNum(product.wholesaleDeal);
      acc.rtwholesale += safeNum(product.rtwholesale);
      acc.subDisTPromotion += safeNum(product.subDisTPromotion);
      acc.tradeOffer += safeNum(product.tradeOffer);
      acc.hotzoneDrive += safeNum(product.hotzoneDrive);
      acc.Scheme += safeNum(product.scheme);
      acc.specialDiscount += safeNum(product.specialDiscount);
      acc.totalDiscount += safeNum(product.totalDiscount);
      return acc;
    }, initialTotals);

    summed.totalNetAmount = safeNum(
      summed.totalGrossAmount +
      summed.totalGst +
      summed.totalAdvanceTax -
      summed.totalDiscount
    );

    return summed;
  }, [filteredData]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(",", "");
  }, []);

  const buildExcelTotalsRow = useCallback(() => ({
    "Product Code": "TOTAL",
    "Product Name": "",
    "Product Categorycode": "",
    "Product CategoryName": "",
    "Product BrandName": "",
    "invocie Sale Flow Ref": "",
    "Order Date": "",
    "DC Number": "",
    "Order Number": "",
    "SalesInvoice Date": "",
    "Product Sales Flow Ref": "",
    "Customer": "",
    "City": "",
    "Zone": "",
    "Region": "",
    "OrderBooker": "",
    "Sales Invoice": "",
    "Type": "",
    "BOX": Number(Number(totals.totalBOX || 0).toFixed(2)),
    "BOX1": Number(Number(totals.BOX || 0).toFixed(2)),
    "totalBOX": Number(Number(totals.totalBOX1 || 0).toFixed(2)),
    "Sales Carton": Number(Number(totals.SalesInCarton || 0).toFixed(2)),
    "Sales Unit": Number(Number(totals.SalesInUnit || 0).toFixed(2)),
    "KG": Number(Number(totals.KG || 0).toFixed(2)),
    "GRAM": "",
    "Gross Amount": Number(Number(totals.totalGrossAmount || 0).toFixed(2)),
    "GST": Number(Number(totals.totalGst || 0).toFixed(2)),
    "Advance Tax": Number(Number(totals.totalAdvanceTax || 0).toFixed(2)),
    "diBspass": Number(Number(totals.diBspass || 0).toFixed(2)),
    "RT Offer": Number(Number(totals.rtoffer || 0).toFixed(2)),
    "WT Offer": Number(Number(totals.wtoffer || 0).toFixed(2)),
    "Rp Drive": Number(Number(totals.rpDrive || 0).toFixed(2)),
    "Wholesale Deal": Number(Number(totals.wholesaleDeal || 0).toFixed(2)),
    "RT Wholesale": Number(Number(totals.rtwholesale || 0).toFixed(2)),
    "Sub Dis T Promotion": Number(Number(totals.subDisTPromotion || 0).toFixed(2)),
    "Trade Offer": Number(Number(totals.tradeOffer || 0).toFixed(2)),
    "Hotzone Drive": Number(Number(totals.hotzoneDrive || 0).toFixed(2)),
    "Scheme": Number(Number(totals.Scheme || 0).toFixed(2)),
    "Special Discount": Number(Number(totals.specialDiscount || 0).toFixed(2)),
    "Total Discount": Number(Number(totals.totalDiscount || 0).toFixed(2)),
    "Net Amount": Number(Number(totals.totalNetAmount || 0).toFixed(2)),
  }), [totals]);

  // Optimized export functions
  const exportToExcel = useCallback(async () => {
    const exportData = filteredData.map(product => ({
      "Product Code": product.productCode,
      "Product Name": product.productName,
      "Product Categorycode": product.Categorycode,
      "Product CategoryName": product.CategoryName,
      "Product BrandName": product.BrandName,
      "invocie Sale Flow Ref": product.salesFlowRef,
      "Order Date": product.OrderDate ? formatDate(product.OrderDate) : '',
      "DC Number": product.DCnumber || '',
      "Order Number": product.OrderNumber || '',
      "SalesInvoice Date": product.SalesInvoiceDate,
      "Product Sales Flow Ref": product.ProductSalesflowRef,
      "Zone": product.Zone,
      "Region": product.Region,
      "Customer": product.Customer,
      "City": product.City,
      "OrderBooker": product.OrderBooker,
      "Sales Invoice": product.salesInvoice,
      "Type": product.saleType || "Sale",
      "BOX": Number(Number(product.totalBOX || 0).toFixed(2)),
      "BOX1": Number(Number(product.BOX || 0).toFixed(2)),
      "totalBOX": Number(Number(product.totalBOX1 || 0).toFixed(2)),
      "Sales Carton": Number(Number(product.SalesInCarton || 0).toFixed(2)),
      "Sales Unit": Number(Number(product.SalesInUnit || 0).toFixed(2)),
      "KG": Number(Number(product.KG || 0).toFixed(2)),
      "GRAM": Number(Number(product.GRAM || 0).toFixed(2)),
      "Gross Amount": Number(Number(product.totalGrossAmount || 0).toFixed(2)),
      "GST": Number(Number(product.totalGst || 0).toFixed(2)),
      "Advance Tax": Number(Number(product.totalAdvanceTax || 0).toFixed(2)),
      "diBspass": Number(Number(product.diBspass || 0).toFixed(2)),
      "RT Offer": Number(Number(product.rtoffer || 0).toFixed(2)),
      "WT Offer": Number(Number(product.wtoffer || 0).toFixed(2)),
      "Rp Drive": Number(Number(product.rpDrive || 0).toFixed(2)),
      "Wholesale Deal": Number(Number(product.wholesaleDeal || 0).toFixed(2)),
      "RT Wholesale": Number(Number(product.rtwholesale || 0).toFixed(2)),
      "Sub Dis T Promotion": Number(Number(product.subDisTPromotion || 0).toFixed(2)),
      "Trade Offer": Number(Number(product.tradeOffer || 0).toFixed(2)),
      "Hotzone Drive": Number(Number(product.hotzoneDrive || 0).toFixed(2)),
      "Scheme": Number(Number(product.scheme || 0).toFixed(2)),
      "Special Discount": Number(Number(product.specialDiscount || 0).toFixed(2)),
      "Total Discount": Number(Number(product.totalDiscount || 0).toFixed(2)),
      "Net Amount": Number(Number(product.totalNetAmount || 0).toFixed(2))
    }));

    if (filteredData.length > 0) {
      exportData.push(buildExcelTotalsRow());
    }

    const department = data.store?.length > 0
      ? data.storeforDrp
        ?.filter(item => data.store.includes(item._id))
        .map(item => item.StoreName)
        .join(", ") || "All"
      : "All";

    await exportProfessionalExcel({
      title: "Product Wise Sale Summary",
      fileName: "Product_Wise_Sale_Summary",
      sheetName: "Product Wise Summary",
      rows: exportData,
      meta: [
        `Period: ${startDate || ""} to ${endDate || ""}`,
        `Department: ${department}`,
      ],
    });
  }, [filteredData, formatDate, buildExcelTotalsRow, startDate, endDate, data.store, data.storeforDrp]);

  const exportToWord = useCallback(async () => {
    if (!filteredData.length) return;
    
    const headers = ["#", "Product Code", "Sales Flow Ref", "Product Name", "Sales Invoice", "BOX",
      "Gross Amount", "GST", "Advance Tax", "diBspass", "RT Offer",
      "WT Offer", "Rp Drive", "Wholesale Deal", "RT Wholesale", "Sub Dis T Promotion",
      "Trade Offer", "Hotzone Drive", "Scheme", "Special Discount", "Total Discount", "Net Amount"];

    const tableRows = [
      new TableRow({
        children: headers.map(header =>
          new TableCell({ children: [new Paragraph(header)] })
        ),
      }),
      ...filteredData.map((product) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(String(product.id || ""))] }),
            new TableCell({ children: [new Paragraph(product.productCode || "")] }),
            new TableCell({ children: [new Paragraph(product.ProductSalesflowRef || "")] }),
            new TableCell({ children: [new Paragraph(product.productName || "")] }),
            new TableCell({ children: [new Paragraph(product.Customer || "")] }),
            new TableCell({ children: [new Paragraph(product.salesInvoice || "")] }),
            new TableCell({ children: [new Paragraph(product.totalBOX?.toString() || "0")] }),
            new TableCell({ children: [new Paragraph(product.totalGrossAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.totalGst?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.totalAdvanceTax?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.diBspass?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.rtoffer?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.wtoffer?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.rpDrive?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.wholesaleDeal?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.rtwholesale?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.subDisTPromotion?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.tradeOffer?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.hotzoneDrive?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.scheme?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.specialDiscount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.totalDiscount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
            new TableCell({ children: [new Paragraph(product.totalNetAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          ],
        })
      ),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("TOTAL")] }),
          new TableCell({ children: [new Paragraph("")] }),
          new TableCell({ children: [new Paragraph("")] }),
          new TableCell({ children: [new Paragraph("")] }),
          new TableCell({ children: [new Paragraph("")] }),
          new TableCell({ children: [new Paragraph("")] }),
          new TableCell({ children: [new Paragraph(totals.totalBOX?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.totalGrossAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.totalGst?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.totalAdvanceTax?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.diBspass?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.rtoffer?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.wtoffer?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.rpDrive?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.wholesaleDeal?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.rtwholesale?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.subDisTPromotion?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.tradeOffer?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.hotzoneDrive?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.Scheme?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.specialDiscount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.totalDiscount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
          new TableCell({ children: [new Paragraph(totals.totalNetAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0")] }),
        ],
      }),
    ];

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: "Pearl Dynamics", heading: "Heading1" }),
          new Paragraph({ text: "Product Wise Sale Summary Report" }),
          new Paragraph({ text: `Period: ${formatDate(startDate)} to ${formatDate(endDate)}` }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Product_Wise_Sale_Summary.docx");
  }, [filteredData, formatDate, startDate, endDate, totals]);

  const exportToPDF = useCallback(() => {
    if (!filteredData.length) return;
    
    const doc = new jsPDF("landscape");
    
    doc.setFontSize(16);
    doc.text("Product Wise Sale Summary Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 22);
    doc.text(`Generated: ${new Date().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, 28);

    const headers = [
      "#", "Product Code", "Sales Flow Ref", "Product Name", "Sales Invoice", "BOX",
      "Gross Amount", "GST", "Advance Tax", "diBspass", "RT Offer",
      "WT Offer", "Rp Drive", "Wholesale Deal", "RT Wholesale", "Sub Dis T Promotion",
      "Trade Offer", "Scheme", "Hotzone Drive", "Special Discount", "Total Discount", "Net Amount"
    ];

    const tableData = filteredData.map(product => [
      product.id,
      product.productCode || "",
      product.ProductSalesflowRef || "",
      product.productName || "",
      product.salesInvoice || "",
      Number(Number(product.totalBOX || 0).toFixed(2)),
      { content: product.totalGrossAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.totalGst?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.totalAdvanceTax?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.diBspass?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.rtoffer?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.wtoffer?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.rpDrive?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.wholesaleDeal?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.rtwholesale?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.subDisTPromotion?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.tradeOffer?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.scheme?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.hotzoneDrive?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.specialDiscount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.totalDiscount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } },
      { content: product.totalNetAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0", styles: { halign: 'right' } }
    ]);

    tableData.push([
      { content: "TOTAL", colSpan: 6, styles: { fontStyle: 'bold', halign: 'center' } },
      { content: totals.totalGrossAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.totalGst.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.totalAdvanceTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.diBspass.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.rtoffer.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.wtoffer.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.rpDrive.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.wholesaleDeal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.rtwholesale.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.subDisTPromotion.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.tradeOffer.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.Scheme.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.hotzoneDrive.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.specialDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totals.totalNetAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right', fillColor: [22, 160, 133] } }
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 35,
      styles: { fontSize: 6, cellPadding: 1, lineColor: [50, 50, 50], lineWidth: 0.1 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 6 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' },
        9: { halign: 'right' }, 10: { halign: 'right' }, 11: { halign: 'right' },
        12: { halign: 'right' }, 13: { halign: 'right' }, 14: { halign: 'right' },
        15: { halign: 'right' }, 16: { halign: 'right' }, 17: { halign: 'right' },
        18: { halign: 'right' }, 19: { halign: 'right' }, 20: { halign: 'right' },
        21: { halign: 'right' }
      },
      margin: { top: 35 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text("Summary:", 14, finalY);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Products: ${totals.totalProducts}`, 14, finalY + 5);
    doc.text(`Total BOX: ${Number(Number(totals.totalBOX || 0).toFixed(2))}`, 14, finalY + 10);
    doc.text(`Grand Total Amount: ${totals.totalNetAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY + 15);
    doc.text(`Total Gross Amount: ${totals.totalGrossAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 60, finalY + 5);
    doc.text(`Total GST: ${totals.totalGst.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 60, finalY + 15);
    doc.text(`Total Advance Tax: ${totals.totalAdvanceTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 100, finalY + 5);
    doc.text(`Total Discount: ${totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 100, finalY + 10);

    doc.save("Product_Wise_Sale_Summary.pdf");
  }, [filteredData, totals, formatDate, startDate, endDate]);

  const handlePrint = useCallback(() => {
    const content = reportRef.current?.innerHTML;
    if (!content) return;
    
    const win = window.open("", "_blank", "width=1400,height=800");
    win.document.write(`
      <html>
        <head>
          <title>Product Wise Sale Summary Report</title>
          <style>
            body { font-family: Arial; padding:20px; }
            table { border-collapse: collapse; width:100%; font-size:8px; }
            th, td { border:1px solid #ccc; padding:3px; text-align:left; }
            th { background:#f4f4f4; font-weight:bold; }
            .numeric { text-align:right; }
            .summary-stats { margin:15px 0; font-weight:bold; }
            .product-table { min-width: 1800px; }
            .report-actions { display: none; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }, []);

  // Add search input handler
  const handleSearch = useCallback((e) => {
    setFilter(e.target.value);
  }, []);

  // Display limited rows for better performance (virtual scrolling)
  const displayData = useMemo(() => {
    return filteredData.slice(0, 500);
  }, [filteredData]);

  return (
    <div className="sales-report-container" ref={reportRef}>
      <div className="sales-report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dynamics</h2>
          <p>Product Wise Sale Summary Report</p>
        </div>
        <div className="report-info">
          <p>Generated: {new Date().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p>
            {productWiseData.length > 0
              ? `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`
              : "No data"}
          </p>
        </div>
      </div>

      {/* Search Box */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search by Product Name, Code, Customer or Invoice..."
          value={filter}
          onChange={handleSearch}
          className="search-input"
        />
      </div>

      <div className="summary-stats">
        <span>Total Products: {totals.totalProducts}</span>
        <span>Total BOX: {Number(Number(totals.totalBOX || 0).toFixed(2))}</span>
        <span>Gross Amount: {safeFormat(totals.totalGrossAmount)}</span>
        <span>Total GST: {safeFormat(totals.totalGst)}</span>
        <span>Total Advance Tax: {safeFormat(totals.totalAdvanceTax)}</span>
        <span>Total Discount: {safeFormat(totals.totalDiscount)}</span>
        <span>Net Amount: {safeFormat(totals.totalNetAmount)}</span>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="sticky-table-wrapper">
            <table className="sales-data-table product-table" border={"All"}>
              <thead className="sticky-header">
                <tr>
                  <th>#</th>
                  <th>Order Number</th>
                  <th>Order Date</th>
                  <th>Sales Invoice</th>
                  <th>Type</th>
                  <th>Sales Invoice Date</th>
                  <th>Sales FLow Ref</th>
                  <th>Vendor Code</th>
                  <th>Vendor</th>
                  <th>Customer</th>
                  <th>City</th>
                  <th>Zone</th>
                  <th>Region</th>
                  <th>OrderBooker</th>
                  <th>Category Code</th>
                  <th>Category</th>
                  <th>Brand Code</th>
                  <th>Brand</th>
                  <th>Master Sku Code</th>
                  <th>Master Sku</th>
                  <th>Product Code</th>
                  <th>Product Sales flow Ref</th>
                  <th>Product Name</th>
                  <th>Sales Box</th>
                  <th>totalBox</th>
                  <th>Box</th>
                  <th>Sales Carton</th>
                  <th>Sales Unit</th>
                  <th>KG</th>
                  <th>GRAM</th>
                  <th>Gross Amount</th>
                  <th>GST</th>
                  <th>Advance Tax</th>
                  <th>diBspass</th>
                  <th>RT Offer</th>
                  <th>WT Offer</th>
                  <th>Rp Drive</th>
                  <th>Wholesale Deal</th>
                  <th>RT Wholesale</th>
                  <th>Sub Dis T Promotion</th>
                  <th>Trade Offer</th>
                  <th>Hotzone Drive</th>
                  <th>Scheme</th>
                  <th>Special Discount</th>
                  <th>Total Discount</th>
                  <th>Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {displayData.length > 0 ? (
                  displayData.map((product) => (
                    <tr key={product.id}>
                      <td>{product.id}</td>
                      <td>{product.OrderNumber}</td>
                      <td>{product.OrderDate}</td>
                      <td>{product.salesInvoice}</td>
                      <td>{product.saleType}</td>
                      <td>{product.SalesInvoiceDate}</td>
                      <td>{product.salesFlowRef}</td>
                      <td>{product.VendorCode}</td>
                      <td>{product.VendorName}</td>
                      <td>{product.Customer}</td>
                      <td>{product.City}</td>
                      <td>{product.Zone}</td>
                      <td>{product.Region}</td>
                      <td>{product.OrderBooker}</td>
                      <td>{product.Categorycode}</td>
                      <td>{product.CategoryName}</td>
                      <td>{product.Brandcode}</td>
                      <td>{product.BrandName}</td>
                      <td>{product.MasterSkucode}</td>
                      <td>{product.MasterSkuName}</td>
                      <td>{product.productCode}</td>
                      <td>{product.ProductSalesflowRef}</td>
                      <td>{product.productName}</td>
                      <td className="numeric">{safeNum(product.totalBOX).toFixed(2)}</td>
                      <td className="numeric">{safeNum(product.totalBOX1).toFixed(2)}</td>
                      <td className="numeric">{safeNum(product.BOX).toFixed(2)}</td>
                      <td className="numeric">{safeNum(product.SalesInCarton).toFixed(2)}</td>
                      <td className="numeric">{safeNum(product.SalesInUnit).toFixed(2)}</td>
                      <td className="numeric">{safeNum(product.KG).toFixed(2)}</td>
                      <td className="numeric">{safeNum(product.GRAM).toFixed(2)}</td>
                      <td className="numeric">{safeFormat(product.totalGrossAmount)}</td>
                      <td className="numeric">{safeFormat(product.totalGst)}</td>
                      <td className="numeric">{safeFormat(product.totalAdvanceTax)}</td>
                      <td className="numeric">{safeFormat(product.diBspass)}</td>
                      <td className="numeric">{safeFormat(product.rtoffer)}</td>
                      <td className="numeric">{safeFormat(product.wtoffer)}</td>
                      <td className="numeric">{safeFormat(product.rpDrive)}</td>
                      <td className="numeric">{safeFormat(product.wholesaleDeal)}</td>
                      <td className="numeric">{safeFormat(product.rtwholesale)}</td>
                      <td className="numeric">{safeFormat(product.subDisTPromotion)}</td>
                      <td className="numeric">{safeFormat(product.tradeOffer)}</td>
                      <td className="numeric">{safeFormat(product.hotzoneDrive)}</td>
                      <td className="numeric">{safeFormat(product.scheme)}</td>
                      <td className="numeric">{safeFormat(product.specialDiscount)}</td>
                      <td className="numeric">{safeFormat(product.totalDiscount)}</td>
                      <td className="numeric">{safeFormat(product.totalNetAmount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="46" className="no-data">No records found</td>
                  </tr>
                )}
              </tbody>
              {displayData.length > 0 && (
                <tfoot>
                  <tr className="footer-total">
                    <td >Total</td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td ></td>
                    <td className="numeric">{safeFormat(totals.totalBOX)}</td>
                    <td className="numeric">{safeFormat(totals.totalBOX1)}</td>
                    <td className="numeric">{safeFormat(totals.BOX)}</td>
                    <td className="numeric">{safeFormat(totals.SalesInCarton)}</td>
                    <td className="numeric">{safeFormat(totals.SalesInUnit)}</td>
                    <td className="numeric">{safeFormat(totals.KG)}</td>
                    <td className="numeric"></td>
                    <td className="numeric">{safeFormat(totals.totalGrossAmount)}</td>
                    <td className="numeric">{safeFormat(totals.totalGst)}</td>
                    <td className="numeric">{safeFormat(totals.totalAdvanceTax)}</td>
                    <td className="numeric">{safeFormat(totals.diBspass)}</td>
                    <td className="numeric">{safeFormat(totals.rtoffer)}</td>
                    <td className="numeric">{safeFormat(totals.wtoffer)}</td>
                    <td className="numeric">{safeFormat(totals.rpDrive)}</td>
                    <td className="numeric">{safeFormat(totals.wholesaleDeal)}</td>
                    <td className="numeric">{safeFormat(totals.rtwholesale)}</td>
                    <td className="numeric">{safeFormat(totals.subDisTPromotion)}</td>
                    <td className="numeric">{safeFormat(totals.tradeOffer)}</td>
                    <td className="numeric">{safeFormat(totals.hotzoneDrive)}</td>
                    <td className="numeric">{safeFormat(totals.Scheme)}</td>
                    <td className="numeric">{safeFormat(totals.specialDiscount)}</td>
                    <td className="numeric">{safeFormat(totals.totalDiscount)}</td>
                    <td className="numeric">{safeFormat(totals.totalNetAmount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <div className="report-actions">
        <button className="btn btn-word" onClick={exportToWord}>Word</button>
        <button className="btn btn-excel" onClick={exportToExcel}>Excel</button>
        <button className="btn btn-pdf" onClick={exportToPDF}>PDF</button>
        <button className="btn btn-print" onClick={handlePrint}>Print</button>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
        
        .sales-report-container {
          font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin: 20px auto;
          max-width: 100%;
          color: #333;
          position: relative;
        }
        
        .sales-report-header {
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
        
        .report-info p {
          margin: 4px 0;
          font-size: 14px;
          color: #666;
        }
        
        .search-container {
          margin-bottom: 20px;
        }
        
        .search-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          width: 100%;
          max-width: 400px;
        }
        
        .summary-stats {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .summary-stats span {
          background: #f8f9fa;
          padding: 6px 10px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 11px;
          border: 1px solid #e9ecef;
        }
        
        .table-container {
          overflow: auto;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
          max-height: 70vh;
          position: relative;
        }
        
        .sticky-table-wrapper {
          position: relative;
          height: 100%;
        }
        
        .sales-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        
        .product-table {
          min-width: 2200px;
        }
        
        .sticky-header {
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .sales-data-table th {
          background: #2c3e50;
          color: white;
          padding: 10px 6px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #1a252f;
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        /* Different z-index for first column if needed */
        .sales-data-table th:first-child {
          position: sticky;
          left: 0;
          z-index: 11;
        }
        
        .sales-data-table td {
          padding: 8px 6px;
          border-bottom: 1px solid #eaeaea;
          white-space: nowrap;
        }
        
        /* Sticky first column for better UX */
        .sales-data-table td:first-child {
          position: sticky;
          left: 0;
          background: white;
          z-index: 5;
          font-weight: 600;
        }
        
        .sales-data-table tbody tr:hover td:first-child {
          background: #f8f9fa;
        }
        
        .sales-data-table tbody tr:hover {
          background-color: #f8f9fa;
        }
        
        .numeric {
          text-align: right;
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }
        
        .no-data {
          text-align: center;
          color: #95a5a6;
          font-style: italic;
          padding: 20px;
        }
        
        tfoot {
          border-top: 2px solid #e0e0e0;
          position: sticky;
          bottom: 0;
          background: white;
          z-index: 5;
        }
        
        .footer-total {
          font-weight: 700;
          background: #f8f9fa;
        }
        
        .footer-total td {
          border-top: 2px solid #e0e0e0;
          background: #f8f9fa;
        }
        
        .report-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
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
        
        /* Scrollbar styling */
        .table-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .table-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .table-container::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        
        .table-container::-webkit-scrollbar-thumb:hover {
          background: #555;
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
          
          .summary-stats {
            justify-content: center;
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
          
          .report-actions, .search-container {
            display: none;
          }
          
          .table-container {
            overflow: visible;
            border: none;
            max-height: none;
          }
          
          .sales-data-table {
            font-size: 8px;
          }
          
          .sticky-header {
            position: static;
          }
          
          .footer-total {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default SalesDumpDataPopup;