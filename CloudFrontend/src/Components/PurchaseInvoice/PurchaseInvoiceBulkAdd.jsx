import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import { ConvetDate } from '../../Components/Global/getDate';
import { createDataFunction } from '../../Api/CRUDFunctions';
import { validateSales, validateSalesData } from '../Global/CheckUndefind';

const PurchaseOrderBulkAdd = () => {
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
      const key = entry.SalesFlowRef;
      let TotalAmount = 0;
      if (!acc[key]) {
        acc[key] = {
          Vendor: findVendor(entry.Venodr),
          SalesFlowRef: key,
          VendorCode: Vendor.find((item) => item.salesFlowRef == entry.Venodr)?.code,
          PurchaseInvoiceDate: ConvetDate(entry.Date),
          Location: Location.find((item) => item.LocationName == entry.Location)?._id,
          Store: Store.find((item) => item.StoreName == entry.Store)?._id,
          Discount: entry.Discount || 0,
          AdvanceTax: entry.AdvanceTax || 0,
          TotalAmount: 0,
          PurchaseData: []
        };
      }
      acc[key].PurchaseData.push({
        id: Date.now() + Math.random(),
        product: Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?._id,
        box: !isNaN(entry.Boxes) ? entry.Boxes : entry.Pcs,
        GrossAmount: entry.Grossvalue || Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase * (entry.Boxes),
        unit: !isNaN(entry.Boxes) ? Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.PcsinBox * entry.Boxes : Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.PcsinBox * entry.Pcs,
        AfterTaxdiscount: Number(entry.AfterTaxdiscount || 0),
        netAmunt: Number(entry.Amount?.toFixed(3) || (((Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase * (entry.Boxes)) / 100)  * 18) + (Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase * (entry.Boxes)) ),
        Gst: entry.GST == 0 ? ((Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase * (entry.Boxes)) / 100)  * 18 : entry.GST,
        PerBoxValueGrs: isNaN(!isNaN(entry.Boxes) ? (entry.Grossvalue / entry.Boxes)?.toFixed(4) : (entry.Grossvalue / entry.Pcs)?.toFixed(4)) || Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase,
        ValueAfterDiscout: entry.Grossvalue?.toFixed(3) - entry?.Discount || entry.Grossvalue || Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase * (entry.Boxes),
        totalBox: !isNaN(entry.Boxes) ? entry.Boxes : entry.Pcs,
        ValuewithGst: !isNaN(parseInt(entry.Grossvalue + entry.GST - entry?.Discount)?.toFixed(5))|| (((Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase * (entry.Boxes)) / 100)  * 18) + Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase * (entry.Boxes),
        netAmountWintAdvanceTax: isNaN(entry.Grossvalue + entry.GST) ||  (((Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase * (entry.Boxes)) / 100)  * 18) + Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase * (entry.Boxes),

      });
      acc[key].TotalAmount += Number(entry.Amount) || (((Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase * (entry.Boxes)) / 100)  * 18) + Products.find((item) => item.CodeRef == entry.Vendor + entry.SKU)?.TPPurchase * (entry.Boxes)
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
    }

      const postInChunks = async (data, chunkSize = 20) => {
        //console.log(data)

        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }

        try {
          for (const chunk of chunks) {
            const res = await createDataFunction("/PurchaseInvoice/AddinBulk", chunk);
            //console.log(res)
          }
          toast.success("All data added successfully");
          setTimeout(() => navigate('/PurchaseInvoiceList'), 2000);
        } catch (err) {
          console.error("Error in chunk:", err);
          const errorMsg = err.response?.data?.message || "Partial data added - some chunks failed";
          toast.error(errorMsg);
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

  export default PurchaseOrderBulkAdd