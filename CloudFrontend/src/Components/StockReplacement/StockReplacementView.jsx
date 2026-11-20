import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

const StockReplacementView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const StockReplacementList = useSelector((state) => state.StockReplacement.StockReplacement);
  const currentData = StockReplacementList.find(item => item._id === id);

  const Store = useSelector((state) => state.Store.Store);
  const location = useSelector((state) => state.Location.Location);
  const Customer = useSelector((state) => state.Client?.client);
  const AllProducts = useSelector((state) => state.Product.product);

  const [CustomerTo, setCustomerTo] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [ReplaceStore, setReplaceStore] = useState(null);
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    if (currentData) {
      const customer = Customer.find(c => c._id === currentData.Customer);
      if (customer) {
        setCustomerTo({
          value: customer._id,
          label: `${customer.CutomerName} ${customer.code}`
        });
      }

      setSelectedLocation(currentData.Location);

      const matchedStore = Store.find(s => s._id === currentData.Store);
      if (matchedStore) {
        setReplaceStore({
          value: matchedStore._id,
          label: matchedStore.StoreName
        });
      }

      setTableData(currentData.ReplacementData || []);
    }
  }, [currentData, Customer, Store]);

  if (!currentData) return <div className="p-4">Loading...</div>;

  // Get location name
  const locationName = location.find(l => l._id === selectedLocation)?.LocationName || '';

  return (
    <div className='mx-5'>
      <h1 className="text-xl md:pd-page-title text-center mb-6">
        View Stock Replacement
      </h1>

      <div className="pd-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="pd-label">
              Replacement Date
            </label>
            <div className="pd-input-readonly text-sm md:text-base">
              {currentData.ReplacementDate}
            </div>
          </div>

          <div>
            <label className="pd-label">
              Customer
            </label>
            <div className="pd-input-readonly text-sm md:text-base">
              {CustomerTo?.label || ''}
            </div>
          </div>

          <div>
            <label className="pd-label">
              Sales Flow Ref
            </label>
            <div className="pd-input-readonly text-sm md:text-base">
              {currentData.SalesFlowRef || '-'}
            </div>
          </div>

          <div>
            <label className="pd-label">
              Replacement No
            </label>
            <div className="pd-input-readonly text-sm md:text-base">
              {currentData.ReplacementNumber}
            </div>
          </div>

          <div>
            <label className="pd-label">
              Location
            </label>
            <div className="pd-input-readonly text-sm md:text-base">
              {locationName}
            </div>
          </div>

          <div>
            <label className="pd-label">
              Store
            </label>
            <div className="pd-input-readonly text-sm md:text-base">
              {ReplaceStore?.label || ''}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr>
                <th className="border p-2 min-w-[150px]">Product From</th>
                <th className="border p-2 hidden md:table-cell">Total Box</th>
                <th className="border p-2 hidden md:table-cell">Unit From</th>
                <th className="border p-2">CTN</th>
                <th className="border p-2 hidden lg:table-cell">Pcs</th>
                <th className="border p-2">Value Excl Gst</th>
                <th className="border p-2 min-w-[150px]">Product To</th>
                <th className="border p-2 lg:table-cell hidden md:table-cell">Total Box</th>
                <th className="border p-2 lg:table-cell hidden md:table-cell">Unit</th>
                <th className="border p-2">CTN</th>
                <th className="border p-2 hidden md:table-cell">Pcs</th>
                <th className="border p-2">Value Excl Gst</th>
                <th className="border p-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => {
                const productFrom = AllProducts.find(p => p._id === row.productFrom);
                const productTo = AllProducts.find(p => p._id === row.productTo);
                
                return (
                  <tr key={row.id} >
                    <td className="border p-2">
                      {productFrom 
                        ? `${productFrom.mastercode} ${productFrom.ProductName}` 
                        : '-'}
                    </td>
                    <td className="border p-2 hidden md:table-cell">
                      {row.totalBoxesFrom || 0}
                    </td>
                    <td className="border p-2">
                      {row.unitFrom || 0}
                    </td>
                    <td className="border p-2">
                      {row.cartonFrom || 0}
                    </td>
                    <td className="border p-2 hidden lg:table-cell">
                      {row.boxFrom || 0}
                    </td>
                    <td className="border p-2">
                      {row.fromValue || 0}
                    </td>
                    <td className="border p-2">
                      {productTo 
                        ? `${productTo.mastercode} ${productTo.ProductName}` 
                        : '-'}
                    </td>
                    <td className="border p-2 hidden md:table-cell">
                      {row.totalBoxesTo || 0}
                    </td>
                    <td className="border p-2">
                      {row.unitTo || 0}
                    </td>
                    <td className="border p-2">
                      {row.cartonTo || 0}
                    </td>
                    <td className="border p-2 hidden md:table-cell">
                      {row.boxTo || 0}
                    </td>
                    <td className="border p-2">
                      {row.ToValue || 0}
                    </td>
                    <td className="border p-2">
                      {row.Reason || 'Damage'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={() => navigate('/StockReplacement')}
            className="pd-btn-save text-sm md:text-base"
          >
            Back to List
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockReplacementView;