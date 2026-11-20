import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../Api/ApiInstance.jsx";

// ─── Async Thunks ────────────────────────────────────────────────────────────

// Shifts
export const fetchShifts = createAsyncThunk(
    "attendanceHr/fetchShifts",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/HrShift");
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createShift = createAsyncThunk(
    "attendanceHr/createShift",
    async (shiftData, { rejectWithValue }) => {
        try {
            const response = await api.post("/HrShift", shiftData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const assignShift = createAsyncThunk(
    "attendanceHr/assignShift",
    async ({ id, empId, data }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/HrShift/${id}/assign/${empId}`, data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Overtime Policies
export const fetchOvertimePolicies = createAsyncThunk(
    "attendanceHr/fetchOvertimePolicies",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/HrOvertimePolicy");
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createOvertimePolicy = createAsyncThunk(
    "attendanceHr/createOvertimePolicy",
    async (policyData, { rejectWithValue }) => {
        try {
            const response = await api.post("/HrOvertimePolicy", policyData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Bulk Upload / Biometric
export const bulkUploadAttendance = createAsyncThunk(
    "attendanceHr/bulkUploadAttendance",
    async (payload, { rejectWithValue }) => {
        try {
            const response = await api.post("/HrAttendance/bulk-upload", payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const biometricSync = createAsyncThunk(
    "attendanceHr/biometricSync",
    async (punchArray, { rejectWithValue }) => {
        try {
            const response = await api.post("/HrAttendance/biometric-sync", punchArray);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Summary & Register
export const fetchAttendanceSummary = createAsyncThunk(
    "attendanceHr/fetchAttendanceSummary",
    async ({ empId, month, year }, { rejectWithValue }) => {
        try {
            const response = await api.get(`/HrAttendance/summary/${empId}/${month}/${year}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchAttendanceRegister = createAsyncThunk(
    "attendanceHr/fetchAttendanceRegister",
    async (params, { rejectWithValue }) => {
        try {
            const response = await api.get("/HrAttendance/register", { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    shifts: [],
    overtimePolicies: [],
    bulkUploadResults: null,
    register: [],
    monthlySummary: null,
    loading: false,
    error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const attendanceHrSlice = createSlice({
    name: "attendanceHr",
    initialState,
    reducers: {
        clearAttendanceHrError: (state) => {
            state.error = null;
        },
        clearBulkUploadResults: (state) => {
            state.bulkUploadResults = null;
        },
    },
    extraReducers: (builder) => {
        // ── fetchShifts ──
        builder
            .addCase(fetchShifts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchShifts.fulfilled, (state, action) => {
                state.loading = false;
                state.shifts = action.payload.data ?? action.payload;
            })
            .addCase(fetchShifts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── createShift ──
        builder
            .addCase(createShift.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createShift.fulfilled, (state, action) => {
                state.loading = false;
                const shift = action.payload.data ?? action.payload;
                if (shift && shift._id) {
                    state.shifts.push(shift);
                }
            })
            .addCase(createShift.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── assignShift ──
        builder
            .addCase(assignShift.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(assignShift.fulfilled, (state, action) => {
                state.loading = false;
            })
            .addCase(assignShift.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchOvertimePolicies ──
        builder
            .addCase(fetchOvertimePolicies.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOvertimePolicies.fulfilled, (state, action) => {
                state.loading = false;
                state.overtimePolicies = action.payload.data ?? action.payload;
            })
            .addCase(fetchOvertimePolicies.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── createOvertimePolicy ──
        builder
            .addCase(createOvertimePolicy.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createOvertimePolicy.fulfilled, (state, action) => {
                state.loading = false;
                const policy = action.payload.data ?? action.payload;
                if (policy && policy._id) {
                    state.overtimePolicies.push(policy);
                }
            })
            .addCase(createOvertimePolicy.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── bulkUploadAttendance ──
        builder
            .addCase(bulkUploadAttendance.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.bulkUploadResults = null;
            })
            .addCase(bulkUploadAttendance.fulfilled, (state, action) => {
                state.loading = false;
                state.bulkUploadResults = action.payload.data ?? action.payload;
            })
            .addCase(bulkUploadAttendance.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── biometricSync ──
        builder
            .addCase(biometricSync.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(biometricSync.fulfilled, (state, action) => {
                state.loading = false;
            })
            .addCase(biometricSync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchAttendanceSummary ──
        builder
            .addCase(fetchAttendanceSummary.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAttendanceSummary.fulfilled, (state, action) => {
                state.loading = false;
                state.monthlySummary = action.payload.data ?? action.payload;
            })
            .addCase(fetchAttendanceSummary.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchAttendanceRegister ──
        builder
            .addCase(fetchAttendanceRegister.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAttendanceRegister.fulfilled, (state, action) => {
                state.loading = false;
                state.register = action.payload.data ?? action.payload;
            })
            .addCase(fetchAttendanceRegister.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearAttendanceHrError, clearBulkUploadResults } = attendanceHrSlice.actions;
export default attendanceHrSlice.reducer;
