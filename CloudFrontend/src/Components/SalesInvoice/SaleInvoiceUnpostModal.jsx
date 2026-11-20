import AppAsyncSelect from '../Global/AppAsyncSelect.jsx'
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { getDataFundtion, updateDataFunction } from '../../Api/CRUDFunctions';
import { useNavigate } from 'react-router-dom';
import { updateDatePurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';
import { updateDateSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';

const SaleInvoiceUnPostModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceFrom, setSelectedInvoiceFrom] = useState(null);
    const [selectedInvoiceTo, setSelectedInvoiceTo] = useState(null)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const [invoices, setInvoices] = useState([])
    const [LastNumber, setLastNumber] = useState(0)
    const [firstNumber, setfirstNumber] = useState(0)
    const [submit, setSubmit] = useState(false)


    const getData = async () => {
        try {
            //console.log("first")
            const response = await getDataFundtion(`/SaleInvoice/OnlyNumber/true`);
            //console.log(response)
            setLastNumber(response[response.length - 1].SalesInvoice)
            setfirstNumber(response[0].SalesInvoice)
            setInvoices(response)

        } catch (error) {
            console.error("Error fetching invoices:", error);
        }
    };

    useEffect(() => {
        getData();
    }, [Admin]);

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
    e.preventDefault(); // <-- Move this to the TOP!
    setSubmit(false);

    const data = {
        numberfrom: selectedInvoiceFrom?.value,
        numberto: selectedInvoiceTo?.value,
        Admin,
        invstatus: false,
    };

    //console.log(data);

    try {
        const res = await updateDataFunction("SaleInvoice/UnpostSalesinvoiceBulk", data);
        //console.log(res);

        if (res.errInvoices?.length > 0) {
            toast.error("Some invoices could not be posted. Excel file is downloading.");
            downloadErrorReport(res);
        } else {
            toast.success("All invoices posted successfully.");
        }
    } catch (error) {
        console.error("Error while posting invoices:", error);
        toast.error("An unexpected error occurred.");
    }
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

export default SaleInvoiceUnPostModal;