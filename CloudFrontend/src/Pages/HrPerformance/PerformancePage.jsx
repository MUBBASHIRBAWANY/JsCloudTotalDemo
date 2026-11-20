import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    fetchAppraisalCycles,
    createAppraisalCycle,
    updateCycleStatus,
    assignKpi,
    recordKpiScore,
    submitFeedback,
    fetchReviewCard,
    createIncrementProposal,
    approveIncrementProposal,
} from "../../Redux/Reducers/performanceSlice.js"
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
    LinearProgress,
    Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import CycleExportButton from "../../Components/HrPerformance/CycleExportButton.jsx"

const emptyCycleForm = {
    name: "",
    cycleType: "annual",
    startDate: "",
    endDate: "",
    status: "draft",
}

const emptyKpiForm = {
    cycleId: "",
    employeeId: "",
    title: "",
    weight: "",
    targetDescription: "",
    measurementUnit: "",
}

const emptyKpiScoreForm = {
    kpiId: "",
    achievementScore: "",
}

const emptyFeedbackForm = {
    cycleId: "",
    reviewerId: "",
    revieweeId: "",
    relationship: "peer",
    rating: "",
    comment: "",
}

const emptyReviewQuery = { employeeId: "", cycleId: "" }

const emptyIncrementForm = {
    employeeId: "",
    cycleId: "",
    incrementType: "percentage",
    value: "",
}

const statusColor = (status) => {
    if (status === "active") return "success"
    if (status === "closed") return "error"
    return "default"
}

const NEXT_STATUS = { draft: "active", active: "closed" }

const PerformancePage = () => {
    const dispatch = useDispatch()
    const { cycles, incrementProposals, reviewCard, loading, error } = useSelector(
        (s) => s.performance
    )

    // Section A
    const [cycleDialogOpen, setCycleDialogOpen] = useState(false)
    const [cycleForm, setCycleForm] = useState(emptyCycleForm)

    // Section B
    const [kpiForm, setKpiForm] = useState(emptyKpiForm)
    const [kpiWeightWarning, setKpiWeightWarning] = useState(false)

    // Section B2 — KPI Score Recording
    const [kpiScoreForm, setKpiScoreForm] = useState(emptyKpiScoreForm)

    // Section C
    const [feedbackForm, setFeedbackForm] = useState(emptyFeedbackForm)
    const [feedbackError, setFeedbackError] = useState("")

    // Section D
    const [reviewQuery, setReviewQuery] = useState(emptyReviewQuery)

    // Section E
    const [incrementForm, setIncrementForm] = useState(emptyIncrementForm)

    useEffect(() => {
        dispatch(fetchAppraisalCycles())
    }, [dispatch])

    // ── Section A handlers ────────────────────────────────────────────────
    const openCycleDialog = () => {
        setCycleForm(emptyCycleForm)
        setCycleDialogOpen(true)
    }

    const closeCycleDialog = () => {
        setCycleDialogOpen(false)
        setCycleForm(emptyCycleForm)
    }

    const handleCycleChange = (e) => {
        const { name, value } = e.target
        setCycleForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleCycleSubmit = () => {
        dispatch(createAppraisalCycle({ ...cycleForm, status: "draft" }))
        closeCycleDialog()
    }

    const handleAdvanceStatus = (cycle) => {
        const next = NEXT_STATUS[cycle.status]
        if (next) {
            dispatch(updateCycleStatus({ id: cycle._id, status: next }))
        }
    }

    // ── Section B handlers ────────────────────────────────────────────────
    const handleKpiChange = (e) => {
        const { name, value } = e.target
        setKpiForm((prev) => {
            const updated = { ...prev, [name]: value }
            if (name === "weight") {
                setKpiWeightWarning(Number(value) > 100)
            }
            return updated
        })
    }

    const handleKpiSubmit = () => {
        const { cycleId, employeeId, title, weight, targetDescription, measurementUnit } = kpiForm
        if (!cycleId || !employeeId || !title || !weight) return
        dispatch(
            assignKpi({
                cycleId,
                employeeId,
                title,
                weight: Number(weight),
                targetDescription,
                measurementUnit,
            })
        )
        setKpiForm(emptyKpiForm)
        setKpiWeightWarning(false)
    }

    // ── Section C handlers ────────────────────────────────────────────────
    const handleFeedbackChange = (e) => {
        const { name, value } = e.target
        setFeedbackForm((prev) => ({ ...prev, [name]: value }))
        if (name === "reviewerId" || name === "revieweeId") {
            setFeedbackError("")
        }
    }

    const handleFeedbackSubmit = () => {
        if (feedbackForm.reviewerId === feedbackForm.revieweeId && feedbackForm.reviewerId !== "") {
            setFeedbackError("Reviewer and reviewee cannot be the same person.")
            return
        }
        dispatch(submitFeedback(feedbackForm))
        setFeedbackForm(emptyFeedbackForm)
        setFeedbackError("")
    }

    // ── Section D handlers ────────────────────────────────────────────────
    const handleFetchReviewCard = () => {
        const { employeeId, cycleId } = reviewQuery
        if (employeeId.trim() && cycleId.trim()) {
            dispatch(fetchReviewCard({ empId: employeeId.trim(), cycleId: cycleId.trim() }))
        }
    }

    // ── Section E handlers ────────────────────────────────────────────────
    const handleIncrementChange = (e) => {
        const { name, value } = e.target
        setIncrementForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleIncrementSubmit = () => {
        const { employeeId, cycleId, incrementType, value } = incrementForm
        if (!employeeId || !cycleId || !value) return
        dispatch(
            createIncrementProposal({
                employeeId,
                cycleId,
                incrementType,
                value: Number(value),
            })
        )
        setIncrementForm(emptyIncrementForm)
    }

    return (
        <div className="p-6">
            <h2 className="pd-section-title mb-5">Performance Management</h2>

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

            {/* ── Section A: Appraisal Cycles ──────────────────────────────── */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="pd-section-title">Appraisal Cycles</h3>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCycleDialog}>
                        New Cycle
                    </Button>
                </div>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Start Date</TableCell>
                            <TableCell>End Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {cycles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    No appraisal cycles found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            cycles.map((cycle) => (
                                <TableRow key={cycle._id}>
                                    <TableCell>{cycle.name}</TableCell>
                                    <TableCell>{cycle.cycleType}</TableCell>
                                    <TableCell>
                                        {cycle.startDate
                                            ? new Date(cycle.startDate).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {cycle.endDate
                                            ? new Date(cycle.endDate).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={cycle.status}
                                            color={statusColor(cycle.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {NEXT_STATUS[cycle.status] && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => handleAdvanceStatus(cycle)}
                                                >
                                                    Set {NEXT_STATUS[cycle.status]}
                                                </Button>
                                            )}
                                            <CycleExportButton cycleId={cycle._id} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Section B: KPI Assignment ────────────────────────────────── */}
            <div className="mb-8">
                <h3 className="pd-section-title mb-3">KPI Assignment</h3>
                <div className="flex flex-wrap gap-4 items-end">
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Cycle</InputLabel>
                        <Select
                            name="cycleId"
                            value={kpiForm.cycleId}
                            label="Cycle"
                            onChange={handleKpiChange}
                        >
                            <MenuItem value="">
                                <em>Select Cycle</em>
                            </MenuItem>
                            {cycles.map((c) => (
                                <MenuItem key={c._id} value={c._id}>
                                    {c.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Employee ID"
                        name="employeeId"
                        size="small"
                        value={kpiForm.employeeId}
                        onChange={handleKpiChange}
                    />
                    <TextField
                        label="KPI Title"
                        name="title"
                        size="small"
                        value={kpiForm.title}
                        onChange={handleKpiChange}
                    />
                    <TextField
                        label="Weight (%)"
                        name="weight"
                        type="number"
                        size="small"
                        value={kpiForm.weight}
                        onChange={handleKpiChange}
                        slotProps={{ input: { min: 0, max: 100 } }}
                        sx={{ width: 120 }}
                    />
                    <TextField
                        label="Target Description"
                        name="targetDescription"
                        size="small"
                        value={kpiForm.targetDescription}
                        onChange={handleKpiChange}
                    />
                    <TextField
                        label="Measurement Unit"
                        name="measurementUnit"
                        size="small"
                        value={kpiForm.measurementUnit}
                        onChange={handleKpiChange}
                    />
                    <Button
                        variant="contained"
                        onClick={handleKpiSubmit}
                        disabled={
                            !kpiForm.cycleId ||
                            !kpiForm.employeeId ||
                            !kpiForm.title ||
                            !kpiForm.weight
                        }
                    >
                        Assign KPI
                    </Button>
                </div>
                {kpiWeightWarning && (
                    <Alert severity="warning" className="mt-2">
                        Weight exceeds 100%. Total KPI weights should not exceed 100%.
                    </Alert>
                )}
            </div>

            {/* ── Section B2: Record KPI Score ─────────────────────────────── */}
            <div className="mb-8">
                <h3 className="pd-section-title mb-3">Record KPI Score</h3>
                <div className="flex flex-wrap gap-4 items-end">
                    <TextField
                        label="KPI ID"
                        name="kpiId"
                        size="small"
                        value={kpiScoreForm.kpiId}
                        onChange={(e) =>
                            setKpiScoreForm((prev) => ({ ...prev, kpiId: e.target.value }))
                        }
                    />
                    <TextField
                        label="Achievement Score (0–100)"
                        name="achievementScore"
                        type="number"
                        size="small"
                        value={kpiScoreForm.achievementScore}
                        onChange={(e) =>
                            setKpiScoreForm((prev) => ({
                                ...prev,
                                achievementScore: e.target.value,
                            }))
                        }
                        slotProps={{ input: { min: 0, max: 100 } }}
                        sx={{ width: 200 }}
                    />
                    <Button
                        variant="contained"
                        onClick={() => {
                            const { kpiId, achievementScore } = kpiScoreForm
                            if (!kpiId || achievementScore === "") return
                            dispatch(
                                recordKpiScore({
                                    id: kpiId,
                                    achievementScore: Number(achievementScore),
                                })
                            )
                            setKpiScoreForm(emptyKpiScoreForm)
                        }}
                        disabled={
                            !kpiScoreForm.kpiId || kpiScoreForm.achievementScore === ""
                        }
                    >
                        Record Score
                    </Button>
                </div>
            </div>

            {/* ── Section C: 360 Feedback ──────────────────────────────────── */}
            <div className="mb-8">
                <h3 className="pd-section-title mb-3">360° Feedback</h3>
                {feedbackError && (
                    <Alert severity="error" className="mb-3">
                        {feedbackError}
                    </Alert>
                )}
                <div className="flex flex-wrap gap-4 items-end">
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Cycle</InputLabel>
                        <Select
                            name="cycleId"
                            value={feedbackForm.cycleId}
                            label="Cycle"
                            onChange={handleFeedbackChange}
                        >
                            <MenuItem value="">
                                <em>Select Cycle</em>
                            </MenuItem>
                            {cycles.map((c) => (
                                <MenuItem key={c._id} value={c._id}>
                                    {c.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Reviewer ID"
                        name="reviewerId"
                        size="small"
                        value={feedbackForm.reviewerId}
                        onChange={handleFeedbackChange}
                    />
                    <TextField
                        label="Reviewee ID"
                        name="revieweeId"
                        size="small"
                        value={feedbackForm.revieweeId}
                        onChange={handleFeedbackChange}
                    />
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Relationship</InputLabel>
                        <Select
                            name="relationship"
                            value={feedbackForm.relationship}
                            label="Relationship"
                            onChange={handleFeedbackChange}
                        >
                            <MenuItem value="peer">Peer</MenuItem>
                            <MenuItem value="subordinate">Subordinate</MenuItem>
                            <MenuItem value="manager">Manager</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Rating</InputLabel>
                        <Select
                            name="rating"
                            value={feedbackForm.rating}
                            label="Rating"
                            onChange={handleFeedbackChange}
                        >
                            {[1, 2, 3, 4, 5].map((r) => (
                                <MenuItem key={r} value={r}>
                                    {r}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Comment"
                        name="comment"
                        size="small"
                        value={feedbackForm.comment}
                        onChange={handleFeedbackChange}
                        multiline
                        rows={2}
                        sx={{ minWidth: 260 }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleFeedbackSubmit}
                        disabled={
                            !feedbackForm.cycleId ||
                            !feedbackForm.reviewerId ||
                            !feedbackForm.revieweeId ||
                            !feedbackForm.rating
                        }
                    >
                        Submit Feedback
                    </Button>
                </div>
            </div>

            {/* ── Section D: Review Card ───────────────────────────────────── */}
            <div className="mb-8">
                <h3 className="pd-section-title mb-3">Review Card</h3>
                <div className="flex items-center gap-3 mb-4">
                    <TextField
                        label="Employee ID"
                        size="small"
                        value={reviewQuery.employeeId}
                        onChange={(e) =>
                            setReviewQuery((prev) => ({ ...prev, employeeId: e.target.value }))
                        }
                    />
                    <TextField
                        label="Cycle ID"
                        size="small"
                        value={reviewQuery.cycleId}
                        onChange={(e) =>
                            setReviewQuery((prev) => ({ ...prev, cycleId: e.target.value }))
                        }
                    />
                    <Button
                        variant="outlined"
                        onClick={handleFetchReviewCard}
                        disabled={!reviewQuery.employeeId.trim() || !reviewQuery.cycleId.trim()}
                    >
                        Fetch Review Card
                    </Button>
                </div>
                {reviewCard && (
                    <div className="bg-gray-50 rounded p-4 flex flex-col gap-3">
                        <Typography variant="subtitle1" fontWeight="bold">
                            Overall Score: {reviewCard.overallScore ?? "—"}
                        </Typography>
                        {reviewCard.kpiBreakdown && reviewCard.kpiBreakdown.length > 0 && (
                            <div>
                                <Typography variant="body2" fontWeight="bold" className="mb-1">
                                    KPI Breakdown
                                </Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>KPI Title</TableCell>
                                            <TableCell>Weight</TableCell>
                                            <TableCell>Score</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {reviewCard.kpiBreakdown.map((kpi, idx) => (
                                            <TableRow key={kpi._id || idx}>
                                                <TableCell>{kpi.title}</TableCell>
                                                <TableCell>{kpi.weight}%</TableCell>
                                                <TableCell>{kpi.score ?? "—"}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        <Typography variant="body2">
                            Avg 360° Rating: {reviewCard.avg360Rating ?? "—"}
                        </Typography>
                        {reviewCard.managerRecommendation !== undefined && (
                            <Typography variant="body2">
                                Manager Recommendation: {reviewCard.managerRecommendation || "—"}
                            </Typography>
                        )}
                    </div>
                )}
            </div>

            {/* ── Section E: Salary Increment Proposals ───────────────────── */}
            <div className="mb-8">
                <h3 className="pd-section-title mb-3">Salary Increment Proposals</h3>
                <div className="flex flex-wrap gap-4 items-end mb-4">
                    <TextField
                        label="Employee ID"
                        name="employeeId"
                        size="small"
                        value={incrementForm.employeeId}
                        onChange={handleIncrementChange}
                    />
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Cycle</InputLabel>
                        <Select
                            name="cycleId"
                            value={incrementForm.cycleId}
                            label="Cycle"
                            onChange={handleIncrementChange}
                        >
                            <MenuItem value="">
                                <em>Select Cycle</em>
                            </MenuItem>
                            {cycles.map((c) => (
                                <MenuItem key={c._id} value={c._id}>
                                    {c.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Increment Type</InputLabel>
                        <Select
                            name="incrementType"
                            value={incrementForm.incrementType}
                            label="Increment Type"
                            onChange={handleIncrementChange}
                        >
                            <MenuItem value="percentage">Percentage</MenuItem>
                            <MenuItem value="fixed_amount">Fixed Amount</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label={
                            incrementForm.incrementType === "percentage" ? "Value (%)" : "Value (PKR)"
                        }
                        name="value"
                        type="number"
                        size="small"
                        value={incrementForm.value}
                        onChange={handleIncrementChange}
                        slotProps={{ input: { min: 0 } }}
                        sx={{ width: 140 }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleIncrementSubmit}
                        disabled={
                            !incrementForm.employeeId ||
                            !incrementForm.cycleId ||
                            !incrementForm.value
                        }
                    >
                        Submit Proposal
                    </Button>
                </div>

                {incrementProposals.length > 0 && (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Employee ID</TableCell>
                                <TableCell>Cycle</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Value</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {incrementProposals.map((proposal) => (
                                <TableRow key={proposal._id}>
                                    <TableCell>{proposal.employeeId}</TableCell>
                                    <TableCell>
                                        {cycles.find((c) => c._id === proposal.cycleId)?.name ||
                                            proposal.cycleId}
                                    </TableCell>
                                    <TableCell>{proposal.incrementType}</TableCell>
                                    <TableCell>{proposal.value}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={proposal.status || "pending"}
                                            color={
                                                proposal.status === "approved" ? "success" : "default"
                                            }
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {proposal.status !== "approved" && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="success"
                                                onClick={() =>
                                                    dispatch(
                                                        approveIncrementProposal({ id: proposal._id })
                                                    )
                                                }
                                            >
                                                Approve
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* ── Create Cycle Dialog ──────────────────────────────────────── */}
            <Dialog open={cycleDialogOpen} onClose={closeCycleDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Create Appraisal Cycle</DialogTitle>
                <DialogContent>
                    <div className="flex flex-col gap-4 pt-2">
                        <TextField
                            label="Name"
                            name="name"
                            value={cycleForm.name}
                            onChange={handleCycleChange}
                            fullWidth
                            size="small"
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel>Cycle Type</InputLabel>
                            <Select
                                name="cycleType"
                                value={cycleForm.cycleType}
                                label="Cycle Type"
                                onChange={handleCycleChange}
                            >
                                <MenuItem value="annual">Annual</MenuItem>
                                <MenuItem value="semi-annual">Semi-Annual</MenuItem>
                                <MenuItem value="quarterly">Quarterly</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Start Date"
                            name="startDate"
                            type="date"
                            value={cycleForm.startDate}
                            onChange={handleCycleChange}
                            fullWidth
                            size="small"
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                            label="End Date"
                            name="endDate"
                            type="date"
                            value={cycleForm.endDate}
                            onChange={handleCycleChange}
                            fullWidth
                            size="small"
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeCycleDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCycleSubmit}
                        disabled={!cycleForm.name || !cycleForm.startDate || !cycleForm.endDate}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default PerformancePage
