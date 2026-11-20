import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast, ToastContainer } from 'react-toastify'
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions'
import { useSelector } from 'react-redux'
import AppSelect from '../../Global/AppSelect.jsx'
import { useNavigate } from 'react-router-dom'



const ChqRepresent = () => {

    const [chqnum, setChqnum] = useState()
    const [tableData, settableData] = useState([])
    const Client = useSelector((state) => state.Client.client)
    const navigate = useNavigate()
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();
    const onSubmit = async (value) => {
        //console.log(value.Chqnum)
        try {
            const data = await getDataFundtion(`/CustomerChqRecived/getChq/${value.Chqnum}`)
            const res = data.data

            if (res.length === 0) {
                toast.error("No Data Found")
            }
            else {
                //console.log(res)
                const output = res.flatMap(entry =>
                    entry.grouped.flatMap(group =>
                        group.items.map(item => ({
                            id: entry._id,
                            Type: item.Type,
                            chq: item.chq,
                            customer: entry.Customer,
                            inv: item.Invoice,
                            RecivedDate: entry.ChqDate,
                            Amount: item.Amount,
                            RealizeDate: item.RealizeDate,
                            Status: item.staus || item.status
                        }))
                    )
                );
                const filterOutput = output.filter((item) => item.Status === "Bounce").filter((item) => item.chq == value.Chqnum)
                //console.log(filterOutput)
                settableData(filterOutput)
            }

        } catch (err) {

        }
    }

    const statusOption = [
        {
            value: "Represent",
            label: "Represent"
        },
        
    ]

    const handleCellChange = (id, field, value) => {

        settableData(tableData.map(row => {
            if (row.id === id) {

                const updatedRow = { ...row, [field]: value };
                const checking = tableData.find((item) => item.id == id)


                return updatedRow;
            }
            return row;
        }));
    };

    const updateStatus = async () => {
        console.log(tableData)

    try {
        // Group cheques
        const grouped = Object.values(
            tableData.reduce((acc, item) => {
                const chq = String(item.chq ?? "");

                if (!acc[chq]) {
                    acc[chq] = {
                        chq,
                        status: "Pending",
                        items: []
                    };
                }

                acc[chq].items.push(
                    {
                        Invoice: item.inv,
                        Amount: item.Amount,
                        Status : "Pending",
                        status : "Pending",
                        stats : "Pending",
                        RealizeDate : tableData[0].date,
                        Type : item.Type,
                        remarks2 : tableData[0].remarks2
                        
                    }
                )
                return acc;
            }, {})
        );

        // Invoice Array
        const totalInvoice = tableData.map((item) => ({
            invoice: item.inv,
            Amount: item.Amount,
            Type: "current",
        }));

        // Final Payload
        const payload = {
            ...tableData,
            invoiceArray: totalInvoice,
            Customer: tableData.length > 0 ? tableData[0].customer : "",
            table: tableData.map((item) => ({
                chq: item.chq,
                Invoice: item.inv,
                    Status : "Pending",
                        status : "Pending",
                        stats : "Pending",
                })),
            grouped,
            ChqDate : tableData.length > 0 ? tableData[0].date : "",
            status : "Pending",
        };

        console.log(payload);

        await createDataFunction("/CustomerChqRecived", payload);

        toast.success("Cheque Added Successfully");

        setTimeout(() => {
            navigate("/CustomerChqList");
        }, 2000);

    } catch (err) {
        console.error(err);

        if (err?.response?.data?.invalidInvoices?.length > 0) {
            toast.error(
                `Invoice ${err.response.data.invalidInvoices[0].invoice} ${err.response.data.invalidInvoices[0].reason}`
            );
        } else {
            toast.error("Failed to add Cheque");
        }

        setDisabled(false);
    }
    }
    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Customer Cheque Represent </h1>
            <div>
                <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Cheque Number </label>
                            <input
                                type="text"
                                {...register("Chqnum", { required: true })}
                                onChange={(e) => setChqnum(e.target.value)}
                                className="pd-input text-sm md:text-base"
                            />
                        </div>

                    </div>
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <button
                            type="submit"
                            className="pd-btn-save text-sm md:text-base"
                        >
                            Search Chq
                        </button>
                    </div>
                    <div className="overflow-x-auto mb-6">
                        <table className="w-full border-collapse text-sm md:text-base">
                            <thead>
                                <tr className="pd-bg-muted">
                                    <th className="border p-2 min-w-[200px]">Cheque Number</th>
                                    <th className="border p-2">Invoice Number</th>
                                    <th className="border p-2">Amount</th>
                                    <th className="border p-2">Realize Date</th>
                                    <th className="border p-2">Status</th>
                                    <th className="border p-2">Change Status</th>
                                    <th className="border p-2">Change Remarks 2</th>
                                    <th className="border p-2">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((row) => (
                                    <tr key={row.id} className="hover:pd-bg-muted">
                                        <td className="border px-2">
                                            {row.chq}
                                        </td>
                                        <td className="border px-2">
                                            {row.inv}
                                        </td>
                                        <td className="border px-2">
                                            {row.Amount}
                                        </td>
                                        <td className="border px-2">
                                            {row.RealizeDate}
                                        </td>

                                        <td className="border px-2">
                                            {row.Status}
                                        </td>
                                        {row.Status === "Pending" ?
                                            <td className="border">
                                                <AppSelect
                                                    onChange={(e) => handleCellChange(row.id, 'Status', e.value)}
                                                    className='px-2 py-1' isClearable={true} options={statusOption} />
                                            </td>
                                            :
                                            <td className="border p-2">

                                            </td>
                                        }

                                        <td className="border p-2">
                                            <input
                                                type="text"
                                                value={row.remarks2}
                                                onChange={(e) => handleCellChange(row.id, 'remarks2', e.target.value)}
                                                className="w-full p-3 text-xs md:text-sm border rounded"
                                            />
                                        </td>
                                        <td className="border p-2">
                                            <input
                                                type="date"
                                                value={row.date}
                                                onChange={(e) => handleCellChange(row.id, 'date', e.target.value)}
                                                className="w-full p-3 text-xs md:text-sm border rounded"
                                            />
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                            {tableData.length !== 0 && (
                                <tfoot>
                                    <tr className="pd-table-footer">
                                        <td className="border p-2"></td>
                                        <td className="border p-2"></td>
                                        <td className="border p-2 hidden md:table-cell"></td>
                                        <td className="border p-2"> </td>
                                        <td className="border p-2"></td>
                                        <td className="border p-2"></td>
                                        <td className="border p-2"></td>
                                        <td className="border p-2"></td>

                                    </tr>
                                </tfoot>

                            )}
                        </table>
                    </div>
                    <button
                        type="button"
                        onClick={() => updateStatus()}
                        className="pd-btn-save text-sm md:text-base"
                    >
                        Update chq Balance
                    </button>
                </form>
            </div>
        </div>

    )
}

export default ChqRepresent
