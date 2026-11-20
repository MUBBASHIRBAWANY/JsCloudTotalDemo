import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction } from '../../Api/CurdFunctions';
import { isAdminUser } from '../Global/distributorAccess';

const StockAdjustmentAdd = () => {
  const navigate = useNavigate();
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail);
  const Products = useSelector((state) => state.Product.product);
  const Distributors = useSelector((state) => state.DistributroReducers.DistributroReducers);

  useEffect(() => {
    if (!isAdminUser(loginuser)) {
      navigate('/');
    }
  }, [loginuser, navigate]);

  const [selectedDistributor, setSelectedDistributor] = useState(null);
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [tableData, setTableData] = useState([]);

  const distributorOptions = Distributors.map((item) => ({
    value: item._id,
    label: item.DistrbutorName,
  }));

  const productOptions = Products.map((item) => ({
    value: item._id,
    label: `${item.code} ${item.ProductName}`,
  }));

  const addNewRow = () => {
    setTableData([
      ...tableData,
      {
        id: Date.now(),
        product: '',
        adjustmentType: 'Add',
        Box: 0,
        Carton: 0,
        Unit: 0,
      },
    ]);
  };

  const removeRow = (id) => {
    setTableData(tableData.filter((row) => row.id !== id));
  };

  const handleCellChange = (id, field, value) => {
    setTableData(
      tableData.map((row) => {
        if (row.id === id) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  const totalBox = tableData.reduce((sum, row) => sum + (parseInt(row.Box) || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.Carton) || 0), 0);
  const totalUnit = tableData.reduce((sum, row) => sum + (parseInt(row.Unit) || 0), 0);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDistributor) {
      toast.error('Please select a Distributor');
      return;
    }
    if (tableData.length === 0) {
      toast.error('Please add at least one adjustment row');
      return;
    }

    const hasEmptyProduct = tableData.some((row) => !row.product);
    if (hasEmptyProduct) {
      toast.error('Please select a product for all rows');
      return;
    }

    const payload = {
      Distrbutor: selectedDistributor.value,
      AdjustmentDate: adjustmentDate,
      Reason: reason,
      CreatedBy: loginuser?._id || loginuser?.email,
      Adjustments: tableData.map((row) => ({
        product: row.product,
        adjustmentType: row.adjustmentType,
        Box: parseInt(row.Box) || 0,
        Carton: parseInt(row.Carton) || 0,
        Unit: parseInt(row.Unit) || 0,
      })),
    };

    try {
      await createDataFunction('/StockAdjustment', payload);
      toast.success('Stock Adjustment Created Successfully');
      setTimeout(() => {
        navigate('/StockAdjustmentList');
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:text-3xl font-bold text-center text-gray-800 mb-6">
        Stock Adjustment (Add / Less)
      </h1>

      <form onSubmit={onSubmit} className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Distributor */}
          <div>
            <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">
              Distributor *
            </label>
            <Select
              menuPortalTarget={document.body}
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              }}
              value={selectedDistributor}
              onChange={setSelectedDistributor}
              options={distributorOptions}
              placeholder="Select Distributor..."
              isSearchable
              isClearable
            />
          </div>

          {/* Adjustment Date */}
          <div>
            <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">
              Adjustment Date *
            </label>
            <input
              type="date"
              value={adjustmentDate}
              onChange={(e) => setAdjustmentDate(e.target.value)}
              className="w-full px-3 py-2 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">
              Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for adjustment..."
              className="w-full px-3 py-2 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Adjustment Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 min-w-[200px]">Product</th>
                <th className="border p-2 min-w-[120px]">Type (Add / Less)</th>
                <th className="border p-2">Box</th>
                <th className="border p-2">Carton</th>
                <th className="border p-2">Unit</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border p-2">
                    <Select
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        control: (provided) => ({
                          ...provided,
                          minHeight: '35px',
                          fontSize: '14px',
                        }),
                      }}
                      value={
                        row.product
                          ? {
                              value: row.product,
                              label: Products.find((p) => p._id === row.product)
                                ? `${Products.find((p) => p._id === row.product)?.code} ${Products.find((p) => p._id === row.product)?.ProductName}`
                                : row.product,
                            }
                          : null
                      }
                      onChange={(selectedOption) =>
                        handleCellChange(row.id, 'product', selectedOption?.value || '')
                      }
                      options={productOptions}
                      className="text-sm"
                      classNamePrefix="select"
                      placeholder="Select Product..."
                      isSearchable
                      isClearable
                    />
                  </td>

                  <td className="border p-2">
                    <select
                      value={row.adjustmentType}
                      onChange={(e) => handleCellChange(row.id, 'adjustmentType', e.target.value)}
                      className="w-full p-2 text-sm border rounded"
                    >
                      <option value="Add" className="text-green-600 font-bold">
                        ➕ Add
                      </option>
                      <option value="Less" className="text-red-600 font-bold">
                        ➖ Less
                      </option>
                    </select>
                  </td>

                  <td className="border p-2">
                    <input
                      type="number"
                      min="0"
                      value={row.Box}
                      onChange={(e) => handleCellChange(row.id, 'Box', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      type="number"
                      min="0"
                      value={row.Carton}
                      onChange={(e) => handleCellChange(row.id, 'Carton', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      type="number"
                      min="0"
                      value={row.Unit}
                      onChange={(e) => handleCellChange(row.id, 'Unit', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>

                  <td className="border p-2">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="bg-red-500 text-white px-2 py-1 text-xs md:text-sm rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {tableData.length !== 0 && (
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="border p-2">Total</td>
                  <td className="border p-2"></td>
                  <td className="border p-2 text-center">{totalBox}</td>
                  <td className="border p-2 text-center">{totalCarton}</td>
                  <td className="border p-2 text-center">{totalUnit}</td>
                  <td className="border p-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <button
            type="button"
            onClick={addNewRow}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm md:text-base"
          >
            + Add Row
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm md:text-base"
          >
            Save Stock Adjustment
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockAdjustmentAdd;
