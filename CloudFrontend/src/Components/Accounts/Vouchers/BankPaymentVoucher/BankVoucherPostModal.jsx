import AppAsyncSelect from '../../../Global/AppAsyncSelect.jsx'
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import { useNavigate } from 'react-router-dom';
import { updateDataFunction } from '../../../../Api/CurdFunctions';

const VoucherPostModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceFrom, setSelectedInvoiceFrom] = useState(null);
    const [selectedInvoiceTo, setSelectedInvoiceTo] = useState(null)
    const Products = useSelector((state) => state.Product.product);
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [submit, setSubmit] = useState(false)
    const Voucher = useSelector((state) => state.VoucherReducer.Voucher)
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const Client = useSelector((state) => state.Client.client)
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)

const SalesVoucherorted = [...Voucher].sort((a, b) => a.VoucherNumber - b.VoucherNumber)

    const loadInvoiceOptions = async (inputValue) => {
        if (!inputValue) return [];

        const filtered = SalesVoucherorted
            .filter((item) =>
                item.PostStatus !== true &&
                item.VoucherNumber.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered.map((item) => ({
            value: item.VoucherNumber,
            label: item.VoucherNumber
        }));
    };

    let defaultOptions = SalesVoucherorted
        .filter((item) =>
            item.PostStatus !== true
        ).slice(0, 50).map((item) => ({
            value: item.VoucherNumber,
            label: item.VoucherNumber
        }));;



    const handleSubmit = async (e) => {
        setSubmit(false)
        e.preventDefault();
        const data = []
        //console.log(selectedInvoiceFrom.value, selectedInvoiceTo.value);


        const filtervalues = Voucher.filter(obj => obj.VoucherNumber >= selectedInvoiceFrom.value && obj.VoucherNumber <= selectedInvoiceTo.value)
        //console.log(filtervalues)
        const allTrue = filtervalues.filter((item) => item.PostStatus !== true).map((item) => {
            return ({
                id: item._id,
                status: true,

                AccountsData: [
                    {
                        VoucherType: "SL",
                        VoucherNumber: `Sl${item.VoucherNumber}`,
                        VoucherDate: item.VoucherNumberDate,
                        status: "Post",
                        VoucharData: [
                            {
                                Account: Accounts.find((Ac) => Ac.AccountCode === Client.find((C) => C._id === item.Client).AccountCode)._id,
                                Debit: (Number(item.TotalAmount) - Number(item.AddAmount || 0) + Number(item.LessAmount || 0)),
                                Store: item.Store,
                            },
                            {
                                Account: Admin.SaleDiscount,
                                Debit: item.SalesData.reduce((sum, row) => sum + (parseFloat(row.Discount) || 0), 0),
                                Store: item.Store,
                            },
                            {
                                Account: Admin.salesRevenue,
                                Credit: item.SalesData.reduce((sum, row) => sum + (parseFloat(row.Discount) || 0), 0) + (Number(item.TotalAmount) - Number(item.AddAmount || 0) + Number(item.LessAmount || 0)),
                                Store: item.Store,
                            },
                            {
                                Account: Accounts.find((Ac) => Ac.AccountCode === Client.find((C) => C._id === item.Client).AccountCode)._id,
                                Debit: Number(item.AddAmount || 0),
                                Store: item.Store,
                            },
                            {
                                Account: item.AddAccount,
                                Credit: Number(item.AddAmount || 0),
                                Store: item.Store,
                            },
                            {
                                Account: Accounts.find((Ac) => Ac.AccountCode === Client.find((C) => C._id === item.Client).AccountCode)._id,
                                Credit: Number(item.LessAmount || 0),
                                Store: item.Store,
                            },
                            {
                                Account: item.LessAccount,
                                Debit: Number(item.LessAmount || 0),
                                Store: item.Store,
                            },
                        ].filter(
                            item => (item.Debit ?? 0) !== 0 || (item.Credit ?? 0) !== 0
                        )

                    }
                ]
            })
        })
        //console.log(allTrue)
        for (const item of allTrue) {
            try {
                const res = await updateDataFunction(`SaleInvoice/ChangeStatus/${item.id}`, item)
                dispatch(updateDateVoucherNumber(item))
            } catch (err) {

                const error = err?.response?.data?.errors
                if (error) {
                    //console.log(error)
                    try {
                        const notAvalible = `this product not avalibale ${Products.find((item) => item._id == error[0]).ProductName}`
                        toast.error(notAvalible)
                    }
                    catch {
                        //console.log(error)
                        const notAvalible = `In Inv#${item.VoucherNumber} Qty of ${Products.find((item) => item._id == error[0].product).ProductName} Available Qty ${error[0].qty}  you need ${error[0].Req} Boxes`
                        toast.error(notAvalible)
                    }
                }
            }



        }

        setSelectedInvoiceFrom(null)
        setSelectedInvoiceTo(null)
        setIsOpen(false);
        setSubmit(true)
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="pd-btn-save"
            >
                Post invoice
            </button>

            {isOpen && (
                <div className="fixed inset-0 pd-modal-overlay flex items-center justify-center p-4 z-50">
                    <div className="pd-bg-surface rounded-xl shadow-2xl w-full max-w-md">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="pd-page-title">Select Purchase Invoice</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="pd-text-muted hover:pd-text-body"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="pd-label">
                                    Select Invoice from
                                </label>
                                <AppAsyncSelect
                                    cacheOptions
                                    loadOptions={loadInvoiceOptions}
                                    defaultOptions={defaultOptions}
                                    value={selectedInvoiceFrom}
                                    onChange={setSelectedInvoiceFrom}
                                    placeholder="Search Voucher..."
                                    classNamePrefix="pd-select"
                                />
                            </div>
                            <div>
                                <label className="pd-label">
                                    Select Invoice to
                                </label>
                                <AppAsyncSelect
                                    cacheOptions
                                    loadOptions={loadInvoiceOptions}
                                    onChange={setSelectedInvoiceTo}
                                    placeholder="Search Voucher..."
                                    defaultOptions={defaultOptions}
                                    classNamePrefix="pd-select"
                                />
                            </div>


                            {/* Modal Footer */}
                            <div className="flex justify-end space-x-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 pd-text-body hover:pd-bg-muted rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="pd-btn-save"
                                    disabled={submit}
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default VoucherPostModal;