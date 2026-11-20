import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportProfessionalExcel } from '../../utils/exportProfessionalExcel';

const TYPE_TABS = ["All", "Opening", "Purchase", "Issue", "Transfer", "Return", "Adjustment"];

const NUM_KEYS = ["quantity", "perBoxCost", "totalCost", "balanceQty", "balanceCost", "avgCostPerBox"];

const matchesType = (type, tab) => {
    if (tab === "All") return true;
    if (tab === "Opening") return type === "Opening";
    if (tab === "Purchase") return type === "Purchase";
    if (tab === "Issue") return type === "Issue";
    if (tab === "Transfer") return type === "TransferIn" || type === "Transfer Out";
    if (tab === "Return") return type === "SR" || type === "PurchaseReturn" || type === "StockReplacement";
    if (tab === "Adjustment") return type === "StockAdj Less" || type === "StockAdj Add";
    return true;
};

const typeClass = (type) => {
    if (type === "Opening") return "iv-pill iv-pill-open";
    if (type === "Purchase" || type === "SR" || type === "StockAdj Add" || type === "TransferIn") return "iv-pill iv-pill-in";
    if (type === "Issue" || type === "PurchaseReturn" || type === "StockAdj Less" || type === "Transfer Out" || type === "StockReplacement") return "iv-pill iv-pill-out";
    return "iv-pill";
};

const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const fmt = (value) => toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return String(dateString);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(",", "");
};

const IN_TYPES = new Set(["Purchase", "TransferIn", "SR", "StockAdj Add"]);
const OUT_TYPES = new Set(["Issue", "Transfer Out", "StockReplacement", "PurchaseReturn", "StockAdj Less"]);

const InventoryValutionByProductPopup = ({ filterData = {}, rows = [] }) => {
    const [filter, setFilter] = useState("");
    const [tab, setTab] = useState("All");
    const [sortConfig, setSortConfig] = useState({ key: "seq", direction: "asc" });

    const ledger = useMemo(() => (
        rows.map((row, index) => ({
            ...row,
            seq: row.seq ?? index,
            ProductName: row.ProductName || filterData.productLabel || "",
        }))
    ), [rows, filterData.productLabel]);

    const lastSeq = ledger.length ? ledger[ledger.length - 1].seq : -1;
    const opening = ledger.find((row) => row.type === "Opening") || ledger[0];
    const closing = ledger[ledger.length - 1];

    const movement = useMemo(() => {
        let inward = 0;
        let outward = 0;
        ledger.forEach((row) => {
            const qty = Math.abs(toNumber(row.quantity));
            if (IN_TYPES.has(row.type)) inward += qty;
            if (OUT_TYPES.has(row.type)) outward += qty;
        });
        return { inward, outward, count: Math.max(ledger.length - (opening ? 1 : 0), 0) };
    }, [ledger, opening]);

    const visibleRows = useMemo(() => {
        const query = filter.trim().toLowerCase();
        const filtered = ledger.filter((row) => {
            if (!matchesType(row.type, tab)) return false;
            if (!query) return true;
            return [row.date, row.ProductName, row.type, row.invoice, row.Store, row.Client, row.SalesFlowRef, row.location]
                .some((value) => String(value || "").toLowerCase().includes(query));
        });
        const sorted = [...filtered];
        sorted.sort((a, b) => {
            const { key, direction } = sortConfig;
            const left = NUM_KEYS.includes(key) ? toNumber(a[key]) : String(a[key] ?? "");
            const right = NUM_KEYS.includes(key) ? toNumber(b[key]) : String(b[key] ?? "");
            if (left < right) return direction === "asc" ? -1 : 1;
            if (left > right) return direction === "asc" ? 1 : -1;
            return toNumber(a.seq) - toNumber(b.seq);
        });
        return sorted;
    }, [ledger, filter, tab, sortConfig]);

    const requestSort = (key) => {
        setSortConfig((prev) => (
            prev.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        ));
    };

    const sortMark = (key) => {
        if (sortConfig.key !== key) return "";
        return sortConfig.direction === "asc" ? " ↑" : " ↓";
    };

    const metaLine = [
        `Period: ${formatDate(filterData.startDate)} to ${formatDate(filterData.endDate)}`,
        `Product: ${filterData.productLabel || "—"}`,
        `Location: ${filterData.locationLabel || "All"}`,
        `Department: ${filterData.storeLabel || "All"}`,
        closing ? `Closing qty ${fmt(closing.balanceQty)} | Closing value ${fmt(closing.balanceCost)} | Avg cost ${fmt(closing.avgCostPerBox)}` : "",
    ].filter(Boolean);

    const exportRows = () => ledger.map((row) => ({
        Date: row.date || "",
        "Product Name": row.ProductName || "",
        Type: row.type || "",
        Invoice: row.invoice || "",
        Store: row.Store || "",
        Client: row.Client || "",
        "Sales Flow Ref": row.SalesFlowRef || "",
        Quantity: toNumber(row.quantity),
        "Cost per Box": toNumber(row.perBoxCost),
        "Total Cost": toNumber(row.totalCost),
        "Balance Qty": toNumber(row.balanceQty),
        "Balance Cost": toNumber(row.balanceCost),
        "Avg Cost Per Box": toNumber(row.avgCostPerBox),
    }));

    const exportToExcel = async () => {
        await exportProfessionalExcel({
            title: "Inventory Valuation",
            fileName: `Inventory_Valuation_${filterData.endDate || "report"}`,
            sheetName: "Inventory Valuation",
            rows: exportRows(),
            meta: metaLine,
            columns: [
                { header: "Date", key: "Date", width: 16 },
                { header: "Product Name", key: "Product Name", width: 32 },
                { header: "Type", key: "Type", width: 16 },
                { header: "Invoice", key: "Invoice", width: 16 },
                { header: "Store", key: "Store", width: 16 },
                { header: "Client", key: "Client", width: 22 },
                { header: "Sales Flow Ref", key: "Sales Flow Ref", width: 18 },
                { header: "Quantity", key: "Quantity", width: 14, type: "number" },
                { header: "Cost per Box", key: "Cost per Box", width: 14, type: "number" },
                { header: "Total Cost", key: "Total Cost", width: 16, type: "number" },
                { header: "Balance Qty", key: "Balance Qty", width: 14, type: "number" },
                { header: "Balance Cost", key: "Balance Cost", width: 16, type: "number" },
                { header: "Avg Cost Per Box", key: "Avg Cost Per Box", width: 16, type: "number" },
            ],
        });
    };

    const exportToPDF = () => {
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        doc.setFontSize(14);
        doc.setTextColor(0, 49, 128);
        doc.text("Pearl Dynamic (pvt) ltd", 148, 10, { align: "center" });
        doc.setFontSize(12);
        doc.setTextColor(20, 24, 32);
        doc.text("Inventory Valuation", 148, 16, { align: "center" });
        doc.setFontSize(8);
        doc.setTextColor(80, 86, 96);
        doc.text(metaLine.slice(0, 4).join("   |   "), 148, 21, { align: "center" });

        autoTable(doc, {
            startY: 25,
            head: [[
                "Date", "Product", "Type", "Invoice", "Store", "Client", "Sales Flow Ref",
                "Qty", "Cost / Box", "Total Cost", "Bal Qty", "Bal Cost", "Avg Cost",
            ]],
            body: ledger.map((row) => [
                row.date || "",
                row.ProductName || "",
                row.type || "",
                row.invoice || "",
                row.Store || "",
                row.Client || "",
                row.SalesFlowRef || "",
                fmt(row.quantity),
                fmt(row.perBoxCost),
                fmt(row.totalCost),
                fmt(row.balanceQty),
                fmt(row.balanceCost),
                fmt(row.avgCostPerBox),
            ]),
            styles: { fontSize: 7, cellPadding: 1.4, textColor: [26, 28, 30] },
            headStyles: { fillColor: [0, 49, 128], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                7: { halign: "right" },
                8: { halign: "right" },
                9: { halign: "right" },
                10: { halign: "right" },
                11: { halign: "right" },
                12: { halign: "right" },
            },
        });

        doc.save(`Inventory_Valuation_${filterData.endDate || "report"}.pdf`);
    };

    const escapeHtml = (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const handlePrint = () => {
        const printWindow = window.open("", "_blank", "width=1200,height=800");
        if (!printWindow) return;
        const body = ledger.map((row) => `
            <tr>
                <td>${escapeHtml(row.date)}</td>
                <td>${escapeHtml(row.ProductName)}</td>
                <td>${escapeHtml(row.type)}</td>
                <td>${escapeHtml(row.invoice)}</td>
                <td>${escapeHtml(row.Store)}</td>
                <td>${escapeHtml(row.Client)}</td>
                <td>${escapeHtml(row.SalesFlowRef)}</td>
                <td class="num">${fmt(row.quantity)}</td>
                <td class="num">${fmt(row.perBoxCost)}</td>
                <td class="num">${fmt(row.totalCost)}</td>
                <td class="num">${fmt(row.balanceQty)}</td>
                <td class="num">${fmt(row.balanceCost)}</td>
                <td class="num">${fmt(row.avgCostPerBox)}</td>
            </tr>
        `).join("");
        printWindow.document.write(`
            <html>
                <head>
                    <title>Inventory Valuation</title>
                    <style>
                        body { font-family: "Segoe UI", Arial, sans-serif; color: #1a1c1e; padding: 16px; }
                        h1 { margin: 0; color: #003180; font-size: 20px; }
                        p { margin: 4px 0 12px; color: #434653; font-size: 12px; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; }
                        th, td { border: 1px solid #d5dce8; padding: 5px 6px; }
                        th { background: #003180; color: #fff; text-align: left; }
                        tr:nth-child(even) td { background: #f8fafc; }
                        .num { text-align: right; font-variant-numeric: tabular-nums; }
                    </style>
                </head>
                <body>
                    <h1>Pearl Dynamic (pvt) ltd</h1>
                    <p>Inventory Valuation<br>${metaLine.slice(0, 4).join(" | ")}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th><th>Product</th><th>Type</th><th>Invoice</th><th>Store</th><th>Client</th><th>Sales Flow Ref</th>
                                <th>Qty</th><th>Cost / Box</th><th>Total Cost</th><th>Bal Qty</th><th>Bal Cost</th><th>Avg Cost</th>
                            </tr>
                        </thead>
                        <tbody>${body}</tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 400);
    };

    return (
        <div className="iv-page">
            <header className="iv-hero">
                <div>
                    <p className="iv-eyebrow">Pearl Dynamic (pvt) ltd</p>
                    <h1>Inventory Valuation</h1>
                    <p className="iv-sub">Product cost ledger with running average cost</p>
                </div>
                <div className="iv-meta">
                    <div><span>Period</span><strong>{formatDate(filterData.startDate)} – {formatDate(filterData.endDate)}</strong></div>
                    <div><span>Product</span><strong>{filterData.productLabel || "—"}</strong></div>
                    <div><span>Location</span><strong>{filterData.locationLabel || "All"}</strong></div>
                    <div><span>Department</span><strong>{filterData.storeLabel || "All"}</strong></div>
                </div>
            </header>

            <section className="iv-panel">
                <div className="iv-kpis">
                    <div className="iv-kpi">
                        <span>Opening qty</span>
                        <strong>{fmt(opening?.quantity)}</strong>
                    </div>
                    <div className="iv-kpi">
                        <span>Inward qty</span>
                        <strong>{fmt(movement.inward)}</strong>
                    </div>
                    <div className="iv-kpi">
                        <span>Outward qty</span>
                        <strong>{fmt(movement.outward)}</strong>
                    </div>
                    <div className="iv-kpi">
                        <span>Closing qty</span>
                        <strong>{fmt(closing?.balanceQty)}</strong>
                    </div>
                    <div className="iv-kpi iv-kpi-main">
                        <span>Closing value</span>
                        <strong>{fmt(closing?.balanceCost)}</strong>
                    </div>
                    <div className="iv-kpi">
                        <span>Avg cost / box</span>
                        <strong>{fmt(closing?.avgCostPerBox)}</strong>
                    </div>
                </div>

                <div className="iv-tabs" role="tablist">
                    {TYPE_TABS.map((item) => (
                        <button
                            key={item}
                            type="button"
                            className={tab === item ? "iv-tab active" : "iv-tab"}
                            onClick={() => setTab(item)}
                        >
                            {item}
                        </button>
                    ))}
                </div>

                <div className="iv-tools">
                    <input
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        placeholder="Search invoice, client, store, type..."
                    />
                    <p>{visibleRows.length} of {ledger.length} lines</p>
                </div>

                <div className="iv-scroll">
                    <table className="iv-table">
                        <thead>
                            <tr>
                                <th onClick={() => requestSort("date")}>Date{sortMark("date")}</th>
                                <th onClick={() => requestSort("ProductName")}>Product{sortMark("ProductName")}</th>
                                <th onClick={() => requestSort("type")}>Type{sortMark("type")}</th>
                                <th onClick={() => requestSort("invoice")}>Invoice{sortMark("invoice")}</th>
                                <th onClick={() => requestSort("Store")}>Store{sortMark("Store")}</th>
                                <th onClick={() => requestSort("Client")}>Client{sortMark("Client")}</th>
                                <th onClick={() => requestSort("SalesFlowRef")}>Sales Flow Ref{sortMark("SalesFlowRef")}</th>
                                <th className="num" onClick={() => requestSort("quantity")}>Quantity{sortMark("quantity")}</th>
                                <th className="num" onClick={() => requestSort("perBoxCost")}>Cost / Box{sortMark("perBoxCost")}</th>
                                <th className="num" onClick={() => requestSort("totalCost")}>Total Cost{sortMark("totalCost")}</th>
                                <th className="num" onClick={() => requestSort("balanceQty")}>Balance Qty{sortMark("balanceQty")}</th>
                                <th className="num" onClick={() => requestSort("balanceCost")}>Balance Cost{sortMark("balanceCost")}</th>
                                <th className="num" onClick={() => requestSort("avgCostPerBox")}>Avg Cost{sortMark("avgCostPerBox")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.length > 0 ? visibleRows.map((row) => (
                                <tr
                                    key={`${row.seq}-${row.type}-${row.invoice || ""}`}
                                    className={row.type === "Opening" ? "is-open" : row.seq === lastSeq ? "is-close" : ""}
                                >
                                    <td>{row.date || "—"}</td>
                                    <td className="iv-name">{row.ProductName || "—"}</td>
                                    <td><span className={typeClass(row.type)}>{row.type}</span></td>
                                    <td>{row.invoice || "—"}</td>
                                    <td>{row.Store || "—"}</td>
                                    <td>{row.Client || "—"}</td>
                                    <td>{row.SalesFlowRef || "—"}</td>
                                    <td className={toNumber(row.quantity) < 0 ? "num neg" : "num"}>{fmt(row.quantity)}</td>
                                    <td className="num">{fmt(row.perBoxCost)}</td>
                                    <td className={toNumber(row.totalCost) < 0 ? "num neg" : "num"}>{fmt(row.totalCost)}</td>
                                    <td className="num">{fmt(row.balanceQty)}</td>
                                    <td className="num">{fmt(row.balanceCost)}</td>
                                    <td className="num">{fmt(row.avgCostPerBox)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="13" className="iv-empty">No valuation lines for this filter.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <p className="iv-note">Balance cost is the running average. Excel, PDF, and Print use the full ledger in date order.</p>

                <div className="iv-actions">
                    <button type="button" className="iv-excel" onClick={exportToExcel} disabled={!ledger.length}>Excel</button>
                    <button type="button" className="iv-pdf" onClick={exportToPDF} disabled={!ledger.length}>PDF</button>
                    <button type="button" className="iv-print" onClick={handlePrint} disabled={!ledger.length}>Print</button>
                </div>
            </section>

            <style>{`
                body { margin: 0; background: #f3f5f8; }
                .iv-page { font-family: "Segoe UI", Arial, sans-serif; background: #f3f5f8; min-height: 100vh; padding: 20px; color: #1a1c1e; }
                .iv-hero { display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; background: linear-gradient(135deg, #003180 0%, #1e4f9c 100%); color: #fff; border-radius: 14px; padding: 22px 24px; margin-bottom: 16px; }
                .iv-eyebrow { margin: 0 0 4px; letter-spacing: 0.08em; text-transform: uppercase; font-size: 11px; opacity: 0.8; }
                .iv-hero h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
                .iv-sub { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
                .iv-meta { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
                .iv-meta div { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18); border-radius: 10px; padding: 8px 12px; min-width: 140px; max-width: 280px; }
                .iv-meta span { display: block; font-size: 11px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.04em; }
                .iv-meta strong { display: block; margin-top: 2px; font-size: 13px; font-weight: 600; }
                .iv-panel { background: #fff; border: 1px solid #e5e8ef; border-radius: 14px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 35, 70, 0.06); }
                .iv-kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
                .iv-kpi { background: #f7f9fc; border: 1px solid #e5e8ef; border-radius: 10px; padding: 10px 12px; }
                .iv-kpi span { display: block; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
                .iv-kpi strong { display: block; margin-top: 4px; color: #003180; font-size: 16px; font-variant-numeric: tabular-nums; }
                .iv-kpi-main { background: #e6f1fb; border-color: #b9d4f3; }
                .iv-tabs { display: flex; flex-wrap: wrap; gap: 4px; background: #eef2f7; border-radius: 10px; padding: 4px; margin-bottom: 12px; }
                .iv-tab { border: 0; background: transparent; color: #434653; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-weight: 600; font-size: 13px; }
                .iv-tab.active { background: #fff; color: #003180; box-shadow: 0 1px 3px rgba(0, 49, 128, 0.15); }
                .iv-tools { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 12px; }
                .iv-tools input { width: min(420px, 100%); border: 1px solid #d5dce8; border-radius: 8px; padding: 9px 12px; font-size: 14px; outline: none; }
                .iv-tools input:focus { border-color: #003180; box-shadow: 0 0 0 3px rgba(0, 49, 128, 0.12); }
                .iv-tools p { margin: 0; color: #6b7280; font-size: 13px; }
                .iv-scroll { overflow: auto; max-height: calc(100vh - 390px); border: 1px solid #e6ebf2; border-radius: 10px; }
                .iv-table { border-collapse: separate; border-spacing: 0; width: max-content; min-width: 100%; font-size: 12px; }
                .iv-table th, .iv-table td { border-bottom: 1px solid #e6ebf2; border-right: 1px solid #e6ebf2; padding: 8px 10px; white-space: nowrap; }
                .iv-table th { position: sticky; top: 0; z-index: 2; background: #1e4f9c; color: #fff; font-size: 11px; font-weight: 600; text-align: left; cursor: pointer; user-select: none; }
                .iv-table th.num, .iv-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
                .iv-name { font-weight: 600; color: #1a1c1e; min-width: 180px; }
                .iv-table tbody tr:nth-child(even) td { background: #f8fafc; }
                .iv-table tbody tr:hover td { background: #eef4ff; }
                .iv-table tr.is-open td { background: #f4f7fb; }
                .iv-table tr.is-close td { background: #e6f1fb; font-weight: 700; color: #003180; }
                .neg { color: #b42318; }
                .iv-pill { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 700; background: #eef2f7; color: #434653; }
                .iv-pill-open { background: #e8eef8; color: #003180; }
                .iv-pill-in { background: #e7f6ee; color: #17663a; }
                .iv-pill-out { background: #fdecec; color: #9f1d1d; }
                .iv-empty { text-align: center; color: #6b7280; padding: 28px !important; }
                .iv-note { margin: 10px 0 0; color: #6b7280; font-size: 12px; }
                .iv-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
                .iv-actions button { border: 0; color: #fff; border-radius: 8px; padding: 9px 16px; cursor: pointer; font-weight: 600; }
                .iv-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
                .iv-excel { background: #217346; }
                .iv-pdf { background: #c0392b; }
                .iv-print { background: #434653; }
                @media (max-width: 1100px) {
                    .iv-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                    .iv-hero { flex-direction: column; align-items: stretch; }
                    .iv-meta { justify-content: flex-start; }
                }
                @media (max-width: 700px) {
                    .iv-page { padding: 12px; }
                    .iv-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .iv-tools { flex-direction: column; align-items: stretch; }
                    .iv-actions { flex-direction: column; }
                    .iv-actions button { width: 100%; }
                }
                @media print {
                    body, .iv-page { background: #fff; padding: 0; }
                    .iv-tabs, .iv-tools, .iv-actions, .iv-note { display: none !important; }
                    .iv-scroll { overflow: visible; max-height: none; border: none; }
                    .iv-hero, .iv-table th, .iv-pill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
};

export default InventoryValutionByProductPopup;
