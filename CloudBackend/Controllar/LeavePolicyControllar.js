import LeavePolicyModal from "../modal/LeavePolicyModal.js";
import { hrmsCatch } from "../utils/hrmsError.js";


export const createLeavePolicy = async (req, res) => {
    try {
        const data = await LeavePolicyModal.create(req.body);
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Leave policy save failed", "The leave policy could not be saved. Please try again.");
    }
};

export const getAllLeavePolicies = async (req, res) => {
    try {
        const query = {};
        if (req.query.isActive !== undefined) query.isActive = req.query.isActive === "true";
        if (req.query.leaveTypeId) query.leaveTypeId = req.query.leaveTypeId;
        const data = await LeavePolicyModal.find(query)
            .populate("leaveTypeId", "name code isPaid color")
            .populate("departments", "name")
            .populate("designations", "name")
            .sort({ name: 1 });
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Leave policies list failed", "Leave policies could not be loaded. Please try again.");
    }
};

export const updateLeavePolicy = async (req, res) => {
    try {
        const data = await LeavePolicyModal.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Leave policy update failed", "The leave policy could not be updated. Please try again.");
    }
};

export const deleteLeavePolicy = async (req, res) => {
    try {
        await LeavePolicyModal.findByIdAndDelete(req.params.id);
        res.status(200).send({ status: true, message: "Deleted" });
    } catch (err) {
        return hrmsCatch(res, err, "Leave policy delete failed", "The leave policy could not be deleted. Please try again.");
    }
};

export const getPoliciesForEmployee = async (req, res) => {
    try {
        const { departmentId, designationId, storeId, employmentType } = req.query;
        const query = { isActive: true };

        // Find policies that match the employee's attributes
        // OR policies with empty restrictions (apply to all)
        query.$or = [
            { departments: { $size: 0 } },
            { departments: departmentId },
            { designations: { $size: 0 } },
            { designations: designationId },
            { stores: { $size: 0 } },
            { stores: storeId },
            { employmentTypes: { $size: 0 } },
            { employmentTypes: employmentType }
        ];

        const data = await LeavePolicyModal.find(query)
            .populate("leaveTypeId", "name code isPaid color")
            .sort({ name: 1 });
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Policies load failed", "The policies could not be loaded. Please try again.");
    }
};
