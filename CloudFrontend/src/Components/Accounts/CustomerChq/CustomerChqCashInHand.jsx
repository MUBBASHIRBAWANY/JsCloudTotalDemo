import React, { useState, useEffect } from 'react';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';

const CustomerChqCashInHand = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [allRows, setAllRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getDataFundtion('/CustomerChqRecived/Allunused');
        console.log(response, 'res');
        
        // Add unique id to each item
        const dataWithIds = response.map((item, index) => ({
          ...item,
          uniqueId: `${item.id || 'no-id'}-${item.chq || 'no-chq'}-${item.Invoice || 'no-inv'}-${index}`,
          chq: item.chq || '',
          Amount: item.Amount || 0,
          Invoice: item.Invoice || '',
          Customer: item.Customer || '',
          staus: item.staus || item.status || 'Pending',
          RealizeDate: item.RealizeDate || '',
        }));
        
        setData(dataWithIds);
        setAllRows(dataWithIds);
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (selectedRows.length === 0) return;

    try {
      // Group updates by document id
      const updatesById = {};
      selectedRows.forEach(uniqueId => {
        const row = data.find(r => r.uniqueId === uniqueId);
        if (row) {
          if (!row.chq) {
  console.log("Skipping invalid row", row);
  return;
}
          if (!updatesById[row.id]) updatesById[row.id] = [];
          updatesById[row.id].push({
            chq: row.chq,
            Status: 'check in hand',
            date: new Date().toISOString().split('T')[0],
            remarks2: ''
          });
        }
      });

      // Send updates to backend
      const updatePromises = Object.keys(updatesById).map(id =>
        updateDataFunction(`/CustomerChqRecived/upDateCustomerChq/${id}`, updatesById[id])
      );

      await Promise.all(updatePromises);

      // Refetch data after updates
      const response = await getDataFundtion('/CustomerChqRecived/Allunused');
      const dataWithIds = response.map((item, index) => ({
        ...item,
        uniqueId: `${item.id || 'no-id'}-${item.chq || 'no-chq'}-${item.Invoice || 'no-inv'}-${index}`,
        chq: item.chq || '',
        Amount: item.Amount || 0,
        Invoice: item.Invoice || '',
        Customer: item.Customer || '',
        staus: item.staus || item.status || 'Pending',
        RealizeDate: item.RealizeDate || '',
      }));
      setData(dataWithIds);
      setAllRows(dataWithIds);

      setSelectedRows([]);
    } catch (error) {
      console.error('Error updating status:', error);
      // Optionally show error message to user
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);

    if (!value) {
      setData(allRows);
      setSelectedRows(prev => prev.filter(id => allRows.some(row => row.uniqueId === id)));
      return;
    }

    const searchValue = value.toLowerCase();

    const filtered = allRows.filter((row) =>
      Object.values(row).some((field) =>
        String(field).toLowerCase().includes(searchValue)
      )
    );

    setData(filtered);
    setSelectedRows(prev => prev.filter(id => filtered.some(row => row.uniqueId === id)));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(data.map(row => row.uniqueId));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedRows(prev => [...prev, id]);
    } else {
      setSelectedRows(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  if (error) return <div className="p-4 pd-stat-negative">Error: {error}</div>;
  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Customer Cheque Check In Hand</h1>
      <div className="mb-4 flex items-center gap-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          className="px-3 py-2 border pd-border-default border rounded-md w-80"
        />
        <button
          onClick={handleSubmit}
          disabled={selectedRows.length === 0}
          className={`px-4 py-2 rounded-md text-white ${
            selectedRows.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'pd-bg-muted0 hover:bg-blue-600'
          }`}
        >
          Submit ({selectedRows.length} selected)
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full pd-bg-surface border pd-border-default border">
          <thead>
            <tr className="pd-bg-muted">
              <th className="px-4 py-2 border-b">
                <input
                  type="checkbox"
                  checked={data.length > 0 && selectedRows.length === data.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4"
                />
              </th>
              <th className="px-4 py-2 border-b text-left">Chq Number</th>
              <th className="px-4 py-2 border-b text-left">Amount</th>
              <th className="px-4 py-2 border-b text-left">Invoice</th>
              <th className="px-4 py-2 border-b text-left">Customer</th>
              <th className="px-4 py-2 border-b text-left">Status</th>
              <th className="px-4 py-2 border-b text-left">Realize Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.uniqueId} className="hover:pd-bg-muted">
                <td className="px-4 py-2 border-b text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(row.uniqueId)}
                    onChange={(e) => handleSelectRow(row.uniqueId, e.target.checked)}
                    className="w-4 h-4"
                  />
                </td>
                <td className="px-4 py-2 border-b">{row.chq}</td>
                <td className="px-4 py-2 border-b">{row.Amount}</td>
                <td className="px-4 py-2 border-b">{row.Invoice}</td>
                <td className="px-4 py-2 border-b">{row.Customer}</td>
                <td className="px-4 py-2 border-b">{row.staus}</td>
                <td className="px-4 py-2 border-b">{row.RealizeDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerChqCashInHand;
