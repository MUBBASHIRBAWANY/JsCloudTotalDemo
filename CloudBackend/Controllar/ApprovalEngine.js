import ApprovalWorkflowModal from "../modal/ApprovalWorkflowModal.js";
import EmployeeHrModal from "../modal/EmployeeHrModal.js";

/**
 * Get the approval workflow for a module.
 * Falls back to single-level HR approval if no workflow configured.
 */
export async function getWorkflow(module) {
    const workflow = await ApprovalWorkflowModal.findOne({ module, isActive: true });
    if (workflow) return workflow;

    // Default: single-level HR approval
    return {
        name: "Default",
        module,
        levels: [{ level: 1, approverType: "hr" }]
    };
}

/**
 * Determine the approver for a given workflow level.
 * Returns the userId to notify/approve.
 */
export async function getApproverForLevel(workflow, request, level) {
    const levelConfig = workflow.levels.find(l => l.level === level);
    if (!levelConfig) return null;

    if (levelConfig.approverType === "reporting_manager") {
        const employee = await EmployeeHrModal.findById(request.employeeId).select("reportsTo");
        return employee?.reportsTo || null;
    }

    if (levelConfig.approverType === "custom") {
        return levelConfig.approverId || null;
    }

    // "hr" type — returns null (HR group handles it)
    return null;
}

/**
 * Check if there are more approval levels after the current one.
 */
export function hasMoreLevels(workflow, currentLevel) {
    return workflow.levels.some(l => l.level > currentLevel);
}
