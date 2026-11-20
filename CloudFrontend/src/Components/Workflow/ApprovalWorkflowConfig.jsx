import React, { useState, useEffect } from "react";
import { getAllWorkflows, createWorkflow, updateWorkflow } from "../../Api/ApprovalWorkflowApi";

const availableRoles = [
    { value: "hr", label: "HR" },
    { value: "finance", label: "Finance" },
    { value: "ceo", label: "CEO" },
    { value: "boss", label: "Boss" },
    { value: "cashier", label: "Cashier" }
];

const ApprovalWorkflowConfig = () => {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        module: "loan_advance",
        steps: []
    });

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const fetchWorkflows = async () => {
        try {
            const response = await getAllWorkflows({ module: "loan_advance" });
            if (response.status) {
                setWorkflows(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch workflows:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectWorkflow = (workflow) => {
        setSelectedWorkflow(workflow);
        setFormData({
            name: workflow.name,
            module: workflow.module,
            steps: [...workflow.steps]
        });
        setIsEditing(true);
    };

    const handleAddStep = () => {
        const newStep = {
            stepNumber: formData.steps.length + 1,
            name: "",
            role: "",
            permissions: {
                canApprove: true,
                canReject: true,
                canEditAmount: false,
                canEditRemarks: true
            }
        };
        setFormData((prev) => ({
            ...prev,
            steps: [...prev.steps, newStep]
        }));
    };

    const handleRemoveStep = (index) => {
        setFormData((prev) => ({
            ...prev,
            steps: prev.steps.filter((_, i) => i !== index).map((step, i) => ({
                ...step,
                stepNumber: i + 1
            }))
        }));
    };

    const handleStepChange = (index, field, value) => {
        setFormData((prev) => {
            const newSteps = [...prev.steps];
            if (field.startsWith("permissions.")) {
                const permField = field.split(".")[1];
                newSteps[index].permissions[permField] = value;
            } else {
                newSteps[index][field] = value;
            }
            return { ...prev, steps: newSteps };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedWorkflow) {
                await updateWorkflow(selectedWorkflow._id, formData);
            } else {
                await createWorkflow(formData);
            }
            fetchWorkflows();
            setIsEditing(false);
            setSelectedWorkflow(null);
            setFormData({ name: "", module: "loan_advance", steps: [] });
        } catch (error) {
            console.error("Failed to save workflow:", error);
            alert("Failed to save workflow");
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Workflow Configuration</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">Workflows</h2>
                    {loading ? (
                        <div className="text-center py-4">Loading...</div>
                    ) : (
                        <div className="space-y-2">
                            {workflows.map((workflow) => (
                                <button
                                    key={workflow._id}
                                    onClick={() => handleSelectWorkflow(workflow)}
                                    className={`w-full text-left p-3 rounded-md border ${
                                        selectedWorkflow?._id === workflow._id
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                    <p className="font-medium">{workflow.name}</p>
                                    <p className="text-sm text-gray-500">{workflow.steps.length} steps</p>
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    setSelectedWorkflow(null);
                                    setFormData({ name: "", module: "loan_advance", steps: [] });
                                    setIsEditing(true);
                                }}
                                className="w-full p-3 border border-dashed border-gray-300 rounded-md text-gray-500 hover:bg-gray-50"
                            >
                                + Create New Workflow
                            </button>
                        </div>
                    )}
                </div>

                {isEditing && (
                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4">
                            {selectedWorkflow ? "Edit Workflow" : "Create Workflow"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Workflow Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                    required
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Loan & Advance Approval"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Approval Steps
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddStep}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        + Add Step
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.steps.map((step, index) => (
                                        <div key={index} className="border border-gray-200 rounded-md p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-sm font-medium text-gray-500">
                                                    Step {step.stepNumber}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveStep(index)}
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">
                                                        Step Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={step.name}
                                                        onChange={(e) => handleStepChange(index, "name", e.target.value)}
                                                        required
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="e.g., HR Approval"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">
                                                        Role
                                                    </label>
                                                    <select
                                                        value={step.role}
                                                        onChange={(e) => handleStepChange(index, "role", e.target.value)}
                                                        required
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="">Select Role</option>
                                                        {availableRoles.map((role) => (
                                                            <option key={role.value} value={role.value}>
                                                                {role.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex space-x-4">
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={step.permissions.canApprove}
                                                        onChange={(e) =>
                                                            handleStepChange(index, "permissions.canApprove", e.target.checked)
                                                        }
                                                        className="mr-2"
                                                    />
                                                    <span className="text-sm">Can Approve</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={step.permissions.canReject}
                                                        onChange={(e) =>
                                                            handleStepChange(index, "permissions.canReject", e.target.checked)
                                                        }
                                                        className="mr-2"
                                                    />
                                                    <span className="text-sm">Can Reject</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={step.permissions.canEditAmount}
                                                        onChange={(e) =>
                                                            handleStepChange(index, "permissions.canEditAmount", e.target.checked)
                                                        }
                                                        className="mr-2"
                                                    />
                                                    <span className="text-sm">Can Edit Amount</span>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setSelectedWorkflow(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    {selectedWorkflow ? "Update Workflow" : "Create Workflow"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApprovalWorkflowConfig;
