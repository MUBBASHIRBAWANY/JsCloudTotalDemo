import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { updateDataFunction } from '../../Api/CRUDFunctions';
import { toast, ToastContainer } from 'react-toastify';

const OpeningInventoryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [openingInventory, setOpeningInventory] = useState({});

  const Products = useSelector((state) => state.Product.product);
  const Stores = useSelector((state) => state.Store.Store);
  const Locations = useSelector((state) => state.Location.Location);

  const editOpeningInventory = useSelector((state) => state.Openinginventory.Openinginventory);
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    const data = editOpeningInventory.find((item) => item._id === id);
    if (data) {
      setOpeningInventory(data);
      setTableData(data.InvoetoryData || []);
    }
  }, [id, editOpeningInventory]);

  const getProductName = (productId) => {
    const product = Products.find((p) => p._id === productId);
    return product ? `${product.mastercode} ${product.ProductName}` : 'Unknown Product';
  };

  const getLocationName = (LocationId) => {
    const Location = Locations.find((L) => L._id === LocationId);
    return Location ? `${Location.LocationName}` : 'Unknown Location';
  };
  const getStoreName = (StoreId) => {
    const Store = Stores.find((L) => L._id === StoreId);
    return Store ? `${Store.StoreName}` : 'Unknown Store';
  };
  const totalOpeningQty = tableData.reduce((sum, row) => sum + (parseFloat(row.opneingQty) || 0), 0);
  const totalValueExclGst = tableData.reduce((sum, row) => sum + (parseFloat(row.opneingQtyValueExclGst) || 0), 0);
  const totalValueInclGst = tableData.reduce((sum, row) => sum + (parseFloat(row.opneingQtyValueInclGst) || 0), 0);

  const handleStatusChange = async (newStatus) => {
    //console.log(tableData)
    try {
      const res = await updateDataFunction(`Openinginventory/ChnageStatusOnly/${id}`, {
        status: newStatus,
      });
      //console.log(res)
      toast.success("Status Update")
      setTimeout(() => {
        navigate('/OpeningInventory')
      }, 2000)


    } catch (err) {
      console.error('Status update failed', err);
    }
  };

  return (

    <div className="p-4">
      <ToastContainer />
      <h1 className="pd-page-title text-center mb-6">
        Opening Inventory Details
      </h1>

      {/* Top Buttons for Status */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {openingInventory.Status === 'Open' && (
          <button
            className="pd-btn-warning"
            onClick={() => handleStatusChange('Closed')}
          >
            Close
          </button>
        )}
        {openingInventory.Status === 'Closed' && (
          <button
            className="pd-btn-save"
            onClick={() => handleStatusChange('Unpost')}
          >
            Unpost
          </button>
        )}
        {openingInventory.Status !== 'Open' && (
          <button
            className="pd-btn-success px-4 py-2"
            onClick={() => handleStatusChange('Open')}
          >
            Open
          </button>
        )}
      </div>

      <div className="pd-card p-4 md:p-6">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="pd-label">
              Year From
            </label>
            <div className="pd-input-readonly text-sm md:text-base">
              {openingInventory.DateStart || 'N/A'}
            </div>
          </div>
          <div>
            <label className="pd-label">
              Year To
            </label>
            <div className="pd-input-readonly text-sm md:text-base">
              {openingInventory.DateEnd || 'N/A'}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr>
                <th className="border p-2 min-w-[200px]">Product</th>
                <th className="border p-2">Opening Qty</th>
                <th className="border p-2">Value Excl Gst</th>
                <th className="border p-2">Value incl Gst</th>
                <th className="border p-2">Department</th>
                <th className="border p-2">Location</th>
                <th className="border p-2">Type </th>


              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} >
                  <td className="border p-2">
                    {getProductName(row.product)}
                  </td>
                  <td className="border p-2">
                    {row.opneingQty}
                  </td>
                  <td className="border p-2">
                    {parseFloat(row.opneingQtyValueExclGst).toFixed(5)}
                  </td>
                  <td className="border p-2">
                    {parseFloat(row.opneingQtyValueInclGst).toFixed(5)}
                  </td>
                  <td className="border p-2">
                    {getStoreName(row.Store)}
                  </td>
                  <td className="border p-2">
                    {getLocationName(row.Location)}
                  </td>
                  <td className="border p-2">{row.Type} </td>
                </tr>
              ))}
            </tbody>
            {tableData.length > 0 && (
              <tfoot>
                <tr className="pd-table-footer">
                  <td className="border p-2 text-right">Total:</td>
                  <td className="border p-2">{totalOpeningQty}</td>
                  <td className="border p-2">{totalValueExclGst}</td>
                  <td className="border p-2"> {totalValueInclGst}</td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>


                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <button
          type="button"
          onClick={() => navigate('/OpeningInventory')}
          className="pd-btn-outline text-sm md:text-base"
        >
          Back to List
        </button>
      </div>
    </div>
  );
};

export default OpeningInventoryView;
