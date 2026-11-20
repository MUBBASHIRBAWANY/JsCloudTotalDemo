import { useEffect, useMemo, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import api from '../../Api/ApiInstance';

const getDate = (row) => String(row?.date || '').slice(0, 10);

const AttendanceReport = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [name, setName] = useState('');
  const [markingType, setMarkingType] = useState('all');

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const response = await api.get('/Attandance');
      const payload = response.data;
      setRows(Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load attendance report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAttendance(); }, []);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const date = getDate(row);
    const booker = String(row.bookername || row.orderBookerName || row.UserId || row.orderBookerId || '').toLowerCase();
    return (!fromDate || date >= fromDate)
      && (!toDate || date <= toDate)
      && (!name || booker.includes(name.toLowerCase()))
      && (markingType === 'all' || String(row.markingType || '').toLowerCase() === markingType);
  }).sort((a, b) => `${getDate(b)} ${b.time || ''}`.localeCompare(`${getDate(a)} ${a.time || ''}`)), [rows, fromDate, toDate, name, markingType]);

  const exportCsv = () => {
    const columns = ['Date', 'Booker', 'User ID', 'Store ID', 'Marking Type', 'Time', 'Latitude', 'Longitude', 'Image'];
    const values = filteredRows.map((row) => [getDate(row), row.bookername || row.orderBookerName || '', row.UserId || row.orderBookerId || '', row.distributorId || '', row.markingType || '', row.time || '', row.latitude || '', row.longitude || '', row.imageUrl || row.uri || '']);
    const csv = [columns, ...values].map((record) => record.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'attendance-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="p-4 md:p-6">
      <ToastContainer />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-800">Attendance Report</h1><p className="text-sm text-gray-500">{filteredRows.length} attendance records</p></div>
        <div className="flex gap-2"><button onClick={loadAttendance} className="rounded border px-4 py-2 hover:bg-gray-50" disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button><button onClick={exportCsv} disabled={!filteredRows.length} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">Export CSV</button></div>
      </div>
      <section className="mb-4 grid gap-3 rounded-lg bg-white p-4 shadow sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">From date<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="text-sm">To date<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="text-sm">Order booker<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Search by name or ID" className="mt-1 w-full rounded border p-2" /></label>
        <label className="text-sm">Marking type<select value={markingType} onChange={(event) => setMarkingType(event.target.value)} className="mt-1 w-full rounded border p-2"><option value="all">All</option><option value="check-in">Check-in</option><option value="check-out">Check-out</option></select></label>
      </section>
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-700"><tr>{['Date', 'Order Booker', 'User ID', 'Marking', 'Time', 'Location', 'Image'].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 font-semibold">{heading}</th>)}</tr></thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan="7" className="p-6 text-center text-gray-500">Loading attendance…</td></tr>
              : filteredRows.length ? filteredRows.map((row, index) => {
                const image = row.imageUrl || row.uri;
                return <tr key={row._id || `${getDate(row)}-${row.UserId}-${row.markingType}-${index}`} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">{getDate(row) || '—'}</td><td className="px-4 py-3">{row.bookername || row.orderBookerName || '—'}</td><td className="px-4 py-3">{row.UserId || row.orderBookerId || '—'}</td><td className="px-4 py-3 capitalize">{row.markingType || '—'}</td><td className="whitespace-nowrap px-4 py-3">{row.time || '—'}</td><td className="px-4 py-3">{row.latitude && row.longitude ? <a className="text-blue-600 underline" href={`https://www.google.com/maps?q=${encodeURIComponent(`${row.latitude},${row.longitude}`)}`} target="_blank" rel="noreferrer">View map</a> : '—'}</td><td className="px-4 py-3">{image ? <a className="text-blue-600 underline" href={image} target="_blank" rel="noreferrer">View image</a> : '—'}</td>
                </tr>;
              }) : <tr><td colSpan="7" className="p-6 text-center text-gray-500">No attendance records found.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default AttendanceReport;
