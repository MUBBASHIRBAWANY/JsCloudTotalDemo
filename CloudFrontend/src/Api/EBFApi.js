import api from "./ApiInstance.jsx";

export const getEBFBalance = async (employeeId) => {
    const response = await api.get(`/EBFBalance/employee/${employeeId}`);
    return response.data;
};

export const getEBFTransactions = async (employeeId) => {
    const response = await api.get(`/EBFBalance/employee/${employeeId}/transactions`);
    return response.data;
};

export const postEBFContribution = async (data) => {
    const response = await api.post("/EBFBalance/contribution", data);
    return response.data;
};

export const postBulkEBFContributions = async (data) => {
    const response = await api.post("/EBFBalance/contribution/bulk", data);
    return response.data;
};

export const getEBFReport = async (params) => {
    const response = await api.get("/EBFBalance/report", { params });
    return response.data;
};

// EBF Opening Balance APIs
export const getAllEBFOpening = async () => {
    const response = await api.get("/EBFOpeningBalance");
    return response.data;
};

export const createEBFOpening = async (data) => {
    const response = await api.post("/EBFOpeningBalance", data);
    return response.data;
};

export const updateEBFOpening = async (id, data) => {
    const response = await api.put(`/EBFOpeningBalance/updateEBFOpening/${id}`, data);
    return response.data;
};

export const deleteEBFOpening = async (id) => {
    const response = await api.delete(`/EBFOpeningBalance/deleteEBFOpening/${id}`);
    return response.data;
};
