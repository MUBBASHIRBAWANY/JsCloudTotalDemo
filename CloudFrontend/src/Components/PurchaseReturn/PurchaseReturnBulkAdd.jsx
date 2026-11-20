import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import { ConvetDate } from '../Global/getDate';
import { createDataFunction, getDataFundtion } from '../../Api/CRUDFunctions';
import { validateSales, validateSalesData } from '../Global/CheckUndefind';

const PurchaseReturnBulkAdd = () => {
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
      const Vendor = useSelector((state) => state.Vendor.state)
    const Product1 = useSelector((state) => state.Product.product);
    const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
    const Location = useSelector((state) => state.Location.Location);
    const Store = useSelector((state) => state.Store.Store)
    const TotalProducts = useSelector((state) => state.TotalProducts.TotalProducts);

    const [Products, setProducts] = useState([])
    const navigate = useNavigate()
    const [hide, setHide] = useState(false)
    const getData = async () => {
        if (Product1.length == 0) {
            const data = await getDataFundtion('/product')
            setProducts(data.data)
        } else {
            await setProducts(Product1)
        }
    }

    useEffect(() => {
        getData()
    }, [])

    const downloadExcel = (data, filename = 'data.xlsx') => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, filename);
    };





    const onSubmit = async () => {

        const mergedData = data.reduce((acc, entry) => {

            const key = entry.InvoiceNumber;
            if (!acc[key]) {
                acc[key] = {
                    Vendor: Vendor.find((item) => item.ShortCode == entry.Vendor)?._id,
                    SalesFlowRef: key,
                    PurchaseReturnDate: ConvetDate(entry.Date),
                    PurchaseReturnData: [],
                    Location: Location.find((item) => item.LocationName == entry.Location)?._id,
                    Store: Store.find((item) => item.StoreName == entry.Store)?._id,
                    VendorCode: Vendor.find((item) => item.ShortCode == entry.Vendor).code,
                };
            }
            acc[key].PurchaseReturnData.push({
                id: Date.now() + Math.random(),
                product: Products.find((item) => item.CodeRef === entry.Vendor + entry.SKU)?._id,
                totalBox: Math.abs(entry.ReturnBoxes),
                box : entry.ReturnBoxes,                
                netAmunt: parseFloat(!isNaN(entry.NetReturnAmount) ? Math.abs(entry.NetReturnAmount) : TotalProducts.find((item) => item.ProductName == Products.find((p) => p.CodeRef == entry.Vendor + entry.SKU)?._id
                    && item.Location == Location.find((item) => item.LocationName == entry.Location)?._id && item.Store == Store.find((item) => item.StoreName == entry.Store)?._id
                ).AvgRate * entry.ReturnBoxes) || 0,
                perBoxAmount: parseFloat(!isNaN(entry.Rate) ? Math.abs(entry.NetReturnAmount) : TotalProducts.find((item) => item.ProductName == Products.find((p) => p.CodeRef == entry.Vendor + entry.SKU)?._id
                    && item.Location == Location.find((item) => item.LocationName == entry.Location)?._id && item.Store == Store.find((item) => item.StoreName == entry.Store)?._id
                ).AvgRate).toFixed(5) || 0,
                PerBoxValueGrs: parseFloat(!isNaN(entry.Rate) ? Math.abs(entry.NetReturnAmount) : TotalProducts.find((item) => item.ProductName == Products.find((p) => p.CodeRef == entry.Vendor + entry.SKU)?._id
                    && item.Location == Location.find((item) => item.LocationName == entry.Location)?._id && item.Store == Store.find((item) => item.StoreName == entry.Store)?._id
                ).AvgRate).toFixed(5) || 0,
                unit : Products.find((item) => item.CodeRef === entry.Vendor + entry.SKU).PcsinBox * entry.ReturnBoxes,
                Gst : !isNaN(entry.Gst) ? entry.Gst : 0,
                Condition : entry.Condition
                
            });
            return acc;
        }, {});

        const result = Object.values(mergedData);
        const rus = validateSales(result)
        //console.log(result)
        if (rus.length !== 0) {
            toast.error('Some Error found Excal file Has been download')
            downloadExcel(rus)

        } else {
            const SalesDataValid = validateSalesData(result)
            //console.log(SalesDataValid)
            if (SalesDataValid.length != 0) {
                toast.error('Some Error found Excal file Has been download')
                return downloadExcel(SalesDataValid)

            }
            //console.log(result)

            const postInChunks = async (data, chunkSize = 10) => {
                //console.log(data)

                const chunks = [];
                for (let i = 0; i < data.length; i += chunkSize) {
                    chunks.push(data.slice(i, i + chunkSize));
                }

                try {
                    for (const chunk of chunks) {
                        const res = await createDataFunction("/PurchaseReturn/AddinBulk", { Returninvoices: chunk });
                        //console.log(res)
                   }
                   
                    toast.success("All data added successfully");
                    setTimeout(() => navigate('/PurchaseReturn'), 2000);
                } catch (err) {
                    console.error("Error in chunk:", err);
                    toast.error("Partial data added - some chunks failed");
                }
            };
            postInChunks(result)
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
        <div className='w-full p-6'>
            <ToastContainer />
            <h2>Upload Excel File For Purchase Return</h2>
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

export default PurchaseReturnBulkAdd