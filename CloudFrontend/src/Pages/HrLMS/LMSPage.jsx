import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    fetchCourses,
    createCourse,
    createTrainingPlan,
    publishTrainingPlan,
    fetchPlanDashboard,
} from "../../Redux/Reducers/lmsSlice.js"
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
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import TrainingExportButton from "../../Components/HrLMS/TrainingExportButton.jsx"

// ─── Constants ────────────────────────────────────────────────────────────────

const DELIVERY_MODES = ["in-person", "online", "on-the-job"]
const PASSING_CRITERIA = ["attendance", "test_score", "both"]

const emptyCourseForm = {
    title: "",
    description: "",
    category: "",
    deliveryMode: "online",
    durationHours: "",
    passingCriteria: "attendance",
    passingThreshold: "",
}

const emptyPlanForm = {
    name: "",
    targetType: "employees", // "employees" | "department"
    employeeIds: "",         // comma-separated empIds
    department: "",
    courseIds: "",           // comma-separated courseIds
    completionDeadline: "",
}

// ─── Component ────────────────────────────────────────────────────────────────

const LMSPage = () => {
    const dispatch = useDispatch()
    const { courses, plans, certifications, planDashboard, loading, error } =
        useSelector((s) => s.lms)

    // ── Course dialog ──────────────────────────────────────────────────────
    const [courseDialogOpen, setCourseDialogOpen] = useState(false)
    const [courseForm, setCourseForm] = useState(emptyCourseForm)
    const [courseError, setCourseError] = useState("")

    // ── Plan dialog ────────────────────────────────────────────────────────
    const [planDialogOpen, setPlanDialogOpen] = useState(false)
    const [planForm, setPlanForm] = useState(emptyPlanForm)
    const [planError, setPlanError] = useState("")

    // ── Publish feedback ───────────────────────────────────────────────────
    const [publishError, setPublishError] = useState("")

    // ── Dashboard plan selection ───────────────────────────────────────────
    const [selectedPlanId, setSelectedPlanId] = useState("")

    // ── Initial fetch ──────────────────────────────────────────────────────
    useEffect(() => {
        dispatch(fetchCourses())
    }, [dispatch])

    // ── Helpers: course form ───────────────────────────────────────────────
    const handleCourseChange = (e) => {
        const { name, value } = e.target
        setCourseForm((prev) => ({ ...prev, [name]: value }))
    }

    const validateCourse = () => {
        if (!courseForm.title || courseForm.title.length < 1 || courseForm.title.length > 200)
            return "Title must be 1–200 characters."
        if (!courseForm.description || courseForm.description.length < 1 || courseForm.description.length > 2000)
            return "Description must be 1–2000 characters."
        if (!courseForm.category) return "Category is required."
        const dur = parseFloat(courseForm.durationHours)
        if (isNaN(dur) || dur < 0.5 || dur > 999)
            return "Duration must be between 0.5 and 999 hours."
        if (
            (courseForm.passingCriteria === "test_score" || courseForm.passingCriteria === "both") &&
            (!courseForm.passingThreshold || courseForm.passingThreshold === "")
        )
            return "Passing threshold is required for test_score / both."
        return ""
    }

    const handleCourseSubmit = () => {
        const err = validateCourse()
        if (err) { setCourseError(err); return }
        const payload = {
            ...courseForm,
            durationHours: parseFloat(courseForm.durationHours),
        }
        if (courseForm.passingCriteria === "attendance") {
            delete payload.passingThreshold
        } else {
            payload.passingThreshold = parseFloat(courseForm.passingThreshold)
        }
        dispatch(createCourse(payload))
        setCourseDialogOpen(false)
        setCourseForm(emptyCourseForm)
        setCourseError("")
    }

    // ── Helpers: plan form ─────────────────────────────────────────────────
    const handlePlanChange = (e) => {
        const { name, value } = e.target
        setPlanForm((prev) => ({ ...prev, [name]: value }))
    }

    const validatePlan = () => {
        if (!planForm.name) return "Plan name is required."
        if (planForm.targetType === "employees" && !planForm.employeeIds)
            return "At least one employee ID is required."
        if (planForm.targetType === "department" && !planForm.department)
            return "Department is required."
        if (!planForm.courseIds) return "At least one course ID is required."
        if (!planForm.completionDeadline) return "Completion deadline is required."
        const deadline = new Date(planForm.completionDeadline)
        if (deadline <= new Date()) return "Completion deadline must be a future date."
        return ""
    }

    const handlePlanSubmit = () => {
        const err = validatePlan()
        if (err) { setPlanError(err); return }

        const courseIds = planForm.courseIds
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)

        const targetAudience =
            planForm.targetType === "employees"
                ? {
                      type: "employees",
                      employeeIds: planForm.employeeIds
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                  }
                : { type: "department", department: planForm.department }

        dispatch(
            createTrainingPlan({
                name: planForm.name,
                targetAudience,
                courseIds,
                completionDeadline: planForm.completionDeadline,
            })
        )
        setPlanDialogOpen(false)
        setPlanForm(emptyPlanForm)
        setPlanError("")
    }

    // ── Publish plan ───────────────────────────────────────────────────────
    const handlePublish = (plan) => {
        setPublishError("")
        if (new Date(plan.completionDeadline) <= new Date()) {
            setPublishError(
                `Cannot publish "${plan.name}": the completion deadline is in the past.`
            )
            return
        }
        dispatch(publishTrainingPlan(plan._id))
    }

    // ── Dashboard ──────────────────────────────────────────────────────────
    const handleLoadDashboard = () => {
        if (selectedPlanId) {
            dispatch(fetchPlanDashboard(selectedPlanId))
        }
    }

    // ── Expiring certifications (within 30 days) ───────────────────────────
    const today = new Date()
    const thirtyDaysOut = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    const expiringCerts = (certifications || []).filter((cert) => {
        const exp = new Date(cert.expirationDate)
        return exp >= today && exp <= thirtyDaysOut
    })

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <div className="p-6">

            {/* ── Global loading / error ── */}
            {loading && (
                <div className="flex justify-center py-6">
                    <CircularProgress />
                </div>
            )}
            {error && (
                <Alert severity="error" className="mb-4">
                    {typeof error === "string" ? error : error?.message || "An error occurred"}
                </Alert>
            )}

            {/* ══════════════════════════════════════════════════════════════
                1. COURSE CATALOG
            ══════════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="pd-section-title">Course Catalog</h2>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => { setCourseDialogOpen(true); setCourseError("") }}
                >
                    Add Course
                </Button>
            </div>

            <Table size="small" className="mb-8">
                <TableHead>
                    <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Delivery Mode</TableCell>
                        <TableCell>Duration (hrs)</TableCell>
                        <TableCell>Passing Criteria</TableCell>
                        <TableCell>Threshold</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {courses.length === 0 && !loading && (
                        <TableRow>
                            <TableCell colSpan={6} align="center">
                                No courses found.
                            </TableCell>
                        </TableRow>
                    )}
                    {courses.map((course) => (
                        <TableRow key={course._id}>
                            <TableCell>{course.title}</TableCell>
                            <TableCell>{course.category}</TableCell>
                            <TableCell>
                                <Chip label={course.deliveryMode} size="small" />
                            </TableCell>
                            <TableCell>{course.durationHours}</TableCell>
                            <TableCell>{course.passingCriteria}</TableCell>
                            <TableCell>
                                {course.passingCriteria !== "attendance"
                                    ? course.passingThreshold ?? "—"
                                    : "—"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* ══════════════════════════════════════════════════════════════
                2. TRAINING PLANS
            ══════════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="pd-section-title">Training Plans</h2>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => { setPlanDialogOpen(true); setPlanError("") }}
                >
                    Create Plan
                </Button>
            </div>

            {publishError && (
                <Alert severity="error" className="mb-3">
                    {publishError}
                </Alert>
            )}

            <Table size="small" className="mb-8">
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Target</TableCell>
                        <TableCell>Deadline</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Action</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {plans.length === 0 && !loading && (
                        <TableRow>
                            <TableCell colSpan={5} align="center">
                                No training plans found.
                            </TableCell>
                        </TableRow>
                    )}
                    {plans.map((plan) => (
                        <TableRow key={plan._id}>
                            <TableCell>{plan.name}</TableCell>
                            <TableCell>
                                {plan.targetAudience?.type === "department"
                                    ? plan.targetAudience.department
                                    : `${plan.targetAudience?.employeeIds?.length ?? 0} employee(s)`}
                            </TableCell>
                            <TableCell>
                                {plan.completionDeadline
                                    ? new Date(plan.completionDeadline).toLocaleDateString()
                                    : "—"}
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={plan.status ?? "draft"}
                                    color={plan.status === "published" ? "success" : "default"}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>
                                {plan.status !== "published" && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handlePublish(plan)}
                                    >
                                        Publish
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* ══════════════════════════════════════════════════════════════
                3. PLAN COMPLETION DASHBOARD
            ══════════════════════════════════════════════════════════════ */}
            <h2 className="pd-section-title mb-4">Plan Completion Dashboard</h2>
            <div className="flex items-center gap-3 mb-4">
                <FormControl size="small" sx={{ minWidth: 240 }}>
                    <InputLabel>Select Plan</InputLabel>
                    <Select
                        value={selectedPlanId}
                        label="Select Plan"
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                    >
                        {plans.map((p) => (
                            <MenuItem key={p._id} value={p._id}>
                                {p.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    variant="outlined"
                    size="small"
                    disabled={!selectedPlanId}
                    onClick={handleLoadDashboard}
                >
                    Load Dashboard
                </Button>
            </div>

            {planDashboard && (
                <div className="flex flex-col gap-3 mb-8">
                    {(planDashboard.courseProgress || []).map((cp) => (
                        <div key={cp.courseId} className="flex flex-col gap-1">
                            <div className="flex justify-between text-sm">
                                <span>{cp.courseTitle ?? cp.courseId}</span>
                                <span>{cp.completionPercent ?? 0}%</span>
                            </div>
                            <LinearProgress
                                variant="determinate"
                                value={cp.completionPercent ?? 0}
                                sx={{ height: 8, borderRadius: 4 }}
                            />
                        </div>
                    ))}
                    {(!planDashboard.courseProgress || planDashboard.courseProgress.length === 0) && (
                        <p className="text-sm text-gray-500">No progress data available.</p>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                4. EXPIRING CERTIFICATIONS (within 30 days)
            ══════════════════════════════════════════════════════════════ */}
            <h2 className="pd-section-title mb-4">Expiring Certifications</h2>

            <Table size="small" className="mb-8">
                <TableHead>
                    <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Certification</TableCell>
                        <TableCell>Expiration Date</TableCell>
                        <TableCell>Status</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {expiringCerts.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} align="center">
                                No certifications expiring within 30 days.
                            </TableCell>
                        </TableRow>
                    )}
                    {expiringCerts.map((cert) => (
                        <TableRow
                            key={cert._id}
                            sx={{ backgroundColor: "#fff8e1" }}
                        >
                            <TableCell>{cert.employeeName ?? cert.employeeId}</TableCell>
                            <TableCell>{cert.certificationName}</TableCell>
                            <TableCell>
                                {new Date(cert.expirationDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label="expiring-soon"
                                    color="warning"
                                    size="small"
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* ══════════════════════════════════════════════════════════════
                5. EXPORT
            ══════════════════════════════════════════════════════════════ */}
            <h2 className="pd-section-title mb-4">Export LMS Report</h2>
            <TrainingExportButton />

            {/* ══════════════════════════════════════════════════════════════
                DIALOGS
            ══════════════════════════════════════════════════════════════ */}

            {/* ── Create Course ── */}
            <Dialog
                open={courseDialogOpen}
                onClose={() => setCourseDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Add Course</DialogTitle>
                <DialogContent>
                    <div className="flex flex-col gap-4 pt-2">
                        {courseError && (
                            <Alert severity="error">{courseError}</Alert>
                        )}
                        <TextField
                            label="Title"
                            name="title"
                            value={courseForm.title}
                            onChange={handleCourseChange}
                            fullWidth
                            size="small"
                            inputProps={{ maxLength: 200 }}
                        />
                        <TextField
                            label="Description"
                            name="description"
                            value={courseForm.description}
                            onChange={handleCourseChange}
                            fullWidth
                            size="small"
                            multiline
                            rows={3}
                            inputProps={{ maxLength: 2000 }}
                        />
                        <TextField
                            label="Category"
                            name="category"
                            value={courseForm.category}
                            onChange={handleCourseChange}
                            fullWidth
                            size="small"
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel>Delivery Mode</InputLabel>
                            <Select
                                name="deliveryMode"
                                value={courseForm.deliveryMode}
                                label="Delivery Mode"
                                onChange={handleCourseChange}
                            >
                                {DELIVERY_MODES.map((m) => (
                                    <MenuItem key={m} value={m}>
                                        {m}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Duration (hours)"
                            name="durationHours"
                            type="number"
                            value={courseForm.durationHours}
                            onChange={handleCourseChange}
                            fullWidth
                            size="small"
                            slotProps={{ input: { min: 0.5, max: 999, step: 0.5 } }}
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel>Passing Criteria</InputLabel>
                            <Select
                                name="passingCriteria"
                                value={courseForm.passingCriteria}
                                label="Passing Criteria"
                                onChange={handleCourseChange}
                            >
                                {PASSING_CRITERIA.map((c) => (
                                    <MenuItem key={c} value={c}>
                                        {c}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {(courseForm.passingCriteria === "test_score" ||
                            courseForm.passingCriteria === "both") && (
                            <TextField
                                label="Passing Threshold (%)"
                                name="passingThreshold"
                                type="number"
                                value={courseForm.passingThreshold}
                                onChange={handleCourseChange}
                                fullWidth
                                size="small"
                                slotProps={{ input: { min: 0, max: 100 } }}
                            />
                        )}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCourseDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCourseSubmit}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Create Training Plan ── */}
            <Dialog
                open={planDialogOpen}
                onClose={() => setPlanDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Create Training Plan</DialogTitle>
                <DialogContent>
                    <div className="flex flex-col gap-4 pt-2">
                        {planError && (
                            <Alert severity="error">{planError}</Alert>
                        )}
                        <TextField
                            label="Plan Name"
                            name="name"
                            value={planForm.name}
                            onChange={handlePlanChange}
                            fullWidth
                            size="small"
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel>Target Audience</InputLabel>
                            <Select
                                name="targetType"
                                value={planForm.targetType}
                                label="Target Audience"
                                onChange={handlePlanChange}
                            >
                                <MenuItem value="employees">Individual Employees</MenuItem>
                                <MenuItem value="department">Department</MenuItem>
                            </Select>
                        </FormControl>
                        {planForm.targetType === "employees" ? (
                            <TextField
                                label="Employee IDs (comma-separated)"
                                name="employeeIds"
                                value={planForm.employeeIds}
                                onChange={handlePlanChange}
                                fullWidth
                                size="small"
                                placeholder="e.g. emp001, emp002"
                            />
                        ) : (
                            <TextField
                                label="Department"
                                name="department"
                                value={planForm.department}
                                onChange={handlePlanChange}
                                fullWidth
                                size="small"
                            />
                        )}
                        <TextField
                            label="Course IDs (comma-separated)"
                            name="courseIds"
                            value={planForm.courseIds}
                            onChange={handlePlanChange}
                            fullWidth
                            size="small"
                            placeholder="e.g. courseId1, courseId2"
                        />
                        <TextField
                            label="Completion Deadline"
                            name="completionDeadline"
                            type="date"
                            value={planForm.completionDeadline}
                            onChange={handlePlanChange}
                            fullWidth
                            size="small"
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: {
                                    min: new Date(Date.now() + 86400000)
                                        .toISOString()
                                        .split("T")[0],
                                },
                            }}
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handlePlanSubmit}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default LMSPage
