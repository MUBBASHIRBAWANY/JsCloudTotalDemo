import OvertimePolicyModal from "../modal/OvertimePolicyModal.js";
import ShiftModal from "../modal/ShiftModal.js";
import { validateRequired } from "../engine/Validators.js";
import { hrmsCatch } from "../utils/hrmsError.js";


/**
 * POST /HrOvertimePolicy
 * Create a new overtime policy for a shift.
 * Requirements 6.4
 */
export const createOvertimePolicy = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, ["shiftId"]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        // Validate referenced shift exists
        const shift = await ShiftModal.findById(req.body.shiftId);
        if (!shift) {
            return res.status(404).send({ status: false, error: "Shift not found", details: ["No shift exists for this id."] });
        }

        const data = await OvertimePolicyModal.create(req.body);
        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Overtime policy save failed", "The overtime policy could not be saved. Please try again.");
    }
};

/**
 * GET /HrOvertimePolicy
 * Return all overtime policies. Optionally filter by ?shiftId=<id>.
 * Requirements 6.4
 */
export const getOvertimePolicies = async (req, res) => {
    try {
        const filter = {};
        if (req.query.shiftId) {
            filter.shiftId = req.query.shiftId;
        }

        const data = await OvertimePolicyModal.find(filter).populate("shiftId", "name startTime endTime");
        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Overtime policies load failed", "The overtime policies could not be loaded. Please try again.");
    }
};

/**
 * PUT /HrOvertimePolicy/:id
 * Update an overtime policy by id.
 * Requirements 6.4
 */
export const updateOvertimePolicy = async (req, res) => {
    try {
        const data = await OvertimePolicyModal.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!data) {
            return res.status(404).send({ status: false, error: "Overtime policy not found", details: [] });
        }

        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Overtime policy update failed", "The overtime policy could not be updated. Please try again.");
    }
};

/**
 * DELETE /HrOvertimePolicy/:id
 * Delete an overtime policy by id.
 * Requirements 6.4
 */
export const deleteOvertimePolicy = async (req, res) => {
    try {
        const data = await OvertimePolicyModal.findByIdAndDelete(req.params.id);

        if (!data) {
            return res.status(404).send({ status: false, error: "Overtime policy not found", details: [] });
        }

        return res.status(200).send({ status: true, message: "Overtime policy deleted" });
    } catch (err) {
        return hrmsCatch(res, err, "Overtime policy delete failed", "The overtime policy could not be deleted. Please try again.");
    }
};
