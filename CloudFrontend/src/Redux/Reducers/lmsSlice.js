import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../Api/ApiInstance.jsx";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchCourses = createAsyncThunk(
    "lms/fetchCourses",
    async (params = {}, { rejectWithValue }) => {
        try {
            const res = await api.get("/HrLMS/course", { params });
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const createCourse = createAsyncThunk(
    "lms/createCourse",
    async (courseData, { rejectWithValue }) => {
        try {
            const res = await api.post("/HrLMS/course", courseData);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const createTrainingPlan = createAsyncThunk(
    "lms/createTrainingPlan",
    async (planData, { rejectWithValue }) => {
        try {
            const res = await api.post("/HrLMS/plan", planData);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const publishTrainingPlan = createAsyncThunk(
    "lms/publishTrainingPlan",
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.put(`/HrLMS/plan/${id}/publish`);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const completeEnrollment = createAsyncThunk(
    "lms/completeEnrollment",
    async ({ id, ...completionData }, { rejectWithValue }) => {
        try {
            const res = await api.put(`/HrLMS/enrollment/${id}/complete`, completionData);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const fetchEmployeeTrainingHistory = createAsyncThunk(
    "lms/fetchTrainingHistory",
    async (empId, { rejectWithValue }) => {
        try {
            const res = await api.get(`/HrLMS/employee/${empId}`);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const fetchPlanDashboard = createAsyncThunk(
    "lms/fetchPlanDashboard",
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.get(`/HrLMS/plan/${id}/dashboard`);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const exportLmsReport = createAsyncThunk(
    "lms/exportReport",
    async (params = {}, { rejectWithValue }) => {
        try {
            const res = await api.get("/HrLMS/export", { params });
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    courses: [],
    plans: [],
    enrollments: [],
    certifications: [],
    trainingHistory: [],
    planDashboard: null,
    loading: false,
    error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const lmsSlice = createSlice({
    name: "lms",
    initialState,
    reducers: {
        clearLmsError: (state) => {
            state.error = null;
        },
        clearPlanDashboard: (state) => {
            state.planDashboard = null;
        },
        clearTrainingHistory: (state) => {
            state.trainingHistory = [];
        },
    },
    extraReducers: (builder) => {
        // fetchCourses
        builder
            .addCase(fetchCourses.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCourses.fulfilled, (state, action) => {
                state.loading = false;
                state.courses = action.payload;
            })
            .addCase(fetchCourses.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // createCourse
        builder
            .addCase(createCourse.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createCourse.fulfilled, (state, action) => {
                state.loading = false;
                state.courses = [...state.courses, action.payload];
            })
            .addCase(createCourse.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // createTrainingPlan
        builder
            .addCase(createTrainingPlan.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createTrainingPlan.fulfilled, (state, action) => {
                state.loading = false;
                state.plans = [...state.plans, action.payload];
            })
            .addCase(createTrainingPlan.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // publishTrainingPlan
        builder
            .addCase(publishTrainingPlan.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(publishTrainingPlan.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload;
                state.plans = state.plans.map((p) =>
                    p._id === updated._id ? updated : p
                );
            })
            .addCase(publishTrainingPlan.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // completeEnrollment
        builder
            .addCase(completeEnrollment.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(completeEnrollment.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload;
                state.enrollments = state.enrollments.map((e) =>
                    e._id === updated._id ? updated : e
                );
            })
            .addCase(completeEnrollment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // fetchEmployeeTrainingHistory
        builder
            .addCase(fetchEmployeeTrainingHistory.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchEmployeeTrainingHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.trainingHistory = action.payload;
            })
            .addCase(fetchEmployeeTrainingHistory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // fetchPlanDashboard
        builder
            .addCase(fetchPlanDashboard.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPlanDashboard.fulfilled, (state, action) => {
                state.loading = false;
                state.planDashboard = action.payload;
            })
            .addCase(fetchPlanDashboard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // exportLmsReport — no state mutation needed beyond loading flag
        builder
            .addCase(exportLmsReport.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(exportLmsReport.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(exportLmsReport.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearLmsError, clearPlanDashboard, clearTrainingHistory } = lmsSlice.actions;
export default lmsSlice.reducer;
