import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppSelect from '../../Global/AppSelect.jsx'
import { fetchAdminReducer } from '../../../Redux/Reducers/AdminReducer';
import { fetchClient } from '../../../Redux/Reducers/ClientReducer';
import { fetchChartofAccounts } from '../../../Redux/Reducers/ChartofAccountsReduser';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import { fetchDistributroReducers } from '../../../Redux/Reducers/DistributroReducers';

const invoiceRemainingOf = (invoice) =>
    Number(invoice?.RemaingAmount ?? invoice?.Remaining ?? invoice?.RemainingAmount ?? 0) || 0;

const NoqoffAmount = () => {
    const navigate = useNavigate();

    const Distributor = useSelector((state) => state.DistributroReducers.DistributroReducers)
    const Customer = useSelector((state) => state.Client.client)

    // Combine both cDistributors and Customers
    const AllClient = [
        ...(Distributor || []).map(item => ({
            label: `${item.DistrbutorName} (Distributor)`,
            value: item._id,
            type: 'Distributor'
        })),
        ...(Customer.data || []).map(item => ({
            label: `${item.CutomerName || item.Client} ${item.SalesFlowRef ? `(${item.SalesFlowRef})` : ''} (Customer)`,
            value: item._id,
            type: 'Customer'
        }))
    ];

    const [ClinetAccount, setClinetAccount] = useState("");
    const [tableData, setTableData] = useState([]);
    
    const [invDrp, setInvDrp] = useState([])
    const [RecDrp, setRecDrp] = useState([])
    const [ClientInv, setClientInv] = useState([])
    const [ClientRec, setClientRec] = useState([])

    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const dispatch = useDispatch()
    const getData = async () => {
        const adminId = "68903ec2664155e11db10367"
        const res = await getDataFundtion(`/Administrative/get/${adminId}`)
        const customer = await getDataFundtion("/Distrbutor")
        const regClient = await getDataFundtion("/Customer")
        const ChartofAccounts = await getDataFundtion("/chartofAccounts")
        dispatch(fetchChartofAccounts(ChartofAccounts.data))
        dispatch(fetchAdminReducer(res.data))
        dispatch(fetchDistributroReducers(customer))
        dispatch(fetchClient(regClient))
    }

    useEffect(() => {
        getData()
    }, [])

    const GetCUstomerData = async () => {
        if (!ClinetAccount?.value) return;

        let ClientInvoice, ClientRecipt;
        const selectedClient = AllClient.find(c => c.value === ClinetAccount.value);

        if (selectedClient?.type === 'Customer') {
            const salesRes = await getDataFundtion(`/SaleInvoice/getRemainOnlyByCustomer/${ClinetAccount.value}`);
            ClientInvoice = salesRes;
            ClientRecipt = await getDataFundtion(`/voucher/getOnlyCredit/${ClinetAccount.value}`);

            // Filter invoices where remaining amount > 0
            const filteredInvoices = (ClientInvoice?.data || []).filter(item => {
                const remaining = Number(item?.RemaingAmount ?? item?.Remaining ?? item?.RemainingAmount ?? 0);
                return remaining > 0;
            });
            const clinetINv = filteredInvoices.map((item) => ({
                value: item.SalesInvoice || item.Invoice,
                label: item.SalesFlowRef || item.Invoice,
            }));
            // Filter vouchers where available amount (Credit - Remain) > 0
            const filteredRecipts = (ClientRecipt || []).filter(item => {
                const available = Number(item.VoucharData?.[0]?.Credit || 0) - Number(item.VoucharData?.[0]?.Remain || 0);
                return available > 0;
            });
            const clientRec = filteredRecipts.map((item) => ({
                value: item.VoucherNumber,
                label: `${item.VoucherNumber} (${Number(item.VoucharData?.[0]?.Credit || 0) - Number(item.VoucharData?.[0]?.Remain || 0)})`
            }));

            setClientInv(clinetINv);
            setClientRec(clientRec);
            setInvDrp(filteredInvoices);
            setRecDrp(filteredRecipts);
        } else {
            const distRes = await getDataFundtion(`/DistrbutorInvoice/getRemainOnlyByClinet/${ClinetAccount.value}`);
            ClientInvoice = distRes;
            ClientRecipt = await getDataFundtion(`/voucher/getOnlyCredit/${ClinetAccount.value}`);

            // Filter invoices where remaining amount > 0
            const filteredInvoices = (ClientInvoice?.data || []).filter(item => {
                const remaining = Number(item?.RemaingAmount ?? item?.Remaining ?? item?.RemainingAmount ?? 0);
                return remaining > 0;
            });
            const clinetINv = filteredInvoices.map((item) => ({
                value: item.DitributorInvoiceCode || item.Invoice,
                label: item.DitributorInvoiceCode || item.Invoice,
            }));
            // Filter vouchers where available amount (Credit - Remain) > 0
            const filteredRecipts = (ClientRecipt || []).filter(item => {
                const available = Number(item.VoucharData?.[0]?.Credit || 0) - Number(item.VoucharData?.[0]?.Remain || 0);
                return available > 0;
            });
            const clientRec = filteredRecipts.map((item) => ({
                value: item.VoucherNumber,
                label: `${item.VoucherNumber} (${Number(item.VoucharData?.[0]?.Credit || 0) - Number(item.VoucharData?.[0]?.Remain || 0)})`
            }));

            setClientInv(clinetINv);
            setClientRec(clientRec);
            setInvDrp(filteredInvoices);
            setRecDrp(filteredRecipts);
        }

        setTableData([{
            ClinetAccount: ClinetAccount.label
        }]);
    }
    const handleCellChange = async (id, field, value) => {
        let newTableData = [...tableData];

        const rowIndex = newTableData.findIndex(row => row.id === id);
        if (rowIndex === -1) return;

        let updatedRow = { ...newTableData[rowIndex], [field]: value };

        if (field == "Recipt") {
            const foundItem = RecDrp.find((item) => item.VoucherNumber == value.value);
            if (foundItem?.VoucharData) {
                updatedRow.VoucherAmount = Number(foundItem.VoucharData[0]?.Credit || 0) - Number(foundItem.VoucharData[0]?.Remain || 0)
                updatedRow.EntryId = foundItem.VoucharData[0]?.id
            }
        }
        if (field == "Invoice") {
            const invoice = invDrp.find(
                item =>
                    item.DitributorInvoiceCode === value?.value ||
                    item.Invoice === value?.value ||
                    item.SalesInvoice === value?.value
            );

            const remaining = invoice ? invoiceRemainingOf(invoice) : undefined;
            updatedRow.invoiceRemaining = remaining;
            updatedRow.invoiceAmount = invoice ? remaining : "";
        }

        if (field == "InvoiceAmount") {
            const previousAmount = newTableData[rowIndex].invoiceAmount ?? "";
            const amount = Number(value);
            const overInvoice = value !== "" && amount > Number(updatedRow.invoiceRemaining);
            const overVoucher = value !== "" && amount > Number(updatedRow.VoucherAmount);

            if (updatedRow.VoucherAmount === undefined || updatedRow.VoucherAmount === null) {
                toast.error("Please select a voucher first");
                updatedRow.invoiceAmount = previousAmount;
                updatedRow.InvoiceAmount = previousAmount;
            } else if (updatedRow.invoiceRemaining === undefined || updatedRow.invoiceRemaining === null) {
                toast.error("Please select an invoice first");
                updatedRow.invoiceAmount = previousAmount;
                updatedRow.InvoiceAmount = previousAmount;
            } else if (overInvoice) {
                toast.error("Amount cannot be greater than invoice remaining amount");
                updatedRow.invoiceAmount = previousAmount;
                updatedRow.InvoiceAmount = previousAmount;
            } else if (overVoucher) {
                toast.error("Amount Should Be Less then Voucher Amount");
                updatedRow.invoiceAmount = previousAmount;
                updatedRow.InvoiceAmount = previousAmount;
            } else {
                updatedRow.invoiceAmount = value;
            }
        }

        newTableData[rowIndex] = updatedRow;

        setTableData(newTableData);
    };






    const onSubmit = async (data) => {
        data.AdjustedData = tableData
        const knockoffRow = tableData[0] || {};
        if (
            knockoffRow.invoiceRemaining != null &&
            Number(knockoffRow.invoiceAmount) > Number(knockoffRow.invoiceRemaining)
        ) {
            return toast.error("Amount cannot be greater than invoice remaining amount")
        }
        if (Number(knockoffRow.invoiceAmount) > Number(knockoffRow.VoucherAmount)) {
            return toast.error("Invoice Amount Should Be Less Then Voucher Amount")
        }
        try {
            const payload = tableData.map(({ invoiceRemaining, ...row }) => row);
            const res = await updateDataFunction("/voucher/AdjustVoucher", payload)
            toast.success("Invoice Adjusted Successfully")
            navigate(0)
        } catch (err) {
            toast.error("Something went wrong")
        }
    }

    const loadClientOptions = async (inputValue) => {
        if (!inputValue) return AllClient.slice(0, 50);
        const filtered = AllClient
            .filter((item) =>
                item.label.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50);
        return filtered;
    }

    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Knockoff</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Client Account </label>
                        <AppAsyncSelect
                            onChange={(selectedOption) => {
                                setClinetAccount(selectedOption);
                                setTableData([]);
                                setInvDrp([]);
                                setRecDrp([]);
                                setClientInv([]);
                                setClientRec([]);
                            }}
                            loadOptions={loadClientOptions}
                            value={ClinetAccount ? {
                                value: `${ClinetAccount.value}`,
                                label: `${ClinetAccount?.label}`
                            } : null}
                            className="basic-single text-sm"
                            classNamePrefix="pd-select"
                            isSearchable
                            isClearable={true}
                            placeholder="Select Client (Distributor or Customer)..."
                            isDisabled={tableData.length != 0}
                        />
                    </div>
                    <div>
                        <button
                            type='Button'
                            className='bg-blue-400 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-300 mt-[5%]'
                            onClick={GetCUstomerData}
                        >
                            Get Data
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr className="pd-bg-muted">
                                <th className="border p-2 w-[100px]">Account </th>
                                <th className="border p-2" style={{ width: "8vw" }}>Voucher</th>
                                <th className="border p-2" style={{ width: "5vw" }}>Voucher Amount</th>
                                <th className="border p-2" style={{ width: "5vw" }}>Invoice</th>
                                <th className="border p-2" style={{ width: "5vw" }}>Invoice Amount</th>

                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row) => (
                                <tr key={row.id} className="hover:pd-bg-muted">
                                    <td className="border p-2">
                                        {row.ClinetAccount}
                                    </td>
                                    <td className="border p-2">
                                        <AppSelect options={ClientRec}
                                            onChange={(selectedOption) =>
                                                handleCellChange(row.id, 'Recipt', selectedOption || '')
                                            }
                                        />
                                    </td>
                                    <td className="border p-2">
                                        {row.VoucherAmount}
                                    </td>
                                    <td className="border p-2">
                                        <AppSelect options={ClientInv}
                                            onChange={(selectedOption) =>
                                                handleCellChange(row.id, 'Invoice', selectedOption || '')
                                            }
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input type="number"
                                            onChange={(e) =>
                                                handleCellChange(row.id, 'InvoiceAmount', e.target.value || '')
                                            }
                                            className="w-full p-1 text-xs md:text-sm border rounded"
                                            value={row.invoiceAmount ?? ""} />
                                        {row.invoiceRemaining != null && (
                                            <div className="text-xs pd-text-body mt-1">Remaining: {row.invoiceRemaining}</div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                    </table>
                </div>
                <div className="flex flex-col md:flex-row gap-4 justify-between">                        <button
                        type="submit"
                        className="pd-btn-save text-sm md:text-base"
                        disabled={tableData.length === 0}
                    >
                        Knockoff Invoice
                    </button>
                </div>
            </form>
        </div>

    )
}

export default NoqoffAmount