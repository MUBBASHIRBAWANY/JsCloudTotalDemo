import DesignationModal from "../modal/DesignationModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const CreateDesignation = async (req, res) => {
    try {
        const lastDesig = await DesignationModal.find().sort({ code: -1 }).limit(1)
        let nextCode
        if (lastDesig.length == 0) {
            nextCode = "001"
        } else {
            let nextNumber = parseInt(lastDesig[0].code, 10) + 1
            nextCode = nextNumber.toString().padStart(3, '0')
        }

        const data = await DesignationModal.create({ ...req.body, code: nextCode })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Designation save failed", "The designation could not be saved. Please try again.");
    }
}

export const getAllDesignation = async (req, res) => {
    try {
        const data = await DesignationModal.find().populate("departmentId", "name code")
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Designation list failed", "Designations could not be loaded. Please try again.");
    }
}

export const getDesignationById = async (req, res) => {
    try {
        const data = await DesignationModal.findById(req.params.id).populate("departmentId", "name code")
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Designation load failed", "The designation could not be loaded. Please try again.");
    }
}

export const updateDesignation = async (req, res) => {
    try {
        const data = await DesignationModal.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Designation update failed", "The designation could not be updated. Please try again.");
    }
}

export const deleteDesignation = async (req, res) => {
    try {
        await DesignationModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Designation deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Designation delete failed", "The designation could not be deleted. Please try again.");
    }
}

export const getDesignationByDepartment = async (req, res) => {
    try {
        const data = await DesignationModal.find({ departmentId: req.params.deptId })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Designation by department load failed", "The designation by department could not be loaded. Please try again.");
    }
}

export const getDesignationNameId = async (req, res) => {
    try {
        const data = await DesignationModal.find({}, { name: 1, code: 1, departmentId: 1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Designation load failed", "The designation could not be loaded. Please try again.");
    }
}
