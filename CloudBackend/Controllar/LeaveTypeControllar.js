import LeaveTypeModal from "../Modal/LeaveTypeModal.js";
import { hrmsCatch } from "../utils/hrmsError.js";


export const createLeaveType = async (req, res) => {
    try {
        const data = await LeaveTypeModal.create(req.body);
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Leave type save failed", "The leave type could not be saved. Please try again.");
    }
};

export const getAllLeaveTypes = async (req, res) => {
    try {
        const query = {};
        if (req.query.isActive !== undefined) query.isActive = req.query.isActive === "true";
        const data = await LeaveTypeModal.find(query).sort({ name: 1 });
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Leave types list failed", "Leave types could not be loaded. Please try again.");
    }
};

export const updateLeaveType = async (req, res) => {
    try {
        const data = await LeaveTypeModal.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Leave type update failed", "The leave type could not be updated. Please try again.");
    }
};

export const deleteLeaveType = async (req, res) => {
    try {
        await LeaveTypeModal.findByIdAndDelete(req.params.id);
        res.status(200).send({ status: true, message: "Deleted" });
    } catch (err) {
        return hrmsCatch(res, err, "Leave type delete failed", "The leave type could not be deleted. Please try again.");
    }
};
