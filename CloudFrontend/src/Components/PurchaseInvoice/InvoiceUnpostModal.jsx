import AppSelect from '../Global/AppSelect.jsx'
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { deleteDataFunction, updateDataFunction } from '../../Api/CRUDFunctions';
import { useNavigate } from 'react-router-dom';
import { updateDatePurchaseInvoice } from "../../Redux/Reducers/PurchaseInvoiceReducer"

const InvoiceUnpostModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceFrom, setSelectedInvoiceFrom] = useState(null);
    const [selectedInvoiceTo, setSelectedInvoiceTo] = useState(null)
    const navigate = useNavigate()
    const Products = useSelector((state) => state.Product.product);
    const invoices = useSelector((state) => state.PurchaseInvoice.PurchaseInvoice)
    const dispatch = useDispatch()

    const invoiceOptions = invoices.filter((item) => item.PostStatus !== false).map((item) => {
        return ({
            value: item.PurchaseInvoice,
            label: item.PurchaseInvoice
        }
        )
    })

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = []
        // Handle form submission
        //console.log(selectedInvoiceFrom.value, selectedInvoiceTo.value);
        if (selectedInvoiceFrom.value > selectedInvoiceTo.value) {
            return toast.error("Invoiceto Must Be Graterthen InvoiceTo")
        }
        else {
            //console.log(invoices)
            const filtervalues = invoices.filter(obj => obj.PurchaseInvoice >= selectedInvoiceFrom.value && obj.PurchaseInvoice <= selectedInvoiceTo.value)
            //console.log(filtervalues)
            const allFalse = filtervalues.filter((item) => item.PostStatus !== false).map((item) => {
                return ({
                    PurchaseInvoice: item.PurchaseInvoice,
                    id: item._id,
                    status: false,
                    Location: item.Location,
                    Store: item.Store,
                    data: item.PurchaseData
                })
            })
            //console.log(allFalse)
            for (const item of allFalse) {
                try {
                    const res = await updateDataFunction(`PurchaseInvoice/Changestatus/${item.id}`, item)
                    //console.log(res)
                    const deletevoucher = await deleteDataFunction(`/Voucher/deleteVoucher/Pr${item.PurchaseInvoice}`)
                    //console.log(deletevoucher)
                    await dispatch(updateDatePurchaseInvoice(item))

                } catch (err) {

                    const error = err?.response?.data?.errors
                    if (error) {
                        //console.log(error)
                        try {
                            //console.log(error[0][0])
                            const notAvalible = `${Products.find((item) => item._id == error[0][0]).ProductName} not found at specified on your location`
                            toast.error(notAvalible)
                        }
                        catch {
                            //console.log(error)
                            const notAvalible = `In Inv#${item.PurchaseInvoice} Qty of ${Products.find((item) => item._id == error[0].product).ProductName} Available Qty ${error[0].available}  you need ${error[0].tryingToDeduct} Boxes`
                            toast.error(notAvalible)
                        }
                    }
                }

            }
        }

        setSelectedInvoiceFrom(null)
        setSelectedInvoiceTo(null)
        setIsOpen(false);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="pd-btn-save"
            >
                UnPost Invoice
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
                                    options={invoiceOptions}
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
                                    options={invoiceOptions}
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
    );
};

export default InvoiceUnpostModal;