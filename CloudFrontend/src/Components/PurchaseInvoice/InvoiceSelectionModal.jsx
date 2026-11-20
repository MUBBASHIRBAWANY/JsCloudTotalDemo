import AppSelect from '../Global/AppSelect.jsx'
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';
import { createDataFunction, updateDataFunction } from '../../Api/CRUDFunctions';
import { useNavigate } from 'react-router-dom';
import { updateDatePurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';

const InvoiceSelectionModal = () => {

    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceFrom, setSelectedInvoiceFrom] = useState(null);
    const [selectedInvoiceTo, setSelectedInvoiceTo] = useState(null)
    const [disable, setdisable] = useState(false)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const invoices = useSelector((state) => state.PurchaseInvoice.PurchaseInvoice)
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)



    const invoiceOptions = invoices.filter((item) => item.PostStatus !== true).map((item) => {
        return ({
            value: item.PurchaseInvoice,
            label: item.PurchaseInvoice
        })
    })

    const handleSubmit = async (e) => {
        setdisable(true)
        e.preventDefault();
        //console.log("false")

        // Handle form submission
        //console.log(selectedInvoiceFrom.value, selectedInvoiceTo.value);
        if (selectedInvoiceFrom.value > selectedInvoiceTo.value) {
            return toast.error("Invoiceto Must Be Graterthen InvoiceTo")
        }
        else {
            const filtervalues = invoices.filter((item) => item.PurchaseInvoice <= selectedInvoiceTo.value && item.PurchaseInvoice >= selectedInvoiceFrom.value)
            const allFalse = filtervalues.filter((item) => item.PostStatus !== true).map((item) => {
                return ({
                    ...item,
                    id: item._id,
                    inv: item.PurchaseInvoice,
                    date: item.PurchaseInvoiceDate,
                    Vendor: item.Vendor,
                    status: true,
                    Discount: item.Discount,
                    TotalAmount: item.TotalAmount,
                    AdvanceTax: Number(item.AdvanceTax || 0),
                    Location: item.Location,
                    Store: item.Store,
                    data: item.PurchaseData,
                    Amount: parseInt(item.ValueAfterDiscout),
                })
            })
            const AccountsData = allFalse.map((item) => {
                //console.log(item)
                const VoucharData = [
                    {
                        Account: Admin.finishedGoods,
                        Debit: item.data.reduce(
                            (s, r) => s + (Number(r.GrossAmount) || 0),
                            0
                        ),
                        store: item.Store,
                    },
                    {
                        Account: Admin.PurchaseDiscount,
                        Credit:
                            Number(item.Discount || 0) +
                            item.data.reduce((s, r) => s + (Number(r.discount) || 0), 0),
                        store: item.Store,
                    },
                    {
                        Account: Admin.TradeDiscount,
                        Credit: item.data.reduce(
                            (s, r) => s + (Number(r.AfterTaxdiscount) || 0),
                            0
                        ),
                        store: item.Store,
                    },
                    {
                        Account: Admin.Gst,
                        Debit: item.data.reduce(
                            (s, r) => s + (Number(r.Gst) || 0),
                            0
                        ) + Number(item.GST || 0),
                        store: item.Store,
                    },
                    {
                        Account: Admin.AdvanceTax,
                        Debit: Number(item.AdvanceTax || 0),
                        store: item.Store,
                    },
                    {
                        Account: Admin.Vendor,
                        Credit: Number(item.TotalAmount || 0),
                        store: item.Store,
                        Vendor: item.Vendor,
                    },
                ].filter(r => (r.Debit || 0) !== 0 || (r.Credit || 0) !== 0);

                return {
                    VoucherType: "Pr",
                    VoucherNumber: `Pr${item.inv}`,
                    status: "Post",
                    VoucherDate: item.date,
                    VoucharData,
                };
            });


            const balancedVouchers = [];
            const skippedInvoices = [];

            AccountsData.forEach((voucher) => {
                const totalDebit = voucher.VoucharData.reduce(
                    (sum, row) => sum + (Number(row.Debit) || 0),
                    0
                );
                const totalCredit = voucher.VoucharData.reduce(
                    (sum, row) => sum + (Number(row.Credit) || 0),
                    0
                );

                const PositiveDiff = (totalDebit - totalCredit).toFixed(2);
                const diff = Math.abs(PositiveDiff);

                if (diff > 1) {
                    skippedInvoices.push(voucher.VoucherNumber);
                    return;
                }

                if (PositiveDiff !== 0) {
                    voucher.VoucharData.push({
                        Account: Admin.DifferenceExpense,
                        Debit: PositiveDiff < 0 ? Math.abs(PositiveDiff) : 0,
                        Credit: PositiveDiff > 0 ? Math.abs(PositiveDiff) : 0,
                        store: voucher.VoucharData[0]?.store,
                    });
                }

                balancedVouchers.push(voucher);
            });

            if (skippedInvoices.length > 0) {
                toast.warn(`Skipped imbalance invoices: ${skippedInvoices.join(', ')}`);
            }

            if (balancedVouchers.length === 0) {
                toast.error("No balanced invoices to post");
                setdisable(false);
                return;
            }

            for (const item of balancedVouchers) {
                try {
                    await createDataFunction("/Voucher/createSystemVoucher", item);
                } catch (err) {
                    //console.log(err);
                    return;
                }
            }

            const balancedInvoiceNumbers = balancedVouchers.map(v => v.VoucherNumber.replace('Pr', ''));

            for (const item of allFalse) {
                if (!balancedInvoiceNumbers.includes(String(item.inv))) continue;
                try {
                    const res = await updateDataFunction(
                        `PurchaseInvoice/Changestatus/${item.id}`,
                        item
                    );

                    await dispatch(updateDatePurchaseInvoice(item));
                } catch (err) {
                    //console.log(err);
                    return;
                }
            }

        }
        setSelectedInvoiceFrom(null)
        setSelectedInvoiceTo(null)
        setIsOpen(false);
    };

    return (
        <>
            <ToastContainer />
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
                        <form className="p-6 space-y-6">
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
                                    disabled={disable}
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
    );
};

export default InvoiceSelectionModal;