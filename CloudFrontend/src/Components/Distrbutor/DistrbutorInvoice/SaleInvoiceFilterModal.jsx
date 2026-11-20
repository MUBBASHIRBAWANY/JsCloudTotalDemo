import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { updateDataFunction } from '../../Api/CurdFunctions';
import { useNavigate } from 'react-router-dom';
import { updateDatePurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';
import { updateDateSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';

const SaleInvoiceFilterPostModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceFrom, setSelectedInvoiceFrom] = useState(null);
    const [selectedInvoiceTo, setSelectedInvoiceTo] = useState(null)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const invoices = useSelector((state) => state.SalesInvoice.SalesInvoice)

    const loadInvoiceOptions = async (inputValue) => {
        if (!inputValue) return [];
        const filtered = invoices
            .filter((item) =>
                item.PostStatus !== false &&
                item.SalesInvoice.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered.map((item) => ({
            value: item.SalesInvoice,
            label: item.SalesInvoice
        }));
    };

    let defaultOptions = invoices
        .filter((item) =>
            item.PostStatus !== false
        ).slice(0, 50).map((item) => ({
            value: item.SalesInvoice,
            label: item.SalesInvoice
        }));;



    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = []
        // Handle form submission
        //console.log(selectedInvoiceFrom.value, selectedInvoiceTo.value);
        if (selectedInvoiceFrom.value > selectedInvoiceTo.value) {
            return toast.error("Invoiceto Must Be Graterthen InvoiceTo")
        }
        else {
            const filtervalues = invoices.filter(obj => obj.SalesInvoice >= selectedInvoiceFrom.value && obj.SalesInvoice <= selectedInvoiceTo.value)
            const allfalse = filtervalues.filter((item) => item.PostStatus !== false).map((item) => {
                return ({
                    id: item._id,
                    status: false,
                    data: item.SalesData,
                    Store: item.Store,
                    Location: item.Location
                })
            })
            //console.log(allfalse)
            for (const item of allfalse) {
                try {
                    const res = await updateDataFunction(`SaleInvoice/ChangeStatus/${item.id}`, item)
                    dispatch(updateDateSalesInvoice(item))
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
                Filter invoice
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
                                    Select Invoice
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
                                    defaultOptions={defaultOptions}
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

export default SaleInvoiceFilterPostModal;