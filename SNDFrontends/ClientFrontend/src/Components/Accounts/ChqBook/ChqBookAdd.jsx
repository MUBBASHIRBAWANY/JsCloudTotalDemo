import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Select from "react-select";
import AsyncSelect from "react-select/async";

import {
    createDataFunction,
    getDataFundtion,
} from "../../../Api/CurdFunctions";

const PaymentAdd = () => {
    const { register, handleSubmit, reset, formState: { errors },    } = useForm();

    const navigate = useNavigate();

    const [type, setType] = useState("Chq");
    
    const [disabled, setDisabled] = useState(false);

    const [clients, setClients] = useState([]);
    const [startingClients, setStartingClients] = useState([]);

    const [invoiceData, setInvoiceData] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [amount, setAmount] = useState(0)

    const validateAmount = (val) => {
        console.log(val, selectedInvoice.remaining)
        if (val > selectedInvoice.remaining) {
            return toast.error("Amount not be Greater than Remaining Amount")
        }
        else {
            setAmount(val)
        }
    }


    const setValue = (val) => {
        setSelectedInvoice(val)
        setAmount(val.remaining || val.Totalamount )
    }
    const admin = useSelector(
        (state) => state.AdminReducer.AdminReducer
    );

    const accounts = useSelector(
        (state) => state.ChartofAccounts.ChartofAccounts
    );

    const loginVendor = useSelector(
        (state) => state.LoginerReducer.userDetail
    );

    // ================= BANK ACCOUNTS =================

    const bankPrefixes = useMemo(() => {
        const arr = [];

        for (
            let i = admin.BankAccountFrom;
            i <= admin.BankAccountTo;
            i++
        ) {
            arr.push(i.toString().padStart(5, "0"));
        }

        return arr;
    }, [admin]);

    const bankAccounts = useMemo(() => {
        return accounts
            .filter(
                (item) =>
                    item.AccountCode.length > 5 &&
                    bankPrefixes.some((prefix) =>
                        item.AccountCode.startsWith(prefix)
                    )
            )
            .map((item) => ({
                label: `${item.AccountCode} - ${item.AccountName}`,
                value: item._id,
            }));
    }, [accounts, bankPrefixes]);

    // ================= CLIENT OPTIONS =================

    const loadClientOptions = async (inputValue) => {
        if (!inputValue) return [];

        return clients
            .filter((item) =>
                item.CustomorName.toLowerCase().includes(
                    inputValue.toLowerCase()
                )
            )
            .slice(0, 50)
            .map((item) => ({
                label: item.CustomorName,
                value: item._id,
            }));
    };

    // ================= INVOICE OPTIONS =================

    const invoiceOptions = useMemo(() => {
        if (!selectedClient) return [];

        return invoiceData
            .filter((item) => item.Client === selectedClient.value)
            .map((item) => ({
                label: `${item.DisSalesInvoice} (${item.Remaining})`,
                value: item.DisSalesInvoice,
                remaining: item.Remaining,
            }));
    }, [invoiceData, selectedClient]);

    // ================= SUBMIT =================

   const onSubmit = async (data) => {
  try {
    setDisabled(true);

    const currentDate = new Date()
      .toISOString()
      .split("T")[0];

    const payload = {
      ...data,
      Type: type,
      Client: selectedClient?.value,
      DisSalesInvoice: selectedInvoice?.value,
      Amount: amount,
      entryDate: currentDate,
    };

    if (type === "Chq") {
      const ChqPayload = {
        ...payload,
        DisSalesInvoice : selectedInvoice.value,        
        ChqNumber: payload.RefNumber,
        ChqDate: payload.RefDate,
        Status: "Pending",
        Customer: payload.Client,
        Distrbutor: loginVendor._id,
      };

      await createDataFunction("/customerChq", ChqPayload);
    }

    if (type === "Cash") {
      const CashPayload = {
        ...payload,
        DisSalesInvoice : selectedInvoice.value,
        SlipNumber: payload.RefNumber,
        SlipDate: payload.RefDate,
        Status: "Pending",
        Customer: payload.Client,
        Distrbutor: loginVendor._id,
      };

      await createDataFunction(
        "/customerChq/CreatCash",
        CashPayload
      );
    }

    toast.success("Payment Added Successfully");

    // ================= RESET PAGE =================

    reset();

    setSelectedClient(null);
    setSelectedInvoice(null);
    setAmount(0);
    setType("Chq");

    // optional fresh data reload
    const invoiceRes = await getDataFundtion(
      `SalesInvoice/OnlyReaminInvoice/${loginVendor._id}`
    );

    setInvoiceData(invoiceRes.data);

    setDisabled(false);
  } catch (err) {
    console.log(err);

    toast.error("Failed to add Payment");

    setDisabled(false);
  }
};
    // ================= FETCH DATA =================

    useEffect(() => {
        const fetchData = async () => {
            try {
                const invoiceRes = await getDataFundtion(
                    `SalesInvoice/OnlyReaminInvoice/${loginVendor._id}`
                );

                const clientRes = await getDataFundtion(
                    `/Customor/AllCutomerByDis/${loginVendor._id}`
                );

                setInvoiceData(invoiceRes.data);

                setClients(clientRes.data);

                setStartingClients(
                    clientRes.data.slice(0, 50).map((item) => ({
                        label: item.CustomorName,
                        value: item._id,
                    }))
                );
            } catch (err) {
                console.log(err);
            }
        };

        if (loginVendor?._id) {
            fetchData();
        }
    }, [loginVendor]);

    return (
        <div className="p-4">
            <ToastContainer />

            <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">
                    Add Payment
                </h1>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                    {/* TYPE */}
                    <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                            Payment Type
                        </label>

                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Chq">Cheque</option>
                            <option value="Cash">Cash</option>
                        </select>
                    </div>

                    {/* REF NUMBER */}
                    <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                            {type === "Chq"
                                ? "Cheque Number"
                                : "Slip Number"}
                        </label>

                        <input
                            type="text"
                            {...register("RefNumber")}
                            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* REF DATE */}
                    <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                            {type === "Chq"
                                ? "Cheque Date"
                                : "Slip Date"}
                        </label>

                        <input
                            type="date"
                            {...register("RefDate")}
                            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* CLIENT */}
                    <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                            Customer
                        </label>

                        <AsyncSelect
                            menuPortalTarget={document.body}
                            defaultOptions={startingClients}
                            loadOptions={loadClientOptions}
                            value={selectedClient}
                            onChange={(value) => {
                                setSelectedClient(value);
                                setSelectedInvoice(null);
                            }}
                            placeholder="Select Customer"
                            classNamePrefix="select"
                            styles={{
                                menuPortal: (base) => ({
                                    ...base,
                                    zIndex: 9999,
                                }),
                            }}
                        />
                    </div>

                    {/* INVOICE */}
                    <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                            Invoice
                        </label>

                        <Select
                            menuPortalTarget={document.body}
                            options={invoiceOptions}
                            value={selectedInvoice}
                            onChange={(e) => setValue(e)}
                            placeholder="Select Invoice"
                            classNamePrefix="select"
                            styles={{
                                menuPortal: (base) => ({
                                    ...base,
                                    zIndex: 9999,
                                }),
                            }}
                        />
                    </div>

                    {/* BANK */}
                    <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                            Amount
                        </label>

                        <input
                            type="number"
                            onChange={(e) => validateAmount(e.target.value)}
                            value={amount}
                            defaultValue={selectedInvoice?.remaining || ""}
                            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />


                    </div>

                    {/* SUBMIT */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end mt-4">
                        <button
                            type="submit"
                            disabled={disabled}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 disabled:opacity-50"
                        >
                            {disabled ? "Saving..." : "Add Payment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentAdd;