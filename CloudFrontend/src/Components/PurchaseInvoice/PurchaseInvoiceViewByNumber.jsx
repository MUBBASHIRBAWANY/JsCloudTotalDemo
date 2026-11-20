import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppSelect from '../Global/AppSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, deleteDataFunction, getDataFundtion, updateDataFunction } from '../../Api/CRUDFunctions';

const PurchaseInvoiceViewByNumber = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [status, setStatus] = useState(false);
    const PurchaseInvoice = useSelector((state) => state.PurchaseInvoice.PurchaseInvoice);
    const [Vendor , setVendor] = useState([]);
    const [Products, setProducts  ] = useState([]);
    const [editInvoice, setEditInvoice] = useState([])
    const [tableData, setTableData] = useState([]);
    const [voucherData, setVoucherData] = useState([])
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const Store = useSelector((state) => state.Store.Store)
    const [Accounts , setAccounts] = useState([])
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const PostPurchase = UserRihts.find((item) => item == "Post Purchase")
    const UnPostPurchase = UserRihts.find((item) => item == "UnPost Purchase")



    const getData = async () => {
        const data = await getDataFundtion(`/PurchaseInvoice/getPrInvByNumber/${id}`)
        setEditInvoice(data.data)
        //console.log(data)
        setVendor([data.Vendor])
        setProducts(data.Product)
    }   
    useEffect(() => {
        getData()
    },[])

    useEffect(() => {
        if (editInvoice) {
            setTableData(editInvoice.PurchaseData || []);
            setStatus(editInvoice.PostStatus || false);
        }
    }, [editInvoice]);

    const getProductName = (productId) => {
        const product = Products.find((p) => p._id === productId);
        return product ? `${product.mastercode} ${product.ProductName}` : 'N/A';
    };


    const Voucher = async (id) => {
        const data = await getDataFundtion(`/Voucher/getVoucherByNumber/Pr${editInvoice.PurchaseInvoice}`)
        //console.log(data)
        setVoucherData(data.data)
        setAccounts(data.Accounts)
    }



    // Calculate totals
    const totalDiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0);
    const totalGST = tableData.reduce((sum, row) => sum + (parseFloat(row.Gst) || 0), 0);
    const totalBox = tableData.reduce((sum, row) => sum + (parseInt(row.box) || 0), 0);
    const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);
    const totalUnit = tableData.reduce((sum, row) => sum + (parseInt(row.unit) || 0), 0);
    const totalGrossAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.GrossAmount) || 0), 0);
    const totalValueAfterDiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.ValueAfterDiscout) || 0), 0);
    const totalRetailValue = tableData.reduce((sum, row) => sum + (parseFloat(row.RetailValue) || 0), 0);
    const totalValuewithGst = tableData.reduce((sum, row) => sum + (parseFloat(row.ValuewithGst) || 0), 0)
    const netAmuntWithAdvnaceTax = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmuntWithAdvnaceTax) || 0), 0)
    const AdvanceTax = tableData.reduce((sum, row) => sum + (parseFloat(row.AdvanceTax) || 0), 0)
    const AfterTaxdiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.AfterTaxdiscount) || 0), 0)
    const totalNetAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0);

    //console.log(AdvanceTax)
    const handlePostUnpost = async (action) => {
        //console.log(action)
        const VoucharData = [
            {
                Account: Admin.finishedGoods,
                Debit: totalGrossAmount,
                store: editInvoice.Store,
            },
            {
                Account: Admin.PurchaseDiscount,
                Credit: totalDiscount,
                store: editInvoice.Store,
            },
            {
                Account: Admin.TradeDiscount,
                Credit: AfterTaxdiscount,
                store: editInvoice.Store,
            },
            {
                Account: Admin.Gst,
                Debit: totalGST + Number(editInvoice.GST || 0),
                store: editInvoice.Store,
            },
            {
                Account: Admin.AdvanceTax,
                Debit: AdvanceTax,
                store: editInvoice.Store,
            },
            {
                Account: Admin.Vendor,
                Credit: netAmuntWithAdvnaceTax,
                store: editInvoice.Store,
            },

        ]
            .filter(
                item => (item.Debit ?? 0) !== 0 || (item.Credit ?? 0) !== 0
            );
        //console.log(VoucharData)
        try {
            const AccountData = {
                VoucherType: "Pr",
                VoucherDate: editInvoice.PurchaseInvoiceDate,
                status: "Post",
                VoucherNumber: `Pr${editInvoice?.PurchaseInvoice}`,
                VoucharData: VoucharData
            }

            //console.log(AccountData)
            let accountsRes = ''
            if (action === true) {

                accountsRes = await createDataFunction('/Voucher/createSystemVoucher', AccountData)
            }
            else {
                const deletevoucher = await deleteDataFunction(`/Voucher/deleteVoucher/Pr${editInvoice.PurchaseInvoice}`)
            }

            const res = await updateDataFunction(`/PurchaseInvoice/Changestatus/${id}`, { status: action, data: editInvoice.PurchaseData, Location: editInvoice.Location, Store: editInvoice.Store, VoucherRef: accountsRes?.voucher?._id || "" });
            //console.log(res)
            toast.success(`Invoice ${action} successfully!`);
            setStatus(action);
            setTimeout(() => navigate('/PurchaseInvoiceList'), 1500);
        } catch (error) {
            toast.error(`Error ${action} invoice: ${error.message}`);
        }
    };
    //console.log(voucherData)
    return (
        <div className="p-6 pd-bg-muted min-h-screen">
            <ToastContainer />
            <div >
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold pd-text-body">Purchase Invoice View</h1>
                    <div className="flex gap-4">

                        {status === false && PostPurchase && (
                            <>
                                <button
                                    onClick={() => handlePostUnpost(true)}
                                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                >
                                    Post Invoice
                                </button>
                            </>
                        )}
                        {status === true && (
                            <>
                                <button
                                    onClick={() => Voucher(editInvoice.PurchaseInvoice)}
                                    className="pd-btn-save transition-colors"
                                >
                                    Voucher
                                </button>
                                {UnPostPurchase && (
                                    <button
                                        onClick={() => handlePostUnpost(false)}
                                        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        Unpost Invoice
                                    </button>
                                )}
                            </>
                        )}
                        <button
                            onClick={() => navigate('/PurchaseInvoiceList')}
                            className="pd-btn-outline transition-colors"
                        >
                            Back to List
                        </button>
                    </div>
                </div>

                <div className="pd-bg-surface rounded-xl shadow-lg p-8 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="space-y-2">
                            <label className="pd-label">Invoice Number</label>
                            <p className="text-lg font-medium pd-text-body">{editInvoice?.PurchaseInvoice}</p>
                        </div>
                        <div className="space-y-2">
                            <label className="pd-label">Invoice Date</label>
                            <p className="text-lg font-medium pd-text-body">
                                {new Date(editInvoice?.PurchaseInvoiceDate).toLocaleDateString('en-GB')}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="pd-label">Vendor</label>
                            <p className="text-lg font-medium pd-text-body">
                                {Vendor.find(v => v._id === editInvoice?.Vendor)?.VendorName}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="pd-label">Sales Flow Ref</label>
                            <p className="text-lg font-medium pd-text-body">{editInvoice?.PurchaseInvoice}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                        <table className="min-w-full divide-y divide-[color:var(--pd-border-card)]">
                            <thead>
                                <tr>
                                    {['Product', 'Unit', 'CTN', 'Box', 'Retail Value', 'Trade Value', 'Per Box Value', 'Discount', 'After Discount', 'GST', "Value with Gst", "Discount After Gst", 'Net Amount'].map((header) => (
                                        <th key={header} className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="pd-bg-surface divide-y divide-[color:var(--pd-border-card)]">
                                {tableData.map((row) => (
                                    <tr key={row.id} >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">
                                            {getProductName(row.product)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.unit}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.carton}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.box}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.RetailValue?.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.GrossAmount?.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.PerBoxValueGrs}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.discount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.ValueAfterDiscout?.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.Gst}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{row.ValuewithGst}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">{parseFloat(row.AfterTaxdiscount || 0)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium pd-text-primary">{row.netAmunt}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="pd-bg-muted font-semibold">
                                <tr>
                                    <td className="px-6 py-4 text-sm pd-text-body">Total</td>
                                    <td className="px-6 py-4 text-sm pd-text-body">{totalUnit}</td>
                                    <td className="px-6 py-4 text-sm pd-text-body">{totalCarton}</td>
                                    <td className="px-6 py-4 text-sm pd-text-body">{totalBox}</td>
                                    <td className="px-6 py-4 text-sm pd-text-body">{totalRetailValue.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm pd-text-body">{totalGrossAmount.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm pd-text-body"></td>
                                    <td className="px-6 py-4 text-sm pd-text-body">{totalDiscount}</td>
                                    <td className="px-6 py-4 text-sm pd-text-body">{totalValueAfterDiscount.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm pd-text-body">{totalGST.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm pd-text-body">{totalValuewithGst}</td>
                                    <td className="px-6 py-4 text-sm pd-text-body">{AfterTaxdiscount}</td>
                                    <td className="px-6 py-4 text-sm pd-text-primary">{totalNetAmount}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                <div className="p-6 pd-bg-surface rounded-lg shadow-md max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold pd-text-body mb-2">📄 Voucher Details</h2>
                        <div className="grid grid-cols-2 gap-4 pd-text-body">
                            <div><strong>Voucher Number:</strong>{voucherData.VoucherNumber}</div>
                            <div><strong>Voucher Date:</strong> {voucherData.VoucherDate}</div>
                            <div><strong>Voucher Type:</strong> {voucherData.VoucherType}</div>
                            <div><strong>Status:</strong> {voucherData.status}</div>
                        </div>
                    </div>

                    {/* Table */}
                    <div>
                        <h3 className="pd-page-title mb-4">💰 Voucher Entries</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full pd-bg-surface border pd-border-default border text-sm">
                                <thead className="pd-bg-muted">
                                    <tr>
                                        <th className="px-4 py-2 border">#</th>
                                        <th className="px-4 py-2 border">Account</th>
                                        <th className="px-4 py-2 border">Debit</th>
                                        <th className="px-4 py-2 border">Credit</th>
                                        <th className="px-4 py-2 border">Department</th>
                                    </tr>
                                </thead>
                                <tbody>

                                    {voucherData.VoucharData?.map((item, index) => (

                                        <tr key={index} className="text-center hover:pd-bg-muted">
                                            <td className="px-4 py-2 border">{index + 1}</td>
                                            <td className="px-4 py-2 border">{Accounts.find((ac) => ac._id === item.Account)?.AccountName}({Accounts.find((ac) => ac._id === item.Account)?.AccountCode})</td>
                                            <td className="px-4 py-2 border">
                                                {item.Debit !== undefined ? item.Debit.toLocaleString() : '–'}
                                            </td>
                                            <td className="px-4 py-2 border">
                                                {item.Credit !== undefined ? item.Credit.toLocaleString() : '–'}
                                            </td>
                                            <td className="px-4 py-2 border"> {Store.find((st) => st._id === item.store).StoreName}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseInvoiceViewByNumber;