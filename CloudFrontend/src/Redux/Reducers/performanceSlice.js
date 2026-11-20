import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../Api/ApiInstance.jsx";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchAppraisalCycles = createAsyncThunk(
    "performance/fetchCycles",
    async (params = {}, { rejectWithValue }) => {
        try {
            const res = await api.get("/HrPerformance/cycle", { params });
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const createAppraisalCycle = createAsyncThunk(
    "performance/createCycle",
    async (cycleData, { rejectWithValue }) => {
        try {
            const res = await api.post("/HrPerformance/cycle", cycleData);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const updateCycleStatus = createAsyncThunk(
    "performance/updateCycleStatus",
    async ({ id, ...updateData }, { rejectWithValue }) => {
        try {
            const res = await api.put(`/HrPerformance/cycle/${id}`, updateData);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const assignKpi = createAsyncThunk(
    "performance/assignKpi",
    async (kpiData, { rejectWithValue }) => {
        try {
            const res = await api.post("/HrPerformance/kpi", kpiData);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const recordKpiScore = createAsyncThunk(
    "performance/recordKpiScore",
    async ({ id, ...scoreData }, { rejectWithValue }) => {
        try {
            const res = await api.put(`/HrPerformance/kpi/${id}/score`, scoreData);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const submitFeedback = createAsyncThunk(
    "performance/submitFeedback",
    async (feedbackData, { rejectWithValue }) => {
        try {
            const res = await api.post("/HrPerformance/feedback", feedbackData);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const fetchReviewCard = createAsyncThunk(
    "performance/fetchReviewCard",
    async ({ empId, cycleId }, { rejectWithValue }) => {
        try {
            const res = await api.get(`/HrPerformance/review/${empId}/${cycleId}`);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const createIncrementProposal = createAsyncThunk(
    "performance/createIncrementProposal",
    async (proposalData, { rejectWithValue }) => {
        try {
            const res = await api.post("/HrPerformance/increment", proposalData);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const approveIncrementProposal = createAsyncThunk(
    "performance/approveIncrementProposal",
    async ({ id, ...approvalData }, { rejectWithValue }) => {
        try {
            const res = await api.put(`/HrPerformance/increment/${id}/approve`, approvalData);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const exportCycleResults = createAsyncThunk(
    "performance/exportCycleResults",
    async (cycleId, { rejectWithValue }) => {
        try {
            const res = await api.get(`/HrPerformance/export/${cycleId}`);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    cycles: [],
    kpis: [],
    feedback: [],
    incrementProposals: [],
    reviewCard: null,
    loading: false,
    error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const performanceSlice = createSlice({
    name: "performance",
    initialState,
    reducers: {
        clearPerformanceError: (state) => {
            state.error = null;
        },
        clearReviewCard: (state) => {
            state.reviewCard = null;
        },
    },
    extraReducers: (builder) => {
        // fetchAppraisalCycles
        builder
            .addCase(fetchAppraisalCycles.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAppraisalCycles.fulfilled, (state, action) => {
                state.loading = false;
                state.cycles = action.payload;
            })
            .addCase(fetchAppraisalCycles.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // createAppraisalCycle
        builder
            .addCase(createAppraisalCycle.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createAppraisalCycle.fulfilled, (state, action) => {
                state.loading = false;
                state.cycles = [...state.cycles, action.payload];
            })
            .addCase(createAppraisalCycle.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // updateCycleStatus
        builder
            .addCase(updateCycleStatus.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateCycleStatus.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload;
                state.cycles = state.cycles.map((c) =>
                    c._id === updated._id ? updated : c
                );
            })
            .addCase(updateCycleStatus.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // assignKpi
        builder
            .addCase(assignKpi.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(assignKpi.fulfilled, (state, action) => {
                state.loading = false;
                state.kpis = [...state.kpis, action.payload];
            })
            .addCase(assignKpi.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // recordKpiScore
        builder
            .addCase(recordKpiScore.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(recordKpiScore.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload;
                state.kpis = state.kpis.map((k) =>
                    k._id === updated._id ? updated : k
                );
            })
            .addCase(recordKpiScore.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // submitFeedback
        builder
            .addCase(submitFeedback.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(submitFeedback.fulfilled, (state, action) => {
                state.loading = false;
                state.feedback = [...state.feedback, action.payload];
            })
            .addCase(submitFeedback.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // fetchReviewCard
        builder
            .addCase(fetchReviewCard.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchReviewCard.fulfilled, (state, action) => {
                state.loading = false;
                state.reviewCard = action.payload;
            })
            .addCase(fetchReviewCard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // createIncrementProposal
        builder
            .addCase(createIncrementProposal.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createIncrementProposal.fulfilled, (state, action) => {
                state.loading = false;
                state.incrementProposals = [...state.incrementProposals, action.payload];
            })
            .addCase(createIncrementProposal.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // approveIncrementProposal
        builder
            .addCase(approveIncrementProposal.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(approveIncrementProposal.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload;
                state.incrementProposals = state.incrementProposals.map((p) =>
                    p._id === updated._id ? updated : p
                );
            })
            .addCase(approveIncrementProposal.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // exportCycleResults — no state mutation needed beyond loading flag
        builder
            .addCase(exportCycleResults.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(exportCycleResults.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(exportCycleResults.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearPerformanceError, clearReviewCard } = performanceSlice.actions;
export default performanceSlice.reducer;
