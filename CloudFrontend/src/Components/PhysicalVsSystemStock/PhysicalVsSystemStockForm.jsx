import React, { useEffect, useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AppSelect from "../Global/AppSelect.jsx";
import { getDataFundtion } from "../../Api/CRUDFunctions";
import api from "../../Api/ApiInstance";

const MIN_REPORT_DATE = "2026-07-01";

const packOf = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const splitBoxes = (totalBoxes, boxInCarton) => {
  const pack = packOf(boxInCarton);
  const total = num(totalBoxes);
  const ctn = total >= 0 ? Math.floor(total / pack) : Math.ceil(total / pack);
  const box = Number((total - ctn * pack).toFixed(4));
  return { ctn, box, total: Number(total.toFixed(4)) };
};

const fmt = (value) =>
  num(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const rowKey = (item) =>
  `${item.storeId || item.Department || item.storeName || ""}__${item.productId || item.SkuCode || item.productName || ""}`;

/**
 * mode: "add" | "edit" | "view"
 * initial: existing document for edit/view
 */
const PhysicalVsSystemStockForm = ({ mode = "add", initial = null }) => {
  const navigate = useNavigate();
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
  const readOnly = mode === "view";

  const [asOfDate, setAsOfDate] = useState(initial?.DocumentDate || "");
  const [fyStart, setFyStart] = useState(initial?.FyStart || MIN_REPORT_DATE);
  const [remarks, setRemarks] = useState(initial?.Remarks || "");
  const [locationOptions, setLocationOptions] = useState([]);
  const [storeMaster, setStoreMaster] = useState([]);
  const [storeOptions, setStoreOptions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedStores, setSelectedStores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [phyByKey, setPhyByKey] = useState({});
  const [existingImages, setExistingImages] = useState(initial?.Images || []);
  const [newFiles, setNewFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const boot = async () => {
      try {
        const [yearRes, locationRes, storeRes] = await Promise.all([
          getDataFundtion("/Openinginventory/getAllYear"),
          getDataFundtion("/Location"),
          getDataFundtion("/Store"),
        ]);

        const years = (Array.isArray(yearRes) ? yearRes : [])
          .filter((item) => String(item.DateStart || "") >= MIN_REPORT_DATE)
          .sort((a, b) => String(a.DateStart).localeCompare(String(b.DateStart)));
        const latest = years.at(-1);
        if (!initial?.FyStart && latest?.DateStart) setFyStart(latest.DateStart);

        const stores = Array.isArray(storeRes?.data) ? storeRes.data : (Array.isArray(storeRes) ? storeRes : []);
        setStoreMaster(stores);

        const locations = (Array.isArray(locationRes?.data) ? locationRes.data : (Array.isArray(locationRes) ? locationRes : []))
          .map((item) => ({ label: item.LocationName, value: item._id }));
        setLocationOptions(locations);

        if (initial?.Location) {
          const loc = locations.find((l) => String(l.value) === String(initial.Location));
          setSelectedLocation(loc || { label: initial.Location, value: initial.Location });
          const nextStores = stores
            .filter((item) => String(item.Location) === String(initial.Location))
            .map((st) => ({ label: st.StoreName, value: st._id }));
          setStoreOptions(nextStores);
          const storeIds = Array.isArray(initial.Store) ? initial.Store : [];
          setSelectedStores(
            nextStores.filter((s) => storeIds.map(String).includes(String(s.value)))
          );
        }

        if (Array.isArray(initial?.StockData) && initial.StockData.length) {
          setRows(initial.StockData);
          const nextPhy = {};
          initial.StockData.forEach((item) => {
            const key = rowKey(item);
            nextPhy[key] = {
              phyCtn: item.PhyCtn ?? item.phyCtn ?? "",
              phyBox: item.PhyBox ?? item.phyBox ?? "",
            };
          });
          setPhyByKey(nextPhy);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load filters");
      }
    };
    boot();
  }, [initial, loginVendor]);

  useEffect(() => {
    const urls = newFiles.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [newFiles]);

  const onLocationChange = (option) => {
    setSelectedLocation(option);
    const userStore = Array.isArray(loginVendor?.Store) ? loginVendor.Store : [];
    const next = storeMaster
      .filter((item) => String(item.Location) === String(option?.value))
      .filter((item) => !userStore.length || userStore.includes(item._id))
      .map((st) => ({ label: st.StoreName, value: st._id }));
    setStoreOptions(next);
    setSelectedStores([]);
  };

  const loadStock = async () => {
    if (readOnly) return;
    if (!asOfDate) return toast.error("Please select date");
    if (asOfDate < MIN_REPORT_DATE) return toast.error(`Date before ${MIN_REPORT_DATE} not allowed`);
    if (!selectedStores.length) return toast.error("Please select department / store");

    try {
      setIsLoading(true);
      const storeIds = selectedStores.map((s) => s.value).join(",");
      const startDate = fyStart && fyStart <= asOfDate ? fyStart : asOfDate;
      const result = await getDataFundtion(
        `/InventoryReport/DistributorStockFlowReport?startDate=${startDate}&endDate=${asOfDate}&status=Post&Store=${storeIds}&damage=Fresh`
      );
      const apiRows = Array.isArray(result?.rows) ? result.rows : [];
      setRows(apiRows);

      const nextPhy = {};
      apiRows.forEach((item) => {
        const key = rowKey(item);
        nextPhy[key] = phyByKey[key] || { phyCtn: "", phyBox: "" };
      });
      setPhyByKey(nextPhy);

      if (!apiRows.length) toast.info("No stock rows for selected filters");
    } catch (err) {
      console.error(err);
      setRows([]);
      toast.error("Failed to load system stock");
    } finally {
      setIsLoading(false);
    }
  };

  const viewRows = useMemo(() => {
    return rows.map((item) => {
      const key = rowKey(item);
      const pack = packOf(item.boxInCarton);
      const systemTotalBox = num(
        item.SystemTotalBox != null
          ? item.SystemTotalBox
          : (item.remainingBoxes != null ? item.remainingBoxes : item.closingBalance)
      );
      const systemFromSaved =
        item.SystemCtn != null || item.SystemBox != null
          ? {
              ctn: num(item.SystemCtn),
              box: num(item.SystemBox),
              total: systemTotalBox,
            }
          : splitBoxes(systemTotalBox, pack);

      const phy = phyByKey[key] || { phyCtn: "", phyBox: "" };
      const phyCtn = phy.phyCtn === "" ? "" : num(phy.phyCtn);
      const phyBox = phy.phyBox === "" ? "" : num(phy.phyBox);
      const hasPhy = phy.phyCtn !== "" || phy.phyBox !== "";
      const phyTotalBox = hasPhy ? num(phyCtn) * pack + num(phyBox) : null;
      const defTotalBox = hasPhy ? phyTotalBox - systemTotalBox : null;
      const def = hasPhy ? splitBoxes(defTotalBox, pack) : null;

      return {
        key,
        storeId: item.storeId || "",
        storeName: item.storeName || item.Department || "",
        productId: item.productId || "",
        productName: item.productName || "",
        SkuCode: item.SkuCode || "",
        boxInCarton: pack,
        systemCtn: systemFromSaved.ctn,
        systemBox: systemFromSaved.box,
        systemTotalBox: systemFromSaved.total,
        phyCtn: phy.phyCtn,
        phyBox: phy.phyBox,
        phyTotalBox,
        defCtn: def?.ctn ?? null,
        defBox: def?.box ?? null,
        defTotalBox,
        raw: item,
      };
    });
  }, [rows, phyByKey]);

  const setPhyField = (key, field, value) => {
    if (readOnly) return;
    setPhyByKey((prev) => ({
      ...prev,
      [key]: {
        phyCtn: prev[key]?.phyCtn ?? "",
        phyBox: prev[key]?.phyBox ?? "",
        [field]: value,
      },
    }));
  };

  const onFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next = [...newFiles, ...files].slice(0, 5);
    setNewFiles(next);
    e.target.value = "";
  };

  const removeNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    if (readOnly) return;
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const buildStockPayload = () =>
    viewRows.map((row) => ({
      storeId: row.storeId,
      storeName: row.storeName,
      productId: row.productId,
      productName: row.productName,
      SkuCode: row.SkuCode,
      boxInCarton: row.boxInCarton,
      SystemCtn: row.systemCtn,
      SystemBox: row.systemBox,
      SystemTotalBox: row.systemTotalBox,
      PhyCtn: row.phyCtn === "" ? 0 : num(row.phyCtn),
      PhyBox: row.phyBox === "" ? 0 : num(row.phyBox),
      PhyTotalBox: row.phyTotalBox == null ? 0 : num(row.phyTotalBox),
      DefCtn: row.defCtn == null ? 0 : num(row.defCtn),
      DefBox: row.defBox == null ? 0 : num(row.defBox),
      DefTotalBox: row.defTotalBox == null ? 0 : num(row.defTotalBox),
    }));

  const saveDocument = async () => {
    if (readOnly) return;
    if (!asOfDate) return toast.error("Please select date");
    if (!selectedLocation?.value) return toast.error("Please select location");
    if (!selectedStores.length) return toast.error("Please select department / store");
    if (!viewRows.length) return toast.error("Load stock before save");

    const entered = viewRows.filter((r) => r.phyCtn !== "" || r.phyBox !== "");
    if (!entered.length) return toast.error("Enter at least one physical qty");

    try {
      setIsSaving(true);
      const fd = new FormData();
      fd.append("DocumentDate", asOfDate);
      fd.append("FyStart", fyStart);
      fd.append("Location", selectedLocation.value);
      fd.append("Store", JSON.stringify(selectedStores.map((s) => s.value)));
      fd.append("Remarks", remarks || "");
      fd.append("CreatedBy", `${loginVendor?.firstname || ""} ${loginVendor?.lastname || ""}`.trim());
      fd.append("StockData", JSON.stringify(buildStockPayload()));

      if (mode === "edit") {
        fd.append("KeepImages", JSON.stringify(existingImages || []));
      }

      newFiles.forEach((file) => fd.append("Images", file));

      if (mode === "edit" && initial?._id) {
        await api.put(`/PhysicalVsSystemStock/Update/${initial._id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Updated successfully");
      } else {
        await api.post("/PhysicalVsSystemStock", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Saved successfully");
      }
      navigate("/PhysicalVsSystemStock");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const totals = useMemo(() => {
    return viewRows.reduce(
      (acc, row) => {
        acc.systemTotalBox += row.systemTotalBox || 0;
        if (row.phyTotalBox != null) acc.phyTotalBox += row.phyTotalBox;
        if (row.defTotalBox != null) acc.defTotalBox += row.defTotalBox;
        return acc;
      },
      { systemTotalBox: 0, phyTotalBox: 0, defTotalBox: 0 }
    );
  }, [viewRows]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      toast.error("Popup blocked — allow popups to print");
      return;
    }

    const storeNames = selectedStores.map((s) => s.label).filter(Boolean).join(", ") || "-";
    const esc = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const tableRows = viewRows
      .map(
        (row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${esc(row.storeName)}</td>
        <td>${esc(row.SkuCode)}</td>
        <td>${esc(row.productName)}</td>
        <td class="num">${esc(fmt(row.boxInCarton))}</td>
        <td class="num">${esc(fmt(row.systemCtn))}</td>
        <td class="num">${esc(fmt(row.systemBox))}</td>
        <td class="num"><b>${esc(fmt(row.systemTotalBox))}</b></td>
        <td class="num">${esc(fmt(row.phyCtn))}</td>
        <td class="num">${esc(fmt(row.phyBox))}</td>
        <td class="num"><b>${esc(fmt(row.phyTotalBox))}</b></td>
        <td class="num ${row.defTotalBox < 0 ? "neg" : ""}">${esc(fmt(row.defCtn))}</td>
        <td class="num ${row.defTotalBox < 0 ? "neg" : ""}">${esc(fmt(row.defBox))}</td>
        <td class="num ${row.defTotalBox < 0 ? "neg" : ""}"><b>${esc(fmt(row.defTotalBox))}</b></td>
      </tr>`
      )
      .join("");

    const imagePages = (existingImages || [])
      .filter((img) => img?.uri)
      .map(
        (img, index) => `
      <section class="photo-page">
        <div class="photo-head">
          <div>
            <div class="photo-title">Physical Stock Photo ${index + 1}</div>
            <div class="photo-meta">Doc # ${esc(initial?.DocumentNumber || "-")} · ${esc(asOfDate || "-")} · ${esc(storeNames)}</div>
          </div>
          <div class="photo-meta">Page ${index + 1} of ${(existingImages || []).filter((i) => i?.uri).length}</div>
        </div>
        <div class="photo-frame">
          <img src="${esc(img.uri)}" alt="${esc(img.filename || `Photo ${index + 1}`)}" />
        </div>
      </section>`
      )
      .join("");

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Physical vs System Stock ${esc(initial?.DocumentNumber || "")}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #0f172a;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: #fff;
    }
    .sheet { width: 100%; }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .brand { font-size: 20px; font-weight: 700; color: #0f766e; }
    .doc-title { font-size: 16px; font-weight: 700; margin-top: 2px; }
    .sub { font-size: 11px; color: #475569; margin-top: 2px; }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 18px;
      font-size: 12px;
      margin-bottom: 14px;
    }
    .meta-grid strong { color: #334155; }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 9.5px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 4px 5px;
      vertical-align: top;
      word-wrap: break-word;
    }
    th {
      background: #ecfdf5 !important;
      color: #064e3b;
      font-weight: 700;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .neg { color: #b91c1c; }
    tfoot td {
      background: #f1f5f9 !important;
      font-weight: 700;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .footer-note {
      margin-top: 10px;
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    .photo-page {
      page-break-before: always;
      break-before: page;
      height: 273mm;
      display: flex;
      flex-direction: column;
    }
    .photo-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .photo-title { font-size: 14px; font-weight: 700; }
    .photo-meta { font-size: 11px; color: #475569; }
    .photo-frame {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      overflow: hidden;
    }
    .photo-frame img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    @media print {
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand">Pearl Dynamic</div>
        <div class="doc-title">Physical Stock vs System Stock</div>
        <div class="sub">Inventory verification document</div>
      </div>
      <div style="text-align:right;font-size:12px;">
        <div><strong>Doc #</strong> ${esc(initial?.DocumentNumber || "-")}</div>
        <div><strong>Date</strong> ${esc(asOfDate || "-")}</div>
        <div><strong>Printed</strong> ${esc(new Date().toLocaleString("en-GB"))}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div><strong>Department:</strong> ${esc(storeNames)}</div>
      <div><strong>Created By:</strong> ${esc(initial?.CreatedBy || "-")}</div>
      <div><strong>FY Start:</strong> ${esc(initial?.FyStart || fyStart || "-")}</div>
      <div><strong>Remarks:</strong> ${esc(remarks || "-")}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:28px">#</th>
          <th style="width:70px">Dept</th>
          <th style="width:58px">SKU</th>
          <th>Product</th>
          <th style="width:42px">Box/Ctn</th>
          <th style="width:48px">Sys Ctn</th>
          <th style="width:48px">Sys Box</th>
          <th style="width:54px">Sys Total</th>
          <th style="width:48px">Phy Ctn</th>
          <th style="width:48px">Phy Box</th>
          <th style="width:54px">Phy Total</th>
          <th style="width:48px">Def Ctn</th>
          <th style="width:48px">Def Box</th>
          <th style="width:54px">Def Total</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || `<tr><td colspan="14" style="text-align:center;padding:12px;">No stock lines</td></tr>`}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="text-align:right">TOTAL</td>
          <td colspan="2"></td>
          <td class="num">${esc(fmt(totals.systemTotalBox))}</td>
          <td colspan="2"></td>
          <td class="num">${esc(fmt(totals.phyTotalBox))}</td>
          <td colspan="2"></td>
          <td class="num ${totals.defTotalBox < 0 ? "neg" : ""}">${esc(fmt(totals.defTotalBox))}</td>
        </tr>
      </tfoot>
    </table>

    <div class="footer-note">
      <span>System from Distributor Stock Flow · Def = Phy − System</span>
      <span>${viewRows.length} line(s) · ${(existingImages || []).filter((i) => i?.uri).length} photo(s)</span>
    </div>
  </div>

  ${imagePages}
</body>
</html>`);
    printWindow.document.close();

    let printed = false;
    const runPrint = () => {
      if (printed) return;
      printed = true;
      try {
        printWindow.focus();
        printWindow.print();
      } finally {
        printWindow.close();
      }
    };

    const images = Array.from(printWindow.document.images || []);
    if (!images.length) {
      setTimeout(runPrint, 250);
      return;
    }

    let done = 0;
    const mark = () => {
      done += 1;
      if (done >= images.length) setTimeout(runPrint, 200);
    };
    images.forEach((img) => {
      if (img.complete) mark();
      else {
        img.onload = mark;
        img.onerror = mark;
      }
    });
    setTimeout(runPrint, 8000);
  };

  return (
    <div className="pd-page">
      <ToastContainer />
      <div className="pd-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h2 className="text-lg font-semibold">
            {mode === "add" && "Add Physical Stock vs System Stock"}
            {mode === "edit" && `Edit ${initial?.DocumentNumber || ""}`}
            {mode === "view" && `View ${initial?.DocumentNumber || ""}`}
          </h2>
          <div className="flex gap-2">
            {mode === "view" && (
              <button type="button" className="pd-btn-save" style={{ background: "#0f766e" }} onClick={handlePrint}>
                Print
              </button>
            )}
            {mode === "view" && initial?._id && (
              <button
                type="button"
                className="pd-btn-save"
                style={{ background: "#1d4ed8" }}
                onClick={() => navigate(`/PhysicalVsSystemStockEdit/${initial._id}`)}
              >
                Edit
              </button>
            )}
            <button type="button" className="pd-btn-save" style={{ background: "#64748b" }} onClick={() => navigate("/PhysicalVsSystemStock")}>
              Back to List
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">As of Date</label>
            <input
              type="date"
              value={asOfDate}
              min={MIN_REPORT_DATE}
              disabled={readOnly}
              onChange={(e) => setAsOfDate(e.target.value < MIN_REPORT_DATE ? MIN_REPORT_DATE : e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <AppSelect
              options={locationOptions}
              value={selectedLocation}
              onChange={onLocationChange}
              isDisabled={readOnly}
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <AppSelect
              isMulti
              options={storeOptions.length ? storeOptions : selectedStores}
              value={selectedStores}
              onChange={(opts) => setSelectedStores(opts || [])}
              isDisabled={readOnly}
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Store"
            />
          </div>

          {!readOnly && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadStock}
                disabled={isLoading}
                className={`pd-btn-save flex-1 ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoading ? "Loading..." : "Load Stock"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Remarks</label>
          <input
            type="text"
            value={remarks}
            disabled={readOnly}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Optional remarks"
          />
        </div>

        <div className="mt-4 no-print-controls">
          <label className="block text-sm font-medium mb-1">
            {readOnly ? "Attached Images" : "Images (Cloudinary, max 5)"}
          </label>
          {!readOnly && (
            <input type="file" accept="image/*" multiple onChange={onFilesChange} className="block w-full text-sm" />
          )}
          {!readOnly && (
            <div className="flex flex-wrap gap-3 mt-3">
              {existingImages.map((img, index) => (
                <div key={`ex-${index}`} className="relative border rounded p-1">
                  <img src={img.uri} alt={img.filename || "stock"} style={{ width: 96, height: 96, objectFit: "cover" }} />
                  <button type="button" onClick={() => removeExistingImage(index)} className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1">
                    x
                  </button>
                </div>
              ))}
              {previews.map((url, index) => (
                <div key={`nw-${index}`} className="relative border rounded p-1">
                  <img src={url} alt="new" style={{ width: 96, height: 96, objectFit: "cover" }} />
                  <button type="button" onClick={() => removeNewFile(index)} className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1">
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div id="phy-vs-system-print-root">
        <div className="pd-card overflow-auto" style={{ maxHeight: readOnly ? "none" : "62vh" }}>
          <table className="w-full text-sm border-collapse">
            <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#0f172a", color: "#fff" }}>
              <tr>
                <th className="p-2 border border-slate-600 text-left">#</th>
                <th className="p-2 border border-slate-600 text-left">Department</th>
                <th className="p-2 border border-slate-600 text-left">SKU</th>
                <th className="p-2 border border-slate-600 text-left">Product</th>
                <th className="p-2 border border-slate-600 text-right">Box/Ctn</th>
                <th className="p-2 border border-slate-600 text-right" style={{ background: "#1e3a5f" }}>SystemCtn</th>
                <th className="p-2 border border-slate-600 text-right" style={{ background: "#1e3a5f" }}>SystemBox</th>
                <th className="p-2 border border-slate-600 text-right" style={{ background: "#1e3a5f" }}>SystemTotalBox</th>
                <th className="p-2 border border-slate-600 text-right" style={{ background: "#14532d" }}>PhyCtn</th>
                <th className="p-2 border border-slate-600 text-right" style={{ background: "#14532d" }}>PhyBox</th>
                <th className="p-2 border border-slate-600 text-right" style={{ background: "#14532d" }}>PhyTotalBox</th>
                <th className="p-2 border border-slate-600 text-right" style={{ background: "#7c2d12" }}>DefCtn</th>
                <th className="p-2 border border-slate-600 text-right" style={{ background: "#7c2d12" }}>DefBox</th>
                <th className="p-2 border border-slate-600 text-right" style={{ background: "#7c2d12" }}>DefTotalBox</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="p-6 text-center text-slate-500">Loading system stock...</td>
                </tr>
              ) : viewRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-6 text-center text-slate-500">
                    Select date &amp; department, then Load Stock
                  </td>
                </tr>
              ) : (
                viewRows.map((row, index) => (
                  <tr key={row.key} style={{ background: index % 2 === 0 ? "#f8fafc" : "#fff" }}>
                    <td className="p-1.5 border border-slate-200">{index + 1}</td>
                    <td className="p-1.5 border border-slate-200 whitespace-nowrap">{row.storeName}</td>
                    <td className="p-1.5 border border-slate-200 font-mono">{row.SkuCode}</td>
                    <td className="p-1.5 border border-slate-200">{row.productName}</td>
                    <td className="p-1.5 border border-slate-200 text-right">{row.boxInCarton}</td>
                    <td className="p-1.5 border border-slate-200 text-right">{fmt(row.systemCtn)}</td>
                    <td className="p-1.5 border border-slate-200 text-right">{fmt(row.systemBox)}</td>
                    <td className="p-1.5 border border-slate-200 text-right font-semibold">{fmt(row.systemTotalBox)}</td>
                    <td className="p-1 border border-slate-200">
                      {readOnly ? (
                        <span className="block text-right px-1">{fmt(row.phyCtn)}</span>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          value={row.phyCtn}
                          onChange={(e) => setPhyField(row.key, "phyCtn", e.target.value)}
                          className="w-20 p-1 border rounded text-right"
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="p-1 border border-slate-200">
                      {readOnly ? (
                        <span className="block text-right px-1">{fmt(row.phyBox)}</span>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          value={row.phyBox}
                          onChange={(e) => setPhyField(row.key, "phyBox", e.target.value)}
                          className="w-20 p-1 border rounded text-right"
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right font-semibold">
                      {row.phyTotalBox == null ? "" : fmt(row.phyTotalBox)}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right" style={{ color: row.defTotalBox < 0 ? "#b91c1c" : undefined }}>
                      {row.defCtn == null ? "" : fmt(row.defCtn)}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right" style={{ color: row.defTotalBox < 0 ? "#b91c1c" : undefined }}>
                      {row.defBox == null ? "" : fmt(row.defBox)}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right font-semibold" style={{ color: row.defTotalBox < 0 ? "#b91c1c" : undefined }}>
                      {row.defTotalBox == null ? "" : fmt(row.defTotalBox)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {viewRows.length > 0 && (
              <tfoot>
                <tr style={{ background: "#e2e8f0", fontWeight: 700 }}>
                  <td className="p-2 border border-slate-300" colSpan={5}>TOTAL</td>
                  <td className="p-2 border border-slate-300" colSpan={2} />
                  <td className="p-2 border border-slate-300 text-right">{fmt(totals.systemTotalBox)}</td>
                  <td className="p-2 border border-slate-300" colSpan={2} />
                  <td className="p-2 border border-slate-300 text-right">{fmt(totals.phyTotalBox)}</td>
                  <td className="p-2 border border-slate-300" colSpan={2} />
                  <td className="p-2 border border-slate-300 text-right" style={{ color: totals.defTotalBox < 0 ? "#b91c1c" : undefined }}>
                    {fmt(totals.defTotalBox)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {(existingImages.length > 0 || (readOnly && existingImages.length === 0)) && (
          <div className="pd-card p-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Images</h3>
            {existingImages.length === 0 ? (
              <p className="text-slate-500 text-sm">No images attached</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {existingImages.map((img, index) => (
                  <a
                    key={`view-img-${index}`}
                    href={img.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="border rounded block overflow-hidden"
                    title={img.filename || `Image ${index + 1}`}
                    style={{
                      width: readOnly ? "100%" : 140,
                      maxWidth: readOnly ? 720 : 140,
                    }}
                  >
                    <img
                      src={img.uri}
                      alt={img.filename || `stock-${index + 1}`}
                      style={{
                        width: "100%",
                        height: readOnly ? "auto" : 140,
                        maxHeight: readOnly ? 520 : 140,
                        objectFit: "contain",
                        display: "block",
                        background: "#f8fafc",
                      }}
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={saveDocument}
            disabled={isSaving}
            className={`pd-btn-save ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSaving ? "Saving..." : mode === "edit" ? "Update" : "Save Transaction"}
          </button>
        </div>
      )}
    </div>
  );
};

export default PhysicalVsSystemStockForm;
