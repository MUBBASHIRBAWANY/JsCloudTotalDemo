import ApplicantModal from "../modal/ApplicantModal.js";
import JobPostingModal from "../modal/JobPostingModal.js";
import OnboardingChecklistModal from "../modal/OnboardingChecklistModal.js";
import { validateRequired } from "../engine/Validators.js";
import { hrmsCatch } from "../utils/hrmsError.js";


/**
 * Default onboarding tasks — Requirement 1.8
 */
const DEFAULT_ONBOARDING_TASKS = [
    { taskName: "Document submission" },
    { taskName: "IT setup" },
    { taskName: "Orientation" },
    { taskName: "Policy acknowledgement" },
    { taskName: "Bank account form" }
];

/**
 * POST /HrApplicant
 * Add an applicant to a job posting.
 * Requirements 1.4, 1.5
 */
export const addApplicant = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, ["jobPostingId", "fullName"]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const { jobPostingId } = req.body;

        // Ensure the job posting exists
        const posting = await JobPostingModal.findById(jobPostingId);
        if (!posting) {
            return res.status(404).send({ status: false, error: "Job posting not found", details: ["No job posting exists for this id."] });
        }

        // Set initial stage to the first stage in the posting's pipeline — Requirement 1.5
        const initialStage = posting.pipelineStages[0] || "Applied";

        const data = await ApplicantModal.create({
            ...req.body,
            currentStage: initialStage,
            applicationDate: new Date()
        });

        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Applicant save failed", "The applicant could not be saved. Please try again.");
    }
};

/**
 * PUT /HrApplicant/:id/stage
 * Advance the applicant's pipeline stage.
 * Handles special business logic for:
 *   - "Interview Scheduled": stores interview record (Req 1.6)
 *   - "Offer Extended": generates offer letter (Req 1.7)
 *   - "Hired": creates onboarding checklist (Req 1.8)
 * Requirements 1.5, 1.6, 1.7, 1.8
 */
export const advanceStage = async (req, res) => {
    try {
        const { id } = req.params;
        const { stage } = req.body;

        if (!stage) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: ["stage is required"]
            });
        }

        const applicant = await ApplicantModal.findById(id);
        if (!applicant) {
            return res.status(404).send({ status: false, error: "Applicant not found", details: ["No applicant exists for this id."] });
        }

        // Verify the stage is valid for the associated job posting
        const posting = await JobPostingModal.findById(applicant.jobPostingId);
        if (posting && !posting.pipelineStages.includes(stage)) {
            return res.status(400).send({
                status: false,
                error: "Invalid stage",
                details: [`Stage "${stage}" is not part of this posting's pipeline`]
            });
        }

        // Update the current stage
        applicant.currentStage = stage;

        // --- Requirement 1.6: Interview Scheduled ---
        if (stage === "Interview Scheduled") {
            const interviewValidation = validateRequired(req.body, [
                "interviewerId",
                "interviewDate",
                "interviewTime",
                "interviewMode"
            ]);
            if (interviewValidation) {
                return res.status(400).send(interviewValidation);
            }

            applicant.interviewRecord = {
                interviewerId: req.body.interviewerId,
                date: new Date(req.body.interviewDate),
                time: req.body.interviewTime,
                mode: req.body.interviewMode,
                notes: req.body.interviewNotes || ""
            };
        }

        // --- Requirement 1.7: Offer Extended ---
        if (stage === "Offer Extended") {
            const offerValidation = validateRequired(req.body, [
                "positionTitle",
                "salary",
                "joiningDate",
                "probationMonths"
            ]);
            if (offerValidation) {
                return res.status(400).send(offerValidation);
            }

            const probationMonths = Number(req.body.probationMonths);
            if (!Number.isInteger(probationMonths) || probationMonths < 0 || probationMonths > 24) {
                return res.status(400).send({
                    status: false,
                    error: "Validation failed",
                    details: ["probationMonths must be a whole number between 0 and 24"]
                });
            }

            // Build the offer letter embedded document
            applicant.offerLetter = {
                positionTitle: req.body.positionTitle,
                salary: Number(req.body.salary),
                joiningDate: new Date(req.body.joiningDate),
                probationMonths
            };
        }

        // --- Requirement 1.8: Hired — auto-create onboarding checklist ---
        let onboardingChecklist = null;
        if (stage === "Hired") {
            const joiningDate = req.body.joiningDate
                ? new Date(req.body.joiningDate)
                : (applicant.offerLetter?.joiningDate || null);

            if (!joiningDate) {
                return res.status(400).send({
                    status: false,
                    error: "Validation failed",
                    details: ["joiningDate is required when advancing to Hired stage"]
                });
            }

            // employeeId may be provided when the HR has already created the employee record
            const employeeId = req.body.employeeId || null;

            onboardingChecklist = await OnboardingChecklistModal.create({
                employeeId,
                jobPostingId: applicant.jobPostingId,
                tasks: DEFAULT_ONBOARDING_TASKS.map(t => ({ ...t })),
                status: "pending"
            });
        }

        await applicant.save();

        const response = { status: true, data: applicant };
        if (onboardingChecklist) {
            response.onboardingChecklist = onboardingChecklist;
        }

        return res.status(200).send(response);
    } catch (err) {
        return hrmsCatch(res, err, "Stage update failed", "The stage could not be updated. Please try again.");
    }
};

/**
 * GET /HrApplicant/posting/:postingId
 * List all applicants for a given job posting.
 * Requirements 1.4, 1.5
 */
export const getApplicantsByPosting = async (req, res) => {
    try {
        const { postingId } = req.params;

        const posting = await JobPostingModal.findById(postingId);
        if (!posting) {
            return res.status(404).send({ status: false, error: "Job posting not found", details: ["No job posting exists for this id."] });
        }

        const data = await ApplicantModal.find({ jobPostingId: postingId })
            .populate("interviewRecord.interviewerId", "firstName lastName code")
            .sort({ applicationDate: -1 });

        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Applicants by posting load failed", "The applicants by posting could not be loaded. Please try again.");
    }
};

/**
 * GET /HrApplicant/:id
 * Get a single applicant by ID.
 */
export const getApplicantById = async (req, res) => {
    try {
        const data = await ApplicantModal.findById(req.params.id)
            .populate("jobPostingId", "title pipelineStages status")
            .populate("interviewRecord.interviewerId", "firstName lastName code");

        if (!data) {
            return res.status(404).send({ status: false, error: "Applicant not found", details: ["No applicant exists for this id."] });
        }

        return res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Applicant load failed", "The applicant could not be loaded. Please try again.");
    }
};

/**
 * GET /HrApplicant/:id/offer-letter
 * Retrieve the generated offer letter for an applicant.
 * Requirement 1.7
 */
export const getOfferLetter = async (req, res) => {
    try {
        const applicant = await ApplicantModal.findById(req.params.id)
            .populate("jobPostingId", "title departmentId designationId")
            .populate("jobPostingId.departmentId", "name");

        if (!applicant) {
            return res.status(404).send({ status: false, error: "Applicant not found", details: ["No applicant exists for this id."] });
        }

        if (!applicant.offerLetter || !applicant.offerLetter.positionTitle) {
            return res.status(400).send({
                status: false,
                error: "No offer letter has been generated for this applicant",
                details: []
            });
        }

        // Compose the full offer letter document — Requirement 1.7
        const offerLetterDocument = {
            applicantName: applicant.fullName,
            positionTitle: applicant.offerLetter.positionTitle,
            department: applicant.jobPostingId?.departmentId?.name || req.query.departmentName || "",
            salary: applicant.offerLetter.salary,
            joiningDate: applicant.offerLetter.joiningDate,
            probationMonths: applicant.offerLetter.probationMonths
        };

        return res.status(200).send({ status: true, data: offerLetterDocument });
    } catch (err) {
        return hrmsCatch(res, err, "Offer letter load failed", "The offer letter could not be loaded. Please try again.");
    }
};
