import OnboardingChecklistModal from "../Modal/OnboardingChecklistModal.js";
import { hrmsCatch } from "../utils/hrmsError.js";


/**
 * GET /HrOnboarding/:employeeId
 * Get the onboarding checklist for a given employee.
 * Requirements 1.8, 1.9
 */
export const getOnboardingChecklist = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const checklist = await OnboardingChecklistModal.findOne({ employeeId })
            .populate("jobPostingId", "title departmentId designationId")
            .sort({ createdAt: -1 });

        if (!checklist) {
            return res.status(404).send({
                status: false,
                error: "No onboarding checklist found for this employee",
                details: []
            });
        }

        return res.status(200).send({ status: true, data: checklist });
    } catch (err) {
        return hrmsCatch(res, err, "Onboarding checklist load failed", "The onboarding checklist could not be loaded. Please try again.");
    }
};

/**
 * PUT /HrOnboarding/:id/task
 * Mark a specific onboarding task as complete or incomplete.
 * Auto-completes the checklist when all tasks are done.
 * Requirements 1.9, 1.10
 */
export const updateOnboardingTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { taskId, isComplete } = req.body;

        if (!taskId || isComplete === undefined) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["taskId and isComplete are required"]
            });
        }

        const checklist = await OnboardingChecklistModal.findById(id);
        if (!checklist) {
            return res.status(404).send({
                status: false,
                error: "Onboarding checklist not found", details: ["No onboarding checklist exists for this id."]
            });
        }

        // Find and update the specific task
        const task = checklist.tasks.id(taskId);
        if (!task) {
            return res.status(404).send({
                status: false,
                error: "Task not found in checklist",
                details: []
            });
        }

        task.isComplete = isComplete;
        task.completedAt = isComplete ? new Date() : null;

        // Auto-complete detection — Requirement 1.10
        // If all tasks are complete, mark the checklist as completed
        const allDone = checklist.tasks.every(t => t.isComplete);
        if (allDone) {
            checklist.status = "completed";
            checklist.completionDate = new Date();
        } else {
            checklist.status = "pending";
            checklist.completionDate = null;
        }

        await checklist.save();

        return res.status(200).send({ status: true, data: checklist });
    } catch (err) {
        return hrmsCatch(res, err, "Onboarding task update failed", "The onboarding task could not be updated. Please try again.");
    }
};
