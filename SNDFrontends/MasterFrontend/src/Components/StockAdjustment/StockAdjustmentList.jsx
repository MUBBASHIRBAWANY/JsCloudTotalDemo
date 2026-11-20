import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getDataFundtion, deleteDataFunction } from '../../Api/CurdFunctions';
import { isAdminUser } from '../Global/distributorAccess';

const StockAdjustmentList = () => {
  const navigate = useNavigate();
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail);
  const [adjustments, setAdjustments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAdminUser(loginuser)) {
      navigate('/');
    }
  }, [loginuser, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const Distirbutor = await getDataFundtion("/Distrbutor")
      
      const res = await getDataFundtion('/StockAdjustment');
      setAdjustments(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this adjustment?')) return;
    try {
      await deleteDataFunction(`/StockAdjustment/Delete/${id}`);
      toast.success('Deleted successfully');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="p-4">
      <ToastContainer />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-800">Stock Adjustment List</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/StockRecalculate')}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm md:text-base"
          >
            Recalculate Stock
          </button>
          <button
            onClick={() => navigate('/StockAdjustmentUpload')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm md:text-base"
          >
            📥 Upload Excel
          </button>
          <button
            onClick={() => navigate('/StockAdjustmentAdd')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm md:text-base"
          >
            + New Adjustment
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">#</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Distributor</th>
                <th className="border p-2">Reason</th>
                <th className="border p-2">Items</th>
                <th className="border p-2">Created By</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.length > 0 ? (
                adjustments.map((item, index) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="border p-2 text-center">{index + 1}</td>
                    <td className="border p-2">{item.AdjustmentDate}</td>
                    <td className="border p-2">
                      {item.Distrbutor?.DistrbutorName || item.Distrbutor}
                    </td>
                    <td className="border p-2">{item.Reason || '-'}</td>
                    <td className="border p-2">
                      <div className="space-y-1">
                        {item.Adjustments?.map((adj, i) => (
                          <div key={i} className="text-xs">
                            <span
                              className={`font-bold ${
                                adj.adjustmentType === 'Add' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {adj.adjustmentType === 'Add' ? '➕' : '➖'}{' '}
                              {adj.adjustmentType}
                            </span>{' '}
                            {adj.product?.ProductName || 'Unknown'} -{' '}
                            <strong>{adj.Box}</strong> Box
                            {adj.Carton ? `, ${adj.Carton} Carton` : ''}
                            {adj.Unit ? `, ${adj.Unit} Unit` : ''}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="border p-2">{item.CreatedBy}</td>
                    <td className="border p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/StockAdjustmentView/${item._id}`)}
                          className="bg-blue-500 text-white px-3 py-1 text-xs rounded hover:bg-blue-600"
                        >
                          View / Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="bg-red-500 text-white px-3 py-1 text-xs rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="border p-4 text-center text-gray-500">
                    No Stock Adjustments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockAdjustmentList;
