import AppAsyncSelect from '../Global/AppAsyncSelect.jsx'
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { createDataFunction, updateDataFunction } from '../../Api/CRUDFunctions';
import { useNavigate } from 'react-router-dom';
import { updateDatePurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';
import { updateDateSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';

const SalesInvoiceReturnPost = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceFrom, setSelectedInvoiceFrom] = useState(null);
    const [selectedInvoiceTo, setSelectedInvoiceTo] = useState(null)
    const Products = useSelector((state) => state.Product.product);
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [submit, setSubmit] = useState(false)
      
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const invoices = useSelector((state) => state.SalesInvoiceReturn.SalesInvoiceReturn)
    console.log(invoices , "Client")
    const AllProduct = useSelector((state) => state.TotalProducts.TotalProducts)
    const loadInvoiceOptions = async (inputValue) => {
        if (!inputValue) return [];

        const filtered = invoices
            .filter((item) =>
                item.PostStatus !== true &&
                item.SalesReturnNumber.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered.map((item) => ({
            value: item.SalesReturnNumber,
            label: item.SalesReturnNumber
        }));
        //console.log(filtered)
    };
    let defaultOptions = invoices
        .filter((item) =>
            item.PostStatus !== true
        ).slice(0, 50).map((item) => ({
            value: item.SalesReturnNumber,
            label: item.SalesReturnNumber
        }));;



    const handleSubmit = async (e) => {

        e.preventDefault();
        const data = []
        //console.log(selectedInvoiceFrom.value, selectedInvoiceTo.value);
        if (selectedInvoiceFrom.value > selectedInvoiceTo.value) {
            return toast.error("Invoiceto Must Be Graterthen InvoiceTo")
        }
        else {
            const filtervalues = invoices.filter(obj => obj.SalesReturnNumber >= selectedInvoiceFrom.value && obj.SalesReturnNumber <= selectedInvoiceTo.value)
            // console.log(filtervalues)


            const allTrue = filtervalues.filter((item) => item.PostStatus !== true).map((item) => {
                const rate = item.SalesReturnData.map((pr) => {
                    const stock = AllProduct.find((p) => p.ProductName === pr.product && p.Store === item.Store && p.Location === item.Location);
                    const avgRate = Number(stock?.AvgRate) || 0;
                    const qty = Number(pr.totalBox) || 0;
                    return {
                        product: pr.product,
                        value: (avgRate * qty).toFixed(4)
                    };
                });
                const totalCost = Number(parseFloat(rate.reduce((sum, row) => sum + (parseFloat(row.value) || 0), 0)).toFixed(4));
                const client =  item.Client
                return ({
                    SalesReturnNumber: item.SalesReturnNumber,
                    Store: item.Store,
                    Location: item.Location,
                    id: item._id,
                    status: true,
                    SalesReturnData: item.SalesReturnData,
                    Condition: item.Condition,
                    CostVoucherData: {
                        VoucherType: "RSO",
                        VoucherNumber: `RSO${item.SalesReturnNumber}`,
                        VoucherDate: item.SalesInvoiceReturnDate,
                        status: "Post",
                        Store: item.Store,
                        VoucharData: [
                            {
                                Account: Admin.finishedGoods,
                                Debit: totalCost,
                                store: item.Store
                            },
                            {
                                Account: Admin.COSTOFSALES,
                                Credit: totalCost,
                                store: item.Store
                            },
                        ]
                    },
                    AccountsData: {
                        VoucherType: "SR",
                        VoucherNumber: `SR${item.SalesReturnNumber}`,
                        VoucherDate: item.SalesInvoiceReturnDate,
                        status: "Post",
                        VoucharData: (() => {
                            const entries = [
                                {
                                    Account: Admin.Client,
                                    Credit: Number(
                                        parseFloat(
                                            item.SalesReturnData.reduce(
                                                (sum, row) => sum + (parseFloat(row.netAmunt) || 0),
                                                0
                                            )
                                        ).toFixed(2)
                                    ),
                                    store: item.Store,
                                    Client: client,
                                },
                                {
                                    Account: Admin.SaleDiscount,
                                    Credit:
                                        item.SalesReturnData.reduce(
                                            (sum, row) => sum + (parseFloat(row.discount) || 0),
                                            0
                                        ) +
                                        item.SalesReturnData.reduce(
                                            (sum, row) => sum + (parseFloat(row.TTS) || 0),
                                            0
                                        ).toFixed(2),
                                    store: item.Store,
                                },
                                {
                                    Account: Admin.salesRevenue,
                                    Debit: item.SalesReturnData.reduce(
                                        (sum, row) => sum + (parseFloat(row.TotalValueExclGst) || 0),
                                        0
                                    ).toFixed(2),
                                    store: item.Store,
                                },
                                {
                                    Account: Admin.Gst,
                                    Debit: item.SalesReturnData.reduce(
                                        (sum, row) => sum + (parseFloat(row.Gst) || 0),
                                        0
                                    ).toFixed(2),
                                    store: item.Store,
                                },
                                {
                                    Account: Admin.AdvanceTax,
                                    Debit: parseFloat(
                                        item.SalesReturnData.reduce(
                                            (sum, row) => sum + (parseFloat(row.AdvanceTax) || 0),
                                            0
                                        ).toFixed(2)
                                    ),
                                    store: item.Store,
                                },
                            ].filter(
                                val => (val.Debit ?? 0) !== 0 || (val.Credit ?? 0) !== 0
                            );
                            const totalDebit = +entries.reduce((sum, e) => sum + (e.Debit || 0), 0);
                            const totalCredit = +entries.reduce((sum, e) => sum + (e.Credit || 0), 0);
                            const difference = +(totalDebit - totalCredit).toFixed(3);
                            const PositiveDiff = Math.abs(difference);

                            if (PositiveDiff > 0.5) {
                                toast.error(`${item.SalesReturnNumber} Rounding Diff Greater Than 0.5`);
                                throw new Error("Rounding difference too large");
                            }

                            if (difference !== 0) {
                                entries.push({
                                    Account: Admin.DifferenceExpense,
                                    Debit: difference < 0 ? Math.abs(difference) : 0,
                                    Credit: difference > 0 ? Math.abs(difference) : 0,
                                    store: item.Store,
                                });
                            }

                            return entries;
                        })(),
                    },

                })

            })
            for (const item of allTrue) {
                console.log(allTrue)
                try {
                    const res = await updateDataFunction(`SalesInvoiceReturn/ChangeStatus/${item.id}`, item)
                    const CostVoucher = await createDataFunction("/Voucher/createSystemVoucher", item.CostVoucherData)
                    const Voucher = await createDataFunction("/Voucher/createSystemVoucher", item.AccountsData)
                    dispatch(updateDateSalesInvoice(item))
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
                            const notAvalible = `In Inv#${item.SalesInvoice} Qty of ${Products.find((item) => item._id == error[0]?.product)?.ProductName} Available Qty ${error[0]?.available}  you need ${error[0]?.tryingToSell} Boxes`
                            toast.error(notAvalible)
                        }
                    }
                }
                setSubmit(false)


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

export default SalesInvoiceReturnPost;