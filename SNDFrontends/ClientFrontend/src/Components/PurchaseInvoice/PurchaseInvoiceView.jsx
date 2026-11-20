import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, deleteDataFunction, getDataFundtion, updateDataFunction } from '../../Api/CurdFunctions';
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun } from "docx";
import { saveAs } from "file-saver";
import { updateDatePurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';

const PurchaseInvoiceView = () => {
    const companyInfo = {
        name: "Pearl Daynamic",
        address: "123 Commerce Street, Business District",
        city: "New York, NY 10001",
        phone: "+1 (555) 123-4567",
        email: "orders@premiumdistributors.com",
        website: "www.premiumdistributors.com"
    };
    const dispatch = useDispatch()

    const navigate = useNavigate();
    const { id } = useParams();
    const [status, setStatus] = useState(false);
    const PurchaseInvoice = useSelector((state) => state.PurchaseInvoice.PurchaseInvoice);
    const ChartofAccounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const Vendor = useSelector((state) => state.Vendor.state);
    const Products = useSelector((state) => state.Product.product);
    const editInvoice = PurchaseInvoice.find((item) => item._id === id);
    const [tableData, setTableData] = useState([]);
    const [voucherData, setVoucherData] = useState([])
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const Store = useSelector((state) => state.Store.Store)
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)

    console.log(Admin)
    useEffect(() => {
        if (editInvoice) {
            setTableData(editInvoice.PurchaseData || []);
            setStatus(editInvoice.PostStatus || false);
        }
    }, [editInvoice]);

    const getProductName = (productId) => {
        const product = Products.find((p) => p._id === productId);
        return product ? `${product.ProductName}` : 'N/A';
    };


    const Voucher = async (id) => {
        const data = await getDataFundtion(`/Voucher/getVoucherByNumber/Pr${editInvoice.PurchaseInvoice}`)
        console.log(data)
        setVoucherData(data.data[0])
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
    const AccountCode = Vendor.find((item) => item._id === editInvoice?.Vendor)?.AccountCode
    console.log(AccountCode, "AccountCode")
    console.log(AdvanceTax)
    const handlePostUnpost = async (action) => {
        console.log(action)
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
                Debit: totalGST,
                store: editInvoice.Store,
            },

            {
                Account: ChartofAccounts.find((item) => item.AccountCode === AccountCode)._id,
                Credit: netAmuntWithAdvnaceTax,
                store: editInvoice.Store,
            },

        ]
            .filter(
                item => (item.Debit ?? 0) !== 0 || (item.Credit ?? 0) !== 0
            );
        console.log(VoucharData)
        try {
            const AccountData = {
                VoucherType: "Pr",
                VoucherDate: editInvoice.PurchaseInvoiceDate,
                status: "Post",
                VoucherNumber: `Pr${editInvoice?.PurchaseInvoice}`,
                VoucharData: VoucharData
            }

            console.log(AccountData)
            let accountsRes = ''
            if (action === true) {

                accountsRes = await createDataFunction('/Voucher/createSystemVoucher', AccountData)
            }
            else {
                const deletevoucher = await deleteDataFunction(`/Voucher/deleteVoucher/Pr${editInvoice.PurchaseInvoice}`)
            }

            const res = await updateDataFunction(`/PurchaseInvoice/Changestatus/${id}`, { status: action, data: editInvoice.PurchaseData, Location: editInvoice.Location, Store: editInvoice.Store, VoucherRef: accountsRes?.voucher?._id || "" });
            console.log(res)
            dispatch(updateDatePurchaseInvoice({id : id, status: action || "" }))
            toast.success(`Invoice ${action} successfully!`);
            setStatus(action);
            setTimeout(() => navigate('/PurchaseInvoiceList'), 1500);
        } catch (error) {
            toast.error(`Error ${action} invoice: ${error.message}`);
        }
    };
    // Export to Excel
  const exportToExcel = () => {
    const headerInfo = [
        { Field: "Invoice Number", Value: editInvoice?.PurchaseInvoice },
        { Field: "Invoice Date", Value: new Date(editInvoice?.PurchaseInvoiceDate).toLocaleDateString('en-GB') },
        { Field: "Vendor", Value: Vendor.find(v => v._id === editInvoice?.Vendor)?.VendorName },
    ];

    const worksheet = XLSX.utils.json_to_sheet(headerInfo);

    XLSX.utils.sheet_add_json(
        worksheet,
        tableData.map(row => ({
            Product: getProductName(row.product),
            Unit: row.unit,
            CTN: row.carton,
            Box: row.box,
            RetailValue: row.RetailValue,
            GrossAmount: row.GrossAmount,
            Discount: row.discount,
            AfterDiscount: row.ValueAfterDiscout,
            GST: row.Gst,
            ValueWithGst: row.ValuewithGst,
            AfterTaxDiscount: row.AfterTaxdiscount,
            NetAmount: row.netAmunt
        })),
        { origin: "A6" } // Start table after header info
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PurchaseInvoice");
    XLSX.writeFile(workbook, `PurchaseInvoice_${editInvoice?.PurchaseInvoice}.xlsx`);
};


    // Export to PDF
    const exportToPDF = () => {
    const doc = new jsPDF();

    // Header info
    doc.setFontSize(14);
    doc.text(`Purchase Invoice: ${editInvoice?.PurchaseInvoice}`, 14, 20);
    doc.text(`Invoice Date: ${new Date(editInvoice?.PurchaseInvoiceDate).toLocaleDateString('en-GB')}`, 14, 28);
    doc.text(`Vendor: ${Vendor.find(v => v._id === editInvoice?.Vendor)?.VendorName}`, 14, 36);

    // Table
    autoTable(doc, {
        startY: 54,
        head: [['Product', 'Unit', 'CTN', 'Box', 'Retail Value', 'Gross Amount', 'Discount', 'After Discount', 'GST', 'Value with GST', 'After Tax Discount', 'Net Amount']],
        body: tableData.map(row => [
            getProductName(row.product),
            row.unit,
            row.carton,
            row.box,
            row.RetailValue,
            row.GrossAmount,
            row.discount,
            row.ValueAfterDiscout,
            row.Gst,
            row.ValuewithGst,
            row.AfterTaxdiscount,
            row.netAmunt
        ])
    });

    doc.save(`PurchaseInvoice_${editInvoice?.PurchaseInvoice}.pdf`);
};


    // Export to Word
   const exportToWord = async () => {
    const headerRows = [
        ["Invoice Number", editInvoice?.PurchaseInvoice],
        ["Invoice Date", new Date(editInvoice?.PurchaseInvoiceDate).toLocaleDateString('en-GB')],
        ["Vendor", Vendor.find(v => v._id === editInvoice?.Vendor)?.VendorName],
    ].map(([label, value]) =>
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: label, bold: true })] }),
                new TableCell({ children: [new Paragraph(String(value ?? ''))] })
            ]
        })
    );

    const tableRows = [
        new TableRow({
            children: [
                'Product','Unit','CTN','Box','Retail Value','Gross Amount','Discount','After Discount','GST','Value with GST','After Tax Discount','Net Amount'
            ].map(h => new TableCell({ children: [new Paragraph({ text: h, bold: true })] }))
        }),
        ...tableData.map(row =>
            new TableRow({
                children: [
                    getProductName(row.product),
                    row.unit,
                    row.carton,
                    row.box,
                    row.RetailValue,
                    row.GrossAmount,
                    row.discount,
                    row.ValueAfterDiscout,
                    row.Gst,
                    row.ValuewithGst,
                    row.AfterTaxdiscount,
                    row.netAmunt
                ].map(v => new TableCell({ children: [new Paragraph(String(v ?? ''))] }))
            })
        )
    ];

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: `Purchase Invoice - ${editInvoice?.PurchaseInvoice}`, heading: "Heading1" }),
                new Table({ rows: headerRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
                new Paragraph({ text: "" }), // spacing
                new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } })
            ]
        }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `PurchaseInvoice_${editInvoice?.PurchaseInvoice}.docx`);
};


    // Print Invoice
const printInvoice = () => {
    const printContent = document.getElementById("invoiceView").innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Invoice</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .print-header h1 {
              font-size: 24px;
              margin-bottom: 5px;
            }
            .print-header p {
              margin: 3px 0;
            }
            .invoice-title {
              text-align: center;
              font-size: 20px;
              margin: 20px 0;
              font-weight: bold;
            }
            .invoice-details {
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 13px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 6px 8px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .total-row {
              font-weight: bold;
              background-color: #f0f0f0;
            }
            .print-footer {
            font-size: 12px;
            text-align: center;
            color: #555;
            border-top: 1px solid #ccc;
            padding-top: 10px;
            margin-top: 15vw;
          }
    .watermark {
              position: fixed;
              top: 70%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.1;
              z-index: 1;
              width: 500px; /* adjust as needed */
            }

          </style>
        </head>
        <body>
        <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755944631/Screenshot_2025-08-23_152337_ajpexh.png" class="watermark" />
          <div class="print-header">
            <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755944631/Screenshot_2025-08-23_152337_ajpexh.png" />
          </div>
          
          <div class="invoice-title">Purchase INVOICE</div>
          
          <div class="invoice-details">
            <p><strong>Invoice Number:</strong> ${editInvoice.PurchaseInvoice}</p>
            <p><strong>Date:</strong> ${editInvoice.PurchaseInvoiceDate}</p>
            <p><strong>Vendor:</strong> ${Vendor.find(v => v._id === editInvoice?.Vendor)?.VendorName}</p>
          </div>
          
          ${printContent}
          
          <div class="print-footer">
            | Website: 
            <a href="https://jaffersons.com/" target="_blank">https://jaffersons.com/</a> | 
            
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

    console.log(voucherData)
    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <ToastContainer />
            <div >
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Purchase Invoice View</h1>
                    <div className="flex gap-4">

                        {status === false && (
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
                                    onClick={() => Voucher(editInvoice.VoucherRef)}
                                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Voucher
                                </button>
                                <button
                                    onClick={() => handlePostUnpost(false)}
                                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    Unpost Invoice
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => navigate('/PurchaseInvoiceList')}
                            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Back to List
                        </button>
                        <button onClick={exportToExcel} className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800">Excel</button>
                        <button onClick={exportToWord} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Word</button>
                        <button onClick={exportToPDF} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">PDF</button>
                        <button onClick={printInvoice} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Print</button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-600">Invoice Number</label>
                            <p className="text-lg font-medium text-gray-800">{editInvoice?.PurchaseInvoice}</p>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-600">Invoice Date</label>
                            <p className="text-lg font-medium text-gray-800">
                                {new Date(editInvoice?.PurchaseInvoiceDate).toLocaleDateString('en-GB')}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-600">Vendor</label>
                            <p className="text-lg font-medium text-gray-800">
                                {Vendor.find(v => v._id === editInvoice?.Vendor)?.VendorName}
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border"  id="invoiceView">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Product',  'CTN',  'Trade Value', 'Per Caton Value', 'Discount',  'GST', "Value with Gst",  'Net Amount'].map((header) => (
                                        <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tableData.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {getProductName(row.product)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.carton}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.GrossAmount?.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.PerBoxValueGrs}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.discount || 0}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.Gst}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.ValuewithGst}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{row.netAmunt}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 font-semibold">
                                <tr>
                                    <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{totalCarton}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{totalGrossAmount.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{totalDiscount}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{totalGST.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{totalGST}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{totalValuewithGst}</td>
                                    <td className="px-6 py-4 text-sm text-blue-600">{totalNetAmount}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                {voucherData?.length !== 0 ? (
                    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-2">📄 Voucher Details</h2>
                        <div className="grid grid-cols-2 gap-4 text-gray-700">
                            <div><strong>Voucher Number:</strong>{voucherData.VoucherNumber}</div>
                            <div><strong>Voucher Date:</strong> {voucherData.VoucherDate}</div>
                            <div><strong>Voucher Type:</strong> {voucherData.VoucherType}</div>
                            <div><strong>Status:</strong> {voucherData.status}</div>
                        </div>
                    </div>

                    {/* Table */}
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">💰 Voucher Entries</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200 text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 border">#</th>
                                        <th className="px-4 py-2 border">Account</th>
                                        <th className="px-4 py-2 border">Debit</th>
                                        <th className="px-4 py-2 border">Credit</th>
                                        <th className="px-4 py-2 border">Store</th>
                                    </tr>
                                </thead>
                                <tbody>

                                    {voucherData.VoucharData?.map((item, index) => (

                                        <tr key={index} className="text-center hover:bg-gray-50">
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
                ) : null }
            </div>
        </div>
    );
};

export default PurchaseInvoiceView;