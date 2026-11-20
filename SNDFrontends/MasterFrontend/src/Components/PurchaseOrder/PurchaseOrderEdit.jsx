import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion } from '../../Api/CurdFunctions';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';

const PurchaseOrderEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const Vendor = useSelector((state) => state.Vendor.state);
  const Products = useSelector((state) => state.Product.product);
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
  const Store = useSelector((state) => state.Store.Store);
  const location = useSelector((state) => state.Location.Location);
  const EditDistributor = useSelector((state) => state.DistributroReducers.DistributroReducers);
    const PurchaseOrder = useSelector((state) => state.PurchaseOrder.PurchaseOrder)

  const [tableData, setTableData] = useState([]);
  const [DrpDistriButor, setDrpDistriButor] = useState([]);
  const [selectedDistributor, setSelectedDistributor] = useState(null);
  const Distrbutor =  useSelector(
          (state) => state.DistributroReducers.DistributroReducers
      );
  
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset } = useForm();

  const getData = async () => {
    try {
      // Prepare Distributor Dropdown
      const EditDistributorDrp = EditDistributor.map((item) => ({
        value: item._id,
        label: `${item.DistrbutorName} ${item.DistrbutorSystemCode}`,
      }));
      setDrpDistriButor(EditDistributorDrp);

      // Fetch Products if empty
      const arrProduct = Products.length === 0 ? await getDataFundtion('/product') : Products;
      Products.length === 0 ? dispatch(fetchproduct(arrProduct?.data)) : null;

      // Fetch Purchase Order Data
      const res = PurchaseOrder.find((item) => item._id == id)
      if (res) {
        const po = res;
        reset({
          OrderDate: po.OrderDate,
          PostStatus: po.PostStatus,
          OrderCode : po.OrderCode
        });
        const DistrbutorOrder = Distrbutor.find((item)=> item._id == po.Distrbutor )
        setSelectedDistributor({
          label : DistrbutorOrder.DistrbutorName,
          value : DistrbutorOrder._id,
        })
        setTableData(po.OrderData.map((item) => ({ ...item, id: Date.now() + Math.random() })));
      }
      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const addNewRow = () => {
    setTableData([
      ...tableData,
      { id: Date.now(), product: '', box: 0, carton: 0, Rate: 0, GrossAmount: 0, netAmunt: 0 },
    ]);
  };

  const removeRow = (id) => {
    setTableData(tableData.filter((row) => row.id !== id));
  };

  const loadInvoiceOptions = async (inputValue) => {
    if (!inputValue) return [];
    const filtered = Products.filter((item) =>
      item.ProductName.toLowerCase().includes(inputValue.toLowerCase())
    ).slice(0, 50);
    return filtered.map((item) => ({ label: `${item.ProductName} ${item.mastercode}`, value: item._id }));
  };

  const handleCellChange = (id, field, value) => {
    setTableData(
      tableData.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };

          if (field === 'product') {
            const findProduct = Products.find((p) => p._id === value);
            if (findProduct) {
              updatedRow.Rate = Number(findProduct.TPSale || 0);
            }
          }

          if (field === 'carton' || field === 'box') {
            const findProduct = Products.find((p) => p._id === updatedRow.product);
            if (findProduct) {
              const BoxinCarton = parseInt(findProduct.BoxinCarton || 0);
              const PcsinBox = parseInt(findProduct.PcsinBox || 0);
              const carton = parseInt(updatedRow.carton || 0);
              const box = parseInt(updatedRow.box || 0);
              const totalUnits = carton * BoxinCarton * PcsinBox + box * PcsinBox;
              updatedRow.unit = totalUnits;
              updatedRow.GrossAmount = totalUnits / PcsinBox * updatedRow.Rate;
              updatedRow.netAmunt = updatedRow.GrossAmount; // you can include GST/discount here if needed
            }
          }

          return updatedRow;
        }
        return row;
      })
    );
  };

  const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);
  const totalBOX = tableData.reduce((sum, row) => sum + (parseInt(row.box) || 0), 0);
  const totalGrossAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.GrossAmount) || 0), 0);
  const totalNetAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0);

  const onSubmit = async (data) => {
    if (tableData.length === 0) {
      toast.error('Empty table not allowed');
      return;
    }
    data.Distrbutor = selectedDistributor.value;
    data.OrderData = tableData;
    data.TotalAmount = totalNetAmount;
    data.PostStatus = 'Accept';
    try {
      await createDataFunction(`/PurchaseOrder/${id}`, data); // Update instead of create
      toast.success('Purchase Order Updated Successfully');
      setTimeout(() => navigate('/PurchaseOrderList'), 2000);
    } catch (err) {
      console.log(err);
      toast.error('Something went wrong');
    }
  };

  if (loading) return <p className="text-center p-4">Loading...</p>;

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Edit Purchase Order</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Purchase Date</label>
            <input
              type="date"
              {...register('OrderDate', { required: true })}
              className="w-full px-4 py-2 border rounded-lg bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Distributor</label>
            <input
              
              value={selectedDistributor.DistrbutorName} 
              className="w-full px-4 py-2 border rounded-lg bg-gray-100"
            />
            
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Purchase Order No</label>
            <input
              type="text"
              disabled
              defaultValue={''}
              {...register('OrderCode', { required: true })}
              className="w-full px-4 py-2 border rounded-lg bg-gray-100"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-36">Product</th>
                <th className="border p-2">Carton</th>
                <th className="border p-2">Box</th>
                <th className="border p-2">Rate Per Box</th>
                <th className="border p-2">GrossAmount</th>
                <th className="border p-2">NetAmount</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border p-2">
                    <AsyncSelect
                      menuPortalTarget={document.body}
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                      cacheOptions
                      onChange={(selectedOption) => handleCellChange(row.id, 'product', selectedOption ? selectedOption.value : '')}
                      loadOptions={loadInvoiceOptions}
                      defaultOptions
                      value={Products.find((p) => p._id === row.product) ? { label: Products.find((p) => p._id === row.product).ProductName, value: row.product } : null}
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.carton}
                      onChange={(e) => handleCellChange(row.id, 'carton', e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.box}
                      onChange={(e) => handleCellChange(row.id, 'box', e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">{row.Rate}</td>
                  <td className="border p-2">{row.GrossAmount}</td>
                  <td className="border p-2">{row.netAmunt}</td>
                  <td className="border p-2">
                    <button type="button" onClick={() => removeRow(row.id)} className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {tableData.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="border p-2">Total</td>
                  <td className="border p-2">{totalCarton}</td>
                  <td className="border p-2">{totalBOX}</td>
                  <td className="border p-2"></td>
                  <td className="border p-2">{totalGrossAmount.toFixed(2)}</td>
                  <td className="border p-2">{totalNetAmount.toFixed(2)}</td>
                  <td className="border p-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex justify-between">
          <button type="button" onClick={addNewRow} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            Add Row
          </button>

          <button type="submit" className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Update Purchase Order
          </button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseOrderEdit;
