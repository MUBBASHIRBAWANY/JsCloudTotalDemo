import { useState, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { createLeaveApplication } from "../../Redux/Reducers/leaveSlice.js"
import {
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
} from "@mui/material"

const LEAVE_TYPES = [
    { value: "casual",    label: "Casual Leave" },
    { value: "medical",   label: "Medical Leave" },
    { value: "annual",    label: "Annual Leave" },
    { value: "unpaid",    label: "Unpaid Leave" },
    { value: "maternity", label: "Maternity Leave" },
    { value: "paternity", label: "Paternity Leave" },
]

const EMPTY_FORM = {
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
}

const ESSLeaveApplicationPage = () => {
    const dispatch = useDispatch()
    const { leaveApplications, loading, error } = useSelector((s) => s.leave)

    const [form, setForm] = useState(EMPTY_FORM)
    const [dateError, setDateError] = useState("")
    const [successMsg, setSuccessMsg] = useState("")

    // Derive balance for selected leave type from existing applications
    // Count approved leaves of that type and show remaining (simple count-based)
    const leaveBalance = useMemo(() => {
        if (!form.leaveType) return null
        const approved = leaveApplications.filter(
            (a) =>
                (a.leaveType === form.leaveType || a.type === form.leaveType) &&
                a.status === "approved"
        )
        return approved.length
    }, [form.leaveType, leaveApplications])

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))

        // Clear date error when user edits dates
        if (name === "startDate" || name === "endDate") {
            setDateError("")
        }
    }

    const validateDates = () => {
        if (form.startDate && form.endDate) {
            if (new Date(form.endDate) < new Date(form.startDate)) {
                setDateError("End date must be on or after start date.")
                return false
            }
        }
        setDateError("")
        return true
    }

    const handleSubmit = async () => {
        if (!validateDates()) return

        setSuccessMsg("")
        const result = await dispatch(
            createLeaveApplication({
                leaveType: form.leaveType,
                startDate: form.startDate,
                endDate: form.endDate,
                reason: form.reason,
            })
        )

        if (!result.error) {
            setSuccessMsg("Leave application submitted successfully.")
            setForm(EMPTY_FORM)
            setDateError("")
        }
    }

    const reasonLength = form.reason.length

    return (
        <div className="p-6">
            <h2 className="pd-section-title mb-5">Apply for Leave</h2>

            {loading && (
                <div className="flex justify-center py-10">
                    <CircularProgress />
                </div>
            )}

            {error && (
                <Alert severity="error" className="mb-4">
                    {typeof error === "string"
                        ? error
                        : error?.message || "Failed to submit leave application."}
                </Alert>
            )}

            {successMsg && (
                <Alert severity="success" className="mb-4">
                    {successMsg}
                </Alert>
            )}

            <div className="flex flex-col gap-4 max-w-lg">
                {/* Leave Type */}
                <FormControl fullWidth size="small">
                    <InputLabel>Leave Type</InputLabel>
                    <Select
                        name="leaveType"
                        value={form.leaveType}
                        label="Leave Type"
                        onChange={handleChange}
                    >
                        {LEAVE_TYPES.map((lt) => (
                            <MenuItem key={lt.value} value={lt.value}>
                                {lt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Leave Balance Info */}
                {form.leaveType && (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                        Balance:{" "}
                        <strong>
                            {leaveBalance != null ? `${leaveBalance} days approved` : "—"}
                        </strong>{" "}
                        for{" "}
                        {LEAVE_TYPES.find((lt) => lt.value === form.leaveType)?.label}
                    </Alert>
                )}

                {/* Start Date */}
                <TextField
                    label="Start Date"
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleChange}
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                />

                {/* End Date */}
                <TextField
                    label="End Date"
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={handleChange}
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!dateError}
                    helperText={dateError || ""}
                />

                {/* Reason */}
                <TextField
                    label="Reason"
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    fullWidth
                    size="small"
                    multiline
                    rows={4}
                    inputProps={{ maxLength: 500 }}
                    helperText={`${reasonLength}/500`}
                />

                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={
                        loading ||
                        !form.leaveType ||
                        !form.startDate ||
                        !form.endDate
                    }
                >
                    {loading ? "Submitting…" : "Submit Application"}
                </Button>
            </div>
        </div>
    )
}

export default ESSLeaveApplicationPage
