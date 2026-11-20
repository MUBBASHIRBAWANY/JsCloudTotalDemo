import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../Api/ApiInstance.jsx";

// ─── Async Thunks ────────────────────────────────────────────────────────────

// Fetch leave applications for an employee
export const fetchLeaveApplications = createAsyncThunk(
    "leave/fetchLeaveApplications",
    async (empId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/HrLeave/employee/${empId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Submit a new leave application
export const createLeaveApplication = createAsyncThunk(
    "leave/createLeaveApplication",
    async (leaveData, { rejectWithValue }) => {
        try {
            const response = await api.post("/HrLeave", leaveData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Approve a leave application
export const approveLeaveApplication = createAsyncThunk(
    "leave/approveLeaveApplication",
    async ({ id, remark }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/HrLeave/${id}/approve`, { remark });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Reject a leave application
export const rejectLeaveApplication = createAsyncThunk(
    "leave/rejectLeaveApplication",
    async ({ id, remark }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/HrLeave/${id}/reject`, { remark });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Trigger leave encashment for an employee
export const encashLeave = createAsyncThunk(
    "leave/encashLeave",
    async (empId, { rejectWithValue }) => {
        try {
            const response = await api.post(`/HrLeave/encash/${empId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Manual leave balance adjustment
export const adjustLeaveBalance = createAsyncThunk(
    "leave/adjustLeaveBalance",
    async ({ empId, adjustmentData }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/HrLeave/adjust/${empId}`, adjustmentData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Fetch the leave calendar view
export const fetchLeaveCalendar = createAsyncThunk(
    "leave/fetchLeaveCalendar",
    async (params, { rejectWithValue }) => {
        try {
            const response = await api.get("/HrLeave/calendar", { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    leaveApplications: [],
    auditLog: [],
    calendar: [],
    loading: false,
    error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const leaveSlice = createSlice({
    name: "leave",
    initialState,
    reducers: {
        clearLeaveError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // ── fetchLeaveApplications ──
        builder
            .addCase(fetchLeaveApplications.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchLeaveApplications.fulfilled, (state, action) => {
                state.loading = false;
                state.leaveApplications = action.payload.data ?? action.payload;
            })
            .addCase(fetchLeaveApplications.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── createLeaveApplication ──
        builder
            .addCase(createLeaveApplication.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createLeaveApplication.fulfilled, (state, action) => {
                state.loading = false;
                const application = action.payload.data ?? action.payload;
                if (application && application._id) {
                    state.leaveApplications.push(application);
                }
            })
            .addCase(createLeaveApplication.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── approveLeaveApplication ──
        builder
            .addCase(approveLeaveApplication.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(approveLeaveApplication.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data ?? action.payload;
                if (updated && updated._id) {
                    const idx = state.leaveApplications.findIndex(
                        (a) => a._id === updated._id
                    );
                    if (idx !== -1) state.leaveApplications[idx] = updated;
                }
            })
            .addCase(approveLeaveApplication.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── rejectLeaveApplication ──
        builder
            .addCase(rejectLeaveApplication.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(rejectLeaveApplication.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data ?? action.payload;
                if (updated && updated._id) {
                    const idx = state.leaveApplications.findIndex(
                        (a) => a._id === updated._id
                    );
                    if (idx !== -1) state.leaveApplications[idx] = updated;
                }
            })
            .addCase(rejectLeaveApplication.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── encashLeave ──
        builder
            .addCase(encashLeave.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(encashLeave.fulfilled, (state, action) => {
                state.loading = false;
                // Audit log entry returned from encashment
                const auditEntry = action.payload.data ?? action.payload;
                if (auditEntry && auditEntry._id) {
                    state.auditLog.push(auditEntry);
                }
            })
            .addCase(encashLeave.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── adjustLeaveBalance ──
        builder
            .addCase(adjustLeaveBalance.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(adjustLeaveBalance.fulfilled, (state, action) => {
                state.loading = false;
                // Manual adjustment creates an audit log entry
                const auditEntry = action.payload.data ?? action.payload;
                if (auditEntry && auditEntry._id) {
                    state.auditLog.push(auditEntry);
                }
            })
            .addCase(adjustLeaveBalance.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchLeaveCalendar ──
        builder
            .addCase(fetchLeaveCalendar.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchLeaveCalendar.fulfilled, (state, action) => {
                state.loading = false;
                state.calendar = action.payload.data ?? action.payload;
            })
            .addCase(fetchLeaveCalendar.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearLeaveError } = leaveSlice.actions;
export default leaveSlice.reducer;
