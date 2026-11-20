import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';


import { createDataFunction } from '../../../Api/CRUDFunctions';

const CustomerChqBulkAdd = () => {
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const Products = useSelector((state) => state.Product.product);
    const Store = useSelector((state) => state.Store.Store);
    const Location = useSelector((state) => state.Location.Location);
    const Customer = useSelector((state) => state.Client.client);
    const Invoice = useSelector((state) => state.SalesInvoice.SalesInvoice)
    const editOpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
    //console.log(editOpeningInvoices?.[0]?.InvoiceData)
    const navigate = useNavigate()
    const [hide, setHide] = useState(false)


    const downloadExcel = (data, filename = 'data.xlsx') => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, filename);
    };

    const findVendor = (id) => {
        //console.log(id)
        const ven = Vendor.find((item) => item.salesFlowRef == id)?._id
        return (ven)
    }

    const onSubmit = async () => {
        const allChqData = []
        for (const row of data) {
            const invoiceItem = Invoice.find(item => item.SalesFlowRef == row.InvoiceNumber);
            const openingItem = editOpeningInvoices?.[0]?.InvoiceData?.find(item => item.Invoice == row.InvoiceNumber);

            const invoiceNumber = invoiceItem?.SalesInvoice || openingItem?.Invoice;
            const client = invoiceItem?.Client || openingItem?.Client;
            const type = invoiceItem?.SalesInvoice ? "Current" : "Opening";
            const amount = row.ChqAmount ?? row.Amount;

            const dataCheque = {
                ChqDate: row.ReciveDate,
                Customer: client,
                PaymentDetail: [{ Type: "Chq", Amount: row.Amount, ChqNumber: row.ChqNumber }],
                table: [{
                    chq: row.ChqNumber,
                    ChqDate: row.ReciveDate,
                    Amount: amount,
                    id: Date.now() + Math.random().toString(36).substring(2, 15),
                    RealizeDate: row.ChqDate,
                    status: "Pending",
                    Invoice: invoiceNumber,
                }],
                grouped: [{
                    chq: row.ChqNumber,
                    status: "Pending",
                    items: [{
                        RealizeDate: row.ChqDate,
                        status: "Pending",
                        chq: row.ChqNumber,
                        Invoice: invoiceNumber,
                        Type: type,
                        Amount: amount
                    }]
                }],
                status: "Pending",
                invoiceArray: [{
                    invoice: invoiceNumber,
                    Amount: amount,
                    type: type
                }]
            };
            allChqData.push(dataChq)
        }
        allChqData.filter((item) => item.Customer !== undefined)
        for (const item of allChqData) {
            try {
                //console.log(item)
                await createDataFunction("/CustomerChqRecived", item)
                toast.success("Cheque Added Successfully")
                setTimeout(() => {
                    navigate('/CustomerChqList')
                }, 2000);
            } catch (err) {
                //console.log(err)
                if (err.response.status) {
                    //console.log(err.response.data.invalidInvoices)
                    return toast.error(`Invoice ${err.response.data.invalidInvoices[0].invoice} ${err.response.data.invalidInvoices[0].reason} `)
                }
                toast.error("Failed to add Cheque Book")
            }
        }
    };





    const handleFileUpload = (e) => {
        setHide(true)
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Get the first worksheet
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Get headers if needed
            const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];

            setData(jsonData);
            setHeaders(firstRow);
        };

        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="p-6 w-full">
            <ToastContainer />
            <h2>Upload Excel File</h2>
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
            />



            {data.length > 0 && (
                <div>
                    <h3>Data:</h3>
                    <div className="overflow-x-auto rounded-lg border pd-border-default border shadow-md h-[60vh]">
                        <table className="min-w-full divide-y divide-[color:var(--pd-border-card)] bg-white">
                            <thead className="pd-bg-muted">
                                <tr>
                                    {headers.map((header, index) => (
                                        <th
                                            key={index}
                                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider pd-text-muted"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[color:var(--pd-border-card)]">
                                {data.map((row, rowIndex) => (
                                    <tr
                                        key={rowIndex}
                                        className={rowIndex % 2 === 0 ? 'bg-white' : 'pd-bg-muted'}
                                    >
                                        {headers.map((header, colIndex) => (
                                            <td
                                                key={colIndex}
                                                className="whitespace-nowrap px-6 py-4 text-sm pd-text-body"
                                            >
                                                {row[header]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            )}
            <br />

{hide && <input type="submit" onClick={onSubmit} className='text-white bg-blue-700 cursor-pointer hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none' />}        </div>
    )
}

export default CustomerChqBulkAdd