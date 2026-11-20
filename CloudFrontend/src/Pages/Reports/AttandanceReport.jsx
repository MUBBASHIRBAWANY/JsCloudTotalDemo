import React, { useState, useEffect } from 'react';
import { FaDownload, FaFilter, FaMapMarkerAlt, FaClock, FaUser, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { getDataFundtion } from '../../Api/CRUDFunctions';
import ReportPageLayout from '../../Components/Global/ReportPageLayout.jsx';
import { exportProfessionalExcel } from '../../utils/exportProfessionalExcel';


const AttendanceReport = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: "" ,end: "" });
  const [reportData, setReportData] = useState([]);

  const getData = async () => {
    try {
      setLoading(true);
      const users= await getDataFundtion("/DitriButorOrderBooker")
      const res = await getDataFundtion(`/Attandance/SortAttandance?startDate=${dateRange.start}&endDate=${dateRange.end}`);
      if (res?.data) {
        const alldata = res.data.map((item)=>({
            ...item,
            UserId : users.data.find((ur)=> ur._id == item.UserId)?.OrderBookerName || "",
        }))
        setAttendanceData(alldata);
        processReportData(alldata);
        console.log(alldata)
      }
      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  }

  useEffect(() => {
    getData();
  }, []);

  const processReportData = (data) => {
    if (!data || !Array.isArray(data)) {
      setReportData([]);
      return;
    }

    // Group by UserId and Date
    const grouped = {};
    
    data.forEach(record => {
      const key = `${record.UserId}_${record.date}`;
      if (!grouped[key]) {
        grouped[key] = {
          userId: record.UserId,
          date: record.date,
          checkInTime: null,
          checkOutTime: null,
          checkInLocation: null,
          checkOutLocation: null,
          checkInLat: null,
          checkInLng: null,
          checkOutLat: null,
          checkOutLng: null
        };
      }
      
      if (record.markingType === 'check-in') {
        grouped[key].checkInTime = record.time;
        grouped[key].checkInLocation = record.location;
        grouped[key].checkInLat = record.latitude;
        grouped[key].checkInLng = record.longitude;
      } else if (record.markingType === 'check-out') {
        grouped[key].checkOutTime = record.time;
        grouped[key].checkOutLocation = record.location;
        grouped[key].checkOutLat = record.latitude;
        grouped[key].checkOutLng = record.longitude;
      }
    });
    
    const reportArray = Object.values(grouped);
    setReportData(reportArray);
  };

  // Handle date range filter
  const handleFilter = () => {
    getData();
  };

  const handleDateChange = (type, value) => {
    setDateRange(prev => ({ ...prev, [type]: value }));
  };

  const exportToCSV = () => {
    // Helper function to escape CSV fields
    const escapeCSV = (value) => {
      if (value === null || value === undefined || value === '—') {
        return '—';
      }
      // Convert to string
      let stringValue = String(value);
      // If the value contains commas, quotes, or newlines, wrap in quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        // Replace double quotes with double double-quotes
        stringValue = stringValue.replace(/"/g, '""');
        return `"${stringValue}"`;
      }
      return stringValue;
    };

    const headers = [
      'User ID',
      'Date',
      'Check-In Time',
      'Check-In Location (Full Address)',
      'Check-In Latitude',
      'Check-In Longitude',
      'Check-Out Time',
      'Check-Out Location (Full Address)',
      'Check-Out Latitude',
      'Check-Out Longitude'
    ];
    
    const csvData = reportData.map(item => [
      escapeCSV(item.userId),
      escapeCSV(item.date),
      escapeCSV(item.checkInTime),
      escapeCSV(item.checkInLocation), // Full address - will be properly quoted
      escapeCSV(item.checkInLat),
      escapeCSV(item.checkInLng),
      escapeCSV(item.checkOutTime),
      escapeCSV(item.checkOutLocation), // Full address - will be properly quoted
      escapeCSV(item.checkOutLat),
      escapeCSV(item.checkOutLng)
    ]);
    
    // Create CSV content with headers
    const headerRow = headers.join(',');
    const dataRows = csvData.map(row => row.join(',')).join('\n');
    const csvContent = headerRow + '\n' + dataRows;
    
    // Add BOM for UTF-8 to handle special characters properly
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async () => {
    if (!reportData.length) return;
    try {
      const rows = reportData.map((item) => ({
        'User ID': item.userId || '',
        'Date': item.date || '',
        'Check-In Time': item.checkInTime || '',
        'Check-In Location (Full Address)': item.checkInLocation || '',
        'Check-In Latitude': item.checkInLat ?? '',
        'Check-In Longitude': item.checkInLng ?? '',
        'Check-Out Time': item.checkOutTime || '',
        'Check-Out Location (Full Address)': item.checkOutLocation || '',
        'Check-Out Latitude': item.checkOutLat ?? '',
        'Check-Out Longitude': item.checkOutLng ?? '',
      }));

      await exportProfessionalExcel({
        title: 'Attendance Report',
        fileName: 'Attendance_Report',
        sheetName: 'Attendance',
        rows,
        columns: [
          { header: 'User ID', key: 'User ID', type: 'text' },
          { header: 'Date', key: 'Date', type: 'text' },
          { header: 'Check-In Time', key: 'Check-In Time', type: 'text' },
          { header: 'Check-In Location (Full Address)', key: 'Check-In Location (Full Address)', type: 'text' },
          { header: 'Check-In Latitude', key: 'Check-In Latitude', type: 'text' },
          { header: 'Check-In Longitude', key: 'Check-In Longitude', type: 'text' },
          { header: 'Check-Out Time', key: 'Check-Out Time', type: 'text' },
          { header: 'Check-Out Location (Full Address)', key: 'Check-Out Location (Full Address)', type: 'text' },
          { header: 'Check-Out Latitude', key: 'Check-Out Latitude', type: 'text' },
          { header: 'Check-Out Longitude', key: 'Check-Out Longitude', type: 'text' },
        ],
        meta: [`Period: ${dateRange.start || ''} to ${dateRange.end || ''}`],
        excludeKeys: ['_id', 'id'],
      });
    } catch (err) {
      console.error('Excel export error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pd-bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="pd-text-muted">Loading report...</p>
        </div>
      </div>
    );
  }

  return (
          <ReportPageLayout title="Booker Attendance Report">

    <div className="pd-page min-h-screen">
      <div className="max-w-[95%] mx-auto">
        {/* Header */}
        <div className="pd-card mb-6 p-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="pd-page-title">Attendance Report</h1>
              <p className="pd-text-muted text-sm mt-1">Detailed check-in and check-out summary with location coordinates</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
            >
              <FaDownload /> Export CSV
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-all"
            >
              <FaDownload /> Download Excel
            </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="pd-card mb-6 p-6">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="pd-label">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="w-full px-4 py-2 border pd-border-default border rounded-lg"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="pd-label">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="w-full px-4 py-2 border pd-border-default border rounded-lg"
              />
            </div>
            <div className="text-sm">
              <button
                onClick={handleFilter}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <FaFilter /> Get Data
              </button>
            </div>
          </div>
        </div>

        {/* Report Table */}
        <div className="pd-bg-surface rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                <tr>
                  <th rowSpan="2" className="px-4 py-4 text-left text-sm font-semibold text-white border-r border-[color:var(--pd-primary)]">User ID</th>
                  <th rowSpan="2" className="px-4 py-4 text-left text-sm font-semibold text-white border-r border-[color:var(--pd-primary)]">Date</th>
                  <th colSpan="5" className="px-4 py-3 text-center text-sm font-semibold text-white border-r border-[color:var(--pd-primary)] bg-blue-700">
                    <FaArrowRight className="inline mr-2" /> CHECK-IN
                  </th>
                  <th colSpan="5" className="px-4 py-3 text-center text-sm font-semibold text-white bg-blue-700">
                    CHECK-OUT <FaArrowLeft className="inline ml-2" />
                  </th>
                </tr>
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[color:var(--pd-primary)]">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[color:var(--pd-primary)]">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[color:var(--pd-primary)]">Latitude</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[color:var(--pd-primary)]">Longitude</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[color:var(--pd-primary)]">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[color:var(--pd-primary)]">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[color:var(--pd-primary)]">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[color:var(--pd-primary)]">Latitude</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[color:var(--pd-primary)]">Longitude</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--pd-border-card)]">
                {reportData.length > 0 ? (
                  reportData.map((record, idx) => (
                    <tr key={`${record.userId}_${record.date}`} className="transition-colors">
                      <td className="px-4 py-4 border-r pd-border-default border">
                        <div className="flex items-center gap-2">
                          <FaUser className="pd-text-primary text-sm" />
                          <span className="font-mono text-sm font-medium pd-text-body">
                            {record.userId || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 border-r pd-border-default border">
                        <span className="text-sm pd-text-body font-medium">{record.date || '—'}</span>
                      </td>
                      <td className="px-4 py-4 border-r pd-border-default border">
                        {record.checkInTime ? (
                          <div className="flex items-center gap-2">
                            <FaClock className="pd-stat-positive text-xs" />
                            <span className="text-sm text-green-700 font-semibold">{record.checkInTime}</span>
                          </div>
                        ) : (
                          <span className="text-sm pd-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 border-r pd-border-default border">
                        {record.checkInLocation ? (
                          <div className="flex items-center gap-2">
                            <FaMapMarkerAlt className="text-purple-500 text-xs flex-shrink-0" />
                            <span className="text-sm pd-text-body max-w-xs truncate" title={record.checkInLocation}>
                              {record.checkInLocation}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm pd-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 border-r pd-border-default border">
                        <span className="text-sm font-mono pd-text-muted">
                          {record.checkInLat ? parseFloat(record.checkInLat).toFixed(6) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 border-r pd-border-default border">
                        <span className="text-sm font-mono pd-text-muted">
                          {record.checkInLng ? parseFloat(record.checkInLng).toFixed(6) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 border-r pd-border-default border">
                        {record.checkInLocation && (
                          <button 
                            onClick={() => alert(`📍 Check-In Details:\n\nLocation: ${record.checkInLocation}\nLatitude: ${record.checkInLat}\nLongitude: ${record.checkInLng}`)}
                            className="text-xs pd-bg-muted pd-text-primary px-2 py-1 rounded hover:bg-blue-200"
                          >
                            View
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4 border-r pd-border-default border">
                        {record.checkOutTime ? (
                          <div className="flex items-center gap-2">
                            <FaClock className="pd-stat-negative text-xs" />
                            <span className="text-sm text-red-700 font-semibold">{record.checkOutTime}</span>
                          </div>
                        ) : (
                          <span className="text-sm pd-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 border-r pd-border-default border">
                        {record.checkOutLocation ? (
                          <div className="flex items-center gap-2">
                            <FaMapMarkerAlt className="text-orange-500 text-xs flex-shrink-0" />
                            <span className="text-sm pd-text-body max-w-xs truncate" title={record.checkOutLocation}>
                              {record.checkOutLocation}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm pd-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 border-r pd-border-default border">
                        <span className="text-sm font-mono pd-text-muted">
                          {record.checkOutLat ? parseFloat(record.checkOutLat).toFixed(6) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 border-r pd-border-default border">
                        <span className="text-sm font-mono pd-text-muted">
                          {record.checkOutLng ? parseFloat(record.checkOutLng).toFixed(6) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {record.checkOutLocation && (
                          <button 
                            onClick={() => alert(`📍 Check-Out Details:\n\nLocation: ${record.checkOutLocation}\nLatitude: ${record.checkOutLat}\nLongitude: ${record.checkOutLng}`)}
                            className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200"
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="12" className="text-center py-12">
                      <p className="pd-text-muted text-lg">No attendance records found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="pd-bg-surface rounded-xl shadow-lg p-4">
            <div className="text-sm pd-text-muted">Total Records</div>
            <div className="text-2xl font-bold pd-text-body">{reportData.length}</div>
          </div>
          <div className="pd-bg-surface rounded-xl shadow-lg p-4">
            <div className="text-sm pd-text-muted">Completed (Both IN & OUT)</div>
            <div className="text-2xl font-bold pd-stat-positive">
              {reportData.filter(r => r.checkInTime && r.checkOutTime).length}
            </div>
          </div>
          <div className="pd-bg-surface rounded-xl shadow-lg p-4">
            <div className="text-sm pd-text-muted">Check-In Only</div>
            <div className="text-2xl font-bold pd-text-primary">
              {reportData.filter(r => r.checkInTime && !r.checkOutTime).length}
            </div>
          </div>
          <div className="pd-bg-surface rounded-xl shadow-lg p-4">
            <div className="text-sm pd-text-muted">Check-Out Only</div>
            <div className="text-2xl font-bold text-orange-600">
              {reportData.filter(r => !r.checkInTime && r.checkOutTime).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  </ReportPageLayout>
  );
};

export default AttendanceReport;