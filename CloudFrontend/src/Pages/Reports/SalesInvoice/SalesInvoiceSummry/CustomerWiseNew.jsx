import React, { useEffect, useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getDataFundtion } from "../../../../Api/CRUDFunctions";
import { fmt2 } from "../../../../utils/round2";
import { buildInvoiceGeoLookups } from "./resolveInvoiceGeo";
import { mergeSalesReturnInvoices } from "./salesReturnSummaryRows";

const TABS = [
  { id: "both", label: "Both" },
  { id: "amount", label: "Amount Wise" },
  { id: "sales", label: "Sales Wise" },
];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const IDENTITY = ["ORDER BOOKER", "ASM/ZSM", "REGION", "ZONE", "CITY", "CUSTOMER CODE", "CUSTOMER NAME"];

const asId = (val) => {
  if (!val) return "";
  if (typeof val === "object") return String(val._id || "");
  return String(val);
};

const safeNum = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const monthIndex = (dateValue) => {
  const text = String(dateValue || "");
  const iso = text.match(/^(\d{4})-(\d{2})/);
  if (iso) return Number(iso[2]) - 1;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return -1;
  return parsed.getMonth();
};

const netAmountOf = (item) => {
  const productNet = Number(item?.ProductAmount);
  if (Number.isFinite(productNet) && productNet !== 0) return productNet;
  const computed =
    safeNum(item?.GrossAmount || item?.Amount) +
    safeNum(item?.Gst) +
    safeNum(item?.Advancetax) -
    safeNum(item?.discount) -
    safeNum(item?.TTS);
  if (computed !== 0) return computed;
  return safeNum(item?.TotalAmount);
};

const emptyMonths = () => MONTHS.map(() => 0);

const sumMonths = (months) => months.reduce((sum, value) => sum + safeNum(value), 0);

const showNum = (value) => (safeNum(value) === 0 ? "" : fmt2(value));

const formatDate = (value) => {
  const iso = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!iso) return value ? String(value) : "-";
  return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const NAVY = "FF003180";
const HEADER = "FF1E4F9C";
const BAND = "FFE8EEF8";
const TOTAL = "FFE6F1FB";
const LINE = "FFD5DCE8";
const gridBorder = {
  top: { style: "thin", color: { argb: LINE } },
  left: { style: "thin", color: { argb: LINE } },
  bottom: { style: "thin", color: { argb: LINE } },
  right: { style: "thin", color: { argb: LINE } },
};

const customerMeta = (client, invoiceOrderBooker, lookups) => {
  const obId = client?.OrderBooker || invoiceOrderBooker;
  const ob = lookups.orderBookerMap.get(asId(obId));
  const zsm = lookups.zsmMap.get(asId(ob?.ZSM));
  const regionFromOb = lookups.regionMap.get(asId(ob?.Region));
  const city = lookups.cityMap.get(asId(client?.City));
  const zone =
    lookups.zoneMap.get(asId(zsm?.Zone || ob?.Zone || client?.Zone)) ||
    lookups.zoneMap.get(asId(regionFromOb?.Zone));
  const region =
    lookups.regionMap.get(asId(zone?.Region)) ||
    lookups.regionMap.get(asId(city?.Region)) ||
    regionFromOb;
  return {
    orderBooker: ob?.OrderBookerName || "-",
    asm: zsm?.ZsmName || "-",
    region: region?.RegionName || "-",
    regionId: asId(region?._id),
    zone: zone?.ZoneName || "-",
    zoneId: asId(zone?._id),
    city: city?.CityName || "-",
  };
};

const buildCustomers = (summaryRows, dumpRows, data) => {
  const geo = buildInvoiceGeoLookups(data);
  const customerMap = new Map();
  (data.Customer || []).forEach((customer) => {
    const id = asId(customer?._id);
    if (id) customerMap.set(id, customer);
  });
  const lookups = { ...geo, customerMap };
  const grouped = new Map();
  const rows = mergeSalesReturnInvoices(summaryRows, dumpRows);

  rows.forEach((item) => {
    const clientId = asId(item.Client);
    const key = clientId || `missing-${item.SalesInvoice || item.Invoice || grouped.size}`;
    let row = grouped.get(key);
    if (!row) {
      const client = customerMap.get(clientId) || {};
      const meta = customerMeta(client, item.OrderBooker, lookups);
      row = {
        ...meta,
        code: client.SalesFlowRef || client.OldCode || client.code || client.DistrbutorSystemCode || "-",
        name: client.CutomerName || client.DistrbutorName || "-",
        value: emptyMonths(),
        ctn: emptyMonths(),
      };
      grouped.set(key, row);
    }
    const month = monthIndex(item.SalesInvoiceDate || item.date);
    if (month < 0 || month > 11) return;
    row.value[month] += netAmountOf(item);
    row.ctn[month] += safeNum(item.carton);
  });

  return [...grouped.values()].sort(
    (a, b) => a.orderBooker.localeCompare(b.orderBooker) || a.name.localeCompare(b.name)
  );
};

const monthTotals = (rows, key) => {
  const totals = emptyMonths();
  rows.forEach((row) => {
    row[key].forEach((value, index) => {
      totals[index] += safeNum(value);
    });
  });
  return totals;
};

const CustomerWiseNew = ({ data = {} }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState("");
  const selectedZoneIds = (data.selectedZoneIds || []).map(String);
  const selectedRegionIds = (data.selectedRegionIds || []).map(String);
  const [tab, setTab] = useState("both");
  const reportRef = useRef(null);
  const showAmount = tab === "both" || tab === "amount";
  const showSales = tab === "both" || tab === "sales";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const storeParam = data.store || "";
        const [res, dumpRes] = await Promise.all([
          getDataFundtion(
            `/SaleInvoice/SalesinvoiceSummry?startDate=${data.startDate}&endDate=${data.endDate}&Store=${storeParam}`
          ),
          getDataFundtion(
            `/SaleInvoice/SalesDumpData?startDate=${data.startDate}&endDate=${data.endDate}&Store=${storeParam}`
          ).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setCustomers(buildCustomers(unwrapList(res?.data ?? res), unwrapList(dumpRes), data));
      } catch (error) {
        console.error("Error fetching Customer Wise New:", error);
        if (!cancelled) setCustomers([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const zoneSet = new Set(selectedZoneIds);
    const regionSet = new Set(selectedRegionIds);
    return customers.filter((row) => {
      if (zoneSet.size && !zoneSet.has(row.zoneId)) return false;
      if (regionSet.size && !regionSet.has(row.regionId)) return false;
      if (!term) return true;
      return [row.orderBooker, row.asm, row.region, row.zone, row.city, row.code, row.name]
        .some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [customers, filter, selectedZoneIds, selectedRegionIds]);

  const namesFor = (rows, idKey, nameKey) => {
    const ids = new Set(idKey === "zone" ? selectedZoneIds : selectedRegionIds);
    if (!ids.size) return "All";
    const names = (rows || [])
      .filter((item) => ids.has(String(item._id)))
      .map((item) => item[nameKey])
      .filter(Boolean);
    return names.length ? names.join(", ") : "All";
  };
  const zoneFilterLabel = namesFor(data.Zone, "zone", "ZoneName");
  const regionFilterLabel = namesFor(data.Region, "region", "RegionName");

  const valueTotals = useMemo(() => monthTotals(visible, "value"), [visible]);
  const ctnTotals = useMemo(() => monthTotals(visible, "ctn"), [visible]);

  const department = useMemo(() => {
    const storeIds = Array.isArray(data.store)
      ? data.store.map((id) => String(id))
      : data.store
        ? [String(data.store)]
        : [];
    if (!storeIds.length) return "All";
    const names = (data.storeforDrp || [])
      .filter((store) => storeIds.includes(String(store._id)))
      .map((store) => store.StoreName)
      .filter(Boolean);
    return names.length ? names.join(", ") : "All";
  }, [data.store, data.storeforDrp]);

  const identityCells = (row) => [row.orderBooker, row.asm, row.region, row.zone, row.city, row.code, row.name];

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Customer Wise New");
    const lastCol = IDENTITY.length + MONTHS.length + 1;

    const writeBlock = (title, key, totals, startRow) => {
      const titleRow = sheet.getRow(startRow);
      titleRow.height = 22;
      sheet.mergeCells(startRow, IDENTITY.length + 1, startRow, lastCol);
      titleRow.getCell(IDENTITY.length + 1).value = title;
      titleRow.getCell(IDENTITY.length + 1).alignment = { horizontal: "center", vertical: "middle" };
      titleRow.getCell(IDENTITY.length + 1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      for (let col = IDENTITY.length + 1; col <= lastCol; col += 1) {
        const cell = titleRow.getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.border = gridBorder;
      }

      const headerRow = sheet.getRow(startRow + 1);
      headerRow.height = 20;
      [...IDENTITY, ...MONTHS, "TOTAL"].forEach((label, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = label;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = gridBorder;
      });

      visible.forEach((row, rowIndex) => {
        const excelRow = sheet.getRow(startRow + 2 + rowIndex);
        const months = row[key];
        const values = [...identityCells(row), ...months, sumMonths(months)];
        const shade = rowIndex % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF";
        values.forEach((value, index) => {
          const cell = excelRow.getCell(index + 1);
          const isMonth = index >= IDENTITY.length && index < values.length - 1;
          cell.value = isMonth && safeNum(value) === 0 ? null : value;
          if (index >= IDENTITY.length) cell.numFmt = "#,##0.00";
          cell.font = { size: 9, color: { argb: "FF1A1C1E" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: shade } };
          cell.alignment = { horizontal: index >= IDENTITY.length ? "right" : "left" };
          cell.border = gridBorder;
        });
      });

      const totalRowIndex = startRow + 2 + visible.length;
      const totalRow = sheet.getRow(totalRowIndex);
      const totalValues = ["", "", "", "", "", "", "TOTAL", ...totals, sumMonths(totals)];
      totalValues.forEach((value, index) => {
        const cell = totalRow.getCell(index + 1);
        const isMonth = index >= IDENTITY.length && index < totalValues.length - 1;
        cell.value = isMonth && safeNum(value) === 0 ? null : value;
        if (index >= IDENTITY.length) cell.numFmt = "#,##0.00";
        cell.font = { bold: true, size: 9, color: { argb: NAVY } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL } };
        cell.border = gridBorder;
      });
      return totalRowIndex;
    };

    const tabLabel = TABS.find((item) => item.id === tab)?.label || "Both";
    sheet.mergeCells(1, 1, 1, lastCol);
    sheet.getCell("A1").value = "Pearl Dynamic (pvt) ltd";
    sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: NAVY } };
    sheet.getCell("A1").alignment = { horizontal: "center" };
    sheet.mergeCells(2, 1, 2, lastCol);
    sheet.getCell("A2").value = `Customer Wise New — ${tabLabel}`;
    sheet.getCell("A2").font = { bold: true, size: 13, color: { argb: "FF111827" } };
    sheet.getCell("A2").alignment = { horizontal: "center" };
    sheet.mergeCells(3, 1, 3, lastCol);
    sheet.getCell("A3").value = `Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}    |    Department: ${department}    |    Zone: ${zoneFilterLabel}    |    Region: ${regionFilterLabel}`;
    sheet.getCell("A3").font = { size: 10, color: { argb: "FF6B7280" } };
    sheet.getCell("A3").alignment = { horizontal: "center" };
    let nextRow = 5;
    if (showAmount) nextRow = writeBlock("SALES IN VALUE (NET AMOUNT)", "value", valueTotals, nextRow) + 3;
    if (showSales) writeBlock("SALES IN CTN", "ctn", ctnTotals, nextRow);

    IDENTITY.forEach((_, index) => {
      sheet.getColumn(index + 1).width = index === 6 ? 28 : 16;
    });
    for (let col = IDENTITY.length + 1; col <= lastCol; col += 1) sheet.getColumn(col).width = 12;

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `Customer_Wise_New_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const tableBody = (key) => visible.map((row) => [
    ...identityCells(row),
    ...row[key].map((value) => showNum(value)),
    showNum(sumMonths(row[key])) || "0.00",
  ]);

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", format: "a3" });
    doc.setFontSize(14);
    const tabLabel = TABS.find((item) => item.id === tab)?.label || "Both";
    doc.text(`Customer Wise New - ${tabLabel}`, 14, 12);
    doc.setFontSize(9);
    doc.text(`Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}    Department: ${department}    Zone: ${zoneFilterLabel}    Region: ${regionFilterLabel}`, 14, 18);
    const headFor = (title) => [[
      { content: "", colSpan: IDENTITY.length, styles: { lineWidth: 0 } },
      { content: title, colSpan: MONTHS.length + 1, styles: { halign: "center", fontStyle: "bold" } },
    ], [...IDENTITY, ...MONTHS, "TOTAL"]];
    const tableStyles = {
      styles: { fontSize: 6, cellPadding: 1, textColor: 20 },
      headStyles: { fillColor: [0, 49, 128], textColor: 255, fontStyle: "bold", lineWidth: 0.1, lineColor: 213 },
      footStyles: { fillColor: [230, 241, 251], textColor: 20, fontStyle: "bold" },
      theme: "grid",
    };
    let startY = 24;
    if (showAmount) {
      autoTable(doc, {
        startY,
        head: headFor("SALES IN VALUE (NET AMOUNT)"),
        body: tableBody("value"),
        foot: [["", "", "", "", "", "", "TOTAL", ...valueTotals.map(showNum), showNum(sumMonths(valueTotals)) || "0.00"]],
        ...tableStyles,
      });
      startY = doc.lastAutoTable.finalY + 10;
    }
    if (showSales) {
      autoTable(doc, {
        startY,
        head: headFor("SALES IN CTN"),
        body: tableBody("ctn"),
        foot: [["", "", "", "", "", "", "TOTAL", ...ctnTotals.map(showNum), showNum(sumMonths(ctnTotals)) || "0.00"]],
        ...tableStyles,
      });
    }
    doc.save(`Customer_Wise_New_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handlePrint = () => {
    const content = reportRef.current?.innerHTML || "";
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return;
    win.document.write(`<html><head><title>Customer Wise New</title>
      <style>
        body { font-family: Segoe UI, Arial, sans-serif; padding: 16px; color: #1a1c1e; }
        .cwn-print-head { display: block; margin-bottom: 12px; }
        .cwn-print-head strong { display: block; color: #003180; font-size: 16px; }
        .cwn-print-head span { display: block; font-size: 12px; color: #434653; }
        table { border-collapse: collapse; width: 100%; font-size: 10px; margin-bottom: 22px; }
        th, td { border: 1px solid #d5dce8; padding: 4px; }
        th { text-align: center; background: #1e4f9c; color: #fff; }
        .block-title { background: #003180; }
        td.num, .num { text-align: right; }
        tfoot td { font-weight: 700; background: #e6f1fb; }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const renderTable = (title, key, totals) => (
    <div className="cwn-scroll">
    <table className="cwn-table">
      <thead>
        <tr className="cwn-band">
          <th className="cwn-blank" colSpan={IDENTITY.length} />
          <th className="block-title" colSpan={MONTHS.length + 1}>{title}</th>
        </tr>
        <tr className="cwn-cols">
          {IDENTITY.map((label) => <th key={label} className={label === "CUSTOMER NAME" ? "cwn-name" : ""}>{label}</th>)}
          {MONTHS.map((label) => <th key={`${title}-${label}`}>{label}</th>)}
          <th>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        {visible.length === 0 ? (
          <tr>
            <td className="cwn-empty" colSpan={IDENTITY.length + MONTHS.length + 1}>No customers found for this period.</td>
          </tr>
        ) : visible.map((row, rowIndex) => (
          <tr key={`${title}-${rowIndex}-${row.code}`}>
            {identityCells(row).map((value, index) => (
              <td key={`${row.code}-${index}`} className={index === 6 ? "cwn-name" : ""}>{value}</td>
            ))}
            {row[key].map((value, index) => <td className="num" key={`${row.code}-m-${index}`}>{showNum(value)}</td>)}
            <td className="num">{showNum(sumMonths(row[key])) || "0.00"}</td>
          </tr>
        ))}
      </tbody>
      {visible.length > 0 && (
        <tfoot>
          <tr>
            <td colSpan={6} />
            <td>TOTAL</td>
            {totals.map((value, index) => <td className="num" key={`t-${index}`}>{showNum(value)}</td>)}
            <td className="num">{showNum(sumMonths(totals)) || "0.00"}</td>
          </tr>
        </tfoot>
      )}
    </table>
    </div>
  );

  const tabLabel = TABS.find((item) => item.id === tab)?.label || "Both";

  return (
    <div className="cwn-page">
      <header className="cwn-hero">
        <div>
          <p className="cwn-eyebrow">Pearl Dynamic (pvt) ltd</p>
          <h1>Customer Wise New</h1>
          <p className="cwn-sub">Monthly customer sales, {tabLabel}</p>
        </div>
        <div className="cwn-meta">
          <div><span>Period</span><strong>{formatDate(data.startDate)} – {formatDate(data.endDate)}</strong></div>
          <div><span>Department</span><strong>{department}</strong></div>
          <div><span>Customers</span><strong>{isLoading ? "…" : visible.length}</strong></div>
        </div>
      </header>

      <div className="cwn-panel">
        <div className="cwn-bar">
          <div className="cwn-tabs" role="tablist">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={tab === item.id ? "cwn-tab active" : "cwn-tab"}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="cwn-kpis">
            {showAmount && (
              <div className="cwn-kpi">
                <span>Net amount</span>
                <strong>{fmt2(sumMonths(valueTotals))}</strong>
              </div>
            )}
            {showSales && (
              <div className="cwn-kpi">
                <span>Cartons</span>
                <strong>{fmt2(sumMonths(ctnTotals))}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="cwn-tools">
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search order booker, customer, city..."
          />
        </div>

        {isLoading ? (
          <div className="cwn-loader">
            <div className="cwn-spinner" />
            <p>Loading customer sales...</p>
          </div>
        ) : (
          <div ref={reportRef}>
            <div className="cwn-print-head">
              <strong>Pearl Dynamic (pvt) ltd</strong>
              <span>Customer Wise New — {tabLabel}</span>
              <span>Period: {formatDate(data.startDate)} to {formatDate(data.endDate)} | Department: {department} | Zone: {zoneFilterLabel} | Region: {regionFilterLabel}</span>
            </div>
            {showAmount && renderTable("SALES IN VALUE (NET AMOUNT)", "value", valueTotals)}
            {showSales && renderTable("SALES IN CTN", "ctn", ctnTotals)}
          </div>
        )}

        <div className="cwn-actions">
          <button type="button" className="cwn-excel" onClick={exportToExcel} disabled={isLoading}>Excel</button>
          <button type="button" className="cwn-pdf" onClick={exportToPDF} disabled={isLoading}>PDF</button>
          <button type="button" className="cwn-print" onClick={handlePrint} disabled={isLoading}>Print</button>
        </div>
      </div>
      <style>{`
        body { margin: 0; background: #f3f5f8; }
        .cwn-page { font-family: "Segoe UI", Arial, sans-serif; background: #f3f5f8; min-height: 100vh; padding: 20px; color: #1a1c1e; }
        .cwn-hero { display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; background: linear-gradient(135deg, #003180 0%, #1e4f9c 100%); color: #fff; border-radius: 14px; padding: 22px 24px; margin-bottom: 16px; }
        .cwn-eyebrow { margin: 0 0 4px; letter-spacing: 0.08em; text-transform: uppercase; font-size: 11px; opacity: 0.8; }
        .cwn-hero h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
        .cwn-sub { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
        .cwn-meta { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
        .cwn-meta div { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18); border-radius: 10px; padding: 8px 12px; min-width: 140px; }
        .cwn-meta span { display: block; font-size: 11px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.04em; }
        .cwn-meta strong { display: block; margin-top: 2px; font-size: 13px; font-weight: 600; max-width: 280px; white-space: normal; }
        .cwn-panel { background: #fff; border: 1px solid #e5e8ef; border-radius: 14px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 35, 70, 0.06); }
        .cwn-bar, .cwn-tools, .cwn-actions { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
        .cwn-bar { margin-bottom: 12px; flex-wrap: wrap; }
        .cwn-tabs { display: inline-flex; background: #eef2f7; border-radius: 10px; padding: 4px; gap: 4px; }
        .cwn-tab { border: 0; background: transparent; color: #434653; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-weight: 600; font-size: 13px; }
        .cwn-tab.active { background: #fff; color: #003180; box-shadow: 0 1px 3px rgba(0, 49, 128, 0.15); }
        .cwn-kpis { display: flex; gap: 10px; }
        .cwn-kpi { background: #f7f9fc; border: 1px solid #e5e8ef; border-radius: 10px; padding: 8px 14px; min-width: 150px; }
        .cwn-kpi span { display: block; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
        .cwn-kpi strong { display: block; margin-top: 2px; color: #003180; font-size: 16px; font-variant-numeric: tabular-nums; }
        .cwn-tools { margin-bottom: 12px; flex-wrap: wrap; justify-content: flex-start; }
        .cwn-tools input { width: min(420px, 100%); border: 1px solid #d5dce8; border-radius: 8px; padding: 9px 12px; font-size: 14px; outline: none; }
        .cwn-tools input:focus { border-color: #003180; box-shadow: 0 0 0 3px rgba(0, 49, 128, 0.12); }
        .cwn-scroll { overflow: auto; max-height: calc(100vh - 250px); border: 1px solid #e6ebf2; border-radius: 10px; margin-bottom: 16px; }
        .cwn-table { border-collapse: separate; border-spacing: 0; width: max-content; min-width: 100%; font-size: 12px; margin: 0 0 18px; }
        .cwn-table th, .cwn-table td { border-bottom: 1px solid #e6ebf2; border-right: 1px solid #e6ebf2; padding: 7px 8px; white-space: nowrap; }
        .cwn-band th { position: sticky; top: 0; z-index: 3; background: #f7f9fc; }
        .cwn-band .block-title { background: #003180; color: #fff; text-align: center; letter-spacing: 0.04em; font-size: 12px; }
        .cwn-blank { background: #f7f9fc !important; border-right-color: transparent !important; }
        .cwn-cols th { position: sticky; top: 32px; z-index: 2; background: #1e4f9c; color: #fff; font-size: 11px; font-weight: 600; text-align: center; }
        .cwn-name { text-align: left; min-width: 180px; }
        .cwn-table tbody tr:nth-child(even) td { background: #f8fafc; }
        .cwn-table tbody tr:hover td { background: #eef4ff; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        tfoot td { font-weight: 700; background: #e6f1fb !important; color: #003180; position: sticky; bottom: 0; }
        .cwn-empty { text-align: center; color: #6b7280; padding: 28px !important; }
        .cwn-print-head { display: none; }
        .cwn-actions { justify-content: flex-end; margin-top: 4px; }
        .cwn-actions button { border: 0; color: #fff; border-radius: 8px; padding: 9px 16px; cursor: pointer; font-weight: 600; }
        .cwn-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
        .cwn-excel { background: #217346; }
        .cwn-pdf { background: #c0392b; }
        .cwn-print { background: #434653; }
        .cwn-loader { height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #434653; }
        .cwn-spinner { width: 42px; height: 42px; border: 4px solid #e5e8ef; border-top-color: #003180; border-radius: 50%; animation: cwn-spin 0.8s linear infinite; }
        @keyframes cwn-spin { to { transform: rotate(360deg); } }
        @media (max-width: 800px) {
          .cwn-hero, .cwn-bar { flex-direction: column; align-items: stretch; }
          .cwn-meta { justify-content: flex-start; }
        }
      `}</style>
    </div>
  );
};

export default CustomerWiseNew;
