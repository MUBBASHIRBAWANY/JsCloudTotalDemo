import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../Api/ApiInstance.jsx";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const initiateSeparation = createAsyncThunk(
    "separation/initiateSeparation",
    async (separationData, { rejectWithValue }) => {
        try {
            const response = await api.post("/HrSeparation", separationData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchSeparationById = createAsyncThunk(
    "separation/fetchSeparationById",
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.get(`/HrSeparation/${id}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchSeparationHistory = createAsyncThunk(
    "separation/fetchSeparationHistory",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/HrSeparation/history");
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateClearanceTask = createAsyncThunk(
    "separation/updateClearanceTask",
    async ({ id, taskData }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/HrSeparation/${id}/clearance/task`, taskData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchSettlementPreview = createAsyncThunk(
    "separation/fetchSettlementPreview",
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.get(`/HrSeparation/${id}/settlement`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const confirmSettlement = createAsyncThunk(
    "separation/confirmSettlement",
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/HrSeparation/${id}/settlement/confirm`, data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    separationRequests: [],
    selectedSeparation: null,
    clearanceTasks: [],
    settlementPreview: null,
    history: [],
    loading: false,
    error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const separationSlice = createSlice({
    name: "separation",
    initialState,
    reducers: {
        clearSeparationError: (state) => {
            state.error = null;
        },
        clearSettlementPreview: (state) => {
            state.settlementPreview = null;
        },
        clearSelectedSeparation: (state) => {
            state.selectedSeparation = null;
        },
    },
    extraReducers: (builder) => {
        // ── initiateSeparation ──
        builder
            .addCase(initiateSeparation.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(initiateSeparation.fulfilled, (state, action) => {
                state.loading = false;
                const record = action.payload.data ?? action.payload;
                if (record && record._id) {
                    state.separationRequests.push(record);
                }
            })
            .addCase(initiateSeparation.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchSeparationById ──
        builder
            .addCase(fetchSeparationById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSeparationById.fulfilled, (state, action) => {
                state.loading = false;
                const record = action.payload.data ?? action.payload;
                state.selectedSeparation = record;
                state.clearanceTasks = record?.clearanceChecklist?.tasks ?? [];
            })
            .addCase(fetchSeparationById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchSeparationHistory ──
        builder
            .addCase(fetchSeparationHistory.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSeparationHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.history = action.payload.data ?? action.payload;
            })
            .addCase(fetchSeparationHistory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── updateClearanceTask ──
        builder
            .addCase(updateClearanceTask.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateClearanceTask.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data ?? action.payload;
                if (updated && updated._id) {
                    state.selectedSeparation = updated;
                    state.clearanceTasks = updated?.clearanceChecklist?.tasks ?? [];
                }
            })
            .addCase(updateClearanceTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchSettlementPreview ──
        builder
            .addCase(fetchSettlementPreview.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSettlementPreview.fulfilled, (state, action) => {
                state.loading = false;
                state.settlementPreview = action.payload.data ?? action.payload;
            })
            .addCase(fetchSettlementPreview.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── confirmSettlement ──
        builder
            .addCase(confirmSettlement.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(confirmSettlement.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data ?? action.payload;
                if (updated && updated._id) {
                    state.selectedSeparation = updated;
                    state.settlementPreview = null;
                    // Sync back into separationRequests list
                    const idx = state.separationRequests.findIndex(
                        (r) => r._id === updated._id
                    );
                    if (idx !== -1) {
                        state.separationRequests[idx] = updated;
                    }
                }
            })
            .addCase(confirmSettlement.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {
    clearSeparationError,
    clearSettlementPreview,
    clearSelectedSeparation,
} = separationSlice.actions;
export default separationSlice.reducer;
