import api from "./ApiInstance.jsx";

export const getAllWorkflows = async (params = {}) => {
    const response = await api.get("/HrApprovalWorkflow", { params });
    return response.data;
};

export const getWorkflowById = async (id) => {
    const response = await api.get(`/HrApprovalWorkflow/${id}`);
    return response.data;
};

export const createWorkflow = async (data) => {
    const response = await api.post("/HrApprovalWorkflow", data);
    return response.data;
};

export const updateWorkflow = async (id, data) => {
    const response = await api.put(`/HrApprovalWorkflow/${id}`, data);
    return response.data;
};

export const deleteWorkflow = async (id) => {
    const response = await api.delete(`/HrApprovalWorkflow/${id}`);
    return response.data;
};
