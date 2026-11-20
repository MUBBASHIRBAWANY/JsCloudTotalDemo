import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { updateDataFunction } from '../../Api/CRUDFunctions';
import { useNavigate } from 'react-router-dom';
import { updateDatePurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';
import { updateDateSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';
import AppSelect from '../Global/AppSelect.jsx'
import { updateStockReplacementStatus } from '../../Redux/Reducers/StockReplacement';


const StockReplacementUnPost = () => {
     const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceFrom, setSelectedInvoiceFrom] = useState(null);
    const [selectedInvoiceTo, setSelectedInvoiceTo] = useState(null)
    const Products = useSelector((state) => state.Product.product);
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [submit, setSubmit] = useState(false)
    const StockReplacement = useSelector((state) => state.StockReplacement.StockReplacement)
   //console.log(StockReplacement)
     const allTrue = StockReplacement.filter((item) => item.PostStatus == true).sort((a, b) => a.ReplacementNumber - b.ReplacementNumber)
     const  StockReplacementOption = allTrue.map((item)=>{
        return ({
            value : item.ReplacementNumber,
            label : item.ReplacementNumber
        })
     })

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
            const filtervalues = StockReplacement.filter((item) => item.ReplacementNumber >= selectedInvoiceFrom.value && item.ReplacementNumber <= selectedInvoiceTo.value && item.PostStatus == true)
                .map((d) => {
                return({
                    status : false,
                    ReplacementData:  d.ReplacementData,
                    Store: d.Store,
                    ReplacementNumber : d.ReplacementNumber,
                    Location : d.Location,
                    id : d._id

                })
            })
            //console.log(filtervalues)
            for (const item of filtervalues) {
                try {
                    //console.log(item)
             const res = await updateDataFunction(`/StockReplacement/ChangeStatus/${item.id}`, item)

                dispatch(updateStockReplacementStatus({
                    _id : item._id,
                    status : "true"
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

export default StockReplacementUnPost