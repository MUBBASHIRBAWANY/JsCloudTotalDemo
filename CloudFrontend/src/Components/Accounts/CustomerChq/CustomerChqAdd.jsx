import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const CustomerChqAdd = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();
    const [customer, setCustomer] = useState('')
    const navigate = useNavigate()
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const filteredAccount = Account.filter((item) => item.AccountCode.length > 5)
    const Client = useSelector((state) => state.Client.client)
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const Invoice = useSelector((state) => state.SalesInvoice.SalesInvoice)
    const editOpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
    //console.log(editOpeningInvoices[0].InvoiceData)
    const [tableData, setTableData] = useState([])
    const [disabled, setDisabled] = useState(false)



    const onSubmit = async (data) => {
        // Bank name har row mein required hai
        const missingBankIndex = tableData.findIndex((row) => !String(row.Bank ?? "").trim())
        if (missingBankIndex !== -1) {
            return toast.error(`Row ${missingBankIndex + 1}: Bank name is required`)
        }
        setDisabled(true)
        const grouped = Object.values(
            tableData.reduce((acc, item) => {
                const chq = String(item.chq ?? ""); // ALWAYS string

                if (!acc[chq]) {
                    acc[chq] = {
                        chq,                 // already a string
                        status: "Pending",
                        items: []
                    };
                }

                acc[chq].items.push(item);
                return acc;
            }, {})
        );

        const totalInvoice = tableData.filter((item) => item.Type !== "Unrealized" && item.Invoice !== "UnRealized").map((item) => ({
            invoice: item.Invoice,
            Amount: item.Amount,
            Type: item.Type
        }))
        data.invoiceArray = totalInvoice
        data.Customer = customer
        data.table = tableData
        data.grouped = grouped
        //console.log(data)
        try {
            //console.log(data)
            await createDataFunction("/CustomerChqRecived", data)
            toast.success("Cheque Added Successfully")
            setTimeout(() => {
                navigate('/CustomerChqList')
            }, 2000);
        } catch (err) {
            //console.log(err)
            setDisabled(false)
            const invalid = err.response?.data?.invalidInvoices
            if (invalid && invalid.length > 0) {
                return toast.error(`Invoice ${invalid[0].invoice} ${invalid[0].reason} `)
            }
            toast.error("Failed to add Cheque Book")
        }
    }
    const addNewRow = () => {
        if (customer == "") {
            return toast.error("First select customer")
        }
        setTableData([...tableData, {
            id: Date.now(),
            Amount: "",
            Bank: ""
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
                updatedRow.staus = "Pending"
                if (field == "Invoice") {
                    //console.log(value)
                    if (value == "UnRealized") {
                        // user khud amount dalega
                        updatedRow.Amount = ""
                        updatedRow.RealizeDate = ""
                        updatedRow.Type = "Unrealized"
                    }
                    else {
                        const findINv = AllInvoice.find((val) => val.SalesInvoice == value || val.Invoice == value)
                        if (findINv) {
                            if (checking.Invoice != value) {
                                updatedRow.Amount = findINv.RemaingAmount || findINv.RemainingAmount || 0
                                updatedRow.RealizeDate = ""
                                updatedRow.Type = findINv.Invoice !== undefined ? "Opening" : "Current"
                            }
                        }
                    }
                }
                if (updatedRow.Invoice == "") {
                    updatedRow.Amount = 0
                    updatedRow.RealizeDate = ""
                }

                return updatedRow;
            }
            return row;
        }));
    };

    const vendorIdSet = new Set(loginVendor.Vendor);

    const AllClient = Client.filter(customer =>
        customer.Vendor.some(vendorId => vendorIdSet.has(vendorId))
    );
    const loadclients = async (inputValue) => {
        if (!inputValue) return [];

        const filtered = AllClient
            .filter((item) =>
                item.CutomerName.toLowerCase().includes(inputValue.toLowerCase()) || item.SalesFlowRef.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50);

        return filtered.map((item) => ({
            label: `${item.CutomerName} ${item.SalesFlowRef}`,
            value: item._id
        }));
    }


    const totalAmount = tableData.reduce((sum, row) => sum + (parseInt(row.Amount) || 0), 0);
    const loadInvoice = async (inputValue) => {
        if (!inputValue) return [];

        const findInvoice = AllInvoice.filter((item) => item.Client === customer);
        //console.log(findInvoice);
        const AllFindInvoice = findInvoice.concat({
            Invoice: `UnRealized`,
            SalesFlowRef: `UnRealized`,
        })
        const filtered = AllFindInvoice
            .filter((item) => {
                const sales =
                    item.SalesFlowRef?.toLowerCase() ??
                    "";
                const inv = item.Invoice ? item.Invoice.toLowerCase() || item.SalesFlowRef.toLowerCase() : "";
                return (
                    sales.includes(inputValue.toLowerCase()) ||
                    inv.includes(inputValue.toLowerCase())
                );
            })
            .slice(0, 50);

        const AllFilter = filtered.map((item) => ({
            label: `${item.SalesFlowRef || item.Invoice || `UnRealized`}`,
            value: item.SalesInvoice || item.Invoice || `UnRealized`,
            Type: item.status ? "Opening" : "Current"   // ✅ safer check
            // OR: Type: item.status === "Open" ? "Opening" : "Current"
        }));
        return AllFilter
    };

    const startingClient = AllClient.slice(0, 50).map((item) => ({
        label: `${item.CutomerName} ${item.SalesFlowRef}`,
        value: item._id
    }));;
    const AllInvoice = Invoice.concat(editOpeningInvoices[0].InvoiceData)

    const startingInvoice = AllInvoice.filter((item) => item.Client === customer)
        .map((it) => ({
            label: it.SalesFlowRef
                ? [it.SalesFlowRef, it.SalesInvoice].filter(Boolean).join(" ")
                : it.Invoice,
            value: it.SalesInvoice || it.Invoice,
            Type: it.status == "Open" || it.status == "Closed   " ? "Opening" : "Current"
        })).concat({
            value: `UnRealized`,
            label: `UnRealized`,
        })
    //console.log(startingInvoice)
    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Customer Cheque </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Cheque Received Date </label>
                        <input
                            type="date"
                            {...register("ChqDate", { required: true })}
                            className="pd-input text-sm md:text-base"
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Customer </label>
                        <AppAsyncSelect
                            onChange={(selectedOption) =>
                                setCustomer(selectedOption.value)
                            }
                            isDisabled={tableData.length !== 0 ? true : false}
                            loadOptions={loadclients}
                            defaultOptions={startingClient}
                            value={
                                customer
                                    ? {
                                        value: customer,
                                        label: `${Client.find((c) => c._id === customer)?.CutomerName}`,
                                    }
                                    : null
                            }
                            className="basic-single text-sm"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Account..."
                        />
                    </div>
                    <div>
                        <label className="block pd-text-body font-semibold mb-2">Code</label>
                        <input
                            type="text"
                            {...register("Code1")}
                            disabled={true}
                            className="pd-input"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr className="pd-bg-muted">
                                <th className="border p-2 min-w-[200px]">Cheque Number</th>
                                <th className="border p-2">Invoice Number</th>
                                <th className="border p-2">Amount</th>
                                <th className="border p-2 min-w-[160px]">Bank <span className="text-red-500">*</span></th>
                                <th className="border p-2">Realize Date</th>
                                <th className="border p-2">Remarks</th>

                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row) => (
                                <tr key={row.id} className="hover:pd-bg-muted">
                                    <td className="border p-2">
                                        <input
                                            type="text"
                                            value={row.chq}
                                            onChange={(e) => handleCellChange(row.id, 'chq', e.target.value)}
                                            className="w-full p-3 text-xs md:text-sm border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <AppAsyncSelect
                                            onChange={(e) => handleCellChange(row.id, "Invoice", e.value)}
                                            loadOptions={loadInvoice}
                                            defaultOptions={startingInvoice}
                                            value={
                                                row.Invoice
                                                    ? {
                                                        value: row.Invoice,
                                                        label: row.Invoice,
                                                    }
                                                    : null
                                            }
                                            className="basic-single text-sm"
                                            classNamePrefix="pd-select"
                                            isSearchable
                                            placeholder="Select Invoice..."
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            value={row.Amount}
                                            onChange={(e) => handleCellChange(row.id, 'Amount', e.target.value)}
                                            className="w-full p-3 text-xs md:text-sm border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="text"
                                            value={row.Bank || ""}
                                            onChange={(e) => handleCellChange(row.id, 'Bank', e.target.value)}
                                            placeholder="Bank name"
                                            required
                                            className="w-full p-3 text-xs md:text-sm border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="date"
                                            value={row.RealizeDate}
                                            onChange={(e) => handleCellChange(row.id, 'RealizeDate', e.target.value)}
                                            className="w-full p-3 text-xs md:text-sm border rounded"
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
                                    <td className="border p-2 hidden md:table-cell"></td>
                                    <td className="border p-2"> {totalAmount}</td>
                                    <td className="border p-2"></td>
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
                        disabled={disabled}
                        className="pd-btn-save text-sm md:text-base"
                    >
                        Create Customer Cheque
                    </button>
                </div>
            </form>
        </div>
    )
}

export default CustomerChqAdd
