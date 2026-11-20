import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import { ConvetDate } from '../../Components/Global/getDate';
import { createDataFunction } from '../../Api/CRUDFunctions';

const TransferOutBuklAdd = () => {
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

        const mergedData = data.reduce((acc, entry) => {
            const key = entry.SalesFlowRef;
            if (!acc[key]) {
                
                acc[key] = {
                    LocationFrom: Location.find((item) => item.LocationName == entry.LocationFrom)?._id,
                    StoreFrom: Store.find((item) => item.StoreName == entry.StoreFrom)?._id,
                    SalesFlowRef: key,
                    TransferOutDate: ConvetDate(entry.Date),
                    LocationTo: Location.find((item) => item.LocationName == entry.LocationTo)?._id || "",
                    StoreTo: Store.find((item) => item.StoreName == entry.StoreTo)?._id || "",
                    Account: entry.Account == undefined ? "" : Account.find((item) => item.AccountName.toLowerCase() == entry.Account.toLowerCase())?._id || "",
                    TransferData: [],
                    TransferType: entry.Account == undefined ? "Internale"  : "External Transfer Out" ,
                    
                };
            }
            acc[key].TransferData.push({
                id: Date.now() + Math.random(),
                product: Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?._id,
                box: entry.Box,
                unit: Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.PcsinBox * entry.Box,
                totalBox: entry.Box,
                Reason: entry.Reason,
                Rate: Number(TotalProducts.find((PR) => PR.ProductName == Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?._id && PR.Store == Store.find((Str) => Str.StoreName == entry.StoreFrom)?._id )?.AvgRate || 0).toFixed(5),
                GrossAmount: Number(TotalProducts.find((PR) => PR.ProductName == Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?._id && PR.Store == Store.find((Str) => Str.StoreName == entry.StoreFrom)?._id )?.AvgRate || 0).toFixed(5) * entry.Box,
            });
            return acc;
        }, {});

        const result = Object.values(mergedData);
        //console.log(result)
        const postInChunks = async (data, chunkSize = 20) => {
            //console.log(data)

            const chunks = [];
            for (let i = 0; i < data.length; i += chunkSize) {
                chunks.push(data.slice(i, i + chunkSize));
            }

            try {
                for (const chunk of chunks) {
                    const res = await createDataFunction("/TransferOut/PushinBulk", { transfers: chunk });
                    //console.log(res)
                }
                toast.success("All data added successfully");
                setTimeout(() => navigate('/TransferOutList'), 2000);
            } catch (err) {
                console.error("Error in chunk:", err);
                toast.error("Partial data added - some chunks failed");
            }
        };

        const result1 = result.filter(obj =>
            Object.values(obj).some(value => value === undefined)
        );
        //console.log(result1)
        if (result1.length === 0) {
            //console.log(result)
           postInChunks(result)

        } else {
            toast.error("some error forund excal dowmloaded")
            return downloadExcel(result1)
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
                        <table className="pd-data-table min-w-full">
                            <thead>
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
                                        
                                    >
                                        {headers.map((header, colIndex) => (
                                            <td
                                                key={colIndex}
                                                className="whitespace-nowrap px-6 py-4 text-sm"
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

export default TransferOutBuklAdd