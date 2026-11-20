import AppAsyncSelect from '../Global/AppAsyncSelect.jsx'
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { deleteDataFunction, updateDataFunction } from '../../Api/CRUDFunctions';
import { useNavigate } from 'react-router-dom';
import { updateDatePurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';
import { updateDatePurchaseReturn } from '../../Redux/Reducers/PurchaseReturnReducer';

const PurchaseReturnReturnUnPost = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceFrom, setSelectedInvoiceFrom] = useState(null);
    const [selectedInvoiceTo, setSelectedInvoiceTo] = useState(null)
    const Products = useSelector((state) => state.Product.product);
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [submit, setSubmit] = useState(false)
    const invoices = useSelector((state) => state.PurchaseReturn.PurchaseReturn)
    const loadInvoiceOptions = async (inputValue) => {
        if (!inputValue) return [];

        const filtered = invoices
            .filter((item) =>
                item.PostStatus == true &&
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
            item.PostStatus == true
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
            const allTrue = filtervalues.filter((item) => item.PostStatus == true).map((item) => {
                return ({
                    PurchaseReturn: item.PurchaseReturn,
                    Store: item.Store,
                    Location: item.Location,
                    id: item._id,
                    status: false,
                    returnData: item.PurchaseReturnData,
                })
            })
            for (const item of allTrue) {
                //console.log(allTrue)
                try {
                    const res = await updateDataFunction(`/PurchaseReturn/Changestatus/${item.id}`, item)
                    //console.log(res)
                    const deletevoucher = await deleteDataFunction(`/Voucher/deleteVoucher/Pr${item.PurchaseReturn}`)
                    //console.log(deletevoucher)
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
                UnPost invoice
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

export default PurchaseReturnReturnUnPost;