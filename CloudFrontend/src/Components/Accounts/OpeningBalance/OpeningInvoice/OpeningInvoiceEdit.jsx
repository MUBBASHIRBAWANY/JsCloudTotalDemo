import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppAsyncSelect from '../../../Global/AppAsyncSelect.jsx'
import debounce from 'lodash.debounce';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, updateDataFunction } from '../../../../Api/CRUDFunctions';
import { update } from 'list';

const InvoiceOpeningEdit = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const Client = useSelector((state) => state.Client.client);
    const editOpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);

    const [tableData, setTableData] = useState([]);

    const { reset, register, handleSubmit, formState: { errors } } = useForm();

    const clientMap = useMemo(() => {
        const map = {};
        Client.forEach(c => map[c._id] = c);
        return map;
    }, [Client]);

    const loadClients = useMemo(() =>
        debounce((inputValue, callback) => {
            if (!inputValue) return callback([]);
            const filtered = Client.filter(item =>
                item.CutomerName.toLowerCase().includes(inputValue.toLowerCase()) ||
                item.code.toLowerCase().includes(inputValue.toLowerCase())
            ).slice(0, 20);

            callback(filtered.map(item => ({
                label: `${item.mastercode} ${item.CutomerName}`,
                value: item._id
            })));
        }, 300)
        , [Client]);

    const startingClient = useMemo(() => Client.slice(0, 20).map(item => ({
        label: `${item.mastercode} ${item.CutomerName}`,
        value: item._id
    })), [Client]);

    const addNewRow = () => {
        setTableData(prev => [
            ...prev,
            { id: Date.now(), Client: '', Amount: '', Invoice: "" }
        ]);
    };

    const removeRow = (id) => {
        setTableData(tableData.filter(row => row.id !== id));
    };

    const handleCellChange = (id, field, value) => {
        setTableData(tableData.map(row => {
            if (row.id === id) {

                const updatedRow = { ...row, [field]: value };
                const checking = tableData.find((item) => item.id == id)
                if (field == "Client") {
                    updatedRow.Client = value.value
                    if (checking.Client != value) {
                        updatedRow.Amount = "",
                            updatedRow.Invoice = ""
                    }
                }
                if (updatedRow.Client == "") {
                    updatedRow.Amount = "",
                        updatedRow.Invoice = ""
                }


                if (field == "Client") {
                    updatedRow.Amount = "",
                        updatedRow.Invoice = ""
                }
                if (field == "Amount") {
                    updatedRow.Amount = value
                    updatedRow.RemaingAmount = value
                    updatedRow.RecivedAmount = 0
                }
                if (field == "Invoice") {
                    updatedRow.Invoice = value

                }
                updatedRow.status = "Open"
                return updatedRow;
            }
            return row;
        }));
    };

    useEffect(() => {
        if (!editOpeningInvoices?.length) return;
        const Data = editOpeningInvoices.find(item => item._id === id);
        if (Data) {
            reset({
                DateStart: Data.DateStart,
                DateEnd: Data.DateEnd
            });
            setTableData(Data.InvoiceData || []);
        }
    }, [editOpeningInvoices, id, reset]);

    const TotalDebit = useMemo(() =>
        tableData.reduce((sum, row) => sum + (parseFloat(row.Amount) || 0), 0),
        [tableData]);

    const onSubmit = async (formData) => {
        formData.InvoiceData = tableData;
        //console.log(formData)
        try {
            const res = await updateDataFunction(`/OpeningInvoice/updateOpening/${id}`, formData);
            toast.success("Data Updated");
            setTimeout(() => navigate("/OpeningInvoiceList"), 2000);
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong");
        }
    };

    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Invoice Opening</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Year From</label>
                        <input
                            type="date"

                            {...register("DateStart", { required: true })}
                            className="pd-input text-sm md:text-base"
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Year To</label>
                        <input
                            type="date"
                            {...register("DateEnd", { required: true })}
                            className="pd-input text-sm md:text-base"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr className="pd-bg-muted">
                                <th className="border p-2 min-w-[200px]">Client</th>
                                <th className="border p-2">Invoice</th>
                                <th className="border p-2">Amount</th>
                                <th className="border p-2">Date</th>
                                <th className="border p-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row) => (
                                <tr key={row.id} className="hover:pd-bg-muted">
                                    <td className="border p-2">
                                        <AppAsyncSelect
                                            onChange={(selectedOption) =>
                                                handleCellChange(row.id, 'Client', selectedOption)
                                            }
                                            loadOptions={loadClients}
                                            defaultOptions={startingClient}
                                            value={row.Client ? {
                                                value: row.Client,
                                                label: `${clientMap[row.Client]?.mastercode} ${clientMap[row.Client]?.CutomerName}`
                                            } : null}
                                            className="basic-single text-sm"
                                            classNamePrefix="pd-select"
                                            isSearchable
                                            placeholder="Select customer..."
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="text"
                                            value={row.Invoice}
                                            onChange={(e) => handleCellChange(row.id, 'Invoice', e.target.value)}
                                            className="w-full p-1 text-xs md:text-sm border rounded"
                                            style={{ height: "30px" }}
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            value={row.Amount}
                                            onChange={(e) => handleCellChange(row.id, 'Amount', e.target.value)}
                                            className="w-full p-1 text-xs md:text-sm border rounded"
                                            style={{ height: "30px" }}
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="date"
                                            value={row.date}
                                            style={{ height: "30px" }}
                                            onChange={(e) => handleCellChange(row.id, 'date', e.target.value)}
                                            className="w-full p-1 text-xs md:text-sm border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            className="pd-btn-icon-danger text-xs md:text-sm"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {tableData.length > 0 && (
                            <tfoot>
                                <tr className="pd-table-footer">
                                    <td className="border p-2">Total</td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2">{TotalDebit}</td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <button
                        type="button"
                        onClick={addNewRow}
                        className="pd-btn-success px-4 py-2 text-sm md:text-base"
                    >
                        Add Row
                    </button>
                    <button
                        type="submit"
                        className="pd-btn-save text-sm md:text-base"
                    >
                        Edit Opening Invoice
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InvoiceOpeningEdit;
