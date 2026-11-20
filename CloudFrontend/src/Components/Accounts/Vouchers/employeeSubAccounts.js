import { useMemo } from "react";
import { useSelector } from "react-redux";

export const EMPLOYEE_SUB_ACCOUNT_KINDS = [
    { field: "EBF", endpoint: "/EmployeeEBFAccount", adminField: "ebf" },
    { field: "Loan", endpoint: "/EmployeeLoanAccount", adminField: "loan" },
    { field: "Advance", endpoint: "/EmployeeAdvanceAccount", adminField: "advance" },
    { field: "BadDebt", endpoint: "/EmployeeBadDebtAccount", adminField: "badDebt" },
];

const EMPTY_GROUPS = { EBF: [], Loan: [], Advance: [], BadDebt: [] };

export const listEmployeeSubAccounts = (groups = EMPTY_GROUPS) => {
    const list = [];
    EMPLOYEE_SUB_ACCOUNT_KINDS.forEach((kind) => {
        (groups?.[kind.field] || []).forEach((account) => {
            if (!account?._id) return;
            list.push({
                _id: String(account._id),
                name: account.name || kind.field,
                parentAccount: account.account ? String(account.account) : "",
                field: kind.field,
                adminField: kind.adminField,
            });
        });
    });
    return list;
};

export const useEmployeeSubAccounts = () => {
    const groups = useSelector((state) => state.EmployeeSubAccountReducer?.groups || EMPTY_GROUPS);
    return useMemo(() => listEmployeeSubAccounts(groups), [groups]);
};

export const accountPickId = (value) => {
    if (!value) return "";
    if (typeof value === "object") return value.value || value._id || "";
    return value;
};

export const employeeLineId = (row) => {
    if (!row) return "";
    return row.EBF || row.Loan || row.Advance || row.BadDebt || "";
};

export const findEmployeeSubAccount = (accounts, id) => {
    if (!id) return null;
    const key = String(id);
    return (accounts || []).find((item) => item._id === key) || null;
};

const parentAccountId = (item, admin) => {
    if (item.parentAccount) return item.parentAccount;
    if (!admin) return "";
    if (item.field === "BadDebt") return admin.badDebt || admin.bedebt || "";
    return admin[item.adminField] || "";
};

export const employeeAccountOption = (accounts, id) => {
    const item = findEmployeeSubAccount(accounts, id);
    if (!item) return null;
    return {
        label: item.name,
        value: item._id,
        code: item.field,
        employeeField: item.field,
    };
};

export const searchEmployeeAccountOptions = (accounts, inputValue) => {
    const search = String(inputValue || "").trim().toLowerCase();
    if (!search) return [];
    return (accounts || [])
        .filter((item) => item.name.toLowerCase().includes(search) || item.field.toLowerCase().includes(search))
        .slice(0, 50)
        .map((item) => ({
            label: item.name,
            value: item._id,
            code: item.field,
            employeeField: item.field,
        }));
};

export const withEmployeeAccountOptions = (options, accounts, inputValue) => {
    const extra = searchEmployeeAccountOptions(accounts, inputValue);
    if (!extra.length) return options;
    const seen = new Set(extra.map((item) => String(item.value)));
    const rest = (options || []).filter((item) => !seen.has(String(item.value)));
    return extra.concat(rest).slice(0, 50);
};

export const clearEmployeeSubAccount = (row) => {
    if (!row?.EBF && !row?.Loan && !row?.Advance && !row?.BadDebt) return row;
    return { ...row, EBF: "", Loan: "", Advance: "", BadDebt: "" };
};

export const applyEmployeeSubAccount = (row, item, admin) => ({
    ...row,
    Account: parentAccountId(item, admin),
    Client: "",
    Transporter: "",
    ClientLine: "",
    ClientRef2: "",
    vendor: "",
    EBF: item.field === "EBF" ? item._id : "",
    Loan: item.field === "Loan" ? item._id : "",
    Advance: item.field === "Advance" ? item._id : "",
    BadDebt: item.field === "BadDebt" ? item._id : "",
});

export const takeEmployeeVoucherLine = (row, value, admin, accounts) => {
    const item = findEmployeeSubAccount(accounts, accountPickId(value));
    if (!item) return { handled: false, row };
    const next = applyEmployeeSubAccount(row, item, admin);
    if (!next.Account) {
        return {
            handled: true,
            error: `${item.name} ka control account Administrative mein set nahi hai`,
            row,
        };
    }
    return { handled: true, row: next };
};

export const employeeLineLabel = (accounts, row) => findEmployeeSubAccount(accounts, employeeLineId(row))?.name || "";
