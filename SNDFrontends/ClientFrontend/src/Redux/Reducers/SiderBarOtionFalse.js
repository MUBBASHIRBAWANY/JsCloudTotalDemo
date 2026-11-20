import { createSlice } from "@reduxjs/toolkit";


const initialState = {
    transtionOpen : false,
    Setup : false,
    Reports : false,
    openProductSetup : false,
    userSetup : false,
    clinetSetup : false,
    openingBalance : false,
    AccountsSetupopen : false,
    primaryTransaction : false,
    secondaryTransaction : false,
    recoveryTransaction : false
};


const sidebarOptions = createSlice({
    name: "sidebarOptions",
    initialState,
    reducers: {
        toggleTranstion : (state) => {
            state.transtionOpen = false
        },
        Transtionopen: (state) => {
            state.transtionOpen = true
        },
        toggleAccountsSetup : (state) => {
            state.AccountsSetupopen = false
        },
        AccountsSetupopen: (state) => {
            state.AccountsSetupopen = true
        },
        toggleSetup : (state) => {
            state.Setup = false
        },
        SetupOpen: (state) => {
            state.Setup = true
        },
        toggleReports : (state) => {
            state.Reports = false
        },
        ReportsOpen: (state) => {
            state.Reports = true
        },
        ProductSetup : (state) =>{
            state.openProductSetup = true

        },
        toggleProductSetup : (state) => {
            state.openProductSetup = false
        },
        UserSetup : (state) =>{
            state.userSetup = true

        },
        toggleUserSetup : (state) => {
            state.userSetup = false
        },
        ClinetSetup : (state) =>{
            state.clinetSetup = true

        },
        toggleClinetSetup : (state) => {
            state.clinetSetup = false
        },
        OpeningBalanceOp : (state) => {
            state.openingBalance = true
        },
        toggleOpeningBalance : (state) => {
            state.openingBalance = false
        },
        PrimaryTransaction : (state) => {
            state.primaryTransaction = true
        },
        togglePrimaryTransaction : (state) => {
            state.primaryTransaction = false
        },
        SecondaryTransaction : (state) => {
            state.secondaryTransaction = true
        },
        toggleSecondaryTransaction : (state) => {
            state.secondaryTransaction = false
        },
        RecoveryTransaction : (state) => {
            state.recoveryTransaction = true
        },
        toggleRecoveryTransaction : (state) => {
            state.recoveryTransaction = false
        },
    }
 });


 export const { toggleTranstion, Transtionopen, toggleSetup, SetupOpen,
                toggleReports, ReportsOpen, ProductSetup , toggleProductSetup,
                UserSetup, toggleUserSetup, ClinetSetup, toggleClinetSetup,
                OpeningBalanceOp , toggleOpeningBalance, toggleAccountsSetup, AccountsSetupopen,
                PrimaryTransaction, togglePrimaryTransaction,
                SecondaryTransaction, toggleSecondaryTransaction,
                RecoveryTransaction, toggleRecoveryTransaction  } = sidebarOptions.actions;
 export default sidebarOptions.reducer;