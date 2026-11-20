import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    fetchJobPostings,
    fetchApplicants,
    createApplicant,
    advanceApplicantStage,
} from "../../Redux/Reducers/recruitmentSlice.js"
import {
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
    IconButton,
    Tooltip,
    Paper,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import PersonIcon from "@mui/icons-material/Person"
import EmailIcon from "@mui/icons-material/Email"
import PhoneIcon from "@mui/icons-material/Phone"
import WorkIcon from "@mui/icons-material/Work"
import AppButton from "../../Components/Global/AppButton"

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_STAGES = [
    "Applied",
    "Shortlisted",
    "Interview Scheduled",
    "Interviewed",
    "Offer Extended",
    "Hired",
    "Rejected",
]

const STAGE_COLORS = {
    Applied: "#e3f2fd",
    Shortlisted: "#e8f5e9",
    "Interview Scheduled": "#fff3e0",
    Interviewed: "#f3e5f5",
    "Offer Extended": "#e0f7fa",
    Hired: "#c8e6c9",
    Rejected: "#ffebee",
}

const STAGE_TEXT_COLORS = {
    Applied: "#1565c0",
    Shortlisted: "#2e7d32",
    "Interview Scheduled": "#e65100",
    Interviewed: "#6a1b9a",
    "Offer Extended": "#00695c",
    Hired: "#1b5e20",
    Rejected: "#b71c1c",
}

const emptyApplicantForm = {
    fullName: "",
    email: "",
    phone: "",
    cvFileRef: "",
    source: "portal",
}

const emptyInterviewForm = {
    interviewerId: "",
    date: "",
    time: "",
    mode: "in-person",
    notes: "",
}

// ─── Helper: Offer Letter Preview ────────────────────────────────────────────

const OfferLetterPreview = ({ applicant, onClose }) => {
    const ol = applicant?.offerLetter || {}
    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Offer Letter Preview</DialogTitle>
            <DialogContent>
                <div className="border border-outline-variant rounded-lg p-6 mt-2 bg-surface-container-lowest font-mono text-sm leading-relaxed">
                    <p className="font-bold text-base mb-4">OFFER LETTER</p>
                    <p className="mb-2">
                        <span className="font-semibold">Applicant:</span>{" "}
                        {applicant?.fullName || "—"}
                    </p>
                    <p className="mb-2">
                        <span className="font-semibold">Position:</span>{" "}
                        {ol.positionTitle || "—"}
                    </p>
                    <p className="mb-2">
                        <span className="font-semibold">Offered Salary:</span>{" "}
                        {ol.salary != null ? `PKR ${ol.salary.toLocaleString()}` : "—"}
                    </p>
                    <p className="mb-2">
                        <span className="font-semibold">Joining Date:</span>{" "}
                        {ol.joiningDate
                            ? new Date(ol.joiningDate).toLocaleDateString("en-GB")
                            : "—"}
                    </p>
                    <p className="mb-2">
                        <span className="font-semibold">Probation Period:</span>{" "}
                        {ol.probationMonths != null
                            ? `${ol.probationMonths} month(s)`
                            : "—"}
                    </p>
                    <p className="mt-6 text-xs text-on-surface-variant">
                        This is a system-generated offer letter preview.
                    </p>
                </div>
            </DialogContent>
            <DialogActions>
                <button className="pd-btn-outline" onClick={onClose}>
                    Close
                </button>
            </DialogActions>
        </Dialog>
    )
}

// ─── Helper: Interview Scheduling Dialog ─────────────────────────────────────

const InterviewDialog = ({ applicant, onClose, onSave }) => {
    const [form, setForm] = useState(emptyInterviewForm)

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = () => {
        onSave({
            stage: "Interview Scheduled",
            interviewRecord: form,
        })
    }

    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Schedule Interview — {applicant?.fullName}</DialogTitle>
            <DialogContent>
                <div className="flex flex-col gap-4 pt-3">
                    <TextField
                        label="Interviewer Employee ID"
                        name="interviewerId"
                        value={form.interviewerId}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                    />
                    <TextField
                        label="Date"
                        name="date"
                        type="date"
                        value={form.date}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                        label="Time"
                        name="time"
                        type="time"
                        value={form.time}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <FormControl fullWidth size="small">
                        <InputLabel>Mode</InputLabel>
                        <Select
                            name="mode"
                            value={form.mode}
                            label="Mode"
                            onChange={handleChange}
                        >
                            <MenuItem value="in-person">In-Person</MenuItem>
                            <MenuItem value="video">Video</MenuItem>
                            <MenuItem value="phone">Phone</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="Notes"
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                        multiline
                        rows={3}
                    />
                </div>
            </DialogContent>
            <DialogActions>
                <button className="pd-btn-outline" onClick={onClose}>
                    Cancel
                </button>
                <button className="pd-btn-save" onClick={handleSubmit}>
                    Schedule
                </button>
            </DialogActions>
        </Dialog>
    )
}

// ─── Helper: Stage Advance Dialog ────────────────────────────────────────────

const StageAdvanceDialog = ({ applicant, stages, onClose, onSave }) => {
    const currentIdx = stages.indexOf(applicant?.currentStage)
    const nextStages = stages.slice(currentIdx + 1)
    const [selectedStage, setSelectedStage] = useState(nextStages[0] || "")
    const [offerForm, setOfferForm] = useState({
        positionTitle: "",
        salary: "",
        joiningDate: "",
        probationMonths: 0,
    })

    const isOfferExtended = selectedStage === "Offer Extended"

    const handleSubmit = () => {
        const payload = { stage: selectedStage }
        if (isOfferExtended) {
            payload.offerLetter = offerForm
        }
        onSave(payload)
    }

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Move — {applicant?.fullName}</DialogTitle>
            <DialogContent>
                <div className="flex flex-col gap-4 pt-3">
                    <FormControl fullWidth size="small">
                        <InputLabel>Move to Stage</InputLabel>
                        <Select
                            value={selectedStage}
                            label="Move to Stage"
                            onChange={(e) => setSelectedStage(e.target.value)}
                        >
                            {nextStages.map((s) => (
                                <MenuItem key={s} value={s}>
                                    {s}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {isOfferExtended && (
                        <>
                            <TextField
                                label="Position Title"
                                value={offerForm.positionTitle}
                                onChange={(e) =>
                                    setOfferForm((p) => ({ ...p, positionTitle: e.target.value }))
                                }
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="Offered Salary (PKR)"
                                type="number"
                                value={offerForm.salary}
                                onChange={(e) =>
                                    setOfferForm((p) => ({ ...p, salary: e.target.value }))
                                }
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="Joining Date"
                                type="date"
                                value={offerForm.joiningDate}
                                onChange={(e) =>
                                    setOfferForm((p) => ({ ...p, joiningDate: e.target.value }))
                                }
                                fullWidth
                                size="small"
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <TextField
                                label="Probation (months)"
                                type="number"
                                value={offerForm.probationMonths}
                                onChange={(e) =>
                                    setOfferForm((p) => ({
                                        ...p,
                                        probationMonths: Number(e.target.value),
                                    }))
                                }
                                fullWidth
                                size="small"
                                slotProps={{ input: { min: 0, max: 24 } }}
                            />
                        </>
                    )}
                </div>
            </DialogContent>
            <DialogActions>
                <button className="pd-btn-outline" onClick={onClose}>
                    Cancel
                </button>
                <button className="pd-btn-save" onClick={handleSubmit}>
                    Move
                </button>
            </DialogActions>
        </Dialog>
    )
}

// ─── Applicant Card ───────────────────────────────────────────────────────────

const ApplicantCard = ({ applicant, stages, onMoveStage, onViewOffer }) => {
    const [dragging, setDragging] = useState(false)

    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData("applicantId", applicant._id)
                setDragging(true)
            }}
            onDragEnd={() => setDragging(false)}
            className={`bg-surface-container-lowest rounded-md border border-outline-variant p-3 cursor-grab transition-opacity ${
                dragging ? "opacity-40" : "opacity-100"
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{applicant.fullName}</p>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <EmailIcon sx={{ fontSize: 12 }} />
                        <span className="truncate">{applicant.email}</span>
                    </p>
                    {applicant.phone && (
                        <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <PhoneIcon sx={{ fontSize: 12 }} />
                            {applicant.phone}
                        </p>
                    )}
                    <p className="text-xs text-on-surface-variant mt-1 capitalize">
                        Source: {applicant.source}
                    </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                    <Tooltip title="Move Stage">
                        <IconButton
                            size="small"
                            onClick={() => onMoveStage(applicant)}
                        >
                            <WorkIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Tooltip>
                    {applicant.offerLetter?.positionTitle && (
                        <Tooltip title="View Offer Letter">
                            <IconButton
                                size="small"
                                onClick={() => onViewOffer(applicant)}
                            >
                                <PersonIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

const KanbanColumn = ({ stage, applicants, stages, onDrop, onMoveStage, onViewOffer }) => {
    const [dragOver, setDragOver] = useState(false)
    const bg = STAGE_COLORS[stage] || "#f5f5f5"
    const textColor = STAGE_TEXT_COLORS[stage] || "#333"

    return (
        <div
            className="flex flex-col rounded-lg min-w-[200px] max-w-[240px] flex-1"
            style={{ backgroundColor: bg }}
            onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const applicantId = e.dataTransfer.getData("applicantId")
                if (applicantId) onDrop(applicantId, stage)
            }}
        >
            {/* Column Header */}
            <div
                className="px-3 py-2 rounded-t-lg flex items-center justify-between"
                style={{ backgroundColor: bg, borderBottom: `2px solid ${textColor}30` }}
            >
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: textColor }}>
                    {stage}
                </span>
                <span
                    className="text-xs font-bold rounded-full px-2 py-0.5"
                    style={{ backgroundColor: `${textColor}20`, color: textColor }}
                >
                    {applicants.length}
                </span>
            </div>

            {/* Cards */}
            <div
                className={`flex flex-col gap-2 p-2 flex-1 min-h-[120px] rounded-b-lg transition-colors ${
                    dragOver ? "ring-2 ring-primary ring-inset" : ""
                }`}
            >
                {applicants.map((a) => (
                    <ApplicantCard
                        key={a._id}
                        applicant={a}
                        stages={stages}
                        onMoveStage={onMoveStage}
                        onViewOffer={onViewOffer}
                    />
                ))}
                {applicants.length === 0 && (
                    <p className="text-xs text-center py-4 opacity-50" style={{ color: textColor }}>
                        Drop here
                    </p>
                )}
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ApplicantPipelinePage = () => {
    const dispatch = useDispatch()
    const { jobPostings, applicants, loading, error } = useSelector(
        (s) => s.recruitment
    )

    const [selectedPostingId, setSelectedPostingId] = useState("")
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [applicantForm, setApplicantForm] = useState(emptyApplicantForm)
    const [stageDialog, setStageDialog] = useState(null) // { applicant }
    const [interviewDialog, setInterviewDialog] = useState(null) // { applicant }
    const [offerPreview, setOfferPreview] = useState(null) // applicant

    // Derive stages from selected posting or use defaults
    const selectedPosting = jobPostings.find((p) => p._id === selectedPostingId)
    const stages =
        selectedPosting?.pipelineStages?.length > 0
            ? selectedPosting.pipelineStages
            : DEFAULT_STAGES

    useEffect(() => {
        dispatch(fetchJobPostings())
    }, [dispatch])

    useEffect(() => {
        if (selectedPostingId) {
            dispatch(fetchApplicants(selectedPostingId))
        }
    }, [dispatch, selectedPostingId])

    // Group applicants by stage
    const applicantsByStage = stages.reduce((acc, stage) => {
        acc[stage] = applicants.filter((a) => a.currentStage === stage)
        return acc
    }, {})

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleDrop = (applicantId, targetStage) => {
        const applicant = applicants.find((a) => a._id === applicantId)
        if (!applicant || applicant.currentStage === targetStage) return

        const currentIdx = stages.indexOf(applicant.currentStage)
        const targetIdx = stages.indexOf(targetStage)

        // Dropping to "Interview Scheduled" opens the scheduling form
        if (targetStage === "Interview Scheduled" && targetIdx > currentIdx) {
            setInterviewDialog({ applicant })
            return
        }

        // Only allow forward movement via drag
        if (targetIdx > currentIdx) {
            dispatch(advanceApplicantStage({ id: applicantId, stageData: { stage: targetStage } }))
        }
    }

    const handleMoveStage = (applicant) => {
        if (applicant.currentStage === "Interview Scheduled") {
            setInterviewDialog({ applicant })
        } else {
            setStageDialog({ applicant })
        }
    }

    const handleSaveInterview = (data) => {
        dispatch(
            advanceApplicantStage({
                id: interviewDialog.applicant._id,
                stageData: data,
            })
        )
        setInterviewDialog(null)
    }

    const handleSaveStage = (data) => {
        dispatch(
            advanceApplicantStage({
                id: stageDialog.applicant._id,
                stageData: data,
            })
        )
        setStageDialog(null)
    }

    const handleAddApplicant = () => {
        if (!selectedPostingId) return
        dispatch(
            createApplicant({ ...applicantForm, jobPostingId: selectedPostingId })
        )
        setApplicantForm(emptyApplicantForm)
        setAddDialogOpen(false)
    }

    // ── Stage summary counts for selected posting ──────────────────────────────
    const stageSummary = stages.map((s) => ({
        stage: s,
        count: (applicantsByStage[s] || []).length,
    }))

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="pd-section-title">Applicant Pipeline</h2>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedPostingId}
                        onChange={(e) => setSelectedPostingId(e.target.value)}
                        className="pd-input min-w-[220px]"
                    >
                        <option value="">— Select Job Posting —</option>
                        {jobPostings.map((p) => (
                            <option key={p._id} value={p._id}>
                                {p.title} ({p.status})
                            </option>
                        ))}
                    </select>
                    {selectedPostingId && (
                        <AppButton
                            icon={<AddIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setAddDialogOpen(true)}
                        >
                            Add Applicant
                        </AppButton>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <Alert severity="error" className="mb-4">
                    {typeof error === "string" ? error : error?.message || "An error occurred"}
                </Alert>
            )}

            {!selectedPostingId && (
                <Paper
                    elevation={0}
                    className="flex flex-col items-center justify-center py-16 border border-dashed border-outline-variant rounded-xl"
                >
                    <WorkIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                    <p className="text-sm text-on-surface-variant mt-3">
                        Select a job posting to view the applicant pipeline
                    </p>
                </Paper>
            )}

            {selectedPostingId && (
                <>
                    {/* Stage summary strip */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {stageSummary.map(({ stage, count }) => (
                            <Chip
                                key={stage}
                                label={`${stage}: ${count}`}
                                size="small"
                                sx={{
                                    backgroundColor: STAGE_COLORS[stage] || "#f5f5f5",
                                    color: STAGE_TEXT_COLORS[stage] || "#333",
                                    fontWeight: 600,
                                }}
                            />
                        ))}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex justify-center py-10">
                            <CircularProgress />
                        </div>
                    )}

                    {/* Kanban Board */}
                    {!loading && (
                        <div className="flex gap-3 overflow-x-auto pb-4">
                            {stages.map((stage) => (
                                <KanbanColumn
                                    key={stage}
                                    stage={stage}
                                    applicants={applicantsByStage[stage] || []}
                                    stages={stages}
                                    onDrop={handleDrop}
                                    onMoveStage={handleMoveStage}
                                    onViewOffer={setOfferPreview}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Add Applicant Dialog */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Applicant</DialogTitle>
                <DialogContent>
                    <div className="flex flex-col gap-4 pt-3">
                        <TextField
                            label="Full Name"
                            value={applicantForm.fullName}
                            onChange={(e) =>
                                setApplicantForm((p) => ({ ...p, fullName: e.target.value }))
                            }
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Email"
                            type="email"
                            value={applicantForm.email}
                            onChange={(e) =>
                                setApplicantForm((p) => ({ ...p, email: e.target.value }))
                            }
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Phone"
                            value={applicantForm.phone}
                            onChange={(e) =>
                                setApplicantForm((p) => ({ ...p, phone: e.target.value }))
                            }
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="CV File Reference (URL or path)"
                            value={applicantForm.cvFileRef}
                            onChange={(e) =>
                                setApplicantForm((p) => ({ ...p, cvFileRef: e.target.value }))
                            }
                            fullWidth
                            size="small"
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel>Source</InputLabel>
                            <Select
                                value={applicantForm.source}
                                label="Source"
                                onChange={(e) =>
                                    setApplicantForm((p) => ({ ...p, source: e.target.value }))
                                }
                            >
                                <MenuItem value="walk-in">Walk-In</MenuItem>
                                <MenuItem value="referral">Referral</MenuItem>
                                <MenuItem value="portal">Portal</MenuItem>
                                <MenuItem value="LinkedIn">LinkedIn</MenuItem>
                            </Select>
                        </FormControl>
                    </div>
                </DialogContent>
                <DialogActions>
                    <button className="pd-btn-outline" onClick={() => setAddDialogOpen(false)}>
                        Cancel
                    </button>
                    <button className="pd-btn-save" onClick={handleAddApplicant}>
                        Add
                    </button>
                </DialogActions>
            </Dialog>

            {/* Interview Scheduling Dialog */}
            {interviewDialog && (
                <InterviewDialog
                    applicant={interviewDialog.applicant}
                    onClose={() => setInterviewDialog(null)}
                    onSave={handleSaveInterview}
                />
            )}

            {/* Stage Advance Dialog */}
            {stageDialog && (
                <StageAdvanceDialog
                    applicant={stageDialog.applicant}
                    stages={stages}
                    onClose={() => setStageDialog(null)}
                    onSave={handleSaveStage}
                />
            )}

            {/* Offer Letter Preview */}
            {offerPreview && (
                <OfferLetterPreview
                    applicant={offerPreview}
                    onClose={() => setOfferPreview(null)}
                />
            )}
        </div>
    )
}

export default ApplicantPipelinePage
