import AppAsyncSelect from '../Global/AppAsyncSelect.jsx'
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { createDataFunction, updateDataFunction } from '../../Api/CRUDFunctions';
import { useNavigate } from 'react-router-dom';
import { updateDatePurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';
import { updateDatePurchaseReturn } from '../../Redux/Reducers/PurchaseReturnReducer';

const PurchaseReturnReturnPost = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceFrom, setSelectedInvoiceFrom] = useState(null);
    const [selectedInvoiceTo, setSelectedInvoiceTo] = useState(null)
    const Products = useSelector((state) => state.Product.product);
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [submit, setSubmit] = useState(false)
    const invoices = useSelector((state) => state.PurchaseReturn.PurchaseReturn)
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)

    const loadInvoiceOptions = async (inputValue) => {
        if (!inputValue) return [];

        const filtered = invoices
            .filter((item) =>
                item.PostStatus !== true &&
                item.PurchaseReturn.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered.map((item) => ({
            value: item.PurchaseReturn,
            label: item.PurchaseReturn
        }));
        //console.log(filtered)
    };
    let defaultOptions = invoices
        .filter((item) =>
            item.PostStatus !== true
        ).slice(0, 50).map((item) => ({
            value: item.PurchaseReturn,
            label: item.PurchaseReturn
        }));;



    const handleSubmit = async (e) => {

        e.preventDefault();
        const data = []
        //console.log(selectedInvoiceFrom.value, selectedInvoiceTo.value);
        const filtervalues = invoices.filter(obj => obj.PurchaseReturn >= selectedInvoiceFrom.value && obj.PurchaseReturn <= selectedInvoiceTo.value)
        //console.log(filtervalues)
        const allTrue = filtervalues.filter((item) => item.PostStatus !== true).map((item) => {
            return ({
                PurchaseReturn: item.PurchaseReturn,
                Store: item.Store,
                Location: item.Location,
                id: item._id,
                status: true,
                date: item.PurchaseReturnDate,
                returnData: item.PurchaseReturnData,
            })
        })
        const accountsData = allTrue.map((item) => (
            {
                VoucherType: "Prr",
                VoucherNumber: `Prr${item.PurchaseReturn}`,
                status: "Post",
                VoucherDate: item.date,
                VoucharData: [
                    {
                        Account: Admin.Vendor,
                        Debit: item.returnData.reduce((sum, row) => sum + (parseFloat(row.NetAmountWintAdvanceTax) || 0), 0),
                        store: item.Store,
                    },
                    {
                        Account: Admin.finishedGoods,
                        Credit: item.returnData.reduce((sum, row) => sum + (parseFloat(row.GrossAmount) || 0), 0),
                        store: item.Store,
                    },
                    {
                        Account: Admin.PurchaseDiscount,
                        Debit: item.returnData.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0),
                        store: item.Store,
                    },
                    {
                        Account: Admin.TradeDiscount,
                        Debit: item.returnData.reduce((sum, row) => sum + (parseFloat(row.AfterTaxdiscount) || 0), 0),
                        store: item.Store,
                    },
                    {
                        Account: Admin.Gst,
                        Credit: item.returnData.reduce((sum, row) => sum + (parseFloat(row.Gst) || 0), 0),
                        store: item.Store,
                    },
                    {
                        Account: Admin.AdvanceTax,
                        Credit: item.returnData.reduce((sum, row) => sum + (parseFloat(row.AdvanceTax) || 0), 0),
                        store: item.Store,
                    },
                ]
                    .filter(
                        item => (item.Debit ?? 0) !== 0 || (item.Credit ?? 0) !== 0
                    )
            }))

        //console.log(accountsData)
        for (const item of accountsData) {
            try {
                const data = await createDataFunction("/Voucher/createSystemVoucher", item)
                //console.log(item)
            } catch (err) {
                //console.log(err)
            }
        }
        for (const item of allTrue) {
            //console.log(allTrue)
            try {
                const res = await updateDataFunction(`/PurchaseReturn/Changestatus/${item.id}`, item)
                //console.log(res)
                dispatch(updateDatePurchaseReturn(item))
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
                        const notAvalible = `In Inv#${item.PurchaseReturn} Qty of ${Products.find((item) => item._id == error[0]?.product)?.ProductName} Available Qty ${error[0]?.available}  you need ${error[0]?.tryingToSell} Boxes`
                        toast.error(notAvalible)
                    }
                }
            }
            setSubmit(false)


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
                Post Return
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
                                    placeholder="Search invoices..."
                                    
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
                                    placeholder="Search invoices..."
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
                                    isDisable={submit === true ? true : false}
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

export default PurchaseReturnReturnPost;