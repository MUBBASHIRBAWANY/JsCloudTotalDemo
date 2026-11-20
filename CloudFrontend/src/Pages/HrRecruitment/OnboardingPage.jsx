import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    fetchApplicants,
    fetchJobPostings,
    fetchOnboardingChecklist,
    updateOnboardingTask,
} from "../../Redux/Reducers/recruitmentSlice.js"
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Checkbox,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
    LinearProgress,
} from "@mui/material"
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward"
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward"
import DeleteIcon from "@mui/icons-material/Delete"
import AddIcon from "@mui/icons-material/Add"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import AssignmentIcon from "@mui/icons-material/Assignment"
import PersonSearchIcon from "@mui/icons-material/PersonSearch"

// ─── Main Page ────────────────────────────────────────────────────────────────

const OnboardingPage = () => {
    const dispatch = useDispatch()
    const { applicants, onboardingChecklists, loading, error } = useSelector(
        (s) => s.recruitment
    )

    // Employee selector: filter hired applicants
    const hiredApplicants = applicants.filter(
        (a) => a.currentStage === "Hired"
    )

    const [selectedEmployeeId, setSelectedEmployeeId] = useState("")
    const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false)
    const [employeeIdInput, setEmployeeIdInput] = useState("")

    const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false)
    const [newTaskName, setNewTaskName] = useState("")

    // Derive checklist for current employee
    const checklist = onboardingChecklists.find(
        (c) => String(c.employeeId) === String(selectedEmployeeId)
    ) || null

    const tasks = checklist?.tasks || []
    const allDone = tasks.length > 0 && tasks.every((t) => t.isComplete)
    const completedCount = tasks.filter((t) => t.isComplete).length
    const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

    useEffect(() => {
        dispatch(fetchJobPostings())
        dispatch(fetchApplicants(""))    // fetch all applicants (or pass empty to trigger fetch)
    }, [dispatch])

    useEffect(() => {
        if (selectedEmployeeId) {
            dispatch(fetchOnboardingChecklist(selectedEmployeeId))
        }
    }, [dispatch, selectedEmployeeId])

    // ── Handlers ──────────────────────────────────────────────────────────────

    const loadEmployee = () => {
        const id = employeeIdInput.trim()
        if (!id) return
        setSelectedEmployeeId(id)
        setEmployeeSearchOpen(false)
        setEmployeeIdInput("")
    }

    const handleToggleTask = (taskIdx) => {
        if (!checklist) return
        const task = tasks[taskIdx]
        const updatedTasks = tasks.map((t, i) =>
            i === taskIdx ? { ...t, isComplete: !t.isComplete } : t
        )
        dispatch(
            updateOnboardingTask({
                id: checklist._id,
                taskData: { action: "update", taskIdx, isComplete: !task.isComplete, tasks: updatedTasks },
            })
        )
    }

    const handleRemoveTask = (taskIdx) => {
        if (!checklist) return
        const updatedTasks = tasks.filter((_, i) => i !== taskIdx)
        dispatch(
            updateOnboardingTask({
                id: checklist._id,
                taskData: { action: "remove", taskIdx, tasks: updatedTasks },
            })
        )
    }

    const handleMoveTask = (taskIdx, dir) => {
        if (!checklist) return
        const target = taskIdx + dir
        if (target < 0 || target >= tasks.length) return
        const updatedTasks = [...tasks]
        ;[updatedTasks[taskIdx], updatedTasks[target]] = [
            updatedTasks[target],
            updatedTasks[taskIdx],
        ]
        dispatch(
            updateOnboardingTask({
                id: checklist._id,
                taskData: { action: "reorder", tasks: updatedTasks },
            })
        )
    }

    const handleAddTask = () => {
        const name = newTaskName.trim()
        if (!name || !checklist) return
        const updatedTasks = [...tasks, { taskName: name, isComplete: false }]
        dispatch(
            updateOnboardingTask({
                id: checklist._id,
                taskData: { action: "add", taskName: name, tasks: updatedTasks },
            })
        )
        setNewTaskName("")
        setAddTaskDialogOpen(false)
    }

    const handleCompleteAll = () => {
        if (!checklist || allDone) return
        const updatedTasks = tasks.map((t) => ({ ...t, isComplete: true }))
        dispatch(
            updateOnboardingTask({
                id: checklist._id,
                taskData: { action: "completeAll", tasks: updatedTasks },
            })
        )
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="pd-section-title">Onboarding Checklists</h2>
                <div className="flex items-center gap-3">
                    <button
                        className="pd-btn-outline flex items-center gap-1.5 text-sm"
                        onClick={() => setEmployeeSearchOpen(true)}
                    >
                        <PersonSearchIcon sx={{ fontSize: 16 }} />
                        Search Employee
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <Alert severity="error" className="mb-4">
                    {typeof error === "string" ? error : error?.message || "An error occurred"}
                </Alert>
            )}

            {/* No employee selected */}
            {!selectedEmployeeId && (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed border-outline-variant rounded-xl">
                    <AssignmentIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                    <p className="text-sm text-on-surface-variant mt-3">
                        Enter an employee ID to load their onboarding checklist
                    </p>
                    <button
                        className="pd-btn-save mt-4 flex items-center gap-1.5 text-sm"
                        onClick={() => setEmployeeSearchOpen(true)}
                    >
                        <PersonSearchIcon sx={{ fontSize: 16 }} />
                        Search Employee
                    </button>
                </div>
            )}

            {selectedEmployeeId && (
                <div className="max-w-2xl">
                    {/* Employee banner */}
                    <div className="flex items-center justify-between bg-primary-container text-on-primary-container rounded-lg px-4 py-3 mb-5">
                        <div>
                            <p className="text-xs font-medium opacity-70">Employee ID</p>
                            <p className="text-sm font-bold">{selectedEmployeeId}</p>
                        </div>
                        {checklist && (
                            <div className="text-right">
                                <p className="text-xs font-medium opacity-70">Status</p>
                                <p className="text-sm font-bold capitalize">
                                    {checklist.status || "in-progress"}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex justify-center py-8">
                            <CircularProgress size={36} />
                        </div>
                    )}

                    {/* No checklist found */}
                    {!loading && !checklist && (
                        <Alert severity="info">
                            No onboarding checklist found for this employee. Checklists are
                            auto-created when an applicant is marked as &quot;Hired&quot;.
                        </Alert>
                    )}

                    {/* Checklist */}
                    {!loading && checklist && (
                        <>
                            {/* Progress bar */}
                            <div className="mb-5">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-on-surface-variant font-medium">
                                        Progress
                                    </span>
                                    <span className="text-xs font-bold">
                                        {completedCount} / {tasks.length} tasks
                                    </span>
                                </div>
                                <LinearProgress
                                    variant="determinate"
                                    value={progress}
                                    sx={{ height: 8, borderRadius: 4 }}
                                    color={allDone ? "success" : "primary"}
                                />
                            </div>

                            {/* Completion badge */}
                            {allDone && (
                                <div className="flex items-center gap-2 bg-green-50 text-green-800 border border-green-200 rounded-lg px-4 py-2 mb-4 text-sm font-medium">
                                    <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
                                    Onboarding complete!
                                    {checklist.completionDate && (
                                        <span className="text-xs ml-1 opacity-70">
                                            ({new Date(checklist.completionDate).toLocaleDateString("en-GB")})
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    className="pd-btn-save flex items-center gap-1.5 text-sm"
                                    onClick={() => setAddTaskDialogOpen(true)}
                                    disabled={allDone}
                                >
                                    <AddIcon sx={{ fontSize: 16 }} />
                                    Add Task
                                </button>
                                {!allDone && tasks.length > 0 && (
                                    <button
                                        className="pd-btn-outline flex items-center gap-1.5 text-sm"
                                        onClick={handleCompleteAll}
                                    >
                                        <CheckCircleIcon sx={{ fontSize: 16 }} />
                                        Complete All
                                    </button>
                                )}
                            </div>

                            {/* Task list */}
                            {tasks.length === 0 && (
                                <p className="text-sm text-on-surface-variant text-center py-6">
                                    No tasks in this checklist yet.
                                </p>
                            )}

                            <div className="flex flex-col gap-2">
                                {tasks.map((task, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                                            task.isComplete
                                                ? "border-green-200 bg-green-50"
                                                : "border-outline-variant bg-surface-container-lowest"
                                        }`}
                                    >
                                        <Checkbox
                                            checked={!!task.isComplete}
                                            onChange={() => handleToggleTask(idx)}
                                            size="small"
                                            color="success"
                                        />
                                        <span
                                            className={`flex-1 text-sm ${
                                                task.isComplete
                                                    ? "line-through text-on-surface-variant"
                                                    : "text-on-surface"
                                            }`}
                                        >
                                            {task.taskName}
                                        </span>
                                        {task.completedAt && (
                                            <span className="text-xs text-on-surface-variant shrink-0">
                                                {new Date(task.completedAt).toLocaleDateString("en-GB")}
                                            </span>
                                        )}

                                        {/* Reorder + Remove (hidden for completed) */}
                                        {!allDone && (
                                            <div className="flex items-center gap-0.5">
                                                <Tooltip title="Move up">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleMoveTask(idx, -1)}
                                                            disabled={idx === 0}
                                                        >
                                                            <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Move down">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleMoveTask(idx, 1)}
                                                            disabled={idx === tasks.length - 1}
                                                        >
                                                            <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Remove task">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleRemoveTask(idx)}
                                                            disabled={task.isComplete}
                                                        >
                                                            <DeleteIcon sx={{ fontSize: 14 }} />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Employee Search Dialog */}
            <Dialog
                open={employeeSearchOpen}
                onClose={() => setEmployeeSearchOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Find Employee Onboarding</DialogTitle>
                <DialogContent>
                    <div className="flex flex-col gap-4 pt-3">
                        <TextField
                            label="Employee ID"
                            value={employeeIdInput}
                            onChange={(e) => setEmployeeIdInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && loadEmployee()}
                            fullWidth
                            size="small"
                            autoFocus
                            placeholder="e.g. 1001"
                        />

                        {hiredApplicants.length > 0 && (
                            <div>
                                <p className="text-xs text-on-surface-variant font-medium mb-2">
                                    Recently hired applicants
                                </p>
                                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                                    {hiredApplicants.map((a) => (
                                        <button
                                            key={a._id}
                                            className="text-left px-3 py-2 rounded-md hover:bg-surface-container-low text-sm border border-outline-variant"
                                            onClick={() => {
                                                setEmployeeIdInput(
                                                    a.employeeId || a._id
                                                )
                                            }}
                                        >
                                            <span className="font-medium">{a.fullName}</span>
                                            <span className="text-on-surface-variant ml-2 text-xs">
                                                {a.employeeId || a._id}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
                <DialogActions>
                    <button
                        className="pd-btn-outline"
                        onClick={() => setEmployeeSearchOpen(false)}
                    >
                        Cancel
                    </button>
                    <button className="pd-btn-save" onClick={loadEmployee}>
                        Load
                    </button>
                </DialogActions>
            </Dialog>

            {/* Add Task Dialog */}
            <Dialog
                open={addTaskDialogOpen}
                onClose={() => setAddTaskDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Add Task</DialogTitle>
                <DialogContent>
                    <div className="pt-3">
                        <TextField
                            label="Task Name"
                            value={newTaskName}
                            onChange={(e) => setNewTaskName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                            fullWidth
                            size="small"
                            autoFocus
                            placeholder="e.g. IT Equipment Setup"
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <button
                        className="pd-btn-outline"
                        onClick={() => setAddTaskDialogOpen(false)}
                    >
                        Cancel
                    </button>
                    <button className="pd-btn-save" onClick={handleAddTask}>
                        Add
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default OnboardingPage
