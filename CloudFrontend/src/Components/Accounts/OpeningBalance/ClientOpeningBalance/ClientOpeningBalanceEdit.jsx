import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppAsyncSelect from '../../../Global/AppAsyncSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, updateDataFunction } from '../../../../Api/CRUDFunctions';



const ClientOpeningBalanceEdit = () => {
    const navigate = useNavigate();
    const Client = useSelector((state) => state.Client.client)
    const editOpeningClient = useSelector((state) => state.ClientOpeningReducer.ClientOpeningReducer)
    const { id } = useParams();




    const [tableData, setTableData] = useState([]);




    const loadclients = async (inputValue) => {
        if (!inputValue) return [];

        const filtered = Client
            .filter((item) =>
                item.CutomerName.toLowerCase().includes(inputValue.toLowerCase()) || item.code.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50);

        return filtered.map((item) => ({
            label: `${item.mastercode} ${item.CutomerName}`,
            value: item._id
        }));
    }
    const startingClient = Client.slice(0, 50).map((item) => ({
        label: `${item.mastercode} ${item.CutomerName}`,
        value: item._id
    }));;

    const { register, reset, handleSubmit, formState: { errors } } = useForm();

    const addNewRow = () => {
        setTableData([...tableData, {
            id: Date.now(),
            Client: '',
            Debit: 0,
            Credit: 0,
        }]);
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
                        updatedRow.Debit = 0
                        updatedRow.Credit = 0
                    }
                }
                if (updatedRow.Client == "") {
                    updatedRow.Debit = 0
                    updatedRow.Credit = 0
                }


                if (field == "Client") {
                    updatedRow.Debit = 0
                    updatedRow.Credit = 0
                }
                if (field == "Debit") {
                    updatedRow.Debit = value
                    updatedRow.Credit = 0
                }
                if (field == "Credit") {
                    updatedRow.Credit = value
                    updatedRow.Debit = 0
                }

                return updatedRow;
            }
            return row;
        }));
    };
    const TotalDebit = tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
    const TotalCredit = tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);

    const onSubmit = async (data) => {
        data.ClientData = tableData
        data.Status = "false"
        //console.log(data)
        try {
            const res = await updateDataFunction(`/ClientOpeningBalance/updateOpening/${id}`, data)
            //console.log(res)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate("/ClientOpeningBalance")
            }, 2000)

        } catch (err) {
            //console.log(err)
            toast.error("Something went wrong")
        }




    }
    const getData = () => {
        try {
            const data = editOpeningClient.find((item) => item._id == id)
            setTableData(data.ClientData)
            reset({
                DateStart : data.DateStart,
                DateEnd : data.DateEnd
            })
        } catch (err) {

        }
    }
useEffect(()=>{
    getData()
},[])
    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Client Opening</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Year From </label>
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
                                <th className="border p-2">Debit</th>
                                <th className="border p-2">Credit</th>
                                <th className="border p-2">Action</th>

                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row) => (
                                <tr key={row.id} className="hover:pd-bg-muted">
                                    <td className="border p-2">
                                        <AppAsyncSelect
                                            onChange={(selectedOption) =>
                                                handleCellChange(row.id, 'Client', selectedOption || '')
                                            }
                                            loadOptions={loadclients}
                                            defaultOptions={startingClient}
                                            value={row.Client ? {
                                                value: `${row.Client} `,
                                                label: `${Client.find((c) => c._id === row.Client)?.mastercode} ${Client.find((c) => c._id === row.Client)?.CutomerName}`
                                            } : null}
                                            className="basic-single text-sm"
                                            classNamePrefix="pd-select"
                                            isSearchable
                                            placeholder="Select customer..."
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            value={row.Debit}
                                            onChange={(e) => handleCellChange(row.id, 'Debit', e.target.value)}
                                            className="w-full p-1 text-xs md:text-sm border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            value={row.Credit}
                                            onChange={(e) => handleCellChange(row.id, 'Credit', e.target.value)}
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
                        {tableData.length !== 0 && (
                            <tfoot>
                                <tr className="pd-table-footer">
                                    <td className="border p-2"></td>
                                    <td className="border p-2 hidden md:table-cell">{TotalDebit}</td>
                                    <td className="border p-2 hidden md:table-cell">{TotalCredit}</td>
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
                        Create Opening Balance
                    </button>
                </div>
            </form>
        </div>
    )
}

export default ClientOpeningBalanceEdit