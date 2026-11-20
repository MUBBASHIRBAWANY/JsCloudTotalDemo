import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    fetchLeaveApplications,
    approveLeaveApplication,
    rejectLeaveApplication,
    fetchLeaveCalendar,
    adjustLeaveBalance,
} from "../../Redux/Reducers/leaveSlice.js"
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Chip,
    CircularProgress,
    Alert,
    Typography,
} from "@mui/material"
import LeaveAuditTable from "../../Components/HrLeave/LeaveAuditTable.jsx"

const now = new Date()

const emptyAdjForm = {
    empId: "",
    leaveType: "casual",
    amount: "",
    reason: "",
}

const statusColor = (status) => {
    if (status === "approved") return "success"
    if (status === "rejected") return "error"
    if (status === "pending") return "warning"
    return "default"
}

const LeaveManagementPage = () => {
    const dispatch = useDispatch()
    const { leaveApplications, auditLog, calendar, loading, error } = useSelector(
        (s) => s.leave
    )

    // ── Section A state ──────────────────────────────────────────────────────
    const [fetchEmpId, setFetchEmpId] = useState("")
    const [remarkDialogOpen, setRemarkDialogOpen] = useState(false)
    const [actionTarget, setActionTarget] = useState(null) // { app, action: 'approve'|'reject' }
    const [remark, setRemark] = useState("")

    // ── Section B state ──────────────────────────────────────────────────────
    const [calMonth, setCalMonth] = useState(now.getMonth() + 1)
    const [calYear, setCalYear] = useState(now.getFullYear())

    // ── Section C state ──────────────────────────────────────────────────────
    const [adjForm, setAdjForm] = useState(emptyAdjForm)

    // Derive current balance from the most recent audit log entry for the selected emp+leaveType
    const currentBalance = (() => {
        if (!adjForm.empId.trim()) return null
        // First look in the audit log for the most recent entry
        const filtered = [...auditLog]
            .filter(
                (e) =>
                    (e.employeeId === adjForm.empId || e.empId === adjForm.empId) &&
                    e.leaveType === adjForm.leaveType
            )
            .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
        if (filtered.length > 0) return filtered[0].newBalance ?? null
        // Fall back to leaveApplications array if it exposes a leaveBalance field
        const appMatch = leaveApplications.find(
            (a) =>
                (a.employeeId === adjForm.empId || a.empId === adjForm.empId) &&
                a.leaveType === adjForm.leaveType &&
                a.leaveBalance !== undefined
        )
        return appMatch ? appMatch.leaveBalance : null
    })()

    // ── Effects ──────────────────────────────────────────────────────────────
    useEffect(() => {
        dispatch(fetchLeaveCalendar({ month: calMonth, year: calYear }))
    }, [dispatch, calMonth, calYear])

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleFetchApplications = () => {
        if (fetchEmpId.trim()) {
            dispatch(fetchLeaveApplications(fetchEmpId.trim()))
        }
    }

    const openRemarkDialog = (app, action) => {
        setActionTarget({ app, action })
        setRemark("")
        setRemarkDialogOpen(true)
    }

    const closeRemarkDialog = () => {
        setRemarkDialogOpen(false)
        setActionTarget(null)
        setRemark("")
    }

    const handleRemarkSubmit = () => {
        if (!actionTarget) return
        const { app, action } = actionTarget
        if (action === "approve") {
            dispatch(approveLeaveApplication({ id: app._id, remark }))
        } else {
            dispatch(rejectLeaveApplication({ id: app._id, remark }))
        }
        closeRemarkDialog()
    }

    const handleAdjChange = (e) => {
        const { name, value } = e.target
        setAdjForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleAdjSubmit = () => {
        const { empId, leaveType, amount, reason } = adjForm
        if (!empId.trim() || !reason.trim() || amount === "") return
        dispatch(
            adjustLeaveBalance({
                empId: empId.trim(),
                adjustmentData: {
                    leaveType,
                    amount: Number(amount),
                    reason,
                },
            })
        )
        setAdjForm(emptyAdjForm)
    }

    const pendingApplications = leaveApplications.filter(
        (a) => a.status === "pending"
    )

    // Leave balance for selected application
    const getLeaveBalance = (app) => {
        if (!app) return null
        if (app.leaveBalance !== undefined) return app.leaveBalance
        return null
    }

    return (
        <div className="p-6">
            <h2 className="pd-section-title mb-5">Leave Management</h2>

            {loading && (
                <div className="flex justify-center py-8">
                    <CircularProgress />
                </div>
            )}

            {error && (
                <Alert severity="error" className="mb-5">
                    {typeof error === "string" ? error : error?.message || "An error occurred"}
                </Alert>
            )}

            {/* ── Section A: Pending Applications ─────────────────────────────── */}
            <div className="mb-8">
                <h3 className="pd-section-title mb-3">Pending Leave Applications</h3>
                <div className="flex items-center gap-3 mb-4">
                    <TextField
                        label="Employee ID"
                        size="small"
                        value={fetchEmpId}
                        onChange={(e) => setFetchEmpId(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleFetchApplications()}
                    />
                    <Button variant="outlined" onClick={handleFetchApplications}>
                        Load Applications
                    </Button>
                </div>

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Employee ID</TableCell>
                            <TableCell>Leave Type</TableCell>
                            <TableCell>Start Date</TableCell>
                            <TableCell>End Date</TableCell>
                            <TableCell>Days Requested</TableCell>
                            <TableCell>Reason</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {leaveApplications.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    No leave applications found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            leaveApplications.map((app) => (
                                console.log(app),
                                <TableRow key={app._id}>
                                    <TableCell>{app.employeeId.code} - {app.employeeId.firstName}</TableCell>
                                    <TableCell>{app.leaveType || "—"}</TableCell>
                                    <TableCell>
                                        {app.startDate
                                            ? new Date(app.startDate).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {app.endDate
                                            ? new Date(app.endDate).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell>{app.daysRequested ?? app.days ?? "—"}</TableCell>
                                    <TableCell>{app.reason || "—"}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={app.status}
                                            color={statusColor(app.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {app.status === "pending" && (
                                            <div className="flex gap-1">
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="success"
                                                    onClick={() => openRemarkDialog(app, "approve")}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    onClick={() => openRemarkDialog(app, "reject")}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Section B: Leave Calendar ─────────────────────────────────── */}
            <div className="mb-8">
                <h3 className="pd-section-title mb-3">Leave Calendar</h3>
                <div className="flex items-center gap-3 mb-4">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Month</InputLabel>
                        <Select
                            value={calMonth}
                            label="Month"
                            onChange={(e) => setCalMonth(e.target.value)}
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                <MenuItem key={m} value={m}>
                                    {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Year"
                        type="number"
                        size="small"
                        value={calYear}
                        onChange={(e) => setCalYear(Number(e.target.value))}
                        slotProps={{ input: { min: 2000, max: 2100 } }}
                        sx={{ width: 100 }}
                    />
                    <Button
                        variant="outlined"
                        onClick={() =>
                            dispatch(fetchLeaveCalendar({ month: calMonth, year: calYear }))
                        }
                    >
                        Refresh
                    </Button>
                </div>

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Employee</TableCell>
                            <TableCell>Leave Type</TableCell>
                            <TableCell>Start Date</TableCell>
                            <TableCell>End Date</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {calendar.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    No approved leaves for this period.
                                </TableCell>
                            </TableRow>
                        ) : (
                            calendar.map((entry, idx) => (
                                <TableRow key={entry._id || idx}>
                                    <TableCell>
 {entry.employeeId
    ? `${entry.employeeId.code} - ${entry.employeeId.firstName} ${entry.employeeId.lastName}`
    : entry.empId || "—"}                                        {"—"}
                                    </TableCell>
                                    <TableCell>{entry.leaveType || "—"}</TableCell>
                                    <TableCell>
                                        {entry.startDate
                                            ? new Date(entry.startDate).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {entry.endDate
                                            ? new Date(entry.endDate).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Section C: Balance Adjustment ────────────────────────────── */}
            <div className="mb-8">
                <h3 className="pd-section-title mb-3">Balance Adjustment</h3>
                {currentBalance !== null && (
                    <Alert severity="info" className="mb-4" sx={{ maxWidth: 480 }}>
                        Current <strong>{adjForm.leaveType}</strong> balance for{" "}
                        <strong>{adjForm.empId}</strong>:{" "}
                        <strong>{currentBalance} days</strong>
                    </Alert>
                )}
                <div className="flex flex-wrap gap-4 items-end">
                    <TextField
                        label="Employee ID"
                        name="empId"
                        size="small"
                        value={adjForm.empId}
                        onChange={handleAdjChange}
                    />
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Leave Type</InputLabel>
                        <Select
                            name="leaveType"
                            value={adjForm.leaveType}
                            label="Leave Type"
                            onChange={handleAdjChange}
                        >
                            <MenuItem value="casual">Casual</MenuItem>
                            <MenuItem value="medical">Medical</MenuItem>
                            <MenuItem value="annual">Annual</MenuItem>
                            <MenuItem value="unpaid">Unpaid</MenuItem>
                            <MenuItem value="maternity">Maternity</MenuItem>
                            <MenuItem value="paternity">Paternity</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="Adjustment Amount"
                        name="amount"
                        type="number"
                        size="small"
                        value={adjForm.amount}
                        onChange={handleAdjChange}
                        helperText="Can be negative to deduct"
                        sx={{ width: 180 }}
                    />
                    <TextField
                        label="Reason"
                        name="reason"
                        size="small"
                        value={adjForm.reason}
                        onChange={handleAdjChange}
                        inputProps={{ maxLength: 200 }}
                        helperText={`${adjForm.reason.length}/200 (required)`}
                        sx={{ minWidth: 280 }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleAdjSubmit}
                        disabled={
                            !adjForm.empId.trim() ||
                            adjForm.amount === "" ||
                            !adjForm.reason.trim()
                        }
                    >
                        Apply Adjustment
                    </Button>
                </div>
            </div>

            {/* ── Section D: Audit Trail ───────────────────────────────────── */}
            <div className="mb-8">
                <h3 className="pd-section-title mb-3">Leave Audit Trail</h3>
                <LeaveAuditTable auditLog={auditLog} />
            </div>

            {/* ── Remark Dialog ────────────────────────────────────────────── */}
            <Dialog open={remarkDialogOpen} onClose={closeRemarkDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {actionTarget?.action === "approve"
                        ? "Approve Leave Application"
                        : "Reject Leave Application"}
                </DialogTitle>
                <DialogContent>
                    <div className="flex flex-col gap-4 pt-2">
                        {actionTarget?.app && (
                            <div>
                                {(() => {
                                    const balance = getLeaveBalance(actionTarget.app)
                                    return balance !== null ? (
                                        <Alert severity="info" className="mb-3">
                                            Current {actionTarget.app.leaveType} balance:{" "}
                                            <strong>{balance} days</strong>
                                        </Alert>
                                    ) : null
                                })()}
                                <Typography variant="body2" className="text-gray-600">
                                    Employee: {actionTarget.app.employeeId || actionTarget.app.empId} |
                                    Leave Type: {actionTarget.app.leaveType} |
                                    Days: {actionTarget.app.daysRequested ?? actionTarget.app.days}
                                </Typography>
                            </div>
                        )}
                        <TextField
                            label="Remark"
                            multiline
                            rows={3}
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            inputProps={{ maxLength: 500 }}
                            helperText={`${remark.length}/500`}
                            fullWidth
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeRemarkDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={actionTarget?.action === "approve" ? "success" : "error"}
                        onClick={handleRemarkSubmit}
                    >
                        {actionTarget?.action === "approve" ? "Approve" : "Reject"}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default LeaveManagementPage
