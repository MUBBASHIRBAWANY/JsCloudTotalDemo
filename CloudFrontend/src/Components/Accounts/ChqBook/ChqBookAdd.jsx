import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const ChqBookAdd = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const navigate = useNavigate()
    const [Bank, setBank] = useState("");
    const BankAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer)
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const filteredAccount = Account.filter((item) => item.AccountCode.length > 5)
    const result = [];
    for (let i = BankAccountNumber.BankAccountFrom; i <= BankAccountNumber.BankAccountTo; i++) {
        result.push(i.toString().padStart(5, '0')); // Adjust to 5 digits
    }
    const AllBank = filteredAccount.filter((item) => result.some(prefix => item.AccountCode.startsWith(prefix)))
    const BankAccount = AllBank.map((item) => ({
        label: `${item.AccountCode} ${item.AccountName}`,
        value: item._id
    }));;

    const onSubmit = async (data) => {
        data.Bank = Bank
        //console.log(data)
        try {
            if (data.CheuquesEnd <= data.CheuquesStart) {
                return toast.error("Cheuques To must be greaterthen Cheuques From")
            }
            else {
                await createDataFunction("/ChqBook", data)
                toast.success("Cheque Book Added Successfully")
                setTimeout(() => {
                    navigate('/ChqBookList')
                }, 2000);
            }


        } catch (err) {
            //console.log(err)
            toast.error("Failed to add Cheque Book")
        }
    }
    return (
        <div>
            <div>
                <h1 className="text-3xl font-bold text-center mb-6">Add Cheque Book</h1>
                <ToastContainer />
                <div>
                    <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 rounded-lg shadow-md mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="block font-semibold mb-2">Bank </label>
                            <AppSelect
                                onChange={(selectedOption) => setBank(selectedOption.value)}
                                options={BankAccount}
                                value={Bank ? {
                                    value: `${Bank}`,
                                    label: `${Account.find((c) => c._id === Bank)?.AccountCode} ${Account.find((c) => c._id === Bank)?.AccountName}`
                                } : null}
                                className="basic-single text-sm"
                                classNamePrefix="pd-select"
                                isSearchable
                                placeholder="Select credit account..."
                            />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Prefix</label>
                            <input
                                type="text"
                                {...register("Prefix")}
                                className="pd-input"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Cheque No From </label>
                            <input
                                type="text"
                                {...register("CheuquesStart")}
                                className="pd-input"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Cheque No To</label>
                            <input
                                type="text"
                                {...register("CheuquesEnd")}
                                className="pd-input"
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Add Cheque Book
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ChqBookAdd
