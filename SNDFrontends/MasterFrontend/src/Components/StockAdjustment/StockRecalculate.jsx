import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion } from '../../Api/CurdFunctions';
import { isAdminUser } from '../Global/distributorAccess';
import { loadStockFlowReport } from '../../Pages/Reports/loadStockFlowReport';

const StockRecalculate = () => {
  const navigate = useNavigate();
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail);
  const [distributors, setDistributors] = useState([]);
  const [selectedDistributor, setSelectedDistributor] = useState({
    value: 'all',
    label: 'All Distributors',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isAdminUser(loginuser)) {
      navigate('/');
    }
  }, [loginuser, navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getDataFundtion('/Distrbutor');
        const list = Array.isArray(res) ? res : res?.data || [];
        setDistributors(list);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load distributors');
      }
    };
    load();
  }, []);

  const distributorOptions = [
    { value: 'all', label: 'All Distributors' },
    ...distributors.map((item) => ({
      value: item._id,
      label: item.DistrbutorName,
    })),
  ];

  const handleRecalculate = async () => {
    const distLabel = selectedDistributor?.label || 'All Distributors';
    const ok = window.confirm(
      `Yeh ${distLabel} ka Stock Flow Report (With Open) load karke wahi ending stock TotalProduct mein save karega.\n\nReport mein jo Total Box hai, wahi quantity save hogi. Continue?`
    );
    if (!ok) return;

    setIsLoading(true);
    setResult(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const distributorIds = selectedDistributor?.value && selectedDistributor.value !== 'all'
        ? [selectedDistributor.value]
        : distributors.map((item) => item._id).filter(Boolean);
      const report = await loadStockFlowReport({
        distributorIds,
        startDate: '2025-01-01',
        endDate: today,
        status: 'With Open',
      });
      const rows = (report.byDistributor || []).flatMap((block) =>
        (block.rows || []).map((row) => ({
          Distrbutor: block.Distrbutor,
          ProductName: row.productId,
          endingStock: row.endingStock,
          purchase: (Number(row.beforePurchase) || 0) + (Number(row.currentPurchase) || 0),
          sales: (Number(row.beforeSales) || 0) + (Number(row.currentSales) || 0),
          adjustment:
            (Number(row.beforeStockAdjustmentAdd) || 0) +
            (Number(row.stockAdjustmentAdd) || 0) -
            (Number(row.beforeStockAdjustmentLess) || 0) -
            (Number(row.stockAdjustmentLess) || 0),
        }))
      );
      const payload = {
        email: loginuser?.email,
        distributorIds,
        rows,
      };
      if (selectedDistributor?.value && selectedDistributor.value !== 'all') {
        payload.Distrbutor = selectedDistributor.value;
      }
      const res = await createDataFunction('/TotalProduct/Recalculate', payload);
      setResult(res);
      toast.success(res?.message || 'Stock recalculated');
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Stock recalculate failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <ToastContainer />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-800">
          Stock Recalculate
        </h1>
        <button
          onClick={() => navigate('/StockAdjustmentList')}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm md:text-base"
        >
          Back to Stock Adjustment
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6 max-w-3xl">
        <p className="text-sm text-gray-600 mb-4">
          Pehle Stock Flow Report (With Open) load hota hai, 2025-01-01 se aaj
          tak. Usi report ka ending stock backend ko bheja jata hai aur
          TotalProduct mein save hota hai. Backend dubara calculate nahi karta.
          Sirf admin access kar sakta hai.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Distributor
        </label>
        <Select
          options={distributorOptions}
          value={selectedDistributor}
          onChange={setSelectedDistributor}
          className="mb-4"
          isSearchable
          placeholder="Select Distributor"
        />

        <button
          onClick={handleRecalculate}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg text-white text-sm md:text-base ${
            isLoading
              ? 'bg-orange-300 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600'
          }`}
        >
          {isLoading ? 'Loading stock flow...' : 'Recalculate Stock'}
        </button>
      </div>

      {result && (
        <div className="mt-6 bg-white rounded-lg shadow p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-2">Result</h2>
          <p className="text-sm text-gray-600 mb-3">
            {result.message} — {result.updated || 0} product rows,{' '}
            {result.changed || 0} qty changed
          </p>
          {result.formula ? (
            <p className="text-xs text-gray-500 mb-3">{result.formula}</p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Distributor</th>
                  <th className="border p-2">Products</th>
                  <th className="border p-2">Qty Changed</th>
                  <th className="border p-2">Total Quantity</th>
                </tr>
              </thead>
              <tbody>
                {(result.distributors || []).length > 0 ? (
                  result.distributors.map((row) => (
                    <tr key={row.Distrbutor}>
                      <td className="border p-2">{row.DistrbutorName}</td>
                      <td className="border p-2 text-center">{row.products}</td>
                      <td className="border p-2 text-center">{row.changed || 0}</td>
                      <td className="border p-2 text-center">
                        {row.totalQuantity}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="border p-4 text-center text-gray-500">
                      No products calculated
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {(result.changes || []).length > 0 && (
            <div className="overflow-x-auto mt-4">
              <h3 className="text-sm font-semibold mb-2">
                Products whose TotalQuantity changed
              </h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Distributor</th>
                    <th className="border p-2">Product</th>
                    <th className="border p-2">Old Qty</th>
                    <th className="border p-2">Purchase</th>
                    <th className="border p-2">Sales</th>
                    <th className="border p-2">Adj</th>
                    <th className="border p-2">New Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {result.changes.map((row) => (
                    <tr key={`${row.Distrbutor}-${row.ProductName}`}>
                      <td className="border p-2">{row.DistrbutorName}</td>
                      <td className="border p-2">{row.ProductLabel}</td>
                      <td className="border p-2 text-center">{row.oldQty}</td>
                      <td className="border p-2 text-center">{row.purchase}</td>
                      <td className="border p-2 text-center">{row.sales}</td>
                      <td className="border p-2 text-center">{row.adjustment}</td>
                      <td className="border p-2 text-center font-semibold">
                        {row.newQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(result.negatives || []).length > 0 && (
            <p className="mt-3 text-sm text-red-600">
              {result.negatives.length} product(s) ka Stock Flow ending negative
              hai. Wohi negative quantity save hui hai.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StockRecalculate;
