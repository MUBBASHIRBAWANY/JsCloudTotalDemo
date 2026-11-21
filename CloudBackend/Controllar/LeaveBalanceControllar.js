import EmployeeLeaveBalanceModal from "../Modal/EmployeeLeaveBalanceModal.js";
import LeavePolicyModal from "../Modal/LeavePolicyModal.js";
import LeaveTypeModal from "../Modal/LeaveTypeModal.js";
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


export const allocateLeavesForYear = async (req, res) => {
    try {
        const { employeeId, year } = req.params;
        const { leavePolicyId } = req.body;

        if (!leavePolicyId) {
            return hrmsFail(res, 400, "Missing fields", "A leave policy is required.");
        }

        const policy = await LeavePolicyModal.findById(leavePolicyId);
        if (!policy) return hrmsFail(res, 404, "Leave policy not found", "No leave policy exists for this id.");

        // Check if already allocated
        const existing = await EmployeeLeaveBalanceModal.findOne({
            employeeId, leaveTypeId: policy.leaveTypeId, year
        });
        if (existing) {
            return hrmsFail(res, 409, "Leave already allocated", "Leave is already allocated for this type.");
        }

        // Calculate carried forward from previous year
        let carriedForward = 0;
        if (policy.carryForward) {
            const prevBalance = await EmployeeLeaveBalanceModal.findOne({
                employeeId, leaveTypeId: policy.leaveTypeId, year: year - 1
            });
            if (prevBalance) {
                const unused = prevBalance.allocated + prevBalance.carriedForward - prevBalance.used;
                carriedForward = Math.min(Math.max(unused, 0), policy.maxCarryForward);
            }
        }

        const allocated = policy.annualAllocation;
        const balance = allocated + carriedForward;

        const data = await EmployeeLeaveBalanceModal.create({
            employeeId,
            leavePolicyId,
            leaveTypeId: policy.leaveTypeId,
            year,
            allocated,
            used: 0,
            carriedForward,
            balance
        });

        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Allocate leaves for year failed", "The allocate leaves for year could not be completed. Please try again.");
    }
};

export const getEmployeeBalances = async (req, res) => {
    try {
        const { empId, year } = req.params;
        const data = await EmployeeLeaveBalanceModal.find({ employeeId: empId, year: parseInt(year) })
            .populate("leaveTypeId", "name code color isPaid")
            .populate("leavePolicyId", "name");
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Employee balances load failed", "The employee balances could not be loaded. Please try again.");
    }
};

export const bulkAllocateForAll = async (req, res) => {
    try {
        const { year } = req.params;
        const policies = await LeavePolicyModal.find({ isActive: true }).populate("leaveTypeId");
        if (policies.length === 0) {
            return hrmsFail(res, 404, "Leave policy not found", "No active leave policy was found.");
        }

        // Import EmployeeHrModal dynamically to avoid circular deps
        const { default: EmployeeHrModal } = await import("../Modal/EmployeeHrModal.js");
        const employees = await EmployeeHrModal.find({ status: "active" });

        let allocated = 0;
        let skipped = 0;

        for (const emp of employees) {
            for (const policy of policies) {
                const existing = await EmployeeLeaveBalanceModal.findOne({
                    employeeId: emp._id, leaveTypeId: policy.leaveTypeId, year: parseInt(year)
                });
                if (existing) { skipped++; continue; }

                let carriedForward = 0;
                if (policy.carryForward) {
                    const prev = await EmployeeLeaveBalanceModal.findOne({
                        employeeId: emp._id, leaveTypeId: policy.leaveTypeId, year: parseInt(year) - 1
                    });
                    if (prev) {
                        const unused = prev.allocated + prev.carriedForward - prev.used;
                        carriedForward = Math.min(Math.max(unused, 0), policy.maxCarryForward);
                    }
                }

                await EmployeeLeaveBalanceModal.create({
                    employeeId: emp._id,
                    leavePolicyId: policy._id,
                    leaveTypeId: policy.leaveTypeId,
                    year: parseInt(year),
                    allocated: policy.annualAllocation,
                    used: 0,
                    carriedForward,
                    balance: policy.annualAllocation + carriedForward
                });
                allocated++;
            }
        }

        res.status(200).send({ status: true, data: { allocated, skipped } });
    } catch (err) {
        return hrmsCatch(res, err, "Leave allocation failed", "Leave could not be allocated for every employee. Please try again.");
    }
};
