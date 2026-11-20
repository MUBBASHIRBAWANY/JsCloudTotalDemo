import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion } from '../../../Api/CRUDFunctions';

const SalaryAdvanceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);

    useEffect(() => {
        getDataFundtion(`SalaryAdvance/${id}`).then(res => setData(res.data)).catch(() => toast.error("Failed to load"));
    }, [id]);

    if (!data) return <div className="pd-card p-6">Loading...</div>;

    return (
        <div className="pd-card p-6 max-w-3xl">
            <ToastContainer />
            <div className="flex justify-between items-center mb-4">
                <h2 className="pd-section-title">Salary Advance {data.advanceNumber}</h2>
                <button className="pd-btn-outline" onClick={() => navigate('/SalaryAdvanceList')}>Back</button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div><span className="text-sm text-gray-500">Employee</span><p className="font-medium">{data.employeeId?.code} - {data.employeeId?.firstName} {data.employeeId?.lastName}</p></div>
                <div><span className="text-sm text-gray-500">Amount</span><p className="font-medium">Rs. {data.amount?.toLocaleString()}</p></div>
                <div><span className="text-sm text-gray-500">Outstanding</span><p className="font-medium text-red-600">Rs. {data.outstanding?.toLocaleString()}</p></div>
                <div><span className="text-sm text-gray-500">Status</span><p className="font-medium capitalize">{data.status?.replace(/_/g, ' ')}</p></div>
                <div><span className="text-sm text-gray-500">Payment Method</span><p className="font-medium capitalize">{data.paymentMethod}</p></div>
                <div><span className="text-sm text-gray-500">Voucher</span><p className="font-medium">{data.voucherNumber || '—'}</p></div>
            </div>

            {data.recoveries?.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-3">Recovery History</h3>
                    <table className="w-full text-sm">
                        <thead><tr className="border-b"><th className="text-left py-2">Month</th><th className="text-right py-2">Amount</th><th className="text-left py-2">Journal Voucher</th></tr></thead>
                        <tbody>
                            {data.recoveries.map((r, i) => (
                                <tr key={i} className="border-b">
                                    <td className="py-2">{r.month}/{r.year}</td>
                                    <td className="text-right py-2">Rs. {r.amount?.toLocaleString()}</td>
                                    <td className="py-2">{r.journalVoucherId?.VoucherNumber || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default SalaryAdvanceDetail;
