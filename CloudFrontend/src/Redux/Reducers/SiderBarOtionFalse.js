import { createSlice } from "@reduxjs/toolkit";


const initialState = {
    transtionOpen: false,
    Setup: false,
    Distrbutor : false,
    Reports: false,
    openProductSetup: false,
    userSetup: false,
    clinetSetup: false,
    DistributorCust : false,
    openingBalance: false,
    AccountsSetupopen: false,
    Administravive: false,
    HrPayroll: false,
    HrmsAdvanced: false,
    hrSetup: false,
    hrAttendance: false,
    hrLeave: false,
    hrPayrollGroup: false,
    hrReports: false,
    hrEmployees: false,
};


const sidebarOptions = createSlice({
    name: "sidebarOptions",
    initialState,
    reducers: {
        toggleTranstion: (state) => {
            state.transtionOpen = false
        },
        Transtionopen: (state) => {
            state.transtionOpen = true
        },
        toggleAccountsSetup: (state) => {
            state.AccountsSetupopen = false
        },
        AccountsSetupopen: (state) => {
            state.AccountsSetupopen = true
        },
        toggleSetup: (state) => {
            state.Setup = false
        },
        
        SetupOpen: (state) => {
            state.Setup = true
        },

        toggleDistributor: (state) => {
            state.Distrbutor = false
        },

        
        DistributorOpen: (state) => {
            state.Distrbutor = true
        },
        toggleReports: (state) => {
            state.Reports = false
        },
        ReportsOpen: (state) => {
            state.Reports = true
        },
        ProductSetup: (state) => {
            state.openProductSetup = true

        },
        toggleProductSetup: (state) => {
            state.openProductSetup = false
        },
        UserSetup: (state) => {
            state.userSetup = true

        },
        toggleUserSetup: (state) => {
            state.userSetup = false
        },
        ClinetSetup: (state) => {
            state.clinetSetup = true

        },
        toggleClinetSetup: (state) => {
            state.clinetSetup = false
        },
        OpeningBalanceOp: (state) => {
            state.openingBalance = true
        },
        toggleOpeningBalance: (state) => {
            state.openingBalance = false
        },
        OpenDistributorCust: (state) => {
            state.DistributorCust = true
        },
        toggleDistributorCust: (state) => {
            state.DistributorCust = false
        },
        OpenAdministravive: (state) => {
            state.Administravive = true
        },
        toggleAdministravive: (state) => {
            state.Administravive = false
        },
        OpenHrPayroll: (state) => {
            state.HrPayroll = true
        },
        toggleHrPayroll: (state) => {
            state.HrPayroll = false
        },
        OpenHrmsAdvanced: (state) => {
            state.HrmsAdvanced = true
        },
        toggleHrmsAdvanced: (state) => {
            state.HrmsAdvanced = false
        },
        OpenHrSetup: (state) => { state.hrSetup = true },
        toggleHrSetup: (state) => { state.hrSetup = false },
        OpenHrAttendance: (state) => { state.hrAttendance = true },
        toggleHrAttendance: (state) => { state.hrAttendance = false },
        OpenHrLeave: (state) => { state.hrLeave = true },
        toggleHrLeave: (state) => { state.hrLeave = false },
        OpenHrPayrollGroup: (state) => { state.hrPayrollGroup = true },
        toggleHrPayrollGroup: (state) => { state.hrPayrollGroup = false },
        OpenHrReports: (state) => { state.hrReports = true },
        toggleHrReports: (state) => { state.hrReports = false },
        OpenHrEmployees: (state) => { state.hrEmployees = true },
        toggleHrEmployees: (state) => { state.hrEmployees = false },
    }
});


export const { toggleTranstion, Transtionopen, toggleSetup, SetupOpen,toggleDistributor,DistributorOpen,
    toggleReports, ReportsOpen, ProductSetup, toggleProductSetup,
    UserSetup, toggleUserSetup, ClinetSetup, toggleClinetSetup,
    OpeningBalanceOp, toggleOpeningBalance, toggleAccountsSetup, AccountsSetupopen, OpenAdministravive, toggleAdministravive,
    OpenDistributorCust ,toggleDistributorCust,
    OpenHrPayroll, toggleHrPayroll,
    OpenHrmsAdvanced, toggleHrmsAdvanced,
    OpenHrSetup, toggleHrSetup,
    OpenHrAttendance, toggleHrAttendance,
    OpenHrLeave, toggleHrLeave,
    OpenHrPayrollGroup, toggleHrPayrollGroup,
    OpenHrReports, toggleHrReports,
    OpenHrEmployees, toggleHrEmployees } = sidebarOptions.actions;
export default sidebarOptions.reducer;