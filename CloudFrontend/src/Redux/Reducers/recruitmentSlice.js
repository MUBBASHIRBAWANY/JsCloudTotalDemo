import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../Api/ApiInstance.jsx";

// ─── Async Thunks ────────────────────────────────────────────────────────────

// Job Postings
export const fetchJobPostings = createAsyncThunk(
    "recruitment/fetchJobPostings",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/HrJobPosting");
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createJobPosting = createAsyncThunk(
    "recruitment/createJobPosting",
    async (postingData, { rejectWithValue }) => {
        try {
            const response = await api.post("/HrJobPosting", postingData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateJobPosting = createAsyncThunk(
    "recruitment/updateJobPosting",
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/HrJobPosting/${id}`, data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Applicants
export const fetchApplicants = createAsyncThunk(
    "recruitment/fetchApplicants",
    async (postingId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/HrApplicant/posting/${postingId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createApplicant = createAsyncThunk(
    "recruitment/createApplicant",
    async (applicantData, { rejectWithValue }) => {
        try {
            const response = await api.post("/HrApplicant", applicantData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const advanceApplicantStage = createAsyncThunk(
    "recruitment/advanceApplicantStage",
    async ({ id, stageData }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/HrApplicant/${id}/stage`, stageData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Onboarding Checklists
export const fetchOnboardingChecklist = createAsyncThunk(
    "recruitment/fetchOnboardingChecklist",
    async (employeeId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/HrOnboarding/${employeeId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateOnboardingTask = createAsyncThunk(
    "recruitment/updateOnboardingTask",
    async ({ id, taskData }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/HrOnboarding/${id}/task`, taskData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    jobPostings: [],
    applicants: [],
    onboardingChecklists: [],
    loading: false,
    error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const recruitmentSlice = createSlice({
    name: "recruitment",
    initialState,
    reducers: {
        clearRecruitmentError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // ── fetchJobPostings ──
        builder
            .addCase(fetchJobPostings.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchJobPostings.fulfilled, (state, action) => {
                state.loading = false;
                state.jobPostings = action.payload.data ?? action.payload;
            })
            .addCase(fetchJobPostings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── createJobPosting ──
        builder
            .addCase(createJobPosting.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createJobPosting.fulfilled, (state, action) => {
                state.loading = false;
                const posting = action.payload.data ?? action.payload;
                if (posting && posting._id) {
                    state.jobPostings.push(posting);
                }
            })
            .addCase(createJobPosting.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── updateJobPosting ──
        builder
            .addCase(updateJobPosting.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateJobPosting.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data ?? action.payload;
                if (updated && updated._id) {
                    const idx = state.jobPostings.findIndex((p) => p._id === updated._id);
                    if (idx !== -1) state.jobPostings[idx] = updated;
                }
            })
            .addCase(updateJobPosting.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchApplicants ──
        builder
            .addCase(fetchApplicants.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchApplicants.fulfilled, (state, action) => {
                state.loading = false;
                state.applicants = action.payload.data ?? action.payload;
            })
            .addCase(fetchApplicants.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── createApplicant ──
        builder
            .addCase(createApplicant.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createApplicant.fulfilled, (state, action) => {
                state.loading = false;
                const applicant = action.payload.data ?? action.payload;
                if (applicant && applicant._id) {
                    state.applicants.push(applicant);
                }
            })
            .addCase(createApplicant.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── advanceApplicantStage ──
        builder
            .addCase(advanceApplicantStage.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(advanceApplicantStage.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data ?? action.payload;
                if (updated && updated._id) {
                    const idx = state.applicants.findIndex((a) => a._id === updated._id);
                    if (idx !== -1) state.applicants[idx] = updated;
                }
            })
            .addCase(advanceApplicantStage.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchOnboardingChecklist ──
        builder
            .addCase(fetchOnboardingChecklist.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOnboardingChecklist.fulfilled, (state, action) => {
                state.loading = false;
                const checklist = action.payload.data ?? action.payload;
                // Replace or add the checklist for this employee
                if (checklist && checklist._id) {
                    const idx = state.onboardingChecklists.findIndex(
                        (c) => c._id === checklist._id
                    );
                    if (idx !== -1) {
                        state.onboardingChecklists[idx] = checklist;
                    } else {
                        state.onboardingChecklists.push(checklist);
                    }
                }
            })
            .addCase(fetchOnboardingChecklist.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── updateOnboardingTask ──
        builder
            .addCase(updateOnboardingTask.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateOnboardingTask.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data ?? action.payload;
                if (updated && updated._id) {
                    const idx = state.onboardingChecklists.findIndex(
                        (c) => c._id === updated._id
                    );
                    if (idx !== -1) {
                        state.onboardingChecklists[idx] = updated;
                    }
                }
            })
            .addCase(updateOnboardingTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearRecruitmentError } = recruitmentSlice.actions;
export default recruitmentSlice.reducer;
