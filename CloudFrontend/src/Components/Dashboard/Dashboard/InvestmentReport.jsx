import React, { useEffect, useState } from 'react'
import { getDataFundtion } from '../../Api/CRUDFunctions'
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const InvestmentReport = () => {
  const [dashboardData, setDashboardData] = useState({})
  //console.log(dashboardData)
  const [loading, setLoading] = useState(true)

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };


const exportToExcel = (data, fileName = "Report") => {
  if (!data || !data.length) {
    alert("No data available");
    return;
  }

  // Convert JSON → Worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Create Workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  // Save file
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });

  saveAs(blob, `${fileName}.xlsx`);
};

  // Store-wise dashboard display
  const StoreWiseDashboard = () => {
    // Get all unique stores from all data
    const allStores = new Set();

    // Collect all store names
    Object.values(dashboardData).forEach(category => {
      if (Array.isArray(category)) {
        category.forEach(item => {
          if (item.name) allStores.add(item.name);
        });
      }
    });

    const stores = Array.from(allStores);

    // Create data for each store
    const storeData = stores.map(storeName => {
      const storeInfo = {};

      // Collect data from each category
      Object.entries(dashboardData).forEach(([category, data]) => {
        if (Array.isArray(data)) {
          const storeItem = data.find(item => item.name === storeName);
          if (storeItem) {
            // Find amount field (TotalAmount, Credit, Debit)
            const amountField = Object.keys(storeItem).find(key =>
              key === 'TotalAmount' || key === 'Credit' || key === 'Debit' || key === 'Balance'
            );
            if (amountField) {
              storeInfo[category] = storeItem[amountField];
            }
          }
        }
      });

      return {
        store: storeName,
        ...storeInfo
      };
    });

    // Categories to display
    const displayCategories = [
      'LastMonthPurchase',
      'CurrentMonthPurchase',
      'LastDayPurchase',
      `LastMonthSales`,
      'CurrentMonthsales',
      'LastDaySales',
      'LastMonthRecovery',
      'CurrentMonthRecovery',
      'LastDayRecovery',
      'TotalCredit',
      'LastMonthCredit',
    ];

    return (
      <div className="overflow-x-auto">
        <table className="pd-data-table">
          <thead>
            <tr>
              <th className="py-3 px-4 border-b text-left font-semibold">Store Name</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Last Month Purchase</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Current Month Purchase</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Last Day Purchase</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Last Month Sales</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Current Month Sales</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Last Day Sales</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Last Month Recovery</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Current Month Recovery</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Last Day Recovery</th>
              <th className="py-3 px-4 border-b text-left font-semibold">As on Receivable</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Last Month Receivable</th>

            </tr>
          </thead>
          <tbody>
            {storeData.map((store, index) => (
              <tr key={index}>
                <td className="py-3 px-4 border-b font-medium">{store.store}</td>
                {displayCategories.map(category => (
                  <td key={category} className="py-3 px-4 border-b">
                    {store[category] ? (
                      <span className="font-medium">
                        {parseFloat(store[category]).toLocaleString('en-Us', {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3
                        })}
                      </span>
                    ) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>TOTALS</td>

              <td>{dashboardData?.LastMonthPurchase?.reduce((sum, row) => sum + (parseFloat(row.TotalAmount) || 0), 0)}</td>
              <td>{dashboardData?.CurrentMonthPurchase?.reduce((sum, row) => sum + (parseFloat(row.TotalAmount) || 0), 0)}</td>
              <td>{dashboardData?.LastDayPurchase?.reduce((sum, row) => sum + (parseFloat(row.TotalAmount) || 0), 0)}</td>
              <td>{dashboardData?.LastMonthSales?.reduce((sum, row) => sum + (parseFloat(row.TotalAmount) || 0), 0)}</td>
              <td>{dashboardData?.CurrentMonthsales?.reduce((sum, row) => sum + (parseFloat(row.TotalAmount) || 0), 0)}</td>
              <td>{dashboardData?.LastDaySales?.reduce((sum, row) => sum + (parseFloat(row.TotalAmount) || 0), 0)}</td>
              <td>{dashboardData?.LastMonthRecovery?.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0)}</td>
              <td>{dashboardData?.CurrentMonthRecovery?.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0)}</td>
              <td>{dashboardData?.LastDayRecovery?.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0)}</td>
              <td>{dashboardData?.TotalCredit?.reduce((sum, row) => sum + (parseFloat(row.Balance) || 0), 0).toFixed(2)}</td>
              <td>{dashboardData?.LastMonthCredit?.reduce((sum, row) => sum + (parseFloat(row.Balance) || 0), 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };


  const getData = async () => {
    try {
      setLoading(true);

      const Store = await getDataFundtion("/Store");
      const now = new Date();

      // Date calculations
      const currentDate = formatDate(now);
      const prevMonthFirstDate = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const CurrentMonthFirstDate = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
      const prevMonthLastDate = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
      const prevDateLastDate = formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0));

      // API calls
      const CurrentMonthsales = await getDataFundtion(`saleInvoice/getOnlyInvoiceAging1?startDate=${CurrentMonthFirstDate}&endDate=${currentDate}&store=All&onlyCurrunt=true&OrderBooker=All`);
      const LastDaySales = await getDataFundtion(`saleInvoice/getOnlyInvoiceAging1?startDate=${prevDateLastDate}&endDate=${prevDateLastDate}&store=All&onlyCurrunt=true&OrderBooker=All`);
      const LastMonthSales = await getDataFundtion(`saleInvoice/getOnlyInvoiceAging1?startDate=${prevMonthFirstDate}&endDate=${prevMonthLastDate}&store=All&onlyCurrunt=true&OrderBooker=All`);
      const Purchase = await getDataFundtion(`inventoryReport/PurchaseSummry?startDate=${CurrentMonthFirstDate}&endDate=${currentDate}`);
      const LastDayPurchase = await getDataFundtion(`inventoryReport/PurchaseSummry?startDate=${prevDateLastDate}&endDate=${prevDateLastDate}`);
      const LastMonthPurchase = await getDataFundtion(`inventoryReport/PurchaseSummry?startDate=${prevMonthFirstDate}&endDate=${prevMonthLastDate}`);
      const Recovery = await getDataFundtion(`GernalLager/DebtorBalance/?startDate=${CurrentMonthFirstDate}&endDate=${currentDate}&onlyCurrunt=true`);
      const LastDayRecovery = await getDataFundtion(`GernalLager/DebtorBalance/?startDate=${prevDateLastDate}&endDate=${prevDateLastDate}&onlyCurrunt=true`);
      const LastMonthRecovery = await getDataFundtion(`GernalLager/DebtorBalance/?startDate=${prevMonthFirstDate}&endDate=${prevMonthLastDate}&onlyCurrunt=true`);
      const Credit = await getDataFundtion(`GernalLager/DebtorBalance/?startDate=${CurrentMonthFirstDate}&endDate=${currentDate}`);
      const prevMonthCredit = await getDataFundtion(`GernalLager/DebtorBalance/?startDate=${prevMonthFirstDate}&endDate=${prevMonthLastDate}`);

      // Data filtering

      const OnlyCredit = Credit.filter((item) => item?.Client !== "" && item?.Client !== null && item?.Client !== undefined);
      const OnlyprevMonthCredit = prevMonthCredit.filter((item) => item?.Client !== "" && item?.Client !== null && item?.Client !== undefined);
      const OnlyRecovery = Recovery.filter((item) => item?.Client !== "" && item?.Client !== null && item?.Client !== undefined);
      //console.log(OnlyRecovery.length)
      const OnlyLastDayRecovery = LastDayRecovery.filter((item) => item?.Client !== "" && item?.Client !== null && item?.Client !== undefined);
      const OnlyLastMonthRecovery = LastMonthRecovery.filter((item) => item?.Client !== "" && item?.Client !== null && item?.Client !== undefined);

      // Process data
      const AllData = {
        CurrentMonthsales: storeWiseMerge(CurrentMonthsales.data, "TotalAmount", Store.data),
        LastDaySales: storeWiseMerge(LastDaySales.data, "TotalAmount", Store.data),
        LastMonthSales: storeWiseMerge(LastMonthSales.data, "TotalAmount", Store.data),
        CurrentMonthPurchase: storeWiseMerge(Purchase, "TotalAmount", Store.data),
        LastDayPurchase: storeWiseMerge(LastDayPurchase, "TotalAmount", Store.data),
        LastMonthPurchase: storeWiseMerge(LastMonthPurchase, "TotalAmount", Store.data),
        CurrentMonthRecovery: storeWiseMerge(OnlyRecovery, "Credit", Store.data),
        LastDayRecovery: storeWiseMerge(OnlyLastDayRecovery, "Credit", Store.data),
        LastMonthRecovery: storeWiseMerge(OnlyLastMonthRecovery, "Credit", Store.data),
        TotalCredit: storeWiseDebitMinusCredit(OnlyCredit, "Credit", Store.data),
        LastMonthCredit: storeWiseDebitMinusCredit(OnlyprevMonthCredit, "Credit", Store.data)

      };

      setDashboardData(AllData);
      //console.log("Dashboard Data:", AllData);

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Store-wise Investment Dashboard</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div>Loading data...</div>
        </div>
      ) : (
        <>
          <div className="mt-6">

            <StoreWiseDashboard />
          </div>

          {/* Simple Store List */}

        </>
      )}
    </div>
  );
};

// Store merge function
const storeWiseMerge = (data, key, Store) => {
  const storeMap = {};
  Store.forEach(s => {
    storeMap[String(s._id)] = s;
  });

  const storeData = data.reduce((acc, row) => {
    const storeId = row?.store || row?.Store || row?.BigStore || row?.SmallStore;
    const storeKey = storeId ? String(storeId) : "No Store";
    const storeInfo = storeMap[storeKey];

    const value = parseFloat(String(row[key]).replace(/,/g, '')) || 0;

    if (!acc[storeKey]) {
      acc[storeKey] = {
        id: storeKey,
        name: storeInfo?.StoreName || "No Store",
        fullName: storeInfo?.StoreName || "No Store",
        [key]: 0
      };
    }

    acc[storeKey][key] += value;

    return acc;
  }, {});


  return Object.values(storeData);
};


const storeWiseDebitMinusCredit = (data, key, Store) => {
  const storeMap = {};
  Store.forEach(s => {
    storeMap[String(s._id)] = s;
  });

  const storeData = data.reduce((acc, row) => {
    const storeId = row?.store || row?.Store || row?.BigStore || row?.SmallStore;
    const storeKey = storeId ? String(storeId) : "No Store";
    const storeInfo = storeMap[storeKey];

    const debit = parseFloat(String(row.Debit).replace(/,/g, '')) || 0;
    const credit = parseFloat(String(row.Credit).replace(/,/g, '')) || 0;

    if (!acc[storeKey]) {
      acc[storeKey] = {
        id: storeKey,
        name: storeInfo?.StoreName || "No Store",
        fullName: storeInfo?.StoreName || "No Store",
        Balance: 0
      };
    }

    acc[storeKey].Balance += (debit - credit);

    return acc;
  }, {});

  return Object.values(storeData);
};

export default InvestmentReport;