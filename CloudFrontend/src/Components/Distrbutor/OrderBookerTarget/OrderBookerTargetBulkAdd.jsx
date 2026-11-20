import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import { validateSalesData, validateSales } from '../../Global/CheckUndefind';
import { ConvetDate } from '../../Global/getDate';
import { createDataFunction } from '../../../Api/CRUDFunctions';
// import { validateSales, validateSalesData } from '../Global/CheckUndefind';

const OrderBookerTargetBulkAdd = () => {
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const Vendor = useSelector((state) => state.Vendor.state)
    const Products = useSelector((state) => state.Product.product);
    console.log(Products)
    const Location = useSelector((state) => state.Location.Location);
    const Store = useSelector((state) => state.Store.Store)
    const EditOrderBooker = useSelector((state) => state.DistributorOrderBooker.DistributorOrderBooker)
    //console.log(Vendor)
    const navigate = useNavigate()
    const [hide, setHide] = useState(false)

    const downloadExcel = (data, filename = 'data.xlsx') => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, filename);
    };


    const onSubmit = async () => {

        const mergedData = data.reduce((acc, entry) => {
            const key = entry.OrderBooker;
            let TotalAmount = 0;
            if (!acc[key]) {
                acc[key] = {
                    Month: entry.Month,
                    TargetData: [],
                    OrderBooker: EditOrderBooker.find(
                        (ob) =>
                            ob.code?.toLowerCase() === entry.OrderBooker?.toLowerCase()
                    )?._id,
                };
            }
            acc[key].TargetData.push({

                id: Date.now() + Math.random(),
                product: Products.find((item) => item.salesFlowRef == entry.Product)?._id,
                carton: entry.QTY || 0,
            });
            return acc;
        }, {});

        const result = Object.values(mergedData);
        

        for (const item of result) {

            const res = await createDataFunction("/Target" , item)
            console.log(res)
        }
        toast.success("Hogia")

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
        <div>
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
                    <div className="overflow-x-auto rounded-lg border pd-border-default border shadow-md">
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

            {hide && <input type="submit" onClick={onSubmit} className='pd-btn-save me-2 mb-2 focus:outline-none w-[5%] mx-5 my-5' />}
        </div>
    )
}

export default OrderBookerTargetBulkAdd