import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../Api/ApiInstance.jsx";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchHrDashboard = createAsyncThunk(
    "hrDashboard/fetchHrDashboard",
    async (department, { rejectWithValue }) => {
        try {
            const params = department ? { department } : {};
            const response = await api.get("/HrDashboard", { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    dashboardData: null,
    departmentFilter: null,
    loading: false,
    error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const hrDashboardSlice = createSlice({
    name: "hrDashboard",
    initialState,
    reducers: {
        setDepartmentFilter: (state, action) => {
            state.departmentFilter = action.payload;
        },
        clearHrDashboardError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // ── fetchHrDashboard ──
        builder
            .addCase(fetchHrDashboard.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchHrDashboard.fulfilled, (state, action) => {
                state.loading = false;
                state.dashboardData = action.payload.data ?? action.payload;
            })
            .addCase(fetchHrDashboard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { setDepartmentFilter, clearHrDashboardError } = hrDashboardSlice.actions;
export default hrDashboardSlice.reducer;
