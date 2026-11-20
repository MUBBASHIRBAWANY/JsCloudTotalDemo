import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { createDataFunction, updateDataFunction } from '../../Api/CRUDFunctions';
import { useNavigate } from 'react-router-dom';
import { updateDatePurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';
import { updateDateSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';
import AppSelect from '../Global/AppSelect.jsx'
import { updateStockReplacementStatus } from '../../Redux/Reducers/StockReplacement';


const StockReplacementPost = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceFrom, setSelectedInvoiceFrom] = useState(null);
    const [selectedInvoiceTo, setSelectedInvoiceTo] = useState(null)
    const Products = useSelector((state) => state.Product.product);
    const AllProduct = useSelector((state) => state.TotalProducts.TotalProducts)
    //console.log(AllProduct)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [submit, setSubmit] = useState(false)
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const StockReplacement = useSelector((state) => state.StockReplacement.StockReplacement)
    //console.log(StockReplacement)
    const allTrue = StockReplacement.filter((item) => item.PostStatus !== true).sort((a, b) => a.ReplacementNumber - b.ReplacementNumber)
    const StockReplacementOption = allTrue.map((item) => {
        return ({
            value: item.ReplacementNumber,
            label: item.ReplacementNumber
        })
    })
    //console.log(allTrue)
    const handleSubmit = async (e) => {
        setSubmit(false)
        e.preventDefault();
        const data = []
        //console.log(selectedInvoiceFrom.value, selectedInvoiceTo.value);
        if (selectedInvoiceFrom.value > selectedInvoiceTo.value) {
            return toast.error("Invoiceto Must Be Graterthen InvoiceTo")
        }
        else {
            //obj => obj.SalesInvoice >= selectedInvoiceFrom.value && obj.SalesInvoice <= selectedInvoiceTo.value
            const filtervalues = StockReplacement.filter((item) => item.ReplacementNumber >= selectedInvoiceFrom.value && item.ReplacementNumber <= selectedInvoiceTo.value && item.PostStatus !== true)
                .map((d) => {
                    const rate = d.ReplacementData.map((pr) => (
                        {
                            product: pr.productFrom,
                            value: (AllProduct.find((p) => p.ProductName === pr.productFrom && p.Store === d.Store && p.Location === d.Location).AvgRate * pr.totalBoxesFrom).toFixed(4)
                        }
                    ))

                    return ({
                        status: true,
                        ReplacementData: d.ReplacementData,
                        Store: d.Store,
                        Location: d.Location,
                        ReplacementNumber : d.ReplacementNumber,
                        id: d._id,
                        AccountData: {
                            VoucherType: "SRP",
                            VoucherNumber: `SRP${d.ReplacementNumber}`,
                            VoucherDate: d.ReplacementDate,
                            status: "Post",
                            VoucharData: [
                                {
                                    Account: Admin.finishedGoods,
                                    Credit: (Number(parseFloat(rate.reduce((sum, row) => sum + (parseFloat(row.value) || 0), 0)).toFixed(4))),
                                    store: d.Store,
                                },
                                {
                                    Account: Admin.DAMAGEEXPIRECLAIM,
                                    Debit: (Number(parseFloat(rate.reduce((sum, row) => sum + (parseFloat(row.value) || 0), 0)).toFixed(4))),
                                    store: d.Store,
                                },


                            ].filter(
                                item => (item.Debit ?? 0) !== 0 || (item.Credit ?? 0) !== 0
                            )
                        }

                    })
                })
            //console.log(filtervalues)
            for (const item of filtervalues) {
                try {
                    //console.log(item)
                    const res = await updateDataFunction(`/StockReplacement/ChangeStatus/${item.id}`, item)
                    const CostVoucher = await createDataFunction("/Voucher/createSystemVoucher", item.AccountData)
                    dispatch(updateStockReplacementStatus({
                        id: item._id,
                        status: true
                    }))
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

                        }
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
                                <AppSelect
                                    options={StockReplacementOption}
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
                                <AppSelect
                                    options={StockReplacementOption}
                                    value={selectedInvoiceTo}
                                    onChange={setSelectedInvoiceTo}
                                    placeholder="Search invoices..."
                                    
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

                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}

export default StockReplacementPost