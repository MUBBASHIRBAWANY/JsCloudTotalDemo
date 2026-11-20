import React, { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import api from '../../../Api/ApiInstance';

const ZKTecoSync = () => {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('4370');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);

  const handleSync = async () => {
    if (!ip) {
      toast.error('Machine IP is required');
      return;
    }

    setSyncing(true);
    setResult(null);

    try {
      const payload = { ip, port: parseInt(port) || 4370 };
      if (startDate) payload.startDate = startDate;
      if (endDate) payload.endDate = endDate;

      const res = await api.post('/HrAttendance/sync-machine', payload);
      setResult(res.data);

      if (res.data.processed > 0) {
        toast.success(`Synced ${res.data.processed} attendance records`);
      } else {
        toast.info('No new records to sync');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="pd-card p-6">
      <ToastContainer />
      <h3 className="text-lg font-semibold mb-4 pd-section-title">ZKTeco Machine Sync</h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Machine IP *</label>
          <input type="text" value={ip} onChange={(e) => setIp(e.target.value)} className="w-full pd-input" placeholder="192.168.1.100" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Port</label>
          <input type="number" value={port} onChange={(e) => setPort(e.target.value)} className="w-full pd-input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pd-input" />
        </div>
        <div className="flex items-end">
          <button onClick={handleSync} disabled={syncing || !ip} className="pd-btn-save w-full disabled:opacity-50">
            {syncing ? 'Syncing...' : 'Sync Attendance'}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-4 p-4 rounded-lg border bg-gray-50">
          <h4 className="font-medium mb-2">Result: {result.processed || 0} new, {result.skipped || 0} skipped</h4>
          {result.message && <p className="text-sm text-gray-600">{result.message}</p>}
        </div>
      )}
    </div>
  );
};

export default ZKTecoSync;
