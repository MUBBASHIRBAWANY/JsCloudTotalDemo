import api from "./ApiInstance.jsx";

// Loan CRUD
export const createLoan = async (data) => {
    const response = await api.post("/StaffLoan", data);
    return response.data;
};

export const getAllLoans = async (params = {}) => {
    const response = await api.get("/StaffLoan", { params });
    return response.data;
};

export const getLoanById = async (id) => {
    const response = await api.get(`/StaffLoan/${id}`);
    return response.data;
};

// Workflow actions
export const approveLoan = async (id, data) => {
    const response = await api.put(`/StaffLoan/${id}/approve`, data);
    return response.data;
};

export const rejectLoan = async (id, data) => {
    const response = await api.put(`/StaffLoan/${id}/reject`, data);
    return response.data;
};

export const cancelLoan = async (id, data) => {
    const response = await api.put(`/StaffLoan/${id}/cancel`, data);
    return response.data;
};

// Pending approvals
export const getPendingApprovals = async () => {
    const response = await api.get("/StaffLoan/pending");
    return response.data;
};

export const getCashierPendingLoans = async () => {
    const response = await api.get("/StaffLoan/cashier/pending");
    return response.data;
};

// EBF balance
export const getEBFBalance = async (employeeId) => {
    const response = await api.get(`/StaffLoan/employee/${employeeId}/ebf`);
    return response.data;
};

// Payment
export const processPayment = async (id, data) => {
    const response = await api.post(`/StaffLoan/${id}/payment`, data);
    return response.data;
};
