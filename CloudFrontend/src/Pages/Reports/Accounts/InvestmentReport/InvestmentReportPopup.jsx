import React, { useEffect, useState } from 'react';
import { getDataFundtion, createDataFunction } from '../../../../Api/CRUDFunctions';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';

// Store-wise receivable for the Investment Report.
// - BalanceFromAging === true  -> store-wise Invoice Aging for the same dates.
//   Total Recivable = remaining + unused cheque, only amounts above 1.
// - Store 69589f74bed54ca7db54930c -> the Sundry Debtor Balance net, once.
//   Distributor clients only, from 2026-06-30 through the report Date To.
// - Any other non-aging store -> Client Receivable stays 0.
// Each store is handled ONE BY ONE (sequentially) so the server doesn't hang,
// and its row appears in the table as it completes.
// Payable account used for the store-wise Payable column (GernalLager).
const PAYABLE_ACCOUNT = "6883385a52625d01fb5b3fe0";
// Sundry Debtor Balance is company-level. It is shown once, on this store.
const SUNDRY_STORE_ID = "69589f74bed54ca7db54930c";
// One day before 01 July 2026. A start of 2026-07-01 drops 499,710 from the closing.
const SUNDRY_START_DATE = "2026-06-30";

// Store-wise stock value from the stock flow report (same calculation as the
// Stock Flow report popup). StockWithoutTax === true -> value WITHOUT GST
// (TPSale x remainingBoxes); otherwise -> 18% GST added on top
// ((RetailPrice/100 * 18) x remainingBoxes + TPSale x remainingBoxes).
const getStoreStockValue = async (store, startDate, endDate, productMap) => {
  try {
    const url = `/InventoryReport/GetDataByDate?startDate=${startDate}&endDate=${endDate}&status=Post&Store=${store._id}&damage=Fresh`;
    const raw = await getDataFundtion(url);
    // Endpoint returns a plain array (same as StockFlowReport); keep a
    // fallback for a wrapped { data: [...] } response just in case.
    let value = Array.isArray(raw) ? raw : raw?.data || [];
    console.log(`InvestmentReport stock value: ${store.StoreName} (${store._id}) -> rows ${value.length}`);
    // Some stores return 0 rows when filtered by Store on the server even
    // though their data exists (StockFlowReport shows it). Retry without the
    // store filter and pick this store's rows client-side via the Store field.
    if (value.length === 0) {
      const allUrl = `/InventoryReport/GetDataByDate?startDate=${startDate}&endDate=${endDate}&status=Post&Store=&damage=Fresh`;
      const allRaw = await getDataFundtion(allUrl).catch(() => null);
      const allRows = Array.isArray(allRaw) ? allRaw : allRaw?.data || [];
      const storeId = String(store._id);
      value = allRows.filter((r) =>
        String(r.Store || r.store || r.BigStore || r.SmallStore || '') === storeId
      );
      console.log(`InvestmentReport stock value: ${store.StoreName} -> fallback rows ${value.length}`);
    }
    const storeIds = [String(store._id)];

    // Merge raw rows per product (same logic as Stock Flow Report popup)
    const merged = (Array.isArray(value) ? value : []).reduce((acc, item) => {
      const productId = item?.product || item?.productFrom;
      if (!productId) return acc;
      if (!acc.has(productId)) {
        acc.set(productId, {
          productId,
          TotalopenigQty: 0,
          totalPurchaseBoxBefore: 0,
          totalRCBoxBefore: 0,
          totalRCBox: 0,
          TransferInBoxesBefore: 0,
          totalReturnBoxBefore: 0,
          totalDCBox: 0,
          totalDCBoxBefore: 0,
          TransferOutBoxesBefore: 0,
          totalSaleBoxBefore: 0,
          totalPurchaseReturnBoxBefore: 0,
          totalBoxesToReplacementBefore: 0,
          totalBoxesReplacementFrom: 0,
          purchasedBoxes: 0,
          soldBoxes: 0,
          totalReturnBox: 0,
          totalPurchaseReturnBox: 0,
          totalOutBoxes: 0,
          totalInBoxes: 0,
        });
      }
      const current = acc.get(productId);

      if (item?.opneingQty) current.TotalopenigQty += Number(item.opneingQty) || 0;
      if (item?.totalPurchaseBoxBefore) current.totalPurchaseBoxBefore += Number(item.totalPurchaseBoxBefore) || 0;
      if (item?.totalRCBoxBefore) current.totalRCBoxBefore += Number(item.totalRCBoxBefore) || 0;
      if (item?.totalRCBox) current.totalRCBox += Number(item.totalRCBox) || 0;
      if (item?.TransferInBoxesBefore && storeIds.includes(String(item.StoreTo))) current.TransferInBoxesBefore += Number(item.TransferInBoxesBefore) || 0;
      if (item?.totalReturnBoxBefore) current.totalReturnBoxBefore += Number(item.totalReturnBoxBefore) || 0;
      if (item?.totalDCBox) current.totalDCBox += Number(item.totalDCBox) || 0;
      if (item?.totalDCBoxBefore) current.totalDCBoxBefore += Number(item.totalDCBoxBefore) || 0;
      if (item?.TransferOutBoxesBefore && storeIds.includes(String(item.StoreFrom))) current.TransferOutBoxesBefore += Number(item.TransferOutBoxesBefore) || 0;
      if (item?.totalSaleBoxBefore) current.totalSaleBoxBefore += Number(item.totalSaleBoxBefore) || 0;
      if (item?.totalPurchaseReturnBoxBefore) current.totalPurchaseReturnBoxBefore += Number(item.totalPurchaseReturnBoxBefore) || 0;
      if (item?.totalBoxesToReplacementBefore) current.totalBoxesToReplacementBefore += Number(item.totalBoxesToReplacementBefore) || 0;
      if (item?.totalBoxesReplacementFrom) current.totalBoxesReplacementFrom += Number(item.totalBoxesReplacementFrom) || 0;
      if (item?.totalPurchaseBox) current.purchasedBoxes += Number(item.totalPurchaseBox) || 0;
      if (item?.totalSaleBox) current.soldBoxes += Number(item.totalSaleBox) || 0;
      if (item?.totalReturnBox) current.totalReturnBox += Number(item.totalReturnBox) || 0;
      if (item?.totalPurchaseReturnBox) current.totalPurchaseReturnBox += Number(item.totalPurchaseReturnBox) || 0;
      if (item?.totalOutBoxes && storeIds.includes(String(item.StoreFrom))) current.totalOutBoxes += Number(item.totalOutBoxes) || 0;
      if (item?.totalInBoxes && storeIds.includes(String(item.StoreTo))) current.totalInBoxes += Number(item.totalInBoxes) || 0;
      return acc;
    }, new Map());

    let totalValue = 0;
    merged.forEach((item, productId) => {
      const product = productMap.get(productId);
      // Same formula as the Stock Flow report popup: opening + purchases/RC/in/
      // returns - sales - transfer out - DC - replacement - purchase returns.
      const remainingBoxes =
        Number(item.TotalopenigQty || 0 ) +
        Number(item.totalPurchaseBoxBefore || 0) + Number(item.totalRCBoxBefore || 0) + Number(item.TransferInBoxesBefore || 0) + Number(item.totalReturnBoxBefore || 0) -
        Number(item.totalPurchaseReturnBoxBefore || 0) - Number(item.TransferOutBoxesBefore || 0) - Number(item.totalBoxesToReplacementBefore || 0) - Number(item.totalDCBoxBefore || 0) - Number(item.totalSaleBoxBefore || 0) +
        Number(item.totalRCBox || 0) - Number(item.totalDCBox || 0) + Number(item.purchasedBoxes || 0) + Number(item.totalInBoxes || 0) + Number(item.totalReturnBox || 0) -
        Number(item.totalOutBoxes || 0) - Number(item.soldBoxes || 0) - Number(item.totalBoxesReplacementFrom || 0) - Number(item.totalPurchaseReturnBox || 0);

      const tpsale = Number(product?.TPSale || 0);
      if (store?.StockWithoutTax === true) {
        totalValue += tpsale * remainingBoxes;
      } else {
        // NB: product can be undefined for unknown products - guard it so the
        // debug line never throws (a throw here silently zeroes this store).
        console.log((remainingBoxes + tpsale * remainingBoxes), product?.salesFlowRef);
        totalValue += ((Number(product?.RetailPrice || 0) / 100) * 18) * remainingBoxes + tpsale * remainingBoxes;
      }
    });

    console.log(`InvestmentReport stock value: ${store.StoreName} -> value ${totalValue}`);
    return totalValue;
  } catch (err) {
    console.error(`Investment Report: failed to load stock value for ${store.StoreName}`, err);
    return 0;
  }
};

// Current calendar month (1st of this month through today).
const eachReportDay = (startDate, endDate) => {
  const days = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const last = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime()) || cursor > last) return days;
  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    days.push({
      iso: `${year}-${month}-${day}`,
      label: `${day}-${month}-${String(year).slice(2)}`,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

const dayKeyOf = (value) => String(value || '').slice(0, 10);

const getCurrentMonthRange = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${d}` };
};

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const storeKeyOf = (row) => {
  const storeId = row?.Store || row?.store || row?.Department || row?.department
    || row?.BigStore || row?.SmallStore;
  if (!storeId) return '';
  if (typeof storeId === 'object') {
    return String(storeId._id || storeId.value || storeId.id || '');
  }
  return String(storeId);
};

// Sum an amount field per store/department (Store is used as Department).
const sumAmountByStore = (rows, amountKey) => {
  const map = {};
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const storeKey = storeKeyOf(row);
    if (!storeKey) return;
    const amount = Number(row?.[amountKey] ?? row?.Amount ?? row?.NetAmount ?? row?.netAmount) || 0;
    map[storeKey] = (map[storeKey] || 0) + amount;
  });
  return map;
};

const MONTH_SALE_SOURCE = 'invoiceSummaryWithoutCal_separate';
const AGING_SOURCE = 'invoiceAgingSameDates';
const LEDGER_SOURCE = 'sundryOnStore69589f74bed54ca7db54930c';

const hasCurrentReportShape = (reportRows) =>
  Array.isArray(reportRows)
  && reportRows.some((r) => r.monthSaleSource === MONTH_SALE_SOURCE)
  && reportRows.some((r) => r.agingSource === AGING_SOURCE)
  && reportRows.some((r) => r.ledgerSource === LEDGER_SOURCE);

// Same remaining + unused-cheque amount as Invoice Aging (amount > 1 is counted).
const invoiceAgingAmount = (row, chqByInvoice) => {
  const remaining = Number(
    row?.RemainingAmount ?? row?.RemaingAmount ?? row?.Remaining ??
    (Number(row?.Amount || 0) - Number(row?.RecivedAmount || 0))
  ) || 0;
  const inv = row?.SalesInvoice || row?.Invoice || row?.DitributorInvoiceCode;
  const chq = inv != null && inv !== '' ? (Number(chqByInvoice[String(inv)]) || 0) : 0;
  return remaining + chq;
};

const InvestmentReportPopup = ({ filterData = {}, title = "Investment Report", betweenDates = false }) => {
  const { startDate, endDate } = filterData
  console.log(filterData)
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const [baseReportDate, setBaseReportDate] = useState('');
  const [dayReports, setDayReports] = useState([]);
  const monthRange = getCurrentMonthRange();
  const periodRange = betweenDates ? { start: startDate, end: endDate } : monthRange;
  const purchaseLabel = betweenDates ? 'Purchase' : 'Current Month Purchase';
  const saleLabel = betweenDates ? 'Sale' : 'Current Month Sale';

  // --- Daily report cache helpers (localStorage) ---
  // Report aaj ki date wali key ke under save hoti hai. Pehli baar ban-ne par
  // save, usi din dobara kholein to wahi saved report show, agle din naya
  // generate ho kar save hoti hai.
  const CACHE_PREFIX = 'investmentReport_';

  const getTodayKey = () => {
    const d = new Date();
    return `${CACHE_PREFIX}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const loadCachedReport = () => {
    try {
      const key = getTodayKey();
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  };

  const saveReportToCache = (data) => {
    try {
      const key = getTodayKey();
      // Purani dates ki cached reports delete kar do - sirf aaj ki report rehti hai
      Object.keys(localStorage)
        .filter((k) => k.startsWith(CACHE_PREFIX) && k !== key)
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(key, JSON.stringify({
        ...data,
        savedAt: new Date().toISOString(),
      }));
    } catch (err) { console.warn('Failed to cache report:', err); }
  };

  const fetchBetweenReport = async () => {
    setIsLoading(true);
    setError('');
    setRows([]);
    setDayReports([]);
    try {
      const serverRes = await getDataFundtion('/SavedInvestmentReport/latest');
      const savedReport = Array.isArray(serverRes) ? serverRes[0] : serverRes?.data;
      const savedRows = Array.isArray(savedReport?.rows) ? savedReport.rows : [];
      if (!savedRows.length) {
        setError('No saved Investment Report found. Generate the Investment Report first. Between uses that saved data as its base.');
        return;
      }
      setBaseReportDate(savedReport?.reportDate || '');
      const savedTime = savedReport?.updatedAt || savedReport?.createdAt;
      setGeneratedAt(savedTime ? new Date(savedTime) : null);
      setLoadedFromCache(true);
      setRows(savedRows);

      const storeRes = await getDataFundtion('/store/OnlyActive').catch(() => null);
      const stores = storeRes?.data || [];
      const nameById = new Map(stores.map((store) => [String(store._id), store.StoreName]));
      const baseByName = new Map(
        savedRows.map((row) => [String(row?.name || '').trim().toLowerCase(), row])
      );
      const storeList = savedRows.map((row) => ({
        id: stores.find((store) => String(store.StoreName || '').trim().toLowerCase() === String(row?.name || '').trim().toLowerCase())?._id || '',
        name: row.name,
      }));
      stores.forEach((store) => {
        const known = storeList.some((item) => String(item.name || '').trim().toLowerCase() === String(store.StoreName || '').trim().toLowerCase());
        if (!known) storeList.push({ id: store._id, name: store.StoreName });
      });

      const days = eachReportDay(startDate, endDate);
      const collected = [];
      for (let index = 0; index < days.length; index += 1) {
        const day = days[index];
        setProgress(`Loading ${day.label} (${index + 1}/${days.length}) for all stores...`);
        let purchaseRows = [];
        let saleRows = [];
        try {
          const [purchaseRes, saleRes] = await Promise.all([
            getDataFundtion(`inventoryReport/PurchaseSummry?startDate=${day.iso}&endDate=${day.iso}`),
            getDataFundtion(`/SaleInvoice/SalesinvoiceSummry?startDate=${day.iso}&endDate=${day.iso}`),
          ]);
          purchaseRows = unwrapList(purchaseRes);
          saleRows = unwrapList(saleRes);
        } catch (err) {
          console.error(`Investment Report Between failed for ${day.label}`, err);
        }
        const purchaseByStore = {};
        purchaseRows.forEach((row) => {
          const key = storeKeyOf(row);
          if (!key) return;
          purchaseByStore[key] = (purchaseByStore[key] || 0) + (Number(row?.TotalAmount) || 0);
        });
        const saleByStore = {};
        saleRows.forEach((row) => {
          const key = storeKeyOf(row);
          if (!key) return;
          saleByStore[key] = (saleByStore[key] || 0) + (Number(row?.TotalAmount || row?.Amount) || 0);
        });
        const dayStores = storeList.map((store) => {
          const base = baseByName.get(String(store.name || '').trim().toLowerCase());
          const storeId = String(store.id || '');
          return {
            name: store.name || nameById.get(storeId) || 'Store',
            purchase: purchaseByStore[storeId] || 0,
            sale: saleByStore[storeId] || 0,
            receivable: Number(base?.total) || 0,
            ledger: Number(base?.payable) || 0,
            stock: Number(base?.stockValue) || 0,
          };
        });
        collected.push({ ...day, stores: dayStores });
        setDayReports([...collected]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load day-wise report: ' + (err?.message || err));
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  };

  const fetchReport = async (force = false) => {
      if (betweenDates) {
        await fetchBetweenReport();
        return;
      }
      // --- Check saved reports first: if today's report already exists, load it ---
      // Pehle SERVER se check karo (sab users ke liye ek hi daily report), phir
      // fallback ke tor par localStorage.
      if (!force && !betweenDates) {
        try {
          const serverRes = await getDataFundtion('/SavedInvestmentReport/latest');
          const savedReport = Array.isArray(serverRes) ? serverRes[0] : serverRes?.data;
          if (savedReport && Array.isArray(savedReport.rows) && savedReport.rows.length > 0
              && hasCurrentReportShape(savedReport.rows)) {
            console.log('InvestmentReport: Loading today\'s saved report from server', savedReport.reportDate);
            setRows(savedReport.rows);
            const savedTime = savedReport.updatedAt || savedReport.createdAt;
            setGeneratedAt(savedTime ? new Date(savedTime) : null);
            setLoadedFromCache(true);
            setIsLoading(false);
            return; // skip fetching - aaj ki report pehle se saved hai
          }
        } catch (err) {
          console.warn('InvestmentReport: server saved-report fetch failed, falling back to local cache', err);
        }
        const cached = loadCachedReport();
        if (cached && Array.isArray(cached.rows) && cached.rows.length > 0
            && hasCurrentReportShape(cached.rows)) {
          console.log('InvestmentReport: Loading from today\'s local cache', getTodayKey());
          setRows(cached.rows);
          setGeneratedAt(cached.savedAt ? new Date(cached.savedAt) : null);
          setLoadedFromCache(true);
          setIsLoading(false);
          return; // skip fetching - aaj ki report pehle se saved hai
        }
      }

      setIsLoading(true);
      setError('');
      try {
        // Same date basis as the Invoice Aging report & Dashboard:
        // aging outstanding counted from 2020-07-01 up to the selected end date,
        // current FY (July-June) receivable from the start of the financial year.
        const now = new Date();
        const fyYear = now.getMonth() + 1 >= 7 ? now.getFullYear() : now.getFullYear() - 1;
        const fyStart = `${fyYear}-07-01`;
        // Avoid an inverted ledger range when the selected end date is before
        // the current financial year start.
        const debtorStart = betweenDates ? startDate : (fyStart <= endDate ? fyStart : startDate);
        const sundryStart = betweenDates ? startDate : SUNDRY_START_DATE;
        const currentMonth = getCurrentMonthRange();
        const activityRange = betweenDates
          ? { start: startDate, end: endDate }
          : currentMonth;

        const storeRes = await getDataFundtion('/store/OnlyActive').catch(() => null);
        const stores = storeRes?.data || [];

        // Product map for the store-wise Stock value (TPSale / RetailPrice).
        const productRes = await getDataFundtion('/Product').catch(() => null);
        const productMap = new Map((productRes?.data || []).map((p) => [p._id, p]));

        // Current month Purchase (Purchase Report Summary API), department-wise.
        // Sale is fetched per store below (same API as Sales Invoice Summary
        // Without Calculation) so it matches that report exactly.
        setProgress(betweenDates ? 'Loading purchase for the selected dates...' : 'Loading current month purchase...');
        const { start: monthStart, end: monthEnd } = activityRange;
        let monthPurchaseByStore = {};
        try {
          const purchaseRes = await getDataFundtion(
            `inventoryReport/PurchaseSummry?startDate=${monthStart}&endDate=${monthEnd}`
          );
          monthPurchaseByStore = sumAmountByStore(unwrapList(purchaseRes), 'TotalAmount');
        } catch (err) {
          console.error('Investment Report: failed to load current month purchase', err);
        }

        // Same net as Sundry Debtor Balance: group by client only (not by store),
        // distributor _id only, then Opening + OpeningDebit + debit - credit - OpeningCredit.
        // Debit/Credit use Number() before any comma strip, matching that report.
        let sundryReceivable = 0;
        try {
          const distributorRes = await getDataFundtion("/Distrbutor");
          const distributorList = Array.isArray(distributorRes)
            ? distributorRes
            : distributorRes?.data || [];
          const distributorIds = new Set(
            distributorList.map((d) => String(d?._id || "")).filter(Boolean)
          );
          const debtor = await getDataFundtion(
            `GernalLager/DebtorBalance/?startDate=${sundryStart}&endDate=${endDate}`
          );
          const debtorRows = Array.isArray(debtor) ? debtor : debtor?.data || [];
          const clientBalances = new Map();
          debtorRows.forEach((item) => {
            const clientId = String(item?.Client?._id || item?.Client || "");
            if (!distributorIds.has(clientId)) return;
            const debit = Number((Number(item?.Debit) || 0).toString().replace(/,/g, ""));
            const credit = Number((Number(item?.Credit) || 0).toString().replace(/,/g, ""));
            if (!clientBalances.has(clientId)) {
              clientBalances.set(clientId, {
                Opening: 0,
                OpeningDebit: 0,
                OpeningCredit: 0,
                totalDebit: 0,
                totalCredit: 0,
              });
            }
            const bal = clientBalances.get(clientId);
            if (item.Type === "VoucherBefore") {
              bal.OpeningDebit += debit;
              bal.OpeningCredit += credit;
            } else {
              bal.totalDebit += debit;
              bal.totalCredit += credit;
            }
          });
          clientBalances.forEach((bal) => {
            sundryReceivable +=
              bal.Opening + bal.OpeningDebit + bal.totalDebit -
              bal.totalCredit - bal.OpeningCredit;
          });
        } catch (err) {
          console.error('Investment Report: failed to load sundry debtor balance', err);
        }

        // Outstanding cheques (same as the Invoice Aging report) so each aging
        // store's total matches the aging report's "Total Recivable".
        const selectedClients = new Set(
          (filterData.Customer || []).map((c) => String(c.value)).filter(Boolean)
        );
        const allChqs = await getDataFundtion('/CustomerChqRecived/Allunused').catch(() => []);
        const chqByInvoice = (Array.isArray(allChqs) ? allChqs : allChqs?.data || [])
          .filter((item) => item.Invoice !== undefined && item.Invoice !== null && item.Invoice !== '')
          .reduce((m, c) => {
            const inv = String(c.Invoice);
            m[inv] = (m[inv] || 0) + (Number(c.Amount) || 0);
            return m;
          }, {});

        const results = [];
        for (let i = 0; i < stores.length; i++) {
          const st = stores[i];
          const isAging = st.BalanceFromAging === true;
          setProgress(`Loading ${st.StoreName} (${i + 1}/${stores.length})...`);
          try {
            let total = 0;
            let basis = 'Ledger (Current FY)';
            if (String(st._id) === SUNDRY_STORE_ID) {
              total = sundryReceivable;
              basis = 'Sundry Debtor Balance';
            } else if (isAging) {
              // Same store-wise call and Total Recivable as Invoice Aging.
              const aging = await getDataFundtion(
                `/SaleInvoice/getOnlyInvoiceAging?startDate=${startDate}&endDate=${endDate}&store=${st._id}`
              );
              const rowsArr = unwrapList(aging);
              total = rowsArr.reduce((sum, row) => {
                const storeId = row.Store || row.store;
                if (storeId && String(storeId) !== String(st._id)) return sum;
                const clientId = String(row.Client || row.Distrbutor || '');
                if (selectedClients.size > 0 && !selectedClients.has(clientId)) return sum;
                if (filterData.withRemarks === 'without' && String(row.Remarks || '').trim()) return sum;
                const recivable = invoiceAgingAmount(row, chqByInvoice);
                return recivable > 1 ? sum + recivable : sum;
              }, 0);
              basis = 'Invoice Aging';
            }

            // Store-wise Payable: GernalLager for the payable account, credit side.
            let payable = 0;
            try {
              const ledger = await getDataFundtion(
                `GernalLager?startDate=${debtorStart}&endDate=${endDate}&Account=${PAYABLE_ACCOUNT}&Store=${st._id}`
              );
              const ledgerRows = Array.isArray(ledger) ? ledger : ledger?.data || [];
              let openingDebit = 0, openingCredit = 0, debit = 0, credit = 0;
              ledgerRows.forEach((r) => {
                const d = Number(r.Debit) || 0;
                const c = Number(r.Credit) || 0;
                if (r.Type === "VoucherBefore") {
                  openingDebit += d;
                  openingCredit += c;
                } else {
                  debit += d;
                  credit += c;
                }
              });
              payable =  (openingDebit + debit) - (openingCredit + credit);
            } catch (err) {
              console.error(`Investment Report: failed to load payable for ${st.StoreName}`, err);
            }
            // Store-wise Stock value (stock flow report basis, FY start to endDate)
            const stockValue = await getStoreStockValue(st, debtorStart, endDate, productMap);

            let monthSale = 0;
            try {
              const storeSalesRes = await getDataFundtion(
                `/SaleInvoice/SalesinvoiceSummry?startDate=${monthStart}&endDate=${monthEnd}&Store=${st._id}`
              );
              monthSale = unwrapList(storeSalesRes).reduce(
                (sum, row) => sum + (Number(row.TotalAmount || row.Amount) || 0),
                0
              );
            } catch (err) {
              console.error(`Investment Report: failed to load current month sale for ${st.StoreName}`, err);
            }

            results.push({
              id: results.length + 1,
              name: st.StoreName,
              total,
              basis,
              payable,
              stockValue,
              monthPurchase: monthPurchaseByStore[String(st._id)] || 0,
              monthSale,
              monthSaleSource: MONTH_SALE_SOURCE,
              agingSource: AGING_SOURCE,
              ledgerSource: LEDGER_SOURCE,
            });
          } catch (err) {
            console.error(`Investment Report: failed for ${st.StoreName}`, err);
            results.push({
              id: results.length + 1,
              name: st.StoreName,
              total: 0,
              basis: 'Failed',
              failed: true,
              monthPurchase: monthPurchaseByStore[String(st._id)] || 0,
              monthSale: 0,
              monthSaleSource: MONTH_SALE_SOURCE,
              agingSource: AGING_SOURCE,
              ledgerSource: LEDGER_SOURCE,
            });
          }
          // Update the table after every store so totals appear one by one
          setRows([...results]);
        }
        setProgress('');
        if (!betweenDates) {
          // Daily snapshot only. A between-date run must not replace today's saved report.
          saveReportToCache({ rows: [...results], startDate, endDate });
          createDataFunction('/SavedInvestmentReport/save', { rows: [...results], startDate, endDate })
            .catch((err) => console.warn('InvestmentReport: failed to save report on server', err));
        }
        setGeneratedAt(new Date());
        setLoadedFromCache(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load report: " + (err?.message || err));
      } finally {
        setIsLoading(false);
        setProgress('');
      }
  };

  useEffect(() => {
    fetchReport(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grandTotal = rows.filter(r => !r.failed).reduce((s, r) => s + (Number(r.total) || 0), 0);
  const grandPayable = rows.filter(r => !r.failed).reduce((s, r) => s + (Number(r.payable) || 0), 0);
  const grandStock = rows.filter(r => !r.failed).reduce((s, r) => s + (Number(r.stockValue) || 0), 0);
  const grandMonthPurchase = rows.reduce((s, r) => s + (Number(r.monthPurchase) || 0), 0);
  const grandMonthSale = rows.reduce((s, r) => s + (Number(r.monthSale) || 0), 0);
  const grandInvestment = rows.filter(r => !r.failed).reduce((s, r) => s + (Number(r.total) || 0) + (Number(r.payable) || 0) + (Number(r.stockValue) || 0), 0);

  const exportToExcel = async () => {
    if (betweenDates) {
      if (!dayReports.length) return;
      const excelRows = [];
      dayReports.forEach((day) => {
        day.stores.forEach((store) => {
          excelRows.push({
            Date: day.label,
            Store: store.name,
            Purchase: store.purchase,
            Sale: store.sale,
            Receivable: store.receivable,
            'Ledger Balance': store.ledger,
            'Stock Value': store.stock,
            Investment: store.receivable + store.ledger + store.stock,
          });
        });
      });
      try {
        await exportProfessionalExcel({
          title: 'Investment Report Between',
          fileName: 'Investment_Report_Between',
          sheets: [{
            name: 'Day Wise',
            title: 'All stores, one day at a time',
            rows: excelRows,
            meta: [`${startDate} to ${endDate}`, `Saved investment base: ${baseReportDate || ''}`],
          }],
        });
      } catch (err) {
        console.error('Excel export error:', err);
      }
      return;
    }
    if (!rows.length) return;
    try {
      const investmentRows = rows.map((row, index) => {
        const receivable = Number(row.total) || 0;
        const payable = Number(row.payable) || 0;
        const stockValue = Number(row.stockValue) || 0;
        return {
          'Sr No': index + 1,
          'Store': row.name || '',
          'Receivable': receivable,
          'Payable': payable,
          'Stock Value': stockValue,
          'Investment': receivable + payable + stockValue,
        };
      });
      const monthRows = rows.map((row, index) => ({
        'Sr No': index + 1,
        'Store': row.name || '',
        [purchaseLabel]: Number(row.monthPurchase) || 0,
        [saleLabel]: Number(row.monthSale) || 0,
      }));

      await exportProfessionalExcel({
        title: 'Investment Report',
        fileName: 'Investment_Report',
        excludeKeys: ['_id', 'id'],
        sheets: [
          {
            name: 'Investment',
            title: 'Investment Report',
            rows: investmentRows,
            meta: [`Period: ${startDate || ''} to ${endDate || ''}`],
            totals: {
              Store: 'TOTAL',
              Receivable: grandTotal,
              Payable: grandPayable,
              'Stock Value': grandStock,
              Investment: grandInvestment,
            },
          },
          {
            name: betweenDates ? 'Purchase Sale' : 'Current Month',
            title: betweenDates ? 'Purchase & Sale' : 'Current Month Purchase & Sale',
            rows: monthRows,
            meta: [`${betweenDates ? 'Period' : 'Current Month'}: ${periodRange.start} to ${periodRange.end}`],
            totals: {
              Store: 'TOTAL',
              [purchaseLabel]: grandMonthPurchase,
              [saleLabel]: grandMonthSale,
            },
          },
        ],
      });
    } catch (err) {
      console.error('Excel export error:', err);
    }
  };
  // Never render "NaN" - show 0.00 for anything non-numeric.
  const fmt = (n) => {
    const num = Number(n);
    return Number.isFinite(num)
      ? num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0.00';
  };

  if (betweenDates) {
    return (
      <div style={{ fontFamily: "'Segoe UI', Roboto, 'Oxygen', Ubuntu, sans-serif", background: '#f8fafc', minHeight: '100vh', padding: 24 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', borderRadius: 14, padding: '22px 26px', color: '#fff', marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: 24 }}>{title}</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.9 }}>
              One day at a time, for every store. Investment figures stay from the saved report dated {baseReportDate || '—'}. Purchase and Sale are that day's figures.
            </p>
            <div style={{ marginTop: 8, fontSize: 13 }}>{startDate} → {endDate}{progress ? ` · ${progress}` : ''}</div>
            <button type="button" disabled={!dayReports.length} onClick={exportToExcel} style={{ marginTop: 12, padding: '6px 14px', background: '#217346', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: dayReports.length ? 'pointer' : 'not-allowed' }}>Download Excel</button>
          </div>
          {error && <div style={{ marginBottom: 14, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10 }}>{error}</div>}
          {isLoading && <div style={{ marginBottom: 14, padding: 12, background: '#eff6ff', color: '#1d4ed8', borderRadius: 10 }}>{progress || 'Loading the first day...'}</div>}
          {dayReports.map((day) => {
            const purchaseTotal = day.stores.reduce((sum, store) => sum + store.purchase, 0);
            const saleTotal = day.stores.reduce((sum, store) => sum + store.sale, 0);
            return (
              <div key={day.iso} style={{ marginBottom: 22 }}>
                <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#0f172a' }}>{day.label}</h2>
                <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr>
                        {['Store', 'Purchase', 'Sale', 'Client Receivable', 'Ledger Balance', 'Stock Value', 'Total Investment'].map((heading) => (
                          <th key={heading} style={{ background: '#1e3a8a', color: '#fff', padding: '10px 12px', textAlign: heading === 'Store' ? 'left' : 'right' }}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {day.stores.map((store) => (
                        <tr key={`${day.iso}-${store.name}`}>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #eef2f7', fontWeight: 600 }}>{store.name}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(store.purchase)}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(store.sale)}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(store.receivable)}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(store.ledger)}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(store.stock)}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(store.receivable + store.ledger + store.stock)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>Total</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(purchaseTotal)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(saleTotal)}</td>
                        <td colSpan={4} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', Roboto, 'Oxygen', Ubuntu, sans-serif", background: 'linear-gradient(160deg, #eef2ff 0%, #f8fafc 45%, #f1f5f9 100%)', minHeight: '100vh', padding: '24px' }}>
      <style>{`
        @keyframes pd-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 55%, #6366f1 100%)',
          borderRadius: 14,
          padding: '24px 28px',
          color: '#fff',
          boxShadow: '0 10px 30px rgba(37, 99, 235, 0.22)',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: -24, top: -46, fontSize: 150, opacity: 0.12, transform: 'rotate(12deg)', pointerEvents: 'none' }}>📊</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: 0.4 }}>{title}</h1>
              <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.85 }}>{betweenDates ? 'Store-wise figures for the selected dates. Purchase and Sale use the same Date From and Date To.' : 'Store-wise Client Receivable, Ledger Balance & Stock Value. Current Month Purchase & Sale are shown separately below.'}</p>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, opacity: 0.92 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Period: {startDate} → {endDate}</div>
              <div>Generated: {(generatedAt || new Date()).toLocaleString()}{loadedFromCache ? ' (saved)' : ''}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  if (!betweenDates) {
                    try { localStorage.removeItem(getTodayKey()); } catch { /* ignore */ }
                  }
                  fetchReport(true);
                }}
                style={{
                  padding: '5px 14px',
                  background: '#fff',
                  color: '#1e3a8a',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {betweenDates ? 'Regenerate' : "Regenerate Today's Report"}
              </button>
              <button
                type="button"
                disabled={!rows.length}
                onClick={exportToExcel}
                style={{
                  padding: '5px 14px',
                  background: '#217346',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: rows.length ? 'pointer' : 'not-allowed',
                  opacity: rows.length ? 1 : 0.6
                }}
              >
                Download Excel
              </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPI summary cards */}
        {rows.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div style={{ background: 'linear-gradient(135deg, #047857, #10b981)', borderRadius: 12, padding: '16px 18px', color: '#fff', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.85 }}>Total Client Receivable</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{fmt(grandTotal)}</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #b45309, #f59e0b)', borderRadius: 12, padding: '16px 18px', color: '#fff', boxShadow: '0 8px 20px rgba(245, 158, 11, 0.25)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.85 }}>Total Ledger Balance</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{fmt(grandPayable)}</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #6366f1)', borderRadius: 12, padding: '16px 18px', color: '#fff', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.25)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.85 }}>Total Stock Value</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{fmt(grandStock)}</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ margin: '0 0 14px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, fontSize: 14 }}>{error}</div>
        )}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#1d4ed8', fontSize: 14, fontWeight: 500 }}>
            <div style={{ width: 18, height: 18, border: '3px solid #bfdbfe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'pd-spin 0.8s linear infinite' }} />
            {progress || 'Loading report...'}
          </div>
        )}

        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', padding: '13px 16px', textAlign: 'left', fontWeight: 600, letterSpacing: 0.3, borderBottom: '3px solid #1d4ed8', whiteSpace: 'nowrap' }}>Metric</th>
                {rows.map((row) => (
                  <th key={row.id} style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', padding: '13px 16px', textAlign: 'right', fontWeight: 600, letterSpacing: 0.3, borderBottom: '3px solid #1d4ed8', whiteSpace: 'nowrap' }}>{row.name}</th>
                ))}
                {rows.length > 0 && (
                  <th style={{ background: 'linear-gradient(135deg, #0f172a, #334155)', color: '#fff', padding: '13px 16px', textAlign: 'right', fontWeight: 700, borderBottom: '3px solid #0f172a', whiteSpace: 'nowrap' }}>TOTAL</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan="1" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    {error ? 'Failed to load report' : 'No stores found'}
                  </td>
                </tr>
              ) : (
                <>
                  {/* Client Recivable row */}
                  <tr>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#047857', background: '#ecfdf5' }}>Client Recivable</td>
                    {rows.map((row) => (
                      <td key={row.id} style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: "'Courier New', Courier, monospace", fontWeight: 600, color: row.failed ? '#dc2626' : (((Number(row.total) || 0) < 0) ? '#dc2626' : '#334155') }}>
                        {row.failed ? 'Failed' : fmt(Number(row.total) || 0)}
                      </td>
                    ))}
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontWeight: 700, fontFamily: "'Courier New', Courier, monospace", color: '#047857', background: '#ecfdf5' }}>{fmt(grandTotal)}</td>
                  </tr>
                  {/* Ledger Balance row */}
                  <tr>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#b45309', background: '#fffbeb' }}>Ledger Balance</td>
                    {rows.map((row) => (
                      <td key={row.id} style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: "'Courier New', Courier, monospace", fontWeight: 600, color: row.failed ? '#dc2626' : (((Number(row.payable) || 0) < 0) ? '#dc2626' : '#334155') }}>
                        {row.failed ? 'Failed' : fmt(Number(row.payable) || 0)}
                      </td>
                    ))}
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontWeight: 700, fontFamily: "'Courier New', Courier, monospace", color: '#b45309', background: '#fffbeb' }}>{fmt(grandPayable)}</td>
                  </tr>
                  {/* Stock value row */}
                  <tr>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#1d4ed8', background: '#eff6ff' }}>Stock value</td>
                    {rows.map((row) => (
                      <td key={row.id} style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: "'Courier New', Courier, monospace", fontWeight: 600, color: row.failed ? '#dc2626' : (((Number(row.stockValue) || 0) < 0) ? '#dc2626' : '#334155') }}>
                        {row.failed ? 'Failed' : fmt(Number(row.stockValue) || 0)}
                      </td>
                    ))}
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontWeight: 700, fontFamily: "'Courier New', Courier, monospace", color: '#1d4ed8', background: '#eff6ff' }}>{fmt(grandStock)}</td>
                  </tr>
                  {/* Claim Reciveable row */}
                  <tr>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#be185d', background: '#fdf2f8' }}>Claim Reciveable</td>
                    {rows.map((row) => (
                      <td key={row.id} style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: "'Courier New', Courier, monospace", fontWeight: 600, color: '#334155' }}>
                        0
                      </td>
                    ))}
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontWeight: 700, fontFamily: "'Courier New', Courier, monospace", color: '#be185d', background: '#fdf2f8' }}>0</td>
                  </tr>
                  {/* Total Investment row: receivable + ledger + stock (purchase/sale excluded) */}
                  <tr>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#0f172a', background: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>Total Investment</td>
                    {rows.map((row) => {
                      const investment = (Number(row.total) || 0) + (Number(row.payable) || 0) + (Number(row.stockValue) || 0);
                      return (
                        <td key={row.id} style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: "'Courier New', Courier, monospace", fontWeight: 700, color: row.failed ? '#dc2626' : (investment < 0 ? '#dc2626' : '#0f172a'), background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                          {row.failed ? 'Failed' : fmt(investment)}
                        </td>
                      );
                    })}
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontWeight: 700, fontFamily: "'Courier New', Courier, monospace", color: '#0f172a', background: '#e2e8f0', borderTop: '2px solid #cbd5e1' }}>{fmt(grandInvestment)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Current Month Purchase & Sale — separate from investment totals */}
        {rows.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{betweenDates ? 'Purchase & Sale' : 'Current Month Purchase & Sale'}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Department-wise figures for {periodRange.start} → {periodRange.end}. Not included in Total Investment.</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
              <div style={{ background: 'linear-gradient(135deg, #6d28d9, #a855f7)', borderRadius: 12, padding: '16px 18px', color: '#fff', boxShadow: '0 8px 20px rgba(168, 85, 247, 0.25)' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.85 }}>{purchaseLabel}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{fmt(grandMonthPurchase)}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{periodRange.start} → {periodRange.end}</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)', borderRadius: 12, padding: '16px 18px', color: '#fff', boxShadow: '0 8px 20px rgba(20, 184, 166, 0.25)' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.85 }}>{saleLabel}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{fmt(grandMonthSale)}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{periodRange.start} → {periodRange.end}</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: '#fff', padding: '13px 16px', textAlign: 'left', fontWeight: 600, letterSpacing: 0.3, borderBottom: '3px solid #5b21b6', whiteSpace: 'nowrap' }}>Metric</th>
                    {rows.map((row) => (
                      <th key={row.id} style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: '#fff', padding: '13px 16px', textAlign: 'right', fontWeight: 600, letterSpacing: 0.3, borderBottom: '3px solid #5b21b6', whiteSpace: 'nowrap' }}>{row.name}</th>
                    ))}
                    <th style={{ background: 'linear-gradient(135deg, #0f172a, #334155)', color: '#fff', padding: '13px 16px', textAlign: 'right', fontWeight: 700, borderBottom: '3px solid #0f172a', whiteSpace: 'nowrap' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#6d28d9', background: '#f5f3ff' }}>{purchaseLabel}</td>
                    {rows.map((row) => (
                      <td key={row.id} style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: "'Courier New', Courier, monospace", fontWeight: 600, color: ((Number(row.monthPurchase) || 0) < 0) ? '#dc2626' : '#334155' }}>
                        {fmt(Number(row.monthPurchase) || 0)}
                      </td>
                    ))}
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontWeight: 700, fontFamily: "'Courier New', Courier, monospace", color: '#6d28d9', background: '#f5f3ff' }}>{fmt(grandMonthPurchase)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#0f766e', background: '#f0fdfa' }}>{saleLabel}</td>
                    {rows.map((row) => (
                      <td key={row.id} style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontFamily: "'Courier New', Courier, monospace", fontWeight: 600, color: ((Number(row.monthSale) || 0) < 0) ? '#dc2626' : '#334155' }}>
                        {fmt(Number(row.monthSale) || 0)}
                      </td>
                    ))}
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontWeight: 700, fontFamily: "'Courier New', Courier, monospace", color: '#0f766e', background: '#f0fdfa' }}>{fmt(grandMonthSale)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
          <strong style={{ color: '#334155' }}>Notes:</strong> {betweenDates
            ? `Every figure uses ${startDate} to ${endDate}. Client Recivable for store 69589f74bed54ca7db54930c is the Sundry Debtor Balance net for distributor clients in that range. Aging stores use Invoice Aging (remaining + unused cheque, amount > 1) for the same dates. Ledger Balance and Stock value also use Date From to Date To. Purchase is Purchase Report Summary and Sale is Sales Invoice Summary Without Calculation for those dates. Purchase and Sale are not part of Total Investment.`
            : `Client Recivable for store 69589f74bed54ca7db54930c is the Sundry Debtor Balance net (distributor clients only, from 2026-06-30 to "Date To"). Aging stores use Invoice Aging (remaining + unused cheque, amount > 1, for the selected dates). Other stores' Client Recivable is 0. Ledger Balance = current FY general ledger balance for the payable account. Stock value = stock flow report basis (FY start to "Date To") - stores with StockWithoutTax use the value without GST, other stores get 18% added on top. Current Month Purchase & Sale are shown in a separate table (not part of Total Investment). Purchase = Purchase Report Summary (department-wise TotalAmount from ${monthRange.start} to ${monthRange.end}). Sale = Sales Invoice Summary Without Calculation (department-wise invoice TotalAmount from ${monthRange.start} to ${monthRange.end}).`}
        </div>
      </div>
    </div>
  );
};

export default InvestmentReportPopup;