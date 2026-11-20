import React, { useEffect, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import AppSelect from '../../Global/AppSelect';

const AttendanceMark = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthAttendance, setMonthAttendance] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});

  const [employeeOffDays, setEmployeeOffDays] = useState([]);

  useEffect(() => {
    getDataFundtion("HrEmployee/getEmployeeNameId").then((res) => setEmployees(res.data || []));
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadMonthAttendance();
      // Fetch employee's off days
      getDataFundtion(`HrEmployee/${selectedEmployee}`).then((res) => {
        const emp = res.data;
        setEmployeeOffDays(emp?.policyTags?.workWeek?.offDays || ['Sunday']);
      });
    }
  }, [selectedEmployee, selectedMonth]);

  const isOffDay = (dateStr) => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const date = new Date(dateStr + 'T00:00:00');
    return employeeOffDays.includes(dayNames[date.getDay()]);
  };

  const loadMonthAttendance = async () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    const data = await getDataFundtion(`HrAttendance/dateRange?startDate=${startDate}&endDate=${endDate}&employeeId=${selectedEmployee}`);
    setMonthAttendance(data.data || []);
  };

  const getDaysInMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const days = [];
    const lastDay = new Date(year, month, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return days;
  };

  const getAttendanceForDate = (dateStr) => {
    return monthAttendance.find(a => a.date === dateStr);
  };

  const handleMark = async (dateStr) => {
    if (!selectedEmployee) return toast.error("Select an employee first");
    try {
      const statusToAttendanceStatus = {
        present: 'present',
        absent: 'absent',
        late: 'present',
        'half-day': 'half_day',
        leave: 'leave',
      };
      const status = editFields.status || 'present';
      const payload = {
        employeeId: selectedEmployee,
        date: dateStr,
        checkIn: editFields.checkIn || '09:00',
        checkOut: editFields.checkOut || '',
        status,
        attendanceStatus: statusToAttendanceStatus[status] || status,
        remarks: editFields.remarks || '',
        informed: editFields.informed || false,
        isExtraDay: isOffDay(dateStr),
      };
      await createDataFunction("/HrAttendance", payload);
      toast.success(`Attendance marked for ${dateStr}`);
      setEditingId(null);
      setEditFields({});
      loadMonthAttendance();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Something went wrong");
    }
  };

  const handleUpdate = async (attendanceId) => {
    try {
      const statusToAttendanceStatus = {
        present: 'present',
        absent: 'absent',
        late: 'present',
        'half-day': 'half_day',
        leave: 'leave',
      };
      const status = editFields.status || 'present';
      const payload = {
        status,
        attendanceStatus: statusToAttendanceStatus[status] || status,
        checkIn: editFields.checkIn || '',
        checkOut: editFields.checkOut || '',
        remarks: editFields.remarks || '',
        informed: editFields.informed || false,
        isExtraDay: isOffDay(editingId || ''),
      };
      await updateDataFunction(`/HrAttendance/update/${attendanceId}`, payload);
      toast.success("Attendance updated");
      setEditingId(null);
      setEditFields({});
      loadMonthAttendance();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Something went wrong");
    }
  };

  const startEdit = (dateStr, existing) => {
    setEditingId(dateStr);
    setEditFields({
      checkIn: existing?.checkIn || '09:00',
      checkOut: existing?.checkOut || '',
      status: existing?.status || 'present',
      remarks: existing?.remarks || '',
      informed: existing?.informed || false,
    });
  };

  const days = getDaysInMonth();

  return (
    <div className="pd-card p-6">
      <ToastContainer />
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Employee *</label>
          <AppSelect
            options={employees.map(e => ({ value: e._id, label: `${e.firstName} ${e.lastName} (${e.code})` }))}
            value={selectedEmployee ? employees.filter(e => e._id === selectedEmployee).map(e => ({ value: e._id, label: `${e.firstName} ${e.lastName} (${e.code})` }))[0] || null : null}
            onChange={(sel) => setSelectedEmployee(sel?.value || '')}
            isClearable
            placeholder="Select Employee"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full pd-input" />
        </div>
      </div>

      {selectedEmployee && (
        <div className="overflow-x-auto">
          <table className="w-full pd-data-table">
            <thead>
              <tr>
                <th className="w-28">Date</th>
                <th className="w-24">Day</th>
                <th className="w-24">Check In</th>
                <th className="w-24">Check Out</th>
                <th className="w-28">Status</th>
                <th className="w-40">Remarks</th>
                <th className="w-20">Informed</th>
                <th className="w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {days.map((dateStr) => {
                const existing = getAttendanceForDate(dateStr);
                const isEditing = editingId === dateStr;
                const dayName = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                const dateIsOffDay = isOffDay(dateStr);

                return (
                  <tr key={dateStr} className={dateIsOffDay ? 'bg-gray-50' : ''}>
                    <td className="font-medium">
                      {dateStr}
                      {existing?.isExtraDay && <span className="ml-2 text-xs text-green-600 font-bold">Extra</span>}
                    </td>
                    <td>{dayName}</td>
                    {isEditing ? (
                      <>
                        <td>
                          <input type="time" value={editFields.checkIn} onChange={(e) => setEditFields({ ...editFields, checkIn: e.target.value })} className="w-full pd-input text-sm" />
                        </td>
                        <td>
                          <input type="time" value={editFields.checkOut} onChange={(e) => setEditFields({ ...editFields, checkOut: e.target.value })} className="w-full pd-input text-sm" />
                        </td>
                        <td>
                          <select value={editFields.status} onChange={(e) => setEditFields({ ...editFields, status: e.target.value })} className="w-full pd-input text-sm">
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="half-day">Half Day</option>
                            <option value="leave">Leave</option>
                          </select>
                        </td>
                        <td>
                          <input value={editFields.remarks} onChange={(e) => setEditFields({ ...editFields, remarks: e.target.value })} className="w-full pd-input text-sm" placeholder="Optional" />
                        </td>
                        <td className="text-center">
                          <input type="checkbox" checked={editFields.informed} onChange={(e) => setEditFields({ ...editFields, informed: e.target.checked })} className="accent-blue-600" />
                        </td>
                        <td>
                          <div className="flex gap-1">
                            {existing ? (
                              <button className="pd-btn-save text-xs px-2 py-1" onClick={() => handleUpdate(existing._id)}>Save</button>
                            ) : (
                              <button className="pd-btn-save text-xs px-2 py-1" onClick={() => handleMark(dateStr)}>Mark</button>
                            )}
                            <button className="pd-btn-outline text-xs px-2 py-1" onClick={() => { setEditingId(null); setEditFields({}); }}>Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{existing?.checkIn || '-'}</td>
                        <td>{existing?.checkOut || '-'}</td>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs ${
                            existing?.status === 'present' ? 'bg-green-100 text-green-700' :
                            existing?.status === 'absent' ? 'bg-red-100 text-red-700' :
                            existing?.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                            existing?.status === 'leave' ? 'bg-blue-100 text-blue-700' :
                            existing?.status === 'half-day' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {existing?.status || 'Not Marked'}
                          </span>
                        </td>
                        <td>{existing?.remarks || '-'}</td>
                        <td className="text-center">{existing?.informed ? 'Yes' : 'No'}</td>
                        <td>
                          <button className="pd-btn-outline text-xs px-2 py-1" onClick={() => startEdit(dateStr, existing)}>
                            {existing ? 'Edit' : '+ Mark'}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceMark;
