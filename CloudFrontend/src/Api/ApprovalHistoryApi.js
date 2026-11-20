import api from "./ApiInstance.jsx";

export const getHistoryByLoan = async (loanId) => {
    const response = await api.get(`/ApprovalHistory/loan/${loanId}`);
    return response.data;
};

export const getHistoryByEmployee = async (employeeId) => {
    const response = await api.get(`/ApprovalHistory/employee/${employeeId}`);
    return response.data;
};
