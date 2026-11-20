// import React, { useEffect, useState } from 'react'
// import { getDataFundtion } from '../../Api/CRUDFunctions'

// const adminId = "687e14a624a274d5e844be49"

// const InvestmentReport = () => {
//   const [rows, setRows] = useState([])
//   const [loading, setLoading] = useState(true)

//   const formatDate = (date) => {
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, '0');
//     const day = String(date.getDate()).padStart(2, '0');
//     return `${year}-${month}-${day}`;
//   };

//   const getData = async () => {
//     try {
//       setLoading(true);

//       const now = new Date();
//       const today = formatDate(now);

//       // Current financial year (July – June)
//       const fyYear = now.getMonth() + 1 >= 7 ? now.getFullYear() : now.getFullYear() - 1;
//       const fyStart = `${fyYear}-07-01`;
//       const agingStart = "2020-07-01";

//       const Store = await getDataFundtion("/Store");
//       const adminRes = await getDataFundtion(`/Administrative/get/${adminId}`);
//       const clientAccount = adminRes?.data?.Client;
//       const vendorAccount = adminRes?.data?.Vendor;

//       // Product map for stock valuation
//       const productRes = await getDataFundtion('/Product');
//       const productMap = new Map((productRes?.data || []).map((p) => [p._id, p]));

//       // Outstanding cheque map (same as the Invoice Aging report) so the
//       // aging-based receivable includes cheque amounts exactly like the report.
//       // Only needed when at least one store is aging-based.
//       const hasAgingStores = (Store.data || []).some(s => s.BalanceFromAging === true);
//       const chqByInvoice = hasAgingStores
//         ? (await getDataFundtion('/CustomerChqRecived/Allunused').catch(() => []))
//             .filter(item => item.Invoice !== undefined)
//             .reduce((m, c) => {
//               const inv = String(c.Invoice);
//               m[inv] = (m[inv] || 0) + (Number(c.Amount) || 0);
//               return m;
//             }, {})
//         : {};

//       const data = await Promise.all(
//         (Store.data || []).map(async (store) => {
//           const [Stock, Vendor, Receivable] = await Promise.all([
//             getStoreStockValue(store, fyStart, today, productMap),
//             getStoreLedgerBalance(store, fyStart, today, vendorAccount, "credit"),
//             store?.BalanceFromAging === true
//               ? getStoreAgingBalance(store, agingStart, today, chqByInvoice)
//               : getStoreLedgerBalance(store, fyStart, today, clientAccount, "debit"),
//           ]);
//           return {
//             id: store._id,
//             name: store.StoreName,
//             Stock,
//             Vendor,
//             Receivable,
//           };
//         })
//       );

//       setRows(data);
//     } catch (err) {
//       console.error("Error fetching data:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     getData();
//   }, []);

//   const formatValue = (val) => {
//     const num = parseFloat(val);
//     if (isNaN(num)) return "-";
//     return num.toLocaleString('en-US', {
//       minimumFractionDigits: 3,
//       maximumFractionDigits: 3,
//     });
//   };

//   return (
//     <div className="p-4">
//       <h1 className="text-2xl font-bold mb-4">Store-wise Investment Dashboard</h1>

//       {loading ? (
//         <div className="flex justify-center items-center h-64">
//           <div>Loading data...</div>
//         </div>
//       ) : (
//         <div className="overflow-x-auto">
//           <table className="pd-data-table">
//             <thead>
//               <tr>
//                 <th className="py-3 px-4 border-b text-left font-semibold">Store Name</th>
//                 <th className="py-3 px-4 border-b text-left font-semibold">Stock</th>
//                 <th className="py-3 px-4 border-b text-left font-semibold">Vendor</th>
//                 <th className="py-3 px-4 border-b text-left font-semibold">Receivable</th>
//               </tr>
//             </thead>
//             <tbody>
//               {rows.map((row, index) => (
//                 <tr key={index}>
//                   <td className="py-3 px-4 border-b font-medium">{row.name}</td>
//                   <td className="py-3 px-4 border-b">{formatValue(row.Stock)}</td>
//                   <td className="py-3 px-4 border-b">{formatValue(row.Vendor)}</td>
//                   <td className="py-3 px-4 border-b">{formatValue(row.Receivable)}</td>
//                 </tr>
//               ))}
//             </tbody>
//             <tfoot>
//               <tr>
//                 <td className="py-3 px-4 border-b font-semibold">TOTALS</td>
//                 <td className="py-3 px-4 border-b">{formatValue(rows.reduce((sum, row) => sum + (parseFloat(row.Stock) || 0), 0))}</td>
//                 <td className="py-3 px-4 border-b">{formatValue(rows.reduce((sum, row) => sum + (parseFloat(row.Vendor) || 0), 0))}</td>
//                 <td className="py-3 px-4 border-b">{formatValue(rows.reduce((sum, row) => sum + (parseFloat(row.Receivable) || 0), 0))}</td>
//               </tr>
//             </tfoot>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// };

// // Stock value from stock flow report (store-wise).
// // StockWithoutTax = true → value without GST (remainingBoxesValue),
// // otherwise → value with GST (remainingBoxesValueWithGst).
// const getStoreStockValue = async (store, startDate, endDate, productMap) => {
//   try {
//     const value = await getDataFundtion(
//       `/InventoryReport/GetDataByDate?startDate=${startDate}&endDate=${endDate}&status=Post&Store=${store._id}&damage=Fresh`
//     );
//     const storeIds = [store._id];

//     // Merge raw rows per product (same logic as Stock Flow Report popup)
//     const merged = (Array.isArray(value) ? value : []).reduce((acc, item) => {
//       const productId = item?.product || item?.productFrom;
//       if (!productId) return acc;
//       if (!acc.has(productId)) {
//         acc.set(productId, {
//           productId,
//           TotalopenigQty: 0,
//           totalPurchaseBoxBefore: 0,
//           totalRCBoxBefore: 0,
//           totalRCBox: 0,
//           TransferInBoxesBefore: 0,
//           totalReturnBoxBefore: 0,
//           totalDCBox: 0,
//           totalDCBoxBefore: 0,
//           TransferOutBoxesBefore: 0,
//           totalSaleBoxBefore: 0,
//           totalPurchaseReturnBoxBefore: 0,
//           totalBoxesToReplacementBefore: 0,
//           totalBoxesReplacementFrom: 0,
//           purchasedBoxes: 0,
//           soldBoxes: 0,
//           totalReturnBox: 0,
//           totalPurchaseReturnBox: 0,
//           totalOutBoxes: 0,
//           totalInBoxes: 0,
//         });
//       }
//       const current = acc.get(productId);

//       if (item?.opneingQty) current.TotalopenigQty += Number(item.opneingQty) || 0;
//       if (item?.totalPurchaseBoxBefore) current.totalPurchaseBoxBefore += Number(item.totalPurchaseBoxBefore) || 0;
//       if (item?.totalRCBoxBefore) current.totalRCBoxBefore += Number(item.totalRCBoxBefore) || 0;
//       if (item?.totalRCBox) current.totalRCBox += Number(item.totalRCBox) || 0;
//       if (item?.TransferInBoxesBefore && storeIds.includes(item.StoreTo)) current.TransferInBoxesBefore += Number(item.TransferInBoxesBefore) || 0;
//       if (item?.totalReturnBoxBefore) current.totalReturnBoxBefore += Number(item.totalReturnBoxBefore) || 0;
//       if (item?.totalDCBox) current.totalDCBox += Number(item.totalDCBox) || 0;
//       if (item?.totalDCBoxBefore) current.totalDCBoxBefore += Number(item.totalDCBoxBefore) || 0;
//       if (item?.TransferOutBoxesBefore && storeIds.includes(item.StoreFrom)) current.TransferOutBoxesBefore += Number(item.TransferOutBoxesBefore) || 0;
//       if (item?.totalSaleBoxBefore) current.totalSaleBoxBefore += Number(item.totalSaleBoxBefore) || 0;
//       if (item?.totalPurchaseReturnBoxBefore) current.totalPurchaseReturnBoxBefore += Number(item.totalPurchaseReturnBoxBefore) || 0;
//       if (item?.totalBoxesToReplacementBefore) current.totalBoxesToReplacementBefore += Number(item.totalBoxesToReplacementBefore) || 0;
//       if (item?.totalBoxesReplacementFrom) current.totalBoxesReplacementFrom += Number(item.totalBoxesReplacementFrom) || 0;
//       if (item?.totalPurchaseBox) current.purchasedBoxes += Number(item.totalPurchaseBox) || 0;
//       if (item?.totalSaleBox) current.soldBoxes += Number(item.totalSaleBox) || 0;
//       if (item?.totalReturnBox) current.totalReturnBox += Number(item.totalReturnBox) || 0;
//       if (item?.totalPurchaseReturnBox) current.totalPurchaseReturnBox += Number(item.totalPurchaseReturnBox) || 0;
//       if (item?.totalOutBoxes && storeIds.includes(item.StoreFrom)) current.totalOutBoxes += Number(item.totalOutBoxes) || 0;
//       if (item?.totalInBoxes && storeIds.includes(item.StoreTo)) current.totalInBoxes += Number(item.totalInBoxes) || 0;
//       return acc;
//     }, new Map());

//     let totalValue = 0;
//     merged.forEach((item, productId) => {
//       const product = productMap.get(productId);
//       const remainingBoxes =
//         Number(item.TotalopenigQty) +
//         Number(item.totalPurchaseBoxBefore) + Number(item.totalRCBoxBefore) + Number(item.TransferInBoxesBefore || 0) + Number(item.totalReturnBoxBefore) -
//         Number(item.totalPurchaseReturnBoxBefore) - Number(item.TransferOutBoxesBefore) - Number(item.totalBoxesToReplacementBefore) - Number(item.totalDCBoxBefore) - Number(item.totalSaleBoxBefore) +
//         Number(item.totalRCBox || 0) - Number(item.totalDCBox || 0) + Number(item.purchasedBoxes || 0) + Number(item.totalOutBoxes) + Number(item.totalReturnBox || 0) -
//         Number(item.totalBoxesReplacementFrom || 0) - Number(item.totalPurchaseReturnBox || 0);

//       const tpsale = Number(product?.TPSale || 0);
//       if (store?.StockWithoutTax === true) {
//         totalValue += tpsale * remainingBoxes;
//       } else {
//         totalValue += ((Number(product?.RetailPrice || 0) / 100) * 18) * remainingBoxes + tpsale * remainingBoxes;
//       }
//     });

//     return totalValue;
//   } catch {
//     return 0;
//   }
// };

// // Store-wise general ledger balance.
// // mode "debit" → receivable (Debit - Credit), mode "credit" → payable (Credit - Debit).
// const getStoreLedgerBalance = async (store, startDate, endDate, account, mode = "debit") => {
//   try {
//     if (!account) return 0;
//     const ledger = await getDataFundtion(
//       `GernalLager?startDate=${startDate}&endDate=${endDate}&Account=${account}&Store=${store._id}`
//     );
//     const rows = Array.isArray(ledger) ? ledger : ledger?.data || [];
//     const totalDebit = rows.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);
//     const totalCredit = rows.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
//     return mode === "credit" ? totalCredit - totalDebit : totalDebit - totalCredit;
//   } catch {
//     return 0;
//   }
// };

// // Store-wise invoice aging balance. Matches the Invoice Aging report exactly:
// // remaining uses the same fallback chain (including opening invoices' 
// // Amount - RecivedAmount) and outstanding cheque amounts are added per invoice.
// const getStoreAgingBalance = async (store, startDate, endDate, chqByInvoice = {}) => {
//   try {
//     const aging = await getDataFundtion(
//       `/SaleInvoice/getOnlyInvoiceAging?startDate=${startDate}&endDate=${endDate}&store=${store._id}`
//     );

//     const rows = aging?.data || aging || [];
//     return rows.reduce((sum, row) => {
//       const remaining = parseFloat(
//         row.RemainingAmount ?? row.RemaingAmount ?? row.Remaining ??
//         (Number(row.Amount || 0) - Number(row.RecivedAmount || 0))
//       ) || 0;
//       const invoice = row.SalesInvoice || row.Invoice || row.DitributorInvoiceCode;
//       const chq = invoice ? (chqByInvoice[invoice] || 0) : 0;
//       return sum + remaining + chq;
//     }, 0);
//   } catch {
//     return 0;
//   }
// };

// export default InvestmentReport;


import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../Api/CRUDFunctions';
import InvestmentReportPopup from '../../Pages/Reports/Accounts/InvestmentReport/InvestmentReportPopup.jsx';

// Dashboard widget: "Load Investment Report" button.
// The button starts DISABLED and stays disabled until all the report's core
// APIs have finished loading (this also warms the server caches so the report
// opens fast). On click it opens the Investment Report popup with
// startDate = 2020-01-01 and endDate = yesterday.
const DashboardInvestmentReport = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerData, setCustomerData] = useState([]);

  const startDate = '2020-01-01';
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const endDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    let mounted = true;
    const preload = async () => {
      try {
        // Warm up every API the report popup uses; only then enable the button.
        await Promise.all([
          getDataFundtion('/store/OnlyActive'),
          getDataFundtion('/Product'),
          getDataFundtion(`GernalLager/DebtorBalance/?startDate=${endDate}&endDate=${endDate}`),
          getDataFundtion('/CustomerChqRecived/Allunused'),
        ]);
        // Customer list for the receivable logic (distributor flag matters).
        const [clientRes, distributorRes] = await Promise.all([
          getDataFundtion('/customer'),
          getDataFundtion('/Distrbutor'),
        ]);
        const Customer = (clientRes?.data || []).concat(distributorRes || []);
        if (mounted) {
          setCustomerData(Customer.map((item) => ({
            value: item._id,
            label: `${item.SalesFlowRef || item.OldCode} ${item.CutomerName || item.DistrbutorName}`,
            distributor: item.DistrbutorName ? true : false,
          })));
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Investment Report preload failed', err);
        if (mounted) {
          setError('Failed to load data');
          setIsLoading(false);
        }
      }
    };
    preload();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openReport = () => {
    const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
    if (!popup) return alert('Popup blocked');
    popup.document.title = 'Investment Report';
    popup.document.body.innerHTML = `<div id="popup-root"></div>`;
    const submitData = { startDate, endDate, Customer: customerData };
    const interval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root');
      if (mountNode) {
        clearInterval(interval);
        const root = ReactDOM.createRoot(mountNode);
        root.render(<InvestmentReportPopup filterData={submitData} title="Investment Report" />);
      }
    }, 100);
  };

  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 p-6 text-center">
      <h3 className="text-lg font-semibold text-on-surface">Investment Report</h3>
      <button
        onClick={openReport}
        disabled={isLoading}
        className={`w-full max-w-sm rounded-lg px-6 py-3 font-semibold shadow-md transition ${
          isLoading
            ? 'cursor-not-allowed bg-gray-300 text-gray-500'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg active:scale-[0.98]'
        }`}
      >
        {isLoading ? 'Loading data...' : 'Load Investment Report'}
      </button>
      {error && <p className="text-sm text-error">{error}</p>}
      {!isLoading && !error && (
        <p className="text-xs text-on-surface-variant">
          Report period: {startDate} to {endDate}
        </p>
      )}
    </div>
  );
};

export default DashboardInvestmentReport;
