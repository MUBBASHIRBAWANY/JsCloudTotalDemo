import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { getDataFundtion } from '../../../Api/CRUDFunctions';

const FixedAssetList = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await getDataFundtion('/FixedAsset');
      setAssets(res.data || []);
    } catch (err) {
      console.error('Error fetching fixed assets:', err);
      toast.error('Error fetching fixed assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const filteredAssets = assets.filter(
    (a) =>
      (a.AssetName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.AssetCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.AssetCategory || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.Status || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US');
  };

  return (
    <div>
      <ToastContainer />
      <h1 className="pd-page-title text-center mb-6">Fixed Asset List</h1>

      <div className="pd-card p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <input
            type="text"
            className="pd-input w-full md:w-80"
            placeholder="Search by name, code, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="pd-btn-save"
            onClick={() => navigate('/FixedAssetAdd')}
          >
            + Add Fixed Asset
          </button>
        </div>

        {loading ? (
          <p className="text-center py-10">Loading...</p>
        ) : filteredAssets.length === 0 ? (
          <p className="text-center py-10 pd-text-secondary">No fixed assets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="pd-table w-full">
              <thead>
                <tr>
                  <th className="pd-th">Asset Code</th>
                  <th className="pd-th">Asset Name</th>
                  <th className="pd-th">Category</th>
                  <th className="pd-th">Purchase Cost</th>
                  <th className="pd-th">Book Value</th>
                  <th className="pd-th">Acc. Depreciation</th>
                  <th className="pd-th">Status</th>
                  <th className="pd-th">Purchase Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr key={asset._id} className="pd-tr-hover">
                    <td className="pd-td">{asset.AssetCode || '-'}</td>
                    <td className="pd-td font-medium">{asset.AssetName}</td>
                    <td className="pd-td">{asset.AssetCategory || '-'}</td>
                    <td className="pd-td text-right">{formatCurrency(asset.PurchaseCost)}</td>
                    <td className="pd-td text-right">{formatCurrency(asset.BookValue)}</td>
                    <td className="pd-td text-right">{formatCurrency(asset.AccumulatedDepreciation)}</td>
                    <td className="pd-td">
                      <span
                        className={`pd-badge ${
                          asset.Status === 'Active'
                            ? 'pd-badge-success'
                            : asset.Status === 'Disposed'
                            ? 'pd-badge-danger'
                            : 'pd-badge-warning'
                        }`}
                      >
                        {asset.Status}
                      </span>
                    </td>
                    <td className="pd-td">{formatDate(asset.PurchaseDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FixedAssetList;
