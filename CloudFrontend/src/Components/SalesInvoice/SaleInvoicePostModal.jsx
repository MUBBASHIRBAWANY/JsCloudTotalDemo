import AppAsyncSelect from '../Global/AppAsyncSelect.jsx'
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../Api/CRUDFunctions';
import { useNavigate } from 'react-router-dom';
import { updateDatePurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';
import { updateDateSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';
import { set } from 'react-hook-form';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


const SaleInvoicePostModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceFrom, setSelectedInvoiceFrom] = useState(null);
    const [selectedInvoiceTo, setSelectedInvoiceTo] = useState(null)
    const Products = useSelector((state) => state.Product.product);
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)

    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [submit, setSubmit] = useState(false)
    const [invoices, setInvoices] = useState([])
    const [LastNumber, setLastNumber] = useState(0)
    const [firstNumber, setfirstNumber] = useState(0)
    //console.log(LastNumber, firstNumber)


  const downloadErrorReport = (response) => {
    // Create main summary sheet data
    const summary = [
        ["Message", response.message],
        ["Total Invoices", response.totalInvoices],
        ["Processed", response.processed],
        ["Failed", response.failed],
    ];

    // Convert errInvoices to sheet (adjusted for your field names: inv, error)
    const errSheetData = response.errInvoices?.length
        ? response.errInvoices.map((item, index) => ({
            SNo: index + 1,
            InvoiceNumber: item.inv || "",
            Error: item.error || item.Error,
        }))
        : [{ SNo: "", InvoiceNumber: "No errors", Error: "" }];

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add summary sheet
    const summarySheet = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // Add error details sheet
    const errorSheet = XLSX.utils.json_to_sheet(errSheetData);
    XLSX.utils.book_append_sheet(wb, errorSheet, "Error Invoices");

    // Generate Excel file with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "");
    const filename = `BulkPostingReport_${timestamp}.xlsx`;

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), filename);
};

    const getData = async () => {
        try {
            //console.log("first")
            const response = await getDataFundtion(`/SaleInvoice/OnlyNumber/false`);
            //console.log(response)
            const invoiceNumbers = (response || [])
                .map((item) => item?.SalesInvoice)
                .filter((value) => value !== undefined && value !== null && value !== "");

            if (invoiceNumbers.length) {
                const sorted = [...invoiceNumbers].sort((a, b) => {
                    const numA = Number(a);
                    const numB = Number(b);
                    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
                    return String(a).localeCompare(String(b), undefined, { numeric: true });
                });
                setfirstNumber(sorted[0]);
                setLastNumber(sorted[sorted.length - 1]);
            }
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
            ?.filter((item) =>
                item.PostStatus !== true &&
                item.SalesInvoice.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered.map((item) => ({
            value: item.SalesInvoice || "Loading...",
            label: item.SalesInvoice || "Loading..."
        }));
    };

    let defaultOptions = invoices?.filter((item) =>
        item.PostStatus !== true
    ).slice(0, 50).map((item) => ({
        value: item.SalesInvoice || "Loading...",
        label: item.SalesInvoice || "Loading..."
    }));;

    const AllProduct = useSelector((state) => state.TotalProducts.TotalProducts)


    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmit(true)
        const data = {
            numberfrom: selectedInvoiceFrom.value,
            numberto: selectedInvoiceTo.value,
            Admin: Admin,
            invstatus : true
        }
        try{

        
        //console.log(data)
        const res = await updateDataFunction("SaleInvoice/postSalesinvoiceBulk", data)
        //console.log(res)
        if (res.errInvoices.length > 0) {
            toast.error(`Some invoices could not be posted exccel file is downloading`,);
            downloadErrorReport(res)
        }
        else {
            toast.success(`All invoices posted successfully`);
        }
        }
        catch(err){
            //console.log(err)
        }
        

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
                            <h3 className="pd-page-title">Select Sales Invoice between {firstNumber} to {LastNumber}</h3>

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

export default SaleInvoicePostModal;