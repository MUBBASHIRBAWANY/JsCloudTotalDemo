import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    submitGrievance,
    fetchGrievances,
    assignInvestigatingOfficer,
    appendInvestigationNote,
    resolveGrievance,
    createDisciplinaryAction,
    fetchDisciplinaryHistory,
    clearGrievanceError,
} from "../../Redux/Reducers/grievanceSlice.js"
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
} from "@mui/material"

// ── Constants ────────────────────────────────────────────────────────────────

const GRIEVANCE_STATUSES = ["submitted", "under-investigation", "closed"]
const GRIEVANCE_CATEGORIES = [
    "harassment",
    "pay-dispute",
    "work-environment",
    "policy-violation",
    "other",
]

const DISCIPLINARY_TYPES = [
    { value: "verbal-warning", label: "Verbal Warning" },
    { value: "written-warning", label: "Written Warning" },
    { value: "suspension", label: "Suspension" },
    { value: "termination", label: "Termination" },
]

const RESOLUTION_TYPES = [
    { value: "resolved", label: "Resolved" },
    { value: "dismissed", label: "Dismissed" },
    { value: "escalated", label: "Escalated" },
    { value: "referred-to-authority", label: "Referred to Authority" },
]

const emptyGrievanceForm = {
    complainantEmployeeId: "",
    subject: "",
    category: "other",
    description: "",
    isAnonymous: false,
}

const emptyDisciplinaryForm = {
    employeeId: "",
    actionType: "verbal-warning",
    reason: "",
    date: "",
    durationDays: "",
    issuingManagerId: "",
}

// ── Helper chips ─────────────────────────────────────────────────────────────

const statusChipColor = (status) => {
    if (status === "closed") return "success"
    if (status === "under-investigation") return "warning"
    return "default"
}

// ── Component ─────────────────────────────────────────────────────────────────

const GrievancePage = () => {
    const dispatch = useDispatch()
    const { grievances, disciplinaryActions, loading, error } = useSelector(
        (s) => s.grievance
    )

    // ── Filters ──────────────────────────────────────────────────────────────
    const [filterStatus, setFilterStatus] = useState("all")
    const [filterCategory, setFilterCategory] = useState("all")

    // ── Selected grievance for detail panel ──────────────────────────────────
    const [selectedGrievance, setSelectedGrievance] = useState(null)

    // ── Detail panel sub-state ────────────────────────────────────────────────
    const [officerId, setOfficerId] = useState("")
    const [noteText, setNoteText] = useState("")
    const [resolveForm, setResolveForm] = useState({
        resolutionType: "resolved",
        resolutionSummary: "",
    })
    const [assignSuccess, setAssignSuccess] = useState("")
    const [noteSuccess, setNoteSuccess] = useState("")
    const [resolveSuccess, setResolveSuccess] = useState("")

    // ── Submit grievance form ─────────────────────────────────────────────────
    const [grievanceForm, setGrievanceForm] = useState(emptyGrievanceForm)
    const [grievanceSuccess, setGrievanceSuccess] = useState("")

    // ── Disciplinary form ─────────────────────────────────────────────────────
    const [discForm, setDiscForm] = useState(emptyDisciplinaryForm)
    const [discSuccess, setDiscSuccess] = useState("")
    const [discEmpId, setDiscEmpId] = useState("")

    useEffect(() => {
        dispatch(fetchGrievances())
    }, [dispatch])

    // ── Derived: filtered grievances ──────────────────────────────────────────
    const filteredGrievances = (Array.isArray(grievances) ? grievances : []).filter((g) => {
        const matchStatus = filterStatus === "all" || g.status === filterStatus
        const matchCategory = filterCategory === "all" || g.category === filterCategory
        return matchStatus && matchCategory
    })

    // Keep selectedGrievance in sync when the list updates
    useEffect(() => {
        if (selectedGrievance) {
            const updated = grievances.find((g) => g._id === selectedGrievance._id)
            if (updated) setSelectedGrievance(updated)
        }
    }, [grievances])

    // ── Grievance list handlers ───────────────────────────────────────────────
    const handleRowClick = (g) => {
        setSelectedGrievance(g)
        setOfficerId(g.investigatingOfficerId || "")
        setNoteText("")
        setResolveForm({ resolutionType: "resolved", resolutionSummary: "" })
        setAssignSuccess("")
        setNoteSuccess("")
        setResolveSuccess("")
    }

    // ── Detail panel handlers ─────────────────────────────────────────────────
    const handleAssignOfficer = async () => {
        if (!selectedGrievance?._id || !officerId.trim()) return
        const result = await dispatch(
            assignInvestigatingOfficer({
                id: selectedGrievance._id,
                data: { investigatingOfficerId: officerId.trim() },
            })
        )
        if (assignInvestigatingOfficer.fulfilled.match(result)) {
            setAssignSuccess("Officer assigned successfully.")
            setTimeout(() => setAssignSuccess(""), 3000)
        }
    }

    const handleAddNote = async () => {
        if (!selectedGrievance?._id || !noteText.trim()) return
        const result = await dispatch(
            appendInvestigationNote({
                id: selectedGrievance._id,
                noteData: { text: noteText.trim() },
            })
        )
        if (appendInvestigationNote.fulfilled.match(result)) {
            setNoteText("")
            setNoteSuccess("Note added.")
            setTimeout(() => setNoteSuccess(""), 3000)
        }
    }

    const handleResolve = async () => {
        if (!selectedGrievance?._id) return
        const result = await dispatch(
            resolveGrievance({
                id: selectedGrievance._id,
                resolutionData: {
                    resolutionType: resolveForm.resolutionType,
                    resolutionSummary: resolveForm.resolutionSummary,
                },
            })
        )
        if (resolveGrievance.fulfilled.match(result)) {
            setResolveSuccess("Grievance resolved.")
            setTimeout(() => setResolveSuccess(""), 3000)
        }
    }

    // ── Submit grievance form handlers ────────────────────────────────────────
    const handleGrievanceChange = (e) => {
        const { name, value, type, checked } = e.target
        setGrievanceForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }))
    }

    const handleGrievanceSubmit = async () => {
        const result = await dispatch(submitGrievance(grievanceForm))
        if (submitGrievance.fulfilled.match(result)) {
            setGrievanceSuccess("Grievance submitted successfully.")
            setGrievanceForm(emptyGrievanceForm)
            setTimeout(() => setGrievanceSuccess(""), 4000)
        }
    }

    // ── Disciplinary form handlers ────────────────────────────────────────────
    const handleDiscChange = (e) => {
        const { name, value } = e.target
        setDiscForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleDiscSubmit = async () => {
        const payload = { ...discForm }
        if (discForm.actionType !== "suspension") {
            delete payload.durationDays
        }
        const result = await dispatch(createDisciplinaryAction(payload))
        if (createDisciplinaryAction.fulfilled.match(result)) {
            setDiscSuccess("Disciplinary action recorded.")
            setDiscForm(emptyDisciplinaryForm)
            setTimeout(() => setDiscSuccess(""), 4000)
        }
    }

    const handleLoadDiscHistory = () => {
        if (!discEmpId.trim()) return
        dispatch(fetchDisciplinaryHistory(discEmpId.trim()))
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="p-6">
            <h2 className="pd-section-title mb-5">Grievance Management</h2>

            {error && (
                <Alert severity="error" className="mb-4" onClose={() => dispatch(clearGrievanceError())}>
                    {typeof error === "string" ? error : error?.message || "An error occurred"}
                </Alert>
            )}

            {/* ── Section A: Grievance List ── */}
            <div className="mb-8 bg-white rounded shadow p-5">
                <h3 className="pd-section-title mb-4">Grievance List</h3>

                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Filter by Status</InputLabel>
                        <Select
                            value={filterStatus}
                            label="Filter by Status"
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <MenuItem value="all">All</MenuItem>
                            {GRIEVANCE_STATUSES.map((s) => (
                                <MenuItem key={s} value={s}>
                                    {s}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Filter by Category</InputLabel>
                        <Select
                            value={filterCategory}
                            label="Filter by Category"
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <MenuItem value="all">All</MenuItem>
                            {GRIEVANCE_CATEGORIES.map((c) => (
                                <MenuItem key={c} value={c}>
                                    {c}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </div>

                {loading && (
                    <div className="flex justify-center py-6">
                        <CircularProgress />
                    </div>
                )}

                {!loading && (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Reference #</TableCell>
                                <TableCell>Subject</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Submission Date</TableCell>
                                <TableCell>Anonymous</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredGrievances.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        No grievances found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredGrievances.map((g) => (
                                <TableRow
                                    key={g._id}
                                    hover
                                    sx={{
                                        cursor: "pointer",
                                        backgroundColor:
                                            selectedGrievance?._id === g._id
                                                ? "#f0f7ff"
                                                : undefined,
                                    }}
                                    onClick={() => handleRowClick(g)}
                                >
                                    <TableCell>{g.referenceNumber || g._id}</TableCell>
                                    <TableCell>{g.subject}</TableCell>
                                    <TableCell>{g.category}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={g.status}
                                            color={statusChipColor(g.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {g.submissionDate || g.createdAt
                                            ? new Date(
                                                  g.submissionDate ?? g.createdAt
                                              ).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {g.isAnonymous ? (
                                            <Chip label="Yes" color="default" size="small" />
                                        ) : (
                                            <Chip label="No" variant="outlined" size="small" />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* ── Section B: Grievance Detail Panel ── */}
            {selectedGrievance && (
                <div className="mb-8 bg-white rounded shadow p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="pd-section-title">
                            Detail — {selectedGrievance.referenceNumber || selectedGrievance._id}
                        </h3>
                        <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            onClick={() => setSelectedGrievance(null)}
                        >
                            Close
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm mb-5">
                        <span>
                            <strong>Status:</strong>{" "}
                            <Chip
                                label={selectedGrievance.status}
                                color={statusChipColor(selectedGrievance.status)}
                                size="small"
                            />
                        </span>
                        <span>
                            <strong>Category:</strong> {selectedGrievance.category}
                        </span>
                        {selectedGrievance.investigatingOfficerId && (
                            <span>
                                <strong>Investigating Officer:</strong>{" "}
                                {selectedGrievance.investigatingOfficerId}
                            </span>
                        )}
                    </div>

                    {/* Assign Officer */}
                    <div className="mb-5">
                        <h4 className="font-semibold text-sm mb-2">Assign Investigating Officer</h4>
                        <div className="flex items-center gap-3">
                            <TextField
                                label="Officer ID"
                                value={officerId}
                                onChange={(e) => setOfficerId(e.target.value)}
                                size="small"
                                sx={{ minWidth: 200 }}
                            />
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleAssignOfficer}
                                disabled={loading || !officerId.trim()}
                            >
                                Assign Officer
                            </Button>
                        </div>
                        {assignSuccess && (
                            <Alert severity="success" className="mt-2">
                                {assignSuccess}
                            </Alert>
                        )}
                    </div>

                    {/* Investigation Notes */}
                    <div className="mb-5">
                        <h4 className="font-semibold text-sm mb-2">Investigation Notes</h4>

                        {/* Timeline of existing notes */}
                        <div className="flex flex-col gap-2 mb-3">
                            {(!selectedGrievance.investigationNotes ||
                                selectedGrievance.investigationNotes.length === 0) && (
                                <p className="text-xs text-gray-400">No notes yet.</p>
                            )}
                            {(selectedGrievance.investigationNotes || []).map((note, i) => (
                                <div
                                    key={i}
                                    className="bg-gray-50 rounded px-4 py-2 text-sm border border-gray-200"
                                >
                                    <p className="text-gray-800">{note.text}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {note.authorId || "—"} ·{" "}
                                        {note.timestamp || note.createdAt
                                            ? new Date(
                                                  note.timestamp ?? note.createdAt
                                              ).toLocaleString()
                                            : ""}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Add note */}
                        <div className="flex items-start gap-3">
                            <TextField
                                label="Add Note"
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                size="small"
                                multiline
                                rows={2}
                                sx={{ minWidth: 360 }}
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleAddNote}
                                disabled={loading || !noteText.trim()}
                                sx={{ mt: 0.5 }}
                            >
                                Add Note
                            </Button>
                        </div>
                        {noteSuccess && (
                            <Alert severity="success" className="mt-2">
                                {noteSuccess}
                            </Alert>
                        )}
                    </div>

                    {/* Resolve form — only when under-investigation */}
                    {selectedGrievance.status === "under-investigation" && (
                        <div className="mb-3">
                            <h4 className="font-semibold text-sm mb-2">Resolve Grievance</h4>
                            <div className="flex flex-wrap gap-4 mb-3">
                                <FormControl size="small" sx={{ minWidth: 220 }}>
                                    <InputLabel>Resolution Type</InputLabel>
                                    <Select
                                        value={resolveForm.resolutionType}
                                        label="Resolution Type"
                                        onChange={(e) =>
                                            setResolveForm((p) => ({
                                                ...p,
                                                resolutionType: e.target.value,
                                            }))
                                        }
                                    >
                                        {RESOLUTION_TYPES.map((r) => (
                                            <MenuItem key={r.value} value={r.value}>
                                                {r.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="Resolution Summary"
                                    value={resolveForm.resolutionSummary}
                                    onChange={(e) =>
                                        setResolveForm((p) => ({
                                            ...p,
                                            resolutionSummary: e.target.value,
                                        }))
                                    }
                                    size="small"
                                    multiline
                                    rows={2}
                                    sx={{ minWidth: 360 }}
                                />
                            </div>
                            <Button
                                variant="contained"
                                color="success"
                                size="small"
                                onClick={handleResolve}
                                disabled={loading || !resolveForm.resolutionSummary.trim()}
                            >
                                Resolve
                            </Button>
                            {resolveSuccess && (
                                <Alert severity="success" className="mt-2">
                                    {resolveSuccess}
                                </Alert>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Section C: Submit Grievance ── */}
            <div className="mb-8 bg-white rounded shadow p-5">
                <h3 className="pd-section-title mb-4">Submit Grievance</h3>

                {grievanceSuccess && (
                    <Alert severity="success" className="mb-3">
                        {grievanceSuccess}
                    </Alert>
                )}

                <div className="flex flex-wrap gap-4 mb-4">
                    <TextField
                        label="Complainant Employee ID"
                        name="complainantEmployeeId"
                        value={grievanceForm.complainantEmployeeId}
                        onChange={handleGrievanceChange}
                        size="small"
                        sx={{ minWidth: 220 }}
                    />
                    <TextField
                        label="Subject"
                        name="subject"
                        value={grievanceForm.subject}
                        onChange={handleGrievanceChange}
                        size="small"
                        inputProps={{ maxLength: 200 }}
                        sx={{ minWidth: 300 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Category</InputLabel>
                        <Select
                            name="category"
                            value={grievanceForm.category}
                            label="Category"
                            onChange={handleGrievanceChange}
                        >
                            {GRIEVANCE_CATEGORIES.map((c) => (
                                <MenuItem key={c} value={c}>
                                    {c}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </div>

                <div className="mb-4">
                    <TextField
                        label="Description"
                        name="description"
                        value={grievanceForm.description}
                        onChange={handleGrievanceChange}
                        size="small"
                        fullWidth
                        multiline
                        rows={4}
                        inputProps={{ maxLength: 2000 }}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="isAnonymous"
                                checked={grievanceForm.isAnonymous}
                                onChange={handleGrievanceChange}
                                size="small"
                            />
                        }
                        label="Submit Anonymously"
                    />
                    <Button
                        variant="contained"
                        onClick={handleGrievanceSubmit}
                        disabled={loading}
                    >
                        Submit Grievance
                    </Button>
                </div>
            </div>

            {/* ── Section D: Disciplinary Action ── */}
            <div className="bg-white rounded shadow p-5">
                <h3 className="pd-section-title mb-4">Disciplinary Action</h3>

                {discSuccess && (
                    <Alert severity="success" className="mb-3">
                        {discSuccess}
                    </Alert>
                )}

                <div className="flex flex-wrap gap-4 mb-4">
                    <TextField
                        label="Employee ID"
                        name="employeeId"
                        value={discForm.employeeId}
                        onChange={handleDiscChange}
                        size="small"
                        sx={{ minWidth: 180 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Action Type</InputLabel>
                        <Select
                            name="actionType"
                            value={discForm.actionType}
                            label="Action Type"
                            onChange={handleDiscChange}
                        >
                            {DISCIPLINARY_TYPES.map((t) => (
                                <MenuItem key={t.value} value={t.value}>
                                    {t.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Date"
                        name="date"
                        type="date"
                        value={discForm.date}
                        onChange={handleDiscChange}
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ minWidth: 180 }}
                    />
                    <TextField
                        label="Issuing Manager ID"
                        name="issuingManagerId"
                        value={discForm.issuingManagerId}
                        onChange={handleDiscChange}
                        size="small"
                        sx={{ minWidth: 200 }}
                    />
                    {discForm.actionType === "suspension" && (
                        <TextField
                            label="Duration (days)"
                            name="durationDays"
                            type="number"
                            value={discForm.durationDays}
                            onChange={handleDiscChange}
                            size="small"
                            inputProps={{ min: 1, max: 365 }}
                            sx={{ minWidth: 160 }}
                        />
                    )}
                </div>

                <div className="mb-4">
                    <TextField
                        label="Reason"
                        name="reason"
                        value={discForm.reason}
                        onChange={handleDiscChange}
                        size="small"
                        fullWidth
                        multiline
                        rows={3}
                    />
                </div>

                <Button
                    variant="contained"
                    onClick={handleDiscSubmit}
                    disabled={loading}
                    className="mb-6"
                >
                    Record Disciplinary Action
                </Button>

                {/* Load history */}
                <div className="mt-6">
                    <h4 className="font-semibold text-sm mb-3">Disciplinary History</h4>
                    <div className="flex items-center gap-3 mb-4">
                        <TextField
                            label="Employee ID"
                            value={discEmpId}
                            onChange={(e) => setDiscEmpId(e.target.value)}
                            size="small"
                            sx={{ minWidth: 200 }}
                        />
                        <Button
                            variant="outlined"
                            onClick={handleLoadDiscHistory}
                            disabled={loading || !discEmpId.trim()}
                        >
                            Load History
                        </Button>
                    </div>

                    {loading && (
                        <div className="flex justify-center py-4">
                            <CircularProgress size={24} />
                        </div>
                    )}

                    {!loading && disciplinaryActions.length > 0 && (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Action Type</TableCell>
                                    <TableCell>Reason</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Duration (days)</TableCell>
                                    <TableCell>Issuing Manager</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {disciplinaryActions.map((a, i) => (
                                    <TableRow key={a._id || i}>
                                        <TableCell>{a.actionType}</TableCell>
                                        <TableCell>{a.reason}</TableCell>
                                        <TableCell>
                                            {a.date
                                                ? new Date(a.date).toLocaleDateString()
                                                : "—"}
                                        </TableCell>
                                        <TableCell>{a.durationDays ?? "—"}</TableCell>
                                        <TableCell>{a.issuingManagerId || "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {!loading && disciplinaryActions.length === 0 && discEmpId && (
                        <p className="text-sm text-gray-500">No disciplinary records found.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default GrievancePage
