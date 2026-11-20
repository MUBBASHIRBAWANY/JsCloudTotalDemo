import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    fetchShifts,
    createShift,
    assignShift,
    fetchOvertimePolicies,
    createOvertimePolicy,
    clearAttendanceHrError,
} from "../../Redux/Reducers/attendanceHrSlice.js"
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
    Checkbox,
    FormGroup,
    FormControlLabel,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const emptyShiftForm = {
    name: "",
    startTime: "",
    endTime: "",
    applicableDays: [],
    gracePeriodMinutes: 0,
}

const emptyPolicyForm = {
    shiftId: "",
    minimumThresholdMinutes: 30,
    maxDailyOvertimeHours: 4,
    weekendMultiplier: 1.5,
    holidayMultiplier: 2,
}

const emptyAssignForm = {
    empId: "",
    shiftId: "",
    effectiveFrom: "",
}

const ShiftManagementPage = () => {
    const dispatch = useDispatch()
    const { shifts, overtimePolicies, loading, error } = useSelector(
        (s) => s.attendanceHr
    )

    // Shift dialog
    const [shiftDialogOpen, setShiftDialogOpen] = useState(false)
    const [shiftForm, setShiftForm] = useState(emptyShiftForm)

    // Policy dialog
    const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
    const [policyForm, setPolicyForm] = useState(emptyPolicyForm)

    // Assign form
    const [assignForm, setAssignForm] = useState(emptyAssignForm)
    const [assignSuccess, setAssignSuccess] = useState(false)

    useEffect(() => {
        dispatch(fetchShifts())
        dispatch(fetchOvertimePolicies())
    }, [dispatch])

    // ── Shift dialog handlers ──────────────────────────────────────────────
    const openShiftDialog = () => {
        setShiftForm(emptyShiftForm)
        setShiftDialogOpen(true)
    }

    const closeShiftDialog = () => {
        setShiftDialogOpen(false)
        setShiftForm(emptyShiftForm)
    }

    const handleShiftChange = (e) => {
        const { name, value } = e.target
        setShiftForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleDayToggle = (day) => {
        setShiftForm((prev) => {
            const days = prev.applicableDays.includes(day)
                ? prev.applicableDays.filter((d) => d !== day)
                : [...prev.applicableDays, day]
            return { ...prev, applicableDays: days }
        })
    }

    const handleShiftSubmit = () => {
        dispatch(
            createShift({
                ...shiftForm,
                gracePeriodMinutes: Number(shiftForm.gracePeriodMinutes),
            })
        )
        closeShiftDialog()
    }

    // ── Policy dialog handlers ─────────────────────────────────────────────
    const openPolicyDialog = () => {
        setPolicyForm(emptyPolicyForm)
        setPolicyDialogOpen(true)
    }

    const closePolicyDialog = () => {
        setPolicyDialogOpen(false)
        setPolicyForm(emptyPolicyForm)
    }

    const handlePolicyChange = (e) => {
        const { name, value } = e.target
        setPolicyForm((prev) => ({ ...prev, [name]: value }))
    }

    const handlePolicySubmit = () => {
        dispatch(
            createOvertimePolicy({
                ...policyForm,
                minimumThresholdMinutes: Number(policyForm.minimumThresholdMinutes),
                maxDailyOvertimeHours: Number(policyForm.maxDailyOvertimeHours),
                weekendMultiplier: Number(policyForm.weekendMultiplier),
                holidayMultiplier: Number(policyForm.holidayMultiplier),
            })
        )
        closePolicyDialog()
    }

    // ── Assign shift handlers ─────────────────────────────────────────────
    const handleAssignChange = (e) => {
        const { name, value } = e.target
        setAssignForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleAssignSubmit = async () => {
        const { empId, shiftId, effectiveFrom } = assignForm
        if (!empId || !shiftId || !effectiveFrom) return
        const result = await dispatch(
            assignShift({ id: shiftId, empId, data: { effectiveFrom } })
        )
        if (!result.error) {
            setAssignSuccess(true)
            setAssignForm(emptyAssignForm)
            setTimeout(() => setAssignSuccess(false), 3000)
        }
    }

    const handleClearError = () => {
        dispatch(clearAttendanceHrError())
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    // const getShiftName = (shiftId) => {
    //     const found = shifts.find((s) => s._id === shiftId)
    //     return found ? found.name : shiftId
    // }// ── Helpers ────────────────────────────────────────────────────────────
    const getShiftName = (shiftId) => {
        if (!shiftId) return "N/A";
        const found = shifts.find((s) => s._id === shiftId)
        // ✅ Make sure we return a string, not an object
        return found ? found.name : String(shiftId)
    }

    // ✅ Helper to safely render shift data
    const renderShiftValue = (value) => {
        if (value === null || value === undefined) return "N/A"
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value)
    }


    return (
        <div className="p-6">
            {/* ── Section 1: Shifts ───────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Shifts</h2>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openShiftDialog}>
                    Add Shift
                </Button>
            </div>

            {loading && (
                <div className="flex justify-center py-10">
                    <CircularProgress />
                </div>
            )}

            {error && (
                <Alert severity="error" className="mb-5" onClose={handleClearError}>
                    {typeof error === "string" ? error : error?.message || "An error occurred"}
                </Alert>
            )}

            {!loading && (
                <Table size="small" className="mb-8">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Start Time</TableCell>
                            <TableCell>End Time</TableCell>
                            <TableCell>Applicable Days</TableCell>
                            <TableCell>Grace Period (min)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {shifts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No shifts found.
                                </TableCell>
                            </TableRow>
                        )}
                        {shifts.map((shift) => (
                            <TableRow key={shift._id}>
                                <TableCell>{shift.name}</TableCell>
                                <TableCell>{shift.startTime}</TableCell>
                                <TableCell>{shift.endTime}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {(shift.applicableDays ?? []).map((day) => (
                                            <Chip key={day} label={day} size="small" />
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>{shift.gracePeriodMinutes ?? 0}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* ── Section 2: Overtime Policies ────────────────────────────── */}
            <div className="flex items-center justify-between mb-5 mt-8">
                <h2 className="pd-section-title">Overtime Policies</h2>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openPolicyDialog}>
                    Add Policy
                </Button>
            </div>

            {!loading && (
                <Table size="small" className="mb-8">
                    <TableHead>
                        <TableRow>
                            <TableCell>Shift</TableCell>
                            <TableCell>Min Threshold (min)</TableCell>
                            <TableCell>Max Daily Hours</TableCell>
                            <TableCell>Weekend Multiplier</TableCell>
                            <TableCell>Holiday Multiplier</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {overtimePolicies.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No overtime policies found.
                                </TableCell>
                            </TableRow>
                        )}
                        {overtimePolicies.map((policy) => (
                            
                            <TableRow key={policy._id}>
                                <TableCell>{getShiftName(policy.shiftId?.name)}</TableCell>
                                <TableCell>{policy.minimumThresholdMinutes}</TableCell>
                                <TableCell>{policy.maxDailyOvertimeHours}</TableCell>
                                <TableCell>{policy.weekendMultiplier}</TableCell>
                                <TableCell>{policy.holidayMultiplier}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* ── Section 3: Assign Shift ─────────────────────────────────── */}
            <div className="mt-8">
                <h2 className="pd-section-title mb-5">Assign Shift to Employee</h2>

                {assignSuccess && (
                    <Alert severity="success" className="mb-4">
                        Shift assigned successfully.
                    </Alert>
                )}

                <div className="flex flex-wrap gap-4 items-end">
                    <TextField
                        label="Employee ID"
                        name="empId"
                        value={assignForm.empId}
                        onChange={handleAssignChange}
                        size="small"
                        style={{ minWidth: 180 }}
                    />
                    <FormControl size="small" style={{ minWidth: 200 }}>
                        <InputLabel>Shift</InputLabel>
                        <Select
                            name="shiftId"
                            value={assignForm.shiftId}
                            label="Shift"
                            onChange={handleAssignChange}
                        >
                            {shifts.map((shift) => (
                                <MenuItem key={shift._id} value={shift._id}>
                                    {shift.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Effective From"
                        name="effectiveFrom"
                        type="date"
                        value={assignForm.effectiveFrom}
                        onChange={handleAssignChange}
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<AssignmentIndIcon />}
                        onClick={handleAssignSubmit}
                        disabled={
                            !assignForm.empId || !assignForm.shiftId || !assignForm.effectiveFrom
                        }
                    >
                        Assign
                    </Button>
                </div>
            </div>

            {/* ── Add Shift Dialog ─────────────────────────────────────────── */}
            <Dialog open={shiftDialogOpen} onClose={closeShiftDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Add Shift</DialogTitle>
                <DialogContent>
                    <div className="flex flex-col gap-4 pt-2">
                        <TextField
                            label="Name"
                            name="name"
                            value={shiftForm.name}
                            onChange={handleShiftChange}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Start Time (HH:MM)"
                            name="startTime"
                            value={shiftForm.startTime}
                            onChange={handleShiftChange}
                            placeholder="08:00"
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="End Time (HH:MM)"
                            name="endTime"
                            value={shiftForm.endTime}
                            onChange={handleShiftChange}
                            placeholder="17:00"
                            fullWidth
                            size="small"
                        />
                        <div>
                            <p className="text-sm font-medium mb-1">Applicable Days</p>
                            <FormGroup row>
                                {DAYS.map((day) => (
                                    <FormControlLabel
                                        key={day}
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={shiftForm.applicableDays.includes(day)}
                                                onChange={() => handleDayToggle(day)}
                                            />
                                        }
                                        label={day}
                                    />
                                ))}
                            </FormGroup>
                        </div>
                        <TextField
                            label="Grace Period (minutes, 0–60)"
                            name="gracePeriodMinutes"
                            type="number"
                            value={shiftForm.gracePeriodMinutes}
                            onChange={handleShiftChange}
                            fullWidth
                            size="small"
                            slotProps={{ input: { min: 0, max: 60 } }}
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeShiftDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleShiftSubmit}
                        disabled={!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Add Policy Dialog ────────────────────────────────────────── */}
            <Dialog open={policyDialogOpen} onClose={closePolicyDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Add Overtime Policy</DialogTitle>
                <DialogContent>
                    <div className="flex flex-col gap-4 pt-2">
                        <FormControl fullWidth size="small">
                            <InputLabel>Shift</InputLabel>
                            <Select
                                name="shiftId"
                                value={policyForm.shiftId}
                                label="Shift"
                                onChange={handlePolicyChange}
                            >
                                {shifts.map((shift) => (
                                    <MenuItem key={shift._id} value={shift._id}>
                                        {shift.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Min Threshold (minutes)"
                            name="minimumThresholdMinutes"
                            type="number"
                            value={policyForm.minimumThresholdMinutes}
                            onChange={handlePolicyChange}
                            fullWidth
                            size="small"
                            slotProps={{ input: { min: 0 } }}
                        />
                        <TextField
                            label="Max Daily Overtime Hours"
                            name="maxDailyOvertimeHours"
                            type="number"
                            value={policyForm.maxDailyOvertimeHours}
                            onChange={handlePolicyChange}
                            fullWidth
                            size="small"
                            slotProps={{ input: { min: 0 } }}
                        />
                        <TextField
                            label="Weekend Multiplier"
                            name="weekendMultiplier"
                            type="number"
                            value={policyForm.weekendMultiplier}
                            onChange={handlePolicyChange}
                            fullWidth
                            size="small"
                            slotProps={{ input: { min: 1, step: 0.1 } }}
                        />
                        <TextField
                            label="Holiday Multiplier"
                            name="holidayMultiplier"
                            type="number"
                            value={policyForm.holidayMultiplier}
                            onChange={handlePolicyChange}
                            fullWidth
                            size="small"
                            slotProps={{ input: { min: 1, step: 0.1 } }}
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closePolicyDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handlePolicySubmit}
                        disabled={!policyForm.shiftId}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default ShiftManagementPage
