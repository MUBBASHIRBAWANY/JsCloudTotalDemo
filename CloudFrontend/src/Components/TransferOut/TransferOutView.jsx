import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

const TransferOutView = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const Store = useSelector(state => state.Store.Store);
  const Location = useSelector(state => state.Location.Location);
  const Products = useSelector(state => state.Product.product);
  const TransferOut = useSelector(state => state.TransferOut.TransferOut);

  const [transfer, setTransfer] = useState(null);
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    const found = TransferOut.find(item => item._id === id);
    if (found) {
      setTransfer(found);
      setTableData(found.TransferData || []);
    }
  }, [id, TransferOut]);

  const getProductName = (pid) => {
    const prod = Products.find(p => p._id === pid);
    return prod ? `${prod.mastercode} ${prod.ProductName}` : pid;
  };

  return (
    <div className="p-6 pd-bg-muted min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transfer Out Details</h1>
        <button
          onClick={() => navigate('/TransferOutList')}
          className="px-6 py-2 pd-bg-muted0 text-white rounded hover:bg-gray-600"
        >
          Back to List
        </button>
      </div>

      {transfer && (
        <div className="pd-bg-surface rounded-xl shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              ["Transfer Code", transfer.TransferCode],
              ["Transfer Date", new Date(transfer.TransferOutDate).toLocaleDateString('en-GB')],
              ["Location From", Location.find(l => l._id === transfer.LocationFrom)?.LocationName],
              ["Location To", Location.find(l => l._id === transfer.LocationTo)?.LocationName],
            ].map(([label, value]) => (
              <div className="space-y-2" key={label}>
                <label className="pd-label">{label}</label>
                <p className="text-lg font-medium pd-text-body">{value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-[color:var(--pd-border-card)]">
              <thead>
                <tr>
                  {['Product', 'Carton', 'Box', 'Unit', 'Rate', 'Gross Amount'].map(h => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="pd-bg-surface divide-y divide-[color:var(--pd-border-card)]">
                {tableData.map((row) => (
                  <tr key={row.id} >
                    <td className="px-6 py-4 text-sm pd-text-body">
                      {getProductName(row.product)}
                    </td>
                    <td className="px-6 py-4 text-sm pd-text-body">{row.carton}</td>
                    <td className="px-6 py-4 text-sm pd-text-body">{row.box}</td>
                    <td className="px-6 py-4 text-sm pd-text-body">{row.unit}</td>
                    <td className="px-6 py-4 text-sm pd-text-body">{Number(row.Rate).toFixed(4)}</td>
                    <td className="px-6 py-4 text-sm pd-text-body">{Number(row.GrossAmount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferOutView;
