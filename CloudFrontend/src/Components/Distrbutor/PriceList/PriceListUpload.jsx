import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import { validateSales, validateSalesData } from '../../Global/CheckUndefind';
import { createDataFunction } from '../../../Api/CRUDFunctions';



const PriceListUpload = () => {
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const Vendor = useSelector((state) => state.Vendor.state)
    const Products = useSelector((state) => state.Product.product);
    const Location = useSelector((state) => state.Location.Location);
    const Store = useSelector((state) => state.Store.Store)
    //console.log(Vendor)
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

        const mergedData = data.reduce((acc, entry) => {
            const key = entry.PriceLIstName;
            let TotalAmount = 0;
            if (!acc[key]) {
                acc[key] = {
                    PriceListName: entry.PriceLIstName,
                    PriceListStatus: "Active",
                    PriceListDate: entry.PriceListDate,
                    PriceListData: [],
                };
            }
            acc[key].PriceListData.push({
                id: Date.now() + Math.random(),
                product: Products.find((item) => item.salesFlowRef == entry.SKU)?._id,
                TO: entry.TO,
                TPSale: entry.TPSale,
                DisPer: entry.DiscountPer,
                NetSale: (Number(entry.TPSale || 0) - Number(entry.TO || 0)) *
                    (1 - Number(entry.DiscountPer || 0) / 100)

            });
            return acc;
        }, {});

        const result = Object.values(mergedData);
        const rus = validateSales(result)
        //console.log(result)
        if (rus.length !== 0) {
            toast.error('Some Error found Excal file Has been download')
            downloadExcel(rus)

        } 
        for (const item of result) {
            try {
                await createDataFunction("/PriceList", item)

            } catch (err) {
                toast.error("Something went wrong")
            }

        }
        toast.success("Something went wrong")

        setTimeout(() => {
            navigate("/PriceList")
        }, 1500);

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

export default PriceListUpload