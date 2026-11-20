import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import { useDispatch } from 'react-redux';
import { fetchHrAttendance } from '../../../Redux/Reducers/HrAttendanceReducer';
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import AppSelect from '../../Global/AppSelect';

const AttendanceList = () => {
  const [rows, setRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editInformed, setEditInformed] = useState(false);
  const [editLeaveTypeId, setEditLeaveTypeId] = useState('');
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    getDataFundtion("HrDepartment/getDepartmentNameId").then((res) => setDepartments(res.data || []));
    getDataFundtion("HrEmployee/getEmployeeNameId").then((res) => setEmployees(res.data || []));
    getDataFundtion("Store").then((res) => setStores(res.data || []));
  }, []);

  const getData = async () => {
    if (!startDate || !endDate) return toast.error("Start Date and End Date are required");
    let url = `HrAttendance/dateRange?startDate=${startDate}&endDate=${endDate}`;
    if (employeeId) url += `&employeeId=${employeeId}`;
    if (departmentId) url += `&departmentId=${departmentId}`;
    if (storeId) url += `&storeId=${storeId}`;
    const data = await getDataFundtion(url);
    const list = data.data;
    dispatch(fetchHrAttendance(list));
    setRows(list);
    setLoaded(true);
  };

  const handleEditClick = (row) => {
    setSelectedRow(row);
    setEditStatus(row.status);
    setEditInformed(row.informed || false);
    setEditLeaveTypeId(row.leaveTypeId || '');
    setOpenEditDialog(true);
    getDataFundtion('HrLeaveType/').then(res => setLeaveTypes(res.data || []));
  };

  const handleSaveEdit = async () => {
    const statusToAttendanceStatus = {
      present: 'present',
      absent: 'absent',
      late: 'present',
      'half-day': 'half_day',
      leave: 'leave',
    };
    const payload = {
      status: editStatus,
      attendanceStatus: statusToAttendanceStatus[editStatus] || editStatus,
      informed: editInformed,
    };
    if (editStatus === 'leave' && editLeaveTypeId) {
      payload.leaveTypeId = editLeaveTypeId;
    }
    await updateDataFunction(`/HrAttendance/update/${selectedRow._id}`, payload);
    setRows(rows.map((r) => r._id === selectedRow._id ? { ...r, status: editStatus, attendanceStatus: statusToAttendanceStatus[editStatus] || editStatus, informed: editInformed, leaveTypeId: editLeaveTypeId } : r));
    setOpenEditDialog(false);
    toast.success("Attendance updated");
  };

  const columns = [
    {
      field: 'employeeId',
      headerName: 'Employee',
      flex: 1,
      minWidth: 200,
      valueGetter: (value) => value ? `${value.firstName} ${value.lastName || ''} (${value.code})` : '',
    },
    { field: 'date', headerName: 'Date', width: 130 },
    { field: 'checkIn', headerName: 'Check In', width: 110 },
    { field: 'checkOut', headerName: 'Check Out', width: 110 },
    { field: 'status', headerName: 'Status', width: 110 },
    { field: 'informed', headerName: 'Informed', width: 90, valueGetter: (value) => value ? 'Yes' : 'No' },
    { field: 'overtime', headerName: 'Overtime', width: 100 },
    { field: 'remarks', headerName: 'Remarks', flex: 1, minWidth: 150 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEditClick(params.row)}
        />,
      ],
    },
  ];

  return (
    <div>
      <ToastContainer />
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date *</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="pd-input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date *</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="pd-input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Employee</label>
          <AppSelect
            options={employees.map(e => ({ value: e._id, label: `${e.firstName} ${e.lastName} (${e.code})` }))}
            value={employeeId ? employees.filter(e => e._id === employeeId).map(e => ({ value: e._id, label: `${e.firstName} ${e.lastName} (${e.code})` }))[0] || null : null}
            onChange={(sel) => setEmployeeId(sel?.value || '')}
            isClearable
            placeholder="All Employees"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Department</label>
          <AppSelect
            options={departments.map(d => ({ value: d._id, label: d.name }))}
            value={departmentId ? departments.filter(d => d._id === departmentId).map(d => ({ value: d._id, label: d.name }))[0] || null : null}
            onChange={(sel) => setDepartmentId(sel?.value || '')}
            isClearable
            placeholder="All Departments"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Business</label>
          <AppSelect
            options={stores.map(s => ({ value: s._id, label: s.StoreName }))}
            value={storeId ? stores.filter(s => s._id === storeId).map(s => ({ value: s._id, label: s.StoreName }))[0] || null : null}
            onChange={(sel) => setStoreId(sel?.value || '')}
            isClearable
            placeholder="All Businesses"
          />
        </div>
        <button className="pd-btn-save" onClick={getData}>Submit</button>
      </div>
      <div style={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row._id}
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          disableRowSelectionOnClick
        />
      </div>
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Edit Attendance</DialogTitle>
        <DialogContent>
          <div className="mt-2">
            <label className="block text-sm font-medium mb-1">Status</label>
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full pd-input">
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half-day">Half Day</option>
              <option value="leave">Leave</option>
            </select>
          </div>
          {editStatus === 'leave' && (
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Leave Type</label>
              <select value={editLeaveTypeId} onChange={(e) => setEditLeaveTypeId(e.target.value)} className="w-full pd-input">
                <option value="">Select Leave Type</option>
                {leaveTypes.filter(lt => lt.isActive).map(lt => (
                  <option key={lt._id} value={lt._id}>{lt.name} ({lt.code})</option>
                ))}
              </select>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2">
            <input type="checkbox" checked={editInformed} onChange={(e) => setEditInformed(e.target.checked)} className="accent-blue-600" id="editInformed" />
            <label htmlFor="editInformed" className="text-sm font-medium">Informed (No Late Deduction)</label>
          </div>
          <p className="text-xs text-gray-500 mt-1">If checked, no salary deduction for late arrival on this day.</p>
        </DialogContent>
        <DialogActions>
          <button className="pd-btn-outline" onClick={() => setOpenEditDialog(false)}>Cancel</button>
          <button className="pd-btn-save" onClick={handleSaveEdit}>Save</button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AttendanceList;
