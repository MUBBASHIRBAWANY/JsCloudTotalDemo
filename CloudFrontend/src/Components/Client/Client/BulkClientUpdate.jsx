import axios from 'axios';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { generateNextCodeForCat } from '../../Global/GenrateCode';
import { toast, ToastContainer } from 'react-toastify';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import { ConvetDate } from '../../Global/getDate';

const BulkClientUpdate = () => {
    const [data, setData] = useState([]);
    const navigate = useNavigate()
    const [hide, setHide] = useState(false)
        const [headers, setHeaders] = useState([]);
    
    const allClient = useSelector((state) => state.Client.client)


    const onSubmit = async () => {
        
        const Values = data.map((item, index) => ({
            NTN: item.NTN,
            Registered: item.Registered == "Registered" ? "1" : "2",
            id : allClient.find((c)=> c.SalesFlowRef === item.SalesFlowRef)?._id
        }));
        
        const filterValues = Values.filter((item)=> item.id == undefined)
        console.log(filterValues)
            try {
                // for (const item of filterValues) {
                    
                //     await updateDataFunction(`/customer/updatCustomer/${item.id}`, item)
                // }
                // toast.success("All data update successfully");
                // setTimeout(() => navigate('/ClientList'), 2000);
            } catch (err) {
                console.error("Error in chunk:", err);
                toast.error("Partial data added - some chunks failed");
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
        <div>
            <ToastContainer />
            <h2>Upload Excel File</h2>
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
            />



            
            <br />
{hide && <input type="submit" onClick={onSubmit} className='text-white bg-blue-700 cursor-pointer hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none' />}        </div>
    )
}

export default BulkClientUpdate