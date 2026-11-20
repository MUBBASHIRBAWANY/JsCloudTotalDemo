import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDataFundtion } from '../../Api/CRUDFunctions';

export const fetchPayroll = createAsyncThunk('payroll/fetchPayroll', async ({ month, year, status }) => {
    const params = new URLSearchParams({ month, year });
    if (status && status !== 'all') params.append('status', status);
    const res = await getDataFundtion(`Payroll/?${params}`);
    return res.data;
});

export const fetchPayrollDashboard = createAsyncThunk('payroll/fetchDashboard', async ({ month, year }) => {
    const [statusRes, summaryRes] = await Promise.all([
        getDataFundtion(`Payroll/monthStatus?month=${month}&year=${year}`),
        getDataFundtion(`Payroll/summary?month=${month}&year=${year}`)
    ]);
    return { ...statusRes.data, ...summaryRes.data?.total };
});

const payrollSlice = createSlice({
    name: 'payroll',
    initialState: { records: [], dashboard: null, loading: false },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchPayroll.pending, state => { state.loading = true; })
            .addCase(fetchPayroll.fulfilled, (state, action) => { state.records = action.payload; state.loading = false; })
            .addCase(fetchPayroll.rejected, state => { state.loading = false; })
            .addCase(fetchPayrollDashboard.fulfilled, (state, action) => { state.dashboard = action.payload; });
    }
});

export default payrollSlice.reducer;
