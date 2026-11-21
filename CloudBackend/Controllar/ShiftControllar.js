import ShiftModal from "../Modal/ShiftModal.js";
import EmployeeShiftAssignmentModal from "../Modal/EmployeeShiftAssignmentModal.js";
import EmployeeShiftHistoryModal from "../Modal/EmployeeShiftHistoryModal.js";
import EmployeeHrModal from "../Modal/EmployeeHrModal.js";
import { validateRequired } from "../engine/Validators.js";
import { hrmsCatch } from "../utils/hrmsError.js";


/**
 * POST /HrShift
 * Create a new shift.
 * Requirements 6.1
 */
export const createShift = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, ["name", "startTime", "endTime", "applicableDays"]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const data = await ShiftModal.create(req.body);
        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Shift save failed", "The shift could not be saved. Please try again.");
    }
};

/**
 * GET /HrShift
 * Return all shifts.
 * Requirements 6.1
 */
export const getAllShifts = async (req, res) => {
    try {
        const data = await ShiftModal.find();
        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Shifts list failed", "Shifts could not be loaded. Please try again.");
    }
};

/**
 * PUT /HrShift/:id
 * Update a shift by id.
 * Requirements 6.1
 */
export const updateShift = async (req, res) => {
    try {
        const data = await ShiftModal.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!data) {
            return res.status(404).send({ status: false, error: "Shift not found", details: ["No shift exists for this id."] });
        }

        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Shift update failed", "The shift could not be updated. Please try again.");
    }
};

/**
 * PUT /HrShift/:id/assign/:empId
 * Assign a shift to an employee by creating or updating an EmployeeShiftAssignment.
 * Validates both shift and employee exist before persisting.
 * Requirements 6.2
 */
export const assignShiftToEmployee = async (req, res) => {
    try {
        const shiftId = req.params.id;
        const employeeId = req.params.empId;

        const validationError = validateRequired(req.body, ["effectiveFrom"]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        // Validate shift exists
        const shift = await ShiftModal.findById(shiftId);
        if (!shift) {
            return res.status(404).send({ status: false, error: "Shift not found", details: ["No shift exists for this id."] });
        }

        // Validate employee exists
        // const employee = await EmployeeHrModal.findById(employeeId);
        // if (!employee) {
        //     return res.status(404).send({ status: false, error: "Employee not found", details: ["No employee exists for this id."] });
        // }
         // ✅ FIX: Find employee by employeeCode (not by _id)
        const employee = await EmployeeHrModal.findOne({ code: employeeId });
        if (!employee) {
            return res.status(404).send({ 
                status: false, 
                error: "Employee not found", 
                details: [`No employee found with code: ${employeeId}`] 
            });
        }

        // Create or update the assignment for this employee
        // const data = await EmployeeShiftAssignmentModal.findOneAndUpdate(
        //     { employeeId },
        //     { employeeId, shiftId, effectiveFrom: req.body.effectiveFrom },
        //     { upsert: true, new: true, runValidators: true }
        // );

        // return res.status(200).send({ status: true, data });
        // Deactivate current active history record
        await EmployeeShiftHistoryModal.updateMany(
            { employeeId: employee._id, isActive: true },
            { isActive: false, effectiveTo: new Date() }
        );

        // Create new history record
        const data = await EmployeeShiftHistoryModal.create({
            employeeId: employee._id,
            shiftId: shift._id,
            effectiveFrom: req.body.effectiveFrom || new Date(),
            isActive: true,
            assignedBy: req.user?._id,
            reason: req.body.reason || ""
        });

        // Also update legacy assignment for backward compat
        await EmployeeShiftAssignmentModal.findOneAndUpdate(
            { employeeId: employee._id },
            { employeeId: employee._id, shiftId: shift._id, effectiveFrom: req.body.effectiveFrom },
            { upsert: true, new: true }
        );

        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Shift to employee update failed", "The shift to employee could not be updated. Please try again.");
    }
};
