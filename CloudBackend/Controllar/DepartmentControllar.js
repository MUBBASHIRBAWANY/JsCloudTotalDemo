import DepartmentModal from "../modal/DepartmentModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const CreateDepartment = async (req, res) => {
    try {
        const lastDept = await DepartmentModal.find().sort({ code: -1 }).limit(1)
        let nextCode
        if (lastDept.length == 0) {
            nextCode = "001"
        } else {
            let nextNumber = parseInt(lastDept[0].code, 10) + 1
            nextCode = nextNumber.toString().padStart(3, '0')
        }

        const data = await DepartmentModal.create({ ...req.body, code: nextCode })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Department save failed", "The department could not be saved. Please try again.");
    }
}

export const getAllDepartment = async (req, res) => {
    try {
        const data = await DepartmentModal.find()
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Department list failed", "Departments could not be loaded. Please try again.");
    }
}

export const getDepartmentById = async (req, res) => {
    try {
        const data = await DepartmentModal.findById(req.params.id)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Department load failed", "The department could not be loaded. Please try again.");
    }
}

export const updateDepartment = async (req, res) => {
    try {
        const data = await DepartmentModal.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Department update failed", "The department could not be updated. Please try again.");
    }
}

export const deleteDepartment = async (req, res) => {
    try {
        await DepartmentModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Department deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Department delete failed", "The department could not be deleted. Please try again.");
    }
}

export const getLastDepartment = async (req, res) => {
    try {
        const data = await DepartmentModal.findOne().sort({ _id: -1 }).limit(1)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Last department load failed", "The last department could not be loaded. Please try again.");
    }
}

export const getDepartmentNameId = async (req, res) => {
    try {
        const data = await DepartmentModal.find({}, { name: 1, code: 1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Department load failed", "The department could not be loaded. Please try again.");
    }
}
