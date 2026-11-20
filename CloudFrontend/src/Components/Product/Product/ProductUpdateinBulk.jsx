import axios from 'axios';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { generateNextCodeForCat } from '../../Global/GenrateCode';
import { toast, ToastContainer } from 'react-toastify';
import { createDataFunction, updateDataFunction } from '../../../Api/CRUDFunctions';
import ExcelExport from '../../Global/ExcalData';
import { validateArray, validateSales } from '../../Global/CheckUndefind';

const ProductUpdateinBulk = () => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const Product = useSelector((state) => state.Product.product)
  console.log(Product)
  const navigate = useNavigate()
  const [hide, setHide] = useState(false)


  const downloadExcel = (data, filename = 'data.xlsx') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, filename);
  };


  const onSubmit = async () => {
    
    const Values = data.map((item) => ({
      id: Product.find((p) => p.CodeRef == item.Vendor + item.Sku)?._id,
      TPSale : item.TPSale,
      

    }));
    //console.log(Values)
    const result = Values.filter(obj =>
      Object.values(obj).some(value => value === undefined)
    );
    //console.log(result)
    if (result.length === 0) {
      for (const chunk of Values) {
        await updateDataFunction(`/product/updateProduct/${chunk.id}`, chunk);
      }
      toast.success("All data added successfully");
      setTimeout(() => navigate('/ProductList'), 2000);

    } else {
      toast.error("some error forund excal dowmloaded")
      return downloadExcel(result)
    }

  }

  // const postInChunks = async (data, chunkSize = 20) => {
  //   //console.log(data)

  //   const chunks = [];
  //   for (let i = 0; i < data.length; i += chunkSize) {
  //     chunks.push(data.slice(i, i + chunkSize));
  //   }



  //   try {
  //     for (const chunk of chunks) {
  //       await createDataFunction("/product/AddinBulk", chunk);
  //     }
  //     toast.success("All data added successfully");
  //     setTimeout(() => navigate('/ProductList'), 2000);
  //   } catch (err) {
  //     console.error("Error in chunk:", err);
  //     toast.error("Partial data added - some chunks failed");
  //   }
  // };


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

export default ProductUpdateinBulk