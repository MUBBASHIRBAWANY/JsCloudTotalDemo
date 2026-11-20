import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../Api/ApiInstance.jsx";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const uploadDocument = createAsyncThunk(
    "documentVault/uploadDocument",
    async ({ empId, formData }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/HrDocument/${empId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchEmployeeDocuments = createAsyncThunk(
    "documentVault/fetchEmployeeDocuments",
    async ({ empId, type }, { rejectWithValue }) => {
        try {
            const params = type ? { type } : {};
            const response = await api.get(`/HrDocument/${empId}`, { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const replaceDocumentVersion = createAsyncThunk(
    "documentVault/replaceDocumentVersion",
    async ({ docId, formData }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/HrDocument/${docId}/replace`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchExpiryAlerts = createAsyncThunk(
    "documentVault/fetchExpiryAlerts",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/HrDocument/expiry-alerts");
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const exportDocumentReport = createAsyncThunk(
    "documentVault/exportDocumentReport",
    async (params, { rejectWithValue }) => {
        try {
            const response = await api.get("/HrDocument/export", { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    documents: [],
    expiryAlerts: [],
    loading: false,
    error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const documentVaultSlice = createSlice({
    name: "documentVault",
    initialState,
    reducers: {
        clearDocumentVaultError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // ── uploadDocument ──
        builder
            .addCase(uploadDocument.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(uploadDocument.fulfilled, (state, action) => {
                state.loading = false;
                const doc = action.payload.data ?? action.payload;
                if (doc && doc._id) {
                    state.documents.push(doc);
                }
            })
            .addCase(uploadDocument.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchEmployeeDocuments ──
        builder
            .addCase(fetchEmployeeDocuments.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchEmployeeDocuments.fulfilled, (state, action) => {
                state.loading = false;
                state.documents = action.payload.data ?? action.payload;
            })
            .addCase(fetchEmployeeDocuments.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── replaceDocumentVersion ──
        builder
            .addCase(replaceDocumentVersion.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(replaceDocumentVersion.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data ?? action.payload;
                if (updated && updated._id) {
                    const idx = state.documents.findIndex((d) => d._id === updated._id);
                    if (idx !== -1) {
                        state.documents[idx] = updated;
                    }
                }
            })
            .addCase(replaceDocumentVersion.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── fetchExpiryAlerts ──
        builder
            .addCase(fetchExpiryAlerts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchExpiryAlerts.fulfilled, (state, action) => {
                state.loading = false;
                state.expiryAlerts = action.payload.data ?? action.payload;
            })
            .addCase(fetchExpiryAlerts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ── exportDocumentReport ──
        builder
            .addCase(exportDocumentReport.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(exportDocumentReport.fulfilled, (state, action) => {
                state.loading = false;
                // Export data is handled by the component (e.g. trigger download)
            })
            .addCase(exportDocumentReport.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearDocumentVaultError } = documentVaultSlice.actions;
export default documentVaultSlice.reducer;
