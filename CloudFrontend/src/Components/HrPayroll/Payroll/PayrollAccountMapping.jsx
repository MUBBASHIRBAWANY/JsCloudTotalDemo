import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import Select from 'react-select';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';

const fieldLabels = {
    salaryExpense: 'Salary Expense Account',
    salaryPayable: 'Salary Payable Account',
    ebfEmployee: 'EBF (Employee) Account',
    ebfCompany: 'EBF (Company Contribution) Account',
    employeeLoan: 'Employee Loan Account',
    salaryAdvance: 'Salary Advance Account',
    ebfExpense: 'EBF Expense (Company) Account'
};

const PayrollAccountMapping = () => {
    const [accounts, setAccounts] = useState([]);
    const [mapping, setMapping] = useState({});

    useEffect(() => {
        getDataFundtion('ChartofAccounts/').then(res => setAccounts(res.data || []));
        getDataFundtion('PayrollAccountMapping/').then(res => {
            if (res.data) setMapping(res.data);
            
        });
    }, []);

    const accountOptions = accounts.map(a => ({
        value: a.AccountCode,
        label: `${a.AccountCode} - ${a.AccountName}`
    }));
    
    const handleChange = (field, selected) => {
        setMapping(prev => ({
            ...prev,
            [field]: { code: selected?.value || '', name: selected?.label?.split(' - ').slice(1).join(' - ') || '' }
        }));
    };

    const handleSave = async () => {
        try {
            await updateDataFunction('PayrollAccountMapping/', mapping);
            toast.success("Account mapping saved");
            navigate(0); // Refresh the page to reflect changes
        } catch { toast.error("Failed to save"); }
    };

    return (
        <div className="pd-card p-6 max-w-2xl">
            <ToastContainer />
            <h2 className="pd-section-title mb-4">Payroll Account Mapping</h2>
            <p className="text-sm text-gray-500 mb-6">Configure which Chart of Accounts to use when creating journal vouchers on payroll close.</p>

            <div className="space-y-4">
                {Object.entries(fieldLabels).map(([field, label]) => (
                    <div key={field}>
                        <label className="block text-sm font-medium mb-1">{label}</label>
                        <Select
                            options={accountOptions}
                            value={accountOptions.find(o => o.value === mapping[field]?.AccountCode)}
                            onChange={selected => handleChange(field, selected)}
                            isClearable
                            placeholder="Type to search..."
                            className="w-full"
                        />
                    </div>
                ))}
            </div>

            <div className="mt-6">
                <button className="pd-btn-save" onClick={handleSave}>Save Mapping</button>
            </div>
        </div>
    );
};

export default PayrollAccountMapping;
