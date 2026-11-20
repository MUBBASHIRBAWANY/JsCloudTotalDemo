import api from "./ApiInstance.jsx";

export const getEmployeeLedger = async (employeeId, params = {}) => {
    const response = await api.get(`/Ledger/employee/${employeeId}`, { params });
    return response.data;
};

export const getEBFLedger = async (employeeId) => {
    const response = await api.get(`/Ledger/employee/${employeeId}/ebf`);
    return response.data;
};

export const getLoanLedger = async (employeeId) => {
    const response = await api.get(`/Ledger/employee/${employeeId}/loan`);
    return response.data;
};

export const createLedgerEntry = async (data) => {
    const response = await api.post("/Ledger/entry", data);
    return response.data;
};

export const createReversal = async (id, data) => {
    const response = await api.post(`/Ledger/reversal/${id}`, data);
    return response.data;
};
