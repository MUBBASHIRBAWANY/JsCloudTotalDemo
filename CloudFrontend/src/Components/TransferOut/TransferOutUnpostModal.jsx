import AppSelect from '../Global/AppSelect.jsx'
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { updateDataFunction } from '../../Api/CRUDFunctions';
import { useNavigate } from 'react-router-dom';
import { updateDatePurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';
import { updateDateTransferOut } from '../../Redux/Reducers/TransferOutReducer';

const TransferoutPostModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceFrom, setSelectedInvoiceFrom] = useState(null);
    const [selectedInvoiceTo, setSelectedInvoiceTo] = useState(null)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const TransferOut = useSelector((state) => state.TransferOut.TransferOut)



    const invoices = [...TransferOut].sort((a, b) => parseInt(a.TransferCode) - parseInt(b.TransferCode));;
    const invoiceOptions = invoices.filter((item) => item.PostStatus === "TransferOut").map((item) => {
        return ({
            value: item.TransferCode,
            label: item.TransferCode
        })
    })

    const handleSubmit = async (e) => {
        //console.log("first")
        e.preventDefault();
        //console.log("false")

        // Handle form submission

        if (selectedInvoiceFrom.value > selectedInvoiceTo.value) {
            return toast.error("Invoiceto Must Be Graterthen InvoiceTo")
        }

        else {
            const filtervalues = invoices.filter((item) => item.TransferCode <= selectedInvoiceTo.value)
            const allFalse = filtervalues.filter((item) => item.PostStatus === "TransferOut").map((item) => {
                return ({
                    id: item._id,
                    status: false,
                    LocationFrom: item.LocationFrom,
                    StoreFrom: item.StoreFrom,
                    TransferData: item.TransferData,
                    LocationTo: item.LocationTo,
                    StoreTo: item.StoreTo,
                    TransferCode: item.TransferCode,
                    TransferOutDate: item.TransferOutDate,
                    SalesFlowRef: item.SalesFlowRef

                })
            })
            //console.log(allFalse)
            for (const item of allFalse) {
                try {
                    const res = await updateDataFunction(`TransferOut/ChangeStatus/${item.id}`, item)
                    //console.log(res)
                    await dispatch(updateDateTransferOut(item))
                } catch (err) {
                    return //console.log(err)
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
                Post Transfer Out
            </button>

            {isOpen && (
                <div className="fixed inset-0 pd-modal-overlay flex items-center justify-center p-4 z-50">
                    <div className="pd-bg-surface rounded-xl shadow-2xl w-full max-w-md">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="pd-page-title">Select Tranfer Out</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="pd-text-muted hover:pd-text-body"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form className="p-6 space-y-6">
                            <div>
                                <label className="pd-label">
                                    Select Tranfer Out from
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
                                    Select Tranfer Out to
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
                                    onClick={handleSubmit}
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

export default TransferoutPostModal