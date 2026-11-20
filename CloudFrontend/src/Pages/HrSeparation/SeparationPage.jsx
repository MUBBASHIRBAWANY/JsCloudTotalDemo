import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    initiateSeparation,
    fetchSeparationById,
    fetchSeparationHistory,
    updateClearanceTask,
    fetchSettlementPreview,
    confirmSettlement,
    clearSeparationError,
    clearSettlementPreview,
    clearSelectedSeparation,
} from "../../Redux/Reducers/separationSlice.js"
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Button,
    TextField,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Chip,
    CircularProgress,
    Alert,
    Checkbox,
    FormControlLabel,
    Tooltip,
} from "@mui/material"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"

const emptyInitiateForm = {
    employeeId: "",
    separationType: "resignation",
    noticePeriodStartDate: "",
    lastWorkingDate: "",
    reason: "",
}

const formatCurrency = (val) =>
    val !== undefined && val !== null
        ? `PKR ${Number(val).toLocaleString("en-PK", { minimumFractionDigits: 2 })}`
        : "—"

const statusColor = (status) => {
    if (!status) return "default"
    if (status === "completed") return "success"
    if (status === "initiated") return "info"
    if (status === "cancelled") return "error"
    return "default"
}

const SeparationPage = () => {
    const dispatch = useDispatch()
    const { history, selectedSeparation, clearanceTasks, settlementPreview, loading, error } =
        useSelector((s) => s.separation)

    // Section A — Initiate form
    const [form, setForm] = useState(emptyInitiateForm)
    const [formError, setFormError] = useState("")
    const [shortNotice, setShortNotice] = useState(false)
    const [initiateSuccess, setInitiateSuccess] = useState("")

    // Section B — settlement confirm result
    const [settlementConfirmed, setSettlementConfirmed] = useState(null)

    useEffect(() => {
        dispatch(fetchSeparationHistory())
    }, [dispatch])

    // ── Initiate form ─────────────────────────────────────────────────────────
    const handleFormChange = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
        setFormError("")
    }

    const handleInitiateSubmit = async () => {
        if (form.noticePeriodStartDate && form.lastWorkingDate) {
            if (new Date(form.lastWorkingDate) < new Date(form.noticePeriodStartDate)) {
                setFormError("Last Working Date must not be earlier than Notice Period Start Date.")
                return
            }
        }
        setFormError("")
        const result = await dispatch(initiateSeparation(form))
        if (initiateSeparation.fulfilled.match(result)) {
            const payload = result.payload?.data ?? result.payload
            setShortNotice(payload?.shortNoticeFlag === true)
            setInitiateSuccess("Separation request initiated successfully.")
            setForm(emptyInitiateForm)
            dispatch(fetchSeparationHistory())
            setTimeout(() => setInitiateSuccess(""), 4000)
        }
    }

    // ── History row click ─────────────────────────────────────────────────────
    const handleRowClick = (sep) => {
        setSettlementConfirmed(null)
        dispatch(clearSettlementPreview())
        dispatch(fetchSeparationById(sep._id))
    }

    // ── Clearance task ────────────────────────────────────────────────────────
    const handleMarkComplete = (task) => {
        if (!selectedSeparation?._id) return
        dispatch(
            updateClearanceTask({
                id: selectedSeparation._id,
                taskData: {
                    taskName: task.taskName,
                    isComplete: true,
                    completedBy: "HR Admin",
                },
            })
        )
    }

    // ── Settlement ────────────────────────────────────────────────────────────
    const handleViewSettlement = () => {
        if (selectedSeparation?._id) {
            dispatch(fetchSettlementPreview(selectedSeparation._id))
        }
    }

    const handleConfirmSettlement = async () => {
        if (!selectedSeparation?._id) return
        const result = await dispatch(
            confirmSettlement({ id: selectedSeparation._id, data: {} })
        )
        if (confirmSettlement.fulfilled.match(result)) {
            const payload = result.payload?.data ?? result.payload
            setSettlementConfirmed(payload)
            dispatch(fetchSeparationHistory())
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="p-6">
            <h2 className="pd-section-title mb-5">Employee Separation</h2>

            {error && (
                <Alert severity="error" className="mb-4" onClose={() => dispatch(clearSeparationError())}>
                    {typeof error === "string" ? error : error?.message || "An error occurred"}
                </Alert>
            )}

            {/* ── Section A: Initiate Separation ── */}
            <div className="mb-8 bg-white rounded shadow p-5">
                <h3 className="pd-section-title mb-4">Initiate Separation Request</h3>

                {formError && (
                    <Alert severity="warning" className="mb-3">
                        {formError}
                    </Alert>
                )}
                {initiateSuccess && (
                    <Alert severity="success" className="mb-3">
                        {initiateSuccess}
                    </Alert>
                )}
                {shortNotice && (
                    <Alert
                        severity="warning"
                        icon={<WarningAmberIcon />}
                        className="mb-3"
                    >
                        ⚠ Short Notice: This employee has not fulfilled the required notice period.
                    </Alert>
                )}

                <div className="flex flex-wrap gap-4 mb-4">
                    <TextField
                        label="Employee ID"
                        name="employeeId"
                        value={form.employeeId}
                        onChange={handleFormChange}
                        size="small"
                        sx={{ minWidth: 180 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Separation Type</InputLabel>
                        <Select
                            name="separationType"
                            value={form.separationType}
                            label="Separation Type"
                            onChange={handleFormChange}
                        >
                            <MenuItem value="resignation">Resignation</MenuItem>
                            <MenuItem value="termination">Termination</MenuItem>
                            <MenuItem value="retirement">Retirement</MenuItem>
                            <MenuItem value="contract-end">Contract End</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="Notice Period Start Date"
                        name="noticePeriodStartDate"
                        type="date"
                        value={form.noticePeriodStartDate}
                        onChange={handleFormChange}
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ minWidth: 210 }}
                    />
                    <TextField
                        label="Last Working Date"
                        name="lastWorkingDate"
                        type="date"
                        value={form.lastWorkingDate}
                        onChange={handleFormChange}
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ minWidth: 200 }}
                    />
                </div>
                <div className="mb-4">
                    <TextField
                        label="Reason"
                        name="reason"
                        value={form.reason}
                        onChange={handleFormChange}
                        size="small"
                        fullWidth
                        multiline
                        rows={3}
                    />
                </div>
                <Button
                    variant="contained"
                    onClick={handleInitiateSubmit}
                    disabled={loading}
                >
                    Submit Separation Request
                </Button>
            </div>

            {/* ── Section C: Separation History Table (rendered before details so clicking a row populates B) ── */}
            <div className="mb-8 bg-white rounded shadow p-5">
                <h3 className="pd-section-title mb-4">Separation History</h3>

                {loading && !selectedSeparation && (
                    <div className="flex justify-center py-6">
                        <CircularProgress />
                    </div>
                )}

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Employee ID</TableCell>
                            <TableCell>Separation Type</TableCell>
                            <TableCell>Last Working Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Settlement Confirmed</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {history.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No separation records found.
                                </TableCell>
                            </TableRow>
                        )}
                        {history.map((sep) => (
                            <TableRow
                                key={sep._id}
                                hover
                                sx={{ cursor: "pointer" }}
                                onClick={() => handleRowClick(sep)}
                                selected={selectedSeparation?._id === sep._id}
                            >
                                <TableCell>{sep.employeeId}</TableCell>
                                <TableCell>{sep.separationType}</TableCell>
                                <TableCell>
                                    {sep.lastWorkingDate
                                        ? new Date(sep.lastWorkingDate).toLocaleDateString()
                                        : "—"}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={sep.status || "initiated"}
                                        color={statusColor(sep.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {sep.settlementConfirmed ? (
                                        <Chip label="Yes" color="success" size="small" />
                                    ) : (
                                        <Chip label="No" color="default" size="small" />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* ── Section B: Separation Details (clearance + settlement) ── */}
            {selectedSeparation && (
                <div className="bg-white rounded shadow p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="pd-section-title">
                            Separation Details — {selectedSeparation.employeeId}
                        </h3>
                        <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            onClick={() => {
                                dispatch(clearSelectedSeparation())
                                dispatch(clearSettlementPreview())
                                setSettlementConfirmed(null)
                            }}
                        >
                            Close
                        </Button>
                    </div>

                    {/* Clearance Checklist */}
                    <h4 className="font-semibold text-sm mb-3">Clearance Checklist</h4>
                    {clearanceTasks.length === 0 && (
                        <p className="text-sm text-gray-500 mb-4">No clearance tasks found.</p>
                    )}
                    <div className="flex flex-col gap-2 mb-5">
                        {clearanceTasks.map((task, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-4 bg-gray-50 rounded px-4 py-2"
                            >
                                {task.isComplete ? (
                                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                                ) : (
                                    <CheckCircleOutlineIcon color="disabled" fontSize="small" />
                                )}
                                <span className="flex-1 text-sm font-medium">{task.taskName}</span>
                                {task.isComplete && (
                                    <span className="text-xs text-gray-500">
                                        Completed by {task.completedBy || "—"}
                                        {task.completedAt
                                            ? ` on ${new Date(task.completedAt).toLocaleDateString()}`
                                            : ""}
                                    </span>
                                )}
                                {!task.isComplete && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        onClick={() => handleMarkComplete(task)}
                                        disabled={loading}
                                    >
                                        Mark Complete
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Settlement Preview */}
                    <div className="flex gap-3 mb-4">
                        <Button
                            variant="outlined"
                            onClick={handleViewSettlement}
                            disabled={loading}
                        >
                            View Settlement Preview
                        </Button>
                        {settlementPreview && (
                            <Tooltip title="Confirm and finalize settlement">
                                <Button
                                    variant="contained"
                                    color="success"
                                    onClick={handleConfirmSettlement}
                                    disabled={loading}
                                >
                                    Confirm Settlement
                                </Button>
                            </Tooltip>
                        )}
                    </div>

                    {loading && (
                        <div className="flex justify-center py-4">
                            <CircularProgress size={24} />
                        </div>
                    )}

                    {settlementPreview && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                            <h4 className="font-semibold text-sm mb-3">Settlement Preview</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-gray-600">Unpaid Salary:</span>
                                <span className="font-medium">{formatCurrency(settlementPreview.unpaidSalary)}</span>
                                <span className="text-gray-600">Encashable Leave:</span>
                                <span className="font-medium">{formatCurrency(settlementPreview.encashableLeave)}</span>
                                <span className="text-gray-600">Gratuity:</span>
                                <span className="font-medium">{formatCurrency(settlementPreview.gratuity)}</span>
                                <span className="text-gray-600">Loan Deduction:</span>
                                <span className="font-medium text-red-600">
                                    {formatCurrency(settlementPreview.loanDeduction)}
                                </span>
                                <span className="text-gray-700 font-semibold border-t pt-1">Net Settlement:</span>
                                <span className="font-bold text-green-700 border-t pt-1">
                                    {formatCurrency(settlementPreview.netSettlement)}
                                </span>
                            </div>
                        </div>
                    )}

                    {settlementConfirmed && (
                        <Alert severity="success" className="mb-3">
                            Settlement confirmed.
                            {settlementConfirmed.experienceLetter && (
                                <span>
                                    {" "}
                                    Experience Letter:{" "}
                                    <strong>{settlementConfirmed.experienceLetter}</strong>
                                </span>
                            )}
                        </Alert>
                    )}
                </div>
            )}
        </div>
    )
}

export default SeparationPage
