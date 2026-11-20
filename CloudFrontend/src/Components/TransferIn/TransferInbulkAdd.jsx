import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import { ConvetDate } from '../../Components/Global/getDate';
import { createDataFunction } from '../../Api/CRUDFunctions';

const TransferInBuklAdd = () => {
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const Vendor = useSelector((state) => state.Vendor.state)
    const Products = useSelector((state) => state.Product.product);
    const Location = useSelector((state) => state.Location.Location);
    const Store = useSelector((state) => state.Store.Store)
    const TotalProducts = useSelector((state) => state.TotalProducts.TotalProducts);
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    //console.log(Vendor)
    const navigate = useNavigate()
    const [hide, setHide] = useState(false)


    const findVendor = (id) => {
        //console.log(id)
        const ven = Vendor.find((item) => item.salesFlowRef == id)?._id
        return (ven)
    }

    const onSubmit = async () => {
console.log(Location , Store)
        const mergedData = data.reduce((acc, entry) => {
            const key = entry.SalesFlowRef;
            if (!acc[key]) {
                acc[key] = {
                    TransferCode: entry.SalesFlowRef,
                    SalesFlowRef: entry.SalesFlowRef,
                    Account: Account.find((item) => item.AccountName.toLowerCase() == entry.Account.toLowerCase())?._id,
                    TransferInDate: ConvetDate(entry.Date),
                    LocationTo: Location.find((item) => item.LocationName == entry.Location)?._id,
                    StoreTo: Store.find((item) => item.StoreName == entry.Store)?._id,
                    TransferData: [],
                    PostStatus: "External Transfer",
                    TransferType: "External Transfer"
                };
            }
            acc[key].TransferData.push({
                id: Date.now() + Math.random(),
                product: Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?._id,
                box: entry.Box,
                totalBox: entry.Box,
               Rate: Number(Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase || 0).toFixed(5) || 0,
                GrossAmount: Number(Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase || 0).toFixed(5) * entry.Box,
            });
            return acc;
        }, {});

        const result = Object.values(mergedData);
        console.log(result)
        const result1 = result.filter(obj =>
            Object.values(obj).some(value => value === undefined)
        );
        console.log(result1)
        if (result1.length === 0) {

            try {
                for (const item of result) {
                    //console.log(item)
                    const res = await createDataFunction("/TransferIn", item);
                    //console.log(res)
                }
                toast.success("All data added successfully");
                setTimeout(() => navigate('/Transferinlist'), 2000);
            } catch (err) {
                console.error("Error in chunk:", err);
                toast.error("Partial data added - some chunks failed");

            };

        } else {
            //console.log(result1)
            toast.error("some error forund excal dowmloaded")
            
        }
    }




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

export default TransferInBuklAdd