import mongoose from "mongoose";
import AppraisalCycleModal from "../Modal/AppraisalCycleModal.js";
import KPIModal from "../Modal/KPIModal.js";
import FeedbackModal from "../Modal/FeedbackModal.js";
import SalaryIncrementProposalModal from "../Modal/SalaryIncrementProposalModal.js";
import EmployeeHrModal from "../Modal/EmployeeHrModal.js";
import SalaryHistoryModal from "../Modal/SalaryHistoryModal.js";
import { validateRequired } from "../engine/Validators.js";
import { hrmsCatch } from "../utils/hrmsError.js";


// ─── Cycle ────────────────────────────────────────────────────────────────────

/**
 * POST /HrPerformance/cycle
 * Create an Appraisal_Cycle with status defaulting to "draft".
 * Requirements 4.1
 */
export const createCycle = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, [
            "name",
            "cycleType",
            "startDate",
            "endDate",
        ]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const data = await AppraisalCycleModal.create({
            ...req.body,
            status: "draft",
        });

        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Cycle save failed", "The cycle could not be saved. Please try again.");
    }
};

/**
 * PUT /HrPerformance/cycle/:id
 * Update cycle. Enforces allowed status transitions: draft → active → closed.
 * Requirements 4.1, 4.2
 */
export const updateCycle = async (req, res) => {
    try {
        const cycle = await AppraisalCycleModal.findById(req.params.id);
        if (!cycle) {
            return res
                .status(404)
                .send({ status: false, error: "Appraisal cycle not found", details: ["No appraisal cycle exists for this id."] });
        }

        // Validate status transition if a new status is supplied
        if (req.body.status && req.body.status !== cycle.status) {
            const allowed = { draft: "active", active: "closed" };
            if (allowed[cycle.status] !== req.body.status) {
                return res.status(400).send({
                    status: false,
                    error: "Invalid status transition",
                    details: [
                        `Cannot transition from "${cycle.status}" to "${req.body.status}". Allowed: ${cycle.status} → ${allowed[cycle.status] ?? "(none)"}`,
                    ],
                });
            }
        }

        const data = await AppraisalCycleModal.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Cycle update failed", "The cycle could not be updated. Please try again.");
    }
};

// ─── KPI ──────────────────────────────────────────────────────────────────────

/**
 * POST /HrPerformance/kpi
 * Assign a KPI to an employee for a cycle.
 * Validates: total weight per employee per cycle ≤ 100, max 20 KPIs.
 * Requirements 4.2, 4.3
 */
export const assignKPI = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, [
            "cycleId",
            "employeeId",
            "title",
            "weight",
        ]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const { cycleId, employeeId, weight } = req.body;
        const newWeight = Number(weight);

        // Fetch existing KPIs for this employee in this cycle
        const existingKPIs = await KPIModal.find({ cycleId, employeeId });

        // Enforce max 20 KPIs per employee per cycle — Requirement 4.2
        if (existingKPIs.length >= 20) {
            return res.status(400).send({
                status: false,
                error: "KPI limit exceeded",
                details: [
                    "A maximum of 20 KPIs may be assigned to an employee per cycle. Current count: 20.",
                ],
            });
        }

        // Enforce total weight ≤ 100 — Requirement 4.3
        const currentTotal = existingKPIs.reduce((sum, k) => sum + (k.weight || 0), 0);
        const maxAllowed = 100 - currentTotal;

        if (currentTotal + newWeight > 100) {
            return res.status(400).send({
                status: false,
                error: "KPI weight overflow",
                details: [
                    `Current total weight: ${currentTotal}%. Maximum allowed for this assignment: ${maxAllowed}%. Requested: ${newWeight}%.`,
                ],
            });
        }

        const data = await KPIModal.create(req.body);
        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "KPI save failed", "The KPI could not be saved. Please try again.");
    }
};

/**
 * PUT /HrPerformance/kpi/:id/score
 * Record KPI achievement score (0–100).
 * Requirements 4.4
 */
export const recordKPIScore = async (req, res) => {
    try {
        const { achievementScore } = req.body;

        if (achievementScore === undefined || achievementScore === null || achievementScore === "") {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["achievementScore is required"],
            });
        }

        const score = Number(achievementScore);
        if (isNaN(score) || score < 0 || score > 100) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["achievementScore must be a number between 0 and 100"],
            });
        }

        const data = await KPIModal.findByIdAndUpdate(
            req.params.id,
            { achievementScore: score },
            { new: true, runValidators: true }
        );

        if (!data) {
            return res.status(404).send({ status: false, error: "KPI not found", details: ["No KPI exists for this id."] });
        }

        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Record kpiscore failed", "The record kpiscore could not be completed. Please try again.");
    }
};

/**
 * GET /HrPerformance/review/:empId/:cycleId — weighted score component
 * Computes Σ(weight_i × score_i / 100) for all KPIs of an employee in a cycle.
 * Requirements 4.5
 * (Exposed via getConsolidatedReview — also available standalone for testing.)
 */
export const getWeightedScore = async (req, res) => {
    try {
        const { empId, cycleId } = req.params;
        const kpis = await KPIModal.find({ employeeId: empId, cycleId });

        const weightedScore = kpis.reduce((sum, k) => {
            if (k.achievementScore != null) {
                return sum + (k.weight * k.achievementScore) / 100;
            }
            return sum;
        }, 0);

        return res.status(200).send({
            status: true,
            data: { weightedScore: Math.round(weightedScore * 100) / 100 },
        });
    } catch (err) {
        return hrmsCatch(res, err, "Weighted score load failed", "The weighted score could not be loaded. Please try again.");
    }
};

// ─── 360 Feedback ─────────────────────────────────────────────────────────────

/**
 * POST /HrPerformance/feedback
 * Submit 360° feedback.
 * Validates: reviewer ≠ reviewee; cycle not closed; max 5 reviewers per employee per cycle.
 * Requirements 4.6, 4.7, 4.11, 4.13
 */
export const submit360Feedback = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, [
            "cycleId",
            "reviewerId",
            "revieweeId",
            "relationship",
            "rating",
        ]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const { cycleId, reviewerId, revieweeId, rating } = req.body;

        // Requirement 4.13 — prevent self-review
        if (reviewerId.toString() === revieweeId.toString()) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["Reviewer and reviewee cannot be the same employee."],
            });
        }

        // Validate rating range
        const ratingNum = Number(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["Rating must be between 1 and 5."],
            });
        }

        // Requirement 4.11 — cycle must not be closed
        const cycle = await AppraisalCycleModal.findById(cycleId);
        if (!cycle) {
            return res.status(404).send({ status: false, error: "Appraisal cycle not found", details: ["No appraisal cycle exists for this id."] });
        }
        if (cycle.status === "closed") {
            return res.status(400).send({
                status: false,
                error: "Cycle is closed",
                details: ["360 feedback cannot be submitted for a closed appraisal cycle."],
            });
        }

        // Requirement 4.6 — max 5 reviewers per employee per cycle
        const existingFeedbackCount = await FeedbackModal.countDocuments({
            cycleId,
            revieweeId,
        });
        if (existingFeedbackCount >= 5) {
            return res.status(400).send({
                status: false,
                error: "Reviewer limit reached",
                details: [
                    "A maximum of 5 reviewers are allowed per employee per cycle. This employee already has 5 feedback submissions.",
                ],
            });
        }

        const data = await FeedbackModal.create(req.body);
        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "360 feedback update failed", "The 360 feedback could not be updated. Please try again.");
    }
};

// ─── Consolidated Review ──────────────────────────────────────────────────────

/**
 * GET /HrPerformance/review/:empId/:cycleId
 * Return: overall weighted score, KPI breakdown, avg 360 rating, recommendation placeholder.
 * Requirements 4.5, 4.8
 */
export const getConsolidatedReview = async (req, res) => {
    try {
        const { empId, cycleId } = req.params;

        // KPI data
        const kpis = await KPIModal.find({ employeeId: empId, cycleId });

        const overallWeightedScore = kpis.reduce((sum, k) => {
            if (k.achievementScore != null) {
                return sum + (k.weight * k.achievementScore) / 100;
            }
            return sum;
        }, 0);

        const kpiBreakdown = kpis.map((k) => ({
            _id: k._id,
            title: k.title,
            weight: k.weight,
            targetDescription: k.targetDescription,
            measurementUnit: k.measurementUnit,
            achievementScore: k.achievementScore,
            weightedContribution:
                k.achievementScore != null
                    ? Math.round((k.weight * k.achievementScore) / 100 * 100) / 100
                    : null,
        }));

        // 360 Feedback average
        const feedbackRecords = await FeedbackModal.find({ cycleId, revieweeId: empId });
        const avgRating =
            feedbackRecords.length > 0
                ? Math.round(
                      (feedbackRecords.reduce((sum, f) => sum + f.rating, 0) /
                          feedbackRecords.length) *
                          100
                  ) / 100
                : null;

        return res.status(200).send({
            status: true,
            data: {
                employeeId: empId,
                cycleId,
                overallWeightedScore: Math.round(overallWeightedScore * 100) / 100,
                kpiBreakdown,
                avg360Rating: avgRating,
                feedbackCount: feedbackRecords.length,
                recommendation: null, // manager recommendation placeholder — Requirement 4.8
            },
        });
    } catch (err) {
        return hrmsCatch(res, err, "Consolidated review load failed", "The consolidated review could not be loaded. Please try again.");
    }
};

// ─── Increment Proposal ───────────────────────────────────────────────────────

/**
 * POST /HrPerformance/increment
 * Create a salary increment proposal.
 * Requirements 4.9
 */
export const createIncrementProposal = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, [
            "cycleId",
            "employeeId",
            "proposedBy",
            "incrementType",
            "incrementValue",
        ]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const data = await SalaryIncrementProposalModal.create(req.body);
        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Increment proposal save failed", "The increment proposal could not be saved. Please try again.");
    }
};

/**
 * PUT /HrPerformance/increment/:id/approve
 * Atomically approve increment: update employee basicSalary + create SalaryHistory.
 * Uses Mongoose session/transaction. Aborts on any failure.
 * Requirements 4.10
 */
export const approveIncrement = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const proposal = await SalaryIncrementProposalModal.findById(req.params.id).session(
            session
        );
        if (!proposal) {
            await session.abortTransaction();
            session.endSession();
            return res
                .status(404)
                .send({ status: false, error: "Increment proposal not found", details: ["No increment proposal exists for this id."] });
        }

        if (proposal.status !== "pending") {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).send({
                status: false,
                error: "Proposal already processed",
                details: [`Proposal status is "${proposal.status}".`],
            });
        }

        // Load the appraisal cycle for the history reason
        const cycle = await AppraisalCycleModal.findById(proposal.cycleId).session(session);
        if (!cycle) {
            await session.abortTransaction();
            session.endSession();
            return res
                .status(404)
                .send({ status: false, error: "Appraisal cycle not found", details: ["No appraisal cycle exists for this id."] });
        }

        // Load the employee
        const employee = await EmployeeHrModal.findById(proposal.employeeId).session(session);
        if (!employee) {
            await session.abortTransaction();
            session.endSession();
            return res
                .status(404)
                .send({ status: false, error: "Employee not found", details: ["No employee exists for this id."] });
        }

        const previousSalary = employee.salarySetupBasket.basicSalary;

        // Compute new salary
        let newSalary;
        if (proposal.incrementType === "percentage") {
            newSalary = previousSalary + (previousSalary * proposal.incrementValue) / 100;
        } else {
            // fixed
            newSalary = previousSalary + proposal.incrementValue;
        }

        // 1. Update employee salary
        await EmployeeHrModal.findByIdAndUpdate(
            proposal.employeeId,
            { "salarySetupBasket.basicSalary": newSalary },
            { new: true, session }
        );

        // 2. Create SalaryHistory record
        await SalaryHistoryModal.create(
            [
                {
                    employeeId: proposal.employeeId,
                    previousSalary,
                    newSalary,
                    effectiveDate: new Date().toISOString().split("T")[0],
                    reason: `Performance increment – ${cycle.name}`,
                    changedBy: req.body.approvedBy || "System",
                },
            ],
            { session }
        );

        // 3. Update proposal status
        await SalaryIncrementProposalModal.findByIdAndUpdate(
            req.params.id,
            {
                status: "approved",
                approvedBy: req.body.approvedBy || null,
                approvedAt: new Date(),
            },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return res.status(200).send({
            status: true,
            data: {
                proposalId: proposal._id,
                employeeId: proposal.employeeId,
                previousSalary,
                newSalary,
                incrementType: proposal.incrementType,
                incrementValue: proposal.incrementValue,
                cycleName: cycle.name,
            },
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return hrmsCatch(res, err, "Increment update failed", "The increment could not be updated. Please try again.");
    }
};

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * GET /HrPerformance/export/:cycleId
 * Export cycle results as JSON (default) or CSV (query param format=csv).
 * CSV columns: employee, kpi title, weight, score, overall score.
 * Requirements 4.12
 */
export const exportCycleResults = async (req, res) => {
    try {
        const { cycleId } = req.params;
        const format = req.query.format || "json";

        // Fetch all KPIs for the cycle with employee info populated
        const kpis = await KPIModal.find({ cycleId }).populate(
            "employeeId",
            "firstName lastName code"
        );

        if (format === "csv") {
            // Build per-employee weighted scores first
            const scoreMap = {};
            for (const k of kpis) {
                const empId = k.employeeId?._id?.toString() || k.employeeId?.toString();
                if (!scoreMap[empId]) {
                    scoreMap[empId] = 0;
                }
                if (k.achievementScore != null) {
                    scoreMap[empId] += (k.weight * k.achievementScore) / 100;
                }
            }

            const headers = ["employee", "kpi title", "weight", "score", "overall score"];
            const rows = kpis.map((k) => {
                const emp = k.employeeId;
                const empLabel = emp
                    ? `${emp.firstName} ${emp.lastName} (${emp.code})`
                    : k.employeeId?.toString();
                const empId = emp?._id?.toString() || k.employeeId?.toString();
                const overallScore =
                    scoreMap[empId] != null
                        ? Math.round(scoreMap[empId] * 100) / 100
                        : "";

                // Escape commas/quotes in string fields
                const escape = (val) => {
                    const str = String(val ?? "");
                    return str.includes(",") || str.includes('"')
                        ? `"${str.replace(/"/g, '""')}"`
                        : str;
                };

                return [
                    escape(empLabel),
                    escape(k.title),
                    k.weight ?? "",
                    k.achievementScore ?? "",
                    overallScore,
                ].join(",");
            });

            const csv = [headers.join(","), ...rows].join("\n");

            res.setHeader("Content-Type", "text/csv");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="cycle-${cycleId}-results.csv"`
            );
            return res.status(200).send(csv);
        }

        // Default: JSON response
        // Group by employee and compute overall score
        const employeeMap = {};
        for (const k of kpis) {
            const empId = k.employeeId?._id?.toString() || k.employeeId?.toString();
            if (!employeeMap[empId]) {
                employeeMap[empId] = {
                    employee: k.employeeId,
                    kpis: [],
                    overallScore: 0,
                };
            }
            employeeMap[empId].kpis.push({
                _id: k._id,
                title: k.title,
                weight: k.weight,
                achievementScore: k.achievementScore,
            });
            if (k.achievementScore != null) {
                employeeMap[empId].overallScore += (k.weight * k.achievementScore) / 100;
            }
        }

        const results = Object.values(employeeMap).map((entry) => ({
            ...entry,
            overallScore: Math.round(entry.overallScore * 100) / 100,
        }));

        return res.status(200).send({ status: true, cycleId, data: results });
    } catch (err) {
        return hrmsCatch(res, err, "Cycle results load failed", "The cycle results could not be loaded. Please try again.");
    }
};
