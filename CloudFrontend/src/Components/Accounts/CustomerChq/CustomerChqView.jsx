import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';
import { updateDataFunction } from '../../../Api/CRUDFunctions';

const CustomerChqView = () => {
    const { id } = useParams();
    const [customer, setCustomer] = useState('');
    const [tableData, setTableData] = useState([]);
    const [formData, setFormData] = useState({});
    const [chqData , setChqData] = useState('')
   
    const Client = useSelector((state) => state.Client.client);
    const Invoice = useSelector((state) => state.SalesInvoice.SalesInvoice);
    const CustomerChq = useSelector((state) => state.customerChq.customerChq);

    useEffect(() => {
        const chq = CustomerChq.find((item) => item._id === id);
        setChqData(chq)
        if (chq) {
            setCustomer(chq.Customer);
            setTableData(chq.table || []);
            setFormData({
                ChqDate: chq.ChqDate,
                code1: chq.code
            });
        }
    }, [CustomerChq, id]);

    const totalAmount = tableData.reduce((sum, row) => sum + (parseInt(row.Amount) || 0), 0);

    const customerObj = Client.find((c) => c._id === customer);

    return (
        <div className="p-4">
            
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">
                Customer Cheque View
            </h1>

            <div className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm pd-text-body font-semibold mb-1">Cheque Received Date:</label>
                        <div className="pd-text-body">{formData.ChqDate || '-'}</div>
                    </div>
                    <div>
                        <label className="block text-sm pd-text-body font-semibold mb-1">Customer:</label>
                        <div className="pd-text-body">{customerObj?.CutomerName || '-'}</div>
                    </div>
                    <div>
                        <label className="block text-sm pd-text-body font-semibold mb-1">Code:</label>
                        <div className="pd-text-body">{formData.code1 || '-'}</div>
                    </div>
                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr className="pd-bg-muted">
                                <th className="border p-2">Cheque Number</th>
                                <th className="border p-2">Invoice Number</th>
                                <th className="border p-2">Amount</th>
                                <th className="border p-2">Realize Date</th>
                                <th className="border p-2">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row, index) => (
                                <tr key={index} className="hover:pd-bg-muted">
                                    <td className="border p-2">{row.chq || '-'}</td>
                                    <td className="border p-2">{row.Invoice || '-'}</td>
                                    <td className="border p-2">{row.Amount || 0}</td>
                                    <td className="border p-2">{row.RealizeDate || '-'}</td>
                                    <td className="border p-2">{row.Remarks || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                        {tableData.length > 0 && (
                            <tfoot>
                                <tr className="pd-table-footer">
                                    <td className="border p-2"></td>
                                    <td className="border p-2">Total</td>
                                    <td className="border p-2">{totalAmount}</td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CustomerChqView;
