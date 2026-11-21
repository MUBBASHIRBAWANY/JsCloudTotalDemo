import JobPostingModal from "../Modal/JobPostingModal.js";
import ApplicantModal from "../Modal/ApplicantModal.js";
import { validateRequired } from "../engine/Validators.js";
import { hrmsCatch } from "../utils/hrmsError.js";


/**
 * Utility: set status="closed" for any published posting whose deadline < today.
 * Requirements 1.3, 1.11
 */
export const checkAndCloseDeadlines = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await JobPostingModal.updateMany(
        { deadline: { $lt: today }, status: { $ne: "closed" } },
        { $set: { status: "closed" } }
    );
};

/**
 * POST /HrJobPosting
 * Requirements 1.1, 1.11
 */
export const createJobPosting = async (req, res) => {
    try {
        // Validate required fields
        const validationError = validateRequired(req.body, ["title", "deadline", "openings"]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const { openings } = req.body;

        // Validate openings is a non-negative integer — Requirement 1.11
        // Covers: absent/null (caught above), negative, float, non-numeric string
        const openingsNum = Number(openings);
        if (!Number.isInteger(openingsNum) || openingsNum < 0) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["openings must be a non-negative integer"]
            });
        }

        const data = await JobPostingModal.create({
            ...req.body,
            openings: parseInt(openings, 10)
        });

        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Job posting save failed", "The job posting could not be saved. Please try again.");
    }
};

/**
 * GET /HrJobPosting
 * Runs deadline auto-close first, then returns all postings.
 * Requirements 1.2, 1.3
 */
export const getAllJobPostings = async (req, res) => {
    try {
        await checkAndCloseDeadlines();
        const data = await JobPostingModal.find()
            .populate("departmentId", "name")
            .populate("designationId", "name");
        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Job postings list failed", "Job postings could not be loaded. Please try again.");
    }
};

/**
 * PUT /HrJobPosting/:id
 * Update a job posting by id. When status changes to "published" it becomes visible.
 * Requirements 1.1, 1.2
 */
export const updateJobPosting = async (req, res) => {
    try {
        const data = await JobPostingModal.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!data) {
            return res.status(404).send({ status: false, error: "Job posting not found", details: ["No job posting exists for this id."] });
        }

        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Job posting update failed", "The job posting could not be updated. Please try again.");
    }
};

/**
 * GET /HrJobPosting/:id/stage-summary
 * Returns count of applicants per pipeline stage for a posting with status "open"
 * (published and not closed). Requirements 1.12
 */
export const getJobPostingStageSummary = async (req, res) => {
    try {
        await checkAndCloseDeadlines();

        const posting = await JobPostingModal.findById(req.params.id);
        if (!posting) {
            return res.status(404).send({ status: false, error: "Job posting not found", details: ["No job posting exists for this id."] });
        }

        // Only provide summary for postings that are "open" (published and not closed)
        if (posting.status !== "published") {
            return res.status(400).send({
                status: false,
                error: "Stage summary is only available for open (published) job postings",
                details: []
            });
        }

        // Aggregate applicants by currentStage for this posting
        const stageCounts = await ApplicantModal.aggregate([
            { $match: { jobPostingId: posting._id } },
            { $group: { _id: "$currentStage", count: { $sum: 1 } } }
        ]);

        // Build a summary object keyed by stage name, defaulting to 0 for stages with no applicants
        const summary = {};
        for (const stage of posting.pipelineStages) {
            summary[stage] = 0;
        }
        for (const entry of stageCounts) {
            summary[entry._id] = entry.count;
        }

        return res.status(200).send({ status: true, data: { postingId: posting._id, summary } });
    } catch (err) {
        return hrmsCatch(res, err, "Job posting stage summary load failed", "The job posting stage summary could not be loaded. Please try again.");
    }
};
