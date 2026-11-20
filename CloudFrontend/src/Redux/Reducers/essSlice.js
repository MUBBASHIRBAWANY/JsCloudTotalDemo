import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../Api/ApiInstance.jsx";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchEssDashboard = createAsyncThunk(
    "ess/fetchDashboard",
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get("/HrESS/dashboard");
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const fetchPayslips = createAsyncThunk(
    "ess/fetchPayslips",
    async (params = {}, { rejectWithValue }) => {
        try {
            const res = await api.get("/HrESS/payslips", { params });
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const fetchPayslipDetail = createAsyncThunk(
    "ess/fetchPayslipDetail",
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.get(`/HrESS/payslips/${id}`);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const fetchEssAttendance = createAsyncThunk(
    "ess/fetchAttendance",
    async (params = {}, { rejectWithValue }) => {
        try {
            const res = await api.get("/HrESS/attendance", { params });
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const fetchEssLoans = createAsyncThunk(
    "ess/fetchLoans",
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get("/HrESS/loans");
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

export const updateContactInfo = createAsyncThunk(
    "ess/updateContactInfo",
    async (contactData, { rejectWithValue }) => {
        try {
            const res = await api.put("/HrESS/contact", contactData);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    dashboardSummary: null,
    payslips: [],
    payslipDetail: null,
    attendanceSummary: [],
    loans: [],
    contactInfo: null,
    loading: false,
    error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const essSlice = createSlice({
    name: "ess",
    initialState,
    reducers: {
        clearEssError: (state) => {
            state.error = null;
        },
        clearPayslipDetail: (state) => {
            state.payslipDetail = null;
        },
    },
    extraReducers: (builder) => {
        // fetchEssDashboard
        builder
            .addCase(fetchEssDashboard.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchEssDashboard.fulfilled, (state, action) => {
                state.loading = false;
                state.dashboardSummary = action.payload;
            })
            .addCase(fetchEssDashboard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // fetchPayslips
        builder
            .addCase(fetchPayslips.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPayslips.fulfilled, (state, action) => {
                state.loading = false;
                state.payslips = action.payload;
            })
            .addCase(fetchPayslips.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // fetchPayslipDetail
        builder
            .addCase(fetchPayslipDetail.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPayslipDetail.fulfilled, (state, action) => {
                state.loading = false;
                state.payslipDetail = action.payload;
            })
            .addCase(fetchPayslipDetail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // fetchEssAttendance
        builder
            .addCase(fetchEssAttendance.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchEssAttendance.fulfilled, (state, action) => {
                state.loading = false;
                state.attendanceSummary = action.payload;
            })
            .addCase(fetchEssAttendance.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // fetchEssLoans
        builder
            .addCase(fetchEssLoans.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchEssLoans.fulfilled, (state, action) => {
                state.loading = false;
                state.loans = action.payload;
            })
            .addCase(fetchEssLoans.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // updateContactInfo
        builder
            .addCase(updateContactInfo.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateContactInfo.fulfilled, (state, action) => {
                state.loading = false;
                state.contactInfo = action.payload;
            })
            .addCase(updateContactInfo.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearEssError, clearPayslipDetail } = essSlice.actions;
export default essSlice.reducer;
