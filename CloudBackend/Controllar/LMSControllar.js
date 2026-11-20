import CourseModal from "../modal/CourseModal.js";
import TrainingPlanModal from "../modal/TrainingPlanModal.js";
import EnrollmentModal from "../modal/EnrollmentModal.js";
import CertificationModal from "../modal/CertificationModal.js";
import EmployeeHrModal from "../modal/EmployeeHrModal.js";
import { validateRequired } from "../engine/Validators.js";
import { hrmsCatch } from "../utils/hrmsError.js";


/**
 * POST /HrLMS/course
 * Create a new course. Validates all required fields and field constraints.
 * Requirements 5.1
 */
export const createCourse = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, [
            "title",
            "description",
            "category",
            "deliveryMode",
            "durationHours",
            "passingCriteria"
        ]);
        if (validationError) {
            return res.status(400).json(validationError);
        }

        const { passingCriteria, passingThreshold, materials } = req.body;

        // passingThreshold required when criteria involves test score — Requirement 5.5
        if (
            (passingCriteria === "test_score" || passingCriteria === "both") &&
            (passingThreshold == null || passingThreshold === "")
        ) {
            return res.status(400).json({
                status: false,
                error: "Validation failed",
                details: ["passingThreshold is required when passingCriteria is test_score or both"]
            });
        }

        // materials array cap — Requirement 5.1
        if (Array.isArray(materials) && materials.length > 20) {
            return res.status(400).json({
                status: false,
                error: "Validation failed",
                details: ["A course may have at most 20 materials"]
            });
        }

        const course = await CourseModal.create(req.body);
        return res.status(200).json({ status: true, data: course });
    } catch (err) {
        return hrmsCatch(res, err, "Course save failed", "The course could not be saved. Please try again.");
    }
};

/**
 * POST /HrLMS/plan
 * Create a training plan with status=draft.
 * Requirements 5.2
 */
export const createPlan = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, ["name", "completionDeadline"]);
        if (validationError) {
            return res.status(400).json(validationError);
        }

        const plan = await TrainingPlanModal.create({
            ...req.body,
            status: "draft"
        });
        return res.status(200).json({ status: true, data: plan });
    } catch (err) {
        return hrmsCatch(res, err, "Plan save failed", "The plan could not be saved. Please try again.");
    }
};

/**
 * PUT /HrLMS/plan/:id/publish
 * Publish a training plan:
 *   1. Reject if completionDeadline is not strictly in the future — Requirement 5.11
 *   2. Expand targetAudience: employees in listed departments + individually listed employees, deduped
 *   3. Create Enrollment for each employee × course combo — Requirement 5.3
 *   4. Set plan status="published"
 */
export const publishPlan = async (req, res) => {
    try {
        const plan = await TrainingPlanModal.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ status: false, error: "Training plan not found", details: ["No training plan exists for this id."] });
        }

        // Requirement 5.11 — deadline must be strictly in the future
        const now = new Date();
        if (!plan.completionDeadline || plan.completionDeadline <= now) {
            return res.status(400).json({
                status: false,
                error: "Validation failed",
                details: ["completionDeadline must be a future date to publish the plan"]
            });
        }

        // Expand target audience — Requirement 5.3
        const employeeIdSet = new Set();

        // Individually listed employees
        for (const empId of plan.targetAudience.employees) {
            employeeIdSet.add(String(empId));
        }

        // Employees belonging to listed departments
        if (plan.targetAudience.departments && plan.targetAudience.departments.length > 0) {
            const deptEmployees = await EmployeeHrModal.find(
                { departmentId: { $in: plan.targetAudience.departments }, status: "active" },
                { _id: 1 }
            );
            for (const emp of deptEmployees) {
                employeeIdSet.add(String(emp._id));
            }
        }

        const employeeIds = Array.from(employeeIdSet);
        const courseIds = plan.courses;

        // Build enrollment documents for each employee × course pair (skip existing)
        const enrollmentDocs = [];
        for (const empId of employeeIds) {
            for (const courseId of courseIds) {
                const exists = await EnrollmentModal.findOne({
                    employeeId: empId,
                    courseId: courseId,
                    planId: plan._id
                });
                if (!exists) {
                    enrollmentDocs.push({
                        courseId,
                        planId: plan._id,
                        employeeId: empId,
                        status: "enrolled"
                    });
                }
            }
        }

        if (enrollmentDocs.length > 0) {
            await EnrollmentModal.insertMany(enrollmentDocs);
        }

        plan.status = "published";
        await plan.save();

        return res.status(200).json({
            status: true,
            message: "Plan published successfully",
            data: {
                planId: plan._id,
                enrollmentsCreated: enrollmentDocs.length
            }
        });
    } catch (err) {
        return hrmsCatch(res, err, "Plan update failed", "The plan could not be updated. Please try again.");
    }
};

/**
 * PUT /HrLMS/enrollment/:id/complete
 * Mark an enrollment as complete or failed based on score and passingCriteria.
 * Body: { score? }
 * Requirements 5.4, 5.5, 5.6
 *
 * Passing logic:
 *   - passingCriteria === "test_score" or "both": score >= passingThreshold → "completed"; else "failed"
 *   - passingCriteria === "attendance": always "completed"
 *
 * If completed and course has hasCertification=true:
 *   create Certification with referenceNumber = CERT-${Date.now()}, issueDate=today
 */
export const completeEnrollment = async (req, res) => {
    try {
        const { score } = req.body;

        const enrollment = await EnrollmentModal.findById(req.params.id);
        if (!enrollment) {
            return res.status(404).json({ status: false, error: "Enrollment not found", details: ["No enrollment exists for this id."] });
        }

        const course = await CourseModal.findById(enrollment.courseId);
        if (!course) {
            return res.status(404).json({ status: false, error: "Course not found", details: ["No course exists for this id."] });
        }

        const { passingCriteria, passingThreshold } = course;
        let newStatus;

        if (passingCriteria === "test_score" || passingCriteria === "both") {
            // Score is required for these criteria
            if (score == null || score === "") {
                return res.status(400).json({
                    status: false,
                    error: "Validation failed",
                    details: ["score is required for test_score or both passing criteria"]
                });
            }
            const numScore = Number(score);
            // Requirement 5.5: score >= threshold → completed; score < threshold → failed (boundary = completed)
            newStatus = numScore >= passingThreshold ? "completed" : "failed";
            enrollment.score = numScore;
        } else {
            // attendance — always completed
            newStatus = "completed";
            if (score != null) {
                enrollment.score = Number(score);
            }
        }

        enrollment.status = newStatus;
        enrollment.completionDate = newStatus === "completed" ? new Date() : undefined;
        await enrollment.save();

        let certification = null;
        // Requirement 5.6: create certification if completed and course has hasCertification flag
        if (newStatus === "completed" && course.hasCertification) {
            certification = await CertificationModal.create({
                employeeId: enrollment.employeeId,
                courseId: enrollment.courseId,
                enrollmentId: enrollment._id,
                issueDate: new Date(),
                referenceNumber: `CERT-${Date.now()}`
            });
        }

        return res.status(200).json({
            status: true,
            data: {
                enrollment,
                certification: certification || null
            }
        });
    } catch (err) {
        return hrmsCatch(res, err, "Complete enrollment failed", "The complete enrollment could not be completed. Please try again.");
    }
};

/**
 * GET /HrLMS/employee/:empId
 * Return all enrollments + certifications for an employee.
 * Requirements 5.7
 */
export const getEmployeeTraining = async (req, res) => {
    try {
        const { empId } = req.params;

        const [enrollments, certifications] = await Promise.all([
            EnrollmentModal.find({ employeeId: empId })
                .populate("courseId", "title category deliveryMode durationHours passingCriteria")
                .populate("planId", "name completionDeadline"),
            CertificationModal.find({ employeeId: empId })
                .populate("courseId", "title category")
        ]);

        return res.status(200).json({
            status: true,
            data: { enrollments, certifications }
        });
    } catch (err) {
        return hrmsCatch(res, err, "Employee training load failed", "The employee training could not be loaded. Please try again.");
    }
};

/**
 * GET /HrLMS/plan/:id/dashboard
 * For each course in the plan, return: courseName, totalEnrolled, completedCount, percentage.
 * Requirements 5.8
 */
export const getPlanDashboard = async (req, res) => {
    try {
        const plan = await TrainingPlanModal.findById(req.params.id).populate("courses", "title");
        if (!plan) {
            return res.status(404).json({ status: false, error: "Training plan not found", details: ["No training plan exists for this id."] });
        }

        const dashboardRows = await Promise.all(
            plan.courses.map(async (course) => {
                const [totalEnrolled, completedCount] = await Promise.all([
                    EnrollmentModal.countDocuments({ planId: plan._id, courseId: course._id }),
                    EnrollmentModal.countDocuments({ planId: plan._id, courseId: course._id, status: "completed" })
                ]);
                const percentage = totalEnrolled > 0
                    ? Math.round((completedCount / totalEnrolled) * 100 * 100) / 100
                    : 0;
                return {
                    courseId: course._id,
                    courseName: course.title,
                    totalEnrolled,
                    completedCount,
                    percentage
                };
            })
        );

        return res.status(200).json({ status: true, data: dashboardRows });
    } catch (err) {
        return hrmsCatch(res, err, "Plan dashboard load failed", "The plan dashboard could not be loaded. Please try again.");
    }
};

/**
 * GET /HrLMS/export
 * Export training completion report as CSV.
 * Query params: department, startDate, endDate
 * Columns: employee name, course name, status, completion date, score
 * Requirements 5.10
 */
export const exportTrainingReport = async (req, res) => {
    try {
        const { department, startDate, endDate } = req.query;

        // Build employee filter
        const employeeFilter = { status: { $ne: "terminated" } };
        if (department) {
            employeeFilter.departmentId = department;
        }

        const employees = await EmployeeHrModal.find(employeeFilter, {
            _id: 1,
            firstName: 1,
            lastName: 1
        });
        const employeeMap = {};
        const employeeIds = employees.map((e) => {
            employeeMap[String(e._id)] = `${e.firstName} ${e.lastName}`.trim();
            return e._id;
        });

        // Build enrollment filter
        const enrollmentFilter = { employeeId: { $in: employeeIds } };
        if (startDate || endDate) {
            enrollmentFilter.completionDate = {};
            if (startDate) enrollmentFilter.completionDate.$gte = new Date(startDate);
            if (endDate) enrollmentFilter.completionDate.$lte = new Date(endDate);
        }

        const enrollments = await EnrollmentModal.find(enrollmentFilter)
            .populate("courseId", "title");

        // Build CSV
        const headers = ["Employee Name", "Course Name", "Status", "Completion Date", "Score"];
        const rows = enrollments.map((enr) => {
            const empName = employeeMap[String(enr.employeeId)] || "";
            const courseName = enr.courseId ? enr.courseId.title : "";
            const status = enr.status;
            const completionDate = enr.completionDate
                ? enr.completionDate.toISOString().split("T")[0]
                : "";
            const score = enr.score != null ? enr.score : "";
            // Escape fields that may contain commas
            return [empName, courseName, status, completionDate, score]
                .map((f) => `"${String(f).replace(/"/g, '""')}"`)
                .join(",");
        });

        const csv = [headers.join(","), ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="training-report.csv"'
        );
        return res.status(200).send(csv);
    } catch (err) {
        return hrmsCatch(res, err, "Training report load failed", "The training report could not be loaded. Please try again.");
    }
};
