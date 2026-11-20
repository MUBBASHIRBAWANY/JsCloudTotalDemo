import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    fetchJobPostings,
    createJobPosting,
    updateJobPosting,
    fetchApplicants,
} from "../../Redux/Reducers/recruitmentSlice.js"
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
    IconButton,
    Tooltip,
} from "@mui/material"
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward"
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward"
import DeleteIcon from "@mui/icons-material/Delete"
import AddIcon from "@mui/icons-material/Add"
import PeopleIcon from "@mui/icons-material/People"

const DEFAULT_STAGES = [
    "Application Review",
    "Screening",
    "Interview Scheduled",
    "Technical Assessment",
    "Final Interview",
    "Offer Extended",
    "Hired",
    "Rejected",
]

const emptyForm = {
    title: "",
    department: "",
    designation: "",
    qualifications: "",
    experienceLevel: "entry",
    employmentType: "permanent",
    deadline: "",
    openings: 1,
    status: "draft",
}

const statusColor = (status) => {
    if (status === "published") return "success"
    if (status === "closed") return "error"
    return "default"
}

const JobPostingsPage = () => {
    const dispatch = useDispatch()
    const { jobPostings, applicants, loading, error } = useSelector(
        (s) => s.recruitment
    )

    const [dialogOpen, setDialogOpen] = useState(false)
    const [editTarget, setEditTarget] = useState(null) // null = create mode
    const [form, setForm] = useState(emptyForm)

    // Pipeline stages editor (shared default stages, independent of a specific posting)
    const [stages, setStages] = useState(DEFAULT_STAGES)
    const [newStage, setNewStage] = useState("")

    // Stage summary: map postingId → { stageName: count }
    const [stageCounts, setStageCounts] = useState({})
    const [expandedPostingId, setExpandedPostingId] = useState(null)

    useEffect(() => {
        dispatch(fetchJobPostings())
    }, [dispatch])

    // When a posting row is expanded, load its applicants and compute stage counts
    const handleExpandPosting = async (posting) => {
        if (expandedPostingId === posting._id) {
            setExpandedPostingId(null)
            return
        }
        setExpandedPostingId(posting._id)
        const result = await dispatch(fetchApplicants(posting._id))
        const fetched = result?.payload?.data ?? result?.payload ?? []
        const stageList =
            posting.pipelineStages?.length > 0
                ? posting.pipelineStages
                : DEFAULT_STAGES
        const counts = stageList.reduce((acc, s) => {
            acc[s] = fetched.filter((a) => a.currentStage === s).length
            return acc
        }, {})
        setStageCounts((prev) => ({ ...prev, [posting._id]: counts }))
    }

    // ── Dialog helpers ──────────────────────────────────────────────────────
    const openCreate = () => {
        setEditTarget(null)
        setForm(emptyForm)
        setDialogOpen(true)
    }

    const openEdit = (posting) => {
        setEditTarget(posting)
        setForm({
            title: posting.title || "",
            department: posting.department || "",
            designation: posting.designation || "",
            qualifications: posting.qualifications || "",
            experienceLevel: posting.experienceLevel || "entry",
            employmentType: posting.employmentType || "permanent",
            deadline: posting.deadline ? posting.deadline.slice(0, 10) : "",
            openings: posting.openings ?? 1,
            status: posting.status || "draft",
        })
        setDialogOpen(true)
    }

    const closeDialog = () => {
        setDialogOpen(false)
        setEditTarget(null)
        setForm(emptyForm)
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = () => {
        if (editTarget) {
            dispatch(updateJobPosting({ id: editTarget._id, data: form }))
        } else {
            dispatch(createJobPosting(form))
        }
        closeDialog()
    }

    // ── Pipeline stage helpers ──────────────────────────────────────────────
    const moveStage = (idx, dir) => {
        setStages((prev) => {
            const updated = [...prev]
            const target = idx + dir
            if (target < 0 || target >= updated.length) return prev
            ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
            return updated
        })
    }

    const removeStage = (idx) => {
        setStages((prev) => prev.filter((_, i) => i !== idx))
    }

    const addStage = () => {
        const trimmed = newStage.trim()
        if (trimmed && !stages.includes(trimmed)) {
            setStages((prev) => [...prev, trimmed])
        }
        setNewStage("")
    }

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Job Postings</h2>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Add Posting
                </Button>
            </div>

            {loading && (
                <div className="flex justify-center py-10">
                    <CircularProgress />
                </div>
            )}

            {error && (
                <Alert severity="error" className="mb-5">
                    {typeof error === "string" ? error : error?.message || "An error occurred"}
                </Alert>
            )}

                    {/* Job Postings Table */}
            {!loading && (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Title</TableCell>
                            <TableCell>Department</TableCell>
                            <TableCell>Employment Type</TableCell>
                            <TableCell>Deadline</TableCell>
                            <TableCell>Openings</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Stage Counts</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {jobPostings.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    No job postings found.
                                </TableCell>
                            </TableRow>
                        )}
                        {jobPostings.map((posting) => (
                            <>
                                <TableRow key={posting._id}>
                                    <TableCell>{posting.title}</TableCell>
                                    <TableCell>{posting.department}</TableCell>
                                    <TableCell>{posting.employmentType}</TableCell>
                                    <TableCell>
                                        {posting.deadline
                                            ? new Date(posting.deadline).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell>{posting.openings}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={posting.status}
                                            color={statusColor(posting.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {posting.status === "published" && (
                                            <Tooltip title="View stage counts">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleExpandPosting(posting)}
                                                >
                                                    <PeopleIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => openEdit(posting)}
                                        >
                                            Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                {/* Stage counts expansion row */}
                                {expandedPostingId === posting._id &&
                                    stageCounts[posting._id] && (
                                        <TableRow key={`${posting._id}-counts`}>
                                            <TableCell
                                                colSpan={8}
                                                sx={{ paddingY: 1, backgroundColor: "#f8fafc" }}
                                            >
                                                <div className="flex flex-wrap gap-1.5 py-1">
                                                    {Object.entries(
                                                        stageCounts[posting._id]
                                                    ).map(([stage, count]) => (
                                                        <Chip
                                                            key={stage}
                                                            label={`${stage}: ${count}`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ fontSize: "0.7rem" }}
                                                        />
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                            </>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Pipeline Stages Editor */}
            <div className="mt-8">
                <h3 className="pd-section-title mb-4">Pipeline Stages</h3>
                <div className="flex flex-col gap-2">
                    {stages.map((stage, idx) => (
                        <div
                            key={stage}
                            className="flex items-center gap-3 bg-gray-50 rounded px-4 py-2"
                        >
                            <span className="flex-1 text-sm">{stage}</span>
                            <IconButton
                                size="small"
                                onClick={() => moveStage(idx, -1)}
                                disabled={idx === 0}
                            >
                                <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => moveStage(idx, 1)}
                                disabled={idx === stages.length - 1}
                            >
                                <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeStage(idx)}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-3 mt-4">
                    <TextField
                        size="small"
                        label="New Stage"
                        value={newStage}
                        onChange={(e) => setNewStage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addStage()}
                    />
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={addStage}>
                        Add Stage
                    </Button>
                </div>
            </div>

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editTarget ? "Edit Job Posting" : "Add Job Posting"}
                </DialogTitle>
                <DialogContent>
                    <div className="flex flex-col gap-4 pt-2">
                        <TextField
                            label="Title"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Department"
                            name="department"
                            value={form.department}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Designation"
                            name="designation"
                            value={form.designation}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Qualifications"
                            name="qualifications"
                            value={form.qualifications}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel>Experience Level</InputLabel>
                            <Select
                                name="experienceLevel"
                                value={form.experienceLevel}
                                label="Experience Level"
                                onChange={handleChange}
                            >
                                <MenuItem value="entry">Entry</MenuItem>
                                <MenuItem value="mid">Mid</MenuItem>
                                <MenuItem value="senior">Senior</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Employment Type</InputLabel>
                            <Select
                                name="employmentType"
                                value={form.employmentType}
                                label="Employment Type"
                                onChange={handleChange}
                            >
                                <MenuItem value="permanent">Permanent</MenuItem>
                                <MenuItem value="contract">Contract</MenuItem>
                                <MenuItem value="intern">Intern</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Deadline"
                            name="deadline"
                            type="date"
                            value={form.deadline}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                            label="Openings"
                            name="openings"
                            type="number"
                            value={form.openings}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                            slotProps={{ input: { min: 0 } }}
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                name="status"
                                value={form.status}
                                label="Status"
                                onChange={handleChange}
                            >
                                <MenuItem value="draft">Draft</MenuItem>
                                <MenuItem value="published">Published</MenuItem>
                            </Select>
                        </FormControl>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        {editTarget ? "Update" : "Create"}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default JobPostingsPage
