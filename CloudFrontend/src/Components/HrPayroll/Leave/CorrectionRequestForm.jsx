import React, { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const CorrectionRequestForm = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [employeeId, setEmployeeId] = useState('');
    const [date, setDate] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [attendanceStatus, setAttendanceStatus] = useState('present');
    const [workMode, setWorkMode] = useState('office');
    const [reason, setReason] = useState('');

    React.useEffect(() => {
        getDataFundtion('HrEmployee/getEmployeeNameId').then(res => setEmployees(res.data || []));
    }, []);

    const handleSubmit = async () => {
        if (!employeeId || !date || !reason) return toast.error('Employee, date, and reason are required');

        const requestedChanges = {};
        if (checkIn) requestedChanges.checkIn = checkIn;
        if (checkOut) requestedChanges.checkOut = checkOut;
        requestedChanges.attendanceStatus = attendanceStatus;
        requestedChanges.workMode = workMode;

        try {
            await createDataFunction('/HrAttendanceCorrection', {
                employeeId, date, requestedChanges, reason
            });
            toast.success('Correction request submitted');
            setTimeout(() => navigate('/CorrectionRequestList'), 1000);
        } catch {
            toast.error('Failed to submit');
        }
    };

    return (
        <div className="pd-card p-6 max-w-2xl">
            <ToastContainer />
            <h2 className="pd-section-title mb-4">Request Attendance Correction</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Employee *</label>
                    <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="w-full pd-input">
                        <option value="">Select Employee</option>
                        {employees.map(e => <option key={e._id} value={e._id}>{e.code} - {e.firstName}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Date *</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pd-input" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Check In</label>
                    <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="w-full pd-input" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Check Out</label>
                    <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="w-full pd-input" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select value={attendanceStatus} onChange={e => setAttendanceStatus(e.target.value)} className="w-full pd-input">
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="leave">Leave</option>
                        <option value="half_day">Half Day</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Work Mode</label>
                    <select value={workMode} onChange={e => setWorkMode(e.target.value)} className="w-full pd-input">
                        <option value="office">Office</option>
                        <option value="work_from_home">Work From Home</option>
                        <option value="remote">Remote</option>
                        <option value="official_duty">Official Duty</option>
                        <option value="business_trip">Business Trip</option>
                        <option value="training">Training</option>
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Reason *</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                        className="w-full pd-input" placeholder="Why do you need this correction?" />
                </div>
            </div>

            <div className="flex gap-3">
                <button className="pd-btn-save" onClick={handleSubmit}>Submit Request</button>
                <button className="pd-btn-outline" onClick={() => navigate(-1)}>Cancel</button>
            </div>
        </div>
    );
};

export default CorrectionRequestForm;
