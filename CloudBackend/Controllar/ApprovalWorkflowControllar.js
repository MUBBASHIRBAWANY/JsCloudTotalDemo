import ApprovalWorkflowModal from "../modal/ApprovalWorkflowModal.js";
import { hrmsCatch } from "../utils/hrmsError.js";


export const getWorkflowByModule = async (module) => {
    try {
        const workflow = await ApprovalWorkflowModal.findOne({ module, isActive: true });
        return workflow;
    } catch (err) {
        console.error("Failed to get workflow:", err);
        throw err;
    }
};

export const createWorkflow = async (req, res) => {
    try {
        const data = await ApprovalWorkflowModal.create(req.body);
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Workflow save failed", "The workflow could not be saved. Please try again.");
    }
};

export const getAllWorkflows = async (req, res) => {
    try {
        const query = {};
        if (req.query.module) query.module = req.query.module;
        const data = await ApprovalWorkflowModal.find(query).sort({ module: 1, name: 1 });
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Workflows list failed", "Workflows could not be loaded. Please try again.");
    }
};

export const updateWorkflow = async (req, res) => {
    try {
        const data = await ApprovalWorkflowModal.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Workflow update failed", "The workflow could not be updated. Please try again.");
    }
};

export const deleteWorkflow = async (req, res) => {
    try {
        await ApprovalWorkflowModal.findByIdAndDelete(req.params.id);
        res.status(200).send({ status: true, message: "Deleted" });
    } catch (err) {
        return hrmsCatch(res, err, "Workflow delete failed", "The workflow could not be deleted. Please try again.");
    }
};
