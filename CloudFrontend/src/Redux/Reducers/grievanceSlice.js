import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../Api/ApiInstance.jsx";

// ─── Async Thunks ────────────────────────────────────────────────────────────

// Grievances
export const submitGrievance = createAsyncThunk(
    "grievance/submitGrievance",
    async (grievanceData, { rejectWithValue }) => {
        try {
            const response = await api.post("/HrGrievance", grievanceData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchGrievances = createAsyncThunk(
    "grievance/fetchGrievances",
    async (params, { rejectWithValue }) => {
        try {
            const response = await api.get("/HrGrievance", { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const assignInvestigatingOfficer = createAsyncThunk(
    "grievance/assignInvestigatingOfficer",
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/HrGrievance/${id}/assign`, data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const appendInvestigationNote = createAsyncThunk(
    "grievance/appendInvestigationNote",
    async ({ id, noteData }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/HrGrievance/${id}/note`, noteData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const resolveGrievance = createAsyncThunk(
    "grievance/resolveGrievance",
    async ({ id, resolutionData }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/HrGrievance/${id}/resolve`, resolutionData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Disciplinary
export const createDisciplinaryAction = createAsyncThunk(
    "grievance/createDisciplinaryAction",
    async (actionData, { rejectWithValue }) => {
        try {
            const response = await api.post("/HrDisciplinary", actionData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchDisciplinaryHistory = createAsyncThunk(
    "grievance/fetchDisciplinaryHistory",
    async (empId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/HrDisciplinary/employee/${empId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    grievances: [],
    disciplinaryActions: [],
    loading: false,
    error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const grievanceSlice = createSlice({
    name: "grievance",
    initialState,
    reducers: {
        clearGrievanceError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // ── submitGrievance ──
        builder
            .addCase(submitGrievance.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(submitGrievance.fulfilled, (state, action) => {
                state.loading = false;
                const record = action.payload.data ?? action.payload;
                if (record && record._id) {
                    state.grievances.push(record);
                }
            })
            .addCase(submitGrievance.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchGrievances ──
        builder
            .addCase(fetchGrievances.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchGrievances.fulfilled, (state, action) => {
                state.loading = false;
                state.grievances = action.payload.data ?? action.payload;
            })
            .addCase(fetchGrievances.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── assignInvestigatingOfficer ──
        builder
            .addCase(assignInvestigatingOfficer.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(assignInvestigatingOfficer.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data ?? action.payload;
                if (updated && updated._id) {
                    const idx = state.grievances.findIndex((g) => g._id === updated._id);
                    if (idx !== -1) state.grievances[idx] = updated;
                }
            })
            .addCase(assignInvestigatingOfficer.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── appendInvestigationNote ──
        builder
            .addCase(appendInvestigationNote.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(appendInvestigationNote.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data ?? action.payload;
                if (updated && updated._id) {
                    const idx = state.grievances.findIndex((g) => g._id === updated._id);
                    if (idx !== -1) state.grievances[idx] = updated;
                }
            })
            .addCase(appendInvestigationNote.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── resolveGrievance ──
        builder
            .addCase(resolveGrievance.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(resolveGrievance.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data ?? action.payload;
                if (updated && updated._id) {
                    const idx = state.grievances.findIndex((g) => g._id === updated._id);
                    if (idx !== -1) state.grievances[idx] = updated;
                }
            })
            .addCase(resolveGrievance.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── createDisciplinaryAction ──
        builder
            .addCase(createDisciplinaryAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createDisciplinaryAction.fulfilled, (state, action) => {
                state.loading = false;
                const record = action.payload.data ?? action.payload;
                if (record && record._id) {
                    state.disciplinaryActions.push(record);
                }
            })
            .addCase(createDisciplinaryAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchDisciplinaryHistory ──
        builder
            .addCase(fetchDisciplinaryHistory.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDisciplinaryHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.disciplinaryActions = action.payload.data ?? action.payload;
            })
            .addCase(fetchDisciplinaryHistory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearGrievanceError } = grievanceSlice.actions;
export default grievanceSlice.reducer;
