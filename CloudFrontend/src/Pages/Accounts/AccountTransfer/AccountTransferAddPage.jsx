import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { GetClient } from '../../../Redux/ClientSlice';
import { GetTransport } from '../../../Redux/TransportSlice';
import { GetAccount } from '../../../Redux/AccountSlice';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const AccountTransferAddPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { clients } = useSelector((state) => state.ClientReducer);
  const { transports } = useSelector((state) => state.TransportReducer);
  const { accounts } = useSelector((state) => state.AccountReducer);

  const [transferType, setTransferType] = useState('Client');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [availableEntries, setAvailableEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(GetClient());
    dispatch(GetTransport());
    dispatch(GetAccount());
  }, [dispatch]);

  useEffect(() => {
    if (fromAccount && transferType) {
      fetchEntries();
    }
  }, [fromAccount, transferType]);

  const fetchEntries = async () => {
    setEntriesLoading(true);
    try {
      const type = transferType === 'Client' ? 'client' : 'transporter';
      const res = await axios.get(`/api/account-transfer/entries/${type}/${fromAccount}`);
      setAvailableEntries(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch entries');
      setAvailableEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };

  const filteredEntries = availableEntries.filter((entry) =>
    entry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectEntry = (entry) => {
    setSelectedEntries((prev) => {
      const exists = prev.find((e) => e._id === entry._id);
      if (exists) return prev.filter((e) => e._id !== entry._id);
      return [...prev, entry];
    });
  };

  const handleSelectAll = () => {
    if (selectedEntries.length === filteredEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries([...filteredEntries]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromAccount) return toast.error('Please select From Account');
    if (!toAccount) return toast.error('Please select To Account');
    if (fromAccount === toAccount) return toast.error('From and To accounts cannot be the same');
    if (selectedEntries.length === 0) return toast.error('Please select at least one entry');

    setLoading(true);
    try {
      const type = transferType === 'Client' ? 'client' : 'transporter';
      await axios.post('/api/account-transfer', {
        transferType: type,
        fromAccount,
        toAccount,
        entryIds: selectedEntries.map((e) => e._id),
        reason,
      });
      toast.success('Account Transfer completed successfully');
      navigate('/AccountTransferList');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const getEntityOptions = () => {
    if (transferType === 'Client') {
      return clients || [];
    }
    return transports || [];
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Account Transfer</h1>

        <form onSubmit={handleSubmit}>
          {/* Transfer Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer To <span className="text-red-500">*</span>
              </label>
              <select
                value={transferType}
                onChange={(e) => {
                  setTransferType(e.target.value);
                  setFromAccount('');
                  setToAccount('');
                  setSelectedEntries([]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Client">Client</option>
                <option value="Transporter">Transporter</option>
              </select>
            </div>
            <div></div>
          </div>

          {/* From and To Account */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Account <span className="text-red-500">*</span>
              </label>
              <select
                value={fromAccount}
                onChange={(e) => {
                  setFromAccount(e.target.value);
                  setSelectedEntries([]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Account</option>
                {getEntityOptions().map((entity) => (
                  <option key={entity._id} value={entity._id}>
                    {entity.name || entity.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Account <span className="text-red-500">*</span>
              </label>
              <select
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Account</option>
                {getEntityOptions()
                  .filter((entity) => entity._id !== fromAccount)
                  .map((entity) => (
                    <option key={entity._id} value={entity._id}>
                      {entity.name || entity.companyName}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Transfer
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter reason for transfer..."
            />
          </div>

          {/* Entries Table */}
          {fromAccount && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  Available Entries ({filteredEntries.length})
                </h3>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search entries..."
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600"
                    />
                    Select All
                  </label>
                </div>
              </div>

              {entriesLoading ? (
                <div className="text-center py-8 text-gray-500">Loading entries...</div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-12">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Invoice No
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Name
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                          Balance
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No entries found
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map((entry, idx) => {
                          const isSelected = selectedEntries.some((e) => e._id === entry._id);
                          return (
                            <tr
                              key={entry._id}
                              onClick={() => handleSelectEntry(entry)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleSelectEntry(entry)}
                                  className="w-4 h-4 text-blue-600"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm">{entry.invoiceNo}</td>
                              <td className="px-4 py-3 text-sm">{entry.name}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                {entry.amount?.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                {entry.balance?.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm">{entry.date}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Selected Summary */}
          {selectedEntries.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-800">
                  {selectedEntries.length} entry(ies) selected
                </span>
                <span className="text-sm font-semibold text-blue-800">
                  Total Amount: {selectedEntries.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedEntries.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Transferring...' : 'Transfer Entries'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountTransferAddPage;
