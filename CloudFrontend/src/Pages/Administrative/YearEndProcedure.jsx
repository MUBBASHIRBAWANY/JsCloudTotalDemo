import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { toast, ToastContainer } from 'react-toastify';
import Select from 'react-select'

import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { createDataFunction, getDataFundtion } from '../../Api/CRUDFunctions';
import { fetchOpeninginventory } from '../../Redux/Reducers/OpenIngInventory';

const YearEndProcedure = () => {
  const [adminData, setAdminData] = useState([])
  const [openigYear, setOpeningYear] = useState([])
  const [selectedYear, setSelectedYear] = useState([])
  const [remainingBoxData, setRemainingBoxData] = useState([])
  const [remainingLoading, setRemainingLoading] = useState(false)
  const [productsMap, setProductsMap] = useState({})
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },

  } = useForm();
  const dispstch = useDispatch()
  const navigate = useNavigate()

  const onSubmit = async () => {
    if (remainingLoading) {
      toast.warning("Please wait, remaining stock data is still loading...")
      return
    }
    if (remainingBoxData.length === 0) {
      toast.warning("No remaining stock data found. Please select a valid year.")
      return
    }
    const start = new Date(selectedYear.openYear.label);
    const end = new Date(selectedYear.endYear.label);

    // Add 1 year
    start.setFullYear(start.getFullYear() + 1);
    end.setFullYear(end.getFullYear() + 1);

    // Format as YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split("T")[0];

    const newStartDate = formatDate(start);
    const newEndDate = formatDate(end);
    try {
      // Send remainingBoxData to server as OpeningInventory copy
      const openingInventoryPayload = {
        DateStart: newStartDate,
        DateEnd: newEndDate,
        InvoetoryData: remainingBoxData.map(item => ({
          id: Date.now() + Math.random(),
          product: item.Product,
          Store: item.StoreId,
          Location : item.location,
          Type : "Fresh",
          opneingQty: item.Remaining,
          opneingQtyValueExclGst: item.opneingQtyValueExclGst,
          opneingQtyValueInclGst: (item.opneingQtyValueExclGst / 100) * 118
        }))
      };
       await createDataFunction("/Openinginventory/DeleteYear", openingInventoryPayload);

      const data = await createDataFunction("/Openinginventory", openingInventoryPayload);

      const submitData = {
        Assets: adminData.Assets,
        Capital: adminData.Capital,
        liabilities: adminData.liabilities,
        Expenses: adminData.Expenses,
        RetainedearningsAccount: adminData.RetainedearningsAccount,
        Revenue: adminData.Revenue,
        oldStartDate: selectedYear.openYear.label,
        oldEndDate: selectedYear.endYear.label,
        newStartDate : newStartDate,
        newEndDate : newEndDate,
        remainingBoxData: remainingBoxData,
      }
      console.log(submitData)
      
      
     await createDataFunction(`/OpeningInventory/genrateNewYear`, submitData)
      
      toast.success("Year opened successfully")
      setTimeout(() => {
        navigate(`/OpeningInventoryView/${data._id}`)

      }, 1000)

    } catch (err) {
      setTimeout(() => {
        navigate(`/OpeningInventoryView/${data._id}`)

      }, 1000)
    }

  }

  const getdata = async () => {
    const data = await getDataFundtion("/Openinginventory/getAllYear");
    const id = "687e14a624a274d5e844be49"
    const res = await getDataFundtion(`/Administrative/get/${id}`)
    console.log(res)
    setAdminData(res.data)
    const year = data.map((item) => ({
      value: item.DateStart,
      label: `${item.DateStart} to ${item.DateEnd}`,
      openYear: {
        value: item.DateStart,
        label: `${item.DateStart}`,
      },
      endYear: {
        value: item.DateStart,
        label: `${item.DateEnd}`,
      },
    }))

    setOpeningYear(year)
  }

  const getRemainingBoxData = async (startDate, endDate) => {
    setRemainingLoading(true)
    try {
      const allStoreRes = await getDataFundtion('/Store');
      const allStores = allStoreRes.data
      const storeMap = new Map(allStores.map(s => [s._id, s.StoreName]));

      // Single API call returns ALL rows for every store at once; split them
      // store-wise here (filter by Store/StoreFrom/StoreTo) and merge per
      // product + store. No per-store API calls anymore.
      const mergedData = new Map();
      let value = await getDataFundtion(`/InventoryReport/getSalesInvoiceByDateFrYearEnd?startDate=${startDate}&endDate=${endDate}&status=Post&damage=Fresh`);
      const allRows = Array.isArray(value) ? value : [];
      for (const store of allStores) {
        const storeIdStr = String(store._id);
        const storeRows = allRows.filter(r =>
          String(r.Store || '') === storeIdStr
          || String(r.StoreTo || '') === storeIdStr
          || String(r.StoreFrom || '') === storeIdStr
        );

        for (const item of storeRows) {
          const productId = item?.product || item?.productFrom;
          // Transfer rows carry StoreFrom/StoreTo (no Store field). The server
          // returns a transfer row in BOTH stores' calls (it matches StoreTo OR
          // StoreFrom), so count it only in its own store's call: transfer-out
          // belongs to StoreFrom, transfer-in belongs to StoreTo.
          const isTransferOut = !!(item?.totalOutBoxes || item?.TransferOutBoxesBefore);
          const isTransferIn = !!(item?.totalInBoxes || item?.TransferInBoxesBefore);
          const storeId = isTransferOut
            ? item?.StoreFrom
            : isTransferIn
              ? item?.StoreTo
              : (item?.Store || store._id);
          if ((isTransferOut || isTransferIn) && String(storeId) !== String(store._id)) continue;
          const key = `${productId}_${storeId}`;
          if (!mergedData.has(key)) {
            mergedData.set(key, {
              id: key,
              productId,
              storeId,
              storeName: storeMap.get(storeId) || 'Unknown',
              location: allStores.find(s => s._id === storeId)?.Location || 'Unknown',
              TotalopenigQty: 0,
              totalPurchaseBoxBefore: 0,
              totalRCBoxBefore: 0,
              TransferInBoxesBefore: 0,
              totalReturnBoxBefore: 0,
              totalPurchaseValueExclGst: 0,
              totalPurchaseReturnBoxBefore: 0,
              TransferOutBoxesBefore: 0,
              totalBoxesToReplacementBefore: 0,
              totalDCBoxBefore: 0,
              totalSaleBoxBefore: 0,
              totalRCBox: 0,
              totalDCBox: 0,
              purchasedBoxes: 0,
              soldBoxes: 0,
              totalReturnBox: 0,
              totalPurchaseReturnBox: 0,
              totalOutBoxes: 0,
              totalInBoxes: 0,
              totalBoxesReplacementFrom: 0,
              totalAdjustmentLessBox: 0,
              totalAdjustmentAddBox: 0
            });
          }
          const current = mergedData.get(key);

          // Process "Before" period data (same as Inventory Valuation)
          if (item?.opneingQty) current.TotalopenigQty += Number(item.opneingQty) || 0;
          if (item?.totalPurchaseValueExclGst) current.totalPurchaseValueExclGst += Number(item.totalPurchaseValueExclGst) || 0;
          if (item?.totalPurchaseBoxBefore) current.totalPurchaseBoxBefore += Number(item.totalPurchaseBoxBefore) || 0;
          if (item?.totalRCBoxBefore) current.totalRCBoxBefore += Number(item.totalRCBoxBefore) || 0;
          if (item?.TransferInBoxesBefore) current.TransferInBoxesBefore += Number(item.TransferInBoxesBefore) || 0;
          if (item?.totalReturnBoxBefore) current.totalReturnBoxBefore += Number(item.totalReturnBoxBefore) || 0;
          if (item?.totalPurchaseReturnBoxBefore) current.totalPurchaseReturnBoxBefore += Number(item.totalPurchaseReturnBoxBefore) || 0;
          if (item?.TransferOutBoxesBefore) current.TransferOutBoxesBefore += Number(item.TransferOutBoxesBefore) || 0;
          if (item?.totalBoxesToReplacementBefore) current.totalBoxesToReplacementBefore += Number(item.totalBoxesToReplacementBefore) || 0;
          if (item?.totalDCBoxBefore) current.totalDCBoxBefore += Number(item.totalDCBoxBefore) || 0;
          if (item?.totalSaleBoxBefore) current.totalSaleBoxBefore += Number(item.totalSaleBoxBefore) || 0;

          // Process CURRENT period transactions (match StockFlowReportPopup pattern - no type filter)
          if (item?.totalPurchaseBox) {
            current.purchasedBoxes += Number(item.totalPurchaseBox) || 0;
          }
          if (item?.totalSaleBox) {
            current.soldBoxes += Number(item.totalSaleBox) || 0;
          }
          if (item?.totalReturnBox) {
            current.totalReturnBox += Number(item.totalReturnBox) || 0;
          }
          if (item?.totalInBoxes) {
            current.totalInBoxes += Number(item.totalInBoxes) || 0;
          }
          if (item?.totalOutBoxes) {
            current.totalOutBoxes += Number(item.totalOutBoxes) || 0;
          }
          if (item?.totalBoxesReplacementFrom) {
            current.totalBoxesReplacementFrom += Number(item.totalBoxesReplacementFrom) || 0;
          }
          if (item?.totalPurchaseReturnBox) {
            current.totalPurchaseReturnBox += Number(item.totalPurchaseReturnBox) || 0;
          }
          if (item?.totalDCBox) {
            current.totalDCBox += Number(item.totalDCBox) || 0;
          }
          if (item?.totalRCBox) {
            current.totalRCBox += Number(item.totalRCBox) || 0;
          }
          if (item?.totalAdjustmentLessBox) {
            current.totalAdjustmentLessBox += Number(item.totalAdjustmentLessBox) || 0;
          }
          if (item?.totalAdjustmentAddBox) {
            current.totalAdjustmentAddBox += Number(item.totalAdjustmentAddBox) || 0;
          }
        }
      }

      const remainingBoxArray = Array.from(mergedData.values()).map(item => {
        // Apply StockFlowReport remaining concept
        // Same formula as the Stock Flow report: opening + purchases/RC/in/returns
        // - sales - transfer out - DC - replacement - purchase returns.
        const remainingBoxes = Number(item.TotalopenigQty || 0) + Number(item.totalPurchaseBoxBefore || 0) + Number(item.totalRCBoxBefore || 0) + Number(item.TransferInBoxesBefore || 0) + Number(item.totalReturnBoxBefore || 0) - Number(item.totalPurchaseReturnBoxBefore || 0) - Number(item.TransferOutBoxesBefore || 0) - Number(item.totalBoxesToReplacementBefore || 0) - Number(item.totalDCBoxBefore || 0) - Number(item.totalSaleBoxBefore || 0)
          + Number(item.totalRCBox || 0) - Number(item.totalDCBox || 0) + Number(item.purchasedBoxes || 0) + Number(item.totalInBoxes || 0) + Number(item.totalReturnBox || 0) - Number(item.totalOutBoxes || 0) - Number(item.soldBoxes || 0) - Number(item.totalBoxesReplacementFrom || 0) - Number(item.totalPurchaseReturnBox || 0)
          - Number(item.totalAdjustmentLessBox || 0) + Number(item.totalAdjustmentAddBox || 0);

        // Use Product's TPPurchase to value remaining stock
        const TPPurchase = productsMap[item.productId] || 0;

        return {
          Product: item.productId,
          Remaining: remainingBoxes,
          TPPurchase: TPPurchase,
          Opening: Number(item.TotalopenigQty || 0),
          Purchased: Number(item.purchasedBoxes || 0),
          Sales: Number(item.soldBoxes || 0),
          TransferIn: Number(item.totalInBoxes || 0),
          TransferOut: Number(item.totalOutBoxes || 0),
          SalesReturn: Number(item.totalReturnBox || 0),
          PurchaseReturn: Number(item.totalPurchaseReturnBox || 0),
          DC: Number(item.totalDCBox || 0),
          Replacement: Number(item.totalBoxesReplacementFrom || 0),
          AdjLess: Number(item.totalAdjustmentLessBox || 0),
          AdjAdd: Number(item.totalAdjustmentAddBox || 0),
          Store: item.storeName,
          StoreId: item.storeId,
          location: allStores.find(store => store._id === item.storeId)?.Location || 'Unknown',
          opneingQtyValueExclGst: TPPurchase * remainingBoxes
        };
      });

      setRemainingBoxData(remainingBoxArray);
      console.log("Remaining Box Data:", remainingBoxArray);
    } catch (error) {
      console.error('Error fetching remaining box data:', error);
    } finally {
      setRemainingLoading(false)
    }
  };

  useEffect(() => {
    if (selectedYear?.openYear?.label && selectedYear?.endYear?.label) {
      getRemainingBoxData(selectedYear.openYear.label, selectedYear.endYear.label);
    }
  }, [selectedYear])

  useEffect(() => {
    getdata()
    // Load products for TPPurchase lookup
    const loadProducts = async () => {
      try {
        const prodRes = await getDataFundtion('/product');
        const map = {};
        (prodRes.data || prodRes || []).forEach(p => {
          map[p._id] = Number(p.TPPurchase) || 0;
        });
        setProductsMap(map);
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    };
    loadProducts();
  }, [])

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold text-center pd-text-body mb-6">Year End </h1>
        <ToastContainer />
        <div>
          <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pd-bg-surface p-6 rounded-lg shadow-md mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block pd-text-body font-semibold mb-2">Start Date</label>
              <Select
                options={openigYear}
                value={selectedYear.openYear}
                onChange={(e) => setSelectedYear(e)}
              />
            </div>
            <div>
              <label className="block pd-text-body font-semibold mb-2">End Date</label>
              <Select
                options={openigYear}
                isDisabled={true}
                value={selectedYear.endYear}
                onChange={(e) => setSelectedYear(e)}
              />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-5 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
                disabled={remainingLoading}
                style={{ opacity: remainingLoading ? 0.6 : 1, cursor: remainingLoading ? 'not-allowed' : 'pointer' }}
              >
                {remainingLoading ? 'Loading Stock Data...' : 'Open Year'}
              </button>
            </div>
          </form>
        </div>

        {/* Remaining Box Data Table */}
        {remainingBoxData.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-bold text-center pd-text-body mb-4">Remaining Box Stock</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2">#</th>
                    <th className="border border-gray-300 px-4 py-2">Product ID</th>
                    <th className="border border-gray-300 px-4 py-2">Store</th>
                    <th className="border border-gray-300 px-4 py-2">Opening</th>
                    <th className="border border-gray-300 px-4 py-2">Purchased</th>
                    <th className="border border-gray-300 px-4 py-2">Sales</th>
                    <th className="border border-gray-300 px-4 py-2">Trans. In</th>
                    <th className="border border-gray-300 px-4 py-2">Trans. Out</th>
                    <th className="border border-gray-300 px-4 py-2">Sales Ret.</th>
                    <th className="border border-gray-300 px-4 py-2">Pur. Ret.</th>
                    <th className="border border-gray-300 px-4 py-2">DC</th>
                    <th className="border border-gray-300 px-4 py-2">Replace.</th>
                    <th className="border border-gray-300 px-4 py-2">Adj. Less</th>
                    <th className="border border-gray-300 px-4 py-2">Adj. Add</th>
                    <th className="border border-gray-300 px-4 py-2">Remaining (Box)</th>
                    <th className="border border-gray-300 px-4 py-2">TP Purchase</th>
                    <th className="border border-gray-300 px-4 py-2">Value (Excl GST)</th>
                  </tr>
                </thead>
                <tbody>
                  {remainingBoxData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 text-center">{index + 1}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.Product}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.Store}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.Opening}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.Purchased}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.Sales}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.TransferIn}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.TransferOut}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.SalesReturn}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.PurchaseReturn}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.DC}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.Replacement}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.AdjLess}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.AdjAdd}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.Remaining}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.TPPurchase?.toFixed(4)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{Number(item.opneingQtyValueExclGst).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default YearEndProcedure