import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../Api/CurdFunctions';
import { isAdminUser } from '../Global/distributorAccess';

const StockAdjustmentViewEdit = () => {
  const { id } = useParams();
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
  const [adjustmentDate, setAdjustmentDate] = useState('');
  const [reason, setReason] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const distributorOptions = Distributors.map((item) => ({
    value: item._id,
    label: item.DistrbutorName,
  }));

  const productOptions = Products.map((item) => ({
    value: item._id,
    label: `${item.code} ${item.ProductName}`,
  }));

  // Fetch adjustment data by ID
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await getDataFundtion(`/StockAdjustment/${id}`);
        const adj = res.data;

        if (adj.Distrbutor) {
          setSelectedDistributor({
            value: adj.Distrbutor._id || adj.Distrbutor,
            label: adj.Distrbutor.DistrbutorName || adj.Distrbutor,
          });
        }

        setAdjustmentDate(adj.AdjustmentDate || '');
        setReason(adj.Reason || '');
        setCreatedBy(adj.CreatedBy || '');
        setCreatedAt(adj.createdAt ? new Date(adj.createdAt).toLocaleString() : '');

        setIsPosted(adj.isPosted || false);

        setTableData(
          (adj.Adjustments || []).map((item, index) => ({
            id: Date.now() + index,
            product: item.product?._id || item.product,
            adjustmentType: item.adjustmentType,
            Box: item.Box || 0,
            Carton: item.Carton || 0,
            Unit: item.Unit || 0,
          }))
        );
      } catch (err) {
        console.error(err);
        toast.error('Failed to load adjustment data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

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

  const removeRow = (rowId) => {
    setTableData(tableData.filter((row) => row.id !== rowId));
  };

  const handleCellChange = (rowId, field, value) => {
    setTableData(
      tableData.map((row) => {
        if (row.id === rowId) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  const totalBox = tableData.reduce((sum, row) => sum + (parseInt(row.Box) || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.Carton) || 0), 0);
  const totalUnit = tableData.reduce((sum, row) => sum + (parseInt(row.Unit) || 0), 0);

  const handleSave = async () => {
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

    setIsSaving(true);
    try {
      const payload = {
        Distrbutor: selectedDistributor.value,
        AdjustmentDate: adjustmentDate,
        Reason: reason,
        Adjustments: tableData.map((row) => ({
          product: row.product,
          adjustmentType: row.adjustmentType,
          Box: parseInt(row.Box) || 0,
          Carton: parseInt(row.Carton) || 0,
          Unit: parseInt(row.Unit) || 0,
        })),
      };

      await updateDataFunction(`/StockAdjustment/${id}`, payload);
      toast.success('Stock Adjustment Updated Successfully');
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update adjustment');
    } finally {
      setIsSaving(false);
    }
  };

  const getProductLabel = (productId) => {
    const p = Products.find((prod) => prod._id === productId);
    return p ? `${p.code} ${p.ProductName}` : 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }
const handlePost = async () => {
    if (!window.confirm('Are you sure you want to post this Stock Adjustment? This will update TotalProduct stock.')) return;
    setIsPosting(true);
    try {
      const res = await updateDataFunction(`/StockAdjustment/Post/${id}`, {
        PostedBy: loginuser?._id || loginuser?.email,
      });
      setIsPosted(true);
      toast.success(res.message || 'Stock Adjustment posted successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to post adjustment');
    } finally {
      setIsPosting(false);
    }
  };
  return (
    <div className="p-4">
      <ToastContainer />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-800">
          Stock Adjustment {isEditing ? '(Edit Mode)' : '(View)'}
        </h1>
        <div className="flex gap-3">
          {isPosted ? (
            <span className="px-4 py-2 bg-green-100 text-green-700 border border-green-300 rounded-lg text-sm md:text-base font-semibold">
              ✅ Posted
            </span>
          ) : (
            <button
              type="button"
              onClick={handlePost}
              disabled={isPosting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base font-semibold disabled:opacity-50"
            >
              {isPosting ? '⏳ Posting...' : '📤 Post'}
            </button>
          )}
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm md:text-base"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => navigate('/StockAdjustmentList')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm md:text-base"
              >
                ← Back to List
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm md:text-base disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : '💾 Save Changes'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm md:text-base"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Detail Card */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Distributor */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Distributor</label>
            {isEditing ? (
              <Select
                menuPortalTarget={document.body}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                value={selectedDistributor}
                onChange={setSelectedDistributor}
                options={distributorOptions}
                placeholder="Select Distributor..."
                isSearchable
                isClearable
              />
            ) : (
              <p className="text-base text-gray-800 font-medium">
                {selectedDistributor?.label || '-'}
              </p>
            )}
          </div>

          {/* Adjustment Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Adjustment Date
            </label>
            {isEditing ? (
              <input
                type="date"
                value={adjustmentDate}
                onChange={(e) => setAdjustmentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-base text-gray-800 font-medium">{adjustmentDate || '-'}</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Reason</label>
            {isEditing ? (
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason..."
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-base text-gray-800 font-medium">{reason || '-'}</p>
            )}
          </div>

          {/* Created By (read-only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Created By</label>
            <p className="text-base text-gray-800 font-medium">{createdBy || '-'}</p>
          </div>

          {/* Created At (read-only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Created At</label>
            <p className="text-base text-gray-800 font-medium">{createdAt || '-'}</p>
          </div>
        </div>

        {/* Adjustment Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 min-w-[200px]">Product</th>
                <th className="border p-2 min-w-[120px]">Type</th>
                <th className="border p-2">Box</th>
                <th className="border p-2">Carton</th>
                <th className="border p-2">Unit</th>
                {isEditing && <th className="border p-2">Action</th>}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border p-2">
                    {isEditing ? (
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
                                label: getProductLabel(row.product),
                              }
                            : null
                        }
                        onChange={(opt) => handleCellChange(row.id, 'product', opt?.value || '')}
                        options={productOptions}
                        className="text-sm"
                        classNamePrefix="select"
                        placeholder="Select Product..."
                        isSearchable
                        isClearable
                      />
                    ) : (
                      <span className="font-medium text-gray-800">{getProductLabel(row.product)}</span>
                    )}
                  </td>

                  <td className="border p-2">
                    {isEditing ? (
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
                    ) : (
                      <span
                        className={`font-bold ${
                          row.adjustmentType === 'Add' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {row.adjustmentType === 'Add' ? '➕ Add' : '➖ Less'}
                      </span>
                    )}
                  </td>

                  <td className="border p-2">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={row.Box}
                        onChange={(e) => handleCellChange(row.id, 'Box', e.target.value)}
                        className="w-full p-1 text-sm border rounded"
                      />
                    ) : (
                      <span className="font-semibold text-gray-800">{row.Box}</span>
                    )}
                  </td>

                  <td className="border p-2">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={row.Carton}
                        onChange={(e) => handleCellChange(row.id, 'Carton', e.target.value)}
                        className="w-full p-1 text-sm border rounded"
                      />
                    ) : (
                      <span className="font-semibold text-gray-800">{row.Carton}</span>
                    )}
                  </td>

                  <td className="border p-2">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={row.Unit}
                        onChange={(e) => handleCellChange(row.id, 'Unit', e.target.value)}
                        className="w-full p-1 text-sm border rounded"
                      />
                    ) : (
                      <span className="font-semibold text-gray-800">{row.Unit}</span>
                    )}
                  </td>

                  {isEditing && (
                    <td className="border p-2">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  )}
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
                  {isEditing && <td className="border p-2"></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {isEditing && (
          <div className="flex justify-start">
            <button
              type="button"
              onClick={addNewRow}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm md:text-base"
            >
              + Add Row
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockAdjustmentViewEdit;
